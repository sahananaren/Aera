import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Modal, Text, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PhotoGalleryProps {
  photos: string[];
  onDeletePhoto?: (photoUrl: string) => Promise<void>;
  deletingPhotoUrl?: string | null;
}

const { width: screenWidth } = Dimensions.get('window');
const photoSize = (screenWidth - 48) / 3; // 3 photos per row with some spacing

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  photos, 
  onDeletePhoto, 
  deletingPhotoUrl 
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  console.log('[PHOTO_GALLERY] Rendering with photos:', photos);

  if (!photos || photos.length === 0) {
    console.log('[PHOTO_GALLERY] No photos to display');
    return null; // Don't render anything if no photos
  }

  const openLightbox = (index: number) => {
    console.log(`[PHOTO_GALLERY] Opening lightbox for photo at index ${index}`);
    setSelectedPhotoIndex(index);
  };

  const closeLightbox = () => {
    console.log('[PHOTO_GALLERY] Closing lightbox');
    setSelectedPhotoIndex(null);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (selectedPhotoIndex === null || photos.length <= 1) return;
    
    if (direction === 'prev') {
      setSelectedPhotoIndex(selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : photos.length - 1);
    } else {
      setSelectedPhotoIndex(selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : 0);
    }
  };

  const handleImageError = (index: number) => {
    console.error(`[PHOTO_GALLERY] Error loading image at index ${index}:`, photos[index]);
    Alert.alert('Image Error', `Failed to load image. URL: ${photos[index].substring(0, 50)}...`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photos ({photos.length})</Text>
      
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.photoContainer}
            onPress={() => openLightbox(index)}
          >
            <Image 
              source={{ uri: photo }} 
              style={styles.thumbnail}
              resizeMode="cover"
              onError={() => handleImageError(index)}
            />
            
            {/* Delete Button - Only show if onDeletePhoto is provided */}
            {onDeletePhoto && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDeletePhoto(photo);
                }}
                disabled={deletingPhotoUrl === photo}
              >
                {deletingPhotoUrl === photo ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Lightbox Modal */}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeLightbox}
      >
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={closeLightbox}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Delete Button - Only show if onDeletePhoto is provided */}
          {onDeletePhoto && selectedPhotoIndex !== null && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                if (selectedPhotoIndex !== null) {
                  onDeletePhoto(photos[selectedPhotoIndex]);
                  closeLightbox();
                }
              }}
              disabled={deletingPhotoUrl === photos[selectedPhotoIndex]}
            >
              {deletingPhotoUrl === photos[selectedPhotoIndex] ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : (
                <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
              )}
            </TouchableOpacity>
          )}
          
          {/* Main Image */}
          {selectedPhotoIndex !== null && (
            <View style={styles.lightboxImageContainer}>
              <Image 
                source={{ uri: photos[selectedPhotoIndex] }} 
                style={styles.lightboxImage}
                resizeMode="contain"
                onError={() => handleImageError(selectedPhotoIndex)}
              />
            </View>
          )}
          
          {/* Navigation Buttons - Only show if more than one photo */}
          {photos.length > 1 && selectedPhotoIndex !== null && (
            <>
              <TouchableOpacity 
                style={[styles.navButton, styles.prevButton]}
                onPress={() => navigatePhoto('prev')}
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.navButton, styles.nextButton]}
                onPress={() => navigatePhoto('next')}
              >
                <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              {/* Photo Counter */}
              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>
                  {selectedPhotoIndex + 1} / {photos.length}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: 'Adamina',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    width: photoSize,
    height: photoSize,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#07080C',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImageContainer: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  counterContainer: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'System',
  }
});

export default PhotoGallery;