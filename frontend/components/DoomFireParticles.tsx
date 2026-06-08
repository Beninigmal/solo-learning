import React, { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const source = Skia.RuntimeEffect.Make(`
uniform float time;
uniform vec2 resolution;

float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5000 * noise(p); p = p * 2.02;
    f += 0.2500 * noise(p); p = p * 2.03;
    f += 0.1250 * noise(p); p = p * 2.01;
    f += 0.0625 * noise(p);
    return f;
}

vec4 main(vec2 fragCoord) {
    // Pixelate for DOOM retro style
    float pixelSize = 6.0;
    vec2 pCoord = floor(fragCoord / pixelSize) * pixelSize;
    vec2 uv = pCoord / resolution;

    // Skia coordinates: y=0 is top, y=1 is bottom
    // We want fire at the bottom (y closer to 1)
    
    vec2 q = pCoord / 120.0;
    q.y += time * 1.8; // move fire up
    
    float n = fbm(q * 1.5);
    
    // Intensity based on Y and noise
    // Y fades intensity as we go up (lower uv.y)
    float heat = pow(uv.y, 2.0) * 1.6 - 0.2 + n * 1.2;
    
    // Apply Doom Fire palette (from bottom to top)
    vec4 color = vec4(0.0);
    if (heat > 1.6) color = vec4(1.0, 1.0, 0.8, 1.0); // White core
    else if (heat > 1.2) color = vec4(1.0, 0.8, 0.0, 1.0); // Yellow
    else if (heat > 0.9) color = vec4(1.0, 0.4, 0.0, 1.0); // Orange
    else if (heat > 0.6) color = vec4(0.8, 0.1, 0.0, 0.9); // Red
    else if (heat > 0.3) color = vec4(0.4, 0.0, 0.0, 0.6); // Dark Red
    else color = vec4(0.0, 0.0, 0.0, 0.0); // Transparent

    return color;
}
`);

export function DoomFireParticles() {
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(1000, { duration: 1000000, easing: Easing.linear }),
      -1
    );
  }, []);

  const uniforms = useDerivedValue(() => ({
    time: time.value,
    resolution: [SCREEN_WIDTH, SCREEN_HEIGHT],
  }));

  if (!source) {
    console.warn("Skia shader compilation failed.");
    return null;
  }

  return (
    <Canvas style={styles.container} pointerEvents="none">
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
});
