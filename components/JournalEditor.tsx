import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PhotoUpload, { PhotoUpload as PhotoUploadType } from './PhotoUpload';
import { uploadPhotos, initializeStorage } from '../lib/storage';

interface JournalEditorProps {
  transcript: string;
  duration: number;
  wordCount: number;
  userId: string;
  onSave: (content: string, title?: string, photoUrls?: string[]) => Promise<void>;
  onCancel: () => void;
  isVisible: boolean;
}

const JournalEditor: React.FC<JournalEditorProps> = ({
  transcript,
  duration,
  wordCount,
  userId,
  onSave,
  onCancel,
  isVisible,
}) => {
  const [content, setContent] = useState(transcript);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentWordCount, setCurrentWordCount] = useState(wordCount);
  const [photos, setPhotos] = useState<PhotoUploadType[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const titleInputRef = useRef<TextInput>(null);

  // Update content when transcript changes
  useEffect(() => {
    console.log('[JOURNAL_EDITOR] Transcript received:', transcript?.substring(0, 50) + '...');
    console.log('[JOURNAL_EDITOR] Transcript length:', transcript?.length || 0);
    setContent(transcript);
  }, [transcript]);

  // Update word count when content changes
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    setCurrentWordCount(words.length);
  }, [content]);

  // Focus title input when editor opens
  useEffect(() => {
    if (isVisible && titleInputRef.current) {
      // Initialize storage when editor opens
      console.log('[JOURNAL_EDITOR] Initializing storage...');
      initializeStorage();
      // Reset photos when editor opens
      console.log('[JOURNAL_EDITOR] Resetting photos array');
      setPhotos([]);
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please add some content to your journal entry.');
      return;
    }

    setIsSaving(true);
    setUploadingPhotos(true);
    
    try {
      console.log('[JOURNAL_EDITOR] Starting save with photos:', photos.length);
      let photoUrls: string[] = [];

      // Upload photos if any
      if (photos.length > 0) {
        console.log('[JOURNAL_EDITOR] Uploading photos...');
        const today = new Date().toLocaleDateString('en-CA');
        const savedPhotos = await uploadPhotos(userId, photos, today);
        photoUrls = savedPhotos.map(photo => photo.url);
        console.log('[JOURNAL_EDITOR] Photos uploaded:', photoUrls);
      }
      
      console.log('[JOURNAL_EDITOR] Saving journal entry with content length:', content.length);
      console.log('[JOURNAL_EDITOR] Photo URLs:', photoUrls);
      
      await onSave(content.trim(), title.trim() || undefined, photoUrls);
      console.log('[JOURNAL_EDITOR] Journal entry saved successfully with', photoUrls.length, 'photos');
    } catch (error) {
      console.error('[JOURNAL_EDITOR] Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save journal entry. Please try again.');
    } finally {
      setIsSaving(false);
      setUploadingPhotos(false);
    }
  };

  const handlePhotosChange = (newPhotos: PhotoUploadType[]) => {
    console.log('[JOURNAL_EDITOR] Photos changed, new count:', newPhotos.length);
    setPhotos(newPhotos);
  };

  const handleCancel = () => {
    if (content.trim() !== transcript || title.trim() || photos.length > 0) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel }
        ]
      );
    } else {
      onCancel();
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleCancel} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#959BA7" />
            </Pressable>
            
            <Text style={styles.headerTitle}>Edit Entry</Text>
            
            <View style={styles.headerButton} />
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.titleContainer}>
              <TextInput
                ref={titleInputRef}
                style={styles.titleInput}
                placeholder="Give your entry a title..."
                placeholderTextColor="#959BA7"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                returnKeyType="next"
                onSubmitEditing={() => {
                  // Focus content input when title is submitted
                }}
              />
            </View>

            {/* Content Input */}
            <View style={styles.contentContainer}>
              <TextInput
                style={styles.contentInput}
                placeholder="Your transcription will appear here..."
                placeholderTextColor="#959BA7"
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Stats Footer */}
          <View style={styles.footer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsContainer}
            >
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={16} color="#0C93FC" />
                <Text style={styles.statText}>{formatDate(new Date())}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={16} color="#4db6ac" />
                <Text style={styles.statText}>{formatTime(new Date())}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="stopwatch-outline" size={16} color="#8D51DA" />
                <Text style={styles.statText}>{formatDuration(duration)}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="text-outline" size={16} color="#93A7F1" />
                <Text style={styles.statText}>{currentWordCount} words</Text>
              </View>
            </ScrollView>
          </View>

          {/* Action Buttons - Added Cancel button next to Save */}
          <View style={styles.actionButtonsContainer}>
            <Pressable
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            
            <Pressable
              onPress={handleSave}
              disabled={!content.trim() || isSaving || uploadingPhotos}
              style={[
                styles.saveButton,
                (!content.trim() || isSaving || uploadingPhotos) && styles.saveButtonDisabled
              ]}
            >
              {isSaving || uploadingPhotos ? (
                <Text style={styles.saveButtonText}>{uploadingPhotos ? 'Uploading...' : 'Saving...'}</Text>
              ) : (
                <Text style={styles.saveButtonText}>Save Entry</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Adamina',
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#10141B',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Adamina',
    padding: 0,
    margin: 0,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  contentInput: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'System',
    lineHeight: 24,
    minHeight: 300,
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  photoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20, // Added 20px top margin here
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#10141B',
    paddingVertical: 12,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#07080C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'System',
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#10141B',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'System',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#0C93FC',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'System',
  },
});

export default JournalEditor;