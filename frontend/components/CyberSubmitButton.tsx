import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, Animated } from 'react-native';
import { useSolenSounds } from '../hooks/useSolenSounds';

interface CyberSubmitButtonProps {
  title: string;
  loadingTitle?: string;
  loading: boolean;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
  variant?: 'primary' | 'danger';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function CyberSubmitButton({
  title,
  loadingTitle = 'Processando...',
  loading,
  onPress,
  disabled,
  className,
  textClassName = 'text-lg',
  variant = 'primary',
}: CyberSubmitButtonProps) {
  const sounds = useSolenSounds();
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      sounds.playLogin(); // Toca o som de submissão (mesmo do login)
      loadingProgress.setValue(0);
      Animated.timing(loadingProgress, {
        toValue: 0.9, // Preenche artificialmente até 90%
        duration: 3500, 
        useNativeDriver: false,
      }).start();
    } else {
      sounds.stopLogin(); // Para o som
      
      // Se parou de carregar, vai pra 100% rápido e depois volta pra 0 sem animar
      Animated.timing(loadingProgress, {
        toValue: 1.0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => {
        loadingProgress.setValue(0);
      });
    }

    return () => {
      sounds.stopLogin(); // Garante que o som pare se o botão for desmontado antes de concluir
    };
  }, [loading]);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1.0,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const isDanger = variant === 'danger';
  const bgColor = isDanger ? 'bg-red-900/20 border-red-500' : 'bg-neonBlue/20 border-neonBlue';
  const barColor = isDanger ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 243, 255, 0.35)';
  const textColor = isDanger ? 'text-red-500' : 'text-neonBlue';
  const loadingTextColor = isDanger ? 'text-red-400' : 'text-neonBlue';
  const spinnerColor = isDanger ? '#ef4444' : '#00f3ff';

  return (
    <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled || loading}
        className={`w-full py-4 border rounded-sm items-center justify-center flex-row relative overflow-hidden ${bgColor} ${className || ''}`}
      >
        {/* Barra de Progresso */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: loadingProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: barColor,
          }}
        />
        
        {loading ? (
          <View className="flex-row items-center justify-center gap-3 z-10">
            <ActivityIndicator size="small" color={spinnerColor} />
            <Text className={`font-bold text-xs uppercase tracking-[0.2em] ${loadingTextColor}`}>
              {loadingTitle}
            </Text>
          </View>
        ) : (
          <Text className={`font-bold uppercase tracking-widest z-10 ${textClassName} ${textColor}`}>
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
