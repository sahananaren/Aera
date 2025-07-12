import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  
  const handleBackPress = () => {
    router.back();
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigateToPrivacy = () => {
    router.push('/privacy');
  };
  
  const handleNavigateToProfile = () => {
    router.push('/profile');
  };
  
  const handleExportData = () => {
    router.push('/export-data');
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <Pressable 
            style={styles.settingItem}
            onPress={handleNavigateToProfile}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={20} color="#959BA7" />
              <Text style={styles.settingText}>Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#959BA7" />
          </Pressable>

          <Pressable 
            style={styles.settingItem}
            onPress={handleNavigateToPrivacy}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-outline" size={20} color="#959BA7" />
              <Text style={styles.settingText}>Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#959BA7" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable 
            style={styles.settingItem}
            onPress={handleExportData}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="download-outline" size={20} color="#959BA7" />
              <Text style={styles.settingText}>Export Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#959BA7" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable 
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleSignOut}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.settingText, styles.dangerText]}>Sign Out</Text>
            </View>
          </Pressable>
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
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'System',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#10141B',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    fontFamily: 'System',
  },
  toggle: {
    backgroundColor: '#0C93FC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#FF6B6B',
  },
});