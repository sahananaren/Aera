import { supabase } from './supabase';

interface Theme {
  id: string;
  title: string;
  summary: string;
  quotes: string[];
  prominence_score: number;
  last_updated: string;
  created_at: string;
}

interface InsightAnalysis {
  themes: Array<{
    title: string;
    summary: string;
    quotes: string[];
    prominence_score?: number;
  }>;
}

const INSIGHTS_ANALYSIS_PROMPT = `Analyze the following journal entries and identify deep, recurring psychological themes that define this person's mental patterns, values, identity, or core concerns.

CRITICAL REQUIREMENTS:
- Focus ONLY on themes that appear multiple times across different entries
- Ignore trivial or one-off mentions
- Look for emotionally significant patterns that reveal deeper aspects of personality, values, fears, desires, or worldview
- Each theme should represent a meaningful psychological pattern, not just activities or events
- Calculate a prominence score (1-100) based on frequency of mentions and emotional significance

Examples of good themes:
- "Fear of creative stagnation" 
- "Craving for authentic connection"
- "Obsessive pursuit of perfection"
- "Struggle with work-life balance"
- "Deep need for intellectual stimulation"
- "Anxiety about future uncertainty"

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

Only include themes that are genuinely recurring and psychologically meaningful. Minimum 2 themes, maximum 15 themes (we will select the top 10 based on prominence).

Journal entries to analyze:`;

export const generateInsights = async (userId: string): Promise<void> => {
  try {
    console.log('Generating insights for user:', userId);

    // Get existing themes to understand current landscape
    const existingThemes = await getInsights(userId);
    console.log(`Found ${existingThemes.length} existing themes`);

    // Fetch all journal entries for analysis
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('content, entry_date, created_at')
      .eq('user_id', userId)
      .eq('entry_type', 'individual')
      .order('created_at', { ascending: true });

    if (entriesError) {
      throw new Error(`Failed to fetch journal entries: ${entriesError.message}`);
    }

    if (!entries || entries.length < 5) {
      throw new Error('Need at least 5 journal entries to generate meaningful insights');
    }

    // Prepare entries for analysis (limit to recent entries to avoid token limits)
    const recentEntries = entries.slice(-50); // Last 50 entries
    const entriesText = recentEntries
      .map(entry => `[${entry.entry_date}] ${entry.content}`)
      .join('\n\n');

    console.log(`Analyzing ${recentEntries.length} journal entries for insights`);

    // Call Gemini API through our proxy
    const { data: analysisResult, error: apiError } = await supabase.functions.invoke('gemini-proxy', {
      body: {
        prompt: `${INSIGHTS_ANALYSIS_PROMPT}\n\n${entriesText}`,
        model: 'gemini-1.5-flash',
        maxTokens: 3000,
        temperature: 0.7,
      },
    });

    if (apiError) {
      throw new Error(`AI analysis failed: ${apiError.message}`);
    }

    // Parse the AI response
    let insightAnalysis: InsightAnalysis;
    try {
      const jsonMatch = analysisResult.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insightAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse insights from AI response');
    }

    if (!insightAnalysis.themes || insightAnalysis.themes.length === 0) {
      throw new Error('No themes identified in the analysis');
    }

    // Sort themes by prominence score (highest first)
    const sortedNewThemes = insightAnalysis.themes
      .filter(theme => theme.prominence_score && theme.prominence_score > 0)
      .sort((a, b) => (b.prominence_score || 0) - (a.prominence_score || 0));

    console.log(`Generated ${sortedNewThemes.length} themes with prominence scores`);

    // Create a map of existing themes by title (case-insensitive)
    const existingThemesByTitle = new Map(
      existingThemes.map(theme => [theme.title.toLowerCase(), theme])
    );

    const now = new Date().toISOString();
    const updatedThemes: string[] = [];
    const newThemes: string[] = [];

    // Process each new theme
    for (const newTheme of sortedNewThemes) {
      const existingTheme = existingThemesByTitle.get(newTheme.title.toLowerCase());

      if (existingTheme) {
        // Update existing theme with new content and prominence score
        const { error: updateError } = await supabase
          .from('insights')
          .update({
            summary: newTheme.summary,
            quotes: newTheme.quotes,
            prominence_score: newTheme.prominence_score || 50,
            last_updated: now,
          })
          .eq('id', existingTheme.id);

        if (updateError) {
          console.error(`Error updating theme "${newTheme.title}":`, updateError);
        } else {
          console.log(`Updated existing theme: ${newTheme.title}`);
          updatedThemes.push(newTheme.title);
        }
      } else {
        // Check if we're at the 10-theme limit
        if (existingThemes.length >= 10) {
          // Find the theme with the lowest prominence score to replace
          const themesToReplace = existingThemes
            .filter(theme => !updatedThemes.includes(theme.title))
            .sort((a, b) => (a.prominence_score || 0) - (b.prominence_score || 0));

          if (themesToReplace.length > 0) {
            const themeToReplace = themesToReplace[0];
            
            // Only replace if the new theme has higher prominence
            if ((newTheme.prominence_score || 0) > (themeToReplace.prominence_score || 0)) {
              // Replace the existing theme
              const { error: replaceError } = await supabase
                .from('insights')
                .update({
                  title: newTheme.title,
                  summary: newTheme.summary,
                  quotes: newTheme.quotes,
                  prominence_score: newTheme.prominence_score || 50,
                  last_updated: now,
                })
                .eq('id', themeToReplace.id);

              if (replaceError) {
                console.error(`Error replacing theme "${themeToReplace.title}" with "${newTheme.title}":`, replaceError);
              } else {
                console.log(`Replaced theme "${themeToReplace.title}" with "${newTheme.title}" (prominence: ${themeToReplace.prominence_score || 0} -> ${newTheme.prominence_score || 0})`);
                newThemes.push(newTheme.title);
              }
            } else {
              console.log(`Skipping theme "${newTheme.title}" (prominence: ${newTheme.prominence_score || 0}) - not higher than lowest existing theme "${themeToReplace.title}" (prominence: ${themeToReplace.prominence_score || 0})`);
            }
          }
        } else {
          // We have space for a new theme
          const { error: insertError } = await supabase
            .from('insights')
            .insert({
              user_id: userId,
              title: newTheme.title,
              summary: newTheme.summary,
              quotes: newTheme.quotes,
              prominence_score: newTheme.prominence_score || 50,
              last_updated: now,
            });

          if (insertError) {
            console.error(`Error creating theme "${newTheme.title}":`, insertError);
          } else {
            console.log(`Created new theme: ${newTheme.title}`);
            newThemes.push(newTheme.title);
          }
        }
      }
    }

    console.log(`Insights generation completed: ${updatedThemes.length} updated, ${newThemes.length} new/replaced`);
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
};

export const getInsights = async (userId: string): Promise<Theme[]> => {
  try {
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .order('prominence_score', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch insights: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching insights:', error);
    throw error;
  }
};

// Helper function to check if insights were generated this week
export const insightsGeneratedThisWeek = async (userId: string): Promise<boolean> => {
  try {
    const { data: insights } = await supabase
      .from('insights')
      .select('last_updated')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false })
      .limit(1);

    if (!insights || insights.length === 0) {
      return false;
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const lastUpdate = new Date(insights[0].last_updated);
    return lastUpdate >= startOfWeek;
  } catch (error) {
    console.error('Error checking if insights generated this week:', error);
    return false;
  }
};

export const deleteInsight = async (insightId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('insights')
      .delete()
      .eq('id', insightId);

    if (error) {
      throw new Error(`Failed to delete insight: ${error.message}`);
    }

    console.log('Insight deleted successfully:', insightId);
  } catch (error) {
    console.error('Error deleting insight:', error);
    throw error;
  }
};