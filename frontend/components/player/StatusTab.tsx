import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ProficiencyBar } from '../ProficiencyBar';

interface StatusTabProps {
  user: any;
  activeGoldenQuestion: any | null;
  goldenAnswerText: string;
  setGoldenAnswerText: (text: string) => void;
  submittingGolden: boolean;
  handleSubmitGoldenAnswer: () => void;
  activeParty: any | null;
  subjectStats: any[];
  loadingSubjectStats: boolean;
  showFailedStats: boolean;
  setShowFailedStats: (show: boolean) => void;
  setSelectedSubjectToInvoke: (subject: any) => void;
  playerTimetable: any[];
  deliveryId: string;
  showWindow: boolean;
  setShowWindow: (show: boolean) => void;
  question: string;
  nextRank: string;
  nextRankXp: number;
  progress: number;
  sounds: any;
  showAlert: (title: string, msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

const getSubjectIcon = (name: string) => {
  const clean = name.toLowerCase();
  if (clean.includes('mat') || clean.includes('cálculo') || clean.includes('calculo')) return 'activity' as const;
  if (clean.includes('port') || clean.includes('letra') || clean.includes('redação') || clean.includes('hist') || clean.includes('filo') || clean.includes('socio')) return 'book-open' as const;
  if (clean.includes('ciên') || clean.includes('cien') || clean.includes('fís') || clean.includes('fis') || clean.includes('quím') || clean.includes('quim') || clean.includes('biol')) return 'zap' as const;
  if (clean.includes('geo') || clean.includes('ing') || clean.includes('esp') || clean.includes('estrangeira')) return 'globe' as const;
  return 'award' as const;
};

const getSubjectColor = (name: string) => {
  const clean = name.toLowerCase();
  if (clean.includes('mat') || clean.includes('cálculo') || clean.includes('calculo')) return '#00f3ff'; // Neon Blue
  if (clean.includes('port') || clean.includes('letra') || clean.includes('redação')) return '#a855f7'; // Purple
  if (clean.includes('ciên') || clean.includes('cien') || clean.includes('fís') || clean.includes('fis')) return '#22c55e'; // Green
  if (clean.includes('hist') || clean.includes('filo')) return '#eab308'; // Yellow/Gold
  return '#f43f5e'; // Rose
};

export function StatusTab({
  user,
  activeGoldenQuestion,
  goldenAnswerText,
  setGoldenAnswerText,
  submittingGolden,
  handleSubmitGoldenAnswer,
  activeParty,
  subjectStats,
  loadingSubjectStats,
  showFailedStats,
  setShowFailedStats,
  setSelectedSubjectToInvoke,
  playerTimetable,
  deliveryId,
  showWindow,
  setShowWindow,
  question,
  nextRank,
  nextRankXp,
  progress,
  sounds,
  showAlert
}: StatusTabProps) {
  if (!user) return null;

  const partySerpentRingActive = (user.anelSerpenteExpires && new Date(user.anelSerpenteExpires) > new Date()) ||
    (activeParty?.participantes && activeParty.participantes.some((p: any) => 
      p.user?.anelSerpenteExpires && new Date(p.user.anelSerpenteExpires) > new Date()
    ));

  const partyLuckBagActive = (user.bolsaSorteExpires && new Date(user.bolsaSorteExpires) > new Date()) ||
    (activeParty?.participantes && activeParty.participantes.some((p: any) => 
      p.user?.bolsaSorteExpires && new Date(p.user.bolsaSorteExpires) > new Date()
    ));

  const serpentRingOwner = (user.anelSerpenteExpires && new Date(user.anelSerpenteExpires) > new Date())
    ? 'Você'
    : activeParty?.participantes?.find((p: any) => p.user?.anelSerpenteExpires && new Date(p.user.anelSerpenteExpires) > new Date())?.user?.nickname || 'Aliado';

  const luckBagOwner = (user.bolsaSorteExpires && new Date(user.bolsaSorteExpires) > new Date())
    ? 'Você'
    : activeParty?.participantes?.find((p: any) => p.user?.bolsaSorteExpires && new Date(p.user.bolsaSorteExpires) > new Date())?.user?.nickname || 'Aliado';

  return (
    <>
      {/* Pergunta Dourada do Arquiteto (Alerta Prioritário) */}
      {activeGoldenQuestion && (
        <View className="w-full bg-yellow-950/20 border-2 border-yellow-500/80 p-5 rounded-sm mb-6 shadow-2xl relative overflow-hidden">
          <View className="absolute top-0 right-0 bg-yellow-500 px-2 py-0.5 rounded-bl-sm">
            <Text className="text-black text-[9px] font-extrabold uppercase tracking-widest">Feedback</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <Feather name="star" size={18} color="#eab308" style={{ marginRight: 6 }} />
            <Text className="text-yellow-400 text-xs font-bold uppercase tracking-widest">
              Transmissão do Arquiteto (Pergunta Dourada)
            </Text>
          </View>

          <Text className="text-white text-sm font-semibold mb-4 leading-relaxed">
            {activeGoldenQuestion.enunciado}
          </Text>

          <TextInput
            className="w-full bg-black/60 border border-yellow-500/40 text-white p-3 rounded-sm text-xs mb-3 font-mono"
            style={{ minHeight: 90, textAlignVertical: 'top' }}
            placeholder="Escreva seu feedback sincero..."
            placeholderTextColor="#eab30830"
            value={goldenAnswerText}
            onChangeText={setGoldenAnswerText}
            multiline={true}
            numberOfLines={4}
          />

          <TouchableOpacity
            className="w-full bg-yellow-500 py-2.5 rounded-sm items-center flex-row justify-center"
            onPress={() => { sounds.playSelect(); handleSubmitGoldenAnswer(); }}
            disabled={submittingGolden}
          >
            {submittingGolden ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Feather name="send" size={12} color="#000" style={{ marginRight: 6 }} />
                <Text className="text-black font-extrabold uppercase tracking-widest text-[10px]">
                  Transmitir Resposta
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* PAINEL DE STATUS PREMIUM & BUFFS */}
      <View className="bg-[#0c081d]/85 border-2 border-neonBlue p-5 rounded-sm mb-6 shadow-2xl relative overflow-hidden">
        <View className="absolute top-0 right-0 bg-neonBlue px-2 py-0.5 rounded-bl-sm">
          <Text className="text-black text-[9px] font-extrabold uppercase tracking-widest font-mono">Premium</Text>
        </View>

        <View className="flex-row items-center mb-4">
          <Feather name="activity" size={18} color="#00f3ff" style={{ marginRight: 6 }} />
          <Text className="text-neonBlue text-xs font-bold uppercase tracking-widest font-mono">
            Painel de Atributos Especiais
          </Text>
        </View>

        {/* Drop Rates & XP */}
        <View className="gap-3">
          <View className="flex-row justify-between items-center bg-black/45 border border-white/5 p-3 rounded-sm">
            <View>
              <Text className="text-white/60 text-[10px] uppercase font-mono">Taxa de Drop Real (Bolsa)</Text>
              <Text className="text-white text-lg font-bold font-mono mt-0.5">
                {10 + (partyLuckBagActive ? 15 : 0) + (partySerpentRingActive ? 35 : 0)}%
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-white/40 text-[8px] uppercase font-mono font-bold">Base: 10%</Text>
              <View className="flex-row gap-1 mt-1">
                {partyLuckBagActive && (
                  <View className="bg-green-500/10 px-1.5 py-0.5 border border-green-500/30 rounded-sm">
                    <Text className="text-green-400 text-[8px] font-bold font-mono">+15% Bolsa</Text>
                  </View>
                )}
                {partySerpentRingActive && (
                  <View className="bg-green-500/10 px-1.5 py-0.5 border border-green-500/30 rounded-sm">
                    <Text className="text-green-400 text-[8px] font-bold font-mono">+35% Anel</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View className="flex-row justify-between items-center bg-black/45 border border-white/5 p-3 rounded-sm">
            <View>
              <Text className="text-white/60 text-[10px] uppercase font-mono">Multiplicador de XP</Text>
              <Text className="text-white text-lg font-bold font-mono mt-0.5">
                {activeParty?.bandeiraGuerraActive ? 'x1.20 (Buff Ativo)' : 'x1.00 (Normal)'}
              </Text>
            </View>
            {activeParty?.bandeiraGuerraActive && (
              <View className="bg-neonBlue/15 px-2 py-1 border border-neonBlue/30 rounded-sm flex-row items-center gap-1">
                <Feather name="flag" size={10} color="#00f3ff" />
                <Text className="text-neonBlue text-[8px] font-bold font-mono uppercase">Bandeira Ativa</Text>
              </View>
            )}
          </View>

          {/* Expirations if any */}
          {(partyLuckBagActive || partySerpentRingActive) && (
            <View className="mt-1 gap-1">
              {partyLuckBagActive && (
                <Text className="text-white/40 text-[9px] font-mono">
                  ⏳ Bolsa da Sorte ativa (Ativado por: {luckBagOwner})
                </Text>
              )}
              {partySerpentRingActive && (
                <Text className="text-white/40 text-[9px] font-mono">
                  ⏳ Anel da Serpente ativo (Ativado por: {serpentRingOwner})
                </Text>
              )}
            </View>
          )}

          {/* Matérias Deficientes / Análise de Fraqueza */}
          <View className="mt-2 pt-3 border-t border-neonBlue/20">
            <Text className="text-white/50 text-[9px] font-bold uppercase tracking-widest font-mono mb-2">
              🎯 Fendas Recomendadas (Matérias Deficientes)
            </Text>
            {subjectStats.filter((s: any) => s.falhas > 0).length === 0 ? (
              <Text className="text-white/30 text-[10px] italic font-mono">Nenhuma fraqueza detectada. Continue assim!</Text>
            ) : (
              subjectStats
                .filter((s: any) => s.falhas > 0)
                .sort((a: any, b: any) => b.falhas - a.falhas)
                .slice(0, 2)
                .map((s: any) => (
                  <View key={s.disciplinaId} className="flex-row justify-between items-center py-1">
                    <Text className="text-white text-xs font-bold font-mono">⚠️ {s.nome}</Text>
                    <Text className="text-red-400 font-bold text-xs font-mono">{s.falhas} falhas</Text>
                  </View>
                ))
            )}
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between gap-y-4 mb-10">
        <View className="w-[48%] bg-white/5 border border-white/10 p-4 rounded-sm">
          <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Unidade</Text>
          <Text className="text-white text-2xl font-mono">{user.turma?.unidade || 1}</Text>
        </View>
        <View className="w-[48%] bg-white/5 border border-white/10 p-4 rounded-sm">
          <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">XP Total</Text>
          <Text className="text-white text-2xl font-mono">{user.xp}</Text>
        </View>
      </View>

      {/* Barra de XP */}
      <View className="w-full mb-2">
        <View className="flex-row justify-between mb-2">
          <Text className="text-white/50 text-xs font-bold uppercase tracking-widest">Progresso p/ {nextRank}</Text>
          <Text className="text-neonBlue text-xs font-mono">{user.xp} / {nextRankXp}</Text>
        </View>
        <View className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <View 
            className="h-full bg-neonBlue"
            style={{ width: `${progress}%`, shadowColor: '#00f3ff', shadowOpacity: 1, shadowRadius: 10 }}
          />
        </View>
      </View>

      {/* Nova Barra Dinâmica de Proficiência */}
      {subjectStats.length > 0 && (
        <ProficiencyBar 
          data={subjectStats.map((item, index) => {
            const colors = ['#00f3ff', '#a855f7', '#22c55e', '#eab308', '#f43f5e'];
            return {
              subject: item.nome,
              xp: item.acertos * 100, // Se não tiver acertos ainda, mostra 0 XP
              color: colors[index % colors.length]
            };
          })} 
        />
      )}

      {/* Atributos do Jogador (Matérias) */}
      <View className="bg-black/30 border border-white/5 rounded-sm p-4 mt-6">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-2">
            <Feather name="shield" size={16} color="#00f3ff" />
            <Text className="text-white text-xs font-bold uppercase tracking-widest">Atributos de Matéria</Text>
          </View>
          
          {/* Botão Alternador Acertos ↔ Falhas */}
          <TouchableOpacity 
            onPress={() => { setShowFailedStats(!showFailedStats); sounds.playSelect(); }}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-sm border ${showFailedStats ? 'border-neonBlue/50 bg-neonBlue/10' : 'border-red-500/50 bg-red-950/20'}`}
          >
            <Feather name={showFailedStats ? 'check-square' : 'alert-triangle'} size={12} color={showFailedStats ? '#00f3ff' : '#ef4444'} />
            <Text className={`text-[10px] font-bold uppercase tracking-widest ${showFailedStats ? 'text-neonBlue' : 'text-red-400'}`}>
              {showFailedStats ? 'Ver Acertos' : 'Ver Falhas'}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingSubjectStats && subjectStats.length === 0 ? (
          <ActivityIndicator color="#00f3ff" size="small" className="my-6" />
        ) : subjectStats.length === 0 ? (
          <Text className="text-white/30 text-center py-4 text-xs italic">Nenhuma matéria vinculada à sua turma.</Text>
        ) : (
          <View className="gap-3">
            {subjectStats.map((item) => {
              const color = getSubjectColor(item.nome);
              const totalValue = showFailedStats ? item.falhas : item.acertos;
              
              return (
                <TouchableOpacity
                  key={item.disciplinaId}
                  onPress={() => {
                    sounds.playSelect();
                    if (item.disponiveis > 0) {
                      setSelectedSubjectToInvoke(item);
                    } else {
                      showAlert('Portal Sealed', `Todas as dungeons de ${item.nome} estão seladas no momento. Aguarde novas missões do Mestre!`, 'warning');
                    }
                  }}
                  className="bg-white/5 border border-white/10 rounded-sm p-3 flex-row items-center justify-between"
                  style={{ borderLeftWidth: 3, borderLeftColor: color }}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="p-2 rounded-sm bg-white/5">
                      <Feather name={getSubjectIcon(item.nome)} size={16} color={color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-xs font-bold uppercase tracking-wider">{item.nome}</Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <Text className="text-white/60 text-[10px] font-mono">
                          {showFailedStats ? 'Falhas: ' : 'Acertos: '}
                          <Text className={showFailedStats ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{totalValue}</Text>
                        </Text>
                        {item.disponiveis > 0 && (
                          <Text className="text-yellow-500 text-[10px] font-mono font-bold">
                            +{item.disponiveis} disponível{item.disponiveis > 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {item.disponiveis > 0 ? (
                      <View className="bg-yellow-500/20 px-2 py-1 rounded-sm border border-yellow-500/30 flex-row items-center gap-1">
                        <Feather name="play" size={10} color="#eab308" />
                        <Text className="text-yellow-500 text-[9px] font-bold uppercase tracking-widest">INVOCAR</Text>
                      </View>
                    ) : (
                      <Feather name="lock" size={12} color="#ffffff" style={{ opacity: 0.3 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Grade de Horários Semanal do Jogador */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/30 p-5 rounded-sm mt-4">
        <View className="flex-row items-center gap-3 mb-4">
          <Feather name="clock" size={20} color="#00f3ff" />
          <View>
            <Text className="text-white font-bold uppercase tracking-widest text-sm">Grade de Aulas</Text>
            <Text className="text-neonBlue/50 text-[10px] uppercase font-bold">Seu cronograma semanal de estudos</Text>
          </View>
        </View>

        {playerTimetable.length === 0 ? (
          <Text className="text-white/30 text-xs italic text-center py-4">Sua turma ainda não tem grade cadastrada.</Text>
        ) : (() => {
          const hasMatutino = playerTimetable.some(s => s.posicao >= 1 && s.posicao <= 5);
          const hasVespertino = playerTimetable.some(s => s.posicao >= 6 && s.posicao <= 10);
          const hasNoturno = playerTimetable.some(s => s.posicao >= 11 && s.posicao <= 15);

          const playerTurno = (user?.turno || '').toUpperCase();
          const activeShifts: ('MATUTINO' | 'VESPERTINO' | 'NOTURNO')[] = [];
          
          if (playerTurno === 'INTEGRAL') {
            if (hasMatutino) activeShifts.push('MATUTINO');
            if (hasVespertino) activeShifts.push('VESPERTINO');
          } else {
            if (playerTurno === 'MATUTINO' && hasMatutino) activeShifts.push('MATUTINO');
            if (playerTurno === 'VESPERTINO' && hasVespertino) activeShifts.push('VESPERTINO');
            if (playerTurno === 'NOTURNO' && hasNoturno) activeShifts.push('NOTURNO');
          }

          if (activeShifts.length === 0) {
            return <Text className="text-white/30 text-xs italic text-center py-4">Sua turma ainda não tem grade cadastrada para seu turno.</Text>;
          }

          return activeShifts.map(shift => {
            const basePos = shift === 'MATUTINO' ? 0 : shift === 'VESPERTINO' ? 5 : 10;
            return (
              <View key={shift} className="mb-4">
                <Text className="text-neonBlue text-[9px] font-mono font-bold uppercase tracking-wider mb-2">
                  ⚡ Turno {shift}
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="bg-black/40 p-2 rounded-sm border border-neonBlue/10">
                    {/* Header */}
                    <View className="flex-row border-b border-neonBlue/20 pb-2">
                      <View className="w-14 items-center justify-center"><Text className="text-white/50 text-[8px] font-bold">HORA</Text></View>
                      {['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'].map(day => (
                        <View key={day} className="w-20 items-center justify-center">
                          <Text className="text-neonBlue font-mono text-[8px] font-bold">
                            {day === 'TERCA' ? 'TERÇA' : day}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Grid items */}
                    {[1, 2, 3, 4, 5].map(pos => {
                      const absolutePos = basePos + pos;
                      return (
                        <View key={pos} className="flex-row border-b border-white/5 py-1.5 items-center">
                          <View className="w-14 items-center justify-center">
                            <Text className="text-white/70 text-[10px] font-bold font-mono">{pos}º Hor.</Text>
                          </View>
                          {['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'].map(day => {
                            const slot = playerTimetable.find(s => s.diaSemana === day && s.posicao === absolutePos);
                            return (
                              <View
                                key={day}
                                className={`w-20 h-10 m-0.5 rounded-sm items-center justify-center p-1 border ${
                                  slot ? 'bg-neonBlue/10 border-neonBlue/30' : 'bg-black/60 border-dashed border-white/5'
                                }`}
                              >
                                <Text className="text-white font-bold text-[9px] text-center uppercase tracking-tighter" numberOfLines={2}>
                                  {slot ? slot.disciplina.nome : '-'}
                                </Text>
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
      </View>

      {/* Cartão de missão em fila de espera */}
      {deliveryId !== '' && !showWindow && (
        <TouchableOpacity
          onPress={() => setShowWindow(true)}
          className="mt-6 border border-yellow-500/50 bg-yellow-900/20 p-4 rounded-sm flex-row items-center justify-between"
        >
          <View className="flex-1 mr-2">
            <Text className="text-yellow-400 font-bold uppercase tracking-widest text-xs">Missão em Espera</Text>
            <Text className="text-white/60 text-xs mt-1" numberOfLines={1}>{question}</Text>
          </View>
          <Text className="text-yellow-400 font-bold text-lg">▶</Text>
        </TouchableOpacity>
      )}
    </>
  );
}
