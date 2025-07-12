import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface DimensionFrequencyProps {
  currentMonth: number;
  currentYear: number;
}

interface DimensionData {
  dimension: string;
  dayCount: number;
  filledBlocks: number;
  color: string;
}

const DimensionFrequency: React.FC<DimensionFrequencyProps> = ({ currentMonth, currentYear }) => {
  const { user } = useAuth();
  const [dimensionData, setDimensionData] = useState<DimensionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Dimension configuration with colors matching the web app
  const dimensionConfig = [
    { dimension: 'Introspection', color: '#0C93FC' },
    { dimension: 'Achievement', color: '#2FA7C6' },
    { dimension: 'Memories', color: '#93A7F1' },
    { dimension: 'Little Things', color: '#08B5A8' },
    { dimension: 'Connections', color: '#8D51DA' }
  ];

  useEffect(() => {
    if (user) {
      fetchDimensionFrequency();
    }
  }, [user, currentMonth, currentYear]);

  const fetchDimensionFrequency = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Calculate date range for the month
      const startDate = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-CA');
      const endDate = new Date(currentYear, currentMonth + 1, 0).toLocaleDateString('en-CA');

      // Fetch dimension summaries for the month
      const { data: dimensionSummaries, error } = await supabase
        .from('dimension_summaries')
        .select('dimension, summary_date')
        .eq('user_id', user.id)
        .gte('summary_date', startDate)
        .lte('summary_date', endDate)
        .order('summary_date', { ascending: true });

      if (error) {
        console.error('Error fetching dimension summaries:', error);
        return;
      }

      // Count unique days for each dimension
      const dimensionDayCounts: { [key: string]: Set<string> } = {};
      
      if (dimensionSummaries) {
        dimensionSummaries.forEach(summary => {
          if (!dimensionDayCounts[summary.dimension]) {
            dimensionDayCounts[summary.dimension] = new Set();
          }
          dimensionDayCounts[summary.dimension].add(summary.summary_date);
        });
      }

      // Calculate filled blocks for each dimension (every 3 days = 1 block)
      const processedData: DimensionData[] = dimensionConfig.map(config => {
        const dayCount = dimensionDayCounts[config.dimension]?.size || 0;
        const filledBlocks = Math.round(dayCount / 3); // Round to nearest full block
        
        return {
          dimension: config.dimension,
          dayCount,
          filledBlocks: Math.min(filledBlocks, 10), // Cap at 10 blocks
          color: config.color
        };
      });

      setDimensionData(processedData);
    } catch (error) {
      console.error('Error fetching dimension frequency:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderBlocks = (filledCount: number, color: string) => {
    const blocks = [];
    
    for (let i = 0; i < 10; i++) {
      blocks.push(
        <View
          key={i}
          style={[
            styles.block,
            {
              backgroundColor: i < filledCount ? color : '#161616',
              shadowColor: i < filledCount ? color : 'transparent',
              shadowOpacity: i < filledCount ? 0.4 : 0,
              shadowRadius: i < filledCount ? 4 : 0,
              elevation: i < filledCount ? 2 : 0,
            }
          ]}
        />
      );
    }
    
    return (
      <View style={styles.blocksContainer}>
        {blocks}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0C93FC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {dimensionData.map((data) => (
        <View key={data.dimension} style={styles.dimensionRow}>
          {/* Dimension Label */}
          <View style={styles.labelContainer}>
            <Text style={styles.dimensionLabel}>{data.dimension}</Text>
          </View>
          
          {/* Blocks Grid */}
          {renderBlocks(data.filledBlocks, data.color)}
        </View>
      ))}
      
      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendText}>
          Each block represents ~3 days of entries for that dimension
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    color: '#959BA7',
    fontSize: 14,
    marginTop: 8,
    fontFamily: 'System',
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  labelContainer: {
    flex: 1,
    marginRight: 12,
  },
  dimensionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
  },
  blocksContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  block: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#10141B',
  },
  legendText: {
    color: '#959BA7',
    fontSize: 12,
    fontFamily: 'System',
  }
});

export default DimensionFrequency;