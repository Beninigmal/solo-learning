import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

interface ChronosphereEffectProps {
  active?: boolean;
  children?: React.ReactNode;
}

export function ChronosphereEffect({ active = true, children }: ChronosphereEffectProps) {
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const pulseScale1 = useSharedValue(0.8);
  const pulseOpacity1 = useSharedValue(0.8);
  const pulseScale2 = useSharedValue(0.5);
  const pulseOpacity2 = useSharedValue(0.6);
  const voidGlow = useSharedValue(0.5);

  useEffect(() => {
    if (!active) return;

    // Rotating outer rune ring clockwise
    rotation1.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );

    // Rotating inner ring counter-clockwise
    rotation2.value = withRepeat(
      withTiming(-360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    // Ripple wave 1
    pulseScale1.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 2500, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 0 })
      ),
      -1,
      false
    );

    pulseOpacity1.value = withRepeat(
      withSequence(
        withTiming(0.05, { duration: 2500, easing: Easing.out(Easing.ease) }),
        withTiming(0.85, { duration: 0 })
      ),
      -1,
      false
    );

    // Ripple wave 2
    pulseScale2.value = withRepeat(
      withSequence(
        withTiming(1.45, { duration: 3200, easing: Easing.out(Easing.ease) }),
        withTiming(0.5, { duration: 0 })
      ),
      -1,
      false
    );

    pulseOpacity2.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 3200, easing: Easing.out(Easing.ease) }),
        withTiming(0.7, { duration: 0 })
      ),
      -1,
      false
    );

    // Ambient void core pulse
    voidGlow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [active]);

  const rotateStyle1 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation1.value}deg` }],
  }));

  const rotateStyle2 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation2.value}deg` }],
  }));

  const rippleStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale1.value }],
    opacity: pulseOpacity1.value,
  }));

  const rippleStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale2.value }],
    opacity: pulseOpacity2.value,
  }));

  const voidStyle = useAnimatedStyle(() => ({
    opacity: voidGlow.value,
  }));

  if (!active) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {/* Dark Purple Void Backdrop */}
      <Animated.View style={[styles.voidBackground, voidStyle]} />

      {/* SVG Chronosphere Spherical Energy Field */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg height="100%" width="100%" viewBox="0 0 400 300">
          <Defs>
            <RadialGradient id="chronoVoidGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#c084fc" stopOpacity="0.45" />
              <Stop offset="45%" stopColor="#7e22ce" stopOpacity="0.3" />
              <Stop offset="80%" stopColor="#3b0764" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#0f0728" stopOpacity="0.95" />
            </RadialGradient>
            <LinearGradient id="chronoBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.9" />
              <Stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          
          <Circle cx="200" cy="150" r="140" fill="url(#chronoVoidGrad)" />
        </Svg>
      </View>

      {/* Expanding Ripple Waves */}
      <Animated.View style={[styles.ripple, rippleStyle1]} pointerEvents="none" />
      <Animated.View style={[styles.ripple, rippleStyle2]} pointerEvents="none" />

      {/* Rotating Clockwork/Temporal Rune Ring 1 */}
      <Animated.View style={[styles.ringContainer, rotateStyle1]} pointerEvents="none">
        <Svg height="260" width="260" viewBox="0 0 260 260">
          <Circle cx="130" cy="130" r="120" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="6,8" fill="none" opacity={0.7} />
          <Circle cx="130" cy="130" r="105" stroke="#e9d5ff" strokeWidth="1" strokeDasharray="12,12" fill="none" opacity={0.6} />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 130 + 110 * Math.cos(angle);
            const y1 = 130 + 110 * Math.sin(angle);
            const x2 = 130 + 120 * Math.cos(angle);
            const y2 = 130 + 120 * Math.sin(angle);
            return (
              <Path key={i} d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke="#c084fc" strokeWidth="2" opacity={0.8} />
            );
          })}
        </Svg>
      </Animated.View>

      {/* Rotating Inner Rune Ring 2 */}
      <Animated.View style={[styles.ringContainer, rotateStyle2]} pointerEvents="none">
        <Svg height="200" width="200" viewBox="0 0 200 200">
          <Circle cx="100" cy="100" r="90" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,10" fill="none" opacity={0.8} />
          <Path d="M 100 15 L 185 100 L 100 185 L 15 100 Z" stroke="#c084fc" strokeWidth="1" fill="none" opacity={0.4} />
          <Path d="M 100 25 L 175 100 L 100 175 L 25 100 Z" stroke="#e9d5ff" strokeWidth="0.8" fill="none" opacity={0.3} />
        </Svg>
      </Animated.View>

      {/* Floating Particles / Time Sparks */}
      <View style={styles.particlesContainer} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
      </View>

      {/* Active Chronosphere Badge Header */}
      <View style={styles.badgeHeader}>
        <View style={styles.badgePill}>
          <Feather name="clock" size={12} color="#e9d5ff" />
          <Text style={styles.badgeText}>
            🌀 ESFERA CRONOLÓGICA DE NETHERIL ATIVA (-50% COOLDOWN)
          </Text>
        </View>
      </View>

      {/* Inner Content Wrapper */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

function FloatingParticle({ index }: { index: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.2);
  const translateX = useSharedValue(0);

  useEffect(() => {
    const delay = index * 300;
    const drift = ((index % 2 === 0 ? 1 : -1) * (15 + index * 5));

    translateY.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 2400 + delay, easing: Easing.out(Easing.ease) }),
        withTiming(40, { duration: 2400 + delay, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 1500, easing: Easing.linear }),
        withTiming(0.2, { duration: 1500, easing: Easing.linear })
      ),
      -1,
      true
    );

    translateX.value = withRepeat(
      withSequence(
        withTiming(drift, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-drift, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [index]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const particleSizes = [4, 6, 5, 7, 4, 6, 8, 5];
  const size = particleSizes[index % particleSizes.length];

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${12 + (index * 11) % 76}%`,
          top: '40%',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: index % 2 === 0 ? '#e9d5ff' : '#c084fc',
          shadowColor: '#a855f7',
          shadowRadius: 6,
          shadowOpacity: 0.9,
          elevation: 5,
        },
        animStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#c084fc',
    shadowColor: '#a855f7',
    shadowRadius: 16,
    shadowOpacity: 0.9,
    elevation: 10,
    backgroundColor: '#0c051a',
    marginBottom: 16,
  },
  voidBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2e0d54',
  },
  ripple: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -100,
    marginTop: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#c084fc',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  ringContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -130,
    marginTop: -130,
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  badgeHeader: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  badgePill: {
    backgroundColor: 'rgba(59, 7, 100, 0.95)',
    borderColor: '#c084fc',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#a855f7',
    shadowRadius: 8,
    shadowOpacity: 0.8,
    elevation: 4,
  },
  badgeText: {
    color: '#e9d5ff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
