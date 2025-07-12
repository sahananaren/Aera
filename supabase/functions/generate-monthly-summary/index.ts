import { corsHeaders } from 'cors_headers/';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface MonthlyRequest {
  userId: string;
  month: string; // Month name (e.g., "January")
  year: number;
}

interface DimensionSummary {
  dimension: string;
  summary: string;
}

const MONTHLY_SUMMARY_PROMPT = `You are analyzing a month's worth of daily dimension summaries from a personal journal. Your task is to create concise monthly summaries for each dimension.

For each dimension provided, create a bullet-point summary that:
- Highlights the most significant or recurring events, patterns, or reflections
- Uses a concise tone addressing the user in second person (you completed, you felt, you learned, etc.)
- Is no more than 400 characters long
- Focuses on key themes and important developments
- Uses bullet points (•) for formatting

Additionally, create an "Overall" summary that gives a high-level overview of the most important things or patterns from the month across all dimensions, also in second person.

Return your response in the following JSON format:
{
  "summaries": [
    {
      "dimension": "Overall",
      "summary": "• You experienced key theme 1\n• You developed key theme 2\n• You achieved important pattern or development"
    },
    {
      "dimension": "Achievement", 
      "summary": "• You completed major achievement 1\n• You developed skill in area\n• You reached project milestone"
    }
  ]
}

Only include dimensions that have meaningful content. If a dimension has no significant content, skip it.

Here are the daily dimension summaries for analysis:`;

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
    const { userId, month, year }: MonthlyRequest = await req.json();

    if (!userId || !month || !year) {
      return new Response(
        JSON.stringify({ error: 'userId, month, and year are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Generating monthly summary for user ${userId} - ${month} ${year}`);

    // Check if monthly summaries already exist
    const { data: existingSummaries } = await supabase
      .from('monthly_summaries')
      .select('id, dimension')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year);

    if (existingSummaries && existingSummaries.length > 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Monthly summaries already exist',
          summaries: existingSummaries
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

    // Get month number for date range
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthNumber = monthNames.indexOf(month) + 1;
    
    if (monthNumber === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid month name' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Calculate date range for the month
    const startDate = new Date(year, monthNumber - 1, 1).toLocaleDateString('en-CA');
    const endDate = new Date(year, monthNumber, 0).toLocaleDateString('en-CA');

    console.log(`Fetching dimension summaries from ${startDate} to ${endDate}`);

    // Fetch all dimension summaries for the month
    const { data: dimensionSummaries, error: dimensionError } = await supabase
      .from('dimension_summaries')
      .select('dimension, entry, summary_date')
      .eq('user_id', userId)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: true });

    if (dimensionError) {
      console.error('Error fetching dimension summaries:', dimensionError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch dimension summaries' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    if (!dimensionSummaries || dimensionSummaries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No dimension summaries found for this month' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Found ${dimensionSummaries.length} dimension summaries`);

    // Group summaries by dimension
    const summariesByDimension: { [key: string]: string[] } = {};
    dimensionSummaries.forEach(summary => {
      if (!summariesByDimension[summary.dimension]) {
        summariesByDimension[summary.dimension] = [];
      }
      summariesByDimension[summary.dimension].push(`${summary.summary_date}: ${summary.entry}`);
    });

    // Format the data for the AI prompt
    let formattedSummaries = '';
    Object.entries(summariesByDimension).forEach(([dimension, entries]) => {
      formattedSummaries += `\n\n**${dimension}:**\n`;
      entries.forEach(entry => {
        formattedSummaries += `${entry}\n`;
      });
    });

    // Prepare the full prompt for Gemini
    const fullPrompt = `${MONTHLY_SUMMARY_PROMPT}

${formattedSummaries}`;

    console.log('Calling Gemini API for monthly summary generation...');

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
        maxOutputTokens: 3000,
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
          error: 'Failed to generate monthly summary',
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
    const summaryContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!summaryContent) {
      return new Response(
        JSON.stringify({ error: 'No summary content generated' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Monthly summary generated successfully');

    // Parse the JSON response from Gemini
    let monthlySummaries: DimensionSummary[] = [];
    try {
      // Extract JSON from the response (it might have markdown formatting)
      const jsonMatch = summaryContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        monthlySummaries = parsedResponse.summaries || [];
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.log('Raw response:', summaryContent);
      
      // Fallback: create a general summary if parsing fails
      monthlySummaries = [{
        dimension: 'Overall',
        summary: summaryContent.substring(0, 400) + '...'
      }];
    }

    console.log('Parsed monthly summaries:', monthlySummaries.map(s => s.dimension));

    // Save each monthly summary to the database
    const savedSummaries = [];
    for (const summary of monthlySummaries) {
      try {
        const { data: monthlySummary, error: summaryError } = await supabase
          .from('monthly_summaries')
          .insert({
            user_id: userId,
            month: month,
            year: year,
            dimension: summary.dimension,
            summary: summary.summary
          })
          .select()
          .single();

        if (summaryError) {
          console.error(`Error saving monthly summary ${summary.dimension}:`, summaryError);
        } else {
          savedSummaries.push(monthlySummary);
          console.log(`Saved monthly summary: ${summary.dimension}`);
        }
      } catch (error) {
        console.error(`Error processing monthly summary ${summary.dimension}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Monthly summaries generated and saved successfully',
        summaries: savedSummaries
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
    console.error('Error in generate-monthly-summary function:', error);
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