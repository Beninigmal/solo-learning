import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function NotFound() {
  const router = useRouter();

  // Animações
  const glowAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulsante
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Flutuação do conteúdo
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 10,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <View style={styles.container}>
      {/* Overlay de partículas */}
      <View style={styles.overlay} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
          },
        ]}
      >
        {/* Imagem 404 temática */}
        <Animated.View style={[styles.imageWrapper, { opacity: glowOpacity }]}>
          <Image
            source={require('../assets/404_banner.png')}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Mensagem de erro */}
        <View style={styles.textContainer}>
          <Text style={styles.subtitle}>⚔️ Esta rota caiu num portal dimensional ⚔️</Text>
          <Text style={styles.description}>
            O caminho que você tentou acessar não existe neste reino.{'\n'}
            Talvez a missão tenha expirado... ou nunca tenha existido.
          </Text>
        </View>

        {/* Botões de ação */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>🏰 Voltar ao Início</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>↩ Retornar</Text>
          </TouchableOpacity>
        </View>

        {/* Código de erro */}
        <Text style={styles.errorCode}>ERRO: ROTA_NAO_ENCONTRADA_404</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050b14',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? '100vh' as any : height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    // Gradient via boxShadow não é suportado no RN, usamos overlay simples
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 700,
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    maxWidth: 600,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 30,
    marginBottom: 8,
  },
  bannerImage: {
    width: '100%',
    height: Platform.OS === 'web' ? 400 : 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8b5cf680',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#00f3ff',
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: '#00f3ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 480,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a78bfa',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00f3ff50',
  },
  secondaryButtonText: {
    color: '#00f3ff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorCode: {
    fontSize: 11,
    color: '#475569',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    marginTop: 8,
  },
});
