import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { CardBurnEffect } from './CardBurnEffect';

export interface Artifact {
  id: string;
  name: string;
  type: 'legendary' | 'epic' | 'magic';
  description?: string;
}

interface ArtifactCardProps {
  artifact: Artifact;
  size?: 'small' | 'normal' | 'large';
  animated?: boolean;
  isConsumed?: boolean;
  onPress?: () => void;
}

const artifactImages: { [id: string]: any } = {
  becker_alquimista: require('../assets/becker_alquimista.png'),
  pocao_cura: require('../assets/pocao_cura.png'),
  martelo_magico: require('../assets/martelo_magico.png'),
  poeira_estelar: require('../assets/poeira_estelar.png'),
  pergaminho_oraculo: require('../assets/pergaminho_oraculo.png'),
  sussurros_sabios: require('../assets/sussurros_sabios.png'),
  elixir_dourado: require('../assets/elixir_dourado.png'),
  sapatilhas_veloz: require('../assets/sapatilhas_veloz.png'),
  escudo_arcano: require('../assets/escudo_arcano.png'),
  olhar_monarca: require('../assets/olhar_monarca.png'),
  relogio_tempo: require('../assets/relogio_tempo.png'),
  anel_serpente: require('../assets/anel_serpente.png'),
  lagrima_fenix: require('../assets/lagrima_fenix.png'),
  bandeira_guerra: require('../assets/bandeira_guerra.png'),
  orbe_perspicacia: require('../assets/orbe_perspicacia.png'),
  chave_mestra: require('../assets/chave_mestra.png'),
  bracelete_cristal: require('../assets/bracelete_cristal.png'),
  bolsa_sorte: require('../assets/bolsa_sorte.png'),
  mao_midas: require('../assets/mao_midas.png'),
  pena_escriba: require('../assets/pena_escriba.png'),
  cetro_exilio: require('../assets/cetro_exilio.png'),
  varinha_pinheiro: require('../assets/varinha_pinheiro.png'),
};

export function ArtifactCard({ artifact, size = 'normal', animated = true, isConsumed = false, onPress }: ArtifactCardProps) {
  const safeArtifact = artifact || { id: '', name: 'Desconhecido', type: 'magic' as const, description: '' };
  
  const floatAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);
  const foilOffset = useSharedValue(0);
  
  const burnScale = useSharedValue(1);
  const burnOpacity = useSharedValue(1);
  const burnShake = useSharedValue(0);
  const burnRotateX = useSharedValue(0);
  const burnRotateZ = useSharedValue(0);
  const burnTranslateY = useSharedValue(0);
  const fireOverlayOpacity = useSharedValue(0);

  const sizes = {
    small: { width: 140, height: 230, padding: 8, imgWidth: 124, imgHeight: 84, iconBoxSize: 20, iconSize: 10, title: 'text-xs', desc: 'text-[7.5px]', badge: 6 },
    normal: { width: 180, height: 310, padding: 12, imgWidth: 156, imgHeight: 114, iconBoxSize: 26, iconSize: 13, title: 'text-sm', desc: 'text-[8.5px]', badge: 8 },
    large: { width: 250, height: 420, padding: 16, imgWidth: 218, imgHeight: 170, iconBoxSize: 36, iconSize: 18, title: 'text-xl', desc: 'text-xs', badge: 12 },
  };

  const config = sizes[size];

  const getRarityConfig = () => {
    switch (safeArtifact.type) {
      case 'legendary':
        return {
          label: 'Lendário',
          color: '#ffca28',
          bg: '#17130a',
          borderColor: '#ffca28',
          shadowColor: '#ffca28'
        };
      case 'epic':
        return {
          label: 'Épico',
          color: '#a349ff',
          bg: '#10081d',
          borderColor: '#a349ff',
          shadowColor: '#a349ff'
        };
      case 'magic':
      default:
        return {
          label: 'Mágico',
          color: '#00f3ff',
          bg: '#050a14',
          borderColor: '#00b8d4',
          shadowColor: '#00f3ff'
        };
    }
  };

  const rarity = getRarityConfig();

  const getArtifactImage = () => {
    return artifactImages[safeArtifact.id] || require('../assets/nano_banana.png');
  };

  const getIcon = () => {
    switch (safeArtifact.id) {
      case 'elixir_dourado': return 'droplet';
      case 'sapatilhas_veloz': return 'zap';
      case 'escudo_arcano': return 'shield';
      case 'sussurros_sabios': return 'message-square';
      case 'becker_alquimista': return 'activity';
      case 'martelo_magico': return 'tool';
      case 'poeira_estelar': return 'eye';
      case 'pocao_cura':
      case 'poçao_cura': return 'plus-circle';
      case 'pergaminho_oraculo': return 'book-open';
      case 'olhar_monarca': return 'eye';
      case 'relogio_tempo': return 'clock';
      case 'anel_serpente': return 'aperture';
      case 'lagrima_fenix': return 'wind';
      case 'bandeira_guerra': return 'flag';
      case 'orbe_perspicacia': return 'compass';
      case 'chave_mestra': return 'key';
      case 'bracelete_cristal': return 'shield';
      case 'bolsa_sorte': return 'shopping-bag';
      case 'mao_midas': return 'award';
      case 'pena_escriba': return 'edit-3';
      case 'cetro_exilio': return 'shield-off';
      case 'varinha_pinheiro': return 'zap';
      default: return 'star';
    }
  };

  useEffect(() => {
    if (animated && !isConsumed) {
      floatAnim.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      rotateAnim.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1.5, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      foilOffset.value = withRepeat(
        withSequence(
          withTiming(config.width + 120, { duration: 3000, easing: Easing.linear }),
          withTiming(-100, { duration: 0 })
        ),
        -1,
        false
      );
    } else if (!isConsumed) {
      floatAnim.value = withTiming(0);
      rotateAnim.value = withTiming(0);
    }
  }, [animated, size, isConsumed]);

  useEffect(() => {
    if (isConsumed) {
      fireOverlayOpacity.value = withTiming(0.85, { duration: 300, easing: Easing.out(Easing.ease) });
      
      burnShake.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 40 }),
          withTiming(12, { duration: 40 })
        ),
        10,
        true
      );
      
      burnRotateX.value = withDelay(300, withTiming(75, { duration: 700, easing: Easing.in(Easing.exp) }));
      burnRotateZ.value = withDelay(300, withTiming(45, { duration: 700, easing: Easing.in(Easing.exp) }));
      burnScale.value = withDelay(300, withTiming(0.1, { duration: 700, easing: Easing.in(Easing.exp) }));
      burnTranslateY.value = withDelay(300, withTiming(-200, { duration: 700, easing: Easing.in(Easing.exp) }));
      burnOpacity.value = withDelay(400, withTiming(0, { duration: 600, easing: Easing.in(Easing.exp) }));
    }
  }, [isConsumed]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(rotateAnim.value, [-10, 10], [-10, 10]);
    return {
      transform: [
        { perspective: 1000 },
        { translateY: animated ? floatAnim.value + burnTranslateY.value : burnTranslateY.value },
        { rotate: `${animated ? rotate : 0}deg` },
        { rotateX: `${burnRotateX.value}deg` },
        { rotateZ: `${burnRotateZ.value}deg` },
        { scale: burnScale.value },
        { translateX: burnShake.value }
      ],
      opacity: burnOpacity.value,
      width: config.width,
      height: config.height,
      shadowColor: rarity.shadowColor,
      shadowRadius: size === 'large' ? 30 : size === 'normal' ? 15 : 8,
      shadowOpacity: size === 'large' ? 0.7 : 0.4,
    };
  });

  const foilAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: foilOffset.value },
      { rotate: '25deg' },
      { scaleY: 2 }
    ]
  }));

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      style={{ marginVertical: animated ? 10 : 0 }}
    >
      <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
        <View
          style={[
            styles.cardInner,
            {
              borderColor: rarity.borderColor,
              backgroundColor: rarity.bg,
              padding: 0,
            },
          ]}
        >
          {/* Top-Anchored Image */}
          <View style={{ position: 'absolute', top: 15, left: 0, right: 0, height: config.width }}>
            <Image 
              source={getArtifactImage()}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>

          {/* Dark Vignette Overlay for Text readability */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: config.height - (config.width * 0.6),
              backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.95) 100%)',
            }}
            pointerEvents="none"
          />

          <View style={{ flex: 1, padding: config.padding, justifyContent: 'space-between' }}>
            {/* Top Bar: Rarity and Icon */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
              <View
                style={[
                  styles.rarityBadge,
                  {
                    backgroundColor: rarity.color,
                    paddingVertical: config.badge / 3,
                    paddingHorizontal: config.badge,
                    borderRadius: config.badge,
                  },
                ]}
              >
                <Text style={styles.rarityText} className="font-extrabold uppercase tracking-widest text-[8px] text-black">
                  {rarity.label}
                </Text>
              </View>

              <View style={{
                backgroundColor: '#000000d0',
                borderRadius: config.iconBoxSize / 2,
                width: config.iconBoxSize,
                height: config.iconBoxSize,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.2,
                borderColor: rarity.borderColor,
                shadowColor: rarity.color,
                shadowRadius: 5,
                shadowOpacity: 0.8,
                elevation: 4,
              }}>
                <Feather
                  name={getIcon()}
                  size={config.iconSize}
                  color={rarity.color}
                />
              </View>
            </View>

            {/* Title & Description at Bottom */}
            <View style={{ zIndex: 10, width: '100%', alignItems: 'center' }}>
              <Text
                style={[styles.cardTitle, { textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 6 }]}
                className={`text-white font-bold uppercase tracking-wider text-center ${config.title}`}
              >
                {safeArtifact.name}
              </Text>

              <Text
                style={[styles.cardDescription, { textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 }]}
                className={`text-white/95 font-mono text-center leading-tight mt-1 ${config.desc}`}
                numberOfLines={size === 'large' ? 6 : 4}
              >
                {safeArtifact.description || 'Em desenvolvimento.'}
              </Text>
            </View>
          </View>

          {/* Holographic Foil Overlay (Web native diagonal sheen) */}
          {animated && (
            <Animated.View
              style={[styles.foilSheen, foilAnimatedStyle, {
                opacity: rarity.label === 'Lendário' ? 0.25 : 0.12,
              }]}
              pointerEvents="none"
            />
          )}

          {/* 3D Ignition Overlay */}
          {isConsumed && (
            <CardBurnEffect
              width={config.width}
              height={config.height}
              borderRadius={size === 'large' ? 16 : size === 'normal' ? 12 : 8}
            />
          )}
        </View>
      </Animated.View>
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  cardInner: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  rarityBadge: {
    marginBottom: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    shadowOpacity: 0.2,
  },
  rarityText: {
    color: '#000000',
    fontWeight: '800',
  },
  cardTitle: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardDescription: {
    maxWidth: '90%',
  },
  foilSheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
