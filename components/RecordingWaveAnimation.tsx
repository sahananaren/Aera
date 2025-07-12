import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface RecordingWaveAnimationProps {
  isRecording: boolean;
  isPaused: boolean;
}

const RecordingWaveAnimation: React.FC<RecordingWaveAnimationProps> = ({ 
  isRecording, 
  isPaused 
}) => {
  // Create animated values for each wave bar
  const animatedValues = React.useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  // Animation function for wave effect
  const animateWaves = () => {
    // Reset animations if paused
    if (isPaused || !isRecording) {
      animatedValues.forEach(value => {
        Animated.timing(value, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    // Create animations for each bar with different timing
    const animations = animatedValues.map((value, index) => {
      return Animated.sequence([
        Animated.timing(value, {
          toValue: 0.3 + Math.random() * 0.7, // Random height between 0.3 and 1.0
          duration: 400 + Math.random() * 600, // Random duration
          useNativeDriver: false,
        }),
        Animated.timing(value, {
          toValue: 0.3,
          duration: 400 + Math.random() * 600,
          useNativeDriver: false,
        })
      ]);
    });

    // Run all animations in parallel and loop
    Animated.parallel(animations).start(() => {
      if (isRecording && !isPaused) {
        animateWaves();
      }
    });
  };

  // Start or stop animation based on recording state
  useEffect(() => {
    if (isRecording && !isPaused) {
      animateWaves();
    }
  }, [isRecording, isPaused]);

  if (!isRecording) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Start speaking...</Text>
      </View>
    );
  }

  if (isPaused) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Recording paused</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.waveContainer}>
        {animatedValues.map((value, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: value.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['10%', '100%']
                }),
              }
            ]}
          >
            <LinearGradient
              colors={['#0C93FC', '#4db6ac']}
              style={styles.gradient}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
            />
          </Animated.View>
        ))}
      </View>
      <Text style={styles.text}>I hear you, go on...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginBottom: 12,
    gap: 4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    width: '100%',
  },
  text: {
    fontSize: 16,
    color: '#959BA7',
    fontStyle: 'italic',
  }
});

export default RecordingWaveAnimation;