import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSolenSounds } from '../../hooks/useSolenSounds';

interface CyberAccordionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  icon?: keyof typeof Feather.glyphMap;
  glowColor?: 'cyan' | 'yellow' | 'red' | 'green';
  className?: string;
}

export function CyberAccordion({
  title,
  subtitle,
  children,
  isExpanded,
  onToggle,
  icon = 'zap',
  glowColor = 'cyan',
  className = '',
}: CyberAccordionProps) {
  const sounds = useSolenSounds();

  const colors = {
    cyan: {
      borderSelected: 'border-neonBlue',
      borderUnselected: 'border-neonBlue/20',
      text: 'text-neonBlue',
    },
    yellow: {
      borderSelected: 'border-yellow-500',
      borderUnselected: 'border-yellow-500/20',
      text: 'text-yellow-500',
    },
    red: {
      borderSelected: 'border-red-500',
      borderUnselected: 'border-red-500/20',
      text: 'text-red-500',
    },
    green: {
      borderSelected: 'border-green-500',
      borderUnselected: 'border-green-500/20',
      text: 'text-green-500',
    },
  };

  const scheme = colors[glowColor] || colors.cyan;

  return (
    <View
      className={`bg-black/50 border rounded-sm mb-3 transition-all duration-200 ${
        isExpanded ? scheme.borderSelected : scheme.borderUnselected
      } ${className}`}
    >
      <TouchableOpacity
        className="flex-row justify-between items-center p-4"
        onPress={() => {
          sounds.playSelect();
          onToggle();
        }}
        activeOpacity={0.7}
      >
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Feather name={icon} size={13} color={isExpanded ? '#fff' : '#00f3ff'} />
            <Text className="text-white font-bold text-sm uppercase tracking-wider font-mono">
              {title}
            </Text>
          </View>
          {subtitle && (
            <Text className="text-white/40 text-[10px] uppercase font-mono tracking-wider mt-1">
              {subtitle}
            </Text>
          )}
        </View>
        <View className="flex-row items-center ml-2">
          <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color="#00f3ff" />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="p-4 border-t border-white/5 bg-black/25">
          {children}
        </View>
      )}
    </View>
  );
}
