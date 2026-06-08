import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface CardBurnEffectProps {
  width: number;
  height: number;
  borderRadius?: number;
}

export function CardBurnEffect({ width, height, borderRadius = 12 }: CardBurnEffectProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1.0, { duration: 1100, easing: Easing.in(Easing.quad) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          borderRadius,
          backgroundColor: 'rgba(255, 69, 0, 0.4)', // orange fire overlay
          borderWidth: 2,
          borderColor: '#ff4500',
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}
