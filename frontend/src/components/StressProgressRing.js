import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const StressProgressRing = ({
  stressLevel = 0,
  size = 200,
  strokeWidth = 12,
  duration = 2000,
  showPercentage = true,
  emotion = 'neutral',
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const strokeDashoffset = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const normalizedStress = Math.max(0, Math.min(100, stressLevel));

  const getStressColor = (stress) => {
    if (stress <= 30) return '#4CAF50';
    if (stress <= 60) return '#FF9800';
    return '#F44336';
  };

  const getEmotionColor = (emotion) => {
    const emotionColors = {
      happy: '#FFD700',
      sad: '#6495ED',
      angry: '#DC143C',
      fear: '#9932CC',
      surprise: '#FF6347',
      neutral: '#808080',
    };
    return emotionColors[emotion] || '#808080';
  };

  const stressColor = getStressColor(normalizedStress);
  const emotionColor = getEmotionColor(emotion);

  useEffect(() => {
    const targetStrokeOffset =
      circumference - (circumference * normalizedStress) / 100;

    animatedValue.setValue(0);
    strokeDashoffset.setValue(circumference);

    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: normalizedStress,
        duration: duration,
        useNativeDriver: false,
      }),
      Animated.timing(strokeDashoffset, {
        toValue: targetStrokeOffset,
        duration: duration,
        useNativeDriver: false,
      }),
    ]).start();
  }, [normalizedStress, circumference, duration]);

  const getStressLevelText = (stress) => {
    if (stress <= 30) return 'Low Stress';
    if (stress <= 60) return 'Moderate Stress';
    return 'High Stress';
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={stressColor} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={emotionColor} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.centerContent}>
        {showPercentage && (
          <Animated.Text
            style={[styles.percentageText, { color: stressColor }]}
          >
            {Math.round(normalizedStress)}%
          </Animated.Text>
        )}
        <Text style={[styles.levelText, { color: stressColor }]}>
          {getStressLevelText(normalizedStress)}
        </Text>
        <Text style={[styles.emotionText, { color: emotionColor }]}>
          {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
        </Text>
      </View>

      {normalizedStress > 70 && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size + 20,
              height: size + 20,
              borderColor: stressColor,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  percentageText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  emotionText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 1000,
    opacity: 0.6,
  },
});

export { StressProgressRing };
