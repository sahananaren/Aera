import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const handleBackPress = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last Updated: June 30, 2025</Text>
          
          <Text style={styles.paragraph}>
            Welcome to Āera ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience when using our journal application.
          </Text>

          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Account Information:</Text> When you register, we collect your name and email address to create and manage your account.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Journal Content:</Text> We store the journal entries, audio recordings, and photos you create within the app.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Usage Data:</Text> We collect information about how you interact with our app, including features used and time spent journaling.
          </Text>

          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Providing Services:</Text> To deliver our journaling features, including AI-powered insights and summaries.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Personalization:</Text> To customize your experience and improve our AI analysis capabilities.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Service Improvement:</Text> To understand usage patterns and enhance our features.
          </Text>

          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.paragraph}>
            Your journal entries and personal data are encrypted and stored securely. We implement appropriate technical and organizational measures to protect your information.
          </Text>

          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal information. Your journal content is private and not shared with third parties except in the following circumstances:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• With service providers who help us deliver our services</Text>
            <Text style={styles.bulletItem}>• When required by law or to protect our rights</Text>
            <Text style={styles.bulletItem}>• With your explicit consent</Text>
          </View>

          <Text style={styles.sectionTitle}>AI Processing</Text>
          <Text style={styles.paragraph}>
            Our app uses artificial intelligence to analyze your journal entries and generate insights. This processing occurs on secure servers. The AI models are designed to identify patterns and themes in your writing but do not store your content for training purposes.
          </Text>

          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to access, correct, or delete your personal information. You can export your data at any time through the app's settings.
          </Text>

          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your data for as long as your account is active. If you delete your account, your personal information and journal entries will be permanently removed from our systems within 30 days.
          </Text>

          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our services are not directed to individuals under 16. We do not knowingly collect personal information from children under 16. If we become aware that a child under 16 has provided us with personal information, we will take steps to delete such information.
          </Text>

          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
          </Text>

          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this privacy policy or our data practices, please contact us at aerabysahana@gmail.com
          </Text>
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
  },
  section: {
    paddingVertical: 24,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#959BA7',
    marginBottom: 16,
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Adamina',
  },
  paragraph: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 22,
    fontFamily: 'System',
  },
  bold: {
    fontWeight: '600',
    fontFamily: 'System',
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
    fontFamily: 'System',
  },
});