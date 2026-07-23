import { Platform } from 'react-native';

let Constants: any = {};
try {
  Constants = require('expo-constants').default || require('expo-constants');
} catch (e) {}

/**
 * Detecta automaticamente o IP da máquina local no Wi-Fi atual durante o desenvolvimento.
 * 
 * Funciona via Metro bundler hostUri (Expo Go / Dev Client) e via window.location (Web).
 * Ao alternar entre redes Wi-Fi (ex: casa, namorada, trabalho), o IP é resolvido dinamicamente.
 */
export const getAutoDiscoveredLocalBackendUrl = (): string => {
  // 1. Navegador Web (Expo Web)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== '0.0.0.0') {
      return `http://${hostname}:3333`;
    }
  }

  // 2. Mobile (Expo Go / Dev Client): extrai IP do servidor Metro
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri && typeof hostUri === 'string') {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:3333`;
    }
  }

  // 3. Fallback para emuladores (Android Studio)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3333';
  }

  return 'http://localhost:3333';
};

// URL do backend no Render — padrão de produção
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://solo-learning-api.onrender.com';

/**
 * 🎨 Configuração do Estilo de Animação de Entrada das Telas (1, 2, 3 ou 4)
 *
 * 1 = Suave (Original: Fade-in + slide-up sutil de 35px)
 * 2 = Agressivo / Snappy (Fade-in rápido + slide-up de 100px + zoom-scale 0.85 -> 1.0 com rebote elástico)
 * 3 = Holographic Roll (3D Premium: Fade-in + slide-up 80px + rotação de perspectiva -5deg -> 0deg + zoom-scale)
 * 4 = Slide from Left (Cyberpunk linear: slide horizontal da esquerda, sem bounce, com fade)
 */
export const ACTIVE_ANIMATION_TYPE: number = 4; // Altere para 1, 2, 3 ou 4 para testar os diferentes estilos!
