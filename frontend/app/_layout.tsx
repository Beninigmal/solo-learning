import React from 'react';
import { Slot } from 'expo-router';
import '../global.css';
import { View, StatusBar } from 'react-native';
import { ParticleBackground } from '../components/ParticleBackground';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#050b14' }}>
      <StatusBar barStyle="light-content" backgroundColor="#050b14" />
      
      {/* Sistema Global de Partículas Místicas */}
      <ParticleBackground />

      <Slot />
    </View>
  );
}
