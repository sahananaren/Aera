import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { getInsights, generateInsights, insightsGeneratedThisWeek, deleteInsight } from '../../lib/insights';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import ConfirmationModal from '../../components/ConfirmationModal';

interface Insight {
  id: string;
  title: string;
  summary: string;
  quotes: string[];
  prominence_score: number;
  last_updated: string;
  created_at: string;
}

export default function InsightsScreen() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedThisWeek, setGeneratedThisWeek] = useState(false);
  const [deletingInsightId, setDeletingInsightId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemType: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemType: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (user) {
      loadInsights();
      checkWeeklyStatus();
    }
  }, [user]);

  const loadInsights = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getInsights(user.id);
      setInsights(data || []);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkWeeklyStatus = async () => {
    if (!user) return;

    try {
      const generated = await insightsGeneratedThisWeek(user.id);
      setGeneratedThisWeek(generated);
    } catch (error) {
      console.error('Error checking weekly status:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInsights();
    checkWeeklyStatus();
  };

  const handleGenerateInsights = async () => {
    if (!user) return;

    try {
      setGenerating(true);
      await generateInsights(user.id);
      await loadInsights();
      setGeneratedThisWeek(true);
      Alert.alert('Success', 'New insights have been generated!');
    } catch (error) {
      console.error('Error generating insights:', error);
      Alert.alert('Error', 'Failed to generate insights. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInsight = (insight: Insight) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Insight Theme',
      message: `The theme "${insight.title}" and all its associated insights will be permanently removed.`,
      itemType: 'this insight theme',
      onConfirm: () => confirmDeleteInsight(insight.id)
    });
  };

  const confirmDeleteInsight = async (insightId: string) => {
    try {
      setDeletingInsightId(insightId);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      
      await deleteInsight(insightId);
      
      // Remove the insight from the local state
      setInsights(prev => prev.filter(item => item.id !== insightId));
      
    } catch (error) {
      console.error('Error deleting insight:', error);
      Alert.alert('Error', 'Failed to delete insight. Please try again.');
    } finally {
      setDeletingInsightId(null);
    }
  };

  // Helper function to check if it's the start of the week (Monday)
  const isStartOfWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return dayOfWeek === 1; // Monday
  };

  // Helper function to get days until next Monday
  const getDaysUntilNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (dayOfWeek === 1) return 7; // If today is Monday, next Monday is 7 days away
    if (dayOfWeek === 0) return 1; // If today is Sunday, next Monday is 1 day away
    return 8 - dayOfWeek; // For Tuesday-Saturday
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  // Determine button state
  const shouldShowNewInsights = isStartOfWeek() && !generatedThisWeek;
  const daysUntilNext = getDaysUntilNextMonday();
  
  const buttonText = shouldShowNewInsights 
    ? 'New Insights' 
    : `New Insights in ${daysUntilNext} day${daysUntilNext === 1 ? '' : 's'}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Insights</Text>
        <Text style={styles.subtitle}>
          Recurring themes and patterns discovered in your journal entries
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {insights.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={64} color="#959BA7" />
            <Text style={styles.emptyTitle}>No insights yet</Text>
            <Text style={styles.emptySubtitle}>
              {shouldShowNewInsights 
                ? "Click 'New Insights' to discover recurring themes in your journal entries"
                : `New insights will be available in ${daysUntilNext} day${daysUntilNext === 1 ? '' : 's'}`
              }
            </Text>
            
            {shouldShowNewInsights && (
              <Button
                title={generating ? "Generating..." : "New Insights"}
                variant="cta"
                onPress={handleGenerateInsights}
                disabled={generating}
                style={styles.generateButton}
              />
            )}
          </View>
        ) : (
          <>
            {/* Generate Button */}
            <View style={styles.generateContainer}>
              <Button
                title={buttonText}
                variant="primary"
                onPress={handleGenerateInsights}
                disabled={generating || !shouldShowNewInsights}
                style={styles.updateButton}
                icon={generating ? undefined : "refresh-outline"}
              />
            </View>

            {/* Insights List */}
            {insights.map((insight, index) => (
              <Card key={insight.id} style={styles.insightCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                  </View>
                  
                  {/* Delete Button */}
                  <Pressable 
                    onPress={() => handleDeleteInsight(insight)}
                    disabled={deletingInsightId === insight.id}
                    style={[styles.deleteButton, { opacity: deletingInsightId === insight.id ? 0.5 : 1 }]}
                  >
                    {deletingInsightId === insight.id ? (
                      <View style={styles.loadingIndicator} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    )}
                  </Pressable>
                </View>

                <Text style={styles.insightSummary}>
                  {insight.summary}
                </Text>

                {insight.quotes && insight.quotes.length > 0 && (
                  <View style={styles.quotesContainer}>
                    <Text style={styles.quotesHeader}>Key Quotes</Text>
                    {insight.quotes.map((quote, quoteIndex) => (
                      <View key={quoteIndex} style={styles.quoteItem}>
                        <Ionicons name="quote-outline" size={16} color="#93A7F1" />
                        <Text style={styles.quoteText}>"{quote}"</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.insightFooter}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={14} color="#959BA7" />
                    <Text style={styles.dateText}>
                      Last updated {formatDate(insight.last_updated)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        itemType={confirmModal.itemType}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#10141B',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Adamina',
  },
  subtitle: {
    fontSize: 16,
    color: '#959BA7',
    lineHeight: 22,
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#959BA7',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Adamina',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#959BA7',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    fontFamily: 'System',
  },
  generateButton: {
    paddingHorizontal: 32,
  },
  generateContainer: {
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 16,
  },
  updateButton: {
    backgroundColor: '#161616',
    borderColor: 'transparent',
  },
  insightCard: {
    marginBottom: 20,
    overflow: 'visible',
    padding: 20,
  },
  insightHeader: {
    flex: 1,
    marginRight: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  deleteButton: {
    padding: 8,
    marginTop: -8,
    marginRight: -8,
    marginLeft: 8,
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'Adamina',
  },
  prominenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  prominenceText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  insightSummary: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 16,
    fontFamily: 'System',
  },
  quotesContainer: {
    marginBottom: 16,
  },
  quotesHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#93A7F1',
    marginBottom: 12,
    fontFamily: 'System',
  },
  quoteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#93A7F1',
  },
  quoteText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
    fontFamily: 'System',
  },
  insightFooter: {
    borderTopWidth: 1,
    borderTopColor: '#10141B',
    paddingTop: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#959BA7',
    fontFamily: 'System',
  },
  loadingIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#959BA7',
    borderTopColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
});