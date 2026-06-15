import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';

interface MateriasTabProps {
  newDisciplinaNome: string;
  setNewDisciplinaNome: (val: string) => void;
  loadingDisciplinas: boolean;
  handleCreateDisciplina: () => void;
  masters: any[];
  selectedProfessorId: string;
  setSelectedProfessorId: (val: string) => void;
  allDisciplinasList: any[];
  selectedDisciplinaId: string;
  setSelectedDisciplinaId: (val: string) => void;
  turmas: any[];
  selectedLinkTurmaIds: string[];
  setSelectedLinkTurmaIds: (val: string[]) => void;
  handleToggleLinkTurma: (id: string) => void;
  isLinkTemp: boolean;
  setIsLinkTemp: (val: boolean) => void;
  handleLinkProfessor: () => void;
  aulasSemanais: string;
  setAulasSemanais: (val: string) => void;
  editingDisciplinaId: string | null;
  setEditingDisciplinaId: (val: string | null) => void;
  editingDisciplinaNome: string;
  setEditingDisciplinaNome: (val: string) => void;
  handleUpdateDisciplina: () => void;
  handleDeleteDisciplina: (id: string) => void;
  handleUnlinkProfessor: (profId: string, discId: string) => void;
  sounds: any;
}

export function MateriasTab({
  newDisciplinaNome,
  setNewDisciplinaNome,
  loadingDisciplinas,
  handleCreateDisciplina,
  masters,
  selectedProfessorId,
  setSelectedProfessorId,
  allDisciplinasList,
  selectedDisciplinaId,
  setSelectedDisciplinaId,
  turmas,
  selectedLinkTurmaIds,
  setSelectedLinkTurmaIds,
  handleToggleLinkTurma,
  isLinkTemp,
  setIsLinkTemp,
  handleLinkProfessor,
  aulasSemanais,
  setAulasSemanais,
  editingDisciplinaId,
  setEditingDisciplinaId,
  editingDisciplinaNome,
  setEditingDisciplinaNome,
  handleUpdateDisciplina,
  handleDeleteDisciplina,
  handleUnlinkProfessor,
  sounds,
}: MateriasTabProps) {
  const firstSelectedTurmaId = selectedLinkTurmaIds[0];
  const firstSelectedTurma = turmas.find(t => t.id === firstSelectedTurmaId);
  const activeLevel = firstSelectedTurma ? (firstSelectedTurma.nivel || 'FUNDAMENTAL') : null;

  const cleanNormalize = (name: string): string => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const filteredDisciplinas = allDisciplinasList;

  // PAINEL DE CARGA HORÁRIA DO MESTRE (CÁLCULO EM TEMPO REAL)
  const selectedTeacher = masters.find(m => m.id === selectedProfessorId);
  const teacherMax = selectedTeacher?.maxAulasSemanais ?? 16;
  const selectedDisc = allDisciplinasList.find(d => d.id === selectedDisciplinaId);

  const getSubjectDefaultHours = (name: string): number => {
    const clean = cleanNormalize(name);
    if (clean.includes("portugues") || clean.includes("matematica")) return 5;
    if (clean.includes("historia") || clean.includes("geografia") || clean.includes("ciencia") || clean.includes("biologia")) return 3;
    if (clean.includes("ingles") || clean.includes("ed") || clean.includes("fisica") || clean.includes("quimica")) return 2;
    if (clean.includes("arte") || clean.includes("filosofia") || clean.includes("relig") || clean.includes("sociologia")) return 1;
    return 2;
  };

  // Calcular carga alocada em OUTRAS disciplinas
  let allocatedOtherHours = 0;
  allDisciplinasList.forEach(d => {
    if (d.id !== selectedDisciplinaId) {
      const profLink = d.professores?.find((p: any) => p.id === selectedProfessorId);
      if (profLink && Array.isArray(profLink.turmas)) {
        profLink.turmas.forEach((t: any) => {
          allocatedOtherHours += (t.aulasSemanais && t.aulasSemanais > 0) ? t.aulasSemanais : getSubjectDefaultHours(d.nome);
        });
      }
    }
  });

  const currentSubjectWeight = Number(aulasSemanais) > 0 
    ? Number(aulasSemanais) 
    : (selectedDisc ? getSubjectDefaultHours(selectedDisc.nome) : 2);
  const proposedNewHours = selectedLinkTurmaIds.length * currentSubjectWeight;
  const totalCalculatedHours = allocatedOtherHours + proposedNewHours;
  const workloadExceeded = totalCalculatedHours > teacherMax;

  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">Manejo de Disciplinas</Text>

      {/* Criar Matéria */}
      <View className="mb-6 bg-black/40 border border-neonBlue/20 p-4 rounded-sm">
        <Text className="text-white font-bold uppercase text-xs tracking-wider mb-3">Criar Nova Disciplina</Text>
        <TextInput
          placeholder="Nome da matéria (ex: Química)"
          placeholderTextColor="#ffffff33"
          value={newDisciplinaNome}
          onChangeText={setNewDisciplinaNome}
          className="w-full bg-black/60 border border-neonBlue/30 text-white px-4 py-3 rounded-sm text-sm mb-4"
          keyboardAppearance="dark"
        />
        <CyberSubmitButton
          title="Criar Disciplina"
          loadingTitle="Criando..."
          loading={loadingDisciplinas}
          onPress={handleCreateDisciplina}
          textClassName="text-xs"
        />
      </View>

      {/* Vincular Professor */}
      <View className="mb-6 bg-black/40 border border-neonBlue/20 p-4 rounded-sm">
        <Text className="text-white font-bold uppercase text-xs tracking-wider mb-3">Vincular Professor a Matéria</Text>
        
        {/* Turma Selector (Primeira Posição - Filtro & Associação Múltipla) */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">1. Selecionar Turmas Alvo (Filtro Inteligente de Nível):</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ paddingHorizontal: 8 }}>
          <View className="flex-row gap-2">
            {turmas.map(t => {
              const isSelected = selectedLinkTurmaIds.includes(t.id);
              const levelBadge = t.nivel === 'FUNDAMENTAL' ? 'F' : (t.nivel === 'MEDIO' ? 'M' : 'T');
              
              // Disabled if another class of a different level is already selected!
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

        {/* Disciplina Selector (Segunda Posição) */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">2. Selecionar Disciplina:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ paddingHorizontal: 8 }}>
          <View className="flex-row gap-2">
            {filteredDisciplinas.map(d => (
              <TouchableOpacity
                key={d.id}
                onPress={() => { setSelectedDisciplinaId(d.id); sounds.playSelect(); }}
                className={`px-3 py-2 rounded-sm border ${selectedDisciplinaId === d.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                activeOpacity={0.7}
              >
                <Text className={`text-xs font-mono ${(selectedDisciplinaId === d.id) ? 'text-white' : 'text-neonBlue/40'}`}>
                  {d.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Professor Selector (Terceira Posição) */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">3. Selecionar Professor:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 8 }}>
          <View className="flex-row gap-2">
            {masters.map(m => (
              <TouchableOpacity
                key={m.id}
                onPress={() => { setSelectedProfessorId(m.id); sounds.playSelect(); }}
                className={`px-3 py-2 rounded-sm border ${selectedProfessorId === m.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                activeOpacity={0.7}
              >
                <Text className={`text-xs font-mono ${(selectedProfessorId === m.id) ? 'text-white' : 'text-neonBlue/40'}`}>
                  {m.nickname || m.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

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

        {/* Aulas Semanais Input */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">4. Quantidade de Aulas Semanais (0 = automático):</Text>
        <TextInput
          placeholder="Ex: 4"
          placeholderTextColor="#ffffff33"
          value={aulasSemanais}
          onChangeText={setAulasSemanais}
          keyboardType="numeric"
          className="bg-black/60 border border-neonBlue/30 text-white px-4 py-3 rounded-sm text-sm mb-4 font-mono"
          keyboardAppearance="dark"
        />

        {/* Toggle de Vínculo Temporário (TEMP) */}
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
          loading={loadingDisciplinas}
          onPress={handleLinkProfessor}
          textClassName="text-xs"
        />
      </View>

      {/* Listagem */}
      <Text className="text-white/50 text-xs mb-3 uppercase font-bold">Matérias e Vínculos Ativos:</Text>
      {loadingDisciplinas ? (
        <ActivityIndicator color="#00f3ff" />
      ) : filteredDisciplinas.length === 0 ? (
        <Text className="text-white/30 text-center text-sm my-4">Nenhuma matéria cadastrada para este nível.</Text>
      ) : (
        filteredDisciplinas.map(d => (
          <View key={d.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-2">
            {editingDisciplinaId === d.id ? (
              <View className="flex-row items-center gap-2 mb-2">
                <TextInput
                  className="flex-1 bg-black/60 border border-neonBlue text-white text-xs px-3 py-2 rounded-sm font-mono"
                  value={editingDisciplinaNome}
                  onChangeText={setEditingDisciplinaNome}
                  placeholder="Nome da Matéria"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
                <TouchableOpacity
                  onPress={() => { sounds.playSelect(); handleUpdateDisciplina(); }}
                  className="bg-green-950/40 p-2.5 border border-green-500/50 rounded-sm"
                  activeOpacity={0.7}
                >
                  <Feather name="check" size={14} color="#22c55e" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { sounds.playSelect(); setEditingDisciplinaId(null); setEditingDisciplinaNome(''); }}
                  className="bg-red-950/40 p-2.5 border border-red-500/50 rounded-sm"
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-neonBlue font-bold text-sm uppercase tracking-wide">{d.nome}</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      sounds.playSelect();
                      setEditingDisciplinaId(d.id);
                      setEditingDisciplinaNome(d.nome);
                    }}
                    className="bg-neonBlue/10 p-1.5 border border-neonBlue/30 rounded-sm"
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={12} color="#00f3ff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { sounds.playSelect(); handleDeleteDisciplina(d.id); }}
                    className="bg-red-950/20 p-1.5 border border-red-500/30 rounded-sm"
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={12} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View className="mt-2 pl-2 border-l border-neonBlue/20">
              {d.professores.length === 0 ? (
                <Text className="text-white/30 text-xs italic">Nenhum professor vinculado.</Text>
              ) : (
                d.professores.map((p: any) => (
                  <View key={p.id} className="flex-row justify-between items-center py-1 border-b border-white/5">
                    <View className="flex-row items-center gap-2 flex-1 pr-3 flex-wrap">
                      <Text className="text-white text-xs font-mono">🧙‍♂️ {p.nickname || p.nome}</Text>
                      {p.turmas && p.turmas.length > 0 && (
                        <View className="bg-neonBlue/15 border border-neonBlue/30 px-1.5 py-0.5 rounded-sm">
                          <Text className="text-neonBlue text-[9px] font-bold font-mono">
                            {p.turmas.map((t: any) => t.nome).join(', ')}
                          </Text>
                        </View>
                      )}
                      {p.temp && (
                        <View className="bg-red-500/20 border border-red-500/50 px-1.5 py-0.5 rounded-sm">
                          <Text className="text-red-500 text-[8px] font-bold font-mono">TEMP</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => { handleUnlinkProfessor(p.id, d.id); sounds.playSelect(); }}
                      className="p-1"
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
