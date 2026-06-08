import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated, Dimensions, useWindowDimensions } from 'react-native';

export function ParticleBackground() {
  const { height: screenHeight } = useWindowDimensions();

  // Criamos 22 partículas com posições aleatórias na tela usando proporção (0 a 1) para x
  const particles = useRef(
    Array.from({ length: 22 }).map(() => ({
      ratioX: Math.random(),
      y: new Animated.Value(screenHeight * (0.5 + Math.random() * 0.5)),
      opacity: new Animated.Value(Math.random() * 0.35 + 0.15),
      scale: new Animated.Value(Math.random() * 0.7 + 0.3),
      speed: Math.random() * 4000 + 4500, // 4.5s a 8.5s para uma subida suave e não distrativa
      drift: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    particles.forEach((p) => {
      const animateParticle = () => {
        const currentHeight = Dimensions.get('window').height;
        // Reinicializa a partícula no fundo da tela
        p.y.setValue(currentHeight * (0.9 + Math.random() * 0.1));
        p.opacity.setValue(Math.random() * 0.45 + 0.15);
        p.scale.setValue(Math.random() * 0.7 + 0.3);
        p.drift.setValue(0);

        Animated.parallel([
          Animated.timing(p.y, {
            toValue: -50,
            duration: p.speed,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: p.speed,
            useNativeDriver: true,
          }),
          Animated.timing(p.drift, {
            toValue: (Math.random() - 0.5) * 160, // oscilação suave para os lados
            duration: p.speed,
            useNativeDriver: true,
          }),
        ]).start(() => {
          animateParticle(); // Reinicia em loop contínuo
        });
      };

      // Stagger inicial para evitar que todas as partículas comecem juntas
      setTimeout(() => {
        animateParticle();
      }, Math.random() * 5000);
    });
  }, []);

  return (
    <>
      {particles.map((p, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.particle,
            {
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
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00f3ff',
    shadowColor: '#00f3ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 3,
  },
});

