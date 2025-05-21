// supabase/functions/analyzeExamResult/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Production-da öz domeninizlə əvəz edin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 
};

console.log("analyzeExamResult Edge Function (v1 - exam_id qəbul etmə) yükləndi.");

serve(async (req: Request) => {
  // CORS preflight (OPTIONS) sorğusunu idarə et
  if (req.method === 'OPTIONS') {
    console.log("OPTIONS sorğusu qəbul edildi.");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("analyzeExamResult: Yeni sorğu qəbul edildi - Metod:", req.method);

    // OpenRouter API açarını Environment Variable-dan al (hələlik istifadə etmirik, amma yoxlayaq)
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      // Bu mərhələdə API açarının olmaması funksiyanın işini dayandırmasın,
      // çünki hələ API çağırışı etmirik. Amma xəbərdarlıq verək.
      console.warn('OpenRouter API açarı Environment Variable-da təyin edilməyib! Növbəti addımlarda lazım olacaq.');
      // throw new Error('Server konfiqurasiya xətası: API açarı tapılmadı.'); // Hələlik bunu şərhə alaq
    }

    if (req.method !== 'POST') {
      console.log("Yalnız POST sorğuları qəbul edilir. Qaytarılan status: 405");
      return new Response(JSON.stringify({ error: 'Yalnız POST sorğuları qəbul edilir.' }), {
        status: 405, // Method Not Allowed
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let examId: string | null = null;
    try {
      const body = await req.json(); // Sorğunun body-sini JSON olaraq parse et
      if (body && body.exam_id && typeof body.exam_id === 'string') {
        examId = body.exam_id;
        console.log("Sorğu body-sindən alınan exam_id:", examId);
      } else {
        console.error("Sorğu body-sində 'exam_id' tapılmadı və ya string deyil. Body:", body);
        throw new Error("Sorğu body-sində 'exam_id' tapılmadı və ya düzgün formatda deyil.");
      }
    } catch (e) {
      console.error("JSON body parse edilərkən və ya exam_id alınarkən xəta:", e.message);
      return new Response(JSON.stringify({ error: `Sorğu body-si parse edilə bilmədi: ${e.message}` }), {
        status: 400, // Bad Request
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // ----- Hələlik OpenRouter/Llama 3 çağırışı YOXDUR -----
    // Növbəti addımda bu examId ilə Supabase-dən məlumatları çəkəcəyik
    // və sonra AI modelinə göndərəcəyik.

    console.log(`exam_id (${examId}) uğurla alındı. Funksiya normal şəkildə başa çatır.`);
    return new Response(
      JSON.stringify({ 
        received_exam_id: examId, 
        message: "exam_id uğurla alındı. Növbəti addım: Bu ID ilə imtahan detallarını Supabase-dən çəkmək." 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Edge Function-da ümumi xəta:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || 'Naməlum server xətası baş verdi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});