import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CyberInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  containerClassName?: string;
}

export function CyberInput({
  label,
  error,
  icon,
  containerClassName = '',
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
  editable = true,
  ...rest
}: CyberInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Determine styles dynamically based on focus and error states
  const borderStyle = error
    ? 'border-red-500 bg-red-950/10'
    : isFocused
    ? 'border-neonBlue bg-black/60 shadow-lg'
    : 'border-neonBlue/40 bg-black/40';

  const labelColor = error
    ? 'text-red-400'
    : isFocused
    ? 'text-neonBlue font-bold'
    : 'text-neonBlue/60';

  return (
    <View className={`w-full mb-4 ${containerClassName}`}>
      {label && (
        <Text className={`text-[10px] uppercase font-mono tracking-widest mb-1.5 ${labelColor}`}>
          {label}
        </Text>
      )}

      <View
        className={`flex-row items-center border rounded-sm px-3.5 py-3.5 relative overflow-hidden transition-all duration-200 ${borderStyle} ${
          !editable ? 'opacity-50' : ''
        }`}
      >
        {icon && (
          <View className="mr-2.5">
            <Feather
              name={icon}
              size={15}
              color={error ? '#ef4444' : isFocused ? '#00f3ff' : 'rgba(0, 243, 255, 0.4)'}
            />
          </View>
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(0, 243, 255, 0.25)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          keyboardAppearance="dark"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 text-white text-sm font-mono text-center"
          style={{
            ...Platform.select({
              web: { outlineStyle: 'none' } as any,
            }),
          }}
          {...rest}
        />
      </View>

      {error && (
        <Text className="text-red-500 font-mono text-[9px] uppercase tracking-wider mt-1 ml-0.5">
          ⚠️ {error}
        </Text>
      )}
    </View>
  );
}
