import { View, Text, TouchableOpacity } from 'react-native';

interface QuestCardProps {
  title: string;
  xp: number;
  tema: string;
  onPress?: () => void;
}

export function QuestCard({ title, xp, tema, onPress }: QuestCardProps) {
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      className="bg-darkGray border border-neonBlue rounded-xl p-4 mb-4 shadow-lg shadow-neonBlue/20"
    >
      <Text className="text-neonBlue text-xs font-bold uppercase mb-1 tracking-widest">{tema}</Text>
      <Text className="text-white text-lg font-bold mb-2">{title}</Text>
      <View className="flex-row items-center mt-2">
        <View className="bg-neonBlue/20 px-3 py-1 rounded-full border border-neonBlue/50">
          <Text className="text-neonBlue font-bold">{xp} XP</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
