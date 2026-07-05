import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface YearPickerProps {
  value: string;
  onChange: (year: string) => void;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
}

export function YearPicker({ value, onChange, minYear = 2020, maxYear = 2035, placeholder = 'Ano' }: YearPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const years = [];
  for (let i = minYear; i <= maxYear; i++) {
    years.push(i.toString());
  }

  const handleSelect = (year: string) => {
    onChange(year);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        className="w-24 bg-black/50 border border-neonBlue/40 px-3 py-2 rounded-sm flex-row justify-between items-center"
        onPress={() => setModalVisible(true)}
      >
        <Text className={`text-xs ${value ? 'text-white' : 'text-[#00f3ff40]'}`}>
          {value || placeholder}
        </Text>
        <Feather name="calendar" size={12} color={value ? '#00f3ff' : '#00f3ff40'} />
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
          <View className="bg-[#0a1128] border border-neonBlue/50 rounded-sm w-64 max-h-80 shadow-lg shadow-neonBlue/20">
            <View className="p-4 border-b border-neonBlue/20 flex-row justify-between items-center">
              <Text className="text-neonBlue font-bold uppercase tracking-widest text-sm">Selecione o Ano</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={16} color="#00f3ff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={true} className="p-2">
              <View className="flex-row flex-wrap justify-between">
                {years.map(year => {
                  const isSelected = year === value;
                  return (
                    <TouchableOpacity
                      key={year}
                      onPress={() => handleSelect(year)}
                      className={`w-[48%] mb-2 py-3 rounded-sm items-center border ${
                        isSelected 
                          ? 'bg-neonBlue/20 border-neonBlue' 
                          : 'bg-black/50 border-neonBlue/10'
                      }`}
                    >
                      <Text className={`font-mono text-sm ${isSelected ? 'text-neonBlue font-bold' : 'text-white/70'}`}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
