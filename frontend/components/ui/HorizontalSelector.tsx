import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSolenSounds } from '../../hooks/useSolenSounds';

interface HorizontalSelectorProps {
  items: { id: string | number; name: string }[];
  selectedId: string | number;
  onSelect: (id: any) => void;
  glowColor?: 'cyan' | 'yellow' | 'red' | 'green';
  className?: string;
}

export function HorizontalSelector({
  items,
  selectedId,
  onSelect,
  glowColor = 'cyan',
  className = '',
}: HorizontalSelectorProps) {
  const sounds = useSolenSounds();

  const colors = {
    cyan: {
      selectedBg: 'bg-neonBlue/20 border-neonBlue',
      unselectedBg: 'bg-black/50 border-neonBlue/20',
      selectedText: 'text-white',
      unselectedText: 'text-neonBlue/50',
    },
    yellow: {
      selectedBg: 'bg-yellow-500/20 border-yellow-500',
      unselectedBg: 'bg-black/50 border-yellow-500/20',
      selectedText: 'text-white',
      unselectedText: 'text-yellow-500/50',
    },
    red: {
      selectedBg: 'bg-red-500/20 border-red-500',
      unselectedBg: 'bg-black/50 border-red-500/20',
      selectedText: 'text-white',
      unselectedText: 'text-red-500/50',
    },
    green: {
      selectedBg: 'bg-green-500/20 border-green-500',
      unselectedBg: 'bg-black/50 border-green-500/20',
      selectedText: 'text-white',
      unselectedText: 'text-green-500/50',
    },
  };

  const scheme = colors[glowColor] || colors.cyan;

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={`max-h-14 mb-4 ${className}`}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row gap-2 py-1">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              className={`px-4 py-2 border rounded-sm transition-all duration-150 ${
                isSelected ? scheme.selectedBg : scheme.unselectedBg
              }`}
              onPress={() => {
                sounds.playSelect();
                onSelect(item.id);
              }}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-bold uppercase tracking-wider font-mono ${
                  isSelected ? scheme.selectedText : scheme.unselectedText
                }`}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
