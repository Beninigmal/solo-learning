import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';

export function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get('/logs');
        setLogs(res.data);
      } catch (e) {
        console.error('Erro ao buscar logs', e);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-20">
        <ActivityIndicator size="large" color="#00f3ff" />
        <Text className="text-neonBlue mt-4 font-mono uppercase tracking-widest text-xs animate-pulse">
          Sincronizando Sistema de Auditoria...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 pt-2">
      <View className="mb-6 flex-row items-center">
        <View className="w-2 h-8 bg-neonBlue mr-3" />
        <Text className="text-white text-lg font-bold uppercase tracking-[0.2em]">Registro de Ações</Text>
      </View>

      {logs.length === 0 ? (
        <View className="flex-1 justify-center items-center py-10">
          <Text className="text-neonBlue/50 font-mono text-sm uppercase">Nenhum log encontrado.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          {logs.map(log => (
            <View key={log.id} className="bg-black/40 border border-neonBlue/20 p-4 rounded-sm flex-row items-start">
              <View className="flex-1">
                <Text className="text-white font-bold text-sm mb-1">{log.action}</Text>
                {log.details && (
                  <Text className="text-white/70 text-xs font-mono mb-2">{log.details}</Text>
                )}
                {log.user && (
                  <Text className="text-neonBlue/70 text-[10px] font-mono uppercase mt-1">
                    Operador: {log.user.nome} ({log.user.role}) - Matrícula: {log.user.matricula}
                  </Text>
                )}
                <Text className="text-white/40 text-[9px] mt-1 text-right">
                  {new Date(log.createdAt).toLocaleString('pt-BR')}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
