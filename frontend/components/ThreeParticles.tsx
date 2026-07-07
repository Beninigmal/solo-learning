import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated, Dimensions, useWindowDimensions, View } from 'react-native';

const SUCCESS_COLORS = [
  { color: '#ffffff', shadow: '#ffffff', scaleY: 1.3 }, // White
  { color: '#e0ffff', shadow: '#00f3ff', scaleY: 1.4 }, // Light cyan
  { color: '#00f3ff', shadow: '#00f3ff', scaleY: 1.5 }, // Neon cyan
  { color: '#39ff14', shadow: '#00ff66', scaleY: 1.6 }, // Neon green
  { color: '#00ff66', shadow: '#00ff66', scaleY: 1.7 }, // Emerald green
  { color: '#10b981', shadow: '#00ff66', scaleY: 1.5 }, // Deep emerald
];

export function ThreeParticles() {
  const { height: screenHeight } = useWindowDimensions();

  // 45 particles for optimal density and CPU performance
  const particles = useRef(
    Array.from({ length: 45 }).map(() => {
      const colorInfo = SUCCESS_COLORS[Math.floor(Math.random() * SUCCESS_COLORS.length)];
      return {
        ratioX: Math.random(),
        y: new Animated.Value(screenHeight),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(1),
        speed: Math.random() * 2400 + 2600, // 2.6s to 5.0s rise time
        drift: new Animated.Value(0),
        color: colorInfo.color,
        shadow: colorInfo.shadow,
        scaleYRatio: colorInfo.scaleY,
        size: Math.random() * 3.5 + 2.5, // 2.5px to 6px width
      };
    })
  ).current;

  useEffect(() => {
    let isMounted = true;

    particles.forEach((p) => {
      let timeoutId: any = null;
      let activeAnimation: Animated.CompositeAnimation | null = null;

      const animateParticle = () => {
        if (!isMounted) return;

        const currentHeight = Dimensions.get('window').height;
        
        // Reset coordinates near screen bottom
        p.y.setValue(currentHeight * (0.85 + Math.random() * 0.15));
        p.opacity.setValue(Math.random() * 0.45 + 0.55); // high initial brightness
        p.scale.setValue(Math.random() * 0.6 + 0.6);
        p.drift.setValue(0);

        activeAnimation = Animated.parallel([
          Animated.timing(p.y, {
            toValue: -80, // rise beyond viewport top
            duration: p.speed,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: p.speed,
            useNativeDriver: true,
          }),
          Animated.timing(p.drift, {
            toValue: (Math.random() - 0.5) * 150, // gentle sway path
            duration: p.speed,
            useNativeDriver: true,
          }),
        ]);

        activeAnimation.start(() => {
          if (isMounted) {
            animateParticle();
          }
        });
      };

      // Stagger start times so particles ascend continuously
      timeoutId = setTimeout(() => {
        animateParticle();
      }, Math.random() * 4500);

      // Save handles for teardown
      (p as any)._timeoutId = timeoutId;
      (p as any)._activeAnimation = activeAnimation;
    });

    return () => {
      isMounted = false;
      particles.forEach((p) => {
        if ((p as any)._timeoutId) clearTimeout((p as any)._timeoutId);
        if ((p as any)._activeAnimation) {
          try {
            (p as any)._activeAnimation.stop();
          } catch (e) {}
        }
      });
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, idx) => {
        const pWidth = p.size;
        const pHeight = p.size * p.scaleYRatio; // elongation (vertical stretch)
        
        return (
          <Animated.View
            key={idx}
            style={[
              styles.particle,
              {
                backgroundColor: p.color,
                shadowColor: p.shadow,
                width: pWidth,
                height: pHeight,
                borderRadius: pWidth / 2, // capsule shape due to height elongation
                transform: [
                  { translateY: p.y },
                  { translateX: p.drift },
                  { scale: p.scale }
                ],
                left: `${p.ratioX * 100}%`,
                opacity: p.opacity,
              }
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 5,
    elevation: 3,
  },
});
