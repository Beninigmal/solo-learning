import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../services/api';

interface Message {
  id: string;
  sender: 'user' | 'ordinator';
  text: string;
}

interface OrdinatorTabProps {
  onDataChanged?: () => void;
}

export function OrdinatorTab({ onDataChanged }: OrdinatorTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', sender: 'ordinator', text: 'Saudações, Arquiteto. Eu sou o Ordinator, seu Assistente Administrativo. Como posso auxiliar no planejamento da instituição hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
        multiple: false
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLoading(true);
        const response = await fetch(file.uri);
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
            const uploadRes = await api.post('/ordinator/upload', {
              filename: file.name,
              base64: base64data
            });
            setInput(prev => prev + (prev ? '\n\n' : '') + uploadRes.data.text);
          } catch (e: any) {
            setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ordinator', text: 'Erro ao processar anexo: ' + e.message }]);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.log('Error picking document', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await api.post('/ordinator/chat', { message: userMsg, history });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ordinator', text: response.data.reply }]);
      setHistory(response.data.newHistory || []);

      if (response.data.action === 'TRIGGER_MONARCH') {
        const shift = response.data.actionData?.shift || 'MATUTINO';
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ordinator', text: `Iniciando o Monarch Engine para o turno ${shift}... (Por favor, aguarde)` }]);
        setLoading(true);
        try {
          await api.post('/quests/institution/timetable/batch-generate', { shift });
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ordinator', text: `Monarch Engine finalizou a geração da grade para o turno ${shift} com sucesso! Todas as restrições foram aplicadas e o dashboard foi atualizado.` }]);
          if (onDataChanged) onDataChanged();
        } catch(e: any) {
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ordinator', text: 'Ocorreu um erro ao executar o Monarch Engine: ' + (e.response?.data?.error || e.message) }]);
        }
      } else if (response.data.action === 'REFRESH_TIMETABLE') {
        if (onDataChanged) onDataChanged();
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ordinator', text: 'Houve um distúrbio na conexão. Não pude processar seu pedido.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black/40 border border-neonBlue/20 rounded-sm p-4 h-[600px]">
      <View className="flex-row items-center gap-3 border-b border-neonBlue/20 pb-4 mb-4">
        <Feather name="cpu" size={24} color="#00f3ff" />
        <View>
          <Text className="text-neonBlue text-lg font-bold uppercase tracking-widest font-mono">Ordinator</Text>
          <Text className="text-white/50 text-[10px] uppercase tracking-widest font-mono">Assistente Administrativo de IA</Text>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 mb-4"
        showsVerticalScrollIndicator={true}
      >
        {messages.map(m => (
          <View key={m.id} className={`mb-4 w-5/6 ${m.sender === 'user' ? 'self-end' : 'self-start'}`}>
            <View className={`p-3 rounded-sm border ${m.sender === 'user' ? 'bg-neonBlue/10 border-neonBlue/30' : 'bg-[#0a1128]/80 border-neonBlue/50'}`}>
              <Text className={`font-mono text-xs ${m.sender === 'user' ? 'text-white' : 'text-neonBlue'}`}>
                {m.text}
              </Text>
            </View>
            <Text className={`text-[8px] text-white/30 font-mono mt-1 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
              {m.sender === 'user' ? 'Você' : 'Ordinator'}
            </Text>
          </View>
        ))}
        {loading && (
          <View className="self-start w-5/6 mb-4">
            <View className="p-3 rounded-sm border bg-[#0a1128]/80 border-neonBlue/50 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#00f3ff" />
              <Text className="text-neonBlue font-mono text-xs">Processando...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="flex-row gap-2 items-center">
        <TouchableOpacity
          onPress={handleAttach}
          disabled={loading}
          className="bg-black/60 border border-neonBlue/30 p-3 rounded-sm items-center justify-center"
        >
          <Feather name="paperclip" size={18} color="#00f3ff" />
        </TouchableOpacity>
        <TextInput
          className="flex-1 bg-black/60 border border-neonBlue/30 text-white p-3 rounded-sm font-mono text-xs max-h-32"
          placeholder="Peça relatórios, copie tabelas de professores..."
          placeholderTextColor="#00f3ff40"
          value={input}
          onChangeText={setInput}
          multiline={true}
          editable={!loading}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !input.trim()}
          className={`bg-neonBlue/20 border border-neonBlue p-3 rounded-sm items-center justify-center ${(!input.trim() || loading) ? 'opacity-50' : ''}`}
        >
          <Feather name="send" size={18} color="#00f3ff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
