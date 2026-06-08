import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface TurmasTabProps {
  turmas: any[];
  unassignedStudents: any[];
  loadingUnassigned: boolean;
  goldenQuestionText: string;
  setGoldenQuestionText: (text: string) => void;
  goldenQuestionTurmaId: string | null;
  setGoldenQuestionTurmaId: (id: string | null) => void;
  loadingGolden: boolean;
  goldenQuestionsList: any[];
  expandedQuestionId: string | null;
  setExpandedQuestionId: (id: string | null) => void;
  handleAssignTurma: (student: any) => void;
  handleSendGoldenQuestion: () => void;
  sounds: any;
  giftedHistory: any[];
  loadingGiftedHistory: boolean;
  giftedHistoryPage: number;
  giftedHistoryTotalPages: number;
  giftedHistoryDateFilter: string;
  fetchGiftedHistory: (page: number, date?: string) => Promise<void>;
}

const artifactNames: { [key: string]: { name: string; type: string; icon: string } } = {
  pocao_cura: { name: 'Poção de Cura', type: 'epic', icon: 'heart' },
  sussurros_sabios: { name: 'Sussurros Sábios', type: 'legendary', icon: 'message-square' },
  becker_alquimista: { name: 'Becker do Alquimista', type: 'legendary', icon: 'droplet' },
  olhar_monarca: { name: 'Olhar do Monarca', type: 'legendary', icon: 'eye' },
  elixir_dourado: { name: 'Elixir Dourado', type: 'epic', icon: 'zap' },
  relogio_tempo: { name: 'Relógio Ganha Tempo', type: 'epic', icon: 'clock' },
  anel_serpente: { name: 'Anel da Serpente', type: 'epic', icon: 'circle' },
  lagrima_fenix: { name: 'Lágrima da Fênix', type: 'epic', icon: 'wind' },
  bandeira_guerra: { name: 'Bandeira de Guerra', type: 'epic', icon: 'flag' },
  orbe_perspicacia: { name: 'Orbe de Perspicácia', type: 'epic', icon: 'globe' },
  chave_mestra: { name: 'Chave Mestra', type: 'epic', icon: 'key' },
  cetro_exilio: { name: 'Cetro do Exílio', type: 'epic', icon: 'shield' },
  sapatilhas_veloz: { name: 'Sapatilhas do Mundo Lento', type: 'magic', icon: 'feather' },
  varinha_pinheiro: { name: 'Varinha de Pinheiro', type: 'magic', icon: 'wand' },
  mao_midas: { name: 'Mão de Midas', type: 'legendary', icon: 'shuffle' },
  martelo_magico: { name: 'Martelo Mágico', type: 'magic', icon: 'tool' },
  pena_escriba: { name: 'Pena do Escriba', type: 'magic', icon: 'edit-3' },
  pergaminho_oraculo: { name: 'Pergaminho do Oráculo', type: 'magic', icon: 'eye' },
  poeira_estelar: { name: 'Poeira Estelar', type: 'magic', icon: 'sparkles' }
};

const getBadgeStyle = (type: string) => {
  if (type === 'legendary') {
    return {
      viewClass: 'bg-yellow-950/40 border border-yellow-500/60',
      textClass: 'text-yellow-400'
    };
  }
  if (type === 'epic') {
    return {
      viewClass: 'bg-purple-950/40 border border-purple-500/60',
      textClass: 'text-purple-400'
    };
  }
  return {
    viewClass: 'bg-cyan-950/40 border border-[#00f3ff]/60',
    textClass: 'text-[#00f3ff]'
  };
};

export const TurmasTab: React.FC<TurmasTabProps> = ({
  turmas,
  unassignedStudents,
  loadingUnassigned,
  goldenQuestionText,
  setGoldenQuestionText,
  goldenQuestionTurmaId,
  setGoldenQuestionTurmaId,
  loadingGolden,
  goldenQuestionsList,
  expandedQuestionId,
  setExpandedQuestionId,
  handleAssignTurma,
  handleSendGoldenQuestion,
  sounds,
  giftedHistory,
  loadingGiftedHistory,
  giftedHistoryPage,
  giftedHistoryTotalPages,
  giftedHistoryDateFilter,
  fetchGiftedHistory,
}) => {
  const [dateInput, setDateInput] = React.useState(giftedHistoryDateFilter);

  React.useEffect(() => {
    setDateInput(giftedHistoryDateFilter);
  }, [giftedHistoryDateFilter]);

  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">Minhas Turmas</Text>

      <Text className="text-white/50 text-xs mb-3 uppercase font-bold">Turmas Ativas:</Text>
      {turmas.length === 0 ? (
        <Text className="text-white/30 text-center text-sm">Nenhuma turma criada.</Text>
      ) : (
        turmas.map(t => (
          <View key={t.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-white font-bold text-base">{t.nome}</Text>
                <Text className="text-neonBlue/50 text-xs">{t.ano} · Code: {t.codigoInvocacao}</Text>
              </View>
              <View className="bg-neonBlue/10 px-3 py-1 border border-neonBlue/30 rounded-sm">
                <Text className="text-neonBlue font-bold text-[10px] uppercase">Unidade {t.unidade || 1}</Text>
              </View>
            </View>
          </View>
        ))
      )}

      <Text className="text-white/50 text-xs mb-3 mt-6 uppercase font-bold">Alunos sem Turma:</Text>
      {loadingUnassigned ? (
        <ActivityIndicator color="#00f3ff" size="small" />
      ) : unassignedStudents.length === 0 ? (
        <Text className="text-white/30 text-center text-sm">Nenhum aluno sem turma.</Text>
      ) : (
        unassignedStudents.map(s => (
          <View key={s.id} className="bg-black/50 border border-neonBlue/20 p-3 rounded-sm mb-2 flex-row justify-between items-center">
            <View className="flex-1 mr-2">
              <Text className="text-white font-bold">{s.nickname || s.nome}</Text>
              <Text className="text-white/50 text-xs">{s.nome} • Matrícula: {s.matricula}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => handleAssignTurma(s)}
              className="bg-neonBlue/10 px-3 py-1 border border-neonBlue/30 rounded-sm"
            >
              <Text className="text-neonBlue font-bold text-xs uppercase">Associar</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Pergunta Dourada */}
      <View className="mt-4 border-t border-neonBlue/20 pt-6">
        <Text className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-1">Pergunta Dourada</Text>
        <Text className="text-white/40 text-xs mb-4">Envie uma pergunta de feedback prioritária para os alunos. Sem XP, sem pressão — apenas feedback.</Text>
        
        <TextInput
          className="w-full bg-black/60 border border-yellow-500/40 text-white p-4 rounded-sm text-sm mb-4"
          placeholder="Ex: Qual conteúdo de Matemática você sentiu mais dificuldade esta semana?"
          placeholderTextColor="#eab30830"
          multiline
          numberOfLines={3}
          value={goldenQuestionText}
          onChangeText={setGoldenQuestionText}
        />

        <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Selecionar Turma Alvo</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {turmas.map((t: any) => (
            <TouchableOpacity
              key={t.id}
              className={`px-3 py-2 rounded-sm border ${goldenQuestionTurmaId === t.id ? 'bg-yellow-500/20 border-yellow-500' : 'bg-black/50 border-yellow-500/20'}`}
              onPress={() => { setGoldenQuestionTurmaId(t.id); sounds.playSelect(); }}
            >
              <Text className={`text-xs font-bold uppercase ${goldenQuestionTurmaId === t.id ? 'text-white' : 'text-yellow-500/60'}`}>
                {t.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className="w-full bg-yellow-500 border border-yellow-600 py-3 rounded-sm items-center mb-6"
          onPress={() => { sounds.playSelect(); handleSendGoldenQuestion(); }}
          disabled={loadingGolden}
        >
          {loadingGolden ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text className="text-black font-bold uppercase tracking-widest text-xs">Disparar Pergunta Dourada</Text>
          )}
        </TouchableOpacity>

        {/* Histórico de Perguntas Douradas */}
        <Text className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-3 border-t border-neonBlue/20 pt-6">Perguntas Douradas Ativas</Text>
        {goldenQuestionsList.length === 0 ? (
          <Text className="text-white/20 text-xs text-center italic py-4">Nenhuma pergunta dourada enviada ainda.</Text>
        ) : (
          goldenQuestionsList.map((q: any) => {
            const isExpanded = expandedQuestionId === q.id;
            return (
              <View key={q.id} className="bg-black/40 border border-yellow-500/20 p-4 rounded-sm mb-3">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-yellow-500 text-xs font-mono font-bold uppercase">Turma: {q.turmaNome}</Text>
                    <Text className="text-white font-bold text-sm mt-1">{q.enunciado}</Text>
                  </View>
                  <View className="items-end ml-2">
                    <Text className="text-white/40 text-[10px] font-mono">{new Date(q.createdAt).toLocaleDateString('pt-BR')}</Text>
                    <Text className="text-yellow-400/80 text-[10px] font-bold font-mono mt-1">{q.taxaResposta}% Respondido</Text>
                  </View>
                </View>

                {/* Barra de Progresso */}
                <View className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                  <View style={{ width: `${q.taxaResposta}%` }} className="h-full bg-yellow-500" />
                </View>

                {/* Botão de Expandir Respostas */}
                <TouchableOpacity
                  className="flex-row justify-between items-center bg-yellow-500/10 px-3 py-2 rounded-sm"
                  onPress={() => { sounds.playSelect(); setExpandedQuestionId(isExpanded ? null : q.id); }}
                >
                  <Text className="text-yellow-500 font-bold uppercase text-[10px] tracking-widest">
                    Ver Respostas ({q.respostasContadas}/{q.totalAlunos})
                  </Text>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#eab308" />
                </TouchableOpacity>

                {isExpanded && (
                  <View className="mt-3 border-t border-yellow-500/10 pt-3">
                    {q.respostas.length === 0 ? (
                      <Text className="text-white/30 text-xs text-center py-2">Nenhum aluno respondeu ainda.</Text>
                    ) : (
                      q.respostas.map((r: any) => (
                        <View key={r.id} className="bg-black/30 border border-white/5 p-3 rounded-sm mb-2">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-white font-bold text-[10px]">{r.alunoNome}</Text>
                            <Text className="text-white/40 text-[8px] font-mono">{r.alunoMatricula}</Text>
                          </View>
                          <Text className="text-white/70 text-xs mt-1 italic">"{r.resposta}"</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Histórico de Artefatos Concedidos */}
      <View className="mt-6 border-t border-neonBlue/20 pt-6">
        <View className="flex-row justify-between items-center mb-4 flex-wrap gap-2">
          <Text className="text-neonBlue text-sm font-bold uppercase tracking-widest flex-1">
            🎁 Histórico de Artefatos Concedidos
          </Text>
          {giftedHistoryDateFilter ? (
            <View className="bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/30 rounded-sm mr-1">
              <Text className="text-yellow-500 font-mono text-[8px] font-bold uppercase">
                Filtrado: {giftedHistoryDateFilter}
              </Text>
            </View>
          ) : null}
          <View className="bg-neonBlue/10 px-2.5 py-1 border border-neonBlue/30 rounded-sm">
            <Text className="text-neonBlue font-mono font-bold text-[10px]">
              Pág. {giftedHistoryPage}/{giftedHistoryTotalPages}
            </Text>
          </View>
        </View>

        {/* Filtro por Data */}
        <View className="mb-4 bg-black/30 border border-neonBlue/10 p-3 rounded-sm">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2">Filtro por Data (AAAA-MM-DD):</Text>
          <View className="flex-row items-center gap-2 mb-2 flex-wrap">
            <TextInput
              className="flex-1 bg-black/60 border border-neonBlue/30 text-white px-3 py-1.5 rounded-sm text-xs"
              placeholder="Ex: 2026-06-05"
              placeholderTextColor="#00f3ff20"
              value={dateInput}
              onChangeText={setDateInput}
              keyboardType="numeric"
            />
            <TouchableOpacity
              onPress={() => { sounds.playSelect(); fetchGiftedHistory(1, dateInput); }}
              className="bg-neonBlue/20 border border-neonBlue/40 px-3 py-2 rounded-sm"
            >
              <Text className="text-neonBlue font-bold text-xs uppercase">Filtrar</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-1.5 flex-wrap">
            <TouchableOpacity
              onPress={() => {
                sounds.playSelect();
                const today = getLocalDateString(0);
                setDateInput(today);
                fetchGiftedHistory(1, today);
              }}
              className={`px-2 py-1 rounded-sm border ${giftedHistoryDateFilter === getLocalDateString(0) ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
            >
              <Text className="text-white/70 text-[10px] font-bold">Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                sounds.playSelect();
                const yesterday = getLocalDateString(-1);
                setDateInput(yesterday);
                fetchGiftedHistory(1, yesterday);
              }}
              className={`px-2 py-1 rounded-sm border ${giftedHistoryDateFilter === getLocalDateString(-1) ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
            >
              <Text className="text-white/70 text-[10px] font-bold">Ontem</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                sounds.playSelect();
                setDateInput('');
                fetchGiftedHistory(1, '');
              }}
              className={`px-2 py-1 rounded-sm border ${!giftedHistoryDateFilter ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
            >
              <Text className="text-white/70 text-[10px] font-bold">Limpar</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {loadingGiftedHistory ? (
          <ActivityIndicator color="#00f3ff" size="small" className="py-4" />
        ) : giftedHistory.length === 0 ? (
          <Text className="text-white/20 text-xs text-center italic py-4">
            Nenhum artefato concedido nesta data/página.
          </Text>
        ) : (
          <>
            {giftedHistory.map((item: any) => {
              const artInfo = artifactNames[item.artifactId] || { name: item.artifactId, type: 'magic', icon: 'gift' };
              const badgeStyle = getBadgeStyle(artInfo.type);
              const studentName = item.student?.nickname || item.student?.nome || 'Caçador';
              const studentMatricula = item.student?.matricula || '';
              const dateFormatted = new Date(item.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <View key={item.id} className="bg-black/40 border border-neonBlue/10 p-3 rounded-sm mb-2 flex-row justify-between items-center">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center gap-1.5 mb-1 flex-wrap">
                      <Feather name={artInfo.icon as any} size={12} color="#00f3ff" />
                      <Text className="text-white font-bold text-xs">{artInfo.name}</Text>
                      <View className={`px-1.5 py-0.5 rounded-full ${badgeStyle.viewClass}`}>
                        <Text className={`text-[7px] font-bold uppercase tracking-widest font-mono ${badgeStyle.textClass}`}>
                          {artInfo.type}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-white/40 text-[9px] font-mono">
                      Para: {studentName} ({studentMatricula})
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-neonBlue/80 font-mono font-bold text-xs">
                      {item.quantidade}x
                    </Text>
                    <Text className="text-white/30 text-[8px] font-mono mt-0.5">
                      {dateFormatted}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Controles de Paginação */}
            {giftedHistoryTotalPages > 1 && (
              <View className="flex-row justify-between items-center mt-3 border-t border-neonBlue/10 pt-3">
                <TouchableOpacity
                  disabled={giftedHistoryPage <= 1}
                  onPress={() => {
                    sounds.playSelect();
                    fetchGiftedHistory(giftedHistoryPage - 1);
                  }}
                  className={`flex-row items-center px-3 py-1.5 border rounded-sm ${giftedHistoryPage <= 1 ? 'border-white/10 opacity-30' : 'border-neonBlue/40 bg-neonBlue/5'}`}
                >
                  <Feather name="chevron-left" size={14} color="#00f3ff" style={{ marginRight: 4 }} />
                  <Text className="text-neonBlue font-bold text-xs uppercase">Anterior</Text>
                </TouchableOpacity>
                
                <Text className="text-white/60 text-xs font-mono font-bold">
                  {giftedHistoryPage} de {giftedHistoryTotalPages}
                </Text>

                <TouchableOpacity
                  disabled={giftedHistoryPage >= giftedHistoryTotalPages}
                  onPress={() => {
                    sounds.playSelect();
                    fetchGiftedHistory(giftedHistoryPage + 1);
                  }}
                  className={`flex-row items-center px-3 py-1.5 border rounded-sm ${giftedHistoryPage >= giftedHistoryTotalPages ? 'border-white/10 opacity-30' : 'border-neonBlue/40 bg-neonBlue/5'}`}
                >
                  <Text className="text-neonBlue font-bold text-xs uppercase">Próximo</Text>
                  <Feather name="chevron-right" size={14} color="#00f3ff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};
