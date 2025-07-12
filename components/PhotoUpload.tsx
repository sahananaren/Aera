import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { generateId } from '../lib/storage';

export interface PhotoUpload {
  file: {
    name: string;
    type: string;
    size?: number;
  };
  preview: string;
  id: string;
}

interface PhotoUploadProps {
  photos: PhotoUpload[];
  onPhotosChange: (photos: PhotoUpload[]) => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ photos, onPhotosChange }) => {
  const [uploading, setUploading] = useState(false);
  const MAX_PHOTOS = 10;

  const pickImage = async () => {
    try {
      setUploading(true);
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission denied:', { status });
        Alert.alert('Permission Denied', 'We need permission to access your photos');
        return;
      }
      
      // Check if we've reached the maximum number of photos
      if (photos.length >= MAX_PHOTOS) {
        Alert.alert('Maximum Photos', `You can only add up to ${MAX_PHOTOS} photos per entry.`);
        return;
      }
      
      // Launch image picker
      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      
      console.log('Image picker result:', JSON.stringify(result));
      
      if (!result.canceled && result.assets.length > 0) {
        // Check if adding these would exceed the limit
        if (photos.length + result.assets.length > MAX_PHOTOS) {
          Alert.alert('Maximum Photos', `You can only add up to ${MAX_PHOTOS} photos per entry. Adding ${MAX_PHOTOS - photos.length} more.`);
          result.assets = result.assets.slice(0, MAX_PHOTOS - photos.length);
        }
        
        // Convert selected assets to PhotoUpload format
        const newPhotos = result.assets.map(asset => {
          const fileName = asset.fileName || `image-${Date.now()}.jpg`;
          const fileType = asset.mimeType || 'image/jpeg';
          
          return {
            file: {
              name: fileName,
              type: fileType,
              size: asset.fileSize
            },
            preview: asset.uri,
            id: generateId()
          };
        });
        
        // Add new photos to existing photos
        onPhotosChange([...photos, ...newPhotos]);
      } else {
        console.log('Image picker canceled or no assets selected');
      }
    } catch (error) {
      // Enhanced error logging
      console.error('Error picking images:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        // Log any additional properties that might be present
        ...error
      });
      
      Alert.alert(
        'Error', 
        `Failed to pick images: ${error.message || 'Unknown error'}. Please try again.`
      );
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    onPhotosChange(updatedPhotos);
  };

  return (
    <View style={styles.container}>
      {/* Photo Upload Button */}
      <TouchableOpacity 
        style={styles.uploadButton} 
        onPress={pickImage}
        disabled={uploading || photos.length >= MAX_PHOTOS}
      >
        <View style={styles.uploadContent}>
          <Ionicons name="camera-outline" size={24} color="#959BA7" />
          <Text style={styles.uploadText}>
            {uploading ? 'Loading...' : 'Add Photos'}
          </Text>
        </View>
        {uploading && (
          <ActivityIndicator size="small" color="#0C93FC" style={styles.loader} />
        )}
      </TouchableOpacity>
      
      {/* Photo Previews */}
      {photos.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.previewsContainer}
          contentContainerStyle={styles.previewsContent}
        > 
          {photos.map((photo) => (
            <View key={photo.id} style={styles.previewContainer}>
              <Image 
                source={{ uri: photo.preview }} 
                style={styles.previewImage} 
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.removeButton} 
                onPress={() => removePhoto(photo.id)}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loader: {
    position: 'absolute',
    right: 16,
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
  },
  previewsContainer: {
    marginTop: 16,
  },
  previewsContent: {
    gap: 12,
    paddingRight: 8,
  },
  previewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4, 
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

export default PhotoUpload;

export { PhotoUpload }