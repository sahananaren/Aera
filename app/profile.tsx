import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const { user, profile, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState({
    profile: false,
    password: false
  });
  const [success, setSuccess] = useState({
    profile: false,
    password: false
  });
  const [errors, setErrors] = useState({});
  const [editingField, setEditingField] = useState(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  const handleBackPress = () => {
    router.back();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateProfileForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateProfileForm()) return;
    
    setLoading(prev => ({ ...prev, profile: true }));
    
    try {
      // Update email in Supabase Auth if it changed
      if (formData.email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        
        if (emailError) {
          setErrors({ email: emailError.message });
          setLoading(prev => ({ ...prev, profile: false }));
          return;
        }
      }
      
      // Update profile in database
      const { error } = await updateProfile({
        name: formData.name,
        email: formData.email
      });
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to update profile');
      } else {
        setSuccess({ ...success, profile: true });
        setEditingField(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(prev => ({ ...prev, profile: false }));
        }, 3000);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleUpdatePassword = async () => {
    if (!validatePasswordForm()) return;
    
    setLoading(prev => ({ ...prev, password: true }));
    
    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: passwordData.currentPassword
      });
      
      if (verifyError) {
        setErrors({ currentPassword: 'Current password is incorrect' });
        setLoading(prev => ({ ...prev, password: false }));
        return;
      }
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to update password');
      } else {
        setSuccess({ ...success, password: true });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(prev => ({ ...prev, password: false }));
        }, 3000);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Header */}
          <View style={styles.userHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{profile?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{profile?.email || 'user@example.com'}</Text>
            </View>
          </View>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            {/* Name Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  placeholder="Full name"
                  placeholderTextColor="#959BA7"
                  onFocus={() => setEditingField('name')}
                  onBlur={() => setEditingField(null)}
                />
                <Pressable
                  onPress={() => setEditingField('name')}
                  style={styles.editButton}
                >
                  <Ionicons name="pencil-outline" size={18} color="#959BA7" />
                </Pressable>
              </View>
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            {/* Email Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="Email address"
                  placeholderTextColor="#959BA7"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setEditingField('email')}
                  onBlur={() => setEditingField(null)}
                />
                <Pressable
                  onPress={() => setEditingField('email')}
                  style={styles.editButton}
                >
                  <Ionicons name="pencil-outline" size={18} color="#959BA7" />
                </Pressable>
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Save Profile Button */}
            <Pressable
              style={[styles.button, styles.saveButton]}
              onPress={handleUpdateProfile}
              disabled={loading.profile}
            >
              {loading.profile ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Save Changes</Text>
                </>
              )}
            </Pressable>

            {success.profile && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
                <Text style={styles.successText}>Profile updated successfully!</Text>
              </View>
            )}
          </View>

          {/* Change Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>
            
            {/* Current Password Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={passwordData.currentPassword}
                  onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                  placeholder="Current password"
                  placeholderTextColor="#959BA7"
                  secureTextEntry={!showPasswords.current}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => togglePasswordVisibility('current')}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPasswords.current ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#959BA7"
                  />
                </Pressable>
              </View>
              {errors.currentPassword && (
                <Text style={styles.errorText}>{errors.currentPassword}</Text>
              )}
            </View>

            {/* New Password Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={passwordData.newPassword}
                  onChangeText={(value) => handlePasswordChange('newPassword', value)}
                  placeholder="New password"
                  placeholderTextColor="#959BA7"
                  secureTextEntry={!showPasswords.new}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => togglePasswordVisibility('new')}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPasswords.new ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#959BA7"
                  />
                </Pressable>
              </View>
              {errors.newPassword && (
                <Text style={styles.errorText}>{errors.newPassword}</Text>
              )}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={passwordData.confirmPassword}
                  onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                  placeholder="Confirm new password"
                  placeholderTextColor="#959BA7"
                  secureTextEntry={!showPasswords.confirm}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => togglePasswordVisibility('confirm')}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPasswords.confirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#959BA7"
                  />
                </Pressable>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Update Password Button */}
            <Pressable
              style={[
                styles.button, 
                styles.saveButton,
                (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) && styles.disabledButton
              ]}
              onPress={handleUpdatePassword}
              disabled={loading.password || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {loading.password ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Update Password</Text>
                </>
              )}
            </Pressable>

            {success.password && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
                <Text style={styles.successText}>Password updated successfully!</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#10141B',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0C93FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Adamina',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Adamina',
  },
  userEmail: {
    fontSize: 14,
    color: '#959BA7',
    fontFamily: 'System',
  },
  section: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  editButton: {
    padding: 8,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
    fontFamily: 'System',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#0C93FC',
  },
  disabledButton: {
    backgroundColor: '#161616',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  successText: {
    color: '#4ade80',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'System',
  },
});