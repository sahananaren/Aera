import { supabase } from './supabase';

interface GeminiRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export const callGeminiAPI = async (
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
) => {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: {
      prompt,
      model: options?.model || 'gemini-1.5-flash',
      maxTokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
    },
  });

  if (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }

  return data;
};

// Dimension analysis for journal entries
export const analyzeDimensions = async (content: string) => {
  const prompt = `Analyze the following journal content and identify which of these six dimensions are SIGNIFICANTLY present:

1. **Achievement**: Things learned, built, or achieved
2. **Introspection**: Deep, perception-shifting thoughts about SELF, LIFE or WORLD
3. **Memories**: Joy, fun, vivid moments
4. **Little Things**: Mindful noticing and APPRECIATING, everyday beauty
5. **Connections**: Spending time with someone and relational depth
6. **Major life event**: Joining a company, moving cities, getting married

For each dimension that is SIGNIFICANTLY present, provide a short summary (2-3 sentences) in second person.

Return your response in JSON format:
{
  "dimensions": [
    {
      "dimension": "Achievement",
      "summary": "You completed [specific achievement]..."
    }
  ]
}

Journal content: ${content}`;

  try {
    const response = await callGeminiAPI(prompt, {
      maxTokens: 1500,
      temperature: 0.7,
    });

    // Parse the JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.dimensions || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error analyzing dimensions:', error);
    return [];
  }
};

// Generate insights from journal entries
export const generateInsightsFromEntries = async (entries: any[]) => {
  const entriesText = entries
    .map(entry => `[${entry.entry_date}] ${entry.content}`)
    .join('\n\n');

  const prompt = `Analyze the following journal entries and identify deep, recurring psychological themes.

Focus ONLY on themes that appear multiple times across different entries.
Look for emotionally significant patterns that reveal deeper aspects of personality, values, fears, desires, or worldview.

For each significant recurring theme, provide:
1. A clear, specific title (4-8 words)
2. A 2-3 sentence summary explaining what this theme reveals
3. 1-2 direct quotes from the journal
4. A prominence score (1-100)

Return JSON format:
{
  "themes": [
    {
      "title": "Fear of Creative Stagnation",
      "summary": "You consistently express anxiety about not growing creatively...",
      "quotes": ["I feel like I'm just going through the motions..."],
      "prominence_score": 85
    }
  ]
}

Journal entries: ${entriesText}`;

  try {
    const response = await callGeminiAPI(prompt, {
      maxTokens: 3000,
      temperature: 0.7,
    });

    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.themes || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error generating insights:', error);
    return [];
  }
};