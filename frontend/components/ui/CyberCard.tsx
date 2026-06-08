import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface CyberCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  glowColor?: 'cyan' | 'yellow' | 'red' | 'green' | 'blue' | 'purple';
  className?: string;
  headerExtra?: React.ReactNode;
  loading?: boolean;
}

export function CyberCard({
  children,
  title,
  subtitle,
  glowColor = 'cyan',
  className = '',
  headerExtra,
  loading = false,
}: CyberCardProps) {
  // Glow style color schemes mapped to Solen standards
  const colors = {
    cyan: {
      border: 'border-neonBlue/50',
      text: 'text-neonBlue',
      bg: 'bg-[#0a1128]/95',
      spinner: '#00f3ff',
    },
    yellow: {
      border: 'border-yellow-500/50',
      text: 'text-yellow-500',
      bg: 'bg-[#141208]/95',
      spinner: '#eab308',
    },
    red: {
      border: 'border-red-500/50',
      text: 'text-red-500',
      bg: 'bg-[#1a0808]/95',
      spinner: '#ef4444',
    },
    green: {
      border: 'border-green-500/50',
      text: 'text-green-500',
      bg: 'bg-[#081a0e]/95',
      spinner: '#22c55e',
    },
    blue: {
      border: 'border-blue-500/50',
      text: 'text-blue-500',
      bg: 'bg-[#080f1a]/95',
      spinner: '#3b82f6',
    },
    purple: {
      border: 'border-purple-500/50',
      text: 'text-purple-500',
      bg: 'bg-[#12081a]/95',
      spinner: '#a855f7',
    },
  };

  const scheme = colors[glowColor] || colors.cyan;

  return (
    <View
      className={`border p-6 rounded-sm mb-6 ${scheme.bg} ${scheme.border} ${className}`}
      style={{
        shadowColor: scheme.spinner,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {(title || subtitle || headerExtra) && (
        <View className="flex-row justify-between items-start mb-4 border-b border-white/5 pb-3">
          <View className="flex-1 pr-2">
            {title && (
              <Text className={`text-base font-bold uppercase tracking-widest font-mono ${scheme.text}`}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text className="text-white/40 text-[10px] uppercase font-mono tracking-wider mt-0.5">
                {subtitle}
              </Text>
            )}
          </View>
          {headerExtra && <View>{headerExtra}</View>}
        </View>
      )}

      {loading ? (
        <View className="py-8 items-center justify-center">
          <ActivityIndicator size="small" color={scheme.spinner} />
          <Text className="text-white/40 text-[9px] font-mono mt-2 uppercase tracking-widest">
            Sincronizando Banco de Dados...
          </Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}
