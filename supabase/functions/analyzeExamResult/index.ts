// supabase/functions/analyzeExamResult/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS başlıqları
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Production-da öz domeninizlə əvəz edin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 
};

console.log("analyzeExamResult Edge Function (Llama 3 via OpenRouter) yükləndi.");

serve(async (req: Request) => {
  // CORS preflight sorğusunu idarə et
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("analyzeExamResult: Yeni sorğu qəbul edildi - Metod:", req.method);

    // OpenRouter API açarını Environment Variable-dan al
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      console.error('OpenRouter API açarı Environment Variable-da təyin edilməyib!');
      throw new Error('Server konfiqurasiya xətası: API açarı tapılmadı.');
    }

    // Klientdən gələn JSON məlumatını al
    let userPrompt = "Azərbaycan haqqında 3 maraqlı fakt de."; // Defolt prompt
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            if (body && body.prompt && typeof body.prompt === 'string') {
                userPrompt = body.prompt;
            } else {
                console.warn("Gələn body-də 'prompt' sahəsi yoxdur və ya string deyil, defolt prompt istifadə olunur.");
            }
        } catch (e) {
            console.warn("JSON body parse edilə bilmədi, defolt prompt istifadə olunur.", e.message);
        }
    } else {
        console.log("GET sorğusu, defolt prompt istifadə olunur.");
    }
    
    console.log("OpenRouter Llama 3 üçün hazırlanmış prompt:", userPrompt);

    const openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Model adını OpenRouter sənədlərindən dəqiqləşdirin.
    // Populyar Llama 3 8B Instruct modelləri:
    // "meta-llama/llama-3-8b-instruct"
    // "nousresearch/hermes-2-pro-llama-3-8b" 
    // "mistralai/mistral-7b-instruct-v0.2" (bu Llama deyil, amma OpenRouter-da var)
    const modelToUse = "meta-llama/llama-3.3-8b-instruct:free"; // Bunu yoxlayın!

    const requestBody = {
      model: modelToUse, 
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      // temperature: 0.7, // Könüllü: cavabın yaradıcılıq dərəcəsi
      // max_tokens: 500,  // Könüllü: maksimum cavab uzunluğu
    };

    console.log("OpenRouter-a göndərilən body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(openRouterApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Tövsiyə olunan OpenRouter başlıqları (saytınızın URL-i və ya tətbiq adınızla əvəz edin):
        'HTTP-Referer': 'https://sina-app.com', // Öz saytınızın URL-i və ya tətbiq adınız
        'X-Title': 'SINA Tətbiqi',           // Tətbiqinizin adı
      },
      body: JSON.stringify(requestBody),
    });

    const responseDataText = await response.text(); // Əvvəlcə mətn olaraq alaq ki, JSON parse xətası olarsa görək
    console.log(`OpenRouter API cavabı (${response.status}):`, responseDataText);


    if (!response.ok) {
      let detailErrorMessage = responseDataText;
      try {
        const parsedError = JSON.parse(responseDataText);
        detailErrorMessage = parsedError.error?.message || responseDataText;
      } catch (e) { /* ignore parsing error if not JSON */ }
      throw new Error(`OpenRouter API xətası: ${response.status} ${response.statusText}. Detal: ${detailErrorMessage}`);
    }

    const responseData = JSON.parse(responseDataText); // İndi JSON olaraq parse edək
    const analysisText = responseData.choices?.[0]?.message?.content?.trim() || "Modeldən mətn cavabı alınmadı və ya format fərqlidir.";

    console.log("Modeldən alınan son cavab:", analysisText);

    return new Response(
      JSON.stringify({ analysis: analysisText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge Function xətası detalları:', error); // error.stack-i də loglaya bilərsiniz
    return new Response(
      JSON.stringify({ error: error.message || 'Naməlum server xətası' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});