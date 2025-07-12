import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { exportUserData } from '../lib/export';

export default function ExportDataScreen() {
  const { user } = useAuth();
  const [options, setOptions] = useState({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    selectAll: true,
    format: 'txt' // 'txt', 'md', or 'json'
  });
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleBackPress = () => {
    router.back();
  };

  const handleSelectAllChange = (value) => {
    setOptions(prev => ({ ...prev, selectAll: value }));
  };

  const handleDateChange = (field, value) => {
    setOptions(prev => ({
      ...prev,
      [field]: value,
      selectAll: false
    }));
  };

  const handleFormatChange = (format) => {
    setOptions(prev => ({ ...prev, format }));
  };

  const handleExport = async () => {
    if (!user) return;

    try {
      setExporting(true);
      setProgress('Preparing your data...');

      const startDate = options.selectAll ? '1900-01-01' : options.startDate;
      const endDate = options.selectAll ? '2100-12-31' : options.endDate;

      await exportUserData(
        user.id,
        startDate,
        endDate,
        options.format,
        (message) => setProgress(message)
      );

      setProgress('Export completed!');
      
      setTimeout(() => {
        setExporting(false);
        setProgress('');
        Alert.alert(
          'Export Complete',
          'Your data has been exported successfully. You can find the zip file in your downloads folder.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }, 2000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setExporting(false);
      setProgress('');
      Alert.alert('Export Failed', 'There was an error exporting your data. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Export Your Data</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Export your journal entries, summaries, and insights
        </Text>

        {/* Date Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          
          <View style={styles.optionContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>Export all data</Text>
              <Switch
                value={options.selectAll}
                onValueChange={handleSelectAllChange}
                trackColor={{ false: '#161616', true: '#0C93FC' }}
                thumbColor="#FFFFFF"
                disabled={exporting}
              />
            </View>
          </View>

          {!options.selectAll && (
            <View style={styles.dateContainer}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <Pressable 
                  style={styles.dateInput}
                  onPress={() => {
                    // On real device, this would open a date picker
                    // For this demo, we'll just show a message 
                  }}
                  disabled={exporting}
                >
                  <Text style={styles.dateText}>{options.startDate}</Text>
                  <Ionicons name="calendar-outline" size={18} color="#959BA7" />
                </Pressable>
              </View>

              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>End Date</Text>
                <Pressable 
                  style={styles.dateInput}
                  onPress={() => {
                    // On real device, this would open a date picker
                    // This would open a date picker on a real device
                  }}
                  disabled={exporting}
                >
                  <Text style={styles.dateText}>{options.endDate}</Text>
                  <Ionicons name="calendar-outline" size={18} color="#959BA7" />
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* File Format Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File Format</Text>
          
          <Pressable 
            style={[
              styles.formatOption,
              options.format === 'txt' && styles.selectedFormat
            ]}
            onPress={() => handleFormatChange('txt')}
            disabled={exporting}
          >
            <View style={styles.formatContent}>
              <View style={styles.radioButton}>
                {options.format === 'txt' && <View style={styles.radioButtonSelected} />}
              </View>
              <View style={styles.formatTextContainer}>
                <Text style={styles.formatTitle}>Plain Text (.txt)</Text>
                <Text style={styles.formatDescription}>Lightweight and readable</Text>
              </View>
            </View>
          </Pressable>

          <Pressable 
            style={[
              styles.formatOption,
              options.format === 'md' && styles.selectedFormat
            ]}
            onPress={() => handleFormatChange('md')}
            disabled={exporting}
          >
            <View style={styles.formatContent}>
              <View style={styles.radioButton}>
                {options.format === 'md' && <View style={styles.radioButtonSelected} />}
              </View>
              <View style={styles.formatTextContainer}>
                <Text style={styles.formatTitle}>Markdown (.md)</Text>
                <Text style={styles.formatDescription}>Structured with formatting</Text>
              </View>
            </View>
          </Pressable>

          <Pressable 
            style={[
              styles.formatOption,
              options.format === 'json' && styles.selectedFormat
            ]}
            onPress={() => handleFormatChange('json')}
            disabled={exporting}
          >
            <View style={styles.formatContent}>
              <View style={styles.radioButton}>
                {options.format === 'json' && <View style={styles.radioButtonSelected} />}
              </View>
              <View style={styles.formatTextContainer}>
                <Text style={styles.formatTitle}>JSON (.json)</Text>
                <Text style={styles.formatDescription}>For importing to other apps</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Progress Indicator */}
        {progress ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressContent}>
              {progress.includes('completed') ? (
                <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
              ) : (
                <ActivityIndicator size="small" color="#0C93FC" />
              )}
              <Text style={styles.progressText}>{progress}</Text>
            </View>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.cancelButton}
            onPress={handleBackPress}
            disabled={exporting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.downloadButton,
              (!options.selectAll && (!options.startDate || !options.endDate)) && styles.disabledButton,
              exporting && styles.disabledButton
            ]}
            onPress={handleExport}
            disabled={exporting || (!options.selectAll && (!options.startDate || !options.endDate))}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.downloadButtonText}>Download</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#10141B',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Adamina',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#959BA7',
    marginBottom: 24,
    fontFamily: 'System',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  optionContainer: {
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#959BA7',
    marginBottom: 8,
    fontFamily: 'System',
  },
  dateInput: {
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  formatOption: {
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedFormat: {
    borderColor: '#0C93FC',
    backgroundColor: 'rgba(12, 147, 252, 0.1)',
  },
  formatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#959BA7',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0C93FC',
  },
  formatTextContainer: {
    flex: 1,
  },
  formatTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'System',
  },
  formatDescription: {
    fontSize: 14,
    color: '#959BA7',
    fontFamily: 'System',
  },
  progressContainer: {
    backgroundColor: 'rgba(12, 147, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(12, 147, 252, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#0C93FC',
    marginLeft: 12,
    fontFamily: 'System',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: '#0C93FC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabledButton: {
    opacity: 0.5,
  },
  downloadButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
});