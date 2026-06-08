import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface BauTabProps {
  loadingBaú: boolean;
  wrongAnswers: any[];
  handleOpenBaúQuest: (item: any) => void;
  sounds: any;
}

export function BauTab({
  loadingBaú,
  wrongAnswers,
  handleOpenBaúQuest,
  sounds
}: BauTabProps) {
  return (
    <View className="flex-1">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-4">Baú de Quests Perdidas</Text>
      <Text className="text-white/50 text-sm mb-6">Refaça as perguntas que você errou para recuperar 10% do XP e ganhar a insígnia de Persistência.</Text>

      {loadingBaú ? (
        <ActivityIndicator color="#00f3ff" size="large" className="mt-10" />
      ) : wrongAnswers.length === 0 ? (
        <View className="items-center mt-10">
          <Feather name="shield" size={48} color="#00f3ff20" />
          <Text className="text-white/30 text-center mt-4">Seu baú está vazio. Continue assim!</Text>
        </View>
      ) : (
        <View className="gap-4">
          {wrongAnswers.map(item => (
            <TouchableOpacity 
              key={item.id} 
              className="bg-[#0a1128]/90 border border-red-500/30 p-4 rounded-sm"
              onPress={() => { sounds.playSelect(); handleOpenBaúQuest(item); }}
            >
              <Text className="text-white/70 text-sm mb-2 leading-5">{item.quest?.enunciado}</Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-white/30 text-[10px]">
                  Tentativas: {item.tentativas} · Vale:{' '}
                  {item.quest?.nivel === 'BOSS' || item.quest?.nivel === 'MINIBOSS'
                    ? (item.quest?.xp || 300)
                    : Math.max(Math.round((item.quest?.xp || 100) * Math.pow(0.75, item.tentativas || 0)), 25)}{' '}
                  XP
                </Text>
                <Text className="text-neonBlue font-bold text-xs uppercase">Resolver</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
