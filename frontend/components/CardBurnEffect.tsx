/**
 * CardBurnEffect — Premium After Effects style burning dissolve shader.
 * 
 * Visual: Jagged organic flame line, hot charred zone, glowing cracks, and rising sparks.
 * Uses react-native-reanimated + @shopify/react-native-skia.
 */
import React, { useEffect } from 'react';
import {
  Canvas,
  Fill,
  Shader,
  Skia,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

// ─── SkSL Shader: advanced dissolve with multi-layer glowing fire and embers ────────────
const burnShader = Skia.RuntimeEffect.Make(`
uniform float time;
uniform vec2  resolution;
uniform float progress; // 0.0 = intact, 1.0 = fully dissolved

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
        mix(hash(i), hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p = p * 2.02 + vec2(3.7, 8.1);
        a *= 0.5;
    }
    return v;
}

vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / resolution;
    float t = time * 0.8;
    
    // Noise modulated fronts
    float nLine = fbm(vec2(uv.x * 5.0, t * 0.15)) * 0.06;
    float burnFront = (1.0 - progress) + nLine;
    
    // Char progress lags behind intact progress
    float pChar = clamp((progress - 0.12) / 0.88, 0.0, 1.0);
    float charFront = (1.0 - pChar) + nLine;
    
    float distToBurn = uv.y - burnFront; // positive below burnFront (burned)
    
    vec3 col = vec3(0.0);
    float alpha = 0.0;
    
    // 1. FLAME EDGE ZONE
    float flameCore = exp(-pow(distToBurn * 42.0, 2.0));
    float flameMid  = exp(-pow(distToBurn * 20.0, 2.0));
    float flameOuter = exp(-pow(distToBurn * 8.0, 2.0));
    
    float fireNoise = fbm(vec2(uv.x * 8.0, uv.y * 6.0 - t * 2.5));
    flameMid   *= (0.5 + 0.5 * fireNoise);
    flameOuter *= (0.3 + 0.7 * fireNoise);
    
    vec3 flameCol = vec3(1.0, 0.96, 0.82) * flameCore * 2.2 +
                    vec3(1.0, 0.55, 0.05) * flameMid  * 1.8 +
                    vec3(0.85, 0.05, 0.0) * flameOuter * 1.2;
                    
    float flameAlpha = clamp(flameCore * 1.3 + flameMid * 1.0 + flameOuter * 0.5, 0.0, 1.0);
    
    // 2. CHARRED EMBERS ZONE
    if (distToBurn > 0.0 && uv.y < charFront) {
        float charFactor = (charFront - uv.y) / max(charFront - burnFront, 0.001);
        charFactor = clamp(charFactor, 0.0, 1.0);
        
        float crackN = fbm(uv * 20.0 + vec2(0.0, t * 0.15));
        float crackVal = smoothstep(0.42, 0.72, crackN) * charFactor;
        vec3 crackCol = vec3(1.0, 0.28, 0.0) * crackVal * 1.6;
        
        col += crackCol;
        alpha += crackVal * 0.7;
    }
    
    // 3. FLYING EMBERS & SPARKS (float upwards)
    vec2 emberUv = vec2(uv.x * 14.0 - t * 0.1, uv.y * 8.5 - t * 1.6);
    emberUv.x += sin(uv.y * 5.0 + t) * 0.12;
    float emberN = fbm(emberUv);
    float emberVal = smoothstep(0.81, 0.91, emberN);
    
    // Only sparks near and above burn line, fading out below char line
    float emberFade = smoothstep(0.0, 0.2, uv.y) * (1.0 - smoothstep(charFront, charFront + 0.18, uv.y));
    vec3 sparkCol = vec3(1.0, 0.65, 0.12) * emberVal * emberFade * 3.2;
    
    col += flameCol + sparkCol;
    alpha = clamp(alpha + flameAlpha + emberVal * emberFade * 0.85, 0.0, 1.0);
    
    return vec4(col * alpha, alpha);
}
`);

// ─── Component ────────────────────────────────────────────────────────────────
interface CardBurnEffectProps {
  width: number;
  height: number;
  borderRadius?: number;
  progress?: SharedValue<number>;
}

export function CardBurnEffect({ width, height, borderRadius = 12, progress }: CardBurnEffectProps) {
  const time = useSharedValue(0);
  const localProgress = useSharedValue(0);

  useEffect(() => {
    // Time scrolls forever
    time.value = withRepeat(
      withTiming(1000, { duration: 1000000, easing: Easing.linear }),
      -1
    );
    if (!progress) {
      localProgress.value = withTiming(1.0, { duration: 1100, easing: Easing.in(Easing.quad) });
    }
  }, [progress]);

  const activeProgress = progress || localProgress;

  const uniforms = useDerivedValue(() => ({
    time:       time.value,
    resolution: [width, height],
    progress:   activeProgress.value,
  }));

  if (!burnShader) {
    console.warn('[CardBurnEffect] Shader failed to compile.');
    return null;
  }

  return (
    <Canvas style={{ position: 'absolute', top: 0, left: 0, width, height }} pointerEvents="none">
      <Fill>
        <Shader source={burnShader} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
