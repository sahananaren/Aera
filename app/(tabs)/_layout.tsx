import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const router = useRouter();
  const isOnRecordScreen = false; // This will be updated with proper navigation state

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Profile Icon - Fixed position in top right */}
      <View style={styles.topRightContainer}>
        {/* Settings Button */}
        <Pressable
          onPress={handleSettingsPress}
          style={styles.profileButton}
        >
          <View style={styles.profileIconContainer}>
            <Ionicons name="settings-outline" size={22} color="#959BA7" />
          </View>
        </Pressable>
      </View>
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#0C93FC',
          tabBarInactiveTintColor: '#959BA7',
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="journals"
          options={{
            tabBarLabel: 'Journals',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="record"
          options={{
            tabBarLabel: '',
            tabBarIcon: ({ focused }) => (
              <View style={styles.recordButtonContainer}>
                {!isOnRecordScreen ? (
                  <LinearGradient
                    colors={['#0C93FC', '#4db6ac']}
                    style={styles.recordButton}
                  >
                    <Ionicons 
                      name="mic-outline" 
                      size={28} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                ) : (
                  <View style={[styles.recordButton, styles.mutedRecordButton]}>
                    <Ionicons 
                      name="mic-outline" 
                      size={28} 
                      color="#FFFFFF" 
                    />
                  </View>
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            tabBarLabel: 'Insights',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#000000',
    borderTopColor: '#10141B',
    borderTopWidth: 1,
    height: 90,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabBarLabel: {
    fontSize: 12,
    fontFamily: 'System',
    color: '#959BA7',
  },
  recordButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C93FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mutedRecordButton: {
    backgroundColor: '#07080C',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  topRightContainer: {
    position: 'absolute',
    right: 20,
    top: 70,
    zIndex: 100,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  profileButton: {
    zIndex: 100,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#10141B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});