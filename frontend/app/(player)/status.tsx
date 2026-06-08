import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Image,
  Animated as RNAnimated,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { SystemAlert } from '../../components/SystemAlert';
import { TermsModal } from '../../components/TermsModal';
import { ArtifactBag } from '../../components/ArtifactBag';
import { ArtifactBurnModal } from '../../components/ArtifactBurnModal';
import { ACTIVE_ANIMATION_TYPE } from '../../config';
import { useSolenSounds } from '../../hooks/useSolenSounds';
import { usePlayerState } from '../../hooks/usePlayerState';

// Modularized player presentation subcomponents
import { StatusTab } from '../../components/player/StatusTab';
import { BauTab } from '../../components/player/BauTab';
import { PartyTab } from '../../components/player/PartyTab';
import { QuestWindowModal } from '../../components/player/QuestWindowModal';
import { RankUpModal } from '../../components/player/RankUpModal';

// Helper function to dynamically map player XP to Solo Leveling Ranks
export const getPlayerRankInfo = (xp: number) => {
  if (xp >= 15000) {
    return {
      currentRank: 'S',
      nextRank: 'MAX',
      nextRankXp: 15000,
      currentRankMinXp: 15000,
      progressPercent: 100,
    };
  }
  if (xp >= 10000) {
    const range = 15000 - 10000;
    const progress = xp - 10000;
    return {
      currentRank: 'A',
      nextRank: 'Rank S',
      nextRankXp: 15000,
      currentRankMinXp: 10000,
      progressPercent: (progress / range) * 100,
    };
  }
  if (xp >= 6000) {
    const range = 10000 - 6000;
    const progress = xp - 6000;
    return {
      currentRank: 'B',
      nextRank: 'Rank A',
      nextRankXp: 10000,
      currentRankMinXp: 6000,
      progressPercent: (progress / range) * 100,
    };
  }
  if (xp >= 3000) {
    const range = 6000 - 3000;
    const progress = xp - 3000;
    return {
      currentRank: 'C',
      nextRank: 'Rank B',
      nextRankXp: 6000,
      currentRankMinXp: 3000,
      progressPercent: (progress / range) * 100,
    };
  }
  if (xp >= 1000) {
    const range = 3000 - 1000;
    const progress = xp - 1000;
    return {
      currentRank: 'D',
      nextRank: 'Rank C',
      nextRankXp: 3000,
      currentRankMinXp: 1000,
      progressPercent: (progress / range) * 100,
    };
  }
  // Rank E
  const range = 1000;
  const progress = xp;
  return {
    currentRank: 'E',
    nextRank: 'Rank D',
    nextRankXp: 1000,
    currentRankMinXp: 0,
    progressPercent: (progress / range) * 100,
  };
};

const DICIONARIO_TERMOS = [
  { term: 'RPG', definition: 'Role-Playing Game (Jogo de interpretação de papéis). O participante assume o papel de um caçador que evolui com o tempo.' },
  { term: 'Quest', definition: 'Missão ou objetivo pedagógico a ser concluído. Resolver tarefas/exercícios é como completar uma quest.' },
  { term: 'XP', definition: 'Pontos de Experiência. Pontuação ganha ao acertar missões. Serve para subir seu Nível acadêmico.' },
  { term: 'Level Up', definition: 'Subir de Nível. Acontece quando você acumula XP suficiente, indicando seu progresso global.' },
  { term: 'Rank', definition: 'Classificação acadêmica do caçador, variando de Rank E (iniciante) a Rank S (mestre do assunto).' },
  { term: 'Status Window', definition: 'Janela de Status. Painel que exibe seus dados, nível, XP e atributos pedagógicos.' },
  { term: 'Party', definition: 'Grupo de até 3 alunos que se unem para realizar missões cooperativas.' },
  { term: 'Raid', definition: 'Invasão / Masmorra de Grupo. Missões de grupo jogadas em turnos com chat em tempo real.' },
  { term: 'Boss / Mini Boss', definition: 'Chefe / Mini-Chefe. Missões de maior dificuldade (simulados/provas) que exigem mais estudo e dão mais XP.' },
  { term: 'Drop / Dropar', definition: 'Ato de ganhar uma recompensa aleatória (como itens ou artefatos mágicos) ao completar missões.' },
  { term: 'Bag', definition: 'Bolsa / Inventário onde você guarda seus artefatos e itens mágicos coletados.' },
  { term: 'Buff', definition: 'Efeito positivo temporário (ex: aumentar taxa de drop ou ganhar mais XP por 24 horas).' },
  { term: 'Debuff', definition: 'Penalidade / Maldição temporária (ex: perder 25% de XP base por errar missões salvas no Baú).' },
  { term: 'Invasor', definition: 'Jogador externo que invade a sua party para disputar o XP de uma Raid.' }
];

export default function StatusScreen() {
  const sounds = useSolenSounds();
  const state = usePlayerState();
  const [showDicionario, setShowDicionario] = useState(false);
  const [dicionarioSearch, setDicionarioSearch] = useState('');

  const filteredTermos = DICIONARIO_TERMOS.filter(item => 
    item.term.toLowerCase().includes(dicionarioSearch.toLowerCase()) ||
    item.definition.toLowerCase().includes(dicionarioSearch.toLowerCase())
  );

  const rankInfo = getPlayerRankInfo(state.user?.xp || 0);

  const spinStyle = state.rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-5deg'],
  });

  const getAnimatedStyle = () => {
    if (ACTIVE_ANIMATION_TYPE === 4) {
      return {
        flex: 1,
        opacity: state.fadeAnim,
        transform: [{ translateX: state.translateXAnim }],
      } as any;
    }
    const transforms: any[] = [];
    if (ACTIVE_ANIMATION_TYPE === 1) {
      transforms.push({ translateY: state.slideAnim });
    } else if (ACTIVE_ANIMATION_TYPE === 2) {
      transforms.push({ translateY: state.slideAnim });
      transforms.push({ scale: state.scaleAnim });
    } else if (ACTIVE_ANIMATION_TYPE === 3) {
      transforms.push({ translateY: state.slideAnim });
      transforms.push({ scale: state.scaleAnim });
      transforms.push({ rotate: spinStyle });
    }
    return {
      flex: 1,
      opacity: state.fadeAnim,
      transform: transforms,
    } as any;
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent p-4 relative w-full lg:max-w-6xl lg:mx-auto">
      <RNAnimated.View style={getAnimatedStyle()} className="flex-1">
        <View className="flex-row justify-between items-center mb-4 mt-2 border-b border-neonBlue/30 pb-3">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-neonBlue text-xl font-bold uppercase tracking-[0.2em]">O Caçador</Text>
              <View className="bg-neonBlue/10 border border-neonBlue/40 px-2 py-0.5 rounded-sm">
                <Text className="text-neonBlue text-[10px] font-mono font-bold">RANK {rankInfo.currentRank}</Text>
              </View>
            </View>
            {state.user?.nickname ? (
              <Text className="text-neonBlue/80 text-[10px] font-mono font-bold uppercase mt-0.5 tracking-wider" numberOfLines={1} ellipsizeMode="tail">
                @{state.user.nickname} · {state.user.nome}
              </Text>
            ) : (
              <Text className="text-neonBlue/80 text-[10px] font-mono font-bold uppercase mt-0.5 tracking-wider" numberOfLines={1} ellipsizeMode="tail">
                {state.user?.nome}
              </Text>
            )}
            {((state.user?.instituicao || state.user?.turma?.instituicao) || state.user?.turma?.nome) && (
              <View className="mt-1">
                <Text className="text-white/50 text-[9px] font-mono font-bold uppercase tracking-widest leading-4" numberOfLines={2} ellipsizeMode="tail">
                  🏛️ {state.user?.instituicao || state.user?.turma?.instituicao || 'Solen'}
                  {state.user?.institution?.codigo ? ` (CÓD: ${state.user.institution.codigo})` : ''}
                </Text>
                {state.user?.turma?.nome && (
                  <Text className="text-neonBlue/60 text-[9px] font-mono font-bold uppercase tracking-widest mt-0.5">
                    🏫 {state.user.turma.nome}
                  </Text>
                )}
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-1.5 flex-shrink-0">
            <TouchableOpacity
              onPress={() => {
                sounds.playSelect();
                state.setShowCalendar(true);
              }}
              className="bg-neonBlue/10 p-2 border border-neonBlue/40 rounded-full relative"
            >
              <Feather name="calendar" size={16} color="#00f3ff" />
              {state.unreadCalendarCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center">
                  <Text className="text-white text-[8px] font-bold">{state.unreadCalendarCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                sounds.playSelect();
                state.setShowBag(true);
              }}
              className="bg-neonBlue/10 p-2 border border-neonBlue/40 rounded-full relative"
            >
              <Feather name="briefcase" size={16} color="#00f3ff" />
              {state.unreadBagCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center">
                  <Text className="text-white text-[8px] font-bold">{state.unreadBagCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={state.handleDeleteAccount}
              className="bg-red-950/20 p-2 border border-red-800/30 rounded-full"
            >
              <Feather name="trash-2" size={16} color="#f87171" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={state.handleLogout}
              className="bg-red-900/30 p-2 border border-red-900/50 rounded-full"
            >
              <Feather name="power" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Neon Selector Tabs */}
        <View className="flex-row items-center mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-12 flex-1">
            <View className="flex-row bg-black/40 border border-neonBlue/20 rounded-sm p-0.5">
              {['STATUS', 'BAÚ', 'PARTY'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  className={`px-6 py-2 items-center rounded-sm relative ${
                    state.activeTab === tab ? 'bg-neonBlue/30 border border-neonBlue' : ''
                  }`}
                  onPress={() => {
                    state.setActiveTab(tab);
                    sounds.playSelect();
                  }}
                >
                  <Text
                    className={`font-bold uppercase text-[9px] tracking-widest ${
                      state.activeTab === tab ? 'text-white' : 'text-neonBlue/50'
                    }`}
                  >
                    {tab}
                  </Text>
                  {tab === 'PARTY' && state.unreadChatCount > 0 && (
                    <View className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full items-center justify-center">
                      <Text className="text-white text-[7px] font-bold">{state.unreadChatCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            className="ml-2 p-2.5 bg-neonBlue/10 border border-neonBlue/40 rounded-full"
            onPress={() => {
              sounds.playSelect();
              setDicionarioSearch('');
              setShowDicionario(true);
            }}
          >
            <Feather name="book-open" size={16} color="#00f3ff" />
          </TouchableOpacity>
          <TouchableOpacity
            className="ml-2 p-2.5 bg-neonBlue/10 border border-neonBlue/40 rounded-full"
            onPress={() => {
              sounds.playSelect();
              const txt =
                "GUIA DO CAÇADOR:\n\n1- STATUS: Veja seu Nível Acadêmico e XP. Responda à Missão Diária para obter recompensas e Artefatos de Rank Up! Analise seu radar de proficiência.\n2- BAÚ: Missões que você falhou ficam trancadas aqui. Use Becker para limpá-las ou tente novamente respondendo manualmente para purificar sua alma!\n3- PARTY: Junte-se ou crie um grupo usando o código. Aliados compartilham a mesma missão (Raid), e você pode usar chat flutuante em tempo real.";
              state.showAlert('Manual de Sobrevivência', txt, 'info');
            }}
          >
            <Feather name="help-circle" size={16} color="#00f3ff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={state.onRefresh}
              tintColor="#00f3ff"
              colors={['#00f3ff']}
            />
          }
        >
          {state.activeTab === 'STATUS' && (
            <StatusTab
              user={state.user}
              activeGoldenQuestion={state.activeGoldenQuestion}
              goldenAnswerText={state.goldenAnswerText}
              setGoldenAnswerText={state.setGoldenAnswerText}
              submittingGolden={state.submittingGolden}
              handleSubmitGoldenAnswer={state.handleAnswerGoldenQuestion}
              activeParty={state.activeParty}
              subjectStats={state.subjectStats}
              loadingSubjectStats={state.loadingSubjectStats}
              showFailedStats={state.showFailedStats}
              setShowFailedStats={state.setShowFailedStats}
              setSelectedSubjectToInvoke={state.setSelectedSubjectToInvoke}
              playerTimetable={state.playerTimetable}
              deliveryId={state.deliveryId}
              showWindow={state.showWindow}
              setShowWindow={state.setShowWindow}
              question={state.question}
              nextRank={rankInfo.nextRank}
              nextRankXp={rankInfo.nextRankXp}
              progress={rankInfo.progressPercent}
              sounds={sounds}
              showAlert={state.showAlert}
            />
          )}

          {state.activeTab === 'BAÚ' && (
            <BauTab
              loadingBaú={state.loadingBaú}
              wrongAnswers={state.wrongAnswers}
              handleOpenBaúQuest={state.handleOpenBaúQuest}
              sounds={sounds}
            />
          )}

          {state.activeTab === 'PARTY' && (
            <PartyTab
              activeParty={state.activeParty}
              chatMessages={state.chatMessages}
              user={state.user}
              chatInput={state.chatInput}
              setChatInput={state.setChatInput}
              sendingMessage={state.sendingMessage}
              handleSendChatMessage={state.handleSendChatMessage}
              handleLeaveParty={state.handleLeaveParty}
              handleCreateParty={state.handleCreateParty}
              handleJoinParty={state.handleJoinParty}
              partyCodeInput={state.partyCodeInput}
              setPartyCodeInput={state.setPartyCodeInput}
              loadingParty={state.loadingParty}
              setShowShareModal={state.setShowShareModal}
              sounds={sounds}
              handleToggleRaidMode={state.handleToggleRaidMode}
              handleJoinRaidQuest={state.handleJoinRaidQuest}
            />
          )}

          {/* PERGUNTA DOURADA DO ARQUITETO */}
          {state.activeGoldenQuestion && (
            <View className="bg-yellow-950/20 border border-yellow-500/40 p-4 rounded-sm mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Feather name="award" size={16} color="#eab308" />
                <Text className="text-yellow-500 font-bold uppercase tracking-wider text-xs font-mono">
                  🚨 FORJA DO DESTINO: PERGUNTA DOURADA
                </Text>
              </View>
              <Text className="text-white text-xs mb-3 leading-relaxed">
                {state.activeGoldenQuestion.enunciado}
              </Text>
              <TextInput
                multiline
                numberOfLines={3}
                value={state.goldenAnswerText}
                onChangeText={state.setGoldenAnswerText}
                placeholder="Canalize sua sincera opinião acadêmica aqui..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-black/60 border border-yellow-500/30 rounded-sm p-3 text-white text-xs mb-3 font-mono"
              />
              <TouchableOpacity
                onPress={state.handleAnswerGoldenQuestion}
                disabled={state.submittingGolden}
                className="bg-yellow-500/20 border border-yellow-500 py-2.5 rounded-sm items-center"
              >
                {state.submittingGolden ? (
                  <ActivityIndicator size="small" color="#eab308" />
                ) : (
                  <Text className="text-yellow-500 font-bold text-xs uppercase tracking-widest font-mono">
                    Canalizar Feedback Dourado
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </RNAnimated.View>

      {/* CALENDAR & AGENDA MODAL */}
      <Modal
        visible={state.showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => state.setShowCalendar(false)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center p-4">
          {state.loadingPlayerAgenda ? (
            <View className="bg-[#080d1a] border-2 border-neonBlue rounded-sm p-6 w-full items-center">
              <ActivityIndicator size="large" color="#00f3ff" />
              <Text className="text-neonBlue/60 text-xs font-mono mt-4 uppercase">
                Decodificando Linha do Tempo...
              </Text>
            </View>
          ) : (() => {
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const firstDay = new Date(currentYear, currentMonth, 1);
            const firstDayIndex = firstDay.getDay();
            const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

            const daysArray: (number | null)[] = [];
            for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
            for (let i = 1; i <= totalDays; i++) daysArray.push(i);

            const monthNames = [
              'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
              'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
            ];

            const weeks: (number | null)[][] = [];
            let currentWeek: (number | null)[] = [];
            daysArray.forEach((day, index) => {
              currentWeek.push(day);
              if (currentWeek.length === 7 || index === daysArray.length - 1) {
                while (currentWeek.length < 7) currentWeek.push(null);
                weeks.push(currentWeek);
                currentWeek = [];
              }
            });

            return (
              <View className="bg-black/95 border border-neonBlue p-5 rounded-sm w-full">
                {/* Month Header */}
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-white font-mono font-bold tracking-widest text-base">
                    📅 {monthNames[currentMonth]} {currentYear}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { state.setShowCalendar(false); sounds.playSelect(); }}
                    className="p-1 border border-red-500/30 rounded-full bg-red-900/10"
                  >
                    <Feather name="x" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* Days of week titles */}
                <View className="flex-row mb-2 border-b border-neonBlue/20 pb-2">
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map(d => (
                    <View key={d} className="flex-1 items-center">
                      <Text className="text-neonBlue/50 text-[10px] font-bold font-mono">{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Weeks Grid */}
                {weeks.map((week, wIndex) => (
                  <View key={wIndex} className="flex-row mb-1">
                    {week.map((day, dIndex) => {
                      if (day === null) {
                        return <View key={dIndex} className="flex-1 h-9" />;
                      }

                      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayEvents = state.playerCalendarEvents.filter(e => {
                        const eventDateOnly = e.data.split('T')[0];
                        return eventDateOnly === dateString;
                      });

                      const hasEvents = dayEvents.length > 0;
                      let highlightColor = 'transparent';
                      let borderColor = '#00f3ff20';

                      if (hasEvents) {
                        const types = dayEvents.map(e => e.tipo);
                        if (types.includes('PROVA')) {
                          highlightColor = '#ef444430';
                          borderColor = '#ef4444';
                        } else if (types.includes('TRABALHO')) {
                          highlightColor = '#eab30830';
                          borderColor = '#eab308';
                        } else if (types.includes('TAREFA')) {
                          highlightColor = '#3b82f630';
                          borderColor = '#3b82f6';
                        } else {
                          highlightColor = '#a855f730';
                          borderColor = '#a855f7';
                        }
                      }

                      const isToday = today.getDate() === day;
                      const isSelected = state.selectedDayNumber === day;

                      return (
                        <TouchableOpacity
                          key={dIndex}
                          onPress={() => {
                            sounds.playSelect();
                            state.setSelectedDayNumber(day);
                            state.setSelectedDayEvents(dayEvents);
                          }}
                          style={{ backgroundColor: highlightColor, borderColor: isToday ? '#00f3ff' : isSelected ? '#ffffff' : borderColor }}
                          className={`flex-1 h-9 items-center justify-center rounded-sm border m-0.5 ${
                            isToday ? 'border-2' : ''
                          }`}
                        >
                          <Text className={`font-bold text-xs ${hasEvents ? 'text-white' : 'text-white/60'} ${isToday ? 'text-neonBlue' : ''}`}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {/* Selected Day Events Drawer */}
                <View className="mt-4 border-t border-neonBlue/20 pt-4">
                  {state.selectedDayNumber === null ? (
                    <Text className="text-white/30 text-xs italic text-center py-2">Toque em um dia para ver os apontamentos.</Text>
                  ) : (
                    <View>
                      <Text className="text-neonBlue font-bold text-xs uppercase mb-3 font-mono">
                        Apontamentos para Dia {state.selectedDayNumber}:
                      </Text>

                      {state.selectedDayEvents.length === 0 ? (
                        <Text className="text-white/30 text-xs italic py-2">Nenhum apontamento cadastrado para este dia.</Text>
                      ) : (
                        state.selectedDayEvents.map(e => {
                          let typeColor = '#ef4444';
                          if (e.tipo === 'TRABALHO') typeColor = '#eab308';
                          if (e.tipo === 'TAREFA') typeColor = '#3b82f6';
                          if (e.tipo === 'EVENTO') typeColor = '#a855f7';

                          return (
                            <View key={e.id} className="bg-black/50 border border-neonBlue/10 p-3 rounded-sm mb-2">
                              <View className="flex-row justify-between items-start mb-1">
                                <Text className="text-white font-bold text-xs flex-1 mr-2">{e.titulo}</Text>
                                <View style={{ borderColor: typeColor }} className="border px-1.5 py-0.5 rounded-sm">
                                  <Text style={{ color: typeColor }} className="text-[8px] font-bold font-mono">{e.tipo}</Text>
                                </View>
                              </View>
                              <Text className="text-white/50 text-[10px] mt-1">{e.descricao || 'Sem descrição.'}</Text>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* DETAILED QUEST WINDOW MODAL */}
      <QuestWindowModal
        visible={state.showWindow}
        onClose={() => {
          state.setFeedback(null);
          state.setAnswer('');
          state.setImage(null);
          state.setImageBase64(null);
          state.setSelectedArtifact(null);
          if (state.activeBosses && state.activeBosses.length > 0) {
            state.setShowMultiBossSelection(true);
            state.setDeliveryId('');
          } else {
            state.setShowWindow(false);
            state.setDeliveryId('');
          }
        }}
        questNivel={state.questNivel}
        isFromChest={state.isFromChest}
        fromQueue={state.fromQueue}
        selectedArtifact={state.selectedArtifact}
        setSelectedArtifact={state.setSelectedArtifact}
        questXp={state.questXp}
        questErros={state.questErros}
        timeRemainingText={state.timeRemainingText}
        feedback={state.feedback}
        hammerSteps={state.hammerSteps}
        oracleHint={state.oracleHint}
        scribeKeywords={state.scribeKeywords}
        studentDoubt={state.studentDoubt}
        helpRequested={state.helpRequested}
        helpResponse={state.helpResponse}
        resetSystem={state.loadInitialData}
        question={state.question}
        isCalculation={state.isCalculation}
        answer={state.answer}
        setAnswer={state.setAnswer}
        eliminatedOption={state.eliminatedOption}
        submitting={state.submitting}
        waiting={state.waiting}
        pickImage={state.handlePickImage}
        image={state.image}
        setImage={state.setImage}
        setImageBase64={state.setImageBase64}
        pendingArtifact={state.pendingArtifact}
        setPendingArtifact={state.setPendingArtifact}
        setBurnArtifact={state.setBurnArtifact}
        setShowBurnModal={state.setShowBurnModal}
        setShowUseBag={state.setShowUseBag}
        bagInventory={state.bagInventory}
        handleAnswerSubmit={state.isFromChest ? () => state.handleRetryWrong(state.deliveryId) : state.handleSubmitQuest}
        handleStoreInChest={state.handleStoreInChest}
        storingInChest={state.storingInChest}
        sounds={sounds}
        activeParty={state.activeParty}
        user={state.user}
        handleShareQuestInRaid={state.handleShareQuestInRaid}
        deliveryId={state.deliveryId}
        hintsObsolete={state.hintsObsolete}
        handleRefreshQuest={state.handleRefreshQuest}
        loadingRefresh={state.loadingRefresh}
        chatMessages={state.chatMessages}
        chatInput={state.chatInput}
        setChatInput={state.setChatInput}
        handleSendChatMessage={state.handleSendChatMessage}
        sendingMessage={state.sendingMessage}
        unreadChatCount={state.unreadChatCount}
        showFloatingChat={state.showFloatingChat}
        setShowFloatingChat={state.setShowFloatingChat}
        usedHelpers={state.usedHelpers}
        isRaidQuest={state.isRaidQuest}
        activeBosses={state.activeBosses}
        showMultiBossSelection={state.showMultiBossSelection}
        onSelectBoss={state.handleSelectBoss}
      />

      {/* CONFIRM PORTAL INVOCATION MODAL */}
      <Modal
        visible={state.selectedSubjectToInvoke !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => state.setSelectedSubjectToInvoke(null)}
      >
        <View className="flex-1 bg-black/85 justify-center items-center p-6">
          <View 
            className="bg-[#080d1a] border-2 border-yellow-500 rounded-sm p-6 w-full max-w-sm items-center"
            style={{
              shadowColor: "#eab308",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 15,
              elevation: 10
            }}
          >
            <View className="border-b border-yellow-500/30 w-full pb-3 mb-6 items-center">
              <Feather name="shield" size={32} color="#eab308" style={{ marginBottom: 8 }} />
              <Text className="text-yellow-500 text-lg font-bold uppercase tracking-[0.2em] text-center font-mono">Invocar Dungeon</Text>
            </View>

            <Text className="text-white text-sm text-center mb-8 font-mono leading-relaxed">
              Gostaria de invocar uma nova missão de{" "}
              <Text className="text-yellow-500 font-bold">{state.selectedSubjectToInvoke?.nome}</Text>?{"\n\n"}
              Esta ação iniciará o portal de desafios para esta matéria!
            </Text>

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => {
                  const subjectId = state.selectedSubjectToInvoke?.disciplinaId;
                  state.setSelectedSubjectToInvoke(null);
                  state.handleRequestQuest(subjectId);
                }}
                className="flex-1 bg-yellow-500/20 border border-yellow-500 py-3 rounded-sm items-center justify-center"
              >
                <Text className="text-yellow-500 font-bold uppercase text-xs tracking-widest font-mono">Sim, Invocar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  state.setSelectedSubjectToInvoke(null);
                  sounds.playSelect();
                }}
                className="flex-1 bg-white/5 border border-white/10 py-3 rounded-sm items-center justify-center"
              >
                <Text className="text-white/60 font-bold uppercase text-xs tracking-widest font-mono">Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RANK UP ASCENSION MODAL */}
      <RankUpModal
        visible={state.showRankUp}
        onClose={() => state.setShowRankUp(false)}
        message={state.rankUpMessage}
        artifact={state.rankUpArtifact}
        scaleAnim={state.rankUpScaleAnim}
      />

      {/* ARTIFACTS INVENTORY BAG MODAL */}
      <ArtifactBag
        visible={state.showBag}
        onClose={() => state.setShowBag(false)}
        artifacts={state.bagInventory}
        onUse={state.handleUseArtifactFromBag}
        onProfileCardPress={state.handleVaporizePress}
      />

      {/* ARTIFACTS MISSION USE BAG MODAL */}
      <ArtifactBag
        visible={state.showUseBag}
        onClose={() => state.setShowUseBag(false)}
        artifacts={state.bagInventory}
        onUse={(artifact) => {
          sounds.playSelect();
          const directIds = [
            'becker_alquimista',
            'olhar_monarca',
            'anel_serpente',
            'bolsa_sorte',
            'bandeira_guerra',
            'orbe_perspicacia',
            'chave_mestra',
            'cetro_exilio'
          ];
          if (!directIds.includes(artifact.id) && state.usedHelpers && state.usedHelpers.includes(artifact.id)) {
            state.setShowUseBag(false);
            state.showAlert('Uso Duplicado!', `O artefato [${artifact.name}] já foi ativado nesta missão! Você não pode usar o mesmo artefato duas vezes no mesmo desafio.`, 'warning');
            return;
          }
          state.setShowUseBag(false);
          if (artifact.id === 'sapatilhas_veloz' && (state.hammerSteps || state.oracleHint || (state.scribeKeywords && state.scribeKeywords.length > 0) || state.studentDoubt)) {
            state.showAlert(
              'Alerta de Dicas!',
              'Atenção! Ao facilitar a pergunta com as Sapatilhas do Mundo Lento, as dicas já ativadas (Martelo, Oráculo, Escriba, Mestre) se tornarão OBSOLETAS para a nova questão reformulada. Deseja prosseguir mesmo assim?',
              'warning',
              undefined,
              [
                {
                  text: 'Sim, Simplificar e invalidar dicas',
                  onPress: () => {
                    state.setBurnArtifact(artifact);
                    state.setShowBurnModal(true);
                  }
                },
                {
                  text: 'Cancelar e manter dicas ativas',
                  onPress: () => {}
                }
              ]
            );
            return;
          }
          if (artifact.id === 'sussurros_sabios') {
            state.setStudentDoubtText('');
            state.setShowDoubtModal(true);
          } else {
            state.setBurnArtifact(artifact);
            state.setShowBurnModal(true);
          }
        }}
      />

      {/* ARTIFACT BURN VAPORIZATION CONFIRM MODAL */}
      <ArtifactBurnModal
        visible={state.showBurnModal}
        artifact={state.burnArtifact}
        onAnimationEnd={(art) => {
          if (art) {
            const directIds = [
              'becker_alquimista',
              'olhar_monarca',
              'anel_serpente',
              'bolsa_sorte',
              'bandeira_guerra',
              'orbe_perspicacia',
              'chave_mestra',
              'cetro_exilio'
            ];
            if (!state.deliveryId || directIds.includes(art.id)) {
              state.handleConfirmVaporization();
            } else {
              state.handleUseHelperArtifact(art);
            }
          } else {
            state.setShowBurnModal(false);
            state.setBurnArtifact(null);
          }
        }}
      />

      {/* WRITER DISSOLUTION CONCEITUAL WISDOM MODAL */}
      <Modal
        visible={state.showDoubtModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => state.setShowDoubtModal(false)}
      >
        <View className="flex-1 bg-black/85 justify-center items-center p-6">
          <View className="bg-[#080d1a] border-2 border-neonBlue rounded-sm p-5 w-full max-w-sm">
            <Text className="text-neonBlue font-mono font-bold uppercase tracking-wider text-xs mb-3">
              🔮 SUSSURROS SÁBIOS: CHAMADO DIRETO
            </Text>
            <Text className="text-white/60 text-[10px] leading-relaxed mb-4">
              Transmita sua dúvida conceitual acadêmica desta missão diretamente ao Mestre da Dungeon. Ele lhe responderá com uma dica conceitual direcionada.
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={state.studentDoubtText}
              onChangeText={state.setStudentDoubtText}
              placeholder="Digite sua dúvida ou dificuldade sobre o tema da questão..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              className="bg-black/60 border border-neonBlue/30 rounded-sm p-3 text-white text-xs mb-4 font-mono"
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  sounds.playSelect();
                  state.setShowDoubtModal(false);
                  state.setStudentDoubtText('');
                }}
                className="flex-1 py-2.5 border border-red-500/40 rounded-sm items-center bg-red-950/10"
              >
                <Text className="text-red-400 font-mono font-bold text-xs uppercase">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={state.handleDoubtSubmit}
                disabled={state.submitting}
                className="flex-1 py-2.5 border border-neonBlue rounded-sm items-center bg-neonBlue/20"
              >
                {state.submitting ? (
                  <ActivityIndicator size="small" color="#00f3ff" />
                ) : (
                  <Text className="text-neonBlue font-mono font-bold text-xs uppercase">Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETION REQUEST MODAL */}
      <Modal
        visible={state.showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => state.setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/85 justify-center items-center p-6">
          <View className="bg-[#080d1a] border-2 border-red-500 rounded-sm p-5 w-full max-w-sm">
            <Text className="text-red-500 font-mono font-bold uppercase tracking-wider text-xs mb-3">
              🚨 SOLICITAÇÃO DE EXCLUSÃO
            </Text>
            <Text className="text-white/60 text-[10px] leading-relaxed mb-4">
              Para prosseguir com a exclusão de sua conta, você deve enviar uma solicitação ao Arquiteto informando o motivo e um e-mail para contato.
            </Text>
            
            <Text className="text-white/40 text-[9px] font-mono mb-1">MOTIVO DA EXCLUSÃO</Text>
            <TextInput
              multiline
              numberOfLines={3}
              value={state.deleteReason}
              onChangeText={state.setDeleteReason}
              placeholder="Descreva o motivo da exclusão..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              className="bg-black/60 border border-red-500/30 rounded-sm p-3 text-white text-xs mb-3 font-mono"
            />

            <Text className="text-white/40 text-[9px] font-mono mb-1">E-MAIL DE CONTATO</Text>
            <TextInput
              value={state.deleteEmail}
              onChangeText={state.setDeleteEmail}
              placeholder="Digite seu e-mail de contato..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-black/60 border border-red-500/30 rounded-sm px-3 py-2 text-white text-xs mb-4 font-mono"
            />

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  sounds.playSelect();
                  state.setShowDeleteModal(false);
                }}
                className="flex-1 py-2.5 border border-white/20 rounded-sm items-center bg-white/5"
              >
                <Text className="text-white/60 font-mono font-bold text-xs uppercase">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  sounds.playSelect();
                  state.handleSubmitDeleteRequest();
                }}
                disabled={state.isRequestingDeletion}
                className="flex-1 py-2.5 border border-red-500 rounded-sm items-center bg-red-950/20"
              >
                {state.isRequestingDeletion ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Text className="text-red-500 font-mono font-bold text-xs uppercase font-semibold">Solicitar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SystemAlert
        visible={state.alertVisible}
        title={state.alertTitle}
        message={state.alertMessage}
        type={state.alertType}
        buttons={state.alertButtons}
        onClose={() => state.setAlertVisible(false)}
      />
      <TermsModal
        visible={state.showTerms}
        role="ALUNO"
        onAccept={state.handleAcceptTerms}
        onCancel={state.handleLogout}
        loading={state.termsLoading}
      />

      {/* 📖 DICIONÁRIO DO CAÇADOR MODAL */}
      <Modal
        visible={showDicionario}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDicionario(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center p-4">
          <View 
            className="w-full max-w-[500px] h-[80%] bg-[#080d1a] border-2 border-neonBlue p-5 rounded-sm shadow-2xl relative"
            style={{
              shadowColor: "#00f3ff",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 15,
              elevation: 20,
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center border-b border-neonBlue/30 pb-3 mb-4">
              <View className="flex-row items-center gap-2">
                <Feather name="book-open" size={18} color="#00f3ff" />
                <Text className="text-neonBlue text-sm font-extrabold uppercase tracking-widest font-mono">
                  Dicionário do Caçador
                </Text>
              </View>
              <TouchableOpacity onPress={() => { sounds.playSelect(); setShowDicionario(false); }}>
                <Feather name="x" size={18} color="#00f3ff" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <TextInput
              className="w-full bg-black/60 border border-neonBlue/40 text-white p-3 rounded-sm text-xs mb-4 font-mono"
              placeholder="Pesquisar termo (ex: dropar, XP...)"
              placeholderTextColor="#00f3ff30"
              value={dicionarioSearch}
              onChangeText={setDicionarioSearch}
              clearButtonMode="always"
            />

            {/* List */}
            <ScrollView className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
              {filteredTermos.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-white/40 text-xs italic font-mono">Nenhum termo encontrado.</Text>
                </View>
              ) : (
                filteredTermos.map((item, index) => (
                  <View 
                    key={index} 
                    className="mb-4 pb-3 border-b border-white/5 last:border-b-0"
                  >
                    <Text className="text-neonBlue text-[11px] font-bold uppercase tracking-wider font-mono">
                      {item.term}
                    </Text>
                    <Text className="text-white/80 text-xs mt-1 leading-relaxed">
                      {item.definition}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              className="w-full bg-neonBlue/20 border border-neonBlue/60 py-3 rounded-sm items-center"
              onPress={() => { sounds.playSelect(); setShowDicionario(false); }}
            >
              <Text className="text-neonBlue font-extrabold uppercase tracking-widest text-[9px] font-mono">
                Fechar Dicionário
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Botão Flutuante e Caixa de Chat da Missão */}
      {state.activeParty && !state.showWindow && (
        <View className="absolute bottom-24 right-6 z-50 items-end">
          {state.showFloatingChat && (
            <View 
              className="bg-[#080d1a]/95 border-2 border-neonBlue rounded-sm p-3 mb-3 w-[290px] h-[240px] shadow-2xl relative"
              style={{
                shadowColor: "#00f3ff",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 15,
                elevation: 20,
              }}
            >
              <View className="flex-row justify-between items-center border-b border-neonBlue/25 pb-1.5 mb-2">
                <Text className="text-neonBlue text-[9px] font-bold uppercase tracking-wider font-mono">⚡ TRANSMISSÃO DA RAID</Text>
                <TouchableOpacity onPress={() => { sounds.playSelect(); state.setShowFloatingChat(false); }}>
                  <Feather name="chevron-down" size={14} color="#00f3ff" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <View className="flex-1 bg-black/60 border border-neonBlue/10 p-2 rounded-sm mb-2">
                <ScrollView
                  nestedScrollEnabled={true}
                  ref={ref => { if (ref) { ref.scrollToEnd({ animated: true }); } }}
                  showsVerticalScrollIndicator={true}
                >
                  {state.chatMessages.length === 0 ? (
                    <Text className="text-white/20 text-[9px] font-mono italic text-center mt-14">Sem transmissões no momento...</Text>
                  ) : (
                    state.chatMessages.map((m: any) => {
                      const isMe = m.userId === state.user?.id;
                      const getUserStatusColor = (lastActive: string) => {
                        if (!lastActive) return 'bg-white/20';
                        const diff = Date.now() - new Date(lastActive).getTime();
                        return diff < 60000 ? 'bg-green-400' : 'bg-white/20';
                      };
                      return (
                        <View key={m.id} className="mb-1.5">
                          <View className="flex-row items-center gap-1.5 flex-wrap">
                            <View className={`w-1.5 h-1.5 rounded-full ${getUserStatusColor(m.user?.lastActiveAt)}`} />
                            <Text className={`text-[9px] font-bold font-mono ${isMe ? 'text-neonBlue' : 'text-yellow-500'}`}>
                              [{m.user?.nickname || m.user?.nome}]:
                            </Text>
                            <Text className="text-white text-[11px] font-sans leading-4 text-left">{m.content}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              {/* Input */}
              <View className="flex-row gap-2">
                <TextInput
                  value={state.chatInput}
                  onChangeText={state.setChatInput}
                  placeholder="Transmitir mensagem..."
                  placeholderTextColor="#00f3ff20"
                  className="flex-1 bg-black/40 border border-neonBlue/20 text-white px-2 py-1 rounded-sm text-[11px] font-mono"
                  onSubmitEditing={state.handleSendChatMessage}
                  editable={!state.sendingMessage}
                />
                <TouchableOpacity
                  onPress={state.handleSendChatMessage}
                  disabled={state.sendingMessage || !state.chatInput.trim()}
                  className={`px-3 bg-neonBlue/20 border border-neonBlue rounded-sm items-center justify-center ${(!state.chatInput.trim() || state.sendingMessage) ? 'opacity-40' : ''}`}
                  activeOpacity={0.7}
                >
                  {state.sendingMessage ? (
                    <ActivityIndicator size="small" color="#00f3ff" />
                  ) : (
                    <Feather name="send" size={10} color="#00f3ff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Round Floating Button */}
          <TouchableOpacity
            onPress={() => { sounds.playSelect(); state.setShowFloatingChat(!state.showFloatingChat); }}
            className="w-12 h-12 bg-[#0a1128] border-2 border-neonBlue rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: "#00f3ff",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 10,
              elevation: 10,
            }}
            activeOpacity={0.8}
          >
            <Feather name="message-square" size={20} color="#00f3ff" />
            {state.unreadChatCount > 0 && !state.showFloatingChat && (
              <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center">
                <Text className="text-white text-[8px] font-mono font-bold">{state.unreadChatCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
