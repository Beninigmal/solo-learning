import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface HistoricoTabProps {
  loadingHistory: boolean;
  history: any[];
  expandedHistoryQuestId: string | null;
  setExpandedHistoryQuestId: (id: string | null) => void;
  sounds: any;
}

export const HistoricoTab: React.FC<HistoricoTabProps> = ({
  loadingHistory,
  history,
  expandedHistoryQuestId,
  setExpandedHistoryQuestId,
  sounds,
}) => {
  return (
    <View className="flex-1">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-4">Histórico de Missões</Text>
      
      {loadingHistory ? (
        <ActivityIndicator color="#00f3ff" size="large" className="mt-10" />
      ) : history.length === 0 ? (
        <Text className="text-white/30 text-center mt-10">Nenhuma missão forjada ainda.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="gap-4">
            {history.map(item => (
              <View key={item.id} className="bg-[#0a1128]/90 border border-neonBlue/30 p-4 rounded-sm">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white font-bold">Semana {item.semana}</Text>
                  <Text className="text-neonBlue text-xs uppercase font-bold">{item.turmaAlvo?.nome}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-white/70 text-sm">Tema: {item.tema}</Text>
                  <Text className="text-neonBlue/70 text-xs uppercase font-bold">{item.nivel}</Text>
                </View>
                <Text className="text-white/90 text-sm mb-4 mt-2">"{item.enunciado}"</Text>
                
                {/* Custom Bar Chart for Success Rate */}
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-white/50 text-xs uppercase">Taxa de Sucesso</Text>
                  <Text className="text-neonBlue font-bold text-xs">{item.successRate}%</Text>
                </View>
                <View className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-neonBlue/10">
                  <View 
                    className="bg-neonBlue h-full" 
                    style={{ width: `${item.successRate}%` }}
                  />
                </View>
                <Text className="text-white/30 text-[10px] mt-1 mb-3">Total de entregas: {item.totalDeliveries}</Text>
                
                {/* Botão de Expandir Entregas/Auditoria */}
                <TouchableOpacity
                  className="flex-row justify-between items-center bg-neonBlue/10 px-3 py-2 rounded-sm border border-neonBlue/20"
                  onPress={() => { sounds.playSelect(); setExpandedHistoryQuestId(expandedHistoryQuestId === item.id ? null : item.id); }}
                >
                  <Text className="text-neonBlue font-bold uppercase text-[9px] tracking-widest font-mono">
                    Ver Auditoria / Respostas ({item.deliveries?.filter((d: any) => d.status === 'COMPLETED').length || 0} respondido)
                  </Text>
                  <Feather name={expandedHistoryQuestId === item.id ? "chevron-up" : "chevron-down"} size={12} color="#00f3ff" />
                </TouchableOpacity>

                {expandedHistoryQuestId === item.id && (
                  <View className="mt-3 border-t border-neonBlue/20 pt-3 gap-2">
                    {!item.deliveries || item.deliveries.length === 0 ? (
                      <Text className="text-white/30 text-xs text-center py-2 font-mono">Nenhuma entrega registrada para esta missão.</Text>
                    ) : (
                      item.deliveries.map((d: any) => (
                        <View key={d.id} className="bg-black/45 border border-white/5 p-3 rounded-sm">
                          <View className="flex-row justify-between items-center mb-1 pb-1 border-b border-white/5">
                            <Text className="text-white font-bold text-[10px] font-mono">
                              👤 {d.user?.nome || 'Anônimo'} ({d.user?.nickname || 'sem nickname'})
                            </Text>
                            <Text className="text-white/40 text-[8px] font-mono">{d.user?.matricula}</Text>
                          </View>
                          <View className="mt-1.5">
                            <Text className="text-white/40 text-[9px] font-bold uppercase font-mono mb-1">Resposta do Aluno:</Text>
                            {!d.studentAnswer ? (
                              <Text className="text-white/30 text-[10px] italic font-mono">
                                {d.studentImage ? '📷 Resposta em imagem/cálculo (sem texto)' : '— Sem texto registrado (entrega anterior à auditoria)'}
                              </Text>
                            ) : (
                              <Text className="text-white text-xs font-serif leading-5 italic">
                                "{d.studentAnswer}"
                              </Text>
                            )}
                          </View>
                          {d.studentImage && (
                            <Text className="text-[9px] text-neonBlue mt-1 font-mono">📷 Contém imagem de cálculo</Text>
                          )}
                          <View className="flex-row justify-between items-center mt-2.5 pt-1 border-t border-white/5">
                            <Text className="text-[9px] font-bold font-mono" style={{ color: d.isCorrect === true ? '#22c55e' : '#ef4444' }}>
                              {d.status === 'COMPLETED' ? (d.isCorrect ? '✅ CORRETO' : '❌ INCORRETO') : (d.isCorrect === false ? '❌ INCORRETO' : `⏳ ${d.status}`)}
                            </Text>
                            <Text className="text-white/40 text-[9px] font-mono">Tentativas/Erros: {d.erros}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};
