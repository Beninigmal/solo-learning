import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Animated as RNAnimated, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSolenSounds } from '../hooks/useSolenSounds';
import { ArtifactCard } from './ArtifactCard';
import { CardBurnEffect } from './CardBurnEffect';

interface Artifact {
  id: string;
  name: string;
  type: 'legendary' | 'epic' | 'magic';
  description?: string;
}

interface ArtifactBurnModalProps {
  visible: boolean;
  artifact: Artifact | null;
  onAnimationEnd: (artifact: Artifact | null) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ArtifactBurnModal({ visible, artifact, onAnimationEnd }: ArtifactBurnModalProps) {
  const [isBurned, setIsBurned] = useState(false);
  const sounds = useSolenSounds();

  // Animation values (all hardware-accelerated via useNativeDriver: true!)
  const scaleAnim = useRef(new RNAnimated.Value(0)).current;
  const rotateXAnim = useRef(new RNAnimated.Value(5)).current;
  const rotateYAnim = useRef(new RNAnimated.Value(2)).current;
  const foilAnim = useRef(new RNAnimated.Value(-100)).current;
  
  // Sweep translation from bottom (420px) to top (0px)
  const burnTranslateY = useRef(new RNAnimated.Value(420)).current;
  
  const cardOpacityAnim = useRef(new RNAnimated.Value(1)).current;
  const cardContentOpacityAnim = useRef(new RNAnimated.Value(1)).current;
  const fireOpacityAnim = useRef(new RNAnimated.Value(0)).current;
  const fireFlickerAnim = useRef(new RNAnimated.Value(1)).current;
  const flashOpacityAnim = useRef(new RNAnimated.Value(0)).current;
  
  // High-frequency native shaking coordinates
  const shakeX = useRef(new RNAnimated.Value(0)).current;
  const shakeY = useRef(new RNAnimated.Value(0)).current;

  // Ambient sway coordinates
  const floatAnim = useRef(new RNAnimated.Value(0)).current;
  const floatRotateAnim = useRef(new RNAnimated.Value(0)).current;

  // Track if card shaking is currently active
  const shakeActive = useRef(false);

  // Native pulse for the prompt label (replaces NativeWind animate-pulse to avoid hook count crash)
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const pulseLoopRef = useRef<RNAnimated.CompositeAnimation | null>(null);

  useEffect(() => {
    pulseLoopRef.current = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();
    return () => { pulseLoopRef.current?.stop(); };
  }, []);

  // Refs for tracking active animation composite objects to stop them cleanly
  const activeAnimationsRef = useRef<RNAnimated.CompositeAnimation[]>([]);
  const timeoutRef = useRef<any>(null);

  // 18 lightweight native spark emitters inside the card
  const sparks = useRef(
    Array.from({ length: 18 }).map(() => ({
      x: Math.random() * 200 + 25, // horizontal distribution
      y: new RNAnimated.Value(300), // starts near the card bottom
      opacity: new RNAnimated.Value(0),
      scale: new RNAnimated.Value(1),
      driftX: new RNAnimated.Value(0),
      color: ['#ff2a00', '#ff7700', '#ffa600', '#ff0055'][Math.floor(Math.random() * 4)],
      size: Math.random() * 5 + 3,
      delay: Math.random() * 500,
    }))
  ).current;

  const activeArtifact = artifact || { id: '', name: '', type: 'magic' as const, description: '' };
  const isLegendary = activeArtifact.type === 'legendary';
  const isEpic = activeArtifact.type === 'epic' || isLegendary;
  const rarityLabel = activeArtifact.type === 'legendary' ? 'Lendário' : activeArtifact.type === 'epic' ? 'Épico' : 'Mágico';

  const getIcon = () => {
    switch (activeArtifact.id) {
      case 'elixir_dourado':
        return 'droplet';
      case 'sapatilhas_veloz':
        return 'zap';
      case 'escudo_arcano':
        return 'shield';
      case 'sussurros_sabios':
        return 'message-square';
      case 'becker_alquimista':
        return 'activity';
      case 'martelo_magico':
        return 'tool';
      case 'poeira_estelar':
        return 'eye';
      case 'pocao_cura':
      case 'poçao_cura':
        return 'plus-circle';
      case 'pergaminho_oraculo':
        return 'book-open';
      case 'olhar_monarca':
        return 'eye';
      case 'relogio_tempo':
        return 'clock';
      case 'anel_serpente':
        return 'aperture';
      case 'lagrima_fenix':
        return 'wind';
      case 'bandeira_guerra':
        return 'flag';
      case 'orbe_perspicacia':
        return 'compass';
      case 'chave_mestra':
        return 'key';
      case 'bracelete_cristal':
        return 'shield';
      case 'bolsa_sorte':
        return 'shopping-bag';
      case 'mao_midas':
        return 'award';
      case 'pena_escriba':
        return 'edit-3';
      case 'varinha_pinheiro':
        return 'zap';
      default:
        return isEpic ? 'star' : 'hexagon';
    }
  };

  const startTracked = (anim: RNAnimated.CompositeAnimation, callback?: () => void) => {
    activeAnimationsRef.current.push(anim);
    anim.start(callback);
  };

  useEffect(() => {
    if (visible && artifact) {
      setIsBurned(false);
      scaleAnim.setValue(0);
      rotateXAnim.setValue(12);
      rotateYAnim.setValue(4);
      foilAnim.setValue(-100);
      burnTranslateY.setValue(420); // overlay hidden at bottom
      cardOpacityAnim.setValue(1);
      cardContentOpacityAnim.setValue(1);
      fireOpacityAnim.setValue(0);
      fireFlickerAnim.setValue(1);
      flashOpacityAnim.setValue(0);
      shakeX.setValue(0);
      shakeY.setValue(0);
      floatAnim.setValue(0);
      floatRotateAnim.setValue(0);

      // Entrance bounce spring
      const scaleSpring = RNAnimated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      });
      startTracked(scaleSpring);

      const rotateXTiming = RNAnimated.timing(rotateXAnim, {
        toValue: 5,
        duration: 350,
        useNativeDriver: true,
      });
      startTracked(rotateXTiming);

      const rotateYTiming = RNAnimated.timing(rotateYAnim, {
        toValue: 2,
        duration: 350,
        useNativeDriver: true,
      });
      startTracked(rotateYTiming, () => {
        const bounceBack = RNAnimated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        });
        startTracked(bounceBack);

        // 2. Loop foil sheen
        const foilLoop = RNAnimated.loop(
          RNAnimated.timing(foilAnim, {
            toValue: 320,
            duration: 2000,
            useNativeDriver: true,
          })
        );
        startTracked(foilLoop);

        // 3. Ambient floating sway
        const floatLoop = RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.parallel([
              RNAnimated.timing(floatAnim, { toValue: -6, duration: 1500, useNativeDriver: true }),
              RNAnimated.timing(floatRotateAnim, { toValue: 1.2, duration: 1500, useNativeDriver: true })
            ]),
            RNAnimated.parallel([
              RNAnimated.timing(floatAnim, { toValue: 6, duration: 1800, useNativeDriver: true }),
              RNAnimated.timing(floatRotateAnim, { toValue: -1.2, duration: 1800, useNativeDriver: true })
            ]),
            RNAnimated.parallel([
              RNAnimated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
              RNAnimated.timing(floatRotateAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
            ]),
          ])
        );
        startTracked(floatLoop);
      });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      shakeActive.current = false;
      activeAnimationsRef.current.forEach(anim => {
        try {
          anim.stop();
        } catch (e) {}
      });
      activeAnimationsRef.current = [];
    };
  }, [visible, artifact]);

  // Trigger high-fidelity magical overload destruction
  const handleActivate = () => {
    if (isBurned) return;
    setIsBurned(true);

    sounds.playBurnArtefact();

    // Stop and clear all active ambient animations immediately to avoid conflict
    activeAnimationsRef.current.forEach(anim => {
      try {
        anim.stop();
      } catch (e) {}
    });
    activeAnimationsRef.current = [];

    floatAnim.setValue(0);
    floatRotateAnim.setValue(0);

    shakeActive.current = true;

    // 1. Violent Glitch vibration (shaking card X and Y at 25Hz)
    const triggerShake = () => {
      if (!shakeActive.current) {
        shakeX.setValue(0);
        shakeY.setValue(0);
        return;
      }
      const shakeSeq = RNAnimated.sequence([
        RNAnimated.timing(shakeX, { toValue: (Math.random() - 0.5) * 10, duration: 30, useNativeDriver: true }),
        RNAnimated.timing(shakeX, { toValue: (Math.random() - 0.5) * 10, duration: 30, useNativeDriver: true }),
        RNAnimated.timing(shakeY, { toValue: (Math.random() - 0.5) * 10, duration: 30, useNativeDriver: true }),
        RNAnimated.timing(shakeY, { toValue: (Math.random() - 0.5) * 10, duration: 30, useNativeDriver: true }),
      ]);
      
      startTracked(shakeSeq, () => {
        triggerShake();
      });
    };
    triggerShake();

    // 2. Launch ejecting sparks/embers upwards
    sparks.forEach((s) => {
      s.y.setValue(300);
      s.opacity.setValue(0);
      s.scale.setValue(1);
      s.driftX.setValue(0);

      const sparkAnim = RNAnimated.sequence([
        RNAnimated.delay(s.delay),
        RNAnimated.parallel([
          RNAnimated.timing(s.opacity, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          RNAnimated.timing(s.y, {
            toValue: -80, // shoot past the card limit
            duration: 1100,
            useNativeDriver: true,
          }),
          RNAnimated.timing(s.driftX, {
            toValue: (Math.random() - 0.5) * 120,
            duration: 1100,
            useNativeDriver: true,
          }),
          RNAnimated.timing(s.scale, {
            toValue: 0.05,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
      ]);
      startTracked(sparkAnim);
    });

    // 3. Activated impact pop bounce
    const popBounce = RNAnimated.timing(scaleAnim, {
      toValue: 1.12,
      duration: 120,
      useNativeDriver: true,
    });
    
    startTracked(popBounce, () => {
      // 4. Burn line fade-in and sweeping incinerator block
      const fireFade = RNAnimated.timing(fireOpacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      });
      startTracked(fireFade);

      // Flame flickering loop
      const flickerLoop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(fireFlickerAnim, { toValue: 1.25, duration: 70, useNativeDriver: true }),
          RNAnimated.timing(fireFlickerAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
          RNAnimated.timing(fireFlickerAnim, { toValue: 1.15, duration: 60, useNativeDriver: true }),
          RNAnimated.timing(fireFlickerAnim, { toValue: 0.9, duration: 90, useNativeDriver: true }),
        ])
      );
      startTracked(flickerLoop);

      // Translate the carbonized mask to sweep card bottom-to-top
      const burnSweep = RNAnimated.timing(burnTranslateY, {
        toValue: 0,
        duration: 1300,
        useNativeDriver: true,
      });
      startTracked(burnSweep);

      // Fade out the card details/borders underneath during the sweep
      const contentFade = RNAnimated.timing(cardContentOpacityAnim, {
        toValue: 0,
        duration: 1300,
        useNativeDriver: true,
      });
      startTracked(contentFade);

      // Start overall card fade-out at the sweep tail-end
      const cardFade = RNAnimated.sequence([
        RNAnimated.delay(800),
        RNAnimated.timing(cardOpacityAnim, {
          toValue: 0.1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);
      startTracked(cardFade);

      // 5. Final Supernova Explosion Release (at 1250ms)
      timeoutRef.current = setTimeout(() => {
        shakeActive.current = false;

        // Blinding full-screen white energy flash
        const flashAnimSeq = RNAnimated.sequence([
          RNAnimated.timing(flashOpacityAnim, {
            toValue: 1.0,
            duration: 60,
            useNativeDriver: true,
          }),
          RNAnimated.timing(flashOpacityAnim, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
        ]);
        startTracked(flashAnimSeq);

        // 3D Rapid Dimensional Spin and shrink collapse to 0
        const collapseAnim = RNAnimated.parallel([
          RNAnimated.timing(scaleAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          RNAnimated.timing(rotateXAnim, {
            toValue: 360,
            duration: 400,
            useNativeDriver: true,
          }),
          RNAnimated.timing(rotateYAnim, {
            toValue: 360,
            duration: 400,
            useNativeDriver: true,
          }),
        ]);
        
        startTracked(collapseAnim, () => {
          sounds.playSuccess();
          onAnimationEnd(activeArtifact);
        });
      }, 1250);
    });
  };

  // Interpolations
  const rotateX = rotateXAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });
  const rotateY = rotateYAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });
  const floatRotate = floatRotateAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });
  const foilTranslateX = foilAnim.interpolate({
    inputRange: [-100, 320],
    outputRange: [-100, 320],
  });

  return (
    <Modal visible={visible && !!artifact} transparent={true} animationType="fade">
      <View className="flex-1 bg-black/90 justify-center items-center relative">
        
        {/* Blinding Fullscreen Supernova Energy Flash Overlay */}
        <RNAnimated.View 
          style={[
            styles.flashOverlay, 
            { opacity: flashOpacityAnim }
          ]} 
          pointerEvents="none" 
        />

        {/* Ambient card color shadow backdrop */}
        <View
          style={[
            styles.ambientGlow,
            {
              backgroundColor: isEpic ? 'rgba(255, 202, 40, 0.12)' : 'rgba(163, 73, 255, 0.12)',
              shadowColor: isEpic ? '#ffca28' : '#a349ff',
              shadowRadius: 50,
              shadowOpacity: 0.5,
            },
          ]}
        />

        {/* Shaking Action Wrapper */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleActivate}
          disabled={isBurned}
        >
          {/* Card container with shake translation, floating, and 3D rotations */}
          <RNAnimated.View
            style={[
              styles.cardContainer,
              {
                transform: [
                  { scale: scaleAnim },
                  { rotateX: rotateX },
                  { rotateY: rotateY },
                  { translateY: floatAnim },
                  { rotate: floatRotate },
                  { translateX: shakeX },
                  { translateY: shakeY }
                ],
                opacity: cardOpacityAnim,
              },
            ]}
          >
            {/* Charcoal burned background border */}
            <View style={{ position: 'relative', width: 250, height: 420, overflow: 'hidden', borderRadius: 14 }}>
              <RNAnimated.View style={{ opacity: cardContentOpacityAnim, width: '100%', height: '100%' }}>
                <ArtifactCard
                  artifact={activeArtifact}
                  size="large"
                  animated={false}
                />
              </RNAnimated.View>

              {/* Holofoil light sheen sweep overlay */}
              <RNAnimated.View
                style={[
                  styles.foilSheen,
                  {
                    transform: [{ translateX: foilTranslateX }],
                  },
                ]}
              />

              {/* Lightweight native sparks flying directly inside/out the card */}
              {isBurned && sparks.map((s, idx) => (
                <RNAnimated.View
                  key={idx}
                  style={[
                    styles.spark,
                    {
                      width: s.size,
                      height: s.size,
                      borderRadius: s.size / 2,
                      backgroundColor: s.color,
                      opacity: s.opacity,
                      transform: [
                        { translateY: s.y },
                        { translateX: s.driftX },
                        { scale: s.scale }
                      ],
                      left: s.x,
                    }
                  ]}
                />
              ))}

              {/* SkSL Doom Fire burn shader — replaces old burnCover+fireLine */}
              {isBurned && (
                <CardBurnEffect width={250} height={420} borderRadius={14} />
              )}
            </View>
          </RNAnimated.View>
        </TouchableOpacity>

        {/* Close/Cancel Button (Only visible if the card is NOT currently being burned/incinerated!) */}
        {!isBurned && (
          <TouchableOpacity
            onPress={() => {
              sounds.playSelect();
              onAnimationEnd(null);
            }}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        )}

        {/* Prompt label */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 32 }}>
          <RNAnimated.Text style={[
            styles.promptLabel,
            { opacity: isBurned ? 1 : pulseAnim }
          ]}>
            {isBurned ? 'INCINERANDO ARTEFATO...' : 'Toque na carta para ativá-la!'}
          </RNAnimated.Text>
          {!isBurned && (
            <TouchableOpacity
              onPress={() => {
                sounds.playSelect();
                onAnimationEnd(null);
              }}
              className="bg-red-950/20 border border-red-800/30 px-5 py-2 rounded-full mt-4"
              activeOpacity={0.7}
            >
              <Text className="text-red-400 font-mono text-[9px] uppercase tracking-widest font-bold">
                Cancelar / Voltar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  promptLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 25,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    zIndex: 999,
  },
  ambientGlow: {
    position: 'absolute',
    width: 280,
    height: 380,
    borderRadius: 200,
  },
  cardContainer: {
    width: 250,
    height: 420,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    shadowColor: '#000000',
    shadowOpacity: 0.8,
    elevation: 10,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 4,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  rarityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    shadowOpacity: 0.3,
  },
  rarityText: {
    color: '#000000',
    fontWeight: '800',
  },
  artPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardDescription: {
    maxWidth: 200,
  },
  foilSheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '25deg' }, { scaleY: 2 }],
  },
  burnCover: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: 420,
    overflow: 'visible',
  },
  fireLine: {
    position: 'absolute',
    top: -6,
    left: -4,
    right: -4,
    height: 12,
    backgroundColor: '#ffaa00',
    borderTopWidth: 2,
    borderTopColor: '#ff4500',
    borderBottomWidth: 1,
    borderBottomColor: '#7a1100',
    shadowColor: '#ff4500',
    shadowRadius: 15,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: -2 },
  },
  spark: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
});
