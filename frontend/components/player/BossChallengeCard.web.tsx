import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

// Dimensions will be computed dynamically within the component.

const getBossImage = (bossName: string) => {
  if (!bossName) return null;
  const name = bossName.toLowerCase();
  if (name.includes('mind flayer') || name.includes('devorador de mentes')) return require('../../assets/boss_mindflayer_manhwa.png');
  if (name.includes('dragão vermelho') || name.includes('dragao vermelho') || name.includes('red dragon') || name.includes('dragon') || name.includes('dragão') || name.includes('dragao')) return require('../../assets/boss_red_dragon_manhwa.png');
  if (name.includes('tarrasque')) return require('../../assets/boss_tarrasque_manhwa.png');
  if (name.includes('glabrezu')) return require('../../assets/boss_glabrezu_manhwa.png');
  if (name.includes('rakshasa')) return require('../../assets/boss_rakshasa_manhwa.png');
  if (name.includes('beholder') || name.includes('observador')) return require('../../assets/boss_beholder_manhwa.png');
  if (name.includes('lich')) return require('../../assets/boss_lich_manhwa.png');
  if (name.includes('golem')) return require('../../assets/boss_golem_manhwa.png');
  if (name.includes('demon') || name.includes('demônio') || name.includes('demonio')) return require('../../assets/boss_demon_manhwa.png');
  if (name.includes('beast') || name.includes('besta')) return require('../../assets/boss_beast_manhwa.png');
  if (name.includes('demogorgon')) return require('../../assets/boss_demogorgon_manhwa.png');
  if (name.includes('death knight') || name.includes('cavaleiro da morte')) return require('../../assets/boss_deathknight_manhwa.png');
  if (name.includes('dracolich')) return require('../../assets/boss_dracolich_manhwa.png');
  if (name.includes('medusa')) return require('../../assets/boss_medusa_manhwa.png');
  if (name.includes('mimic') || name.includes('mímico') || name.includes('mimico')) return require('../../assets/boss_mimic_manhwa.png');
  if (name.includes('hydra') || name.includes('hidra')) return require('../../assets/boss_hydra_manhwa.png');
  if (name.includes('aboleth')) return require('../../assets/boss_aboleth_manhwa.png');
  if (name.includes('wyvern') || name.includes('shadow wyvern') || name.includes('wyvern das sombras')) return require('../../assets/boss_shadowwyvern_manhwa.png');
  if (name.includes('vampire') || name.includes('vampiro')) return require('../../assets/boss_vampire_manhwa.png');
  if (name.includes('djinn') || name.includes('gênio') || name.includes('genio') || name.includes('maldito')) return require('../../assets/boss_djinn_manhwa.png');
  if (name.includes('yuan-ti') || name.includes('yuanti')) return require('../../assets/boss_yuanti_manhwa.png');
  if (name.includes('gnoll')) return require('../../assets/boss_gnoll_manhwa.png');
  if (name.includes('tiefling')) return require('../../assets/boss_tiefling_manhwa.png');
  if (name.includes('naga')) return require('../../assets/boss_naga_manhwa.png');
  if (name.includes('esfinge') || name.includes('sphinx')) return require('../../assets/boss_esfinge_manhwa.png');
  if (name.includes('balor')) return require('../../assets/boss_balor_manhwa.png');
  if (name.includes('pit fiend') || name.includes('pitfiend')) return require('../../assets/boss_pitfiend_manhwa.png');
  if (name.includes('elder brain') || name.includes('elderbrain')) return require('../../assets/boss_elderbrain_manhwa.png');
  if (name.includes('quimera') || name.includes('chimera')) return require('../../assets/boss_chimera_manhwa.png');
  if (name.includes('urso-coruja') || name.includes('urso coruja') || name.includes('owlbear')) return require('../../assets/boss_owlbear_manhwa.png');
  if (name.includes('troll')) return require('../../assets/boss_troll_manhwa.png');
  if (name.includes('gorgon')) return require('../../assets/boss_gorgon_manhwa.png');
  if (name.includes('drow arcano') || name.includes('drow mage') || name.includes('mago drow')) return require('../../assets/boss_drowarcano_manhwa.png');
  if (name.includes('wraith') || name.includes('aparição') || name.includes('aparicao')) return require('../../assets/boss_wraith_manhwa.png');
  if (name.includes('roc')) return require('../../assets/boss_roc_manhwa.png');
  if (name.includes('marilith')) return require('../../assets/boss_marilith_manhwa.png');
  if (name.includes('night hag') || name.includes('bruxa da noite') || name.includes('bruxa')) return require('../../assets/boss_nighthag_manhwa.png');
  if (name.includes('ice devil') || name.includes('diabo do gelo') || name.includes('diabo de gelo')) return require('../../assets/boss_icedevil_manhwa.png');
  if (name.includes('flameskull') || name.includes('caveira flamejante') || name.includes('caveira')) return require('../../assets/boss_flameskull_manhwa.png');
  if (name.includes('chuul')) return require('../../assets/boss_chuul_manhwa.png');
  return null;
};

interface BossChallengeCardProps {
  boss: any;
  onStartBattle?: (boss: any) => void;
  onBack?: () => void;
  battleState?: 'idle' | 'taking_damage' | 'attacking_player';
}

export const BossChallengeCard: React.FC<BossChallengeCardProps> = ({ boss, onStartBattle, onBack, battleState = 'idle' }) => {
  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;
  const isDesktop = windowWidth >= 768;
  const cardHeight = isDesktop 
    ? (windowHeight * 0.72 > 780 ? 780 : windowHeight * 0.72) 
    : (windowWidth * 0.72 > 280 ? 280 * 1.45 : windowWidth * 0.72 * 1.45);
  const cardWidth = cardHeight / 1.45;

  const [flipped, setFlipped] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  
  const flipValue = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const shakeRot = useSharedValue(0);
  
  // Parallax and Foil Sheen values
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const foilOffset = useSharedValue(0);

  // Combat animation values
  const attackScale = useSharedValue(1);
  const damageScale = useSharedValue(1);
  const damageShakeX = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const slashOpacity = useSharedValue(0);
  const slashRotation = useSharedValue(0);

  useEffect(() => {
    // Fallback breathing parallax (used on Web directly)
    panX.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    panY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Moving Foil sheen
    foilOffset.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    startShake();
  }, []);

  useEffect(() => {
    if (battleState !== 'idle') {
      if (flipped) {
         flipValue.value = withTiming(0, { duration: 400 });
         setFlipped(false);
      }
      
      if (battleState === 'taking_damage') {
        slashRotation.value = Math.random() * 60 - 30;
        slashOpacity.value = withSequence(
          withTiming(1, { duration: 50 }),
          withTiming(0, { duration: 400 })
        );
        
        flashOpacity.value = withSequence(
          withTiming(0.8, { duration: 100 }),
          withTiming(0, { duration: 400 })
        );
        
        damageScale.value = withSequence(
          withTiming(0.9, { duration: 100, easing: Easing.out(Easing.exp) }),
          withTiming(1, { duration: 400, easing: Easing.in(Easing.exp) })
        );

        damageShakeX.value = withSequence(
          withTiming(-15, { duration: 50 }),
          withTiming(15, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 100 })
        );
        
      } else if (battleState === 'attacking_player') {
        attackScale.value = withSequence(
          withTiming(1.3, { duration: 150, easing: Easing.out(Easing.exp) }),
          withTiming(1, { duration: 400, easing: Easing.in(Easing.exp) })
        );
      }
    }
  }, [battleState]);

  const startShake = () => {
    shakeX.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 40 }),
        withTiming(2, { duration: 40 }),
        withTiming(0, { duration: 40 })
      ),
      -1,
      true
    );
    shakeY.value = withRepeat(
      withSequence(
        withTiming(-1.5, { duration: 50 }),
        withTiming(1.5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      ),
      -1,
      true
    );
    shakeRot.value = withRepeat(
      withSequence(
        withTiming(-0.5, { duration: 60 }),
        withTiming(0.5, { duration: 60 }),
        withTiming(0, { duration: 60 })
      ),
      -1,
      true
    );
  };

  const stopShake = () => {
    shakeX.value = withTiming(0);
    shakeY.value = withTiming(0);
    shakeRot.value = withTiming(0);
  };

  const handleFlip = () => {
    if (flipped || isInteractive) return;
    setIsInteractive(true);
    stopShake();
    
    flipValue.value = withTiming(1, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }, (finished) => {
      if (finished) {
        runOnJS(setFlipped)(true);
        runOnJS(setIsInteractive)(false);
      }
    });
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipValue.value, [0, 1], [0, 180]) + 'deg';
    const opacity = interpolate(flipValue.value, [0, 0.5, 0.51, 1], [1, 1, 0, 0]);
    
    return {
      opacity,
      transform: [
        { perspective: 1200 },
        { rotateY },
        { translateX: shakeX.value + damageShakeX.value },
        { translateY: shakeY.value },
        { scale: attackScale.value * damageScale.value },
        { rotateZ: `${shakeRot.value}deg` }
      ],
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipValue.value, [0, 1], [180, 360]) + 'deg';
    const opacity = interpolate(flipValue.value, [0, 0.5, 0.51, 1], [0, 0, 1, 1]);
    
    return {
      opacity,
      transform: [
        { perspective: 1200 },
        { rotateY }
      ],
      zIndex: flipValue.value > 0.5 ? 1 : -1,
    };
  });

  const imageParallaxStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.95 },
      { translateX: panX.value * 0.5 },
      { translateY: panY.value * 0.5 }
    ]
  }));

  const foilStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(foilOffset.value, [0, 1], [-cardWidth, cardWidth * 1.5]) },
      { rotate: '25deg' },
      { scaleY: 2.5 }
    ]
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value
  }));

  const slashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: slashOpacity.value,
    transform: [
      { rotate: `${slashRotation.value}deg` },
      { scale: 1.5 }
    ]
  }));

  const bossImage = getBossImage(boss?.monsterName);

  return (
    <View style={styles.container}>
      
      {/* WEB GOW EFFECT (CSS shadow based) */}
      <View
        style={[
          styles.webGlowAura,
          {
            width: cardWidth,
            height: cardHeight,
          }
        ]}
      />

      <View style={{ width: cardWidth, height: cardHeight, justifyContent: 'center', alignItems: 'center' }}>
        
        {/* FRONT */}
        <Animated.View style={[styles.cardSide, frontAnimatedStyle, { width: cardWidth, height: cardHeight, backgroundColor: '#140b00', borderColor: '#ff4500', borderWidth: 2 }]}>
          {bossImage && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Animated.Image source={bossImage} style={[{ width: '100%', height: '100%', resizeMode: 'cover' }, imageParallaxStyle]} />
              
              {/* Bottom Dark Vignette */}
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundImage: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 75%, #000000 100%)',
                } as any}
              />
              
              {/* Foil Overlay */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 60,
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  },
                  foilStyle
                ]}
              />
            </View>
          )}
          
          <Animated.View 
            style={[
              StyleSheet.absoluteFillObject, 
              { backgroundColor: 'rgba(255,0,0,0.4)', zIndex: 5 },
              flashAnimatedStyle
            ]} 
            pointerEvents="none" 
          />

          <Animated.View 
            style={[
              StyleSheet.absoluteFillObject, 
              { 
                justifyContent: 'center', 
                alignItems: 'center', 
                zIndex: 10
              },
              slashAnimatedStyle
            ]} 
            pointerEvents="none"
          >
            <View style={{ width: '150%', height: 8, backgroundColor: 'white', shadowColor: 'red', shadowOpacity: 1, shadowRadius: 10, elevation: 5 }} />
          </Animated.View>

          <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={[styles.contentContainer, bossImage && { justifyContent: 'flex-end', paddingBottom: 40 }]}>
             {!bossImage && <Text style={{ fontSize: 72, marginBottom: 16 }}>👁️‍🗨️</Text>}
             <Text style={styles.bossName}>{boss.monsterName}</Text>
             <Text style={styles.subjectText}>Desafio de {boss.subjectName}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* BACK */}
        <Animated.View style={[styles.cardSide, backAnimatedStyle, { width: cardWidth, height: cardHeight, backgroundColor: '#0d0905', borderColor: '#ff8c00', borderWidth: 2 }]}>
          <View style={styles.contentContainer}>
            <Text style={styles.backTitle}>🔥 Desafio do {boss.monsterName}</Text>
            <View style={styles.questionContainer}>
               <Text style={styles.questionText} numberOfLines={8}>{boss.question}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.battleButton, (!flipped || isInteractive) && { opacity: 0.5 }]}
              onPress={() => onStartBattle?.(boss)}
              disabled={!flipped || isInteractive}
            >
              <Text style={styles.battleButtonText}>⚔ INICIAR BATALHA</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </View>
      
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
         <Feather name="arrow-left" size={14} color="#ff8c00" style={{ marginRight: 6 }} />
         <Text style={styles.backButtonText}>Escolher outro boss</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  webGlowAura: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: '#ff4500',
    opacity: 0.55,
    boxShadow: '0 0 50px 10px #ff4500',
  },
  cardSide: {
    position: 'absolute',
    borderRadius: 16,
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossName: {
    color: '#ff8c00',
    fontSize: 22,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subjectText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 20,
  },
  backTitle: {
    color: '#ff9f00',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  questionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  battleButton: {
    width: '100%',
    backgroundColor: '#ff6600',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 20,
    boxShadow: '0 4px 10px #ff4400',
  },
  battleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  backButton: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
  },
  backButtonText: {
    color: '#ff8c00',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
