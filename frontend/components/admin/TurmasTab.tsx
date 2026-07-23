import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';
import { calculateTeacherDemandSummary } from '../../utils/teacherDemand';
import { useWebDragScroll } from '../../hooks/useWebDragScroll';

interface TurmasTabProps {
  turmaNome: string;
  setTurmaNome: (val: string) => void;
  turmaAno: string;
  setTurmaAno: (val: string) => void;
  turmaCodigo: string;
  setTurmaCodigo: (val: string) => void;
  turmaNivel: string;
  setTurmaNivel: (val: string) => void;
  loadingTurma: boolean;
  handleCreateTurma: () => void;
  editingTurmaId: string | null;
  handleEditTurmaPress: (turma: any) => void;
  cancelEditTurma: () => void;
  turmas: any[];
  fetchTurmas: () => void;
  sounds: any;
  handleUpdateUnidade: (turmaId: string, unidade: number) => void;
  currentUser?: any;
  allDisciplinasList?: any[];
  masters?: any[];

  selectedProfessorId?: string;
  setSelectedProfessorId?: (val: string) => void;
  selectedDisciplinaId?: string;
  setSelectedDisciplinaId?: (val: string) => void;
  selectedLinkTurmaIds?: string[];
  setSelectedLinkTurmaIds?: (val: string[]) => void;
  handleToggleLinkTurma?: (id: string) => void;
  isLinkTemp?: boolean;
  setIsLinkTemp?: (val: boolean) => void;
  handleLinkProfessor?: () => void;
  loadingLinkProfessor?: boolean;
  aulasSemanais?: string;
  setAulasSemanais?: (val: string) => void;
  handleUnlinkProfessor?: (profId: string, discId: string) => void;
}

export function TurmasTab({
  turmaNome,
  setTurmaNome,
  turmaAno,
  setTurmaAno,
  turmaCodigo,
  setTurmaCodigo,
  turmaNivel,
  setTurmaNivel,
  loadingTurma,
  handleCreateTurma,
  editingTurmaId,
  handleEditTurmaPress,
  cancelEditTurma,
  turmas,
  fetchTurmas,
  sounds,
  currentUser,
  handleUpdateUnidade,
  allDisciplinasList = [],
  masters = [],

  selectedProfessorId = '',
  setSelectedProfessorId = () => {},
  selectedDisciplinaId = '',
  setSelectedDisciplinaId = () => {},
  selectedLinkTurmaIds = [],
  setSelectedLinkTurmaIds = () => {},
  handleToggleLinkTurma = () => {},
  isLinkTemp = false,
  setIsLinkTemp = () => {},
  handleLinkProfessor = () => {},
  loadingLinkProfessor = false,
  aulasSemanais = '0',
  setAulasSemanais = () => {},
  handleUnlinkProfessor = () => {},
}: TurmasTabProps) {
  const scrollRef1 = useWebDragScroll();
  const scrollRef2 = useWebDragScroll();
  const scrollRef3 = useWebDragScroll();
  const scrollRef4 = useWebDragScroll();

  const instTipo = currentUser?.institution?.tipo || 'MUNICIPAL';
  const showLevelSelector = instTipo === 'PRIVADO';
  const demandSummary = calculateTeacherDemandSummary(turmas, allDisciplinasList, masters);

  const firstSelectedTurmaId = selectedLinkTurmaIds[0];
  const firstSelectedTurma = turmas.find(t => t.id === firstSelectedTurmaId);
  const activeLevel = firstSelectedTurma ? (firstSelectedTurma.nivel || 'FUNDAMENTAL') : null;

  const cleanNormalize = (name: string): string => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const selectedTeacher = masters.find(m => m.id === selectedProfessorId);
  const teacherMax = selectedTeacher?.maxAulasSemanais ?? 16;
  const selectedDisc = allDisciplinasList.find(d => d.id === selectedDisciplinaId);

  const getSubjectDefaultHours = (name: string): number => {
    const cleanSub = cleanNormalize(name);
    let level: 'FUNDAMENTAL' | 'MEDIO_REGULAR' | 'MEDIO_TECNICO' = 'FUNDAMENTAL';
    if (activeLevel === 'MEDIO') level = 'MEDIO_REGULAR';
    else if (activeLevel === 'MEDIO_TECNICO') level = 'MEDIO_TECNICO';

    if (cleanSub.includes("portugues") || cleanSub.includes("lingua portuguesa") || cleanSub.includes("redacao")) {
      return (level === "FUNDAMENTAL") ? 5 : 4;
    }
    if (cleanSub.includes("matematica") || cleanSub.includes("calculo")) {
      if (level === "FUNDAMENTAL") return 5;
      if (level === "MEDIO_REGULAR") return 2;
      return 3;
    }
    if (cleanSub.includes("historia") || cleanSub.includes("geografia") || cleanSub.includes("ciencia") || cleanSub.includes("biologia")) {
      return (level === "FUNDAMENTAL") ? 3 : 2;
    }
    if (cleanSub.includes("fisica") || cleanSub.includes("quimica") || cleanSub.includes("ingles") || cleanSub.includes("ed") || cleanSub.includes("esport")) {
      return 2;
    }
    if (cleanSub.includes("arte") || cleanSub.includes("filosofia") || cleanSub.includes("relig") || cleanSub.includes("sociologia")) {
      return 1;
    }
    return 2;
  };

  let allocatedOtherHours = 0;
  allDisciplinasList.forEach(d => {
    const profLink = d.professores?.find((p: any) => p.id === selectedProfessorId);
    if (profLink && Array.isArray(profLink.turmas)) {
      profLink.turmas.forEach((t: any) => {
        if (d.id === selectedDisciplinaId && selectedLinkTurmaIds.includes(t.id)) {
          return;
        }
        allocatedOtherHours += (t.aulasSemanais && t.aulasSemanais > 0) ? t.aulasSemanais : getSubjectDefaultHours(d.nome);
      });
    }
  });

  const parsedAulas = parseInt((aulasSemanais || '').trim(), 10);
  const currentSubjectWeight = !isNaN(parsedAulas) && parsedAulas > 0 
    ? parsedAulas 
    : (selectedDisc ? getSubjectDefaultHours(selectedDisc.nome) : 2);
  const proposedNewHours = selectedLinkTurmaIds.length * currentSubjectWeight;
  const totalCalculatedHours = allocatedOtherHours + proposedNewHours;
  const workloadExceeded = totalCalculatedHours > teacherMax;

  const scrollList = (ref: React.MutableRefObject<any>, direction: 'left' | 'right') => {
    if (Platform.OS === 'web') {
      const el = ref.current;
      const node = el?.getScrollableNode ? el.getScrollableNode() : el;
      if (node) {
        node.scrollBy({ left: direction === 'left' ? -250 : 250, behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      {/* ─── PAINEL DE DIMENSIONAMENTO E CAPACIDADE DE DOCENTES ────────────────── */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <View className="flex-row items-center justify-between mb-4 border-b border-neonBlue/20 pb-3">
          <View className="flex-row items-center gap-2">
            <Feather name="bar-chart-2" size={18} color="#00f3ff" />
            <Text className="text-white text-base font-bold uppercase tracking-widest">
              Dimensionamento de Docentes por Turma
            </Text>
          </View>
          <View className="bg-neonBlue/15 border border-neonBlue/40 px-2.5 py-1 rounded-sm">
            <Text className="text-neonBlue text-xs font-mono font-bold">
              {turmas.length} {turmas.length === 1 ? 'Turma Ativa' : 'Turmas Ativas'}
            </Text>
          </View>
        </View>

        <Text className="text-white/60 text-xs mb-4">
          Projeção calculada para cobrir a carga semanal de todas as turmas (base de 13h regência por mestre de 20h):
        </Text>

        {/* Resumo Global Metrics Grid */}
        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-black/50 border border-neonBlue/20 p-3 rounded-sm">
            <Text className="text-neonBlue/50 text-[9px] uppercase font-bold tracking-widest mb-1">Aulas Necessárias</Text>
            <Text className="text-white font-mono font-black text-lg">{demandSummary.totalAulasNecessariasGlobal} <Text className="text-xs font-normal text-white/50">aulas/sem</Text></Text>
          </View>
          <View className="flex-1 bg-black/50 border border-neonBlue/20 p-3 rounded-sm">
            <Text className="text-neonBlue/50 text-[9px] uppercase font-bold tracking-widest mb-1">Mestres Projetados</Text>
            <Text className="text-neonBlue font-mono font-black text-lg">{demandSummary.totalProfessoresNecessariosGlobal} <Text className="text-xs font-normal text-neonBlue/50">mestres</Text></Text>
          </View>
          <View className="flex-1 bg-black/50 border border-neonBlue/20 p-3 rounded-sm">
            <Text className="text-neonBlue/50 text-[9px] uppercase font-bold tracking-widest mb-1">Mestres Cadastrados</Text>
            <Text className="text-green-400 font-mono font-black text-lg">{demandSummary.totalProfessoresAlocadosGlobal} <Text className="text-xs font-normal text-green-400/50">cadastrados</Text></Text>
          </View>
        </View>

        {/* Detalhamento por Matéria */}
        <Text className="text-white/50 text-xs uppercase font-bold mb-3 tracking-wider">Necessidade por Disciplina:</Text>
        {demandSummary.subjectsSummary.length === 0 ? (
          <Text className="text-white/30 text-xs italic">Nenhuma disciplina cadastrada para calcular o dimensionamento.</Text>
        ) : (
          <View className="gap-2">
            {demandSummary.subjectsSummary.map((s) => {
              const isOk = s.status === 'OK';
              const isAlert = s.status === 'ALERTA';
              const badgeBg = isOk ? 'bg-green-950/40 border-green-500/50' : (isAlert ? 'bg-yellow-950/40 border-yellow-500/50' : 'bg-red-950/40 border-red-500/50');
              const textBadgeColor = isOk ? 'text-green-400' : (isAlert ? 'text-yellow-400' : 'text-red-400');
              const badgeLabel = isOk ? '🟢 COBERTO' : (isAlert ? `🟡 ${s.aulasDeficit} AULAS PENDENTES` : `🔴 SEM PROFESSOR (-${s.professoresNecessarios} Mestre${s.professoresNecessarios > 1 ? 's' : ''})`);

              return (
                <View key={s.disciplinaId} className="bg-black/50 border border-neonBlue/20 p-3 rounded-sm flex-row justify-between items-center flex-wrap gap-2">
                  <View className="flex-1 min-w-[140px]">
                    <Text className="text-white font-bold text-xs uppercase tracking-wide">{s.disciplinaNome}</Text>
                    <Text className="text-white/50 text-[10px] font-mono mt-0.5">
                      Demanda: <Text className="text-neonBlue font-bold">{s.totalAulasNecessarias} aulas/sem</Text> ({demandSummary.totalTurmas} turmas)
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <View className="items-end">
                      <Text className="text-white/70 text-[11px] font-mono font-bold">
                        Necessários: <Text className="text-neonBlue">{s.professoresNecessarios} {s.professoresNecessarios === 1 ? 'mestre' : 'mestres'}</Text>
                      </Text>
                      <Text className="text-white/40 text-[9px] font-mono">
                        Alocados: {s.professoresAlocadosCount} mestre ({s.aulasAlocadas} aulas)
                      </Text>
                    </View>
                    <View className={`px-2.5 py-1 rounded-sm border ${badgeBg}`}>
                      <Text className={`text-[9px] font-bold font-mono uppercase ${textBadgeColor}`}>{badgeLabel}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ─── VINCULAR PROFESSOR A MATÉRIA E TURMAS ──────────────────────── */}
      <View className="mb-6 bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm">
        <Text className="text-white font-bold uppercase text-sm tracking-wider mb-4">Vincular Professor a Matéria e Turmas</Text>
        
        {/* Professor Selector (1) */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">1. Selecionar Professor:</Text>
        <View className="flex-row items-center mb-4">
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => { sounds.playSelect(); scrollList(scrollRef1, 'left'); }} className="p-2 bg-black/50 border border-neonBlue/20 rounded-sm mr-2 active:bg-neonBlue/20">
              <Feather name="chevron-left" size={16} color="#00f3ff" />
            </TouchableOpacity>
          )}
          <ScrollView ref={scrollRef1} horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingHorizontal: 4 }}>
            <View className="flex-row gap-2">
              {masters.map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => { setSelectedProfessorId(m.id); sounds.playSelect(); }}
                  className={`px-3 py-2 rounded-sm border ${selectedProfessorId === m.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs font-mono ${(selectedProfessorId === m.id) ? 'text-white font-bold' : 'text-neonBlue/40'}`}>
                    {m.nickname || m.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => { sounds.playSelect(); scrollList(scrollRef1, 'right'); }} className="p-2 bg-black/50 border border-neonBlue/20 rounded-sm ml-2 active:bg-neonBlue/20">
              <Feather name="chevron-right" size={16} color="#00f3ff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Disciplina Selector (2) */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">2. Selecionar Disciplina:</Text>
        <View className="flex-row items-center mb-4">
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => { sounds.playSelect(); scrollList(scrollRef2, 'left'); }} className="p-2 bg-black/50 border border-neonBlue/20 rounded-sm mr-2 active:bg-neonBlue/20">
              <Feather name="chevron-left" size={16} color="#00f3ff" />
            </TouchableOpacity>
          )}
          <ScrollView ref={scrollRef2} horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingHorizontal: 4 }}>
            <View className="flex-row gap-2">
              {allDisciplinasList.map(d => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => { setSelectedDisciplinaId(d.id); sounds.playSelect(); }}
                  className={`px-3 py-2 rounded-sm border ${selectedDisciplinaId === d.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs font-mono ${(selectedDisciplinaId === d.id) ? 'text-white font-bold' : 'text-neonBlue/40'}`}>
                    {d.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => { sounds.playSelect(); scrollList(scrollRef2, 'right'); }} className="p-2 bg-black/50 border border-neonBlue/20 rounded-sm ml-2 active:bg-neonBlue/20">
              <Feather name="chevron-right" size={16} color="#00f3ff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Turmas Alvo Selector (3) */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">3. Selecionar Turmas Alvo (Filtro Inteligente de Nível):</Text>
        <View className="flex-row items-center mb-4">
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => { sounds.playSelect(); scrollList(scrollRef3, 'left'); }} className="p-2 bg-black/50 border border-neonBlue/20 rounded-sm mr-2 active:bg-neonBlue/20">
              <Feather name="chevron-left" size={16} color="#00f3ff" />
            </TouchableOpacity>
          )}
          <ScrollView ref={scrollRef3} horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingHorizontal: 4 }}>
            <View className="flex-row gap-2">
              {turmas.map(t => {
                const isSelected = selectedLinkTurmaIds.includes(t.id);
                const levelBadge = t.nivel === 'FUNDAMENTAL' ? 'F' : (t.nivel === 'MEDIO' ? 'M' : 'T');
                const isTapDisabled = activeLevel !== null && (t.nivel || 'FUNDAMENTAL') !== activeLevel;

                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      if (isTapDisabled) return;
                      sounds.playSelect();
                      handleToggleLinkTurma(t.id);
                    }}
                    disabled={isTapDisabled}
                    className={`px-3 py-2 rounded-sm border flex-row items-center gap-1.5 ${
                      isSelected 
                        ? 'bg-neonBlue/20 border-neonBlue' 
                        : (isTapDisabled ? 'bg-black/20 border-white/5 opacity-25' : 'bg-black/50 border-neonBlue/20')
                    }`}
                    activeOpacity={isTapDisabled ? 1 : 0.7}
                  >
                    {isSelected && <Feather name="check-square" size={10} color="#00f3ff" />}
                    <View className={`px-1.5 py-0.5 rounded-sm border ${
                      isSelected 
                        ? 'bg-neonBlue/25 border-neonBlue' 
                        : (isTapDisabled ? 'border-white/10' : 'bg-white/10 border-white/20')
                    }`}>
                      <Text className={`text-[8px] font-bold font-mono ${isTapDisabled ? 'text-white/20' : 'text-white'}`}>{levelBadge}</Text>
                    </View>
                    <Text className={`text-xs font-mono ${
                      isSelected 
                        ? 'text-white font-bold' 
                        : (isTapDisabled ? 'text-white/20' : 'text-neonBlue/40')
                    }`}>
                      {t.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => { sounds.playSelect(); scrollList(scrollRef3, 'right'); }} className="p-2 bg-black/50 border border-neonBlue/20 rounded-sm ml-2 active:bg-neonBlue/20">
              <Feather name="chevron-right" size={16} color="#00f3ff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Painel Real-Time de Carga Horária do Mestre */}
        {selectedTeacher && (() => {
          const contractH = teacherMax === 13 ? 20 : (teacherMax === 26 ? 40 : Math.round(teacherMax * 1.5));
          return (
            <View className="mb-4 bg-black/60 border border-neonBlue/30 p-3 rounded-sm">
              <Text className="text-white text-[10px] font-bold uppercase tracking-wider mb-2">💾 Painel de Carga Horária do Mestre</Text>
              <Text className="text-white/70 text-xs">
                Mestre: <Text className="text-neonBlue font-mono">@{selectedTeacher.nickname || selectedTeacher.nome}</Text>
              </Text>
              <Text className="text-white/70 text-[11px] mt-1">
                Capacidade Limite: <Text className="text-neonBlue font-mono font-bold">{teacherMax} aulas/semana (Contrato: {contractH}h)</Text>
              </Text>
              <Text className="text-white/70 text-[11px] mt-1">
                Alocado em Outras Matérias: <Text className="text-white font-mono">{allocatedOtherHours} aulas</Text>
              </Text>
              {selectedDisc && (
                <Text className="text-white/70 text-[11px] mt-1">
                  Peso de {selectedDisc.nome}: <Text className="text-neonBlue font-mono font-bold">+{currentSubjectWeight} aulas por turma</Text>
                </Text>
              )}
              <View className="mt-2 pt-2 border-t border-neonBlue/15 flex-row justify-between items-center">
                <Text className="text-white text-xs font-bold">Total Proposto:</Text>
                <Text className={`text-sm font-mono font-black ${workloadExceeded ? 'text-red-500' : 'text-green-400'}`}>
                  {totalCalculatedHours} / {teacherMax} aulas
                </Text>
              </View>
              {workloadExceeded && (
                <View className="mt-2 bg-red-950/40 border border-red-500/50 p-2 rounded-sm flex-row items-center gap-2">
                  <Feather name="alert-triangle" size={12} color="#ef4444" />
                  <Text className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Aviso: Carga máxima semanal excedida!</Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Aulas Semanais Selector (0 a 10) */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">4. Quantidade de Aulas Semanais (0 = Padrão da matéria):</Text>
        <View className="flex-row items-center mb-4">
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => { sounds.playSelect(); scrollList(scrollRef4, 'left'); }} className="p-2 bg-black/50 border border-neonBlue/20 rounded-sm mr-2 active:bg-neonBlue/20">
              <Feather name="chevron-left" size={16} color="#00f3ff" />
            </TouchableOpacity>
          )}
          <ScrollView ref={scrollRef4} horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingHorizontal: 4 }}>
            <View className="flex-row gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
                const strVal = String(val);
                const isSelected = (aulasSemanais || '0') === strVal;
                const label = val === 0 ? '0 (Padrão)' : `${val} ${val === 1 ? 'aula' : 'aulas'}`;

                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      setAulasSemanais(strVal);
                      sounds.playSelect();
                    }}
                    className={`px-3 py-2 rounded-sm border ${
                      isSelected ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-xs font-mono ${isSelected ? 'text-white font-bold' : 'text-neonBlue/40'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={() => { sounds.playSelect(); scrollList(scrollRef4, 'right'); }} className="p-2 bg-black/50 border border-neonBlue/20 rounded-sm ml-2 active:bg-neonBlue/20">
              <Feather name="chevron-right" size={16} color="#00f3ff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle Vínculo Temporário (TEMP) */}
        <TouchableOpacity
          onPress={() => { setIsLinkTemp(!isLinkTemp); sounds.playSelect(); }}
          className="flex-row items-center gap-2 mb-4 bg-black/50 border border-neonBlue/20 p-3 rounded-sm"
          activeOpacity={0.7}
        >
          <View className={`w-4 h-4 border border-neonBlue rounded-sm items-center justify-center ${isLinkTemp ? 'bg-neonBlue' : ''}`}>
            {isLinkTemp && <Feather name="check" size={10} color="#000" />}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-white text-xs font-mono font-bold">Marcar como Vínculo Temporário (TEMP)</Text>
            <View className="bg-red-500/20 border border-red-500/50 px-1.5 py-0.5 rounded-sm">
              <Text className="text-red-500 text-[8px] font-bold font-mono">TEMP</Text>
            </View>
          </View>
        </TouchableOpacity>

        <CyberSubmitButton
          title="Salvar Vínculo"
          loadingTitle="Vinculando..."
          loading={loadingLinkProfessor}
          onPress={handleLinkProfessor}
          textClassName="text-xs"
        />
      </View>
      {/* ─── SEÇÃO DE CRIAÇÃO DE TURMAS ────────────────────────────────── */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">
          {editingTurmaId ? 'Transmutar Turma' : 'Forjar Nova Turma'}
        </Text>
        
        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Nome da Turma (Ex: 3º Ano A)"
          placeholderTextColor="#00f3ff40"
          value={turmaNome}
          onChangeText={setTurmaNome}
        />

        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Ano (Ex: 2026)"
          placeholderTextColor="#00f3ff40"
          value={turmaAno}
          onChangeText={setTurmaAno}
          keyboardType="numeric"
        />

        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Código de Invocação (Padrão: 1234)"
          placeholderTextColor="#00f3ff40"
          value={turmaCodigo}
          onChangeText={setTurmaCodigo}
          autoCapitalize="none"
        />

        {showLevelSelector && (
          <>
            <Text className="text-white/50 text-xs mb-2.5 uppercase font-bold font-mono">Nível Acadêmico:</Text>
            <View className="flex-row mb-6 gap-2 flex-wrap">
              {[
                { key: 'FUNDAMENTAL', label: 'Fundamental' },
                { key: 'MEDIO', label: 'Ensino Médio' }
              ].map(lvl => (
                <TouchableOpacity 
                  key={lvl.key} 
                  onPress={() => { setTurmaNivel(lvl.key); sounds.playSelect(); }} 
                  className={`px-3.5 py-2 rounded-sm border ${turmaNivel === lvl.key ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'} items-center`}
                >
                  <Text className={`text-[9px] uppercase font-bold tracking-wider ${turmaNivel === lvl.key ? 'text-white' : 'text-neonBlue/50'}`}>
                    {lvl.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View className="flex-row gap-3">
          {editingTurmaId && (
            <TouchableOpacity 
              className="flex-1 border border-red-500/40 bg-red-500/10 py-3 rounded-sm items-center justify-center"
              onPress={cancelEditTurma}
              disabled={loadingTurma}
            >
              <Text className="text-red-400 font-bold uppercase tracking-widest text-xs">Cancelar</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: editingTurmaId ? 2 : 1 }}>
            <CyberSubmitButton
              title={editingTurmaId ? 'Salvar Alterações' : 'Criar Turma'}
              loadingTitle={editingTurmaId ? 'Salvando...' : 'Criando...'}
              loading={loadingTurma}
              onPress={handleCreateTurma}
              textClassName="text-xs"
            />
          </View>
        </View>
      </View>

      {/* Guilda de Turmas / Classes */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-lg font-bold uppercase tracking-widest">Guilda de Turmas</Text>
          <TouchableOpacity onPress={() => { sounds.playSelect(); fetchTurmas(); }}>
            <Feather name="refresh-cw" size={16} color="#00f3ff" />
          </TouchableOpacity>
        </View>

        {turmas.length === 0 ? (
          <Text className="text-white/30 text-center text-sm py-4">Nenhuma turma forjada ainda.</Text>
        ) : (
          turmas.map((t: any) => (
            <View key={t.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-1 pr-2">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>{t.nome}</Text>
                  <Text className="text-neonBlue/70 text-xs mt-1" numberOfLines={1}>
                    Ano: {t.ano} · Código: {t.codigoInvocacao || 'sem código'} · Nível: {t.nivel || 'FUNDAMENTAL'}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => handleEditTurmaPress(t)}
                    className="bg-neonBlue/10 border border-neonBlue/30 p-1.5 rounded-sm"
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={12} color="#00f3ff" />
                  </TouchableOpacity>
                  <View className="bg-neonBlue/10 border border-neonBlue/30 px-2 py-1.5 rounded-sm">
                    <Text className="text-neonBlue font-bold text-[10px] uppercase">Unidade {t.unidade || 1}</Text>
                  </View>
                </View>
              </View>

              {/* Unidade Selector Grid */}
              <View className="flex-row items-center justify-between border-t border-neonBlue/10 pt-3">
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Definir Unidade:</Text>
                <View className="flex-row gap-1">
                  {[1, 2, 3].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => { handleUpdateUnidade(t.id, unit); sounds.playSelect(); }}
                      className={`w-8 h-8 rounded-sm items-center justify-center border ${
                        (t.unidade || 1) === unit
                          ? 'bg-neonBlue/30 border-neonBlue'
                          : 'bg-black/50 border-neonBlue/20'
                      }`}
                    >
                      <Text className={`font-bold text-xs ${(t.unidade || 1) === unit ? 'text-white' : 'text-neonBlue/50'}`}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
}
