import { corsHeaders } from '../_shared/cors';

interface TranscribeRequest {
  audio: string; // base64 encoded audio data
  language?: string; // language code (default: en)
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Get OpenAI API key from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Parse the request body
    const { audio, language = 'en' }: TranscribeRequest = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'Audio data is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Transcribing audio with Whisper API, language: ${language}`);

    // Convert base64 to blob for multipart form data
    const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'json');

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to transcribe audio',
          details: errorText 
        }),
        {
          status: whisperResponse.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const whisperData = await whisperResponse.json();
    const transcript = whisperData.text || '';

    console.log('Whisper transcription successful');

    return new Response(
      JSON.stringify({ 
        transcript,
        confidence: 1.0, // Whisper doesn't provide confidence scores
        wordCount: transcript.split(/\s+/).filter(Boolean).length
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Error in transcribe-audio-whisper function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});