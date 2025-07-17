import { corsHeaders } from './_shared/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface AnalyzeRequest {
  userId: string;
  date: string; // YYYY-MM-DD format
}

interface DimensionAnalysis {
  dimension: string;
  summary: string;
  emotions?: string[];
}

const DIMENSION_ANALYSIS_PROMPT = `Analyze the following journal content and identify which of these six dimensions are SIGNIFICANTLY present, and detect the dominant emotions:

1. **Achievement**: Things learned, built, or achieved
2. **Introspection**: Deep, perception-shifting thoughts about SELF, LIFE or WORLD, explicitly stated in an introspective tone (ex: here is how I have changed over time, I believe it isn't possible to be straightforward in today's world)
3. **Memories**: Joy, fun, vivid moments
4. **Little Things**: Mindful noticing and APPRECIATING, everyday beauty, quiet life details (ex: a lighthouse, a quaint cafe)
5. **Connections**: Spending time with someone and relational depth
6. **Major life event**: Joining a company, moving cities, getting married

EMOTION DETECTION:
Identify the 1-2 DOMINANT emotions based on the overall emotional tone and what the user spends most time expressing. Do NOT base this only on explicit emotion words, but on the underlying emotional state throughout the content.

Choose ONLY from these emotions: Excitement, Joy, Contentment, Pride, Sad, Anxiety, Inadequacy, Regret, Anger, Emptiness, Restless, Overwhelm

Examples:
- If someone talks excitedly about building something but briefly mentions feeling nervous, the dominant emotion should be "Excitement" or "Pride", not "Anxiety"
- If someone reflects peacefully on their day with satisfaction, choose "Contentment"
- If someone expresses frustration throughout most of their entry, choose "Anger" or "Overwhelm"

For each dimension that is SIGNIFICANTLY present in the text, provide a short summary (2-3 sentences) of what was expressed about that dimension. Write the summary in second person (you completed, you felt, you learned, etc.) addressing the journal writer directly.

Return your response in the following JSON format:
{
  "emotions": ["Excitement", "Pride"],
  "dimensions": [
    {
      "dimension": "Achievement",
      "summary": "You completed [specific achievement]. You learned [specific skill or knowledge]. You made progress on [specific project or goal]."
    },
    {
      "dimension": "Introspection", 
      "summary": "You reflected on [specific insight]. You realized [specific understanding]. You contemplated [specific life aspect]."
    }
  ]
}

IMPORTANT: 
- Include 1-2 dominant emotions that best represent the overall emotional tone
- Only include dimensions that are actually present and significant in the journal content
Only include dimensions that are actually present and significant in the journal content. Do not include dimensions that are not meaningfully represented.

Journal content:`;

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

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { userId, date }: AnalyzeRequest = await req.json();

    if (!userId || !date) {
      return new Response(
        JSON.stringify({ error: 'userId and date are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Analyzing daily summary for user ${userId} on ${date}`);

    // Check if dimension summaries already exist for this date
    const { data: existingDimensions } = await supabase
      .from('dimension_summaries')
      .select('id, dimension')
      .eq('user_id', userId)
      .eq('summary_date', date);

    if (existingDimensions && existingDimensions.length > 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Dimension summaries already exist for this date',
          dimensions: existingDimensions.map(d => d.dimension)
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Fetch all journal entries for the specified date
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('content, created_at')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .eq('entry_type', 'individual')
      .order('created_at', { ascending: true });

    if (entriesError) {
      console.error('Error fetching journal entries:', entriesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch journal entries' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No journal entries found for this date' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Combine all entries into a collective transcript
    const collectiveTranscript = entries
      .map(entry => entry.content.trim())
      .join('\n\n');

    console.log(`Collective transcript length: ${collectiveTranscript.length} characters`);

    // Prepare the full prompt for Gemini
    const fullPrompt = `${DIMENSION_ANALYSIS_PROMPT}

${collectiveTranscript}`;

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    
    const geminiRequestBody = {
      contents: [
        {
          parts: [
            {
              text: fullPrompt
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    console.log('Calling Gemini API for dimension analysis...');

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to analyze content',
          details: errorText 
        }),
        {
          status: geminiResponse.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const analysisContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!analysisContent) {
      return new Response(
        JSON.stringify({ error: 'No analysis content generated' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Analysis generated successfully');

    // Parse the JSON response from Gemini
    let dimensionAnalyses: DimensionAnalysis[] = [];
    try {
      // Extract JSON from the response (it might have markdown formatting)
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        dimensionAnalyses = parsedResponse.dimensions || [];
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.log('Raw response:', analysisContent);
      
      // Fallback: create a general summary if parsing fails
      dimensionAnalyses = [{
        dimension: 'General',
        summary: analysisContent.substring(0, 500) + '...'
      }];
    }

    console.log('Parsed dimensions:', dimensionAnalyses.map(d => d.dimension));

    // Extract emotions from the response
    let detectedEmotions: string[] = [];
    try {
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        detectedEmotions = parsedResponse.emotions || [];
      }
    } catch (parseError) {
      console.log('Could not parse emotions from response');
    }

    console.log('Detected emotions:', detectedEmotions);

    // Save each dimension summary to the database
    const savedDimensions = [];
    for (const analysis of dimensionAnalyses) {
      try {
        const { data: dimensionSummary, error: dimensionError } = await supabase
          .from('dimension_summaries')
          .insert({
            user_id: userId,
            summary_date: date,
            dimension: analysis.dimension,
            entry: analysis.summary
          })
          .select()
          .single();

        if (dimensionError) {
          console.error(`Error saving dimension ${analysis.dimension}:`, dimensionError);
        } else {
          savedDimensions.push(dimensionSummary);
          console.log(`Saved dimension summary: ${analysis.dimension}`);
        }
      } catch (error) {
        console.error(`Error processing dimension ${analysis.dimension}:`, error);
      }
    }

    // Also save to the original summaries table for backward compatibility
    const overallSummary = dimensionAnalyses
      .map(d => `**${d.dimension}**\n${d.summary}`)
      .join('\n\n');

    // Create emotions object for storage
    const emotionsData = detectedEmotions.map(emotion => ({ emotion, confidence: 1.0 }));

    const { data: summary, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        user_id: userId,
        summary_date: date,
        content: overallSummary,
        emotions: emotionsData,
        sections: {}
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Error saving overall summary:', summaryError);
    } else {
      console.log(`Overall summary saved with ID: ${summary.id}`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Daily summary analyzed and saved successfully',
        dimensionCount: savedDimensions.length,
        dimensions: savedDimensions.map(d => d.dimension),
        emotions: detectedEmotions,
        summaryId: summary?.id
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
    console.error('Error in analyze-daily-summary function:', error);
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