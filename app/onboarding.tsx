import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function OnboardingScreen() {
  const handleGetStarted = () => {
    // Navigate to the main app after onboarding
    router.replace('/(tabs)/record');
  };

  const handleSkip = () => {
    // Skip onboarding and go to main app
    router.replace('/(tabs)/record');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#FFFFFF', '#90caf9', '#4db6ac']}
            style={styles.logoGradient}
          >
            <Text style={styles.logo}>Ā</Text>
          </LinearGradient>
          <Text style={styles.title}>Welcome to Āera</Text>
          <Text style={styles.subtitle}>Your personal AI-powered journal</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>🎙️</Text>
            </View>
            <Text style={styles.featureTitle}>Voice Recording</Text>
            <Text style={styles.featureDescription}>
              Record your thoughts with ease using voice-to-text
            </Text>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>🤖</Text>
            </View>
            <Text style={styles.featureTitle}>AI Insights</Text>
            <Text style={styles.featureDescription}>
              Get personalized insights and patterns from your entries
            </Text>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>📊</Text>
            </View>
            <Text style={styles.featureTitle}>Track Progress</Text>
            <Text style={styles.featureDescription}>
              Monitor your emotional journey and personal growth
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.getStartedButton} onPress={handleGetStarted}>
            <LinearGradient
              colors={['#0C93FC', '#4db6ac']}
              style={styles.buttonGradient}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Adamina',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Adamina',
  },
  subtitle: {
    fontSize: 16,
    color: '#959BA7',
    textAlign: 'center',
    fontFamily: 'System',
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  feature: {
    alignItems: 'center',
    marginBottom: 40,
  },
  featureIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#07080C',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10141B',
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Adamina',
  },
  featureDescription: {
    fontSize: 14,
    color: '#959BA7',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    fontFamily: 'System',
  },
  actions: {
    paddingBottom: 40,
  },
  getStartedButton: {
    marginBottom: 16,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#959BA7',
    fontFamily: 'System',
  },
});