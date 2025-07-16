import { corsHeaders } from 'cors_headers/';

interface TranscribeRequest {
  audio: string; // base64 encoded audio data
  encoding?: string; // audio encoding (default: LINEAR16)
  sampleRateHertz?: number; // sample rate in Hertz (default: 16000)
  languageCode?: string; // language code (default: en-US)
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

    // Get the service account key from environment variables
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Speech-to-Text API key not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Parse the service account key
    const serviceAccount = JSON.parse(serviceAccountKey);

    // Parse the request body
    const { audio, encoding = 'LINEAR16', sampleRateHertz = 16000, languageCode = 'en-US' }: TranscribeRequest = await req.json();

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

    console.log('Transcribing audio...');
    console.log(`Audio encoding: ${encoding}, Sample rate: ${sampleRateHertz}, Language: ${languageCode}`);

    // Get access token for Google Cloud API
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const jwtHeader = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };

    // Create JWT for Google Cloud authentication
    const now = Math.floor(Date.now() / 1000);
    const oneHour = 60 * 60;
    const expiry = now + oneHour;

    const jwtClaimSet = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    };

    // Encode JWT header and claim set
    const encoder = new TextEncoder();
    const headerBase64 = btoa(JSON.stringify(jwtHeader)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const claimSetBase64 = btoa(JSON.stringify(jwtClaimSet)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const toSign = encoder.encode(`${headerBase64}.${claimSetBase64}`);

    // Import private key and sign JWT
    const privateKey = serviceAccount.private_key;
    const keyData = privateKey.replace(/-----BEGIN PRIVATE KEY-----\n/, '').replace(/\n-----END PRIVATE KEY-----\n?/, '');
    const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      cryptoKey,
      toSign
    );

    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const jwt = `${headerBase64}.${claimSetBase64}.${signatureBase64}`;

    // Get access token
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Error getting access token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Google Cloud' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Call Speech-to-Text API
    const speechUrl = 'https://speech.googleapis.com/v1/speech:recognize';
    const speechRequestBody = {
      config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        model: 'latest_long',
        useEnhanced: true,
        audioChannelCount: 1
      },
      audio: {
        content: audio
      }
    };

    const speechResponse = await fetch(speechUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(speechRequestBody)
    });

    if (!speechResponse.ok) {
      const errorText = await speechResponse.text();
      console.error('Speech-to-Text API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to transcribe audio',
          details: errorText 
        }),
        {
          status: speechResponse.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const speechData = await speechResponse.json();
    
    // Extract transcription results
    let transcript = '';
    let confidence = 0;
    
    if (speechData.results && speechData.results.length > 0) {
      // Combine all transcription results
      transcript = speechData.results
        .map((result: any) => result.alternatives[0].transcript)
        .join(' ');
      
      // Average confidence across all results
      confidence = speechData.results.reduce((sum: number, result: any) => {
        return sum + (result.alternatives[0].confidence || 0);
      }, 0) / speechData.results.length;
    }

    console.log('Transcription successful');

    return new Response(
      JSON.stringify({ 
        transcript,
        confidence,
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
    console.error('Error in transcribe-audio function:', error);
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