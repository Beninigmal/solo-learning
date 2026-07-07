import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DoomFireParticles } from './DoomFireParticles';
import { ThreeParticles } from './ThreeParticles';

interface AlertButton {
  text: string;
  onPress?: () => void;
}

interface SystemAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'BOSS';
  onClose: () => void;
  buttons?: AlertButton[];
}

export function SystemAlert({ visible, title, message, type = 'info', onClose, buttons }: SystemAlertProps) {
  const getColor = () => {
    switch (type) {
      case 'success': return '#4ade80'; // text-green-400
      case 'error': return '#ef4444'; // text-red-500
      case 'warning': return '#eab308'; // text-yellow-500
      case 'BOSS': return '#ff0055'; // Vermelho intenso/Rosa choque
      default: return '#00f3ff'; // text-neonBlue
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return 'border-green-500/50';
      case 'error': return 'border-red-500/50';
      case 'warning': return 'border-yellow-500/50';
      case 'BOSS': return 'border-red-600';
      default: return 'border-neonBlue/50';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'alert-octagon';
      case 'warning': return 'alert-triangle';
      case 'BOSS': return 'zap'; // Ícone de raio para o chefe
      default: return 'info';
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-center items-center p-6 relative">
        {type === 'BOSS' && visible && <DoomFireParticles />}
        {type === 'success' && visible && <ThreeParticles />}
        <View 
          className={`w-full max-w-md ${type === 'BOSS' ? 'bg-[#0a1128]/80' : 'bg-[#0a1128]/95'} rounded-sm border-2 ${getBorderColor()} p-6 items-center relative overflow-hidden`}
          style={{
            shadowColor: getColor(),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 15,
            elevation: 15,
            maxWidth: 480,
            width: '100%'
          }}
        >
          <View className="flex-row items-center gap-3 mb-4 w-full justify-center relative z-10">
            <Feather name={getIcon() as any} size={24} color={getColor()} />
            <Text className="text-xl font-bold uppercase tracking-widest" style={{ color: getColor() }}>
              {title}
            </Text>
          </View>
          
          <Text className="text-white text-base text-center mb-6 font-serif leading-6 relative z-10">
            {message}
          </Text>
          
          <View className="w-full relative z-10">
            {buttons ? (
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {buttons.map((btn, index) => (
                    <TouchableOpacity 
                      key={index}
                      className="border py-3 rounded-sm items-center w-full"
                      style={{ borderColor: getColor(), backgroundColor: `${getColor()}20` }}
                      onPress={() => {
                        btn.onPress?.();
                        onClose();
                      }}
                    >
                      <Text className="font-bold uppercase tracking-wider text-sm" style={{ color: getColor() }}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TouchableOpacity 
                className="border px-6 py-2 rounded-sm self-center"
                style={{ borderColor: getColor(), backgroundColor: `${getColor()}20` }}
                onPress={onClose}
              >
                <Text className="font-bold uppercase tracking-wider" style={{ color: getColor() }}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
