import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const handleSubmit = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (mode === 'signup' && !formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'signup') {
        result = await signUp(formData.email, formData.password, formData.name);
      } else {
        result = await signIn(formData.email, formData.password);
      }

      if (result.error) {
        let errorMessage = 'An error occurred';
        
        if (mode === 'signup') {
          const errorMsg = result.error.message?.toLowerCase() || '';
          if (errorMsg.includes('already registered') || 
              errorMsg.includes('already exists') ||
              errorMsg.includes('user already registered')) {
            errorMessage = 'An account with this email already exists. Please sign in instead.';
          } else if (errorMsg.includes('password')) {
            errorMessage = 'Password must be at least 6 characters';
          } else if (errorMsg.includes('email')) {
            errorMessage = 'Please enter a valid email address';
          } else {
            errorMessage = result.error.message || 'Failed to create account';
          }
        } else {
          const errorMsg = result.error.message?.toLowerCase() || '';
          if (errorMsg.includes('invalid login credentials') ||
              errorMsg.includes('invalid_credentials') ||
              errorMsg.includes('invalid email or password')) {
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          } else {
            errorMessage = result.error.message || 'Failed to sign in';
          }
        }
        
        Alert.alert('Error', errorMessage);
      } else {
        // Success - navigation will be handled by auth state change
        router.replace('/(tabs)/record');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: 'aera-journal://reset-password',
      });

      if (error) {
        console.error('Password reset error:', error);
        
        // Handle specific error cases
        const errorMsg = error.message?.toLowerCase() || '';
        let errorMessage = 'Failed to send reset email';
        
        if (errorMsg.includes('user not found') || errorMsg.includes('invalid email')) {
          errorMessage = 'No account found with this email address.';
        } else if (errorMsg.includes('too many requests')) {
          errorMessage = 'Too many reset requests. Please wait before trying again.';
        } else {
          errorMessage = error.message || 'Failed to send reset email';
        }
        
        Alert.alert('Error', errorMessage);
      } else {
        setForgotPasswordSent(true);
      }
    } catch (error) {
      console.error('Unexpected error during password reset:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    setShowForgotPassword(false);
    setForgotPasswordSent(false);
    setForgotPasswordEmail('');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Show forgot password confirmation screen
  if (forgotPasswordSent) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Image
                source={require('../assets/Aera-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a password reset link to your email address
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.confirmationMessage}>
                <Ionicons name="checkmark-circle" size={60} color="#0C93FC" style={styles.confirmationIcon} />
                <Text style={styles.confirmationText}>
                  Please check your inbox at {forgotPasswordEmail} and follow the instructions to reset your password.
                </Text>
              </View>

              <Pressable
                onPress={handleBackToSignIn}
                style={styles.submitButton}
              >
                <Text style={styles.submitButtonText}>
                  Back to Sign In
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Image
                source={require('../assets/Aera-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email to receive a reset link
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#959BA7"
                    value={forgotPasswordEmail}
                    onChangeText={(value) => setForgotPasswordEmail(value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <Pressable
                onPress={handleForgotPassword}
                disabled={forgotPasswordLoading}
                style={[
                  styles.submitButton,
                  forgotPasswordLoading && styles.submitButtonDisabled
                ]}
              >
                {forgotPasswordLoading ? (
                  <View style={styles.loadingIndicator} />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Send Reset Link
                  </Text>
                )}
              </Pressable>

              <View style={styles.toggleContainer}>
                <Pressable onPress={handleBackToSignIn}>
                  <Text style={styles.toggleLink}>
                    Back to Sign In
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../assets/Aera-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Āera</Text>
            <Text style={styles.subtitle}>
              Your Journaling Companion
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor="#959BA7"
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#959BA7"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#959BA7" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor="#959BA7"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#959BA7"
                  />
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled
              ]}
            >
              {loading ? (
                <View style={styles.loadingIndicator} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>

            {/* Forgot Password - Only show for sign in */}
            {mode === 'signin' && (
              <Pressable 
                onPress={() => setShowForgotPassword(true)}
                style={styles.forgotPasswordButton}
              > 
                <Text style={styles.forgotPasswordText}>
                  Forgot your password?
                </Text>
              </Pressable>
            )}

            {/* Toggle Mode */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                <Text style={styles.toggleLink}>
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </Text>
              </Pressable>
            </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 2,
    fontFamily: 'Adamina',
  },
  subtitle: {
    fontSize: 16,
    color: '#959BA7',
    fontFamily: 'System',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputWrapper: {
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
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  submitButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#0C93FC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  loadingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0C93FC',
    fontFamily: 'System',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30, // Changed from 24px to 30px to reduce the gap
    gap: 8,
  },
  toggleText: {
    fontSize: 14,
    color: '#959BA7',
    fontFamily: 'System',
  },
  toggleLink: {
    fontSize: 14,
    color: '#0C93FC',
    fontWeight: '600',
    fontFamily: 'System',
  },
  confirmationMessage: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmationIcon: {
    marginBottom: 16,
  },
  confirmationText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'System',
  },
});