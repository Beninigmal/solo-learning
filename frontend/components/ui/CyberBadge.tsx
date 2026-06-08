import React from 'react';
import { View, Text } from 'react-native';

interface CyberBadgeProps {
  label: string;
  variant?: 'cyan' | 'yellow' | 'red' | 'green' | 'blue' | 'purple' | 'gray';
  outline?: boolean;
  className?: string;
}

export function CyberBadge({
  label,
  variant = 'cyan',
  outline = false,
  className = '',
}: CyberBadgeProps) {
  // Glow style color schemes mapped to Solen standards
  const colors = {
    cyan: {
      bg: 'bg-neonBlue/10',
      border: 'border-neonBlue/40',
      text: 'text-neonBlue',
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/40',
      text: 'text-yellow-500',
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/40',
      text: 'text-red-500',
    },
    green: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/40',
      text: 'text-green-500',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/40',
      text: 'text-blue-500',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/40',
      text: 'text-purple-500',
    },
    gray: {
      bg: 'bg-white/5',
      border: 'border-white/10',
      text: 'text-white/40',
    },
  };

  const scheme = colors[variant] || colors.cyan;
  const borderStyle = outline ? 'border' : 'border border-transparent';

  return (
    <View
      className={`px-2 py-0.5 rounded-sm self-start items-center justify-center flex-row ${
        scheme.bg
      } ${scheme.border} ${borderStyle} ${className}`}
    >
      <Text className={`text-[8px] font-bold font-mono uppercase tracking-widest ${scheme.text}`}>
        {label}
      </Text>
    </View>
  );
}
