import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';

const abbreviateSubjectName = (name: string): string => {
  if (!name) return '';
  let res = name;
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (lower === 'lingua portuguesa') return 'L. Portuguesa';
  if (lower === 'educacao fisica') return 'Ed. Física';
  if (lower === 'lingua estrangeira') return 'L. Estrangeira';
  if (lower === 'ensino religioso') return 'Ens. Religioso';

  res = res.replace(/Língua/i, 'L.');
  res = res.replace(/Lingua/i, 'L.');
  res = res.replace(/Educação/i, 'Ed.');
  res = res.replace(/Educacao/i, 'Ed.');
  res = res.replace(/Ensino/i, 'Ens.');
  
  return res;
};


interface GradeTabProps {
  turmas: any[];
  timetableTurmaId: string;
  setTimetableTurmaId: (val: string) => void;
  fetchTimetable: (turmaId: string) => void;
  selectedTimetableDisciplinaId: string;
  setSelectedTimetableDisciplinaId: (val: string) => void;
  allDisciplinasList: any[];
  selectedShift: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO';
  setSelectedShift: (val: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO') => void;
  loadingTimetable: boolean;
  timetableSlots: any[];
  handleDeleteTimetableSlot: (day: string, absolutePos: number, discName: string) => void;
  handleSaveTimetableSlot: (day: string, absolutePos: number, discId: string) => void;
  handleAutoGenerateTimetable: (shift: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO') => void;
  sounds: any;
  showAlert: (title: string, message: string, type?: any, buttons?: any[]) => void;
  // Urania v2 Props
  shiftSettings: any[];
  professorRestrictions: any[];
  loadingShifts: boolean;
  loadingRestrictions: boolean;
  handleSaveShiftSetting: (shift: string, slotsCount: number, intervalAfterSlot: number) => Promise<void>;
  handleSaveProfessorRestriction: (professorId: string, restrictions: { diaSemana: string; shift: string; posicao?: number | null }[]) => Promise<void>;
  masters: any[];
  // Monarch Engine v3 Props
  disciplinaConfig: any[];
  setDisciplinaConfig: (val: any) => void;
  loadingBatchGenerate: boolean;
  handleBatchGenerateTimetable: (shift: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO') => Promise<void>;
  fetchDisciplinaConfig: (turmaId: string) => Promise<void>;
  handleSaveDisciplinaConfig: (turmaId: string) => Promise<void>;
}

export function GradeTab({
  turmas,
  timetableTurmaId,
  setTimetableTurmaId,
  fetchTimetable,
  selectedTimetableDisciplinaId,
  setSelectedTimetableDisciplinaId,
  allDisciplinasList,
  selectedShift,
  setSelectedShift,
  loadingTimetable,
  timetableSlots,
  handleDeleteTimetableSlot,
  handleSaveTimetableSlot,
  handleAutoGenerateTimetable,
  sounds,
  showAlert,
  // Urania v2 Props
  shiftSettings,
  professorRestrictions,
  loadingShifts,
  loadingRestrictions,
  handleSaveShiftSetting,
  handleSaveProfessorRestriction,
  masters,
  // Monarch Engine v3 Props
  disciplinaConfig,
  setDisciplinaConfig,
  loadingBatchGenerate,
  handleBatchGenerateTimetable,
  fetchDisciplinaConfig,
  handleSaveDisciplinaConfig,
}: GradeTabProps) {
  const [slotsCount, setSlotsCount] = useState(5);
  const [intervalAfterSlot, setIntervalAfterSlot] = useState(3);

  // Sincronizar configuração de disciplinas do Monarch v3
  useEffect(() => {
    if (timetableTurmaId) {
      fetchDisciplinaConfig(timetableTurmaId);
    }
  }, [timetableTurmaId]);
  const [showRestrictions, setShowRestrictions] = useState(false);
  const [showCurriculumConfig, setShowCurriculumConfig] = useState(false);
  const [profSearch, setProfSearch] = useState('');
  const [selectedProf, setSelectedProf] = useState<any | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<{ diaSemana: string; shift: string; posicao?: number | null }[]>([]);

  // Sincronizar restrições selecionadas do professor
  useEffect(() => {
    if (selectedProf) {
      const currentBlocks = professorRestrictions
        .filter(r => r.professorId === selectedProf.id && r.shift === selectedShift)
        .map(r => ({ diaSemana: r.diaSemana, shift: selectedShift, posicao: r.posicao }));
      setSelectedBlocks(currentBlocks);
    } else {
      setSelectedBlocks([]);
    }
  }, [selectedProf, professorRestrictions, selectedShift]);

  const getAbsolutePos = (pos: number) => {
    return selectedShift === 'MATUTINO' 
      ? pos 
      : selectedShift === 'VESPERTINO' 
      ? pos + 10 
      : pos + 20;
  };

  const isWholeShiftBlocked = (day: string) => {
    return selectedBlocks.some(b => b.diaSemana === day && b.posicao === null);
  };

  const isSlotBlocked = (day: string, absolutePos: number) => {
    if (isWholeShiftBlocked(day)) return true;
    return selectedBlocks.some(b => b.diaSemana === day && b.posicao === absolutePos);
  };

  const toggleWholeShift = (day: string) => {
    sounds.playSelect();
    const isBlocked = isWholeShiftBlocked(day);
    if (isBlocked) {
      setSelectedBlocks(prev => prev.filter(b => !(b.diaSemana === day && b.posicao === null)));
    } else {
      setSelectedBlocks(prev => [
        ...prev.filter(b => b.diaSemana !== day),
        { diaSemana: day, shift: selectedShift, posicao: null }
      ]);
    }
  };

  const toggleSlot = (day: string, pos: number) => {
    sounds.playSelect();
    const absolutePos = getAbsolutePos(pos);
    
    if (isWholeShiftBlocked(day)) {
      const newSlots: { diaSemana: string; shift: string; posicao: number }[] = [];
      for (let p = 1; p <= slotsCount; p++) {
        const pAbs = getAbsolutePos(p);
        if (pAbs !== absolutePos) {
          newSlots.push({ diaSemana: day, shift: selectedShift, posicao: pAbs });
        }
      }
      setSelectedBlocks(prev => [
        ...prev.filter(b => b.diaSemana !== day),
        ...newSlots
      ]);
      return;
    }

    const exists = selectedBlocks.some(b => b.diaSemana === day && b.posicao === absolutePos);
    if (exists) {
      setSelectedBlocks(prev => prev.filter(b => !(b.diaSemana === day && b.posicao === absolutePos)));
    } else {
      setSelectedBlocks(prev => [...prev, { diaSemana: day, shift: selectedShift, posicao: absolutePos }]);
    }
  };

  const handleSaveRestrictions = async () => {
    if (!selectedProf) return;
    sounds.playSelect();
    const otherShiftsRestrictions = professorRestrictions
      .filter(r => r.professorId === selectedProf.id && r.shift !== selectedShift)
      .map(r => ({ diaSemana: r.diaSemana, shift: r.shift, posicao: r.posicao }));

    const merged = [...otherShiftsRestrictions, ...selectedBlocks];
    await handleSaveProfessorRestriction(selectedProf.id, merged);
    setSelectedProf(null);
  };

  const DAYS = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const DAY_LABELS: { [key: string]: string } = {
    SEGUNDA: 'Segunda',
    TERCA: 'Terça',
    QUARTA: 'Quarta',
    QUINTA: 'Quinta',
    SEXTA: 'Sexta',
  };

  // Sincronizar parâmetros do turno selecionado
  useEffect(() => {
    const setting = shiftSettings.find(s => s.shift === selectedShift);
    setSlotsCount(setting ? setting.slotsCount : 5);
    setIntervalAfterSlot(setting ? setting.intervalAfterSlot : 3);
  }, [selectedShift, shiftSettings]);

  // Filtrar lista de professores da escola
  const filteredProfessors = (masters || []).filter(p => {
    const matchesSearch = p.nome?.toLowerCase().includes(profSearch.toLowerCase()) || 
                          p.matricula?.toLowerCase().includes(profSearch.toLowerCase());
    return matchesSearch;
  });

  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">Grade de Horários</Text>

      {/* Selecionar Turma */}
      <Text className="text-white/50 text-xs mb-2 uppercase font-bold">Selecionar Turma para Visualizar/Editar:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ paddingHorizontal: 8 }}>
        <View className="flex-row gap-2">
          {/* Botão Geral & Lote (Painel Global) */}
          <TouchableOpacity
            onPress={() => { setTimetableTurmaId(''); sounds.playSelect(); }}
            className={`px-4 py-2 rounded-sm border flex-row items-center gap-1.5 ${timetableTurmaId === '' ? 'bg-red-500/20 border-red-500' : 'bg-black/50 border-red-500/20'}`}
            activeOpacity={0.7}
          >
            <Feather name="globe" size={12} color={timetableTurmaId === '' ? '#ef4444' : 'rgba(239,68,68,0.5)'} />
            <Text className={`text-xs font-bold uppercase ${timetableTurmaId === '' ? 'text-white' : 'text-red-500/50'}`}>
              Geral & Lote
            </Text>
          </TouchableOpacity>

          {turmas.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => { setTimetableTurmaId(t.id); fetchTimetable(t.id); sounds.playSelect(); }}
              className={`px-4 py-2 rounded-sm border ${timetableTurmaId === t.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
            >
              <Text className={`text-xs font-bold uppercase ${timetableTurmaId === t.id ? 'text-white' : 'text-neonBlue/50'}`}>
                {t.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {timetableTurmaId === '' ? (
        <View className="mt-2 gap-6">
          {/* Seção 1: Seleção de Turno Global */}
          <View className="bg-black/40 border border-white/5 p-4 rounded-sm">
            <Text className="text-white/50 text-[10px] uppercase font-bold mb-3">Selecione o Turno para Configurar & Gerar em Lote:</Text>
            <View className="flex-row gap-2">
              {(['MATUTINO', 'VESPERTINO', 'NOTURNO'] as const).map(shift => (
                <TouchableOpacity
                  key={shift}
                  onPress={() => { setSelectedShift(shift); sounds.playSelect(); }}
                  className={`flex-1 py-3 rounded-sm border items-center justify-center ${selectedShift === shift ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/10'}`}
                >
                  <Text className={`text-xs font-bold font-mono ${selectedShift === shift ? 'text-white' : 'text-neonBlue/40'}`}>
                    {shift}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Seção 2: Parâmetros do Turno Selecionado */}
          <View className="bg-neonBlue/5 border border-neonBlue/20 p-4 rounded-sm">
            <Text className="text-white text-xs font-extrabold uppercase font-mono tracking-wide mb-3">🛠️ Parâmetros Globais do Turno {selectedShift}</Text>
            
            <View className="flex-row justify-between items-center gap-4 flex-wrap">
              <View className="flex-1 min-w-[120px]">
                <Text className="text-white/40 text-[9px] font-mono mb-1.5 uppercase">Aulas por Turno:</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity 
                    onPress={() => { sounds.playSelect(); setSlotsCount(prev => Math.max(4, prev - 1)); }} 
                    className="bg-black/40 border border-neonBlue/30 w-8 h-8 rounded-sm items-center justify-center active:bg-neonBlue/10"
                  >
                    <Text className="text-neonBlue font-mono font-bold">-</Text>
                  </TouchableOpacity>
                  <Text className="text-white font-mono font-bold text-sm w-6 text-center">{slotsCount}</Text>
                  <TouchableOpacity 
                    onPress={() => { sounds.playSelect(); setSlotsCount(prev => Math.min(6, prev + 1)); }} 
                    className="bg-black/40 border border-neonBlue/30 w-8 h-8 rounded-sm items-center justify-center active:bg-neonBlue/10"
                  >
                    <Text className="text-neonBlue font-mono font-bold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-1 min-w-[120px]">
                <Text className="text-white/40 text-[9px] font-mono mb-1.5 uppercase">Intervalo após a Aula:</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity 
                    onPress={() => { sounds.playSelect(); setIntervalAfterSlot(prev => Math.max(2, prev - 1)); }} 
                    className="bg-black/40 border border-neonBlue/30 w-8 h-8 rounded-sm items-center justify-center active:bg-neonBlue/10"
                  >
                    <Text className="text-neonBlue font-mono font-bold">-</Text>
                  </TouchableOpacity>
                  <Text className="text-white font-mono font-bold text-sm w-6 text-center">{intervalAfterSlot}ª</Text>
                  <TouchableOpacity 
                    onPress={() => { sounds.playSelect(); setIntervalAfterSlot(prev => Math.min(slotsCount - 1, prev + 1)); }} 
                    className="bg-black/40 border border-neonBlue/30 w-8 h-8 rounded-sm items-center justify-center active:bg-neonBlue/10"
                  >
                    <Text className="text-neonBlue font-mono font-bold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={async () => {
                  sounds.playSelect();
                  await handleSaveShiftSetting(selectedShift, slotsCount, intervalAfterSlot);
                }}
                className="bg-neonBlue/20 border border-neonBlue px-4 py-2.5 rounded-sm active:bg-neonBlue/40 self-end"
              >
                {loadingShifts ? (
                  <ActivityIndicator size="small" color="#00f3ff" />
                ) : (
                  <Text className="text-neonBlue text-[10px] font-extrabold font-mono uppercase tracking-wider">Aplicar Config</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Seção 3: Switcher e Config de Restrições Globais de Professores */}
          <View className="bg-black/40 border border-white/5 p-4 rounded-sm">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-white text-xs font-bold uppercase font-mono tracking-wide">⚠️ Restrições de Agenda de Professores</Text>
                <Text className="text-white/40 text-[9px] font-mono mt-1 leading-3">
                  Configure os dias e slots bloqueados para cada mestre da instituição no turno {selectedShift}.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { sounds.playSelect(); setShowRestrictions(!showRestrictions); }}
                style={{ width: 44, height: 22, borderRadius: 11, borderWidth: 1, borderColor: showRestrictions ? '#ef4444' : 'rgba(255,255,255,0.2)', backgroundColor: showRestrictions ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.4)', padding: 2, justifyContent: 'center' }}
              >
                <View 
                  style={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: 8, 
                    backgroundColor: showRestrictions ? '#ef4444' : 'rgba(255,255,255,0.4)',
                    alignSelf: showRestrictions ? 'flex-end' : 'flex-start' 
                  }} 
                />
              </TouchableOpacity>
            </View>

            {showRestrictions && (
              <View className="bg-red-500/5 border border-red-500/20 p-4 rounded-sm mt-4">
                <Text className="text-red-500 text-[10px] font-extrabold uppercase font-mono tracking-wider mb-3">📋 Selecione o Mestre para Bloqueios</Text>
                
                <View className="flex-row items-center border border-white/10 bg-black/40 px-3 rounded-sm mb-4">
                  <Feather name="search" size={14} color="#ffffff30" />
                  <TextInput
                    value={profSearch}
                    onChangeText={setProfSearch}
                    placeholder="Buscar professor..."
                    placeholderTextColor="#ffffff30"
                    className="flex-1 text-white text-xs font-mono py-2 ml-2"
                  />
                </View>

                <ScrollView nestedScrollEnabled={true} className="max-h-40 border border-white/5 bg-black/20 rounded-sm">
                  {filteredProfessors.length === 0 ? (
                    <Text className="text-white/20 text-center text-[10px] font-mono py-4">Nenhum mestre cadastrado ou encontrado.</Text>
                  ) : (
                    filteredProfessors.map(prof => {
                      const restrictionsCount = professorRestrictions.filter(r => r.professorId === prof.id).length;
                      return (
                        <TouchableOpacity
                          key={prof.id}
                          onPress={() => { sounds.playSelect(); setSelectedProf(prof); }}
                          className="flex-row justify-between items-center py-2.5 px-3 border-b border-white/5 active:bg-white/5"
                        >
                          <View>
                            <Text className="text-white text-xs font-bold">{prof.nome}</Text>
                            <Text className="text-white/40 text-[9px] font-mono">@{prof.nickname || 'sem-nickname'}</Text>
                          </View>
                          <View className="flex-row items-center gap-2">
                            {restrictionsCount > 0 && (
                              <View className="bg-red-500/20 border border-red-500 px-2 py-0.5 rounded-sm">
                                <Text className="text-red-500 text-[8px] font-extrabold font-mono">{restrictionsCount} Bloqueio(s)</Text>
                              </View>
                            )}
                            <Feather name="settings" size={14} color="#00f3ff" />
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Seção 4: Painel do Gerador Monarch Batch (Lote) */}
          <View className="bg-red-950/20 border border-red-500/30 p-6 rounded-sm">
            <View className="flex-row flex-wrap items-center gap-2 mb-3">
              <Text className="text-white text-sm font-extrabold uppercase font-mono tracking-wide">🔥 Monarch Engine: Geração em Lote</Text>
              <View className="bg-red-500/20 border border-red-500 px-1.5 py-0.5 rounded-sm">
                <Text className="text-red-500 text-[8px] font-extrabold font-mono">MONARCH BATCH v3.0</Text>
              </View>
            </View>

            <Text className="text-white/60 text-xs font-mono mb-6 leading-4">
              Ao gerar em lote, o motor Monarch processará de forma coordenada **todas as turmas com matérias configuradas** para o turno <Text className="text-neonBlue">{selectedShift}</Text>. 
              O sistema calcula em tempo real os horários cruzados, respeita as restrições individuais de dias/aulas de cada professor, e garante a conformidade com as regras do MEC de regência docente semanal (teto de aulas/semana)!
            </Text>

            {/* Listagem de Turmas Elegíveis no Turno */}
            <Text className="text-white/40 text-[9px] font-mono mb-2.5 uppercase tracking-wider">Turmas Elegíveis para Geração Simultânea:</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {turmas.map(t => (
                <View key={t.id} className="bg-black/50 border border-white/10 px-3 py-1.5 rounded-sm flex-row items-center gap-1.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-neonBlue" />
                  <Text className="text-white/80 text-xs font-bold font-mono">{t.nome}</Text>
                </View>
              ))}
            </View>

            {/* Botão de Geração em Lote Premium */}
            <CyberSubmitButton
              title={`Iniciar Geração em Lote (${selectedShift})`}
              loadingTitle="Forjando Lote..."
              loading={loadingBatchGenerate}
              variant="danger"
              onPress={() => {
                sounds.playSelect();
                showAlert(
                  'Confirmar Geração em Lote',
                  `Deseja iniciar a geração das grades de TODAS as turmas do turno ${selectedShift}? As grades anteriores desse turno serão limpas e refeitas resolvendo todos os conflitos.`,
                  'warning',
                  [
                    { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
                    { 
                      text: '🔥 Gerar Tudo em Lote', 
                      onPress: () => handleBatchGenerateTimetable(selectedShift) 
                    }
                  ]
                );
              }}
              textClassName="text-xs tracking-widest font-mono font-extrabold"
            />
          </View>
        </View>
      ) : (
        <>
          {/* Seleção de Turno */}
          <Text className="text-white/50 text-[10px] uppercase font-bold mb-2">1. Selecione o Turno da Aula:</Text>
          <View className="flex-row gap-2 mb-6">
            {(['MATUTINO', 'VESPERTINO', 'NOTURNO'] as const).map(shift => (
              <TouchableOpacity
                key={shift}
                onPress={() => { setSelectedShift(shift); sounds.playSelect(); }}
                className={`flex-1 py-2.5 rounded-sm border items-center justify-center ${selectedShift === shift ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/10'}`}
              >
                <Text className={`text-xs font-bold font-mono ${selectedShift === shift ? 'text-white' : 'text-neonBlue/40'}`}>
                  {shift}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Configurações Customizáveis de Horários do Turno */}
          <View className="bg-neonBlue/5 border border-neonBlue/20 p-4 rounded-sm mb-6">
            <Text className="text-white text-xs font-extrabold uppercase font-mono tracking-wide mb-3">🛠️ Parâmetros do Turno {selectedShift}</Text>
            
            <View className="flex-row justify-between items-center gap-4 flex-wrap">
              <View className="flex-1 min-w-[120px]">
                <Text className="text-white/40 text-[9px] font-mono mb-1.5 uppercase">Aulas por Turno:</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity 
                    onPress={() => { sounds.playSelect(); setSlotsCount(prev => Math.max(4, prev - 1)); }} 
                    className="bg-black/40 border border-neonBlue/30 w-8 h-8 rounded-sm items-center justify-center active:bg-neonBlue/10"
                  >
                    <Text className="text-neonBlue font-mono font-bold">-</Text>
                  </TouchableOpacity>
                  <Text className="text-white font-mono font-bold text-sm w-6 text-center">{slotsCount}</Text>
                  <TouchableOpacity 
                    onPress={() => { sounds.playSelect(); setSlotsCount(prev => Math.min(6, prev + 1)); }} 
                    className="bg-black/40 border border-neonBlue/30 w-8 h-8 rounded-sm items-center justify-center active:bg-neonBlue/10"
                  >
                    <Text className="text-neonBlue font-mono font-bold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-1 min-w-[120px]">
                <Text className="text-white/40 text-[9px] font-mono mb-1.5 uppercase">Intervalo após a Aula:</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity 
                    onPress={() => { sounds.playSelect(); setIntervalAfterSlot(prev => Math.max(2, prev - 1)); }} 
                    className="bg-black/40 border border-neonBlue/30 w-8 h-8 rounded-sm items-center justify-center active:bg-neonBlue/10"
                  >
                    <Text className="text-neonBlue font-mono font-bold">-</Text>
                  </TouchableOpacity>
                  <Text className="text-white font-mono font-bold text-sm w-6 text-center">{intervalAfterSlot}ª</Text>
                  <TouchableOpacity 
                    onPress={() => { sounds.playSelect(); setIntervalAfterSlot(prev => Math.min(slotsCount - 1, prev + 1)); }} 
                    className="bg-black/40 border border-neonBlue/30 w-8 h-8 rounded-sm items-center justify-center active:bg-neonBlue/10"
                  >
                    <Text className="text-neonBlue font-mono font-bold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={async () => {
                  sounds.playSelect();
                  await handleSaveShiftSetting(selectedShift, slotsCount, intervalAfterSlot);
                }}
                className="bg-neonBlue/20 border border-neonBlue px-4 py-2.5 rounded-sm active:bg-neonBlue/40 self-end"
              >
                {loadingShifts ? (
                  <ActivityIndicator size="small" color="#00f3ff" />
                ) : (
                  <Text className="text-neonBlue text-[10px] font-extrabold font-mono uppercase tracking-wider">Aplicar Config</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Switcher toggle de restrições de professores */}
          <View className="bg-black/40 border border-white/5 p-4 rounded-sm mb-6 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-white text-xs font-bold uppercase font-mono tracking-wide">⚠️ Restrições de Agenda de Professores</Text>
              <Text className="text-white/40 text-[9px] font-mono mt-1 leading-3">
                Ative para configurar quais dias e turnos os professores não podem ministrar aulas na instituição.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { sounds.playSelect(); setShowRestrictions(!showRestrictions); }}
              style={{ width: 44, height: 22, borderRadius: 11, borderWidth: 1, borderColor: showRestrictions ? '#ef4444' : 'rgba(255,255,255,0.2)', backgroundColor: showRestrictions ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.4)', padding: 2, justifyContent: 'center' }}
            >
              <View 
                style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: 8, 
                  backgroundColor: showRestrictions ? '#ef4444' : 'rgba(255,255,255,0.4)',
                  alignSelf: showRestrictions ? 'flex-end' : 'flex-start' 
                }} 
              />
            </TouchableOpacity>
          </View>

          {/* Seção de Restrições de Professores */}
          {showRestrictions && (
            <View className="bg-red-500/5 border border-red-500/20 p-4 rounded-sm mb-6">
              <Text className="text-red-500 text-xs font-extrabold uppercase font-mono tracking-wider mb-3">📋 Listagem de Professores da Escola</Text>
              
              <View className="flex-row items-center border border-white/10 bg-black/40 px-3 rounded-sm mb-4">
                <Feather name="search" size={14} color="#ffffff30" />
                <TextInput
                  value={profSearch}
                  onChangeText={setProfSearch}
                  placeholder="Buscar professor por nome ou matrícula..."
                  placeholderTextColor="#ffffff30"
                  className="flex-1 text-white text-xs font-mono py-2 ml-2"
                />
              </View>

              <ScrollView nestedScrollEnabled={true} className="max-h-40 border border-white/5 bg-black/20 rounded-sm">
                {filteredProfessors.length === 0 ? (
                  <Text className="text-white/20 text-center text-[10px] font-mono py-4">Nenhum professor cadastrado ou encontrado.</Text>
                ) : (
                  filteredProfessors.map(prof => {
                    const restrictionsCount = professorRestrictions.filter(r => r.professorId === prof.id).length;
                    return (
                      <TouchableOpacity
                        key={prof.id}
                        onPress={() => { sounds.playSelect(); setSelectedProf(prof); }}
                        className="flex-row justify-between items-center py-2 px-3 border-b border-white/5 active:bg-white/5"
                      >
                        <View>
                          <Text className="text-white text-xs font-bold">{prof.nome}</Text>
                          <Text className="text-white/40 text-[9px] font-mono">Matrícula: {prof.matricula}</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          {restrictionsCount > 0 && (
                            <View className="bg-red-500/20 border border-red-500 px-2 py-0.5 rounded-sm">
                              <Text className="text-red-500 text-[8px] font-extrabold font-mono">{restrictionsCount} Bloqueio(s)</Text>
                            </View>
                          )}
                          <Feather name="settings" size={14} color="#00f3ff" />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {/* Configuração de Carga Horária / Matriz Curricular (Monarch v3) */}
          <View className="border border-neonBlue/20 bg-black/40 rounded-sm mb-6 overflow-hidden">
            <TouchableOpacity
              onPress={() => { sounds.playSelect(); setShowCurriculumConfig(!showCurriculumConfig); }}
              className="flex-row justify-between items-center bg-neonBlue/5 px-4 py-3"
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-white text-xs font-extrabold uppercase font-mono tracking-wider">🎯 2. Matriz Curricular & Carga</Text>
                <View className="bg-neonBlue/20 border border-neonBlue px-1.5 py-0.5 rounded-sm">
                  <Text className="text-neonBlue text-[8px] font-extrabold font-mono">MONARCH v3.0</Text>
                </View>
              </View>
              <Feather name={showCurriculumConfig ? "chevron-up" : "chevron-down"} size={16} color="#00f3ff" />
            </TouchableOpacity>

            {showCurriculumConfig && (
              <View className="p-4 border-t border-white/5 bg-black/60">
                <Text className="text-white/40 text-[9px] font-mono mb-4 leading-3">
                  Defina a quantidade de aulas semanais alvo e se devem ser geminadas para cada disciplina. Caso deixe em <Text className="text-neonBlue">0</Text>, o Monarch Engine aplicará os defaults da Matriz Curricular Brasileira (LDB/MEC).
                </Text>

                {disciplinaConfig.length === 0 ? (
                  <Text className="text-white/20 text-center text-[10px] font-mono py-2">Carregando disciplinas...</Text>
                ) : (
                  <View className="gap-2.5">
                    {disciplinaConfig.map((item, idx) => (
                      <View key={item.disciplinaId} className="flex-row items-center justify-between bg-white/5 border border-white/5 p-2.5 rounded-sm">
                        <View className="flex-1 pr-2">
                          <Text className="text-white text-xs font-bold font-mono">{item.disciplinaNome}</Text>
                          <Text className="text-white/30 text-[8px] uppercase tracking-wider mt-0.5">Vínculo ativo</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                          {/* Aulas Semanais Input */}
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-white/40 text-[9px] font-mono">Aulas/Sem:</Text>
                            <TextInput
                              keyboardType="numeric"
                              value={String(item.aulasSemanais)}
                              onChangeText={(val) => {
                                const newConfigs = [...disciplinaConfig];
                                newConfigs[idx].aulasSemanais = Math.max(0, Math.min(25, parseInt(val) || 0));
                                setDisciplinaConfig(newConfigs);
                              }}
                              className="w-10 bg-black/80 border border-neonBlue/30 text-neonBlue text-center text-xs font-extrabold font-mono py-0.5 rounded-sm"
                            />
                          </View>
                          {/* Geminada Toggle */}
                          <TouchableOpacity
                            onPress={() => {
                              sounds.playSelect();
                              const newConfigs = [...disciplinaConfig];
                              newConfigs[idx].geminada = !newConfigs[idx].geminada;
                              setDisciplinaConfig(newConfigs);
                            }}
                            className={`px-2 py-1 border rounded-sm ${item.geminada ? 'bg-[#00f3ff]/20 border-[#00f3ff]' : 'bg-black/50 border-white/10'}`}
                          >
                            <Text className={`text-[8px] font-extrabold font-mono ${item.geminada ? 'text-white' : 'text-white/30'}`}>
                              {item.geminada ? '♊ GEMINADA' : 'UMA AULA'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity
                      onPress={() => {
                        sounds.playSelect();
                        handleSaveDisciplinaConfig(timetableTurmaId);
                      }}
                      className="bg-neonBlue/10 border border-neonBlue py-2 rounded-sm items-center active:bg-neonBlue/20 mt-2"
                    >
                      <Text className="text-neonBlue text-xs font-extrabold uppercase font-mono tracking-widest">Salvar Configuração</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Gerador de Grade Automática (Monarch Engine) */}
          <View className="bg-neonBlue/5 border border-neonBlue/20 p-4 rounded-sm mb-6">
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-white text-xs font-extrabold uppercase font-mono tracking-wide">⚡ Monarch Engine v3.0</Text>
              <View className="bg-neonBlue/20 border border-neonBlue/50 px-1 py-0.5 rounded-sm">
                <Text className="text-neonBlue text-[8px] font-extrabold font-mono">CSP SOLVER</Text>
              </View>
            </View>
            <Text className="text-white/40 text-[9px] font-mono mb-4 leading-3">
              Gere a grade horária completa do turno <Text className="text-white">{selectedShift}</Text>. O motor respeita automaticamente a LDB brasileira, o intervalo do recreio, os bloqueios e o limite cross-turma semanal de carga de cada professor!
            </Text>

            <View className="flex-col gap-2.5">
              {/* Botão Turma Única */}
              <TouchableOpacity
                onPress={() => {
                  sounds.playSelect();
                  showAlert(
                    'Confirmar Monarch Engine',
                    `Deseja gerar a grade horária completa e automática para esta turma no turno ${selectedShift}? Todos os horários antigos deste turno nesta turma serão substituídos.`,
                    'warning',
                    [
                      { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
                      { 
                        text: '⚡ Gerar Grade', 
                        onPress: () => handleAutoGenerateTimetable(selectedShift) 
                      }
                    ]
                  );
                }}
                className="bg-neonBlue/10 border border-neonBlue py-3.5 rounded-sm active:bg-neonBlue/20 items-center justify-center"
              >
                <Text className="text-neonBlue text-[11px] font-extrabold font-mono uppercase tracking-wider">
                  ⚡ Gerar Grade (Turma)
                </Text>
              </TouchableOpacity>

              {/* Botão Batch Generate (Lote) */}
              <CyberSubmitButton
                title="🔥 Gerar Lote (Turno)"
                loadingTitle="Gerando..."
                loading={loadingBatchGenerate}
                variant="danger"
                className="py-3"
                textClassName="text-[11px] font-extrabold font-mono tracking-wider"
                onPress={() => {
                    sounds.playSelect();
                    showAlert(
                      'Confirmar Monarch Batch',
                      `Deseja gerar as grades horárias de TODAS as turmas do turno ${selectedShift} simultaneamente? O motor resolverá todos os conflitos de professores e choque de horários cruzados automaticamente!`,
                      'warning',
                      [
                        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
                        { 
                          text: '🔥 Gerar em Lote', 
                          onPress: () => handleBatchGenerateTimetable(selectedShift) 
                        }
                      ]
                    );
                  }}
                />
              </View>
            </View>

          {/* Seleção rápida de matéria para clicar e programar na grade (Movido para proximidade da grade) */}
          <Text className="text-white/50 text-[10px] uppercase font-bold mb-2">2. Escolha a Matéria para Inserir:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 8 }}>
            <View className="flex-row gap-2">
              {allDisciplinasList.map(d => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => { setSelectedTimetableDisciplinaId(d.id); sounds.playSelect(); }}
                  className={`px-3 py-2 rounded-sm border ${selectedTimetableDisciplinaId === d.id ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/50 border-neonBlue/10'}`}
                >
                  <Text className={`text-xs font-mono ${selectedTimetableDisciplinaId === d.id ? 'text-white' : 'text-neonBlue/40'}`}>
                    {d.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text className="text-white/50 text-[10px] uppercase font-bold mb-3">3. Toque no Horário desejado na Grade para salvar:</Text>

          {loadingTimetable ? (
            <ActivityIndicator color="#00f3ff" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
              <View className="border border-neonBlue/30 p-2 bg-black/40 rounded-sm">
                {/* Header */}
                <View className="flex-row border-b border-neonBlue/30 pb-2">
                  <View className="w-16 items-center justify-center"><Text className="text-white/50 text-[9px] font-bold">HORÁRIO</Text></View>
                  {['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'].map(day => (
                    <View key={day} className="w-24 items-center justify-center">
                      <Text className="text-neonBlue font-mono text-[9px] font-bold">{day}</Text>
                    </View>
                  ))}
                </View>

                {/* Slots do turno selecionado */}
                {Array.from({ length: slotsCount }).map((_, index) => {
                  const pos = index + 1;
                  // Calcular posição absoluta no banco de dados baseado no turno selecionado
                  const absolutePos = selectedShift === 'MATUTINO' 
                    ? pos 
                    : selectedShift === 'VESPERTINO' 
                    ? pos + 10 
                    : pos + 20;

                  return (
                    <React.Fragment key={pos}>
                      <View className="flex-row border-b border-white/5 py-2 items-center">
                        <View className="w-16 items-center justify-center">
                          <Text className="text-white/70 text-xs font-bold font-mono">{pos}º Horário</Text>
                        </View>
                        {['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'].map(day => {
                          const slot = timetableSlots.find(s => s.diaSemana === day && s.posicao === absolutePos);
                          const professor = slot?.professor;
                          const professorText = professor ? (professor.nickname || professor.nome) : '';
                          const hasNoProfessor = slot && !professor;

                          return (
                            <TouchableOpacity
                              key={day}
                              onPress={() => {
                                sounds.playSelect();
                                if (slot) {
                                  const options: any[] = [
                                    { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
                                    {
                                      text: 'Remover Aula',
                                      style: 'destructive',
                                      onPress: () => handleDeleteTimetableSlot(day, absolutePos, slot.disciplina?.nome || 'Matéria')
                                    }
                                  ];
                                  if (selectedTimetableDisciplinaId) {
                                    options.push({
                                      text: 'Alterar Aula',
                                      onPress: () => handleSaveTimetableSlot(day, absolutePos, selectedTimetableDisciplinaId)
                                    });
                                  }
                                  showAlert(
                                    'Gerenciar Horário',
                                    `Este horário já possui a aula de "${slot.disciplina?.nome || 'Matéria'}". O que deseja fazer?`,
                                    'info',
                                    options
                                  );
                                } else {
                                  if (!selectedTimetableDisciplinaId) {
                                    showAlert('Aviso', 'Selecione uma matéria acima primeiro!', 'warning');
                                    return;
                                  }
                                  handleSaveTimetableSlot(day, absolutePos, selectedTimetableDisciplinaId);
                                }
                              }}
                              className={`w-24 h-12 m-1 border rounded-sm items-center justify-center p-1 ${
                                slot 
                                  ? hasNoProfessor 
                                    ? 'bg-yellow-500/10 border-yellow-500/50' 
                                    : 'bg-neonBlue/10 border-neonBlue/30' 
                                  : 'bg-black/80 border-dashed border-white/10'
                              }`}
                            >
                              {slot ? (
                                <>
                                  <Text className={`font-bold text-[8.5px] text-center uppercase tracking-tighter ${hasNoProfessor ? 'text-yellow-500' : 'text-white'}`} numberOfLines={2}>
                                    {abbreviateSubjectName(slot.disciplina.nome)}
                                  </Text>
                                  <Text className={`text-[7px] font-mono text-center mt-0.5 ${hasNoProfessor ? 'text-yellow-500/60 font-bold' : 'text-white/40'}`} numberOfLines={1}>
                                    {hasNoProfessor ? '⚠️ Sem mestre' : professorText}
                                  </Text>
                                </>
                              ) : (
                                <Text className="text-white/30 font-bold text-[10px] text-center uppercase tracking-tighter">
                                  + Adicionar
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Exibir marcador de recreio/intervalo */}
                      {pos === intervalAfterSlot && (
                        <View className="flex-row bg-neonBlue/10 border-y border-neonBlue/20 py-1.5 justify-center items-center">
                          <Feather name="coffee" size={12} color="#00f3ff" />
                          <Text className="text-neonBlue text-[8px] font-extrabold uppercase font-mono tracking-widest ml-1.5">
                            ☕ INTERVALO PEDAGÓGICO DE RECREIO
                          </Text>
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </>
      )}

      {/* Modal de Restrições Absoluto Inlined (Pure Inline Styles to avoid any React Navigation theme context dissociation) */}
      {selectedProf !== null && (
        <View 
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
        >
          <View style={{ backgroundColor: '#0b132b', borderWidth: 2, borderColor: 'rgba(239,68,68,0.5)', padding: 24, borderRadius: 4, width: '100%', maxWidth: 512, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(239,68,68,0.2)', paddingBottom: 16, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 2 }}>
                  ⚠️ RESTRIÇÃO DIMENSIONAL
                </Text>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>{selectedProf.nome}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}>Turno Atual: {selectedShift} • Matrícula: {selectedProf.matricula}</Text>
              </View>
              <TouchableOpacity onPress={() => { sounds.playSelect(); setSelectedProf(null); }} style={{ padding: 4 }}>
                <Text style={{ fontSize: 24, color: '#ef4444', lineHeight: 28 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'monospace', marginBottom: 16, lineHeight: 16 }}>
              Defina bloqueios de agenda do professor para o turno **{selectedShift}**. Você pode bloquear o **Turno Inteiro** ou **Slots de Aulas Específicas**.
            </Text>

            {/* Grid de Seleção */}
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ marginBottom: 24 }} contentContainerStyle={{ paddingHorizontal: 8 }}>
              <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden', minWidth: 400 }}>
                {/* Header do Grid */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 12 }}>
                  <View style={{ width: 64 }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>Dia</Text></View>
                  <View style={{ width: 80, alignItems: 'center' }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>Turno Inteiro</Text></View>
                  {Array.from({ length: slotsCount }).map((_, index) => (
                    <View key={index} style={{ flex: 1, minWidth: 45, alignItems: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>{index + 1}º Hor.</Text>
                    </View>
                  ))}
                </View>

                {/* Linhas do Grid */}
                {DAYS.map(day => {
                  const wholeShiftBlocked = isWholeShiftBlocked(day);
                  return (
                    <View key={day} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
                      <View style={{ width: 64 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>{DAY_LABELS[day]}</Text>
                      </View>

                      {/* Turno Inteiro Toggle */}
                      <TouchableOpacity
                        onPress={() => toggleWholeShift(day)}
                        style={{
                          width: 80,
                          paddingVertical: 10,
                          marginHorizontal: 4,
                          borderRadius: 2,
                          borderWidth: 1,
                          borderColor: wholeShiftBlocked ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.05)',
                          backgroundColor: wholeShiftBlocked ? 'rgba(239,68,68,0.3)' : 'rgba(0,0,0,0.4)',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 8, fontWeight: '800', fontFamily: 'monospace', color: wholeShiftBlocked ? '#f87171' : 'rgba(255,255,255,0.3)' }}>
                          {wholeShiftBlocked ? 'BLOQUEADO' : 'LIBERADO'}
                        </Text>
                      </TouchableOpacity>

                      {/* Slots de Aulas Específicas */}
                      {Array.from({ length: slotsCount }).map((_, index) => {
                        const pos = index + 1;
                        const absolutePos = getAbsolutePos(pos);
                        const blocked = isSlotBlocked(day, absolutePos);
                        return (
                          <TouchableOpacity
                            key={pos}
                            onPress={() => toggleSlot(day, pos)}
                            style={{
                              flex: 1,
                              minWidth: 45,
                              marginHorizontal: 4,
                              paddingVertical: 10,
                              borderRadius: 2,
                              borderWidth: 1,
                              borderColor: blocked ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.05)',
                              backgroundColor: blocked ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.4)',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Text style={{ fontSize: 11, color: blocked ? '#ef4444' : 'rgba(255,255,255,0.1)' }}>{blocked ? '●' : '○'}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Ações */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => { sounds.playSelect(); setSelectedProf(null); }}
                style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 2, alignItems: 'center' }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveRestrictions}
                disabled={loadingRestrictions}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(239,68,68,0.2)',
                  borderWidth: 1,
                  borderColor: '#ef4444',
                  paddingVertical: 12,
                  borderRadius: 2,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {loadingRestrictions ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Text style={{ color: '#ef4444', fontSize: 14, marginRight: 4 }}>🛡</Text>
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800', fontFamily: 'monospace' }}>Salvar Bloqueios</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      )}
    </View>
  );
}
