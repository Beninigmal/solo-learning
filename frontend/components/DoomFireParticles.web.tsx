import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

const PIXEL_SIZE = 6;
const FIRE_HEIGHT = 60; // 60 rows of pixels

const colors = [
  'transparent', '#1f070730', '#2f0f0760', '#470f0780', '#571707', '#671f07', '#771f07', '#8f2707',
  '#9f2f07', '#af3f07', '#bf4707', '#c74707', '#df4f07', '#df5707', '#df5707', '#d75f07',
  '#d7670f', '#cf6f0f', '#cf770f', '#cf7f0f', '#cf8717', '#c78717', '#c78f17', '#c7971f',
  '#bf9f27', '#bf9f27', '#bfa727', '#bfa727', '#bfaf2f', '#b7af2f', '#b7b72f', '#b7b737',
  '#cfcf6f', '#dfdf9f', '#efefc7', '#ffffff'
];

export function DoomFireParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = FIRE_HEIGHT * PIXEL_SIZE;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    let fireWidth = Math.ceil(width / PIXEL_SIZE);
    const fireHeight = FIRE_HEIGHT;
    let numberOfPixels = fireWidth * fireHeight;
    let firePixelsArray = new Array(numberOfPixels).fill(0);

    // Initialize fire source at the bottom row
    function initFireSource() {
      for (let column = 0; column < fireWidth; column++) {
        const pixelIndex = (fireWidth * (fireHeight - 1)) + column;
        firePixelsArray[pixelIndex] = 35; // Max intensity
      }
    }
    
    initFireSource();

    function updateFireIntensityPerPixel(currentPixelIndex: number) {
      const belowPixelIndex = currentPixelIndex + fireWidth;
      if (belowPixelIndex >= numberOfPixels) return;
      
      const decay = Math.floor(Math.random() * 3);
      const belowPixelFireIntensity = firePixelsArray[belowPixelIndex];
      const newFireIntensity = belowPixelFireIntensity - decay >= 0 ? belowPixelFireIntensity - decay : 0;
      
      const targetIndex = currentPixelIndex - decay + 1;
      if (targetIndex >= 0 && targetIndex < numberOfPixels) {
        firePixelsArray[targetIndex] = newFireIntensity;
      }
    }

    function step() {
      // 1. Update fire intensities
      for (let column = 0; column < fireWidth; column++) {
        for (let row = 1; row < fireHeight; row++) {
          const pixelIndex = column + (fireWidth * row);
          updateFireIntensityPerPixel(pixelIndex);
        }
      }

      // 2. Render to canvas
      ctx.clearRect(0, 0, width, height);

      for (let row = 0; row < fireHeight; row++) {
        for (let col = 0; col < fireWidth; col++) {
          const pixelIndex = col + (fireWidth * row);
          const intensity = firePixelsArray[pixelIndex];
          const color = colors[intensity];
          
          if (color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(col * PIXEL_SIZE, row * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
          }
        }
      }
    }

    let lastTime = 0;
    const fpsInterval = 1000 / 30; // 30 FPS target

    function tick(timestamp: number) {
      animationId = requestAnimationFrame(tick);

      const elapsed = timestamp - lastTime;
      if (elapsed > fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);
        step();
      }
    }

    animationId = requestAnimationFrame(tick);

    // Handle Resize
    const handleResize = () => {
      width = window.innerWidth;
      canvas.width = width;
      fireWidth = Math.ceil(width / PIXEL_SIZE);
      numberOfPixels = fireWidth * fireHeight;
      
      const nextArray = new Array(numberOfPixels).fill(0);
      firePixelsArray = nextArray;
      initFireSource();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: FIRE_HEIGHT * PIXEL_SIZE,
        }}
      />
    </View>
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
