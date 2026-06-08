import React from 'react';
import { View, Text, Modal, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ArtifactCard } from '../ArtifactCard';

interface RankUpModalProps {
  visible: boolean;
  onClose: () => void;
  scaleAnim: RNAnimated.Value;
  message: string;
  artifact: any | null;
}

export function RankUpModal({
  visible,
  onClose,
  scaleAnim,
  message,
  artifact
}: RankUpModalProps) {
  return (
    <Modal animationType="fade" transparent={true} visible={visible}>
      <View className="flex-1 bg-black/90 justify-center items-center p-6">
        <RNAnimated.View
          style={{ transform: [{ scale: scaleAnim }] }}
          className="items-center bg-[#0a1128] border-2 border-neonBlue/50 p-8 rounded-sm"
        >
          <Feather name="chevrons-up" size={80} color="#00f3ff" />
          <Text className="text-neonBlue text-3xl font-bold uppercase tracking-[0.2em] mt-4 mb-2 text-center">Rank Up!</Text>
          <Text className="text-white text-lg font-mono mb-6 text-center">{message}</Text>
          
          {artifact && (
            <View className="mb-8 items-center w-full">
              <Text className={`text-xs font-bold uppercase mb-4 ${artifact.type === 'epic' ? 'text-yellow-400' : 'text-blue-400'}`}>
                {artifact.type === 'epic' ? 'Artefato Épico' : 'Artefato Mágico'} Obtido
              </Text>
              <ArtifactCard artifact={artifact} size="normal" animated={true} />
            </View>
          )}

          {!artifact && <View className="h-4" />}
          
          <TouchableOpacity 
            onPress={onClose}
            className="border border-neonBlue bg-neonBlue/20 px-8 py-3 rounded-sm w-full items-center"
          >
            <Text className="text-neonBlue font-bold uppercase tracking-widest">Continuar</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}
