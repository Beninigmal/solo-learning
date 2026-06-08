import React, { useEffect, useState } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const FIRE_WIDTH = 60;
const FIRE_HEIGHT = 40;

export function DoomFire() {
  const [firePixelsArray, setFirePixelsArray] = useState<number[]>([]);
  const screenWidth = Dimensions.get('window').width;
  const scale = screenWidth / FIRE_WIDTH;

  const colors = [
    'transparent', '#1f070730', '#2f0f0760', '#470f0780', '#571707', '#671f07', '#771f07', '#8f2707',
    '#9f2f07', '#af3f07', '#bf4707', '#c74707', '#df4f07', '#df5707', '#df5707', '#d75f07',
    '#d7670f', '#cf6f0f', '#cf770f', '#cf7f0f', '#cf8717', '#c78717', '#c78f17', '#c7971f',
    '#bf9f27', '#bf9f27', '#bfa727', '#bfa727', '#bfaf2f', '#b7af2f', '#b7b72f', '#b7b737',
    '#cfcf6f', '#dfdf9f', '#efefc7', '#ffffff'
  ];

  useEffect(() => {
    const numberOfPixels = FIRE_WIDTH * FIRE_HEIGHT;
    const initialArray = new Array(numberOfPixels).fill(0);
    
    // Create fire source at the bottom
    for (let column = 0; column < FIRE_WIDTH; column++) {
      const pixelIndex = (FIRE_WIDTH * (FIRE_HEIGHT - 1)) + column;
      initialArray[pixelIndex] = 35; // Max intensity
    }
    
    setFirePixelsArray(initialArray);

    const interval = setInterval(() => {
      setFirePixelsArray(prev => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        for (let column = 0; column < FIRE_WIDTH; column++) {
          for (let row = 1; row < FIRE_HEIGHT; row++) {
            const pixelIndex = column + (FIRE_WIDTH * row);
            updateFireIntensityPerPixel(pixelIndex, next);
          }
        }
        return next;
      });
    }, 30); // ~33 fps

    return () => clearInterval(interval);
  }, []);

  function updateFireIntensityPerPixel(currentPixelIndex: number, array: number[]) {
    const belowPixelIndex = currentPixelIndex + FIRE_WIDTH;
    if (belowPixelIndex >= FIRE_WIDTH * FIRE_HEIGHT) return;
    
    const decay = Math.floor(Math.random() * 4); // Decay aumentado para diminuir altura do fogo
    const belowPixelFireIntensity = array[belowPixelIndex];
    const newFireIntensity = belowPixelFireIntensity - decay >= 0 ? belowPixelFireIntensity - decay : 0;
    
    // Propagação com vento aleatório (Deschamps)
    const targetIndex = currentPixelIndex - decay + 1;
    if (targetIndex >= 0 && targetIndex < FIRE_WIDTH * FIRE_HEIGHT) {
      array[targetIndex] = newFireIntensity;
    }
  }

  return (
    <View style={{ width: '100%', height: FIRE_HEIGHT * scale, position: 'absolute', bottom: 0 }} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${FIRE_WIDTH} ${FIRE_HEIGHT}`}>
        {firePixelsArray.map((intensity, index) => {
          const x = index % FIRE_WIDTH;
          const y = Math.floor(index / FIRE_WIDTH);
          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={colors[intensity]}
            />
          );
        })}
      </Svg>
    </View>
  );
}
