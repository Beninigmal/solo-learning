import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Animated as RNAnimated, StyleSheet, Dimensions, TouchableOpacity, Easing as RNEasing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSolenSounds } from '../hooks/useSolenSounds';
import { ArtifactCard } from './ArtifactCard';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Mask, RoundedRect, Fill, Shader, Skia, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

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

// Local image assets mapping corresponding to build resolution
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
  chapeu_arcanista: require('../assets/chapeu_arcanista.png'),
};

const maskShaderSource = `
uniform float time;
uniform vec2 resolution;
uniform float progress;

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 74.27);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = p * 2.02 + vec2(3.7, 8.1);
        a *= 0.5;
    }
    return v;
}

vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / resolution;
    float noiseVal = fbm(uv * 4.5 + vec2(0.0, time * 0.12));
    float value = (1.0 - uv.y) * 0.72 + noiseVal * 0.38;
    float threshold = progress * 1.45 - 0.25;
    // Softer dissolve edges: smoothstep range increased to 0.12
    float alpha = smoothstep(threshold, threshold + 0.12, value);
    return vec4(alpha, alpha, alpha, alpha);
}
`;

const fireShaderSource = `
uniform float time;
uniform vec2 resolution;
uniform float progress;

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 74.27);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = p * 2.02 + vec2(3.7, 8.1);
        a *= 0.5;
    }
    return v;
}

vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / resolution;
    float noiseVal = fbm(uv * 4.5 + vec2(0.0, time * 0.12));
    float threshold = progress * 1.45 - 0.25;
    float value = (1.0 - uv.y) * 0.72 + noiseVal * 0.38;
    
    float distToFire = value - threshold;
    // Softened fire edge: band width increased to 0.16
    float fireMask = step(0.0, distToFire) * step(distToFire, 0.16);
    
    float factor = clamp(distToFire / 0.16, 0.0, 1.0); 
    float fireNoise = fbm(uv * 14.0 - vec2(0.0, time * 2.5));
    // Soften glow intensity profile (multiplier reduced to 2.8 for wider hot zone)
    float intensity = exp(-pow((factor - 0.25) * 2.8, 2.0));
    
    vec3 whiteHot = vec3(1.0, 0.96, 0.82) * 2.2;
    vec3 gold = vec3(1.0, 0.7, 0.05) * 1.8;
    vec3 red = vec3(0.85, 0.08, 0.0) * 1.2;
    
    vec3 col = mix(red, gold, factor);
    col = mix(col, whiteHot, intensity);
    
    col *= (0.55 + 0.45 * fireNoise);
    // Softer alpha transition for blurred flame look
    float alpha = smoothstep(0.0, 0.15, factor) * (1.0 - smoothstep(0.80, 1.0, factor)) * (0.6 + 0.4 * fireNoise);
    alpha *= fireMask;
    
    return vec4(col * alpha, alpha);
}
`;

let organicMaskShader: any = null;
let organicFireShader: any = null;

const getOrganicMaskShader = () => {
  if (Platform.OS === 'web') return null;
  if (!organicMaskShader && typeof Skia !== 'undefined' && Skia && Skia.RuntimeEffect) {
    try {
      organicMaskShader = Skia.RuntimeEffect.Make(maskShaderSource);
    } catch (e) {
      console.warn('[Skia] Failed to initialize organicMaskShader:', e);
    }
  }
  return organicMaskShader;
};

const getOrganicFireShader = () => {
  if (Platform.OS === 'web') return null;
  if (!organicFireShader && typeof Skia !== 'undefined' && Skia && Skia.RuntimeEffect) {
    try {
      organicFireShader = Skia.RuntimeEffect.Make(fireShaderSource);
    } catch (e) {
      console.warn('[Skia] Failed to initialize organicFireShader:', e);
    }
  }
  return organicFireShader;
};

// Sub-component for Skia canvas to avoid hook execution on Web
const SkiaBurnCanvas = ({
  maskShader,
  charredMaskUniforms,
  intactMaskUniforms,
  fireShader,
  fireUniforms,
  imgSource,
  burnProgress,
  rarityBgColor,
  rarityBorderColor
}: any) => {
  const cardImage = useImage(imgSource);
  
  return (
    <Canvas style={{ width: 250, height: 420 }}>
      {/* Layer 1 (Bottom): Charred Card, lags behind */}
      <Mask
        mode="alpha"
        mask={
          <Fill>
            {maskShader && (
              <Shader source={maskShader} uniforms={charredMaskUniforms} />
            )}
          </Fill>
        }
      >
        <RoundedRect x={0} y={0} width={250} height={420} r={14} color="#0c0808" />
        <RoundedRect x={1.5} y={1.5} width={247} height={417} r={14} color="#1a1111" style="stroke" strokeWidth={3} />
        {cardImage && (
          <SkiaImage
            image={cardImage}
            x={16}
            y={15}
            width={218}
            height={170}
            fit="contain"
            opacity={0.15}
          />
        )}
      </Mask>

      {/* Layer 2 (Middle): The Original Intact Card Image with dissolve mask */}
      <Mask
        mode="alpha"
        mask={
          <Fill>
            {maskShader && (
              <Shader source={maskShader} uniforms={intactMaskUniforms} />
            )}
          </Fill>
        }
      >
        {/* Intact Background */}
        <RoundedRect x={0} y={0} width={250} height={420} r={14} color={rarityBgColor} />
        {/* Intact Border */}
        <RoundedRect x={1.5} y={1.5} width={247} height={417} r={14} color={rarityBorderColor} style="stroke" strokeWidth={3} />
        {cardImage && (
          <SkiaImage
            image={cardImage}
            x={16}
            y={15}
            width={218}
            height={170}
            fit="contain"
          />
        )}
      </Mask>

      {/* Layer 3 (Top): The Fire Rim effect running along the dissolve edge */}
      <Fill>
        {fireShader && (
          <Shader source={fireShader} uniforms={fireUniforms} />
        )}
      </Fill>
    </Canvas>
  );
};

export function ArtifactBurnModal({ visible, artifact, onAnimationEnd }: ArtifactBurnModalProps) {
  const maskShader = getOrganicMaskShader();
  const fireShader = getOrganicFireShader();
  const [localVisible, setLocalVisible] = useState(visible);
  const bgOpacityAnim = useRef(new RNAnimated.Value(1)).current;
  const [isBurned, setIsBurned] = useState(false);
  const sounds = useSolenSounds();
  const [activeArtifactState, setActiveArtifactState] = useState<Artifact | null>(null);

  const isBurningRef = useRef(false);

  useEffect(() => {
    if (visible && artifact) {
      setLocalVisible(true);
      setActiveArtifactState(artifact);
      setIsBurned(false);
      isBurningRef.current = false;
      bgOpacityAnim.setValue(1);
    } else {
      if (!isBurned && !isBurningRef.current) {
        setLocalVisible(false);
        setActiveArtifactState(null);
      }
    }
  }, [visible, artifact]);

  const activeArtifact = activeArtifactState || { id: '', name: '', type: 'magic' as const, description: '' };
  const imgSource = artifactImages[activeArtifact.id] || require('../assets/nano_banana.png');

  const getRarityColors = () => {
    switch (activeArtifact.type) {
      case 'legendary':
        return {
          color: '#ffca28',
          bg: '#17130a',
          borderColor: '#ffca28',
        };
      case 'epic':
        return {
          color: '#a349ff',
          bg: '#10081d',
          borderColor: '#a349ff',
        };
      case 'magic':
      default:
        return {
          color: '#00f3ff',
          bg: '#050a14',
          borderColor: '#00b8d4',
        };
    }
  };
  const rarityColors = getRarityColors();
  const rarityColor = rarityColors.color;
  const rarityBgColor = rarityColors.bg;
  const rarityBorderColor = rarityColors.borderColor;

  // Reanimated shared values
  const burnProgress = useSharedValue(0);
  const time = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  // Derived values for Skia shader uniforms
  const intactMaskUniforms = useDerivedValue(() => ({
    time: time.value,
    resolution: [250, 420],
    progress: burnProgress.value,
  }));

  const charredMaskUniforms = useDerivedValue(() => {
    const charredVal = Math.max(0.0, Math.min(1.0, (burnProgress.value - 0.12) / 0.88));
    return {
      time: time.value,
      resolution: [250, 420],
      progress: charredVal,
    };
  });

  const fireUniforms = useDerivedValue(() => ({
    time: time.value,
    resolution: [250, 420],
    progress: burnProgress.value,
  }));

  // Reanimated layout animated style for the text overlay fading
  const textFadeStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  const cardDissolveStyle = useAnimatedStyle(() => {
    return {
      opacity: isBurned ? Math.max(0, 1 - burnProgress.value * 1.15) : 1,
    };
  });

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

  // 85 lightweight native explosion spark emitters
  const explosionSparks = useRef(
    Array.from({ length: 85 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const maxRadius = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.65;
      const speed = Math.random() * maxRadius + 120;
      return {
        progress: new RNAnimated.Value(0),
        targetX: Math.cos(angle) * speed + (Math.random() - 0.5) * 150,
        targetY: Math.sin(angle) * speed - (Math.random() * SCREEN_HEIGHT * 0.7 + 100), // float upwards
        sway: (Math.random() - 0.5) * 180, // larger horizontal sway amplitude
        size: Math.random() * 6.5 + 2.5, // varied sizes
        delay: Math.random() * 805, // spread start time
      };
    })
  ).current;

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
      burnProgress.value = 0;
      time.value = 0;
      textOpacity.value = 1;
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

      // Reset explosion sparks
      explosionSparks.forEach((s) => {
        s.progress.setValue(0);
      });

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

      // Start Reanimated loop for shader time uniform
      time.value = withRepeat(
        withTiming(1000, { duration: 1000000, easing: Easing.linear }),
        -1
      );
    }
  }, [visible, artifact]);

  // Clean up animations only on full unmount, not when visibility changes mid-burn!
  useEffect(() => {
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
  }, []);

  // Trigger high-fidelity magical overload destruction
  const handleActivate = () => {
    if (isBurned) return;
    setIsBurned(true);
    isBurningRef.current = true;

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

    // Fade out text absolute overlay quickly
    textOpacity.value = withTiming(0, { duration: 300 });

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

    // Reset and trigger explosion sparks
    explosionSparks.forEach((s) => {
      s.progress.setValue(0);

      const expSparkAnim = RNAnimated.sequence([
        RNAnimated.delay(800 + s.delay), // starts just before/during the flash peak
        RNAnimated.timing(s.progress, {
          toValue: 1.0,
          duration: 6400, // doubled to 6.4s so they wander longer
          easing: RNEasing.out(RNEasing.quad),
          useNativeDriver: true,
        })
      ]);
      startTracked(expSparkAnim);
    });

    // 3. Activated impact pop bounce
    const popBounce = RNAnimated.timing(scaleAnim, {
      toValue: 1.12,
      duration: 120,
      useNativeDriver: true,
    });
    
    startTracked(popBounce, () => {
      // 4. Reanimated burn progress sweep!
      burnProgress.value = withTiming(1.0, {
        duration: 1150,
        easing: Easing.linear,
      });

      // 5. Flash and Close Transition Timer
      // Start the flash at 900ms (reaches peak at 1050ms)
      timeoutRef.current = setTimeout(() => {
        shakeActive.current = false;

        // Blinding white flash (peaks in 150ms)
        const flashAnim = RNAnimated.timing(flashOpacityAnim, {
          toValue: 1.0,
          duration: 150,
          useNativeDriver: true,
        });
        
        startTracked(flashAnim, () => {
          // At peak opacity: make everything disappear instantly under the white overlay!
          cardOpacityAnim.setValue(0);
          
          // Call onAnimationEnd immediately at the peak of the flash so parent shows popup!
          onAnimationEnd(activeArtifact);

          // Fade out the dark background overlay so underlying screen is visible behind sparks
          const bgFade = RNAnimated.timing(bgOpacityAnim, {
            toValue: 0.0,
            duration: 1000,
            useNativeDriver: true,
          });
          startTracked(bgFade);
          
          // Fade the white flash back to 0 (allowing sparks to hover in darkness)
          const flashFadeOut = RNAnimated.timing(flashOpacityAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          });
          
          startTracked(flashFadeOut, () => {
            sounds.playSuccess();
            timeoutRef.current = setTimeout(() => {
              setLocalVisible(false);
              setActiveArtifactState(null);
              setIsBurned(false);
              isBurningRef.current = false;
            }, 1000);
          });
        });
      }, 900);
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
    <Modal visible={localVisible && !!activeArtifactState} transparent={true} animationType="fade">
      {localVisible && (
        <View style={styles.modalContainer}>
        {/* Animated black background overlay */}
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: '#000000',
              opacity: bgOpacityAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.9],
              }),
            }
          ]}
        />
        
        {/* Blinding Fullscreen Supernova Energy Flash Overlay */}
        <RNAnimated.View 
          style={[
            styles.flashOverlay, 
            { opacity: flashOpacityAnim }
          ]} 
          pointerEvents="none" 
        />

        {/* Ambient card color shadow backdrop (Opacity linked to cardOpacityAnim) */}
        <RNAnimated.View
          style={[
            styles.ambientGlow,
            {
              backgroundColor: isEpic ? 'rgba(255, 202, 40, 0.01)' : 'rgba(163, 73, 255, 0.01)',
              shadowColor: isEpic ? '#ffca28' : '#a349ff',
              shadowRadius: 50,
              shadowOpacity: cardOpacityAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
              opacity: cardOpacityAnim,
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
              
              {/* O Card Intacto permanece renderizado e dissolve progressivamente com o progresso do fogo */}
              <Reanimated.View style={[{ width: 250, height: 420, position: 'absolute', top: 0, left: 0, zIndex: 1 }, cardDissolveStyle]}>
                <ArtifactCard
                  artifact={activeArtifact}
                  size="large"
                  animated={false}
                />
              </Reanimated.View>

              {/* Se queimado no Mobile/Native, renderiza também o Skia Canvas por cima/trás para simular a fusão da máscara */}
              {isBurned && Platform.OS !== 'web' && (
                <SkiaBurnCanvas
                  maskShader={maskShader}
                  charredMaskUniforms={charredMaskUniforms}
                  intactMaskUniforms={intactMaskUniforms}
                  fireShader={fireShader}
                  fireUniforms={fireUniforms}
                  imgSource={imgSource}
                  burnProgress={burnProgress}
                  rarityBgColor={rarityBgColor}
                  rarityBorderColor={rarityBorderColor}
                />
              )}

              {/* Standard React Native Text Overlays (Fade out during burn) */}
              {isBurned && (
                <Reanimated.View 
                  style={[
                    StyleSheet.absoluteFillObject,
                    { padding: 16, justifyContent: 'space-between', zIndex: 10 },
                    textFadeStyle
                  ]}
                  pointerEvents="none"
                >
                  {/* Top Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                      <Text className="font-extrabold uppercase tracking-widest text-[8px] text-black">
                        {rarityLabel}
                      </Text>
                    </View>
                    <View style={[styles.iconBox, { borderColor: rarityBorderColor, shadowColor: rarityColor }]}>
                      <Feather name={getIcon()} size={18} color={rarityColor} />
                    </View>
                  </View>
                  
                  {/* Bottom Column */}
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <Text className="text-white font-bold uppercase tracking-wider text-center text-xl" style={styles.cardTitle}>
                      {activeArtifact.name}
                    </Text>
                    <Text className="text-white/95 font-mono text-center leading-tight mt-1 text-xs" style={styles.cardDescription} numberOfLines={6}>
                      {activeArtifact.description || 'Em desenvolvimento.'}
                    </Text>
                  </View>
                </Reanimated.View>
              )}

              {/* Holofoil light sheen sweep overlay */}
              {!isBurned && (
                <RNAnimated.View
                  style={[
                    styles.foilSheen,
                    {
                      transform: [{ translateX: foilTranslateX }],
                    },
                  ]}
                />
              )}
            </View>
          </RNAnimated.View>
        </TouchableOpacity>

        {/* Root level sparks container (not clipped by card boundaries) */}
        {isBurned && (
          <View style={{ position: 'absolute', width: 250, height: 420, pointerEvents: 'none' }}>
            {sparks.map((s, idx) => (
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
            {explosionSparks.map((s, idx) => {
              const translateX = s.progress.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [
                  125,
                  125 + s.targetX * 0.25 + s.sway,
                  125 + s.targetX * 0.55 - s.sway,
                  125 + s.targetX * 0.8 + s.sway * 0.4,
                  125 + s.targetX
                ],
              });
              const translateY = s.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [210, 210 + s.targetY],
              });
              const opacity = s.progress.interpolate({
                inputRange: [0, 0.08, 0.85, 1],
                outputRange: [0, 0.95, 0.45, 0],
              });
              const scale = s.progress.interpolate({
                inputRange: [0, 0.1, 1],
                outputRange: [0.3, 1.2, 0.2],
              });
              const color = s.progress.interpolate({
                inputRange: [0, 0.25, 0.65, 1],
                outputRange: ['#ffffff', '#ffedd0', '#ff9f1a', '#ff6a00'],
              });

              return (
                <RNAnimated.View
                  key={`exp-${idx}`}
                  style={[
                    styles.spark,
                    {
                      left: 0,
                      top: 0,
                      width: s.size,
                      height: s.size,
                      borderRadius: s.size / 2,
                      backgroundColor: color,
                      opacity: opacity,
                      transform: [
                        { translateX: translateX },
                        { translateY: translateY },
                        { scale: scale }
                      ],
                    }
                  ]}
                />
              );
            })}
          </View>
        )}

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
        <RNAnimated.View 
          style={{ alignItems: 'center', justifyContent: 'center', marginTop: 32, opacity: cardOpacityAnim }}
        >
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
        </RNAnimated.View>
      </View>
      )}
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
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
  iconBox: {
    backgroundColor: '#000000d0',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    shadowRadius: 5,
    shadowOpacity: 0.8,
    elevation: 4,
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
