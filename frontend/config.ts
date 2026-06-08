/**
 * Configuração da URL do Backend
 *
 * 🚀 PRODUÇÃO (Render): URL padrão compilada no APK
 *
 * Para desenvolvimento local (Expo Go na mesma rede Wi-Fi):
 *   Na tela de login, toque na engrenagem (⚙️) e coloque:
 *   http://SEU_IP_LOCAL:3333
 *
 * Para APK com túnel:
 *   Na tela de login, toque na engrenagem (⚙️) e coloque a URL do túnel.
 */

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
