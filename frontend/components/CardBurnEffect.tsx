/**
 * CardBurnEffect — Animação de carta pegando fogo e sendo consumida.
 * 
 * Visual: chamas subindo da base + bordas queimando em cima da carta.
 * Usa react-native-reanimated + @shopify/react-native-skia.
 * 
 * Inspirado em:
 * - https://www.youtube.com/shorts/zB_2fuiwBPk  (fogo subindo)
 * - https://www.youtube.com/shorts/S8vxNx-hm5Q  (bordas animadas queimando)
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  Path,
  BlurMask,
  Group,
  Paint,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ─── SkSL Shader: fire front rises from bottom, burning the card ────────────
const burnShader = Skia.RuntimeEffect.Make(`
uniform float time;
uniform vec2  resolution;
uniform float progress; // 0.0 = just started, 1.0 = fully consumed

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

    // In Skia: uv.y=0 is TOP, uv.y=1 is BOTTOM
    // "fromBottom" = 1 at bottom, 0 at top
    float fromBottom = uv.y;

    // ── BURN FRONT ─────────────────────────────────────────────────────────
    // burnFront moves from 1.0 (bottom) to 0.0 (top) as progress goes 0→1
    // Add FBM noise to make the edge jagged/organic
    float edgeNoise = fbm(vec2(uv.x * 4.0, uv.x * 3.0 + time * 0.3)) * 0.18;
    float burnFrontY = 1.0 - progress + edgeNoise; // descends toward top

    // Distance from this pixel to the burn front
    // positive = below front (burned), negative = above front (intact)
    float distToFront = fromBottom - burnFrontY;

    // ── FIRE ANIMATION at the burn edge ────────────────────────────────────
    float speed = time * 2.0;
    float fx = uv.x * 3.5;
    float fy = fromBottom * 4.0 + speed;
    float n1 = fbm(vec2(fx, fy));
    float n2 = fbm(vec2(fx + 5.3, fy * 0.7 + 1.2));
    float n  = n1 * 0.65 + n2 * 0.35;

    // Flame zone: thin band just above and at the burn front
    // positive flameZone = on fire, negative = card (intact or char)
    float flameZone = distToFront + n * 0.25;

    // ── CHARRED ZONE below burn front ──────────────────────────────────────
    // Pixels well below front become dark char/ash
    float charAlpha = smoothstep(0.0, 0.06, distToFront - 0.04);

    // ── FLAME PIXELS at and just above the front ───────────────────────────
    float flameAlpha = smoothstep(-0.12, 0.0, flameZone) * (1.0 - smoothstep(0.0, 0.18, flameZone));

    // ── COLORS ─────────────────────────────────────────────────────────────
    // Char color: ash look — light gray on surface fading to dark charcoal deeper in
    // Adds subtle noise variation to look like real ash texture
    float ashNoise = vnoise(uv * 12.0 + vec2(time * 0.05, 0.0)) * 0.12;
    float ashGray = 0.38 + ashNoise + smoothstep(0.0, 0.25, distToFront) * 0.25;
    // Near the burn edge: glowing red ember
    float emberGlow = smoothstep(0.06, 0.0, distToFront) * 0.6;
    vec3 charCol = mix(
        vec3(0.7 + ashNoise, 0.05, 0.0),             // red ember at the edge
        vec3(ashGray, ashGray * 0.95, ashGray * 0.9), // gray ash surface
        smoothstep(0.0, 0.12, distToFront)
    );
    charCol = mix(charCol, vec3(0.08, 0.08, 0.08), smoothstep(0.2, 0.55, distToFront)); // darker deep char

    // Flame color ramp: white core → yellow → orange → dark red at tip
    float flameHeat = clamp(1.0 - (flameZone + 0.12) / 0.3, 0.0, 1.0) + n * 0.3;
    vec3 flameCol = vec3(0.0);
    flameCol = mix(flameCol, vec3(0.8, 0.0, 0.0),   smoothstep(0.0, 0.3, flameHeat));
    flameCol = mix(flameCol, vec3(1.0, 0.35, 0.0),  smoothstep(0.3, 0.6, flameHeat));
    flameCol = mix(flameCol, vec3(1.0, 0.75, 0.05), smoothstep(0.6, 0.9, flameHeat));
    flameCol = mix(flameCol, vec3(1.0, 1.0,  0.85), smoothstep(0.9, 1.2, flameHeat));

    // ── COMPOSE ────────────────────────────────────────────────────────────
    vec3 col  = charCol  * charAlpha  * (1.0 - flameAlpha);
    col      += flameCol * flameAlpha;
    float alpha = charAlpha * (1.0 - flameAlpha) + flameAlpha;

    // Pre-multiplied alpha (required by Skia)
    return vec4(col * alpha, alpha);
}
`);

// ─── Component ────────────────────────────────────────────────────────────────
interface CardBurnEffectProps {
  width: number;
  height: number;
  borderRadius?: number;
}

export function CardBurnEffect({ width, height, borderRadius = 12 }: CardBurnEffectProps) {
  const time     = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Time scrolls forever
    time.value = withRepeat(
      withTiming(1000, { duration: 1000000, easing: Easing.linear }),
      -1
    );
    // 1100ms matches burnSweep in ArtifactBurnModal — card disappears in sync
    progress.value = withTiming(1.0, { duration: 1100, easing: Easing.in(Easing.quad) });
  }, []);

  const uniforms = useDerivedValue(() => ({
    time:       time.value,
    resolution: [width, height],
    progress:   progress.value,
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
