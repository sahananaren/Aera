import { supabase } from './supabase';
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface ExportOptions {
  format: 'txt' | 'md' | 'json';
}

export const exportUserData = async (
  userId: string,
  startDate: string,
  endDate: string,
  format: 'txt' | 'md' | 'json',
  progressCallback: (message: string) => void
): Promise<void> => {
  try {
    progressCallback('Fetching your data...');

    // Fetch all data
    const [journalEntries, dimensionSummaries, monthlySummaries, insights] = await Promise.all([
      // Journal entries
      supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('entry_type', 'individual')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true }),
      
      // Dimension summaries
      supabase
        .from('dimension_summaries')
        .select('*')
        .eq('user_id', userId)
        .gte('summary_date', startDate)
        .lte('summary_date', endDate)
        .order('summary_date', { ascending: true }),
      
      // Monthly summaries
      supabase
        .from('monthly_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
      
      // Insights
      supabase
        .from('insights')
        .select('*')
        .eq('user_id', userId)
        .order('prominence_score', { ascending: false })
    ]);

    if (journalEntries.error) throw journalEntries.error;
    if (dimensionSummaries.error) throw dimensionSummaries.error;
    if (monthlySummaries.error) throw monthlySummaries.error;
    if (insights.error) throw insights.error;

    progressCallback('Organizing your journal entries...');

    const files: { name: string; content: string }[] = [];

    // 1. Daily Journals
    const entriesByDate = new Map<string, any[]>();
    journalEntries.data?.forEach(entry => {
      if (!entriesByDate.has(entry.entry_date)) {
        entriesByDate.set(entry.entry_date, []);
      }
      entriesByDate.get(entry.entry_date)!.push(entry);
    });

    const dimensionsByDate = new Map<string, any[]>();
    dimensionSummaries.data?.forEach(summary => {
      if (!dimensionsByDate.has(summary.summary_date)) {
        dimensionsByDate.set(summary.summary_date, []);
      }
      dimensionsByDate.get(summary.summary_date)!.push(summary);
    });

    // Create daily journal files
    for (const [date, entries] of entriesByDate) {
      let content = '';
      
      if (format === 'json') {
        const dayData = {
          date,
          entries: entries.map(e => ({
            title: e.title,
            content: e.content,
            word_count: e.word_count,
            duration_ms: e.duration_ms,
            created_at: e.created_at
          })),
          ai_summaries: dimensionsByDate.get(date) || []
        };
        content = JSON.stringify(dayData, null, 2);
      } else if (format === 'md') {
        content = `# Journal Entry - ${new Date(date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}\n\n`;
        
        entries.forEach((entry, index) => {
          if (entry.title) {
            content += `## ${entry.title}\n\n`;
          }
          content += `${entry.content}\n\n`;
          content += `*Duration: ${Math.floor(entry.duration_ms / 60000)}:${Math.floor((entry.duration_ms % 60000) / 1000).toString().padStart(2, '0')} | Words: ${entry.word_count}*\n\n`;
        });

        const dayDimensions = dimensionsByDate.get(date) || [];
        if (dayDimensions.length > 0) {
          content += `## AI-Generated Insights\n\n`;
          dayDimensions.forEach(dim => {
            content += `### ${dim.dimension}\n${dim.entry}\n\n`;
          });
        }
      } else {
        // txt format
        content = `Journal Entry - ${new Date(date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}\n\n`;
        
        entries.forEach((entry, index) => {
          if (entry.title) {
            content += `${entry.title}\n${'='.repeat(entry.title.length)}\n\n`;
          }
          content += `${entry.content}\n\n`;
          content += `Duration: ${Math.floor(entry.duration_ms / 60000)}:${Math.floor((entry.duration_ms % 60000) / 1000).toString().padStart(2, '0')} | Words: ${entry.word_count}\n\n`;
        });

        const dayDimensions = dimensionsByDate.get(date) || [];
        if (dayDimensions.length > 0) {
          content += `AI-Generated Insights\n${'='.repeat(22)}\n\n`;
          dayDimensions.forEach(dim => {
            content += `${dim.dimension}:\n${dim.entry}\n\n`;
          });
        }
      }

      files.push({
        name: `Daily Journals/${generateFileName('daily', date, format)}`,
        content
      });
    }

    progressCallback('Compiling monthly summaries...');

    // 2. Monthly Summaries
    const monthlyByPeriod = new Map<string, any[]>();
    monthlySummaries.data?.forEach(summary => {
      const key = `${summary.year}-${summary.month}`;
      if (!monthlyByPeriod.has(key)) {
        monthlyByPeriod.set(key, []);
      }
      monthlyByPeriod.get(key)!.push(summary);
    });

    for (const [period, summaries] of monthlyByPeriod) {
      let content = '';
      
      if (format === 'json') {
        content = JSON.stringify({ period, summaries }, null, 2);
      } else if (format === 'md') {
        const [year, month] = period.split('-');
        content = `# Monthly Summary - ${month} ${year}\n\n`;
        summaries.forEach(summary => {
          content += `## ${summary.dimension}\n\n${summary.summary}\n\n`;
        });
      } else {
        const [year, month] = period.split('-');
        content = `Monthly Summary - ${month} ${year}\n${'='.repeat(30)}\n\n`;
        summaries.forEach(summary => {
          content += `${summary.dimension}:\n${summary.summary}\n\n`;
        });
      }

      files.push({
        name: `Monthly Summaries/${generateFileName('monthly', period, format)}`,
        content
      });
    }

    progressCallback('Preparing insights...');

    // 3. Insights
    if (insights.data && insights.data.length > 0) {
      let content = '';
      
      if (format === 'json') {
        content = JSON.stringify(insights.data, null, 2);
      } else if (format === 'md') {
        content = `# Your Personal Insights\n\n`;
        content += `*Generated from your journal entries*\n\n`;
        
        insights.data.forEach((insight, index) => {
          content += `## ${insight.title}\n\n`;
          content += `**Prominence Score:** ${insight.prominence_score}%\n\n`;
          content += `${insight.summary}\n\n`;
          
          if (insight.quotes && insight.quotes.length > 0) {
            content += `### Key Quotes\n\n`;
            insight.quotes.forEach(quote => {
              content += `> "${quote}"\n\n`;
            });
          }
          
          content += `*Last updated: ${new Date(insight.last_updated).toLocaleDateString()}*\n\n`;
          if (index < insights.data.length - 1) content += '---\n\n';
        });
      } else {
        content = `Your Personal Insights\n${'='.repeat(23)}\n\n`;
        content += `Generated from your journal entries\n\n`;
        
        insights.data.forEach((insight, index) => {
          content += `${insight.title}\n${'-'.repeat(insight.title.length)}\n\n`;
          content += `Prominence Score: ${insight.prominence_score}%\n\n`;
          content += `${insight.summary}\n\n`;
          
          if (insight.quotes && insight.quotes.length > 0) {
            content += `Key Quotes:\n`;
            insight.quotes.forEach(quote => {
              content += `  "${quote}"\n`;
            });
            content += '\n';
          }
          
          content += `Last updated: ${new Date(insight.last_updated).toLocaleDateString()}\n\n`;
          if (index < insights.data.length - 1) content += '---\n\n';
        });
      }

      files.push({
        name: `Insights/${generateFileName('insights', undefined, format)}`,
        content
      });
    }

    progressCallback('Creating zip file...');

    // Create zip file
    const zip = new JSZip();
    
    // Add files to zip
    files.forEach(file => {
      const parts = file.name.split('/');
      let folder = zip;
      
      // Create nested folders if needed
      if (parts.length > 1) {
        folder = zip.folder(parts[0])!;
      }
      
      const fileName = parts[parts.length - 1];
      folder.file(fileName, file.content);
    });

    // Generate zip file
    const zipContent = await zip.generateAsync({ type: 'base64' });
    
    // Create a temporary file
    const timestamp = new Date().toISOString().split('T')[0];
    const zipFilePath = `${FileSystem.cacheDirectory}Aera_Export_${timestamp}.zip`;
    
    await FileSystem.writeAsStringAsync(zipFilePath, zipContent, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    progressCallback('Saving to your device...');
    
    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(zipFilePath, {
        mimeType: 'application/zip',
        dialogTitle: 'Save your Āera data export'
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
    
    progressCallback('Export completed!');
    
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

const generateFileName = (type: string, date?: string, format: 'txt' | 'md' | 'json' = 'txt'): string => {
  const extension = format;
  if (date) {
    // Format: dd Month, yy (Ex: 25 June, 25)
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
    const year = dateObj.getFullYear().toString().slice(-2);
    return `${day} ${month}, ${year}.${extension}`;
  }
  if (type === 'monthly') {
    // For monthly summaries, date parameter contains "YYYY-Month" format
    const [year, month] = date!.split('-');
    const yearShort = year.slice(-2);
    return `${month} ${yearShort}.${extension}`;
  }
  return `${type.toLowerCase().replace(/\s+/g, '_')}.${extension}`;
};