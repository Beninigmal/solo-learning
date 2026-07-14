import React from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';
import { useWebDragScroll } from '../../hooks/useWebDragScroll';

interface MateriasTabProps {
  currentUserRole: string;
  disciplinas: any[];
  allDisciplinasList: any[];
  masters: any[];
  newDisciplinaNome: string;
  setNewDisciplinaNome: (name: string) => void;
  loadingDisciplinas: boolean;
  selectedProfessorId: string | null;
  setSelectedProfessorId: (id: string | null) => void;
  selectedDisciplinaId: string | null;
  setSelectedDisciplinaId: (id: string | null) => void;
  isLinkTemp: boolean;
  setIsLinkTemp: (isTemp: boolean) => void;
  handleCreateDisciplina: () => void;
  handleLinkProfessor: () => void;
  handleUnlinkProfessor: (profId: string, discId: string) => void;
  sounds: any;
}

export const MateriasTab: React.FC<MateriasTabProps> = ({
  currentUserRole,
  disciplinas,
  allDisciplinasList,
  masters,
  newDisciplinaNome,
  setNewDisciplinaNome,
  loadingDisciplinas,
  selectedProfessorId,
  setSelectedProfessorId,
  selectedDisciplinaId,
  setSelectedDisciplinaId,
  isLinkTemp,
  setIsLinkTemp,
  handleCreateDisciplina,
  handleLinkProfessor,
  handleUnlinkProfessor,
  sounds,
}) => {
  const scrollRef1 = useWebDragScroll();
  const scrollRef2 = useWebDragScroll();

  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">Manejo de Disciplinas</Text>

      {currentUserRole !== 'ADMIN' ? (
        <View className="bg-yellow-950/20 border border-yellow-800/50 p-4 rounded-sm mb-6">
          <Text className="text-yellow-500 font-mono text-xs leading-5">
            🧙‍♂️ MODO LEITURA: Você está visualizando o catálogo de matérias e seus respectivos professores vinculados. Apenas o Arquiteto/ADMIN possui permissões para criar disciplinas e definir vínculos de professores (incluindo empréstimos temporários).
          </Text>
        </View>
      ) : (
        <>
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
            
            {/* Professor Selector */}
            <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">Selecionar Professor:</Text>
            <ScrollView ref={scrollRef1} horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ paddingHorizontal: 8 }}>
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

            {/* Disciplina Selector */}
            <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">Selecionar Disciplina:</Text>
            <ScrollView ref={scrollRef2} horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 8 }}>
              <View className="flex-row gap-2">
                {allDisciplinasList.map(d => (
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
        </>
      )}

      {/* Listagem */}
      <Text className="text-white/50 text-xs mb-3 uppercase font-bold">Matérias e Vínculos Ativos:</Text>
      {loadingDisciplinas ? (
        <ActivityIndicator color="#00f3ff" />
      ) : (currentUserRole === 'ADMIN' ? allDisciplinasList : disciplinas).length === 0 ? (
        <Text className="text-white/30 text-center text-sm my-4">Nenhuma matéria cadastrada.</Text>
      ) : (
        (currentUserRole === 'ADMIN' ? allDisciplinasList : disciplinas).map((d: any) => (
          <View key={d.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-2">
            <Text className="text-neonBlue font-bold text-sm uppercase tracking-wide">{d.nome}</Text>
            {currentUserRole === 'ADMIN' && (
              <View className="mt-2 pl-2 border-l border-neonBlue/20">
                {d.professores.length === 0 ? (
                  <Text className="text-white/30 text-xs italic">Nenhum professor vinculado.</Text>
                ) : (
                  d.professores.map((p: any) => (
                    <View key={p.id} className="flex-row justify-between items-center py-1 border-b border-white/5">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white text-xs font-mono">🧙‍♂️ {p.nickname || p.nome}</Text>
                        {p.temp && (
                          <View className="bg-red-500/20 border border-red-500/50 px-1.5 py-0.5 rounded-sm">
                            <Text className="text-red-500 text-[8px] font-bold font-mono">TEMP</Text>
                          </View>
                        )}
                      </View>
                      {currentUserRole === 'ADMIN' && (
                        <TouchableOpacity
                          onPress={() => { handleUnlinkProfessor(p.id, d.id); sounds.playSelect(); }}
                          className="p-1"
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
};
