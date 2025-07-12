import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get dimension summaries for a specific date
export const getDimensionSummariesForDate = async (userId: string, date: string) => {
  return supabase
    .from('dimension_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('summary_date', date)
    .order('dimension', { ascending: true });
};

// Helper function to get monthly summaries
export const getMonthlySummaries = async (userId: string, year: number, month: string) => {
  return supabase
    .from('monthly_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .order('dimension', { ascending: true });
};

// Helper function to check if monthly summaries exist
export const checkMonthlySummariesExist = async (userId: string, year: number, month: string) => {
  try {
    const { data, error } = await supabase
      .from('monthly_summaries')
      .select('id')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .limit(1);

    if (error) {
      console.error('Error checking monthly summaries:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking monthly summaries:', error);
    return false;
  }
};

// Helper function to generate monthly summary
export const generateMonthlySummary = async (userId: string, month: string, year: number) => {
  const { data, error } = await supabase.functions.invoke('generate-monthly-summary', {
    body: {
      userId,
      month,
      year,
    },
  });

  if (error) {
    throw new Error(`Monthly summary generation error: ${error.message}`);
  }

  return data;
};

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          content: string;
          entry_date: string;
          word_count: number;
          duration_ms: number;
          entry_type: string;
          created_at: string;
          updated_at: string;
          photos: string[] | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          content: string;
          entry_date?: string;
          word_count?: number;
          duration_ms?: number;
          entry_type?: string;
          created_at?: string;
          updated_at?: string;
          photos?: string[] | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          content?: string;
          entry_date?: string;
          word_count?: number;
          duration_ms?: number;
          entry_type?: string;
          created_at?: string;
          updated_at?: string;
          photos?: string[] | null;
        };
      };
      dimension_summaries: {
        Row: {
          id: string;
          user_id: string;
          summary_date: string;
          dimension: string;
          entry: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          summary_date: string;
          dimension: string;
          entry: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          summary_date?: string;
          dimension?: string;
          entry?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      insights: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          summary: string;
          quotes: string[];
          prominence_score: number;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          summary: string;
          quotes?: string[];
          prominence_score?: number;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          summary?: string;
          quotes?: string[];
          prominence_score?: number;
          last_updated?: string;
          created_at?: string;
        };
      };
    };
  };
};

// Helper function to analyze daily summary
export const analyzeDailySummary = async (userId: string, date: string) => {
  const { data, error } = await supabase.functions.invoke('analyze-daily-summary', {
    body: {
      userId,
      date,
    },
  });

  if (error) {
    throw new Error(`Daily summary analysis error: ${error.message}`);
  }

  return data;
};

// Helper function to get insights
export const getInsights = async (userId: string) => {
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('user_id', userId)
    .order('prominence_score', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch insights: ${error.message}`);
  }

  return data || [];
};

// Helper function to generate insights
export const generateInsights = async (userId: string) => {
  // This would call the same Gemini API logic as the web app
  // For now, we'll use a placeholder
  console.log('Generating insights for user:', userId);
};