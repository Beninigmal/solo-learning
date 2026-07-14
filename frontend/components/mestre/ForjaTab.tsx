import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';

interface ForjaTabProps {
  turmas: any[];
  disciplinas: any[];
  forjaTurmaId: string | null;
  setForjaTurmaId: (id: string | null) => void;
  forjaDisciplinaId: string | null;
  setForjaDisciplinaId: (id: string | null) => void;
  complexidade: string;
  setComplexidade: (lvl: string) => void;
  tipoQuest: string;
  setTipoQuest: (type: string) => void;
  setExigeCalculo: (exige: boolean) => void;
  tema: string;
  setTema: (tema: string) => void;
  forjando: boolean;
  handleForjarQuest: () => void;
  pendingBatches: any[];
  loadingPending: boolean;
  fetchPendingQuests: () => void;
  editingQuestId: string | null;
  setEditingQuestId: (id: string | null) => void;
  editingEnunciado: string;
  setEditingEnunciado: (text: string) => void;
  refiningQuestId: string | null;
  setRefiningQuestId: (id: string | null) => void;
  sharpenPrompt: string;
  setSharpenPrompt: (text: string) => void;
  loadingActionId: string | null;
  handleRegenerateQuest: (id: string) => void;
  handleSaveManualQuest: (id: string) => void;
  handleRefineQuest: (id: string) => void;
  handleApproveBatch: (batchId: string) => void;
  duracaoDiasBoss: string;
  setDuracaoDiasBoss: (days: string) => void;
  loadingBoss: boolean;
  handleInvocacaoRapidaBOSS: () => void;
  sounds: any;
  currentUser?: any;
}

export const ForjaTab: React.FC<ForjaTabProps> = ({
  turmas,
  disciplinas,
  forjaTurmaId,
  setForjaTurmaId,
  forjaDisciplinaId,
  setForjaDisciplinaId,
  complexidade,
  setComplexidade,
  tipoQuest,
  setTipoQuest,
  setExigeCalculo,
  tema,
  setTema,
  forjando,
  handleForjarQuest,
  pendingBatches,
  loadingPending,
  fetchPendingQuests,
  editingQuestId,
  setEditingQuestId,
  editingEnunciado,
  setEditingEnunciado,
  refiningQuestId,
  setRefiningQuestId,
  sharpenPrompt,
  setSharpenPrompt,
  loadingActionId,
  handleRegenerateQuest,
  handleSaveManualQuest,
  handleRefineQuest,
  handleApproveBatch,
  duracaoDiasBoss,
  setDuracaoDiasBoss,
  loadingBoss,
  handleInvocacaoRapidaBOSS,
  sounds,
  currentUser,
}) => {
  const instTipo = currentUser?.institution?.tipo || 'MUNICIPAL';
  const showDifficulty = false;

  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-2">Forjar Missão (IA)</Text>
      <Text className="text-white/30 text-xs mb-6 font-mono">📅 {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>

      <Text className="text-white/50 text-xs mb-2 uppercase font-bold">Selecionar Turma:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 8 }}>
        <View className="flex-row gap-2">
          {turmas.map((t) => (
            <TouchableOpacity
              key={t.id}
              className={`px-4 py-2 rounded-sm border ${forjaTurmaId === t.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
              onPress={() => { setForjaTurmaId(t.id); sounds.playSelect(); }}
            >
              <Text className={`text-xs font-bold uppercase ${forjaTurmaId === t.id ? 'text-white' : 'text-neonBlue/50'}`}>
                {t.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text className="text-white/50 text-xs mb-2 uppercase font-bold">Selecionar Disciplina:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 8 }}>
        <View className="flex-row gap-2">
          {disciplinas.map((d) => (
            <TouchableOpacity
              key={d.id}
              className={`px-4 py-2 rounded-sm border ${forjaDisciplinaId === d.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
              onPress={() => { forjaDisciplinaId === d.id ? null : setForjaDisciplinaId(d.id); sounds.playSelect(); }}
            >
              <Text className={`text-xs font-bold uppercase ${forjaDisciplinaId === d.id ? 'text-white' : 'text-neonBlue/50'}`}>
                {d.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {showDifficulty ? (
        <>
          <Text className="text-white/50 text-xs mb-2 uppercase font-bold">Complexidade Alvo:</Text>
          <View className="flex-row gap-2 mb-4">
            {['FUNDAMENTAL', 'MEDIO', 'LIVRE'].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                className={`flex-1 py-3 rounded-sm border ${complexidade === lvl ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'} items-center`}
                onPress={() => { setComplexidade(lvl); sounds.playSelect(); }}
              >
                <Text className={`text-[10px] uppercase font-bold tracking-widest ${complexidade === lvl ? 'text-white' : 'text-neonBlue/50'}`}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <View className="mb-4 bg-black/35 border border-neonBlue/10 p-3 rounded-sm">
          <Text className="text-white/30 text-[9px] font-mono uppercase tracking-widest">Nível de Complexidade da Missão:</Text>
          <Text className="text-neonBlue text-sm font-bold font-mono uppercase mt-0.5 tracking-wider">{complexidade}</Text>
        </View>
      )}

      <Text className="text-white/50 text-xs mb-2 uppercase font-bold">Tipo de Resposta:</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        <TouchableOpacity
          className={`flex-1 min-w-[100px] py-3 rounded-sm border ${tipoQuest === 'CALCULO' ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'} items-center`}
          onPress={() => { setTipoQuest('CALCULO'); setExigeCalculo(true); sounds.playSelect(); }}
        >
          <Text className={`text-[9px] uppercase font-bold tracking-widest ${tipoQuest === 'CALCULO' ? 'text-white' : 'text-neonBlue/50'}`}>
            Foto
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 min-w-[100px] py-3 rounded-sm border ${tipoQuest === 'TEORICA' ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'} items-center`}
          onPress={() => { setTipoQuest('TEORICA'); setExigeCalculo(false); sounds.playSelect(); }}
        >
          <Text className={`text-[9px] uppercase font-bold tracking-widest ${tipoQuest === 'TEORICA' ? 'text-white' : 'text-neonBlue/50'}`}>
            Teórica (Texto)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 min-w-[110px] py-3 rounded-sm border ${tipoQuest === 'MULTIPLA' ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'} items-center`}
          onPress={() => { setTipoQuest('MULTIPLA'); setExigeCalculo(false); sounds.playSelect(); }}
        >
          <Text className={`text-[9px] uppercase font-bold tracking-widest ${tipoQuest === 'MULTIPLA' ? 'text-white' : 'text-neonBlue/50'}`}>
            Múltipla Escolha
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-6"
        placeholder="Tema (Ex: Regra de Três)"
        placeholderTextColor="#00f3ff40"
        keyboardAppearance="dark"
        value={tema}
        onChangeText={setTema}
      />

      <CyberSubmitButton
        title="Gerar Missão na Forja"
        loadingTitle="Forjando..."
        loading={forjando}
        onPress={handleForjarQuest}
      />

      {/* ───────────────── ARSENAL DE RASCUNHOS / AFIAR MISSÕES ───────────────── */}
      <View className="mt-8 border-t border-neonBlue/20 pt-6">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-neonBlue text-sm font-bold uppercase tracking-widest font-mono">🗡️ Arsenal de Rascunhos / Afiar</Text>
            {pendingBatches.length > 0 && (
              <View className="bg-neonBlue px-2 py-0.5 rounded-sm">
                <Text className="text-black text-[9px] font-bold font-mono">{pendingBatches.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={fetchPendingQuests} className="p-1">
            {loadingPending ? (
              <ActivityIndicator size="small" color="#00f3ff" />
            ) : (
              <Feather name="refresh-cw" size={14} color="#00f3ff" />
            )}
          </TouchableOpacity>
        </View>

        {pendingBatches.length === 0 ? (
          <View className="bg-black/35 border border-neonBlue/15 p-6 rounded-sm items-center justify-center mb-6">
            <Feather name="shield" size={24} color="#00f3ff20" />
            <Text className="text-white/30 text-[10px] font-mono mt-2 text-center uppercase tracking-wider">Nenhum rascunho aguardando na forja.</Text>
          </View>
        ) : (
          pendingBatches.map((batch) => (
            <View 
              key={batch.batchId} 
              className="bg-[#0b122c] border border-neonBlue/40 p-4 rounded-sm mb-5 shadow-lg"
            >
              {/* Header do Lote */}
              <View className="flex-row justify-between items-start border-b border-neonBlue/20 pb-2 mb-3">
                <View className="flex-1 pr-2">
                  <Text className="text-white font-bold text-xs uppercase font-mono tracking-widest">{batch.tema}</Text>
                  <Text className="text-neonBlue/60 text-[9px] font-mono mt-0.5">
                    {batch.disciplinaNome} · {batch.turmaNome} · Semana {batch.semana}
                  </Text>
                </View>
                <View className="bg-neonBlue/15 px-2 py-0.5 border border-neonBlue/30 rounded-sm">
                  <Text className="text-neonBlue text-[8px] font-bold font-mono uppercase">RASCUNHO</Text>
                </View>
              </View>

              {/* Quests do Lote */}
              <View className="gap-2.5 mb-4">
                {batch.quests.map((q: any) => {
                  const isEditing = editingQuestId === q.id;
                  const isRefining = refiningQuestId === q.id;
                  const subColor = q.nivel === 'FACIL' ? '#22c55e' : q.nivel === 'MEDIO' ? '#eab308' : '#ef4444';

                  return (
                    <View key={q.id} className="bg-black/50 border border-white/5 p-3 rounded-sm">
                      <View className="flex-row justify-between items-center flex-wrap gap-2 mb-2 pb-2 border-b border-white/5">
                        <View className="flex-row items-center gap-1.5">
                          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subColor }} />
                          <Text className="font-mono text-[9px] font-bold" style={{ color: subColor }}>{q.nivel} (+{q.xp} XP)</Text>
                        </View>
                        <View className="flex-row gap-2">
                          {/* Edit manual */}
                          <TouchableOpacity 
                            onPress={() => {
                              sounds.playSelect();
                              if (isEditing) {
                                setEditingQuestId(null);
                              } else {
                                setEditingQuestId(q.id);
                                setEditingEnunciado(q.enunciado);
                                setRefiningQuestId(null);
                              }
                            }}
                            className="bg-[#101b3a] px-2 py-1 rounded-sm border border-neonBlue/20"
                          >
                            <Feather name="edit" size={10} color="#00f3ff" />
                          </TouchableOpacity>

                          {/* AI Refine */}
                          <TouchableOpacity 
                            onPress={() => {
                              sounds.playSelect();
                              if (isRefining) {
                                setRefiningQuestId(null);
                              } else {
                                setRefiningQuestId(q.id);
                                setSharpenPrompt('');
                                setEditingQuestId(null);
                              }
                            }}
                            className="bg-[#1e153b] px-2 py-1 rounded-sm border border-purple-500/25"
                          >
                            <Feather name="zap" size={10} color="#c084fc" />
                          </TouchableOpacity>

                          {/* AI Regenerate */}
                          <TouchableOpacity 
                            onPress={() => {
                              sounds.playSelect();
                              Alert.alert(
                                'Descartar & Re-forjar',
                                'Deseja descartar esta missão e gerar uma nova pela IA?',
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  { text: 'Gerar Nova', onPress: () => handleRegenerateQuest(q.id) }
                                ]
                              );
                            }}
                            className="bg-[#241212] px-2 py-1 rounded-sm border border-red-500/25"
                            disabled={loadingActionId === q.id}
                          >
                            {loadingActionId === q.id ? (
                              <ActivityIndicator size="small" color="#ef4444" style={{ transform: [{ scale: 0.7 }] }} />
                            ) : (
                              <Feather name="trash-2" size={10} color="#ef4444" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      {isEditing ? (
                        <View className="mt-2">
                          <TextInput
                            className="w-full bg-black border border-neonBlue/50 text-white p-2 text-xs rounded-sm mb-2 font-mono"
                            multiline
                            numberOfLines={3}
                            value={editingEnunciado}
                            onChangeText={setEditingEnunciado}
                            keyboardAppearance="dark"
                          />
                          <View className="flex-row gap-2">
                            <TouchableOpacity 
                              className="flex-1 bg-red-950/20 border border-red-500/30 py-1.5 rounded-sm items-center" 
                              onPress={() => setEditingQuestId(null)}
                            >
                              <Text className="text-red-400 text-[10px] uppercase font-bold font-mono">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              className="flex-1 bg-neonBlue/20 border border-neonBlue py-1.5 rounded-sm items-center flex-row justify-center gap-1" 
                              onPress={() => handleSaveManualQuest(q.id)}
                            >
                              <Text className="text-neonBlue text-[10px] uppercase font-bold font-mono">Salvar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : isRefining ? (
                        <View className="mt-2">
                          <TextInput
                            className="w-full bg-[#0a0715] border border-purple-500/40 text-white p-2 text-xs rounded-sm mb-2 font-mono"
                            placeholder="Diga à IA: e.g. 'deixe mais simples', 'coloque mais números'"
                            placeholderTextColor="#c084fc40"
                            multiline
                            numberOfLines={2}
                            value={sharpenPrompt}
                            onChangeText={setSharpenPrompt}
                            keyboardAppearance="dark"
                          />
                          <View className="flex-row gap-2">
                            <TouchableOpacity 
                              className="flex-1 bg-purple-950/20 border border-purple-500/30 py-1.5 rounded-sm items-center" 
                              onPress={() => setRefiningQuestId(null)}
                            >
                              <Text className="text-purple-400 text-[10px] uppercase font-bold font-mono">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              className="flex-1 bg-purple-900/40 border border-purple-400 py-1.5 rounded-sm items-center flex-row justify-center gap-1" 
                              onPress={() => handleRefineQuest(q.id)}
                              disabled={loadingActionId === q.id}
                            >
                              {loadingActionId === q.id ? (
                                <ActivityIndicator size="small" color="#c084fc" style={{ transform: [{ scale: 0.7 }] }} />
                              ) : (
                                <>
                                  <Feather name="zap" size={10} color="#c084fc" />
                                  <Text className="text-purple-300 text-[10px] uppercase font-bold font-mono">Afiar com IA</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <Text className="text-white/80 text-xs font-mono leading-relaxed mt-1">{q.enunciado}</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Botão para Liberar Lote */}
              <TouchableOpacity
                className="w-full bg-neonBlue/10 border border-neonBlue py-3 rounded-sm items-center flex-row justify-center gap-2 shadow-sm"
                onPress={() => { sounds.playSelect(); handleApproveBatch(batch.batchId); }}
                disabled={loadingActionId === batch.batchId}
              >
                {loadingActionId === batch.batchId ? (
                  <ActivityIndicator size="small" color="#00f3ff" />
                ) : (
                  <>
                    <Feather name="unlock" size={14} color="#00f3ff" />
                    <Text className="text-neonBlue font-bold uppercase tracking-widest text-[11px] font-mono">Ativar & Liberar Lote</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View className="mt-8 border-t border-red-500/20 pt-6">
        <Text className="text-red-400 text-xs mb-2 uppercase font-bold tracking-widest">Configuração do BOSS Geral:</Text>
        <Text className="text-white/50 text-[10px] mb-2 font-mono">Duração do portal do BOSS ativo (em dias):</Text>
        <TextInput
          className="w-full bg-black/50 border border-red-500/50 text-white text-center text-sm py-3 rounded-sm mb-4"
          placeholder="Duração (dias) - Ex: 3"
          placeholderTextColor="#ef444440"
          keyboardType="number-pad"
          keyboardAppearance="dark"
          value={duracaoDiasBoss}
          onChangeText={setDuracaoDiasBoss}
        />
        <CyberSubmitButton
          title="Invocação Rápida de BOSS"
          loadingTitle="Invocando..."
          loading={loadingBoss}
          onPress={handleInvocacaoRapidaBOSS}
          variant="danger"
        />
      </View>
    </View>
  );
};
