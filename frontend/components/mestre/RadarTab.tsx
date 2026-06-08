import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';

interface RadarTabProps {
  turmas: any[];
  selectedTurmaId: string | null;
  setSelectedTurmaId: (id: string | null) => void;
  loadingRadar: boolean;
  students: any[];
  currentUserRole: string;
  sounds: any;
}

export const RadarTab: React.FC<RadarTabProps> = ({
  turmas,
  selectedTurmaId,
  setSelectedTurmaId,
  loadingRadar,
  students,
  currentUserRole,
  sounds,
}) => {
  return (
    <View className="flex-1">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-4">Radar de Turmas</Text>
      
      {turmas.length === 0 ? (
        <Text className="text-white/50 text-center mb-4">Nenhuma turma detectada.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 max-h-12">
          {turmas.map(t => (
            <TouchableOpacity 
              key={t.id} 
              onPress={() => { setSelectedTurmaId(t.id); sounds.playSelect(); }}
              className={`px-4 py-2 border rounded-sm mr-3 justify-center ${selectedTurmaId === t.id ? 'bg-neonBlue border-neonBlue' : 'border-neonBlue/30'}`}
            >
              <Text className={`font-bold ${selectedTurmaId === t.id ? 'text-black' : 'text-neonBlue'}`}>{t.nome}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loadingRadar ? (
        <ActivityIndicator color="#00f3ff" size="large" className="mt-10" />
      ) : students.length > 0 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="gap-3">
            {students.map(s => {
              const isProfessor = currentUserRole === 'PROFESSOR';
              
              // Função para gerar uma cor baseada no nome da matéria
              const getSubjectColor = (subject: string) => {
                let hash = 0;
                for (let i = 0; i < subject.length; i++) {
                  hash = subject.charCodeAt(i) + ((hash << 5) - hash);
                }
                const h = Math.abs(hash) % 360;
                return `hsl(${h}, 80%, 60%)`;
              };

              return (
                <View key={s.id} className="bg-black/50 border border-neonBlue/30 p-4 rounded-sm">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white font-bold text-lg">{s.nickname || 'Sem Nickname'}</Text>
                    {!isProfessor && <Text className="font-mono text-lg text-neonBlue">{s.xp} XP</Text>}
                  </View>
                  <Text className="text-white/50 text-xs uppercase mb-3">{s.nome} • Lvl {s.level}</Text>

                  {isProfessor && s.subjectXp ? (
                    Object.entries(s.subjectXp).map(([subject, xp]: [string, any]) => {
                      const color = getSubjectColor(subject);
                      return (
                        <View key={subject} className="mb-2">
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-[10px] font-bold uppercase tracking-widest font-mono" style={{ color }}>{subject}</Text>
                            <Text className="text-[10px] font-bold font-mono" style={{ color }}>{xp} XP</Text>
                          </View>
                          <View className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                            <View 
                              className="h-full" 
                              style={{ 
                                backgroundColor: color, 
                                width: `${Math.min((xp / 1000) * 100, 100)}%`, // Assuming 1000 XP max for visualizing bar
                                shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3 
                              }}
                            />
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    isProfessor && <Text className="text-white/30 text-xs italic mt-2">Nenhum XP registrado nas suas disciplinas.</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : selectedTurmaId ? (
        <Text className="text-white/30 text-center mt-10">Nenhum caçador detectado nesta turma.</Text>
      ) : null}
    </View>
  );
};
