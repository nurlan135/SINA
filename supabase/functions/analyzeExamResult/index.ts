// supabase/functions/analyzeExamResult/index.ts
// supabase/functions/analyzeExamResult/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log("analyzeExamResult Edge Function (v3 - Updated Supabase Env Vars) yükləndi.");

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    console.log("OPTIONS sorğusu qəbul edildi.");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase URL və Anon Açarını Environment Variable-dan yeni adlarla alırıq
    const projectUrl = Deno.env.get('PROJECT_URL');
    const projectAnonKey = Deno.env.get('PROJECT_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('PROJECT_SERVICE_ROLE_KEY');

    if (!projectUrl || !projectAnonKey) {
      console.error('PROJECT_URL və ya PROJECT_ANON_KEY environment variable-larda təyin edilməyib!');
      throw new Error('Server konfiqurasiya xətası: Supabase əsas parametrləri tapılmadı.');
    }

    // Supabase klientini yaradırıq
    const supabaseAdmin: SupabaseClient = createClient(projectUrl, projectAnonKey);
    const supabaseAdmin: SupabaseClient = createClient(projectUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

    console.log("analyzeExamResult: Yeni POST sorğusu qəbul edildi.");

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      console.error('OpenRouter API açarı Environment Variable-da təyin edilməyib!');
      throw new Error('Server konfiqurasiya xətası: AI API açarı tapılmadı.'); // Daha ümumi xəta
    }

    let examId: string | null = null;
    try {
      const body = await req.json();
      if (body && body.exam_id && typeof body.exam_id === 'string') {
        examId = body.exam_id;
      } else {
        throw new Error("Sorğu body-sində 'exam_id' tapılmadı və ya string deyil.");
      }
    } catch (e) {
      console.error("JSON body parse edilərkən və ya exam_id alınarkən xəta:", e.message);
      return new Response(JSON.stringify({ error: `Sorğu body-si parse edilə bilmədi: ${e.message}` }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log(`Alınan exam_id: ${examId}. İmtahan detalları çəkilir...`);

    // 1. İmtahan nəticələri və əsas imtahan məlumatları
    const { data: examResultData, error: resultError } = await supabaseAdmin
      .from('exam_results')
      .select(`
        correct_answers_count,
        incorrect_answers_count,
        unanswered_count,
        percentage,
        exams!inner ( // !inner join qalır, çünki exams məlumatı mütləqdir
          subject_ids,
          num_questions_requested,
          status
        )
      `)
      .eq('exam_id', examId)
      .limit(1)        // YENİ: Nəticəni bir sətirlə məhdudlaşdır
      .maybeSingle();  // YENİ: Ya bir sətir, ya da null qaytar

     if (resultError) { /* ... */ }
    if (!examResultData) { // .maybeSingle() null qaytara bilər
        console.error(`Bu exam_id (${examId}) üçün nəticə tapılmadı (maybeSingle null qaytardı).`);
        throw new Error(`Bu exam_id (${examId}) üçün nəticə tapılmadı.`);
    }
    if (!examResultData.exams) { /* ... */ }

    // 2. Verilmiş cavablar və sualların detalları
    const { data: answersWithQuestions, error: answersError } = await supabaseAdmin
      .from('exam_answers')
      .select(`
        selected_option_id,
        is_correct,
        questions!inner (
          id,
          question_text,
          options,
          correct_answer_id,
          subject_id,
          topics (name) 
        )
      `)
      .eq('exam_id', examId);
    
    if (answersError) throw new Error(`Cavablar və suallar çəkilərkən xəta: ${answersError.message}`);
    
    // 3. Fənn adları (əgər lazımdırsa, ayrı çəkə bilərik, amma yuxarıdakı sorğu topics(name) ilə gətirməlidir)
    // Hələlik bu məlumatları birbaşa prompt üçün formatlamaya fokuslanaq

    // ----- AI MODELİNƏ GÖNDƏRİLƏCƏK PROMPT-U HAZIRLAMAQ -----
    let promptForAI = `Şagirdin imtahan nəticələri aşağıdakı kimidir. Zəhmət olmasa, şagirdin zəif və güclü tərəflərini təhlil et və öyrənməsini yaxşılaşdırmaq üçün konkret tövsiyələr ver. Təhlili Azərbaycan dilində və anlaşıqlı şəkildə yaz.\n\n`;
    promptForAI += `Ümumi Nəticə:\n- Düzgün cavablar: ${examResultData.correct_answers_count}\n- Səhv cavablar: ${examResultData.incorrect_answers_count}\n- Cavablanmamış: ${examResultData.unanswered_count}\n- Faiz: ${examResultData.percentage}%\n\n`;
    promptForAI += `Cavabların Detalları:\n`;

    if (answersWithQuestions && answersWithQuestions.length > 0) {
        for (const ans of answersWithQuestions) {
            if (ans.questions) { // questions obyektinin mövcudluğunu yoxla
                promptForAI += `- Sual: ${ans.questions.question_text}\n`;
                // Mövzu adını əlavə et (əgər varsa)
                if (ans.questions.topics && ans.questions.topics.name) {
                    promptForAI += `  - Mövzu: ${ans.questions.topics.name}\n`;
                }
                // Fənn adını əlavə etmək üçün subject_id-dən subject_name-ə map etmək lazımdır
                // Bunu gələcəkdə edə bilərik. Hələlik subject_id kifayətdir.
                promptForAI += `  - Fənn ID: ${ans.questions.subject_id}\n`;
                promptForAI += `  - Verilən cavab ID: ${ans.selected_option_id || 'Cavablanmayıb'}\n`;
                promptForAI += `  - Düzgün cavab ID: ${ans.questions.correct_answer_id}\n`;
                promptForAI += `  - Nəticə: ${ans.is_correct ? 'Düzgün' : 'Səhv'}\n\n`;
            }
        }
    } else {
        promptForAI += "Bu imtahanda cavablanmış sual tapılmadı.\n";
    }

    console.log("AI üçün hazırlanmış son prompt:\n", promptForAI);

    // ----- OpenRouter/Llama 3 API Çağırışı -----
    const openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const modelToUse = "meta-llama/llama-3-8b-instruct"; // Dəqiq model adını yoxlayın

    const requestBodyForAI = {
      model: modelToUse,
      messages: [ { role: "user", content: promptForAI } ],
    };

    const aiResponse = await fetch(openRouterApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sina-app.com', // Öz tətbiq adınız və ya URL-iniz
        'X-Title': 'SINA Tətbiqi',
      },
      body: JSON.stringify(requestBodyForAI),
    });

    const aiResponseDataText = await aiResponse.text();
    if (!aiResponse.ok) {
      console.error(`OpenRouter API xətası (${aiResponse.status}):`, aiResponseDataText);
      throw new Error(`AI analiz servisi xətası: ${aiResponse.statusText}. Detal: ${aiResponseDataText.substring(0, 200)}`); // Xəta mesajını qısaldaq
    }

    const aiResponseData = JSON.parse(aiResponseDataText);
    const analysisText = aiResponseData.choices?.[0]?.message?.content?.trim() || "AI modelindən təhlil alınmadı.";

    console.log("AI modelindən alınan təhlil:", analysisText);

    return new Response(
      JSON.stringify({ 
          message: "Analiz uğurla tamamlandı.",
          analysis: analysisText,
          originalData: { // İstəyə bağlı olaraq original datanı da qaytara bilərik
            examId: examId,
            result: examResultData,
            // answers: answersWithQuestions // Çox böyük ola bilər
          }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Edge Function xətası (detallar):', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || 'Naməlum server xətası baş verdi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
