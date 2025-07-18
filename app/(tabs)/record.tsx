import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AudioRecord from 'react-native-audio-record';
import { useAuth } from '../../lib/auth'; 
import { supabase } from '../../lib/supabase';
import { PhotoUpload as PhotoUploadType } from '../../components/PhotoUpload';
import JournalEditor from '../../components/JournalEditor';
import RecordingWaveAnimation from '../../components/RecordingWaveAnimation';
import { router } from 'expo-router';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality } from 'expo-av/build/Audio';

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

// Helper function to request Android permissions at runtime
const requestAndroidPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    console.log('[RECORD] Requesting Android permissions...');
    
    // For React Native, we need to check if we have the necessary permissions
    // This is a placeholder - in a real app, you'd use react-native-permissions
    // or similar library to check/request permissions at runtime
    
    // For now, we'll assume permissions are granted if they're in the manifest
    console.log('[RECORD] Android permissions assumed granted from manifest');
    return true;
  } catch (error) {
    console.error('[RECORD] Error requesting Android permissions:', error);
    return false;
  }
};

// Helper function to convert raw PCM to proper WAV format
const convertPCMToWAV = (pcmData: Uint8Array, sampleRate: number = 16000): Uint8Array => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const fileSize = 44 + dataSize;
  
  console.log('[RECORD] Converting PCM to WAV:', {
    pcmDataLength: pcmData.length,
    sampleRate,
    numChannels,
    bitsPerSample,
    fileSize
  });
  
  // Create WAV file buffer
  const wavBuffer = new ArrayBuffer(fileSize);
  const view = new DataView(wavBuffer);
  
  // Helper function to write string to buffer
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  try {
    // Write WAV header
    writeString(0, 'RIFF');                    // ChunkID
    view.setUint32(4, fileSize - 8, true);    // ChunkSize (little endian)
    writeString(8, 'WAVE');                   // Format
    writeString(12, 'fmt ');                  // Subchunk1ID
    view.setUint32(16, 16, true);             // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);              // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);    // NumChannels
    view.setUint32(24, sampleRate, true);     // SampleRate
    view.setUint32(28, byteRate, true);       // ByteRate
    view.setUint16(32, blockAlign, true);     // BlockAlign
    view.setUint16(34, bitsPerSample, true);  // BitsPerSample
    writeString(36, 'data');                  // Subchunk2ID
    view.setUint32(40, dataSize, true);       // Subchunk2Size
    
    // Copy PCM data to WAV buffer
    const wavData = new Uint8Array(wavBuffer);
    for (let i = 0; i < pcmData.length; i++) {
      wavData[44 + i] = pcmData[i];
    }
    
    console.log('[RECORD] WAV conversion successful, output size:', wavData.length);
    return wavData;
  } catch (error) {
    console.error('[RECORD] Error in WAV conversion:', error);
    throw new Error('Failed to convert PCM data to WAV format');
  }
};

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

  // Configure AudioRecord for raw PCM recording
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Use app's cache directory for reliable file storage
      const audioFileName = `recording_${Date.now()}.wav`;
      const audioFilePath = `${FileSystem.cacheDirectory}${audioFileName}`;
      
      const audioRecordOptions = {
        sampleRate: 16000,  // 16kHz for Google STT
        channels: 1,        // Mono
        bitsPerSample: 16,  // 16-bit PCM
        audioSource: 6,     // VOICE_RECOGNITION
        wavFile: audioFilePath // Use full path in cache directory
      };
      
      console.log('[RECORD] Initializing AudioRecord with options:', audioRecordOptions);
      console.log('[RECORD] Audio file will be saved to:', audioFilePath);
      
      try {
        AudioRecord.init(audioRecordOptions);
        console.log('[RECORD] AudioRecord initialized successfully');
      } catch (initError) {
        console.error('[RECORD] Error initializing AudioRecord:', initError);
      }
      
      return () => {
        console.log('[RECORD] Cleaning up AudioRecord...');
        try {
          AudioRecord.stop();
        } catch (stopError) {
          console.error('[RECORD] Error stopping AudioRecord during cleanup:', stopError);
        }
      };
    }
  }, []);

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
      console.log('[RECORD] Platform:', Platform.OS);
      console.log('[RECORD] Environment: development');
      
      // Check Android storage permissions first
      if (Platform.OS === 'android') {
        const hasAndroidPermissions = await requestAndroidPermissions();
        if (!hasAndroidPermissions) {
          Alert.alert(
            'Permissions Required',
            'Storage permissions are required to save audio recordings. Please enable them in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => console.log('User should open settings') }
            ]
          );
          return;
        }
      }
      
      // Request microphone permissions
      console.log('[RECORD] Requesting microphone permissions...');
      const { status, granted, canAskAgain } = await Audio.requestPermissionsAsync();
      console.log('[RECORD] Permission result:', { status, granted, canAskAgain });
      
      if (status !== 'granted') {
        console.error('[RECORD] Permission denied:', { status, granted, canAskAgain });
        Alert.alert(
          'Permission Required', 
          'Microphone access is required to record audio. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                // iOS settings URL
                // Note: This would need expo-linking to implement
                console.log('[RECORD] User should open iOS settings manually');
              } else {
                // Android settings URL
                console.log('[RECORD] User should open Android settings manually');
              }
            }}
          ]
        );
        return;
      }
      
      console.log('[RECORD] Microphone permission granted');

      // Use AudioRecord for Android, expo-av for iOS
      if (Platform.OS === 'android') {
        console.log('[RECORD] Starting AudioRecord for Android...');
        AudioRecord.start();
        setRecording(null); // No Audio.Recording object for Android
      } else {
        console.log('[RECORD] Starting expo-av recording for iOS...');
        
        // Prepare recording with platform-specific configuration
        console.log('[RECORD] Setting audio mode...');
      const audioModeConfig = {
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // Changed: might cause issues in production
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix
      };
      
      try {
        await Audio.setAudioModeAsync(audioModeConfig);
        console.log('[RECORD] Audio mode set successfully');
      } catch (audioModeError) {
        console.error('[RECORD] Error setting audio mode:', audioModeError);
        // Continue anyway, as this might not be critical
      }
      
      // Create recording object
      const newRecording = new Audio.Recording();
      
      // Configure for WAV recording (LINEAR16) - optimal for Google Speech-to-Text
      console.log('[RECORD] Preparing recording configuration...');
      const recordingConfig = {
        android: {
          extension: '.m4a',
          outputFormat: AndroidOutputFormat.MPEG_4,
          audioEncoder: AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
        windows: {
          extension: '.wav',
          outputFormat: AndroidOutputFormat.DEFAULT,
          audioEncoder: AndroidAudioEncoder.DEFAULT,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        macos: {
          extension: '.wav',
          audioQuality: IOSAudioQuality.HIGH, // reuse iOS
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      console.log('[RECORD] Recording config for', Platform.OS, ':', recordingConfig[Platform.OS as keyof typeof recordingConfig]);
      
      try {
        await newRecording.prepareToRecordAsync(recordingConfig);
        console.log('[RECORD] Recording prepared successfully');
      } catch (prepareError) {
        console.error('[RECORD] Error preparing recording:', prepareError);
        if (prepareError instanceof Error) {
          throw new Error(`Failed to prepare recording: ${prepareError.message}`);
        } else {
          console.error('[RECORD] Unknown error type:', prepareError);
        }
      }
      
      // Start recording
      console.log('[RECORD] Starting recording...');
      try {
        await newRecording.startAsync();
        console.log('[RECORD] Recording started successfully');
      } catch (startError) {
        console.error('[RECORD] Error starting recording:', startError);
        if (startError instanceof Error) {
          throw new Error(`Failed to start recording: ${startError.message}`);
        }
        else {
          console.error('[RECORD] Unknown error type:', startError);
        }
      }
      
        setRecording(newRecording);
      }
      
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
      
      // Store interval ID for cleanup
      if (Platform.OS === 'ios' && recording) {
        (recording as any).durationInterval = durationInterval;
      } else {
        // Store interval ID globally for Android (using a simple variable)
        (globalThis as any).recordingInterval = durationInterval;
      }
      
      console.log('[RECORD] Recording initialized with duration tracking');
    } catch (error) {
      console.error('[RECORD] Error starting recording:', error);

      if (error instanceof Error) {
        console.error('[RECORD] Error details:', {
          message: error.message,
          stack: error.stack,
          platform: Platform.OS
        });
      } else {
        console.error('[RECORD] Unknown error (not instance of Error):', {
          value: error,
          platform: Platform.OS
        });
      }
      
      let errorMessage = 'Failed to start recording. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Microphone permission is required. Please enable it in device settings.';
        } else if (error.message.includes('prepare')) {
          errorMessage = 'Unable to prepare audio recording. Please check if another app is using the microphone.';
        } else if (error.message.includes('start')) {
          errorMessage = 'Unable to start recording. Please close other audio apps and try again.';
        }
      } else {
        console.warn('[RECORD] Unknown error type:', error);
      }
      
      Alert.alert('Recording Error', errorMessage);
      
      // Reset state on error
      setRecordingState('idle');
      setRecording(null);
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
      // Update UI to show transcribing state
      setRecordingState('transcribing');
      
      let uri: string;
      
      if (Platform.OS === 'android') {
        // Stop AudioRecord
        console.log('[RECORD] Stopping AudioRecord...');
        
        let audioFilePath: string;
        try {
          audioFilePath = await AudioRecord.stop();
          console.log('[RECORD] AudioRecord stopped successfully, received path:', audioFilePath);
          console.log('[RECORD] AudioRecord path type:', typeof audioFilePath);
        } catch (stopError) {
          console.error('[RECORD] Error stopping AudioRecord:', stopError);
          throw new Error('Failed to stop AudioRecord: ' + (stopError instanceof Error ? stopError.message : 'Unknown error'));
        }
        
        if (!audioFilePath || typeof audioFilePath !== 'string') {
          throw new Error('AudioRecord.stop() returned invalid path: ' + audioFilePath);
        }
        
        uri = audioFilePath;
        console.log('[RECORD] Using AudioRecord URI:', uri);
        
        // Clear duration interval
        if ((globalThis as any).recordingInterval) {
          clearInterval((globalThis as any).recordingInterval);
          (globalThis as any).recordingInterval = null;
        }
      } else {
        // Stop expo-av recording
        if (!recording) {
          console.warn('[RECORD] No active recording to stop');
          return;
        }
        
        // Clear duration interval
        if ((recording as any).durationInterval) {
          clearInterval((recording as any).durationInterval);
        }
        
        // Stop recording
        await recording.stopAndUnloadAsync();
        
        // Get recording URI
        const recordingUri = recording.getURI();
        if (!recordingUri) {
          throw new Error('Recording URI is null');
        }
        uri = recordingUri;
        console.log('[RECORD] expo-av recording stopped, URI:', uri);
      }
      
      // Read the audio file as base64
      console.log('[RECORD] Reading audio file...');
      let base64Audio: string;
      
      if (Platform.OS === 'android') {
        try {
          // Ensure we have the correct file path format
          let normalizedUri = uri;
          
          // If the URI doesn't start with file:// or content://, try to normalize it
          if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
            // Check if it's already an absolute path
            if (uri.startsWith('/')) {
              normalizedUri = `file://${uri}`;
            } else {
              // If it's a relative path, use the cache directory
              normalizedUri = `${FileSystem.cacheDirectory}${uri}`;
            }
          }
          
          console.log('[RECORD] Original URI:', uri);
          console.log('[RECORD] Normalized URI:', normalizedUri);
          
          // Try multiple approaches to access the file
          let fileExists = false;
          let workingUri = normalizedUri;
          
          // First try normalized URI
          try {
            const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
            console.log('[RECORD] Normalized file info:', fileInfo);
            fileExists = fileInfo.exists;
            workingUri = normalizedUri;
          } catch (normalizedError) {
            console.log('[RECORD] Normalized URI failed, trying original:', normalizedError);
          }
          
          // If normalized doesn't work, try original URI
          if (!fileExists) {
            try {
              const fileInfoOriginal = await FileSystem.getInfoAsync(uri);
              console.log('[RECORD] Original file info:', fileInfoOriginal);
              fileExists = fileInfoOriginal.exists;
              workingUri = uri;
            } catch (originalError) {
              console.log('[RECORD] Original URI also failed:', originalError);
            }
          }
          
          // If still no luck, try with cache directory prefix
          if (!fileExists) {
            const cacheUri = `${FileSystem.cacheDirectory}${uri.replace(/^.*\//, '')}`;
            try {
              const cacheFileInfo = await FileSystem.getInfoAsync(cacheUri);
              console.log('[RECORD] Cache file info:', cacheFileInfo);
              fileExists = cacheFileInfo.exists;
              workingUri = cacheUri;
            } catch (cacheError) {
              console.log('[RECORD] Cache URI also failed:', cacheError);
            }
          }
          
          if (!fileExists) {
            throw new Error(`Audio file not found at any of the attempted paths: ${uri}, ${normalizedUri}, ${FileSystem.cacheDirectory}${uri.replace(/^.*\//, '')}`);
          }
          
          // AudioRecord produces raw PCM data, convert to WAV
          console.log('[RECORD] Reading PCM data from:', workingUri);
          const pcmData = await FileSystem.readAsStringAsync(workingUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          console.log('[RECORD] Raw PCM data read, size:', pcmData.length);
          
          if (!pcmData || pcmData.length === 0) {
            throw new Error('PCM data is empty or null');
          }
          
          // Convert base64 PCM to Uint8Array
          let pcmBytes: Uint8Array;
          try {
            pcmBytes = Uint8Array.from(atob(pcmData), c => c.charCodeAt(0));
            console.log('[RECORD] PCM bytes array created, length:', pcmBytes.length);
          } catch (decodeError) {
            console.error('[RECORD] Error decoding base64 PCM:', decodeError);
            throw new Error('Failed to decode base64 PCM data');
          }
          
          // Validate PCM data size
          if (pcmBytes.length < 1000) {
            console.warn('[RECORD] PCM data seems too small:', pcmBytes.length);
          }
          
          // Convert PCM to WAV
          try {
            const wavData = convertPCMToWAV(pcmBytes, 16000);
            console.log('[RECORD] WAV data created, length:', wavData.length);
            
            // Convert WAV back to base64 - handle large arrays properly
            let base64String = '';
            const chunkSize = 32768; // Process in chunks to avoid memory issues
            
            for (let i = 0; i < wavData.length; i += chunkSize) {
              const chunk = wavData.slice(i, i + chunkSize);
              base64String += btoa(String.fromCharCode(...chunk));
            }
            
            base64Audio = base64String;
            console.log('[RECORD] PCM converted to WAV, final base64 size:', base64Audio.length);
          } catch (conversionError) {
            console.error('[RECORD] Error in PCM to WAV conversion:', conversionError);
            throw new Error('Failed to convert PCM to WAV format');
          }
          
        } catch (androidError) {
          console.error('[RECORD] Android audio processing error:', androidError);
          // If file reading fails completely, try direct approach
          if (androidError instanceof Error && (androidError.message.includes('not found') || androidError.message.includes('Failed to read'))) {
            console.log('[RECORD] Attempting direct file read...');
            try {
              base64Audio = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64
              });
              console.log('[RECORD] Direct read successful, size:', base64Audio.length);
            } catch (directError) {
              console.error('[RECORD] Direct read also failed:', directError);
              const errorMessage = androidError instanceof Error ? androidError.message : 'Unknown error';
              throw new Error(`Unable to read audio file: ${errorMessage}`);
            }
          } else {
            throw androidError;
          }
        }
      } else {
        // iOS already produces WAV
        try {
          base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
          });
          console.log('[RECORD] WAV file read, size:', base64Audio.length);
        } catch (iosError) {
          console.error('[RECORD] iOS file read error:', iosError);
          const errorMessage = iosError instanceof Error ? iosError.message : 'Unknown error';
          throw new Error(`Unable to read iOS audio file: ${errorMessage}`);
        }
      }
      
      // Both platforms now produce LINEAR16 WAV
      const encoding = 'LINEAR16';
      const sampleRate = 16000;
      
      console.log(`[RECORD] Using encoding: ${encoding} for both platforms`);
      
      // Call the transcribe-audio Edge Function with retry logic
      console.log('[RECORD] Calling transcribe-audio Edge Function...');
      
      let transcriptionResult;
      let lastError;
      
      // Retry transcription up to 3 times
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[RECORD] Transcription attempt ${attempt}/3`);
          
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: {
              audio: base64Audio,
              encoding: encoding,
              sampleRateHertz: sampleRate,
              languageCode: 'en-US'
            }
          });
          
          if (error) {
            console.error(`[RECORD] Transcription error (attempt ${attempt}):`, error);
            lastError = error;
            if (attempt === 3) {
              throw error;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          
          console.log(`[RECORD] Transcription successful (attempt ${attempt}):`, data);
          transcriptionResult = data;
          break;
          
        } catch (invokeError) {
          console.error(`[RECORD] Function invoke error (attempt ${attempt}):`, invokeError);
          lastError = invokeError;
          if (attempt === 3) {
            throw invokeError;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      if (!transcriptionResult) {
        throw lastError || new Error('Transcription failed after 3 attempts');
      }
      
      const data = transcriptionResult;
      
      // Validate and store the transcription result
      const transcript = data?.transcript || '';
      const wordCount = data?.wordCount || 0;
      
      console.log('[RECORD] Final transcription result:', {
        transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
        wordCount,
        duration: recordingDuration
      });
      
      if (!transcript || transcript.trim().length === 0) {
        console.warn('[RECORD] Empty transcription result - allowing user to continue');
        // Don't show this as an error, just proceed with empty transcript
        setCompletedTranscript('');
        setCompletedDuration(recordingDuration);
        setCompletedWordCount(0);
        setRecordingState('idle');
        setTranscript('');
        setInterimTranscript('');
        setShowJournalEditor(true);
        return;
      }
      
      // Store the transcription result
      setCompletedTranscript(transcript);
      setCompletedDuration(recordingDuration);
      setCompletedWordCount(wordCount);
      
      // Reset recording state
      setRecordingState('idle');
      setTranscript('');
      setInterimTranscript('');
      
      // Show the journal editor
      setShowJournalEditor(true);
    } catch (error) {
      console.error('[RECORD] Error stopping recording:', error);
      
      if (error instanceof Error) {
        console.error('[RECORD] Error details:', {
          message: error.message,
          stack: error.stack,
          platform: Platform.OS
        });

        let errorMessage = 'Failed to process recording. Please try again.';
        if (error.message.includes('transcribe') || error.message.includes('API')) {
          errorMessage = 'Transcription service is temporarily unavailable. Please check your internet connection and try again.';
        } else if (error.message.includes('file') || error.message.includes('URI')) {
          errorMessage = 'Unable to read the recorded audio file. Please try recording again.';
        }

        // Show to user, log, etc.
        Alert.alert(
          'Recording Error',
          errorMessage,
          [
            { text: 'Try Again', onPress: () => setRecordingState('idle') },
            { text: 'Save Without Text', onPress: () => {
              setCompletedTranscript('[Transcription failed - manual entry required]');
              setCompletedDuration(recordingDuration);
              setCompletedWordCount(0);
              setRecordingState('idle');
              setTranscript('');
              setInterimTranscript('');
              setShowJournalEditor(true);
            }}
          ]
        );
      } else {
        console.error('[RECORD] Unknown error type:', error);
        // Optionally still show fallback message
        let errorMessage = 'An unknown error occurred. Please try again.';
      }      
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