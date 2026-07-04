import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';
import { useSolenSounds } from '../hooks/useSolenSounds';

export default function AnimatedSplashScreen() {
  const router = useRouter();
  const sounds = useSolenSounds();
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current; // começa pequeno para o efeito spring de impacto
  const glowAnim = useRef(new Animated.Value(0)).current;
  const flickerAnim = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Estados do terminal de digitação e do cursor piscante
  const [statusText, setStatusText] = useState('STATUS: ');
  const [cursorVisible, setCursorVisible] = useState(true);

  // Sistema de Partículas Místicas em Background
  const particles = useRef(
    Array.from({ length: 18 }).map(() => ({
      ratioX: Math.random(),
      y: new Animated.Value(Dimensions.get('window').height * (0.5 + Math.random() * 0.5)),
      opacity: new Animated.Value(Math.random() * 0.5 + 0.2),
      scale: new Animated.Value(Math.random() * 0.8 + 0.4),
      speed: Math.random() * 2000 + 3000, // duração de 3s a 5s para flutuar até o topo
      drift: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // 💡 Dica de Arquiteto: Acordando o servidor do Render em background
    const wakeUpServer = async () => {
      try {
        console.log(`[Arquiteto] Iniciando ping para: ${BASE_URL}`);
        await fetch(BASE_URL, { method: 'GET' });
        console.log('[Arquiteto] Servidor notificado com sucesso.');
      } catch (error) {
        console.log('[Arquiteto] Erro ao acordar servidor:', error);
      }
    };

    wakeUpServer();
    sounds.playAnimation(); // Som sincronizado com a animação de intro


    // Iniciar animação contínua e individual das partículas
    particles.forEach((p) => {
      const animateParticle = () => {
        const currentHeight = Dimensions.get('window').height;
        // Reinicializa a partícula na parte inferior
        p.y.setValue(currentHeight * (0.8 + Math.random() * 0.2));
        p.opacity.setValue(Math.random() * 0.6 + 0.2);
        p.scale.setValue(Math.random() * 0.8 + 0.4);
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
            toValue: (Math.random() - 0.5) * 120, // leve oscilação para os lados
            duration: p.speed,
            useNativeDriver: true,
          }),
        ]).start(() => {
          animateParticle(); // reinicia em loop
        });
      };
      // Atraso inicial para dispersar as partículas
      setTimeout(() => {
        animateParticle();
      }, Math.random() * 3000);
    });

    // Loop de Cintilação Holográfica do Painel
    const startFlicker = () => {
      Animated.sequence([
        Animated.timing(flickerAnim, {
          toValue: Math.random() * 0.25 + 0.75, // oscila sutilmente entre 0.75 e 1.0
          duration: Math.random() * 120 + 40,
          useNativeDriver: true,
        }),
        Animated.timing(flickerAnim, {
          toValue: 1,
          duration: Math.random() * 120 + 40,
          useNativeDriver: true,
        }),
      ]).start(() => startFlicker());
    };
    startFlicker();

    // Loop da Varredura do Laser Cyan
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: true,
      })
    ).start();

    // Efeito de digitação no console de status
    const fullText = 'STATUS: CONECTANDO AO PORTAL...';
    let currentIndex = 8; // começa a digitar depois de 'STATUS: '
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setStatusText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 90);

    // Cursor piscante
    const cursorInterval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 450);

    // Sequência Principal de Animação do Painel (Entrada e Saída)
    Animated.sequence([
      // 1. Entrada de impacto com spring (zoom elástico) e fade in rápido
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,      // menor atrito = mais rebote/elasticidade
          tension: 30,     // tensão da mola
          useNativeDriver: true,
        }),
      ]),
      // 2. Pulsação de Brilho da Subtitle
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // 3. Espera o tempo solicitado pelo usuário (1.5s de delay + 3s de leitura = 4.5s)
      Animated.delay(4500),
      // 4. Saída suave com fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navega para a tela de login
      router.replace('/login');
    });

    return () => {
      clearInterval(typingInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  // Interpolações para animação
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const boxBorderOpacity = flickerAnim.interpolate({
    inputRange: [0.75, 1],
    outputRange: [0.7, 1.0],
  });

  // Mapeamento da posição vertical da varredura laser
  const scanY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 250],
  });

  return (
    <ImageBackground
      source={require('../assets/first.png')}
      style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#050b14' }}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
      {/* Partículas Místicas de Fundo */}
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

      {/* Caixa do Sistema Principal */}
      <Animated.View 
        style={[
          styles.systemBox,
          {
            opacity: Animated.multiply(fadeAnim, boxBorderOpacity),
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Linha de Varredura Laser */}
        <Animated.View 
          style={[
            styles.scanLine,
            { 
              transform: [{ translateY: scanY }],
              opacity: flickerAnim.interpolate({
                inputRange: [0.75, 1],
                outputRange: [0.5, 0.95],
              })
            }
          ]} 
        />

        {/* Header do Sistema Solo Leveling */}
        <View style={styles.boxHeader}>
          <Text style={styles.headerText}>[ AVISO DO SISTEMA ]</Text>
        </View>

        {/* Conteúdo Principal */}
        <View style={styles.boxContent}>
          <Text style={styles.mainTitle}>O</Text>
          <Animated.Text style={[styles.subTitle, { opacity: glowOpacity }]}>
            SISTEMA
          </Animated.Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.flavorText}>
            O Despertar do Aprendizado Iniciou.
          </Text>
          <Text style={styles.statusText}>
            {statusText}
            <Text style={{ opacity: cursorVisible ? 1 : 0, color: '#00f3ff', fontWeight: 'bold' }}>█</Text>
          </Text>
        </View>
      </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 20, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  systemBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(10, 17, 40, 0.92)',
    borderWidth: 2,
    borderColor: '#00f3ff',
    borderRadius: 4,
    padding: 20,
    shadowColor: '#00f3ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
    overflow: 'hidden', // impede que o scanner passe dos limites físicos do box
  },
  boxHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 243, 255, 0.3)',
    paddingBottom: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerText: {
    color: '#ff0055',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 14,
    textShadowColor: '#ff0055',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  boxContent: {
    alignItems: 'center',
  },
  mainTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subTitle: {
    color: '#00f3ff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: '#00f3ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    marginTop: -5,
  },
  divider: {
    width: '50%',
    height: 1,
    backgroundColor: 'rgba(0, 243, 255, 0.5)',
    marginVertical: 20,
  },
  flavorText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 10,
    opacity: 0.8,
  },
  statusText: {
    color: '#00f3ff',
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 1,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: '#00f3ff',
    shadowColor: '#00f3ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00f3ff',
    shadowColor: '#00f3ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
});
