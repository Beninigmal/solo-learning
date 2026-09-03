import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';
import { DND_MEGA_BOSSES, getRandomMegaBossByHp } from '../../constants/dndBosses';
import { api, getMestreBossFights, updateBossQuest, transmuteBossQuest } from '../../services/api';

interface ForjaTabProps {
  turmas: any[];
  disciplinas: any[];
  forjaTurmaIds: string[];
  setForjaTurmaIds: (ids: string[] | ((prev: string[]) => string[])) => void;
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
  nomeBoss?: string;
  setNomeBoss?: (text: string) => void;
  temaBoss?: string;
  setTemaBoss?: (text: string) => void;
  hpBoss?: string;
  setHpBoss?: (text: string) => void;
  diasBoss?: string;
  setDiasBoss?: (text: string) => void;
  loadingBoss: boolean;
  handleInvocacaoRapidaBOSS: (customData?: any) => void;
  sounds: any;
  currentUser?: any;
}

export const ForjaTab: React.FC<ForjaTabProps> = ({
  turmas,
  disciplinas,
  forjaTurmaIds,
  setForjaTurmaIds,
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
  nomeBoss = '',
  setNomeBoss = () => {},
  temaBoss = '',
  setTemaBoss = () => {},
  hpBoss = '300',
  setHpBoss = () => {},
  diasBoss = '3',
  setDiasBoss = () => {},
  loadingBoss,
  handleInvocacaoRapidaBOSS,
  sounds,
  currentUser,
}) => {
  const [forjaMode, setForjaMode] = useState<'DIARIA' | 'BOSS' | 'EMENTA'>('DIARIA');
  const showDifficulty = false;

  const [topicosCurriculares, setTopicosCurriculares] = useState<any[]>([]);
  const [loadingTopicos, setLoadingTopicos] = useState(false);
  const [rawEmentaText, setRawEmentaText] = useState('');
  const [savingEmenta, setSavingEmenta] = useState(false);
  const [generatingAIEmenta, setGeneratingAIEmenta] = useState(false);

  const [mestreBossFights, setMestreBossFights] = useState<any[]>([]);
  const [loadingMestreBosses, setLoadingMestreBosses] = useState(false);
  const [expandedBossId, setExpandedBossId] = useState<string | null>(null);
  const [editingBossQuestId, setEditingBossQuestId] = useState<string | null>(null);
  const [editingBossEnunciado, setEditingBossEnunciado] = useState('');
  const [transmutingQuestId, setTransmutingQuestId] = useState<string | null>(null);

  const fetchTopicosCurriculares = React.useCallback(async (discId: string) => {
    if (!discId) return;
    try {
      setLoadingTopicos(true);
      const res = await api.get(`/curriculum/${discId}`);
      setTopicosCurriculares(res.data.topicos || []);
    } catch (e) {
      console.warn('Erro ao buscar tópicos curriculares:', e);
    } finally {
      setLoadingTopicos(false);
    }
  }, []);

  React.useEffect(() => {
    if (!forjaDisciplinaId && disciplinas && disciplinas.length > 0) {
      setForjaDisciplinaId(disciplinas[0].id);
    } else if (forjaDisciplinaId) {
      fetchTopicosCurriculares(forjaDisciplinaId);
    }
  }, [forjaDisciplinaId, disciplinas, setForjaDisciplinaId, fetchTopicosCurriculares]);

  const handleSaveEmentaBatch = async () => {
    const targetDiscId = forjaDisciplinaId || (disciplinas.length > 0 ? disciplinas[0].id : null);
    if (!targetDiscId) {
      Alert.alert('Aviso', 'Selecione uma disciplina primeiro.');
      return;
    }
    try {
      setSavingEmenta(true);
      await api.post('/curriculum/batch', { disciplinaId: targetDiscId, rawText: rawEmentaText });
      Alert.alert('Sucesso', 'Ementa curricular salva com sucesso!');
      fetchTopicosCurriculares(targetDiscId);
      setRawEmentaText('');
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error || 'Erro ao salvar ementa.');
    } finally {
      setSavingEmenta(false);
    }
  };

  const handleGenerateAIEmenta = async () => {
    sounds.playSelect?.();
    const targetDiscId = forjaDisciplinaId || (disciplinas && disciplinas.length > 0 ? disciplinas[0].id : null);
    if (!targetDiscId) {
      Alert.alert('Aviso', 'Selecione uma disciplina primeiro.');
      return;
    }
    if (forjaDisciplinaId !== targetDiscId) {
      setForjaDisciplinaId(targetDiscId);
    }
    try {
      setGeneratingAIEmenta(true);
      const selectedTurma = turmas.find(t => forjaTurmaIds.includes(t.id));
      const ano = selectedTurma?.ano || '1º Ano';
      const nivel = selectedTurma?.nivel || 'MEDIO';
      const instType = currentUser?.institutionType || 'PARTICULAR';

      console.log('🤖 Disparando /curriculum/generate-ai:', { disciplinaId: targetDiscId, ano, nivel, instType });

      const res = await api.post('/curriculum/generate-ai', {
        disciplinaId: targetDiscId,
        ano,
        nivel,
        institutionType: instType
      });

      console.log('✅ Resposta ementa IA:', res.data);
      const topicos = res.data.topicos || [];
      setTopicosCurriculares(topicos);

      if (topicos.length > 0) {
        const textFormatted = topicos.map((t: any, idx: number) => `${idx + 1}. ${t.nome}`).join('\n');
        setRawEmentaText(textFormatted);
      }

      Alert.alert('Sucesso', res.data.message || 'Ementa gerada com sucesso pela IA!');
    } catch (err: any) {
      console.error('❌ Erro ao gerar ementa IA:', err);
      Alert.alert('Erro', err.response?.data?.error || err.message || 'Erro ao gerar ementa.');
    } finally {
      setGeneratingAIEmenta(false);
    }
  };

  const fetchActiveMestreBosses = React.useCallback(async () => {
    try {
      setLoadingMestreBosses(true);
      const fights = await getMestreBossFights();
      setMestreBossFights(fights);
      if (fights.length > 0 && !expandedBossId) {
        setExpandedBossId(fights[0].id);
      }
    } catch (e) {
      console.warn('Erro ao buscar boss fights do mestre:', e);
    } finally {
      setLoadingMestreBosses(false);
    }
  }, [expandedBossId]);

  React.useEffect(() => {
    fetchActiveMestreBosses();
  }, [fetchActiveMestreBosses]);

  const handleTransmuteBossQuest = async (questId: string) => {
    try {
      setTransmutingQuestId(questId);
      sounds.playSelect?.();
      await transmuteBossQuest(questId);
      Alert.alert('⚡ TRANSMUTAÇÃO CONCLUÍDA', 'A IA regenerou e corrigiu o enunciado da questão!');
      fetchActiveMestreBosses();
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao transmutar questão.');
    } finally {
      setTransmutingQuestId(null);
    }
  };

  const handleSaveBossQuestEdit = async (questId: string) => {
    if (!editingBossEnunciado.trim()) {
      Alert.alert('Aviso', 'O enunciado não pode ser vazio.');
      return;
    }
    try {
      setTransmutingQuestId(questId);
      sounds.playSelect?.();
      await updateBossQuest(questId, editingBossEnunciado.trim());
      Alert.alert('✏️ ALTERAÇÃO SALVA', 'O enunciado da questão do Boss foi atualizado!');
      setEditingBossQuestId(null);
      setEditingBossEnunciado('');
      fetchActiveMestreBosses();
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao salvar edição da questão.');
    } finally {
      setTransmutingQuestId(null);
    }
  };

  return (
    <View className={`w-full ${Platform.OS === 'web' ? '' : 'max-w-4xl'} mx-auto`}>
      {/* ───────────────── SELETOR DE MODO DE FORJA ───────────────── */}
      <View className="flex-row bg-black/60 border border-neonBlue/30 rounded-sm p-1.5 mb-6">
        <TouchableOpacity
          className={`flex-1 py-3 items-center justify-center rounded-sm flex-row gap-2 ${
            forjaMode === 'DIARIA' ? 'bg-neonBlue/30 border border-neonBlue' : 'border border-transparent'
          }`}
          onPress={() => {
            setForjaMode('DIARIA');
            sounds.playSelect?.();
          }}
        >
          <Feather name="file-text" size={15} color={forjaMode === 'DIARIA' ? '#00f3ff' : 'rgba(0,243,255,0.4)'} />
          <Text
            className={`font-mono text-xs font-bold uppercase tracking-widest ${
              forjaMode === 'DIARIA' ? 'text-white' : 'text-neonBlue/50'
            }`}
          >
            📜 Missão Diária
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 items-center justify-center rounded-sm flex-row gap-2 ${
            forjaMode === 'EMENTA' ? 'bg-purple-900/60 border border-purple-400' : 'border border-transparent'
          }`}
          onPress={() => {
            setForjaMode('EMENTA');
            sounds.playSelect?.();
          }}
        >
          <Feather name="book-open" size={15} color={forjaMode === 'EMENTA' ? '#c084fc' : 'rgba(192,132,252,0.4)'} />
          <Text
            className={`font-mono text-xs font-bold uppercase tracking-widest ${
              forjaMode === 'EMENTA' ? 'text-purple-300 font-bold' : 'text-purple-400/50'
            }`}
          >
            📚 Ementa Curricular
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 items-center justify-center rounded-sm flex-row gap-2 ${
            forjaMode === 'BOSS' ? 'bg-red-950/60 border border-red-500' : 'border border-transparent'
          }`}
          onPress={() => {
            setForjaMode('BOSS');
            sounds.playSelect?.();
          }}
        >
          <Feather name="shield" size={15} color={forjaMode === 'BOSS' ? '#ef4444' : 'rgba(239,68,68,0.4)'} />
          <Text
            className={`font-mono text-xs font-bold uppercase tracking-widest ${
              forjaMode === 'BOSS' ? 'text-red-400 font-bold' : 'text-red-500/50'
            }`}
          >
            ⚔️ Ativar Mega Boss
          </Text>
        </TouchableOpacity>
      </View>

      {/* ───────────────── MODAL 0: EMENTA CURRICULAR (TÓPICOS DO ANO) ───────────────── */}
      {forjaMode === 'EMENTA' && (
        <View className="bg-[#120826]/90 border border-purple-500/50 p-5 sm:p-6 rounded-sm mb-6 shadow-xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white text-base sm:text-lg font-bold uppercase tracking-widest font-mono">
              📚 Gestão da Ementa Curricular
            </Text>
            {loadingTopicos && <ActivityIndicator size="small" color="#c084fc" />}
          </View>
          <Text className="text-white/40 text-xs mb-5 font-mono leading-relaxed">
            Cadastre os tópicos do ano letivo por linha ou use a IA para gerar a matriz recomendada (MEC/BNCC). O sistema reusará este padrão para futuras turmas!
          </Text>

          {/* Selecionar Disciplina */}
          <Text className="text-purple-300 text-xs mb-2 uppercase font-bold font-mono">1. Selecionar Matéria:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 2 }}>
            <View className="flex-row gap-2">
              {disciplinas.map((d, idx) => {
                const isSelected = forjaDisciplinaId === d.id || (!forjaDisciplinaId && idx === 0);
                return (
                  <TouchableOpacity
                    key={d.id}
                    className={`px-4 py-2.5 rounded-sm border ${
                      isSelected ? 'bg-purple-600/60 border-purple-400' : 'bg-black/50 border-purple-500/20'
                    }`}
                    onPress={() => {
                      setForjaDisciplinaId(d.id);
                      sounds.playSelect?.();
                    }}
                  >
                    <Text className={`text-xs font-bold font-mono uppercase ${isSelected ? 'text-white' : 'text-purple-300/50'}`}>
                      {d.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Ações: Gerar por IA ou Colar por Linha */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={handleGenerateAIEmenta}
              activeOpacity={0.7}
              disabled={generatingAIEmenta || (disciplinas && disciplinas.length === 0)}
              className={`flex-1 ${generatingAIEmenta ? 'bg-purple-950/80 border-purple-500' : 'bg-purple-900/50 border-purple-400'} border py-3.5 rounded-sm items-center justify-center flex-row gap-2`}
            >
              {generatingAIEmenta ? (
                <>
                  <ActivityIndicator color="#c084fc" size="small" />
                  <Text className="text-purple-300 font-bold text-xs uppercase font-mono tracking-widest">
                    Gerando Ementa com IA MEC...
                  </Text>
                </>
              ) : (
                <>
                  <Feather name="cpu" size={14} color="#c084fc" />
                  <Text className="text-purple-200 font-bold text-xs uppercase font-mono tracking-widest">
                    ✨ Gerar Ementa MEC via IA
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Text Area para Colar em Lote */}
          <Text className="text-purple-300 text-xs mb-2 uppercase font-bold font-mono">2. Colar ou Editar Tópicos por Linha:</Text>
          <TextInput
            className="w-full bg-black/60 border border-purple-500/40 text-white p-3 rounded-sm font-mono text-xs mb-3"
            placeholder={`1. Equações do 2º Grau e Quadráticas\n2. Funções Exponenciais\n3. Geometria Espacial`}
            placeholderTextColor="rgba(192, 132, 252, 0.3)"
            multiline={true}
            numberOfLines={6}
            textAlignVertical="top"
            value={rawEmentaText}
            onChangeText={setRawEmentaText}
          />

          <CyberSubmitButton
            title="💾 SALVAR EMENTA DA DISCIPLINA"
            loadingTitle="Salvando Ementa..."
            loading={savingEmenta}
            onPress={handleSaveEmentaBatch}
          />

          {/* Lista de Tópicos Cadastrados */}
          {topicosCurriculares.length > 0 && (
            <View className="mt-6 border-t border-purple-500/20 pt-4">
              <Text className="text-purple-300 text-xs uppercase font-bold font-mono mb-3">
                📋 Tópicos Ativos ({topicosCurriculares.length}):
              </Text>
              {topicosCurriculares.map((t, idx) => (
                <View key={t.id} className="bg-black/40 border border-purple-500/20 p-2.5 rounded-sm mb-2 flex-row justify-between items-center">
                  <Text className="text-white text-xs font-mono">
                    <Text className="text-purple-400 font-bold">{idx + 1}.</Text> {t.nome}
                  </Text>
                  {t.dicasEstudo && (
                    <Text className="text-purple-300/50 text-[10px] font-mono italic max-w-[200px]" numberOfLines={1}>
                      💡 {t.dicasEstudo}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ───────────────── MODAL 1: FORMULÁRIO DE MISSÃO DIÁRIA ───────────────── */}
      {forjaMode === 'DIARIA' && (
        <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-5 sm:p-6 rounded-sm mb-6 shadow-xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white text-base sm:text-lg font-bold uppercase tracking-widest font-mono">
              📜 Forjar Missão Diária (IA)
            </Text>
            <Text className="text-neonBlue/60 text-[10px] font-mono">
              📅 {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <Text className="text-white/40 text-xs mb-5 font-mono leading-relaxed">
            Selecione a turma, matéria e tema. A IA gerará um lote de 3 questões diárias para aprovação.
          </Text>

          {/* Seleção de Turmas */}
          <Text className="text-neonBlue/80 text-xs mb-2 uppercase font-bold font-mono">1. Selecionar Turma(s):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 2 }}>
            <View className="flex-row gap-2">
              {turmas.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  className={`px-4 py-2.5 rounded-sm border ${
                    forjaTurmaIds.includes(t.id) ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'
                  }`}
                  onPress={() => {
                    setForjaTurmaIds((prev: string[]) =>
                      prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                    );
                    sounds.playSelect?.();
                  }}
                >
                  <Text
                    className={`text-xs font-bold font-mono uppercase ${
                      forjaTurmaIds.includes(t.id) ? 'text-white' : 'text-neonBlue/50'
                    }`}
                  >
                    {t.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Seleção de Disciplina */}
          <Text className="text-neonBlue/80 text-xs mb-2 uppercase font-bold font-mono">2. Selecionar Disciplina:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 2 }}>
            <View className="flex-row gap-2">
              {disciplinas.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  className={`px-4 py-2.5 rounded-sm border ${
                    forjaDisciplinaId === d.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'
                  }`}
                  onPress={() => {
                    setForjaDisciplinaId(d.id);
                    sounds.playSelect?.();
                  }}
                >
                  <Text
                    className={`text-xs font-bold font-mono uppercase ${
                      forjaDisciplinaId === d.id ? 'text-white' : 'text-neonBlue/50'
                    }`}
                  >
                    {d.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Tipo de Resposta */}
          <Text className="text-neonBlue/80 text-xs mb-2 uppercase font-bold font-mono">3. Tipo de Resposta Esperado:</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            <TouchableOpacity
              className={`flex-1 min-w-[100px] py-3 rounded-sm border ${
                tipoQuest === 'CALCULO' ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'
              } items-center`}
              onPress={() => {
                setTipoQuest('CALCULO');
                setExigeCalculo(true);
                sounds.playSelect?.();
              }}
            >
              <Text className={`text-[10px] uppercase font-bold font-mono ${tipoQuest === 'CALCULO' ? 'text-white' : 'text-neonBlue/50'}`}>
                📷 Foto do Caderno
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 min-w-[100px] py-3 rounded-sm border ${
                tipoQuest === 'TEORICA' ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'
              } items-center`}
              onPress={() => {
                setTipoQuest('TEORICA');
                setExigeCalculo(false);
                sounds.playSelect?.();
              }}
            >
              <Text className={`text-[10px] uppercase font-bold font-mono ${tipoQuest === 'TEORICA' ? 'text-white' : 'text-neonBlue/50'}`}>
                ✍️ Teórica (Texto)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 min-w-[110px] py-3 rounded-sm border ${
                tipoQuest === 'MULTIPLA' ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'
              } items-center`}
              onPress={() => {
                setTipoQuest('MULTIPLA');
                setExigeCalculo(false);
                sounds.playSelect?.();
              }}
            >
              <Text className={`text-[10px] uppercase font-bold font-mono ${tipoQuest === 'MULTIPLA' ? 'text-white' : 'text-neonBlue/50'}`}>
                🔘 Múltipla Escolha
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campo de Tema */}
          <Text className="text-neonBlue/80 text-xs mb-1 uppercase font-bold font-mono">4. Tema / Assunto Pedagógico:</Text>

          {topicosCurriculares.length > 0 && (
            <View className="mb-2">
              <Text className="text-neonBlue/50 text-[10px] uppercase font-mono mb-1">Tópicos da Ementa (Clique para selecionar):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5 py-1">
                {topicosCurriculares.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      setTema(t.nome);
                      sounds.playSelect?.();
                    }}
                    className={`px-3 py-1.5 rounded-sm border ${
                      tema === t.nome ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/40 border-neonBlue/20'
                    }`}
                  >
                    <Text className={`text-[11px] font-mono ${tema === t.nome ? 'text-white font-bold' : 'text-neonBlue/70'}`}>
                      {t.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TextInput
            className="w-full bg-black/60 border border-neonBlue/50 text-white text-sm px-4 py-3 rounded-sm mb-6 font-mono"
            placeholder="Ex: Regra de Três Simples e Composta ou selecione acima"
            placeholderTextColor="#00f3ff40"
            keyboardAppearance="dark"
            value={tema}
            onChangeText={setTema}
          />

          <CyberSubmitButton
            title="✨ GERAR MISSÃO DIÁRIA NA FORJA"
            loadingTitle="Forjando Missões com IA..."
            loading={forjando}
            onPress={handleForjarQuest}
          />
        </View>
      )}

      {/* ───────────────── MODAL 2: FORMULÁRIO EXCLUSIVO DO MEGA BOSS ───────────────── */}
      {forjaMode === 'BOSS' && (
        <View className="bg-[#12070a]/95 border-2 border-red-500/80 p-5 sm:p-6 rounded-sm mb-6 shadow-2xl">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-red-400 text-base sm:text-lg font-bold uppercase tracking-widest font-mono">
              ⚔️ Convocar Mega Boss Fight
            </Text>
            <View className="bg-red-500/20 border border-red-500 px-2 py-0.5 rounded-sm">
              <Text className="text-red-400 text-[9px] font-mono font-bold uppercase">EVENTO RAID</Text>
            </View>
          </View>

          {/* Caixa de Regra do Boss */}
          <View className="bg-red-950/30 border border-red-500/30 p-3 rounded-sm mb-5">
            <Text className="text-red-300/80 text-[11px] font-mono leading-relaxed">
              🚨 <Text className="font-bold">MODO RAID EM GRUPO:</Text> O Mega Boss possui uma barra de vida coletiva (1 Quest = 1 HP). O tipo de resposta é <Text className="font-bold">auto-definido pela matéria</Text> (Matemática/Física = Foto dos Cálculos; Português = Foto da Redação Livre; Outras = Resposta Dissertativa).
            </Text>
          </View>

          {/* 1. Selecionar Turmas */}
          <Text className="text-red-400 text-xs mb-2 uppercase font-bold font-mono">1. Selecionar Turma(s) Alvo da Raid:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 2 }}>
            <View className="flex-row gap-2">
              {turmas.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  className={`px-4 py-2.5 rounded-sm border ${
                    forjaTurmaIds.includes(t.id) ? 'bg-red-900/40 border-red-500' : 'bg-black/60 border-red-500/30'
                  }`}
                  onPress={() => {
                    setForjaTurmaIds((prev: string[]) =>
                      prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                    );
                    sounds.playSelect?.();
                  }}
                >
                  <Text
                    className={`text-xs font-bold font-mono uppercase ${
                      forjaTurmaIds.includes(t.id) ? 'text-white' : 'text-red-400/50'
                    }`}
                  >
                    {t.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* 2. Selecionar Disciplina */}
          <Text className="text-red-400 text-xs mb-2 uppercase font-bold font-mono">2. Selecionar Disciplina:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 2 }}>
            <View className="flex-row gap-2">
              {disciplinas.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  className={`px-4 py-2.5 rounded-sm border ${
                    forjaDisciplinaId === d.id ? 'bg-red-900/40 border-red-500' : 'bg-black/60 border-red-500/30'
                  }`}
                  onPress={() => {
                    setForjaDisciplinaId(d.id);
                    sounds.playSelect?.();
                  }}
                >
                  <Text
                    className={`text-xs font-bold font-mono uppercase ${
                      forjaDisciplinaId === d.id ? 'text-white' : 'text-red-400/50'
                    }`}
                  >
                    {d.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* 3. Seleção de Monstro Boss D&D ou Sorteio por HP */}
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-red-400 text-xs uppercase font-bold font-mono">
              3. Selecionar Monstro Boss D&D ou Sortear:
            </Text>
            <TouchableOpacity
              onPress={() => {
                const currentHp = parseInt(hpBoss) || 300;
                const randomBoss = getRandomMegaBossByHp(currentHp);
                setNomeBoss(randomBoss.name);
                sounds.playSelect?.();
              }}
              className="bg-red-500/20 border border-red-500 px-3 py-1 rounded-sm flex-row items-center gap-1.5"
            >
              <Feather name="shuffle" size={12} color="#ef4444" />
              <Text className="text-red-400 font-bold font-mono text-[10px] uppercase">🎲 Sortear por HP</Text>
            </TouchableOpacity>
          </View>

          {/* Carrossel de Bosses D&D */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ paddingHorizontal: 2 }}>
            <View className="flex-row gap-2">
              {DND_MEGA_BOSSES.map((boss) => {
                const isSelected = nomeBoss === boss.name;
                const tierColor = boss.tier === 'COLOSSAL' ? '#ef4444' : boss.tier === 'EPICO' ? '#c084fc' : '#eab308';

                return (
                  <TouchableOpacity
                    key={boss.id}
                    onPress={() => {
                      setNomeBoss(boss.name);
                      sounds.playSelect?.();
                    }}
                    className={`px-3 py-2 rounded-sm border max-w-[200px] ${
                      isSelected ? 'bg-red-900/50 border-red-500' : 'bg-black/60 border-red-500/20'
                    }`}
                  >
                    <View className="flex-row items-center justify-between gap-1 mb-1">
                      <Text className="text-white font-bold font-mono text-xs" numberOfLines={1}>
                        {boss.name}
                      </Text>
                      <View className="px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${tierColor}30`, borderColor: tierColor, borderWidth: 0.5 }}>
                        <Text className="text-[8px] font-bold font-mono uppercase" style={{ color: tierColor }}>
                          {boss.tier}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-white/50 text-[9px] font-mono" numberOfLines={2}>
                      {boss.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Campo de Nome do Boss (Personalizável) */}
          <TextInput
            className="w-full bg-black/70 border border-red-500/50 text-white text-sm px-4 py-3 rounded-sm mb-4 font-mono"
            placeholder="Nome do Boss (Ex: Dragão Vermelho Ancião)"
            placeholderTextColor="#ef444440"
            keyboardAppearance="dark"
            value={nomeBoss}
            onChangeText={setNomeBoss}
          />

          {/* 4. Tema do Boss */}
          <Text className="text-red-400 text-xs mb-1 uppercase font-bold font-mono">4. Tema do Combate Boss (Obrigatório):</Text>
          <TextInput
            className="w-full bg-black/70 border border-red-500/50 text-white text-sm px-4 py-3 rounded-sm mb-5 font-mono"
            placeholder="Ex: Funções Quadráticas e Gráficos de Parábola"
            placeholderTextColor="#ef444440"
            keyboardAppearance="dark"
            value={temaBoss || tema}
            onChangeText={(txt) => {
              setTemaBoss(txt);
              setTema(txt);
            }}
          />

          {/* 5. Grid Harmônico de HP e Duração (2 Colunas em telas maiores) */}
          <View className="flex-col sm:flex-row gap-3 mb-6">
            <View className="flex-1">
              <Text className="text-red-400 text-xs mb-1 uppercase font-bold font-mono">
                5. HP Total (1 Quest = 1 HP):
              </Text>
              <TextInput
                className="w-full bg-black/70 border border-red-500/50 text-white text-center text-sm px-4 py-3 rounded-sm font-mono"
                placeholder="HP Total (Ex: 300)"
                placeholderTextColor="#ef444440"
                keyboardType="number-pad"
                keyboardAppearance="dark"
                value={hpBoss}
                onChangeText={setHpBoss}
              />
            </View>

            <View className="flex-1">
              <Text className="text-red-400 text-xs mb-1 uppercase font-bold font-mono">
                6. Duração da Raid (em dias):
              </Text>
              <TextInput
                className="w-full bg-black/70 border border-red-500/50 text-white text-center text-sm px-4 py-3 rounded-sm font-mono"
                placeholder="Dias (Ex: 3)"
                placeholderTextColor="#ef444440"
                keyboardType="number-pad"
                keyboardAppearance="dark"
                value={diasBoss}
                onChangeText={setDiasBoss}
              />
            </View>
          </View>

          <CyberSubmitButton
            title="⚔️ ATIVAR MEGA BOSS FIGHT"
            loadingTitle="Convocando Mega Boss..."
            loading={loadingBoss}
            onPress={() => {
              handleInvocacaoRapidaBOSS({
                turmaIds: forjaTurmaIds,
                disciplinaId: forjaDisciplinaId,
                tema: temaBoss || tema,
                nomeBoss: nomeBoss || 'Mega Boss',
                totalHp: parseInt(hpBoss) || 300,
                duracaoDias: parseInt(diasBoss) || 3,
              });
            }}
            variant="danger"
          />
        </View>
      )}

      {/* ───────────────── GERENCIAMENTO DE MEGA BOSSES ATIVOS DO MESTRE ───────────────── */}
      {forjaMode === 'BOSS' && (
        <View className="bg-[#14080c]/90 border border-red-500/40 p-5 sm:p-6 rounded-sm mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-red-400 text-sm font-bold uppercase tracking-widest font-mono">
                ⚔️ Mega Bosses Ativos & Ver/Editar Quests
              </Text>
              {mestreBossFights.length > 0 && (
                <View className="bg-red-500 px-2 py-0.5 rounded-sm">
                  <Text className="text-black text-[9px] font-bold font-mono">{mestreBossFights.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={fetchActiveMestreBosses} className="p-1">
              {loadingMestreBosses ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Feather name="refresh-cw" size={14} color="#ef4444" />
              )}
            </TouchableOpacity>
          </View>

          {mestreBossFights.length === 0 ? (
            <View className="bg-black/40 border border-red-500/15 p-6 rounded-sm items-center justify-center">
              <Feather name="shield" size={24} color="#ef444430" />
              <Text className="text-white/30 text-[10px] font-mono mt-2 text-center uppercase tracking-wider">
                Nenhum Mega Boss ativo no momento. Use a aba "Ativar Mega Boss" acima para forjar um evento!
              </Text>
            </View>
          ) : (
            mestreBossFights.map((bf) => {
              const isExpanded = expandedBossId === bf.id;
              const hpPercent = Math.max(0, Math.min(100, (bf.currentHp / bf.totalHp) * 100));

              return (
                <View key={bf.id} className="bg-black/60 border border-red-500/30 rounded-sm mb-4 overflow-hidden">
                  {/* Header do Boss */}
                  <TouchableOpacity
                    onPress={() => {
                      setExpandedBossId(isExpanded ? null : bf.id);
                      sounds.playSelect?.();
                    }}
                    className="p-4 bg-red-950/20 border-b border-red-500/20 flex-row justify-between items-center"
                  >
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-red-400 font-bold font-mono text-xs uppercase tracking-wider">
                          {bf.nomeBoss}
                        </Text>
                        <View className="bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-sm">
                          <Text className="text-red-300 text-[9px] font-mono uppercase">{bf.turma?.nome}</Text>
                        </View>
                      </View>
                      <Text className="text-white/60 text-[10px] font-mono">
                        {bf.disciplina?.nome} • HP: {bf.currentHp} / {bf.totalHp} ({hpPercent.toFixed(0)}%) • {bf.quests?.length || 0} Quests no Pool
                      </Text>
                    </View>

                    <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#ef4444" />
                  </TouchableOpacity>

                  {/* Lista de Quests do Boss */}
                  {isExpanded && (
                    <View className="p-4 gap-3 bg-black/40">
                      <Text className="text-red-400/80 text-[10px] font-mono font-bold uppercase mb-1">
                        📋 LOTE DE QUESTS GERADAS (CLIQUE EM EDITAR OU TRANSMUTAR):
                      </Text>

                      {bf.quests?.map((q: any, qIdx: number) => {
                        const isEditingThis = editingBossQuestId === q.id;
                        const isTransmutingThis = transmutingQuestId === q.id;

                        return (
                          <View key={q.id} className="bg-[#0e0709] border border-red-500/20 p-3 rounded-sm">
                            <View className="flex-row justify-between items-center mb-2 pb-2 border-b border-white/5">
                              <Text className="text-red-400 font-bold font-mono text-[10px]">
                                QUEST #{qIdx + 1} • {q.nivel} ({q.xpBase} XP)
                              </Text>

                              <View className="flex-row gap-2">
                                {/* Botão Transmutar (IA) */}
                                <TouchableOpacity
                                  onPress={() => handleTransmuteBossQuest(q.id)}
                                  disabled={isTransmutingThis}
                                  className="bg-purple-950/40 px-2 py-1 rounded-sm border border-purple-500/30 flex-row items-center gap-1"
                                >
                                  {isTransmutingThis ? (
                                    <ActivityIndicator size="small" color="#c084fc" style={{ transform: [{ scale: 0.6 }] }} />
                                  ) : (
                                    <>
                                      <Feather name="zap" size={10} color="#c084fc" />
                                      <Text className="text-purple-300 text-[9px] font-mono font-bold">Transmutar (IA)</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>

                            <Text className="text-white/90 text-xs font-mono leading-relaxed mt-1">
                              {q.enunciado}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ───────────────── ARSENAL DE RASCUNHOS / AFIAR MISSÕES ───────────────── */}
      {(forjaMode === 'DIARIA' || forjaMode === 'FORJA') && (
        <View className="bg-[#0a1128]/90 border border-neonBlue/30 p-5 sm:p-6 rounded-sm mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-neonBlue text-sm font-bold uppercase tracking-widest font-mono">
                🗡️ Arsenal de Rascunhos / Afiar Missões
              </Text>
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
            <View className="bg-black/35 border border-neonBlue/15 p-6 rounded-sm items-center justify-center">
              <Feather name="shield" size={24} color="#00f3ff20" />
              <Text className="text-white/30 text-[10px] font-mono mt-2 text-center uppercase tracking-wider">
                Nenhum rascunho aguardando na forja.
              </Text>
            </View>
          ) : (
            pendingBatches.map((batch) => (
              <View key={batch.batchId} className="bg-[#0b122c] border border-neonBlue/40 p-4 rounded-sm mb-4 shadow-lg">
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
                            <Text className="font-mono text-[9px] font-bold" style={{ color: subColor }}>
                              {q.nivel} (+{q.xp} XP)
                            </Text>
                          </View>
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => {
                                sounds.playSelect?.();
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

                            <TouchableOpacity
                              onPress={() => {
                                sounds.playSelect?.();
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

                            <TouchableOpacity
                              onPress={() => {
                                sounds.playSelect?.();
                                Alert.alert(
                                  'Descartar & Re-forjar',
                                  'Deseja descartar esta missão e gerar uma nova pela IA?',
                                  [
                                    { text: 'Cancelar', style: 'cancel' },
                                    { text: 'Gerar Nova', onPress: () => handleRegenerateQuest(q.id) },
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
                  onPress={() => {
                    sounds.playSelect?.();
                    handleApproveBatch(batch.batchId);
                  }}
                  disabled={loadingActionId === batch.batchId}
                >
                  {loadingActionId === batch.batchId ? (
                    <ActivityIndicator size="small" color="#00f3ff" />
                  ) : (
                    <>
                      <Feather name="unlock" size={14} color="#00f3ff" />
                      <Text className="text-neonBlue font-bold uppercase tracking-widest text-[11px] font-mono">
                        Ativar & Liberar Lote
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
};
