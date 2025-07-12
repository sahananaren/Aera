import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../lib/auth'; 
import { supabase } from '../../lib/supabase';
import { PhotoUpload as PhotoUploadType } from '../../components/PhotoUpload';
import JournalEditor from '../../components/JournalEditor';
import RecordingWaveAnimation from '../../components/RecordingWaveAnimation';
import { router } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Dimension {
  id: string;
  name: string;
  description: string;
  dialog: string;
  color: string;
}

const dimensions: Dimension[] = [
  {
    id: 'aera',
    name: 'Āera',
    description: 'Open',
    dialog: 'Tell me anything. What\'s on your mind today?',
    color: '#93F3EC'
  },
  {
    id: 'una',
    name: 'Una',
    description: 'Emotion',
    dialog: 'How are you really feeling today? I\'ll hold space for you.',
    color: '#6B8BFF'
  },
  {
    id: 'mira',
    name: 'Mira',
    description: 'Introspection',
    dialog: 'What are you reflecting on right now?',
    color: '#0C93FC'
  },
  {
    id: 'rae',
    name: 'Rae',
    description: 'Achievement',
    dialog: 'What did you build or learn today? What are you proud of?',
    color: '#2FA7C6'
  },
  {
    id: 'nova',
    name: 'Nova',
    description: 'Memories',
    dialog: 'What did you do today that was fun? Share your little stories.',
    color: '#93A7F1'
  },
  {
    id: 'iko',
    name: 'Iko',
    description: 'Little Things',
    dialog: 'Tell me about the small pieces of poetry you found today. A sunset, A cafe, An old book...',
    color: '#08B5A8'
  },
  {
    id: 'mitri',
    name: 'Mitri',
    description: 'Connections',
    dialog: 'Who did you share laughter, deep conversations and a moment of belongingness with?',
    color: '#8D51DA'
  }
];

type RecordingState = 'idle' | 'recording' | 'paused' | 'transcribing';

export default function Record() {
  const { user } = useAuth();
  const [selectedDimension, setSelectedDimension] = useState<Dimension>(dimensions[0]);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [completedTranscript, setCompletedTranscript] = useState('');
  const [completedDuration, setCompletedDuration] = useState(0);
  const [completedWordCount, setCompletedWordCount] = useState(0);
  const [completedPhotos, setCompletedPhotos] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Helper function to get Aera gradient colors
  const getAeraGradientColors = () => {
    return ['#FFFFFF', '#90caf9', '#4db6ac'];
  };

  // Helper function to get Aera glow style
  const getAeraGlowStyle = (opacity: number, blur: number) => {
    return {
      shadowColor: '#4db6ac',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: blur,
      elevation: blur * 2,
    };
  };

  const handleDimensionSelect = (dimension: Dimension) => {
    setSelectedDimension(dimension);
  };

  const handleStartRecording = async () => {
    try {
      console.log('[RECORD] Starting recording with dimension:', selectedDimension.name);
      
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant microphone permissions to record audio.');
        return;
      }
      
      // Prepare recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      
      // Create recording object
      const newRecording = new Audio.Recording();
      
      // Configure for WAV recording (LINEAR16)
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      
      // Start recording
      await newRecording.startAsync();
      setRecording(newRecording);
      
      // Set up recording state
      setRecordingState('recording');
      setTranscript('');
      setInterimTranscript('');
      setRecordingDuration(0);
      setWordCount(0);
      
      // Start duration timer
      const startTime = Date.now();
      const durationInterval = setInterval(() => {
        setRecordingDuration(Date.now() - startTime);
      }, 100);
      
      // Store interval ID in recording object for cleanup
      (newRecording as any).durationInterval = durationInterval;
      
      console.log('[RECORD] Recording started successfully');
    } catch (error) {
      console.error('[RECORD] Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const handlePauseRecording = async () => {
    try {
      if (recording) {
        await recording.pauseAsync();
        
        // Clear duration interval
        if ((recording as any).durationInterval) {
          clearInterval((recording as any).durationInterval);
        }
        
        setRecordingState('paused');
        console.log('[RECORD] Recording paused');
      }
    } catch (error) {
      console.error('[RECORD] Error pausing recording:', error);
    }
  };

  const handleResumeRecording = async () => {
    try {
      if (recording) {
        await recording.startAsync();
        
        // Restart duration timer
        const startTime = Date.now() - recordingDuration;
        const durationInterval = setInterval(() => {
          setRecordingDuration(Date.now() - startTime);
        }, 100);
        
        // Store interval ID in recording object for cleanup
        (recording as any).durationInterval = durationInterval;
        
        setRecordingState('recording');
        console.log('[RECORD] Recording resumed');
      }
    } catch (error) {
      console.error('[RECORD] Error resuming recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (!recording) {
        console.warn('[RECORD] No active recording to stop');
        return;
      }
      
      // Update UI to show transcribing state
      setRecordingState('transcribing');
      
      // Clear duration interval
      if ((recording as any).durationInterval) {
        clearInterval((recording as any).durationInterval);
      }
      
      // Stop recording
      await recording.stopAndUnloadAsync();
      
      // Get recording URI
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Recording URI is null');
      }
      
      console.log('[RECORD] Recording stopped, URI:', uri);
      
      // Read the audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      }); 
      
      console.log('[RECORD] Audio file read, size:', base64Audio.length);
      
      // Use LINEAR16 encoding for WAV files 
      const encoding = 'LINEAR16'; 
      const sampleRate = 16000;
      
      console.log(`[RECORD] Using encoding: ${encoding} for WAV file`);
      
      // Call the transcribe-audio Edge Function
      console.log('[RECORD] Calling transcribe-audio Edge Function...');
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audio: base64Audio,
          encoding: encoding,
          sampleRateHertz: sampleRate,
          languageCode: 'en-US'
        }
      });
      
      if (error) {
        console.error('[RECORD] Transcription error:', error);
        Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again.');
        setRecordingState('idle');
        return;
      }
      
      console.log('[RECORD] Transcription successful:', data);
      
      // Store the transcription result
      setCompletedTranscript(data.transcript || '');
      setCompletedDuration(recordingDuration);
      setCompletedWordCount(data.wordCount || 0);
      
      // Reset recording state
      setRecordingState('idle');
      setTranscript('');
      setInterimTranscript('');
      
      // Show the journal editor
      setShowJournalEditor(true);
    } catch (error) {
      console.error('[RECORD] Error stopping recording:', error);
      Alert.alert('Recording Error', 'Failed to process recording. Please try again.');
      setRecordingState('idle');
    } finally {
      // Clean up recording object
      setRecording(null);
    }
  };

  const cancelRecording = async () => {
    try {
      // Stop any active recording
      if (recording) {
        // Clear duration interval
        if ((recording as any).durationInterval) {
          clearInterval((recording as any).durationInterval);
        }
        
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      
      // Reset state
      setRecordingState('idle');
      setTranscript('');
      setInterimTranscript('');
      setRecordingDuration(0);
      setWordCount(0);
      setSelectedDimension(dimensions[0]);
    } catch (error) {
      console.error('[RECORD] Error canceling recording:', error);
    }
  };

  const handleSaveJournal = async (content: string, title?: string, photoUrls?: string[]) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save journal entries.');
      return;
    }

    try {
      console.log('[RECORD] Saving journal entry with content length:', content.length);
      console.log('[RECORD] Photo URLs:', photoUrls);
      
      const words = content.trim().split(/\s+/).filter(word => word.length > 0);
      
      const { error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          title: title || null,
          content: content,
          entry_date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
          word_count: words.length,
          duration_ms: completedDuration,
          entry_type: 'individual', 
          photos: photoUrls || []
        });

      if (error) {
        console.error('[RECORD] Error saving journal entry:', error);
        console.error('[RECORD] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('[RECORD] Journal entry saved successfully with photos:', photoUrls?.length || 0);
      
      // Close editor and reset
      setShowJournalEditor(false);
      setCompletedTranscript('');
      setCompletedDuration(0);
      setCompletedWordCount(0);
      setCompletedPhotos([]);
      
      // Show success alert with navigation option
      Alert.alert(
        'Success',
        'Journal entry saved successfully! You can find it on the Journals page.',
        [
          {
            text: 'View in Journals',
            onPress: () => router.replace('/(tabs)/journals')
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('[RECORD] Error saving journal entry:', error);
      throw error;
    }
  };

  const handleCancelJournal = () => {
    setShowJournalEditor(false);
    setCompletedTranscript('');
    setCompletedDuration(0);
    setCompletedWordCount(0);
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render dimension selection UI
  const renderDimensionSelection = () => (
    <View style={styles.dimensionContainer}>
      {/* Selected Dimension Display */}
      <View style={styles.selectedDimensionContainer}>
        {/* Animated Orb */}
        <View style={styles.orbContainer}>
          {/* Background glow layers */}
          <View 
            style={[
              styles.glowLayer,
              {
                backgroundColor: selectedDimension.id === 'aera' ? '#4db6ac40' : `${selectedDimension.color}40`,
                ...getAeraGlowStyle(0.4, 8)
              }
            ]}
          />
          <View 
            style={[
              styles.glowLayer,
              {
                backgroundColor: selectedDimension.id === 'aera' ? '#4db6ac30' : `${selectedDimension.color}30`,
                ...getAeraGlowStyle(0.3, 12)
              }
            ]}
          />
          
          {/* Main dark orb */}
          <View 
            style={[
              styles.mainOrb,
              selectedDimension.id === 'aera' 
                ? getAeraGlowStyle(0.6, 16)
                : {
                    shadowColor: selectedDimension.color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 16,
                    elevation: 16,
                  }
            ]}
          />
        </View>

        {/* Name & Description */}
        <View style={styles.dimensionInfo}>
          <Text 
            style={[
              styles.dimensionName, 
              selectedDimension.id === 'aera' 
                ? { color: '#4db6ac' } // Use teal color for Āera
                : { color: selectedDimension.color }
            ]}
          >
            {selectedDimension.name}
          </Text>
          <Text style={styles.dimensionDescription}>
            {selectedDimension.description}
          </Text>
        </View>
      </View>

      {/* Main Dialog */}
      <View style={styles.dialogContainer}>
        <Text style={styles.dialogText}>
          {selectedDimension.dialog}
        </Text>
      </View>

      {/* Dimension Selector */}
      <View style={styles.selectorContainer}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dimensionScrollContainer}
          style={styles.dimensionScroll}
        >
          {dimensions.map((dimension) => {
            const isSelected = selectedDimension.id === dimension.id;
            
            return (
              <Pressable
                key={dimension.id}
                onPress={() => handleDimensionSelect(dimension)}
                style={[
                  styles.dimensionItem,
                  isSelected && styles.dimensionItemSelected
                ]}
              >
                <View style={styles.dimensionItemContent}>
                  {/* Small orb indicator */}
                  <View 
                    style={[
                      styles.smallOrb,
                      {
                        backgroundColor: dimension.id === 'aera' && isSelected 
                          ? '#FFFFFF' 
                          : dimension.color,
                        opacity: isSelected ? 1 : 0.4,
                        shadowColor: dimension.color,
                        shadowOpacity: isSelected ? 0.6 : 0,
                        shadowRadius: isSelected ? 8 : 0,
                        elevation: isSelected ? 8 : 0,
                      }
                    ]}
                  />
                  
                  <View style={styles.dimensionItemText}>
                    <Text 
                      style={[
                        styles.dimensionItemName,
                        {
                          color: isSelected 
                            ? (dimension.id === 'aera' ? '#4db6ac' : dimension.color)
                            : '#959BA7'
                        }
                      ]}
                    >
                      {dimension.name}
                    </Text>
                    <Text 
                      style={[
                        styles.dimensionItemDesc,
                        {
                          color: isSelected ? '#FFFFFF' : '#959BA7'
                        }
                      ]}
                    >
                      {dimension.description}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Record Button */}
      <View style={styles.recordButtonContainer}>
        <Pressable
          onPress={handleStartRecording}
          style={styles.recordButton}
        >
          <View style={styles.recordButtonContent}>
            <Ionicons name="mic-outline" size={24} color="#FFFFFF" />
            <Text style={styles.recordButtonText}>
              Start Recording
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );

  // Render recording UI
  const renderRecordingUI = () => (
    <View style={styles.recordingContainer}>
      {/* Recording Header */}
      <View style={styles.recordingHeader}>
        <View style={styles.recordingDimensionInfo}>
          <View 
            style={[
              styles.recordingOrb,
              {
                backgroundColor: selectedDimension.color,
                shadowColor: selectedDimension.color,
                shadowOpacity: 0.6,
                shadowRadius: 12,
                elevation: 12,
              }
            ]}
          />
          <View>
            <Text style={[styles.recordingDimensionName, { color: selectedDimension.color }]}>
              {selectedDimension.name}
            </Text>
            <Text style={styles.recordingDimensionDesc}>
              {selectedDimension.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Transcription Display */}
      <View style={styles.transcriptionContainer}>
        {transcript || interimTranscript ? (
          <ScrollView 
            style={styles.transcriptionScroll}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <Text style={styles.transcriptionText}>
              {transcript}
              <Text style={styles.interimText}>{interimTranscript}</Text>
            </Text>
          </ScrollView>
        ) : recordingState === 'transcribing' ? (
          <View style={styles.transcriptionPlaceholder}>
            <View style={styles.transcribingIndicator}>
              <Ionicons name="mic-outline" size={24} color="#0C93FC" />
              <Text style={styles.transcriptionPlaceholderText}>
                Transcribing audio...
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.transcriptionPlaceholder}>
            <RecordingWaveAnimation 
              isRecording={recordingState === 'recording'} 
              isPaused={recordingState === 'paused'} 
            />
          </View>
        )}
      </View>

      {/* Recording Controls */}
      <View style={styles.recordingControls}>
        {/* Stats */}
        <View style={styles.recordingStats}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#0C93FC" />
            <Text style={styles.statText}>{formatDuration(recordingDuration)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="text-outline" size={16} color="#4db6ac" />
            <Text style={styles.statText}>{wordCount} words</Text>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlButtons}>
          <Pressable
            onPress={cancelRecording}
            style={[styles.controlButton, styles.stopButton]}
            disabled={recordingState === 'transcribing'}
          >
            {recordingState === 'transcribing' ? (
              <View style={styles.loadingIndicator} />
            ) : (
              <Ionicons name="close" size={24} color="#959BA7" />
            )}
          </Pressable>

          <Pressable
            onPress={recordingState === 'recording' ? handlePauseRecording : handleResumeRecording}
            style={[styles.controlButton, styles.playPauseButton]}
            disabled={recordingState === 'transcribing'}
          >
            <Ionicons 
              name={recordingState === 'recording' ? 'pause' : 'play'} 
              size={32} 
              color="#FFFFFF" 
            />
          </Pressable>

          <Pressable
            onPress={handleStopRecording}
            style={[
              styles.controlButton, 
              styles.completeButton, 
              {
                backgroundColor: `${selectedDimension.color}50`,
                borderColor: selectedDimension.color
              },
              recordingState === 'transcribing' && styles.disabledButton
            ]}
            disabled={recordingState === 'transcribing'}
          >
            <Ionicons 
              name="checkmark" 
              size={24} 
              color={selectedDimension.color} 
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {recordingState === 'idle' ? renderDimensionSelection() : renderRecordingUI()}
      
      {/* Journal Editor Modal */}
      <JournalEditor
        transcript={completedTranscript}
        duration={completedDuration}
        wordCount={completedWordCount}
        userId={user?.id || ''}
        onSave={handleSaveJournal}
        onCancel={handleCancelJournal}
        isVisible={showJournalEditor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  
  // Dimension Selection Styles
  dimensionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  selectedDimensionContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  orbContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowLayer: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  mainOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  dimensionInfo: {
    alignItems: 'center',
  },
  dimensionName: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Adamina',
    textAlign: 'center',
    marginBottom: 8,
  },
  dimensionDescription: {
    fontSize: 16,
    color: '#959BA7',
    fontFamily: 'System',
    textAlign: 'center',
  },
  dialogContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialogText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: 'Adamina',
    textAlign: 'center',
    lineHeight: 28,
  },
  selectorContainer: {
    paddingBottom: 20,
  },
  dimensionScroll: {
    maxHeight: 120,
  },
  dimensionScrollContainer: {
    paddingHorizontal: 10,
    gap: 20,
  },
  dimensionItem: {
    width: 120,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
  },
  dimensionItemSelected: {
    borderColor: '#0C93FC',
    backgroundColor: '#0C93FC10',
  },
  dimensionItemContent: {
    alignItems: 'center',
  },
  smallOrb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  dimensionItemText: {
    alignItems: 'center',
  },
  dimensionItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Adamina',
    textAlign: 'center',
    marginBottom: 4,
  },
  dimensionItemDesc: {
    fontSize: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
  recordButtonContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  recordButton: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#0C93FC',
  },
  recordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },

  // Recording UI Styles
  recordingContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recordingHeader: {
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  recordingDimensionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  recordingDimensionName: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Adamina',
  },
  recordingDimensionDesc: {
    fontSize: 14,
    color: '#959BA7',
    fontFamily: 'System',
  },
  transcriptionContainer: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  transcriptionScroll: {
    flex: 1,
  },
  transcriptionText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'System',
    lineHeight: 26,
  },
  interimText: {
    opacity: 0.7,
  },
  transcriptionPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcriptionPlaceholderText: {
    fontSize: 18,
    color: '#959BA7',
    fontFamily: 'System',
    fontStyle: 'italic',
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingControls: {
    paddingBottom: 40,
  },
  recordingStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 30,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#07080C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'System',
    fontWeight: '500',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#07080C',
    borderColor: '#10141B',
  },
  stopButton: {
    backgroundColor: '#07080C',
    borderColor: '#10141B',
  },
  completeButton: {
    backgroundColor: '#07080C',
    borderColor: '#10141B',
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
});