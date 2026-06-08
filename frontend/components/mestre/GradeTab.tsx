import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  setTimetableTurmaId: (id: string) => void;
  fetchTimetable: (id: string) => void;
  loadingTimetable: boolean;
  timetableSlots: any[];
  disciplinas: any[];
  sounds: any;
}

export const GradeTab: React.FC<GradeTabProps> = ({
  turmas,
  timetableTurmaId,
  setTimetableTurmaId,
  fetchTimetable,
  loadingTimetable,
  timetableSlots,
  disciplinas,
  sounds,
}) => {
  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">Grade de Horários</Text>

      {/* Selecionar Turma */}
      <Text className="text-white/50 text-xs mb-2 uppercase font-bold">Selecionar Turma para Visualizar/Editar:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ paddingHorizontal: 8 }}>
        <View className="flex-row gap-2">
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
        <Text className="text-white/30 text-center text-sm my-6 font-mono">Selecione uma turma para visualizar a grade.</Text>
      ) : (
        <>
          {loadingTimetable ? (
            <ActivityIndicator color="#00f3ff" />
          ) : (() => {
            const linkedIds = disciplinas.map(d => d.id);
            const hasMatutino = timetableSlots.some(s => s.posicao >= 1 && s.posicao <= 5 && linkedIds.includes(s.disciplinaId));
            const hasVespertino = timetableSlots.some(s => s.posicao >= 6 && s.posicao <= 10 && linkedIds.includes(s.disciplinaId));
            const hasNoturno = timetableSlots.some(s => s.posicao >= 11 && s.posicao <= 15 && linkedIds.includes(s.disciplinaId));

            const activeShifts: ('MATUTINO' | 'VESPERTINO' | 'NOTURNO')[] = [];
            if (hasMatutino) activeShifts.push('MATUTINO');
            if (hasVespertino) activeShifts.push('VESPERTINO');
            if (hasNoturno) activeShifts.push('NOTURNO');

            if (activeShifts.length === 0) {
              return (
                <View className="bg-black/50 border border-neonBlue/10 p-6 rounded-sm items-center justify-center my-6">
                  <Feather name="calendar" size={32} color="#00f3ff33" />
                  <Text className="text-white/40 text-xs font-mono text-center mt-3">Você não possui aulas agendadas para esta turma.</Text>
                </View>
              );
            }

            return activeShifts.map(shift => {
              const basePos = shift === 'MATUTINO' ? 0 : shift === 'VESPERTINO' ? 5 : 10;
              return (
                <View key={shift} className="mb-6">
                  <Text className="text-neonBlue text-[11px] font-mono font-bold uppercase tracking-wider mb-3">
                    ⚡ Turno {shift}
                  </Text>
                  
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

                      {/* Slots */}
                      {[1, 2, 3, 4, 5].map(pos => {
                        const absolutePos = basePos + pos;
                        return (
                          <View key={pos} className="flex-row border-b border-white/5 py-2 items-center">
                            <View className="w-16 items-center justify-center">
                              <Text className="text-white/70 text-xs font-bold font-mono">{pos}º Horário</Text>
                            </View>
                            {['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'].map(day => {
                              const slot = timetableSlots.find(s => s.diaSemana === day && s.posicao === absolutePos);
                              const isMine = slot && linkedIds.includes(slot.disciplinaId);
                              
                              const professor = slot?.professor;
                              const professorText = professor ? (professor.nickname || professor.nome) : '';
                              const hasNoProfessor = slot && !professor;

                              return (
                                <View
                                  key={day}
                                  className={`w-24 h-12 m-1 border rounded-sm items-center justify-center p-1 ${
                                    slot 
                                      ? hasNoProfessor 
                                        ? 'bg-yellow-500/10 border-yellow-500/50' 
                                        : isMine 
                                          ? 'bg-neonBlue/15 border-neonBlue' 
                                          : 'bg-black/50 border-white/10'
                                      : 'bg-black/40 border-white/5'
                                  }`}
                                >
                                  {slot ? (
                                    <>
                                      <Text 
                                        className={`font-bold text-[8.5px] text-center uppercase tracking-tighter ${
                                          hasNoProfessor 
                                            ? 'text-yellow-500' 
                                            : isMine 
                                              ? 'text-white' 
                                              : 'text-white/40'
                                        }`} 
                                        numberOfLines={2}
                                      >
                                        {abbreviateSubjectName(slot.disciplina.nome)}
                                      </Text>
                                      <Text 
                                        className={`text-[7px] font-mono text-center mt-0.5 ${
                                          hasNoProfessor 
                                            ? 'text-yellow-500/60 font-bold' 
                                            : isMine 
                                              ? 'text-white/50' 
                                              : 'text-white/20'
                                        }`} 
                                        numberOfLines={1}
                                      >
                                        {hasNoProfessor ? '⚠️ Sem mestre' : professorText}
                                      </Text>
                                    </>
                                  ) : (
                                    <Text className="text-white/10 font-bold text-[10px] text-center uppercase tracking-tighter">
                                      —
                                    </Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              );
            });
          })()}
        </>
      )}
    </View>
  );
};
