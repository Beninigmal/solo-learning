import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Option {
  label: string;
  value: string;
}

interface SelectPickerProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  title?: string;
}

export function SelectPicker({ value, onChange, options, placeholder = 'Selecione', title = 'Selecione uma Opção' }: SelectPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(o => o.value === value);

  const handleSelect = (val: string) => {
    onChange(val);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        className="flex-1 bg-black/50 border border-neonBlue/40 px-3 py-2 rounded-sm flex-row justify-between items-center"
        onPress={() => setModalVisible(true)}
      >
        <Text className={`text-xs ${selectedOption ? 'text-white' : 'text-[#00f3ff40]'}`} numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={12} color={selectedOption ? '#00f3ff' : '#00f3ff40'} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/80 justify-center items-center"
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View className="bg-[#0a1128] border border-neonBlue/50 rounded-sm w-72 max-h-96 shadow-lg shadow-neonBlue/20">
            <View className="p-4 border-b border-neonBlue/20 flex-row justify-between items-center">
              <Text className="text-neonBlue font-bold uppercase tracking-widest text-sm">{title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={16} color="#00f3ff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={true}>
              {options.length === 0 ? (
                <Text className="text-white/40 text-center py-6 text-xs">Nenhuma opção disponível.</Text>
              ) : (
                options.map(option => {
                  const isSelected = option.value === value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleSelect(option.value)}
                      className={`px-4 py-3 border-b border-white/5 flex-row items-center justify-between ${
                        isSelected ? 'bg-neonBlue/10' : ''
                      }`}
                    >
                      <Text className={`text-sm ${isSelected ? 'text-neonBlue font-bold' : 'text-white/80'}`}>
                        {option.label}
                      </Text>
                      {isSelected && <Feather name="check" size={14} color="#00f3ff" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              onPress={() => handleSelect('')}
              className="p-3 border-t border-red-500/30 items-center bg-red-900/10"
            >
              <Text className="text-red-400 text-xs uppercase font-bold tracking-widest">Limpar Seleção</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
