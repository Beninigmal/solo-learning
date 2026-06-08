import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { SystemAlert } from '../../components/SystemAlert';
import { TermsModal } from '../../components/TermsModal';
import { ACTIVE_ANIMATION_TYPE } from '../../config';
import { useSolenSounds } from '../../hooks/useSolenSounds';
import { useMestreState } from '../../hooks/useMestreState';

// Modular Tab Components
import { ForjaTab } from '../../components/mestre/ForjaTab';
import { TurmasTab } from '../../components/mestre/TurmasTab';
import { RadarTab } from '../../components/mestre/RadarTab';
import { HistoricoTab } from '../../components/mestre/HistoricoTab';
import { MateriasTab } from '../../components/mestre/MateriasTab';
import { GradeTab } from '../../components/mestre/GradeTab';
import { AgendaTab } from '../../components/mestre/AgendaTab';
import { AjudasTab } from '../../components/mestre/AjudasTab';
import { ArtefatosTab } from '../../components/mestre/ArtefatosTab';

export default function MestreDashboard() {
  const sounds = useSolenSounds();
  const state = useMestreState();

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

  const renderDatePickerModal = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    const daysArray: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(i);
    }

    const monthNames = [
      'JANEIRO',
      'FEVEREIRO',
      'MARÇO',
      'ABRIL',
      'MAIO',
      'JUNHO',
      'JULHO',
      'AGOSTO',
      'SETEMBRO',
      'OUTUBRO',
      'NOVEMBRO',
      'DEZEMBRO',
    ];

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];
    daysArray.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === daysArray.length - 1) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return (
      <Modal
        visible={state.showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => state.setShowDatePicker(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-6">
          <View className="bg-black/95 border border-neonBlue p-5 rounded-sm w-full max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white font-mono font-bold tracking-widest text-sm">
                📅 {monthNames[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  state.setShowDatePicker(false);
                  sounds.playSelect();
                }}
                className="p-1 border border-red-500/30 rounded-full bg-red-900/10"
              >
                <Feather name="x" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View className="flex-row mb-2 border-b border-neonBlue/20 pb-2">
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map((d) => (
                <View key={d} className="flex-1 items-center">
                  <Text className="text-neonBlue/50 text-[10px] font-bold font-mono">{d}</Text>
                </View>
              ))}
            </View>

            {weeks.map((week, wIndex) => (
              <View key={wIndex} className="flex-row mb-1">
                {week.map((day, dIndex) => {
                  if (day === null) {
                    return <View key={dIndex} className="flex-1 h-9" />;
                  }

                  const formattedDayString = `${currentYear}-${String(currentMonth + 1).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;
                  const isSelected = state.newEventData === formattedDayString;
                  const isToday = today.getDate() === day;

                  return (
                    <TouchableOpacity
                      key={dIndex}
                      onPress={() => {
                        sounds.playSelect();
                        state.setNewEventData(formattedDayString);
                        state.setShowDatePicker(false);
                      }}
                      className={`flex-1 h-9 items-center justify-center rounded-sm border m-0.5 ${
                        isSelected ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/10'
                      } ${isToday ? 'border-neonBlue' : ''}`}
                    >
                      <Text className={`font-bold text-xs ${isSelected ? 'text-neonBlue' : 'text-white/60'}`}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </Modal>
    );
  };

  const renderTabContent = () => {
    if (state.activeTab === 'FORJA') {
      return (
        <ForjaTab
          turmas={state.turmas}
          disciplinas={state.disciplinas}
          forjaTurmaId={state.forjaTurmaId}
          setForjaTurmaId={(id) => state.setForjaTurmaId(id || '')}
          forjaDisciplinaId={state.forjaDisciplinaId}
          setForjaDisciplinaId={(id) => state.setForjaDisciplinaId(id || '')}
          complexidade={state.complexidade}
          setComplexidade={state.setComplexidade}
          tipoQuest={state.tipoQuest}
          setTipoQuest={(type) => state.setTipoQuest(type as any)}
          setExigeCalculo={state.setExigeCalculo}
          tema={state.tema}
          setTema={state.setTema}
          forjando={state.forjando}
          handleForjarQuest={state.handleForjarQuest}
          pendingBatches={state.pendingBatches}
          loadingPending={state.loadingPending}
          fetchPendingQuests={state.fetchPendingQuests}
          editingQuestId={state.editingQuestId}
          setEditingQuestId={(id) => state.setEditingQuestId(id)}
          editingEnunciado={state.editingEnunciado}
          setEditingEnunciado={state.setEditingEnunciado}
          refiningQuestId={state.refiningQuestId}
          setRefiningQuestId={(id) => state.setRefiningQuestId(id)}
          sharpenPrompt={state.sharpenPrompt}
          setSharpenPrompt={state.setSharpenPrompt}
          loadingActionId={state.loadingActionId}
          handleRegenerateQuest={state.handleRegenerateQuest}
          handleSaveManualQuest={state.handleSaveManualQuest}
          handleRefineQuest={state.handleRefineQuest}
          handleApproveBatch={state.handleApproveBatch}
          duracaoDiasBoss={state.duracaoDiasBoss}
          setDuracaoDiasBoss={state.setDuracaoDiasBoss}
          loadingBoss={state.loadingBoss}
          handleInvocacaoRapidaBOSS={state.handleInvocacaoRapidaBOSS}
          sounds={sounds}
          currentUser={state.currentUser}
        />
      );
    }

    if (state.activeTab === 'TURMAS') {
      return (
        <TurmasTab
          turmas={state.turmas}
          unassignedStudents={state.unassignedStudents}
          loadingUnassigned={state.loadingUnassigned}
          goldenQuestionText={state.goldenQuestionText}
          setGoldenQuestionText={state.setGoldenQuestionText}
          goldenQuestionTurmaId={state.goldenQuestionTurmaId}
          setGoldenQuestionTurmaId={(id) => state.setGoldenQuestionTurmaId(id || '')}
          loadingGolden={state.loadingGolden}
          goldenQuestionsList={state.goldenQuestionsList}
          expandedQuestionId={state.expandedQuestionId}
          setExpandedQuestionId={state.setExpandedQuestionId}
          handleAssignTurma={state.handleAssignTurma}
          handleSendGoldenQuestion={state.handleSendGoldenQuestion}
          sounds={sounds}
          giftedHistory={state.giftedHistory}
          loadingGiftedHistory={state.loadingGiftedHistory}
          giftedHistoryPage={state.giftedHistoryPage}
          giftedHistoryTotalPages={state.giftedHistoryTotalPages}
          giftedHistoryDateFilter={state.giftedHistoryDateFilter}
          fetchGiftedHistory={state.fetchGiftedHistory}
        />
      );
    }

    if (state.activeTab === 'RADAR') {
      return (
        <RadarTab
          turmas={state.turmas}
          selectedTurmaId={state.selectedTurmaId}
          setSelectedTurmaId={(id) => state.setSelectedTurmaId(id || '')}
          loadingRadar={state.loadingRadar}
          students={state.students}
          currentUserRole={state.currentUserRole}
          sounds={sounds}
        />
      );
    }

    if (state.activeTab === 'HISTÓRICO') {
      return (
        <HistoricoTab
          loadingHistory={state.loadingHistory}
          history={state.history}
          expandedHistoryQuestId={state.expandedHistoryQuestId}
          setExpandedHistoryQuestId={state.setExpandedHistoryQuestId}
          sounds={sounds}
        />
      );
    }

    if (state.activeTab === 'MATÉRIAS') {
      return (
        <MateriasTab
          currentUserRole={state.currentUserRole}
          disciplinas={state.disciplinas}
          allDisciplinasList={state.allDisciplinasList}
          masters={state.masters}
          newDisciplinaNome={state.newDisciplinaNome}
          setNewDisciplinaNome={state.setNewDisciplinaNome}
          loadingDisciplinas={state.loadingDisciplinas}
          selectedProfessorId={state.selectedProfessorId}
          setSelectedProfessorId={(id) => state.setSelectedProfessorId(id || '')}
          selectedDisciplinaId={state.selectedDisciplinaId}
          setSelectedDisciplinaId={(id) => state.setSelectedDisciplinaId(id || '')}
          isLinkTemp={state.isLinkTemp}
          setIsLinkTemp={state.setIsLinkTemp}
          handleCreateDisciplina={state.handleCreateDisciplina}
          handleLinkProfessor={state.handleLinkProfessor}
          handleUnlinkProfessor={state.handleUnlinkProfessor}
          sounds={sounds}
        />
      );
    }

    if (state.activeTab === 'GRADE') {
      return (
        <GradeTab
          turmas={state.turmas}
          timetableTurmaId={state.timetableTurmaId}
          setTimetableTurmaId={(id) => state.setTimetableTurmaId(id || '')}
          fetchTimetable={state.fetchTimetable}
          loadingTimetable={state.loadingTimetable}
          timetableSlots={state.timetableSlots}
          disciplinas={state.disciplinas}
          sounds={sounds}
        />
      );
    }

    if (state.activeTab === 'AGENDA') {
      return (
        <AgendaTab
          turmas={state.turmas}
          newEventTitulo={state.newEventTitulo}
          setNewEventTitulo={state.setNewEventTitulo}
          newEventDescricao={state.newEventDescricao}
          setNewEventDescricao={state.setNewEventDescricao}
          newEventData={state.newEventData}
          setNewEventData={state.setNewEventData}
          newEventTipo={state.newEventTipo}
          setNewEventTipo={state.setNewEventTipo}
          newEventTurmaId={state.newEventTurmaId}
          setNewEventTurmaId={(id) => state.setNewEventTurmaId(id || '')}
          loadingCalendar={state.loadingCalendar}
          calendarEvents={state.calendarEvents}
          sounds={sounds}
          setShowDatePicker={state.setShowDatePicker}
          handleCreateCalendarEvent={state.handleCreateCalendarEvent}
          handleDeleteCalendarEvent={state.handleDeleteCalendarEvent}
        />
      );
    }

    if (state.activeTab === 'AJUDAS') {
      return (
        <AjudasTab
          loadingHelpRequests={state.loadingHelpRequests}
          helpRequests={state.helpRequests}
          helpReplyText={state.helpReplyText}
          setHelpReplyText={state.setHelpReplyText}
          handleReplyHelp={state.handleReplyHelp}
          sounds={sounds}
        />
      );
    }

    if (state.activeTab === 'ARTEFATOS') {
      return (
        <ArtefatosTab
          turmas={state.turmas}
          selectedTurmaId={state.selectedTurmaId}
          setSelectedTurmaId={(id) => state.setSelectedTurmaId(id || '')}
          loadingRadar={state.loadingRadar}
          students={state.students}
          sounds={sounds}
          showAlert={state.showAlert}
        />
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent p-6 w-full lg:max-w-6xl lg:mx-auto">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <Animated.View style={getAnimatedStyle()} className="flex-1">
          <View className="flex-row justify-between items-center mb-6 mt-4 border-b border-neonBlue/30 pb-4">
            <View className="flex-1 mr-2">
              <Text className="text-neonBlue text-2xl font-bold uppercase tracking-[0.2em]">O Mestre</Text>
              {state.currentUser?.nickname ? (
                <Text className="text-neonBlue/80 text-[10px] font-mono font-bold uppercase mt-0.5 tracking-wider" numberOfLines={1} ellipsizeMode="tail">
                  @{state.currentUser.nickname} · {state.currentUser.nome}
                </Text>
              ) : state.currentUser?.nome ? (
                <Text className="text-neonBlue/80 text-[10px] font-mono font-bold uppercase mt-0.5 tracking-wider" numberOfLines={1} ellipsizeMode="tail">
                  {state.currentUser.nome}
                </Text>
              ) : null}
              {state.currentUser?.instituicao && (
                <Text className="text-neonBlue/80 text-[10px] font-mono font-bold uppercase mt-0.5 tracking-wider leading-4" numberOfLines={2} ellipsizeMode="tail">
                  🏛️ {state.currentUser.instituicao}
                  {state.currentUser.institution?.codigo ? ` (CÓD: ${state.currentUser.institution.codigo})` : ''}
                </Text>
              )}
              <Text className="text-white/50 text-[9px] mt-1 tracking-widest uppercase font-bold">Dungeon Control</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={state.handleDeleteAccount}
                className="bg-red-950/20 p-3 border border-red-800/30 rounded-full"
              >
                <Feather name="trash-2" size={18} color="#f87171" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={state.handleLogout}
                className="bg-red-900/30 p-3 border border-red-900/50 rounded-full"
              >
                <Feather name="power" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-12 flex-1">
              <View className="flex-row bg-black/40 border border-neonBlue/20 rounded-sm p-1">
                {['FORJA', 'TURMAS', 'RADAR', 'HISTÓRICO', 'MATÉRIAS', 'GRADE', 'AGENDA', 'AJUDAS', 'ARTEFATOS'].map(
                  (tab) => (
                    <TouchableOpacity
                      key={tab}
                      className={`px-4 py-2 items-center rounded-sm ${
                        state.activeTab === tab ? 'bg-neonBlue/30 border border-neonBlue' : ''
                      }`}
                      onPress={() => {
                        state.setActiveTab(tab);
                        sounds.playSelect();
                      }}
                    >
                      <View className="flex-row items-center gap-1">
                        <Text
                          className={`font-bold uppercase text-[10px] tracking-widest ${
                            state.activeTab === tab ? 'text-white' : 'text-neonBlue/50'
                          }`}
                        >
                          {tab}
                        </Text>
                        {tab === 'FORJA' && state.pendingBatches.length > 0 && (
                          <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                        {tab === 'AJUDAS' && state.helpRequests.length > 0 && (
                          <View className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </ScrollView>
            <TouchableOpacity
              className="ml-3 p-3 bg-neonBlue/10 border border-neonBlue/40 rounded-full"
              onPress={() => {
                sounds.playSelect();
                const txt =
                  "COMO PROFESSOR:\n\n1- Forja de Missão: Crie missões selecionando turma e disciplina. A IA gera 3 missões para sua revisão e +1 Mini Boss (incontrolável pelo professor, exceto via artefatos).\n2- Turmas: Vire a unidade (resetando o level dos alunos na unidade atual) ou envie uma Pergunta Dourada para feedback rápido.\n3- Radar: Veja o progresso e XP de todos os alunos da turma especificamente para a sua matéria.\n4- Histórico de Missões: Analise perguntas, respostas dos alunos e taxa de sucesso.\n5- Matérias: Visualize todos os professores e suas atuais matérias.\n6- Grade: Exibe apenas os horários em que você irá trabalhar em todos os turnos.\n7- Agenda: Adicione apontamentos que aparecerão diretamente no mural dos alunos.\n8- Ajuda: Onde você responde urgências quando o aluno usa 'Sussurros Sábios'.";
                state.showAlert('Guia do Mestre', txt, 'info');
              }}
            >
              <Feather name="help-circle" size={18} color="#00f3ff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={state.onRefresh}
                tintColor="#00f3ff"
                colors={['#00f3ff']}
              />
            }
          >
            {renderTabContent()}
          </ScrollView>

          {renderDatePickerModal()}
        </Animated.View>
      </KeyboardAvoidingView>
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
        role="PROFESSOR"
        onAccept={state.handleAcceptTerms}
        onCancel={state.handleLogout}
        loading={state.termsLoading}
      />
    </SafeAreaView>
  );
}
