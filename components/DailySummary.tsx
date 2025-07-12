import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { supabase, getDimensionSummariesForDate, analyzeDailySummary } from '../lib/supabase';
import PhotoGallery from './PhotoGallery';
import { getPhotosForDate, deletePhoto } from '../lib/storage';
import ConfirmationModal from './ConfirmationModal';

interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  entry_date: string;
  duration_ms: number;
  word_count: number;
  created_at: string;
  updated_at: string;
  photos?: string[];
}

interface DimensionSummary {
  id: string;
  dimension: string;
  entry: string;
  created_at: string;
  updated_at: string;
}

interface DailySummaryProps {
  date: Date;
  onBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const DailySummary: React.FC<DailySummaryProps> = ({ date, onBack }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [dimensionSummaries, setDimensionSummaries] = useState<DimensionSummary[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [deletingPhotoUrl, setDeletingPhotoUrl] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcripts'>('summary');
  const [dominantEmotion, setDominantEmotion] = useState<string | null>(null);
  const [summaryContent, setSummaryContent] = useState<string | null>(null);
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

  // Dimension colors mapping
  const dimensionColors: { [key: string]: string } = {
    'Achievement': '#2FA7C6',
    'Introspection': '#0C93FC',
    'Memories': '#93A7F1',
    'Little Things': '#08B5A8',
    'Connections': '#8D51DA',
    'Major life event': '#FFD700'
  };

  // Emotion icons mapping
  const emotionIcons: { [key: string]: any } = {
    'Excitement': require('../assets/emotions/Excitement.png'),
    'Joy': require('../assets/emotions/Joy.png'),
    'Contentment': require('../assets/emotions/Contentment.png'),
    'Pride': require('../assets/emotions/Pride.png'),
    'Sad': require('../assets/emotions/Sadness.png'),
    'Anxiety': require('../assets/emotions/Anxiety.png'),
    'Inadequacy': require('../assets/emotions/Inadequacy.png'),
    'Regret': require('../assets/emotions/Regret.png'),
    'Anger': require('../assets/emotions/Anger.png'),
    'Emptiness': require('../assets/emotions/Emptiness.png'),
    'Restless': require('../assets/emotions/Restlessness.png'),
    'Overwhelm': require('../assets/emotions/Overwhelm.png')
  };

  // Component to render glow sphere
  const GlowSphere: React.FC<{ color: string; size?: 'sm' | 'md' }> = ({ color, size = 'md' }) => {
    const sizeValue = size === 'sm' ? 16 : 20;
    
    return (
      <View style={styles.glowSphereContainer}>
        <View 
          style={[
            styles.glowSphere,
            {
              width: sizeValue,
              height: sizeValue,
              borderRadius: sizeValue / 2,
              backgroundColor: '#000000',
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 8,
              elevation: 8,
            }
          ]}
        />
      </View>
    );
  };

  useEffect(() => {
    if (user) {
      fetchDataForDate();
    }
  }, [user, date]);

  const fetchDataForDate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setPhotoError(null);
      const dateString = date.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
      
      console.log(`[DAILY_SUMMARY] Fetching data for date: ${dateString}`);
      
      // Fetch journal entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', dateString)
        .eq('entry_type', 'individual')
        .order('created_at', { ascending: true });

      if (entriesError) {
        console.error('[DAILY_SUMMARY] Error fetching entries for date:', entriesError);
      } else {
        console.log(`[DAILY_SUMMARY] Found ${entriesData?.length || 0} entries for date ${dateString}`);
        
        // Log the photos field from each entry
        entriesData?.forEach((entry, index) => {
          console.log(`[DAILY_SUMMARY] Entry ${index + 1} photos:`, entry.photos);
        });
        
        setEntries(entriesData || []);
      }

      // Fetch dimension summaries
      const { data: dimensionData, error: dimensionError } = await getDimensionSummariesForDate(user.id, dateString);
      
      if (dimensionError && dimensionError.code !== 'PGRST116') {
        console.error('[DAILY_SUMMARY] Error fetching dimension summaries for date:', dimensionError);
      } else {
        console.log(`[DAILY_SUMMARY] Found ${dimensionData?.length || 0} dimension summaries`);
        setDimensionSummaries(dimensionData || []);
      }

      // Fetch summary with emotions
      const { data: summaryData, error: summaryFetchError } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('summary_date', dateString)
        .single();

      if (summaryFetchError && summaryFetchError.code !== 'PGRST116') {
        console.error('[DAILY_SUMMARY] Error fetching summary for date:', summaryFetchError);
      } else if (summaryData) {
        console.log('[DAILY_SUMMARY] Found summary with emotions:', summaryData.emotions);
        setSummaryContent(summaryData.content);
        
        // Extract dominant emotion
        if (summaryData.emotions && summaryData.emotions.length > 0) {
          setDominantEmotion(summaryData.emotions[0].emotion);
        } else {
          setDominantEmotion(null);
        }
      } else {
        setSummaryContent(null);
        setDominantEmotion(null);
      }

      // Fetch photos for this date
      try {
        console.log(`[DAILY_SUMMARY] Fetching photos for date: ${dateString}`);
        const photosForDate = await getPhotosForDate(user.id, dateString);
        console.log(`[DAILY_SUMMARY] Found ${photosForDate.length} photos:`, photosForDate);
        setPhotos(photosForDate);
      } catch (error) {
        console.error('[DAILY_SUMMARY] Error fetching photos for date:', error);
        setPhotoError('Unable to load photos. Please check your connection and try again.');
        setPhotos([]);
      }

    } catch (error) {
      console.error('[DAILY_SUMMARY] Error fetching data for date:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotosForDate = async () => {
    if (!user) return;

    try {
      const dateString = date.toLocaleDateString('en-CA');
      console.log(`[DAILY_SUMMARY] Explicitly fetching photos for date: ${dateString}`);
      const photosForDate = await getPhotosForDate(user.id, dateString);
      console.log(`[DAILY_SUMMARY] Explicitly found ${photosForDate.length} photos:`, photosForDate);
      setPhotos(photosForDate);
    } catch (error) {
      console.error('[DAILY_SUMMARY] Error fetching photos for date:', error);
      setPhotoError('Unable to load photos. Please check your connection and try again.');
      setPhotos([]);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!user) return;

    try {
      setDeletingPhotoUrl(photoUrl);
      
      // Delete from storage
      const success = await deletePhoto(photoUrl);
      
      if (success) {
        // Update photos state
        setPhotos(prev => prev.filter(url => url !== photoUrl));
        
        // Update journal entries to remove the photo URL
        const dateString = date.toLocaleDateString('en-CA');
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('id, photos')
          .eq('user_id', user.id)
          .eq('entry_date', dateString)
          .eq('entry_type', 'individual');
        
        if (entries && entries.length > 0) {
          for (const entry of entries) {
            if (entry.photos && entry.photos.includes(photoUrl)) {
              // Update entry to remove the photo URL
              await supabase
                .from('journal_entries')
                .update({
                  photos: entry.photos.filter((url: string) => url !== photoUrl)
                })
                .eq('id', entry.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('[DAILY_SUMMARY] Error deleting photo:', error);
    } finally {
      setDeletingPhotoUrl(null);
    }
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Journal Entry',
      message: `This entry will be permanently removed from your journal.`,
      itemType: 'this journal entry',
      onConfirm: () => confirmDeleteEntry(entry.id)
    });
  };

  const confirmDeleteEntry = async (entryId: string) => {
    if (!user) return;

    try {
      setDeletingEntryId(entryId);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      
      // Get entry photos before deleting
      const { data: entryData } = await supabase
        .from('journal_entries')
        .select('photos')
        .eq('id', entryId)
        .single();
      
      // Delete entry from database
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) {
        console.error('[DAILY_SUMMARY] Error deleting entry:', error);
        Alert.alert('Error', 'Failed to delete journal entry. Please try again.');
        return;
      }
      
      // Delete associated photos if any
      if (entryData?.photos && entryData.photos.length > 0) {
        for (const photoUrl of entryData.photos) {
          try {
            await deletePhoto(photoUrl);
          } catch (photoError) {
            console.error('[DAILY_SUMMARY] Error deleting photo during entry deletion:', photoError);
            // Continue with other photos even if one fails
          }
        }
      }
      
      // Update entries state
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      // Refresh photos list
      fetchPhotosForDate();
      
      // Close expanded entry if it was the deleted one
      if (expandedEntry === entryId) {
        setExpandedEntry(null);
      }
      
    } catch (error) {
      console.error('[DAILY_SUMMARY] Error deleting entry:', error);
      Alert.alert('Error', 'Failed to delete journal entry. Please try again.');
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleGenerateSummary = async () => {
    if (!user || entries.length === 0) return;

    try {
      setGeneratingSummary(true);
      const dateString = date.toLocaleDateString('en-CA');
      
      const result = await analyzeDailySummary(user.id, dateString);
      
      if (result.dimensions) {
        // Refresh the dimension summaries data
        await fetchDataForDate();
      }
      
    } catch (error) {
      console.error('[DAILY_SUMMARY] Error generating summary:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Generate a specific heading for each dimension based on its content
  const generateDimensionHeading = (dimension: string, entry: string): string => {
    // Simplified version of the web implementation
    const content = entry.toLowerCase();
    
    switch (dimension) {
      case 'Achievement':
        if (content.includes('coding') || content.includes('project')) {
          return 'Coding Project Progress';
        }
        return 'Personal Achievements';
        
      case 'Connections':
        if (content.includes('friend') || content.includes('meet')) {
          return 'Meeting with Friends';
        }
        return 'Building Connections';
        
      case 'Memories':
        if (content.includes('trip') || content.includes('travel')) {
          return 'Travel Memories';
        }
        return 'Creating Memories';
        
      case 'Little Things':
        if (content.includes('coffee') || content.includes('morning')) {
          return 'Morning Coffee Ritual';
        }
        return 'Mindful Moments';
        
      case 'Introspection':
        if (content.includes('reflect') || content.includes('think')) {
          return 'Personal Reflections';
        }
        return 'Deep Self-Reflection';
        
      case 'Major life event':
        if (content.includes('job') || content.includes('career')) {
          return 'Career Transition';
        }
        return 'Significant Life Event';
        
      default:
        return 'Daily Reflection';
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long'
    });
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = (): string => {
    const totalMs = entries.reduce((sum, entry) => sum + entry.duration_ms, 0);
    const totalMinutes = Math.floor(totalMs / 60000);
    const remainingSeconds = Math.floor((totalMs % 60000) / 1000);
    return `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleEntry = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  const isToday = () => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Render the Summary tab content
  const renderSummaryTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C93FC" />
          <Text style={styles.loadingText}>Loading summaries...</Text>
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color="#959BA7" />
          <Text style={styles.emptyTitle}>No journal entries for this day</Text>
        </View>
      );
    }

    return (
      <View style={styles.summaryContent}>
        {/* Emotion Display */}
        {dominantEmotion && (
          <View style={styles.emotionContainer}>
            <Image
              source={emotionIcons[dominantEmotion] || require('../assets/emotions/No Emotion.png')}
              style={styles.emotionIcon}
            />
            <View style={styles.emotionTextContainer}>
              <Text style={styles.emotionTitle}>
                Today you felt {dominantEmotion}
              </Text>
              {entries.length > 0 && (
                <Text style={styles.emotionQuote}>
                  "{entries[0].content.split('.')[0].substring(0, 80)}..."
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Photos Section - Only show when there are photos */}
        {photoError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#FF6B6B" />
            <Text style={styles.errorText}>{photoError}</Text>
          </View>
        ) : photos.length > 0 ? (
          <PhotoGallery 
            photos={photos} 
            onDeletePhoto={handleDeletePhoto}
            deletingPhotoUrl={deletingPhotoUrl}
          />
        ) : null}

        {/* Dimension Summaries */}
        {dimensionSummaries.length > 0 ? (
          <View style={styles.dimensionsContainer}>
            {dimensionSummaries.map((summary) => {
              const dimensionColor = dimensionColors[summary.dimension] || '#959BA7';
              const dimensionHeading = generateDimensionHeading(summary.dimension, summary.entry);
              
              return (
                <View key={summary.id} style={styles.dimensionItem}>
                  <View style={styles.dimensionHeader}>
                    <GlowSphere color={dimensionColor} />
                    <Text style={styles.dimensionTitle}>{summary.dimension}</Text>
                  </View>
                  <Text style={styles.dimensionHeading}>{dimensionHeading}</Text>
                  <Text style={styles.dimensionContent}>{summary.entry}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyDimensionsContainer}>
            <Ionicons name="sparkles-outline" size={48} color="#959BA7" />
            <Text style={styles.emptyDimensionsTitle}>
              {isToday() 
                ? "AI summaries are generated at the end of each day"
                : "No AI summary available for this day"
              }
            </Text>
            {!isToday() && (
              <Pressable
                onPress={handleGenerateSummary}
                disabled={generatingSummary}
                style={styles.generateButton}
              >
                {generatingSummary ? (
                  <View style={styles.generateButtonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Generating...</Text>
                  </View>
                ) : (
                  <View style={styles.generateButtonContent}>
                    <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Generate AI Summary</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render the Transcripts tab content
  const renderTranscriptsTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C93FC" />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color="#959BA7" />
          <Text style={styles.emptyTitle}>No journal entries for this day</Text>
        </View>
      );
    }

    return (
      <View style={styles.transcriptsContent}>
        <View style={styles.transcriptsHeader}>
          <Text style={styles.transcriptsTitle}>
            {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}, {getTotalDuration()}
          </Text>
          <Text style={styles.transcriptsSubtitle}>
            Tap to expand and read full transcripts
          </Text>
        </View>

        {entries.map((entry, index) => (
          <Pressable
            key={entry.id}
            onPress={() => toggleEntry(entry.id)}
            style={styles.entryItem}
          >
            <View style={styles.entryHeader}>
              <View style={styles.entryHeaderContent}>
                <Text style={styles.entryTitle}>
                  {entry.title || `Journal Entry ${index + 1}`}
                </Text>
                <View style={styles.entryStats}>
                  <Text style={styles.entryTime}>{formatTime(entry.created_at)}</Text>
                  <View style={styles.entryStat}>
                    <Ionicons name="time-outline" size={12} color="#959BA7" />
                    <Text style={styles.entryStatText}>{formatDuration(entry.duration_ms)}</Text>
                  </View>
                  <View style={styles.entryStat}>
                    <Ionicons name="text-outline" size={12} color="#959BA7" />
                    <Text style={styles.entryStatText}>{entry.word_count} words</Text>
                  </View>
                </View>
              </View>
              <View style={styles.entryActions}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteEntry(entry);
                  }}
                  style={styles.deleteButton}
                  disabled={deletingEntryId === entry.id}
                >
                  {deletingEntryId === entry.id ? (
                    <ActivityIndicator size="small" color="#FF6B6B" />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                  )}
                </Pressable>
                <Ionicons
                  name={expandedEntry === entry.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#959BA7"
                />
              </View>
            </View>

            {/* Expanded Content */}
            {expandedEntry === entry.id && (
              <View style={styles.entryContent}>
                <Text style={styles.entryText}>{entry.content}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>{formatDate(date)}</Text>
          <Text style={styles.headerSubtitle}>{formatDay(date)}</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab('summary')}
          style={[
            styles.tabButton,
            activeTab === 'summary' && styles.activeTabButton
          ]}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'summary' && styles.activeTabButtonText
          ]}>
            Summary
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('transcripts')}
          style={[
            styles.tabButton,
            activeTab === 'transcripts' && styles.activeTabButton
          ]}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'transcripts' && styles.activeTabButtonText
          ]}>
            Transcripts
          </Text>
        </Pressable>
      </View>

      {/* Content based on active tab */}
      <ScrollView style={styles.content}>
        {activeTab === 'summary' ? renderSummaryTab() : renderTranscriptsTab()}
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        itemType={confirmModal.itemType}
        isLoading={deletingEntryId !== null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#10141B',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Adamina',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#959BA7',
    fontFamily: 'System',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#10141B',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#0C93FC',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#959BA7',
    fontFamily: 'System',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#959BA7',
    fontFamily: 'System',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    fontFamily: 'Adamina',
  },
  
  // Summary tab styles
  summaryContent: {
    paddingVertical: 20,
  },
  emotionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#07080C',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10141B',
  },
  emotionIcon: {
    width: 48,
    height: 48,
    marginRight: 16,
  },
  emotionTextContainer: {
    flex: 1,
  },
  emotionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Adamina',
  },
  emotionQuote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#959BA7',
    fontFamily: 'System',
  },
  photosContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: 'Adamina',
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  dimensionsContainer: {
    marginBottom: 20,
  },
  dimensionItem: {
    marginBottom: 24,
    backgroundColor: '#07080C',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10141B',
  },
  dimensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dimensionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
    fontFamily: 'Adamina',
  },
  dimensionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 32,
    fontFamily: 'System',
  },
  dimensionContent: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
    marginLeft: 32,
    fontFamily: 'System',
  },
  emptyDimensionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyDimensionsTitle: {
    fontSize: 16,
    color: '#959BA7',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontFamily: 'System',
  },
  generateButton: {
    backgroundColor: '#8D51DA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'System',
  },
  noPhotosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  noPhotosText: {
    color: '#959BA7',
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'System',
  },
  refreshButton: {
    backgroundColor: '#161616',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'System',
  },
  
  // Transcripts tab styles
  transcriptsContent: {
    paddingVertical: 20,
  },
  transcriptsHeader: {
    marginBottom: 16,
  },
  transcriptsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  transcriptsSubtitle: {
    fontSize: 14,
    color: '#959BA7',
    fontFamily: 'System',
  },
  entryItem: {
    marginBottom: 16,
    backgroundColor: '#07080C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10141B',
    overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  entryHeaderContent: {
    flex: 1,
    marginRight: 12,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'System',
  },
  entryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  entryTime: {
    fontSize: 12,
    color: '#959BA7',
    marginRight: 12,
    fontFamily: 'System',
  },
  entryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  entryStatText: {
    fontSize: 12,
    color: '#959BA7',
    marginLeft: 4,
    fontFamily: 'System',
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
  },
  entryContent: {
    padding: 16,
    paddingTop: 0,
  },
  entryText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
    fontFamily: 'System',
  },
  glowSphereContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowSphere: {
    position: 'absolute',
  },
});

export default DailySummary;