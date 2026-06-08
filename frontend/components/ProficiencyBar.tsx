import React from 'react';
import { View, Text } from 'react-native';

interface SubjectProficiency {
  subject: string;
  xp: number;
  color: string;
}

interface ProficiencyBarProps {
  data: SubjectProficiency[];
}

export function ProficiencyBar({ data }: ProficiencyBarProps) {
  const totalXp = data.reduce((acc, curr) => acc + curr.xp, 0);

  if (totalXp === 0) {
    return (
      <View className="w-full mt-4">
        <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Proficiência por Matéria</Text>
        <View className="w-full h-4 bg-white/5 rounded-sm border border-white/10 items-center justify-center">
          <Text className="text-white/30 text-[10px] uppercase">Nenhum dado de batalha</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="w-full mt-4">
      <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Proficiência por Matéria</Text>
      
      {/* Barra colorida */}
      <View className="w-full h-4 bg-white/10 rounded-sm overflow-hidden flex-row border border-white/20">
        {data.map((item, index) => {
          const percentage = (item.xp / totalXp) * 100;
          return (
            <View 
              key={index}
              style={{ width: `${percentage}%`, backgroundColor: item.color }}
              className="h-full border-r border-black/30"
            />
          );
        })}
      </View>

      {/* Legendas */}
      <View className="flex-row flex-wrap mt-3 gap-3">
        {data.map((item, index) => (
          <View key={index} className="flex-row items-center gap-1">
            <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <Text className="text-white/70 text-[10px] uppercase">{item.subject} ({item.xp} XP)</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
