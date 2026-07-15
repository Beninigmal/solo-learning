import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { SystemAlert } from '../../components/SystemAlert';
import { TermsModal } from '../../components/TermsModal';
import { ACTIVE_ANIMATION_TYPE } from '../../config';
import { useSolenSounds } from '../../hooks/useSolenSounds';
import { useAdminState } from '../../hooks/useAdminState';

// Modular Tab Components
import { TurmasTab } from '../../components/admin/TurmasTab';
import { MateriasTab } from '../../components/admin/MateriasTab';
import { ArquitetoTab } from '../../components/admin/ArquitetoTab';
import { RecrutarTab } from '../../components/admin/RecrutarTab';
import { GradeTab } from '../../components/admin/GradeTab';
import { OrdinatorTab } from '../../components/admin/OrdinatorTab';
import { LogsTab } from '../../components/admin/LogsTab';

export default function AdminDashboard() {
  const sounds = useSolenSounds();
  const state = useAdminState();

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
    <SafeAreaView className="flex-1 bg-transparent p-6 w-full lg:max-w-6xl lg:mx-auto">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Animated.View style={getAnimatedStyle()} className="flex-1">
          <View className="flex-row justify-between items-center mb-6 mt-4 border-b border-neonBlue/30 pb-4">
            <View className="flex-1 mr-2">
              <Text className="text-neonBlue text-2xl font-bold uppercase tracking-[0.3em]">O Arquiteto</Text>
              {state.currentUser?.instituicao && (
                <Text className="text-neonBlue/80 text-[10px] font-mono font-bold uppercase mt-0.5 tracking-wider leading-4" numberOfLines={2} ellipsizeMode="tail">
                  🏛️ {state.currentUser.instituicao}
                  {state.currentUser.institution?.codigo ? ` (CÓD: ${state.currentUser.institution.codigo})` : ''}
                  {state.currentUser.institution?.plano ? ` • PLANO: ${state.currentUser.institution.plano}` : ''}
                </Text>
              )}
              <Text className="text-white/50 text-[9px] mt-1 tracking-widest uppercase font-bold">Painel de Criação</Text>
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

          {/* Tabs & Tutorial */}
          <View className="flex-row items-center mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-12 flex-1">
              <View className="flex-row bg-black/40 border border-neonBlue/20 rounded-sm p-1">
                {['RECRUTAR', 'TURMAS', 'MATÉRIAS', 'ARQUITETO', 'GRADE', 'ORDINATOR', 'LOGS'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    className={`px-6 py-2 items-center rounded-sm ${
                      state.activeTab === tab ? 'bg-neonBlue/30 border border-neonBlue' : ''
                    }`}
                    onPress={() => {
                      state.setActiveTab(tab);
                      sounds.playSelect();
                    }}
                  >
                    <Text
                      className={`font-bold uppercase text-[10px] tracking-widest ${
                        state.activeTab === tab ? 'text-white' : 'text-neonBlue/50'
                      }`}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              className="ml-3 p-3 bg-neonBlue/10 border border-neonBlue/40 rounded-full"
              onPress={() => {
                sounds.playSelect();
                const txt =
                  "COMO ARQUITETO:\n\n1- Forja novo mestre (professor).\n2- Forja nova turma (O código de invocação é a senha padrão para o primeiro acesso do professor).\n3- Criar matéria e vincular com o professor.\n4- Na aba 'Arquiteto', ao abrir as turmas ativas, é possível vincular o professor à turma. Em outra seção dessa tela, lance perguntas douradas para coletar feedback.\n5- Recrutar caçador: Pode ser manual ou em lote via CSV. AVISO! O sistema bloqueia a criação de alunos para turmas inexistentes!\n6- Na 'Grade', organize os horários de todos os professores e turnos. Isso refletirá na agenda do professor e do aluno.";
                state.showAlert('Guia do Arquiteto', txt, 'info');
              }}
            >
              <Feather name="help-circle" size={18} color="#00f3ff" />
            </TouchableOpacity>
          </View>

          {state.activeTab === 'ORDINATOR' ? (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16, height: (Platform.OS === 'web' ? 'calc(100vh - 180px)' : 600) as any }}>
              <OrdinatorTab onDataChanged={state.onRefresh} currentUser={state.currentUser} />
            </View>
          ) : (
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
             {state.activeTab === 'TURMAS' && (
              <TurmasTab
                turmaNome={state.turmaNome}
                setTurmaNome={state.setTurmaNome}
                turmaAno={state.turmaAno}
                setTurmaAno={state.setTurmaAno}
                turmaCodigo={state.turmaCodigo}
                setTurmaCodigo={state.setTurmaCodigo}
                turmaNivel={state.turmaNivel}
                setTurmaNivel={state.setTurmaNivel}
                loadingTurma={state.loadingTurma}
                handleCreateTurma={state.handleCreateTurma}
                editingTurmaId={state.editingTurmaId}
                handleEditTurmaPress={state.handleEditTurmaPress}
                cancelEditTurma={state.cancelEditTurma}
                turmas={state.turmas}
                fetchTurmas={state.fetchTurmas}
                sounds={sounds}
                currentUser={state.currentUser}
                handleUpdateUnidade={state.handleUpdateUnidade}
              />
            )}

            {state.activeTab === 'MATÉRIAS' && (
              <MateriasTab
                newDisciplinaNome={state.newDisciplinaNome}
                setNewDisciplinaNome={state.setNewDisciplinaNome}
                loadingDisciplinas={state.loadingDisciplinas}
                loadingCreateDisciplina={state.loadingCreateDisciplina}
                loadingLinkProfessor={state.loadingLinkProfessor}
                handleCreateDisciplina={state.handleCreateDisciplina}
                masters={state.masters}
                selectedProfessorId={state.selectedProfessorId}
                setSelectedProfessorId={state.setSelectedProfessorId}
                allDisciplinasList={state.allDisciplinasList}
                selectedDisciplinaId={state.selectedDisciplinaId}
                setSelectedDisciplinaId={state.setSelectedDisciplinaId}
                turmas={state.turmas}
                selectedLinkTurmaIds={state.selectedLinkTurmaIds}
                setSelectedLinkTurmaIds={state.setSelectedLinkTurmaIds}
                handleToggleLinkTurma={state.handleToggleLinkTurma}
                isLinkTemp={state.isLinkTemp}
                setIsLinkTemp={state.setIsLinkTemp}
                handleLinkProfessor={state.handleLinkProfessor}
                editingDisciplinaId={state.editingDisciplinaId}
                setEditingDisciplinaId={state.setEditingDisciplinaId}
                editingDisciplinaNome={state.editingDisciplinaNome}
                setEditingDisciplinaNome={state.setEditingDisciplinaNome}
                handleUpdateDisciplina={state.handleUpdateDisciplina}
                handleDeleteDisciplina={state.handleDeleteDisciplina}
                handleUnlinkProfessor={state.handleUnlinkProfessor}
                sounds={sounds}
                aulasSemanais={state.aulasSemanais}
                setAulasSemanais={state.setAulasSemanais}
                currentUser={state.currentUser}
                handleCreateDefaultDisciplinas={state.handleCreateDefaultDisciplinas}
                handleDeleteUnlinkedDisciplinas={state.handleDeleteUnlinkedDisciplinas}
              />
            )}

            {state.activeTab === 'ARQUITETO' && (
              <ArquitetoTab
                turmas={state.turmas}
                expandedTurmaId={state.expandedTurmaId}
                setExpandedTurmaId={state.setExpandedTurmaId}
                expandedMembersId={state.expandedMembersId}
                setExpandedMembersId={state.setExpandedMembersId}
                handleFetchStudentStats={state.handleFetchStudentStats}
                expandedLinkId={state.expandedLinkId}
                setExpandedLinkId={state.setExpandedLinkId}
                handleUnlinkProfessorFromClass={state.handleUnlinkProfessorFromClass}
                goldenQuestionText={state.goldenQuestionText}
                setGoldenQuestionText={state.setGoldenQuestionText}
                goldenQuestionTurmaId={state.goldenQuestionTurmaId}
                setGoldenQuestionTurmaId={state.setGoldenQuestionTurmaId}
                loadingGolden={state.loadingGolden}
                handleSendGoldenQuestion={state.handleSendGoldenQuestion}
                goldenQuestionsList={state.goldenQuestionsList}
                expandedQuestionId={state.expandedQuestionId}
                setExpandedQuestionId={state.setExpandedQuestionId}
                sounds={sounds}
                masters={state.masters}
                loadingMasters={state.loadingMasters}
                fetchMasters={state.fetchMasters}
                handleEditMasterPress={state.handleEditMasterPress}
                handleResetMasterAccess={state.handleResetMasterAccess}
                students={state.students}
                loadingStudents={state.loadingStudents}
                handleEditStudentPress={state.handleEditStudentPress}
                handleResetStudentAccess={state.handleResetStudentAccess}
                deleteRequests={state.deleteRequests}
                loadingDeleteRequests={state.loadingDeleteRequests}
                handleConfirmDeleteRequest={state.handleConfirmDeleteRequest}
                handleRejectDeleteRequest={state.handleRejectDeleteRequest}
                handleDeleteUser={state.handleDeleteUser}
                showAlert={state.showAlert}
                
                editingMasterId={state.editingMasterId}
                nome={state.nome}
                setNome={state.setNome}
                matricula={state.matricula}
                setMatricula={state.setMatricula}
                maxAulasSemanais={state.maxAulasSemanais}
                setMaxAulasSemanais={state.setMaxAulasSemanais}
                categoria={state.categoria}
                setCategoria={state.setCategoria}
                loading={state.loading}
                handleRegisterOrUpdateMaster={state.handleRegisterOrUpdateMaster}
                cancelEditMaster={state.cancelEditMaster}
                
                editingStudentId={state.editingStudentId}
                studentNome={state.studentNome}
                setStudentNome={state.setStudentNome}
                studentNickname={state.studentNickname}
                setStudentNickname={state.setStudentNickname}
                studentTurmaId={state.studentTurmaId}
                setStudentTurmaId={state.setStudentTurmaId}
                handleUpdateStudent={state.handleUpdateStudent}
                cancelEditStudent={state.cancelEditStudent}
              />
            )}

            {state.activeTab === 'RECRUTAR' && (
              <RecrutarTab
                useBatch={state.useBatch}
                setUseBatch={state.setUseBatch}
                turno={state.turno}
                setTurno={state.setTurno}
                turmas={state.turmas}
                recrutTurmaId={state.recrutTurmaId}
                setRecrutTurmaId={state.setRecrutTurmaId}
                recrutStudentNome={state.recrutStudentNome}
                setRecrutStudentNome={state.setRecrutStudentNome}
                recrutStudentMatricula={state.recrutStudentMatricula}
                setRecrutStudentMatricula={state.setRecrutStudentMatricula}
                recrutando={state.recrutando}
                handleRecrutar={state.handleRecrutar}
                handleSelectExcel={state.handleSelectExcel}
                handleUploadFile={state.handleUploadFile}
                excelData={state.excelData}
                handleBatchRecrutarExcel={state.handleBatchRecrutarExcel}
                sounds={sounds}
                editingMasterId={state.editingMasterId}
                nome={state.nome}
                setNome={state.setNome}
                matricula={state.matricula}
                setMatricula={state.setMatricula}
                maxAulasSemanais={state.maxAulasSemanais}
                setMaxAulasSemanais={state.setMaxAulasSemanais}
                categoria={state.categoria}
                setCategoria={state.setCategoria}
                currentUser={state.currentUser}
                loading={state.loading}
                handleRegisterOrUpdateMaster={state.handleRegisterOrUpdateMaster}
                cancelEditMaster={state.cancelEditMaster}
                handleBatchRegisterMastersExcel={state.handleBatchRegisterMastersExcel}
              />
            )}

            {state.activeTab === 'GRADE' && (
              <GradeTab
                currentUser={state.currentUser}
                turmas={state.turmas}
                timetableTurmaId={state.timetableTurmaId}
                setTimetableTurmaId={state.setTimetableTurmaId}
                fetchTimetable={state.fetchTimetable}
                selectedTimetableDisciplinaId={state.selectedTimetableDisciplinaId}
                setSelectedTimetableDisciplinaId={state.setSelectedTimetableDisciplinaId}
                allDisciplinasList={state.allDisciplinasList}
                selectedShift={state.selectedShift}
                setSelectedShift={state.setSelectedShift}
                loadingTimetable={state.loadingTimetable}
                timetableSlots={state.timetableSlots}
                handleDeleteTimetableSlot={state.handleDeleteTimetableSlot}
                handleSaveTimetableSlot={state.handleSaveTimetableSlot}
                handleAutoGenerateTimetable={state.handleAutoGenerateTimetable}
                sounds={sounds}
                showAlert={state.showAlert}
                shiftSettings={state.shiftSettings}
                professorRestrictions={state.professorRestrictions}
                loadingShifts={state.loadingShifts}
                loadingRestrictions={state.loadingRestrictions}
                handleSaveShiftSetting={state.handleSaveShiftSetting}
                handleSaveProfessorRestriction={state.handleSaveProfessorRestriction}
                masters={state.masters}
                // Monarch Engine v3 Props
                disciplinaConfig={state.disciplinaConfig}
                setDisciplinaConfig={state.setDisciplinaConfig}
                loadingBatchGenerate={state.loadingBatchGenerate}
                handleBatchGenerateTimetable={state.handleBatchGenerateTimetable}
                fetchDisciplinaConfig={state.fetchDisciplinaConfig}
                handleSaveDisciplinaConfig={state.handleSaveDisciplinaConfig}
              />
            )}

            {state.activeTab === 'LOGS' && (
              <LogsTab />
            )}
          </ScrollView>
          )}

        </Animated.View>

        {/* MODAL DE DESEMPENHO INDIVIDUAL DO ALUNO */}
        {state.selectedStudent && (
          <View className="absolute top-0 bottom-0 left-0 right-0 bg-black/85 z-50 justify-center items-center p-5">
            <View
              className="bg-[#080d1a] border-2 border-neonBlue rounded-sm p-5 w-full max-h-[85%] shadow-2xl relative flex flex-col"
              style={{
                shadowColor: '#00f3ff',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 15,
                elevation: 20,
              }}
            >
              {/* Header */}
              <View className="flex-row justify-between items-start border-b border-neonBlue/30 pb-3 mb-4">
                <View className="flex-1 pr-2">
                  <Text className="text-white text-lg font-bold uppercase tracking-wider">
                    {state.selectedStudent.nome}
                  </Text>
                  <Text className="text-neonBlue text-xs font-mono font-bold mt-1">
                    @{state.selectedStudent.nickname || 'sem-nickname'} · Matrícula:{' '}
                    {state.selectedStudent.matricula}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    sounds.playSelect();
                    state.setSelectedStudent(null);
                  }}
                  className="bg-neonBlue/10 p-1 border border-neonBlue/30 rounded-sm"
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={16} color="#00f3ff" />
                </TouchableOpacity>
              </View>

              {state.loadingStats ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="large" color="#00f3ff" />
                  <Text className="text-neonBlue/60 text-xs font-mono mt-4 uppercase tracking-widest animate-pulse">
                    Sincronizando Análise Acadêmica...
                  </Text>
                </View>
              ) : state.studentStats.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Feather name="alert-circle" size={32} color="#6b7280" />
                  <Text className="text-white/40 text-xs font-mono text-center mt-3">
                    Nenhuma estatística disponível para este aluno no momento.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={{ width: '100%', minHeight: 320 }}
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
                  showsVerticalScrollIndicator={true}
                >
                  <Text className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-3 font-mono">
                    📊 Desempenho por Matéria:
                  </Text>
                  {state.studentStats.map((stat: any) => {
                    const subColor = (() => {
                      const name = stat.nome.toLowerCase();
                      if (name.includes('mat') || name.includes('fís') || name.includes('cál'))
                        return '#3b82f6';
                      if (name.includes('por') || name.includes('let') || name.includes('his'))
                        return '#a855f7';
                      if (name.includes('biol') || name.includes('ciê') || name.includes('amb'))
                        return '#22c55e';
                      if (name.includes('quí') || name.includes('tec') || name.includes('prog'))
                        return '#00f3ff';
                      return '#eab308';
                    })();

                    const riskLevel = (() => {
                      if (stat.falhas > 0 && stat.falhas >= stat.acertos) {
                        return {
                          label: 'RISCO CRÍTICO',
                          color: '#ef4444',
                          bg: 'rgba(239, 68, 68, 0.15)',
                          border: '#ef4444',
                        };
                      }
                      if (stat.falhas > 0 && stat.falhas * 2 >= stat.acertos) {
                        return {
                          label: 'ALERTA / ATENÇÃO',
                          color: '#e6ad12',
                          bg: 'rgba(230, 173, 18, 0.15)',
                          border: '#e6ad12',
                        };
                      }
                      if (stat.acertos > 0) {
                        return {
                          label: 'DESEMPENHO ESTÁVEL',
                          color: '#22c55e',
                          bg: 'rgba(34, 197, 94, 0.15)',
                          border: '#22c55e',
                        };
                      }
                      return {
                        label: 'SEM REGISTRO',
                        color: '#6b7280',
                        bg: 'rgba(107, 114, 128, 0.15)',
                        border: '#6b7280',
                      };
                    })();

                    const total = stat.acertos + stat.falhas + stat.disponiveis;
                    const progressPct = total > 0 ? Math.round((stat.acertos / total) * 100) : 0;

                    return (
                      <View
                        key={stat.disciplinaId}
                        className="bg-black/40 p-4 rounded-sm mb-3 border"
                        style={{ borderColor: `${subColor}30` }}
                      >
                        <View className="flex-row justify-between items-start mb-2">
                          <View>
                            <Text className="text-white font-bold text-sm uppercase tracking-wide">
                              {stat.nome}
                            </Text>
                            <View
                              className="px-2 py-0.5 rounded-sm border mt-1.5 self-start"
                              style={{ backgroundColor: riskLevel.bg, borderColor: riskLevel.border }}
                            >
                              <Text
                                className="text-[8px] font-bold font-mono uppercase"
                                style={{ color: riskLevel.color }}
                              >
                                {riskLevel.label}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-white/60 font-mono text-xs font-bold">
                            {progressPct}% Concluído
                          </Text>
                        </View>

                        <View className="flex-row gap-2 mt-3">
                          <View className="flex-1 bg-green-500/10 border border-green-500/25 p-2 rounded-sm items-center">
                            <Text className="text-green-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                              Acertos
                            </Text>
                            <Text className="text-white text-base font-bold font-mono mt-0.5">
                              {stat.acertos}
                            </Text>
                          </View>
                          <View className="flex-1 bg-red-500/10 border border-red-500/25 p-2 rounded-sm items-center">
                            <Text className="text-red-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                              Falhas
                            </Text>
                            <Text className="text-white text-base font-bold font-mono mt-0.5">
                              {stat.falhas}
                            </Text>
                          </View>
                          <View className="flex-1 bg-neonBlue/10 border border-neonBlue/25 p-2 rounded-sm items-center">
                            <Text className="text-neonBlue text-[10px] font-bold uppercase tracking-wider font-mono">
                              Disponíveis
                            </Text>
                            <Text className="text-white text-base font-bold font-mono mt-0.5">
                              {stat.disponiveis}
                            </Text>
                          </View>
                        </View>

                        <View className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-3">
                          <View
                            style={{ width: `${progressPct}%`, backgroundColor: subColor }}
                            className="h-full"
                          />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        )}

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
          role="COORDINATOR"
          onAccept={state.handleAcceptTerms}
          onCancel={state.handleLogout}
          loading={state.termsLoading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
