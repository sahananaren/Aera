import React from 'react';
import { View, Text, Modal, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemType: string;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemType,
  isLoading = false
}) => {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="trash" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
          
          <Text style={styles.modalMessage}>
            Are you sure you want to delete {itemType}?
          </Text>
          
          <Text style={styles.modalSubMessage}>
            {message}
          </Text>
          
          <Text style={styles.modalWarning}>
            This action cannot be undone.
          </Text>
          
          <View style={styles.modalButtons}>
            <Pressable 
              onPress={onClose}
              style={[styles.modalButton, styles.cancelButton]}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            
            <Pressable 
              onPress={onConfirm}
              style={[styles.modalButton, styles.deleteConfirmButton]}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingIndicator} />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#07080C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10141B',
    width: '100%',
    maxWidth: 320,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Adamina',
  },
  modalMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'System',
  },
  modalSubMessage: {
    fontSize: 14,
    color: '#959BA7',
    marginBottom: 8,
    fontFamily: 'System',
  },
  modalWarning: {
    fontSize: 14,
    color: '#FF6B6B',
    marginBottom: 24,
    fontFamily: 'System',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#161616',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  deleteConfirmButton: {
    backgroundColor: '#FF6B6B',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
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

export default ConfirmationModal;