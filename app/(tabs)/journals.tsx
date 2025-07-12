import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DailySummary from '../../components/DailySummary';
import DimensionFrequency from '../../components/DimensionFrequency';
import { useAuth } from '../../lib/auth'; 
import { supabase, generateMonthlySummary, getMonthlySummaries, checkMonthlySummariesExist } from '../../lib/supabase';
import { Card } from '../../components/Card';

interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  entry_date: string;
  word_count: number;
  duration_ms: number;
  created_at: string;
}

const { width: screenWidth } = Dimensions.get('window');
const calendarWidth = screenWidth - 40; // Account for padding
const daySize = Math.floor(calendarWidth / 7); // 7 days per week

// Emotion icons mapping for calendar
const emotionIcons: { [key: string]: any } = {
  'Excitement': require('../../assets/emotions/Excitement.png'),
  'Joy': require('../../assets/emotions/Joy.png'),
  'Contentment': require('../../assets/emotions/Contentment.png'),
  'Pride': require('../../assets/emotions/Pride.png'),
  'Sad': require('../../assets/emotions/Sadness.png'),
  'Anxiety': require('../../assets/emotions/Anxiety.png'),
  'Inadequacy': require('../../assets/emotions/Inadequacy.png'),
  'Regret': require('../../assets/emotions/Regret.png'),
  'Anger': require('../../assets/emotions/Anger.png'),
  'Emptiness': require('../../assets/emotions/Emptiness.png'),
  'Restless': require('../../assets/emotions/Restlessness.png'),
  'Overwhelm': require('../../assets/emotions/Overwhelm.png'),
};

export default function JournalsScreen() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthEntries, setMonthEntries] = useState<{[key: string]: JournalEntry[]}>({});
  const [monthEmotions, setMonthEmotions] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState('Overall');
  const [monthlySummaries, setMonthlySummaries] = useState<{[key: string]: string}>({});
  const [loadingMonthlySummary, setLoadingMonthlySummary] = useState(false);
  const [showDimensionDropdown, setShowDimensionDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDailySummary, setShowDailySummary] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Available dimensions for monthly summary
  const availableDimensions = [
    'Overall',
    'Achievement', 
    'Introspection',
    'Memories',
    'Little Things',
    'Connections',
    'Major life event'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of the month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Get previous month's last days to fill the calendar
  const prevMonth = new Date(currentYear, currentMonth - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();

  useEffect(() => {
    if (user) {
      fetchMonthEntries();
      fetchMonthlySummaries();
    }
  }, [user, currentMonth, currentYear]);

  const fetchMonthEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get first and last day of current month in YYYY-MM-DD format
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      
      const startDate = firstDay.toLocaleDateString('en-CA');
      const endDate = lastDay.toLocaleDateString('en-CA');
      
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_type', 'individual')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching entries:', error);
      } else {
        // Group entries by date
        const entriesByDate: {[key: string]: JournalEntry[]} = {};
        if (data) {
          data.forEach(entry => {
            const dateKey = entry.entry_date;
            if (!entriesByDate[dateKey]) {
              entriesByDate[dateKey] = [];
            }
            entriesByDate[dateKey].push(entry);
          });
        }
        
        setMonthEntries(entriesByDate);
      }

      // Fetch emotions for the month
      const { data: summariesData, error: summariesError } = await supabase
        .from('summaries')
        .select('summary_date, emotions')
        .eq('user_id', user.id)
        .gte('summary_date', startDate)
        .lte('summary_date', endDate);

      if (summariesError) {
        console.error('Error fetching summaries:', summariesError);
      } else {
        // Extract dominant emotion for each date
        const emotionsByDate: {[key: string]: string} = {};
        summariesData?.forEach(summary => {
          if (summary.emotions && summary.emotions.length > 0) {
            // Get the first (dominant) emotion
            emotionsByDate[summary.summary_date] = summary.emotions[0].emotion;
          }
        });
        setMonthEmotions(emotionsByDate);
      }
    } catch (error) {
      console.error('Error fetching month entries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch monthly summaries
  const fetchMonthlySummaries = async () => {
    if (!user) return;

    try {
      const monthName = months[currentMonth];
      
      // Check if monthly summaries exist for this specific month/year
      const summariesExist = await checkMonthlySummariesExist(user.id, currentYear, monthName);
      
      if (!summariesExist) {
        // Clear existing summaries if we're looking at a different month
        setMonthlySummaries({});
      } else {
        // Fetch existing summaries
        const { data, error } = await getMonthlySummaries(user.id, currentYear, monthName);
        
        if (error) {
          console.error('Error fetching monthly summaries:', error);
          setMonthlySummaries({});
          return;
        }

        // Convert to object for easy access
        const summariesObj: {[key: string]: string} = {};
        if (data) {
          data.forEach(summary => {
            summariesObj[summary.dimension] = summary.summary;
          });
        }
        
        setMonthlySummaries(summariesObj);
      }
    } catch (error) {
      console.error('Error fetching monthly summaries:', error);
      setMonthlySummaries({});
    }
  };

  // Generate monthly summaries for current month
  const generateMonthlySummariesForCurrentMonth = async () => {
    if (!user) return;

    try {
      setLoadingMonthlySummary(true);
      const monthName = months[currentMonth];
      
      console.log(`Generating monthly summaries for ${monthName} ${currentYear}`);
      
      const result = await generateMonthlySummary(user.id, monthName, currentYear);
      
      if (result.summaries) {
        // Convert to object for easy access
        const summariesObj: {[key: string]: string} = {};
        result.summaries.forEach((summary: any) => {
          summariesObj[summary.dimension] = summary.summary;
        });
        
        setMonthlySummaries(summariesObj);
        console.log('Monthly summaries generated successfully');
      }
    } catch (error) {
      console.error('Error generating monthly summaries:', error);
    } finally {
      setLoadingMonthlySummary(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMonthEntries();
    fetchMonthlySummaries();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setFullYear(prev.getFullYear() - 1);
      } else {
        newDate.setFullYear(prev.getFullYear() + 1);
      }
      return newDate;
    });
  };

  // Check if current month has any entries
  const hasEntriesForCurrentMonth = () => {
    return Object.keys(monthEntries).length > 0;
  };

  // Check if monthly summaries exist for current month
  const hasMonthlySummariesForCurrentMonth = () => {
    return Object.keys(monthlySummaries).length > 0;
  };

  // Determine if we should show generate button
  const shouldShowGenerateButton = () => {
    const hasEntries = hasEntriesForCurrentMonth();
    const hasSummaries = hasMonthlySummariesForCurrentMonth();
    return hasEntries && !hasSummaries;
  };

  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  const selectDate = (day: number) => {
    const selected = new Date(currentYear, currentMonth, day);
    setSelectedDate(selected);
    
    // Check if this date has entries
    const dateKey = selected.toLocaleDateString('en-CA');
    const hasEntries = monthEntries[dateKey] && monthEntries[dateKey].length > 0;
    
    if (hasEntries) {
      setShowDailySummary(true);
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Previous month's trailing days
    for (let i = 0; i < firstDayWeekday; i++) {
      const day = daysInPrevMonth - firstDayWeekday + i + 1;
      days.push(
        <View key={`prev-${day}`} style={[styles.dayContainer, { opacity: 0.3 }]}>
          <Text style={styles.dayText}>{day}</Text>
        </View>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const isTodayDate = isToday(day);
      
      // Check if this day has entries
      const dayDate = new Date(currentYear, currentMonth, day);      
      const dateKey = dayDate.toLocaleDateString('en-CA');
      const hasEntries = monthEntries[dateKey] && monthEntries[dateKey].length > 0;
      const emotion = monthEmotions[dateKey];
      const isCurrentMonth = true; // All days in this loop are in current month
      const isFutureDate = dayDate > today;
      
      days.push(
        <Pressable
          key={day}
          onPress={() => hasEntries && selectDate(day)}
          style={[
            styles.dayContainer,
            hasEntries && styles.hasEntriesContainer
          ]}
        >
          {hasEntries ? (
            <Image 
              source={emotionIcons[emotion] || require('../../assets/emotions/No Emotion.png')}
              style={styles.emotionIcon} 
            />
          ) : !isFutureDate ? (
            <Image 
              source={require('../../assets/emotions/No Emotion.png')}
              style={[styles.emotionIcon, { opacity: 0.3 }]}
            />
          ) : (
            <View style={styles.emotionIconPlaceholder} />  
          )}
          <Text style={[
            styles.dayText,
            isTodayDate && styles.todayText,
            hasEntries && styles.hasEntriesText,
          ]}>
            {day}
          </Text>
        </Pressable>
      );
    }

const totalRows = Math.ceil((firstDayWeekday + daysInMonth) / 7);
const totalCells = totalRows * 7;
const extraCells = totalCells - (firstDayWeekday + daysInMonth);

for (let day = 1; day <= extraCells; day++) {
  days.push(
    <Pressable
      key={`next-${day}`}
      disabled={true}
      style={[styles.dayContainer, { opacity: 0.3 }]}
    >
      <View style={styles.emotionIconPlaceholder} />
      <Text style={styles.dayText}>{day}</Text>
    </Pressable>
  );
}


    return days;
  };

  const getTotalStats = () => {
    const totalEntries = Object.values(monthEntries).reduce((total, entries) => total + entries.length, 0);
    const totalWords = Object.values(monthEntries).reduce((total, entries) => 
      total + entries.reduce((entryTotal, entry) => entryTotal + entry.word_count, 0), 0
    );
    const totalTime = Object.values(monthEntries).reduce((total, entries) => 
      total + entries.reduce((entryTotal, entry) => entryTotal + entry.duration_ms, 0), 0
    );

    return { totalEntries, totalWords, totalTime };
  };

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const { totalEntries, totalWords, totalTime } = getTotalStats();

  if (showDailySummary && selectedDate) {
    return (
      <SafeAreaView style={styles.container}>
        <DailySummary 
          date={selectedDate}
          onBack={() => setShowDailySummary(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Journals</Text>
        <Text style={styles.subtitle}>
          Select a date to view Daily Summary. Scroll for Monthly Summary
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Month Stats - Moved above calendar */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statItem}>
              <Ionicons name="book-outline" size={20} color="#0C93FC" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Entries</Text>
                <Text style={styles.statValue}>{totalEntries}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statItem}>
              <Ionicons name="text-outline" size={20} color="#4db6ac" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Words</Text>
                <Text style={styles.statValue}>{totalWords.toLocaleString()}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color="#8D51DA" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>{formatTime(totalTime)}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <Pressable onPress={() => navigateMonth('prev')} style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color="#959BA7" />
            </Pressable>
            <Text style={styles.monthText}>{months[currentMonth]}</Text>
            <Pressable onPress={() => navigateMonth('next')} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={20} color="#959BA7" />
            </Pressable>
          </View>

          {/* Year Navigation */}
          <View style={styles.yearNavigation}>
            <Pressable onPress={() => navigateYear('prev')} style={styles.navButton}>
              <Ionicons name="chevron-back" size={16} color="#959BA7" />
            </Pressable>
            <Text style={styles.yearText}>{currentYear}</Text>
            <Pressable onPress={() => navigateYear('next')} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={16} color="#959BA7" />
            </Pressable>
          </View>
        </View>

        {/* Days of Week Header */}
        <View style={styles.daysHeader}>
          {daysOfWeek.map((day) => (
            <View key={day} style={styles.dayHeaderContainer}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {renderCalendarDays()}
        </View>

        {totalEntries === 0 && !loading && (
          <></>
        )}

        {/* Monthly Summary Section - Now in a Card container */}
        <Card style={styles.summaryCard}>
          <View style={styles.monthlySummaryHeader}>
            <Text style={styles.monthlySummaryTitle}>Monthly Summary</Text>
            
            {/* Dimension Dropdown */}
            <Pressable 
              onPress={() => setShowDimensionDropdown(!showDimensionDropdown)}
              style={styles.dimensionDropdownButton}
            >
              <Text style={styles.dimensionDropdownText}>{selectedDimension}</Text>
              <Ionicons 
                name={showDimensionDropdown ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#959BA7" 
              />
            </Pressable>
          </View>
          
          {/* Dimension Dropdown Menu */}
          {showDimensionDropdown && (
            <View style={styles.dimensionDropdownMenu}>
              {availableDimensions.map((dimension) => (
                <Pressable
                  key={dimension}
                  style={[
                    styles.dimensionDropdownItem,
                    selectedDimension === dimension && styles.dimensionDropdownItemSelected
                  ]}
                  onPress={() => {
                    setSelectedDimension(dimension);
                    setShowDimensionDropdown(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.dimensionDropdownItemText,
                      selectedDimension === dimension && styles.dimensionDropdownItemTextSelected
                    ]}
                  >
                    {dimension}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          
          {/* Monthly Summary Content */}
          <View style={styles.monthlySummaryContent}>
            {loadingMonthlySummary ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0C93FC" />
                <Text style={styles.loadingText}>Generating summary...</Text>
              </View>
            ) : monthlySummaries[selectedDimension] ? (
              <Text style={styles.monthlySummaryText}>
                {monthlySummaries[selectedDimension]}
              </Text>
            ) : (  
              <View style={styles.emptySummaryContainer}>
                <Ionicons name="document-text-outline" size={24} color="#959BA7" />
                <Text style={styles.emptySummaryText}>
                  {Object.keys(monthEntries).length === 0 
                    ? "No Entries This Month" 
                    : "No monthly summary available"}
                </Text>
                {shouldShowGenerateButton() && (
                  <Pressable
                    onPress={generateMonthlySummariesForCurrentMonth}
                    disabled={loadingMonthlySummary}
                    style={styles.generateButton}
                  >
                    {loadingMonthlySummary ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.generateButtonText}>Generate Summary</Text>
                    )}
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </Card>

        {/* Dimension Frequency Section - Now in a Card container */}
        <Card style={styles.dimensionsCard}>
          <Text style={styles.sectionTitle}>Your Dimensions</Text>
          <DimensionFrequency 
            currentMonth={currentMonth}
            currentYear={currentYear}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
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
    fontFamily: 'System',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  calendarHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yearNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    minWidth: 100,
    textAlign: 'center',
    fontFamily: 'Adamina',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#959BA7',
    minWidth: 50,
    textAlign: 'center',
    fontFamily: 'System',
  },
  daysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayHeaderContainer: {
    width: daySize,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#959BA7',
    fontFamily: 'System',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8, // Reduced from 20 to 8 to make room for subtitle
    justifyContent: 'flex-start',
    rowGap: 16,
    columnGap: 8,
  },
  calendarSubtitle: {
    fontSize: 14,
    color: '#959BA7',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'System',
    paddingHorizontal: 20,
  },
  dayContainer: {
    width: (screenWidth - 40) / 7,
    height: (screenWidth - 40) / 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    borderRadius: 8,
    gap: 4,
  },
  hasEntriesContainer: {
    backgroundColor: '#07080C',
  },
  dayText: {
    fontSize: 14,
    color: '#959BA7',
    fontWeight: '500',
    fontFamily: 'System',
  },
  todayText: {
    color: '#0C93FC',
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  hasEntriesText: {
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  emotionIcon: {
    width: 36,
    height: 36, 
    resizeMode: 'contain',
  },
  emotionIconPlaceholder: {
    width: 36,
    height: 36,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20, 
    gap: 12,
    marginBottom: 16,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    padding: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#959BA7',
    marginBottom: 2,
    fontFamily: 'System',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
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
    fontFamily: 'System',
  },
  // Card containers for monthly summary and dimensions
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 20, 
    padding: 20,
    backgroundColor: '#07080C',
    borderColor: '#10141B',
  },
  dimensionsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#07080C',
    borderColor: '#10141B',
  },
  monthlySummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthlySummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Adamina',
  },
  dimensionDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  dimensionDropdownText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  dimensionDropdownMenu: {
    backgroundColor: '#161616',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#10141B',
  },
  dimensionDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dimensionDropdownItemSelected: {
    backgroundColor: '#0C93FC20',
  },
  dimensionDropdownItemText: {
    fontSize: 14,
    color: '#959BA7',
    fontFamily: 'System',
  },
  dimensionDropdownItemTextSelected: {
    color: '#0C93FC',
    fontWeight: '600',
    fontFamily: 'System',
  },
  monthlySummaryContent: {
    minHeight: 150,
  },
  monthlySummaryText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    fontFamily: 'System',
  },
  emptySummaryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptySummaryText: {
    fontSize: 14,
    color: '#959BA7',
    marginTop: 8,
    marginBottom: 16,
    fontFamily: 'System',
  },
  generateButton: {
    backgroundColor: '#0C93FC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#959BA7',
    marginTop: 8,
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'Adamina',
  },
});