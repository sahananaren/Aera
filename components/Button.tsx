import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'cta';
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'cta':
        return null; // Will use LinearGradient
      case 'secondary':
        return [styles.button, styles.secondaryButton, style];
      default:
        return [styles.button, styles.primaryButton, style];
    }
  };

  const getTextStyle = () => {
    return [styles.text, textStyle];
  };

  if (variant === 'cta') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed ? 0.8 : 1 },
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={['#0C93FC', '#4db6ac']}
          style={styles.gradient}
        >
          <View style={styles.buttonContent}>
            {icon && <Ionicons name={icon} size={16} style={{ marginRight: 8 }} color="#FFFFFF" />}
            <Text style={[styles.text, styles.ctaText, textStyle]}>
              {title}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        getButtonStyle(),
        { opacity: pressed ? 0.8 : 1 },
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon && <Ionicons name={icon} size={16} style={{ marginRight: 8 }} color={variant === 'primary' ? '#959BA7' : '#FFFFFF'} />}
        <Text style={getTextStyle()}>{title}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#07080C',
    borderWidth: 1,
    borderColor: '#10141B',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#959BA7',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  ctaText: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
});