import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import { useSolenSounds } from './useSolenSounds';
import { ACTIVE_ANIMATION_TYPE } from '../config';
import {
  logout,
  getTurmas,
  getStudentsByTurma,
  registerStudentAsProfessor,
  generateQuest,
  createTurma,
  updateTurma,
  getQuestHistory,
  batchRegisterStudents,
  getUnassignedStudents,
  mockBossQuest,
  getProfessorDisciplinas,
  createGoldenQuestion,
  getGoldenQuestions,
  updateTurmaUnidade,
  createDisciplina,
  getDisciplinasWithProfessores,
  linkProfessorToDisciplina,
  unlinkProfessorFromDisciplina,
  getTurmaTimetable,
  saveTurmaTimetable,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getMasters,
  acceptTerms,
  deleteAccount,
  requestDeleteAccount,
  getMe,
  getPendingQuests,
  approveQuestBatch,
  regenerateQuest,
  refineQuest,
  updateQuest,
  getGoldenHelpRequests,
  replyGoldenHelpRequest,
  registerPushToken,
  uploadExcel,
  getGiftedArtifactsHistory,
} from '../services/api';

export function useMestreState() {
  const router = useRouter();
  const sounds = useSolenSounds();

  // Entrance Animation Setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        let token = null;
        try {
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          token = tokenData.data;
        } catch (e) {
          console.warn('[Notifications Mestre] Não foi possível obter o Expo Push Token:', e);
        }

        if (token) {
          await registerPushToken(token);
          console.log('[Notifications Mestre] Token registrado:', token);
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('quests', {
            name: 'Missões',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#00f3ff',
          });
        }
      } catch (err) {
        console.warn('[Notifications Mestre] Setup falhou:', err);
      }
    };

    setupNotifications();
  }, []);

  useEffect(() => {
    if (ACTIVE_ANIMATION_TYPE === 1) {
      fadeAnim.setValue(0);
      slideAnim.setValue(35);
      scaleAnim.setValue(1);
      rotateAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start();
    } else if (ACTIVE_ANIMATION_TYPE === 2) {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      scaleAnim.setValue(0.85);
      rotateAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 5, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 90, friction: 5, useNativeDriver: true }),
      ]).start();
    } else if (ACTIVE_ANIMATION_TYPE === 3) {
      fadeAnim.setValue(0);
      slideAnim.setValue(80);
      scaleAnim.setValue(0.8);
      rotateAnim.setValue(1);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.spring(rotateAnim, { toValue: 0, tension: 80, friction: 6, useNativeDriver: true }),
      ]).start();
    } else if (ACTIVE_ANIMATION_TYPE === 4) {
      fadeAnim.setValue(0);
      translateXAnim.setValue(-100);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(translateXAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  const [activeTab, setActiveTab] = useState('FORJA');
  const [showTerms, setShowTerms] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  // Forja State
  const [tema, setTema] = useState('');
  const [forjaTurmaId, setForjaTurmaId] = useState('');
  const [complexidade, setComplexidade] = useState('MEDIO');
  const [exigeCalculo, setExigeCalculo] = useState(false);
  const [tipoQuest, setTipoQuest] = useState<'CALCULO' | 'TEORICA' | 'MULTIPLA'>('TEORICA');
  const [forjando, setForjando] = useState(false);
  const [loadingBoss, setLoadingBoss] = useState(false);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [forjaDisciplinaId, setForjaDisciplinaId] = useState('');
  const [duracaoDiasBoss, setDuracaoDiasBoss] = useState('1');

  // Turmas State
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [newTurmaNome, setNewTurmaNome] = useState('');
  const [newTurmaAno, setNewTurmaAno] = useState('');
  const [newTurmaCodigo, setNewTurmaCodigo] = useState('1234');
  const [newTurmaNivel, setNewTurmaNivel] = useState('FUNDAMENTAL');
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);

  // Recrutamento State
  const [studentNome, setStudentNome] = useState('');
  const [studentMatricula, setStudentMatricula] = useState('');
  const [turno, setTurno] = useState('MATUTINO');
  const [recrutTurmaId, setRecrutTurmaId] = useState('');
  const [recrutando, setRecrutando] = useState(false);
  const [useBatch, setUseBatch] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Radar State
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loadingRadar, setLoadingRadar] = useState(false);

  // Histórico State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistoryQuestId, setExpandedHistoryQuestId] = useState<string | null>(null);

  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State para Perguntas Douradas
  const [goldenQuestionText, setGoldenQuestionText] = useState('');
  const [goldenQuestionTurmaId, setGoldenQuestionTurmaId] = useState('');
  const [goldenQuestionsList, setGoldenQuestionsList] = useState<any[]>([]);
  const [loadingGolden, setLoadingGolden] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<string>('PROFESSOR');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (currentUser?.institution?.tipo) {
      const tipo = currentUser.institution.tipo;
      if (tipo === 'MUNICIPAL') {
        setComplexidade('FUNDAMENTAL');
      } else if (tipo === 'ESTADUAL') {
        setComplexidade('MEDIO');
      } else if (tipo === 'PRIVADO_LIVRE') {
        setComplexidade('LIVRE');
      } else if (tipo === 'PRIVADO') {
        const activeTurma = turmas.find(t => t.id === forjaTurmaId);
        if (activeTurma) {
          setComplexidade(activeTurma.nivel || 'FUNDAMENTAL');
        } else if (turmas.length > 0) {
          setComplexidade(turmas[0].nivel || 'FUNDAMENTAL');
        } else {
          setComplexidade('FUNDAMENTAL');
        }
      }
    }
  }, [currentUser, forjaTurmaId, turmas]);

  const [newDisciplinaNome, setNewDisciplinaNome] = useState('');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState('');
  const [isLinkTemp, setIsLinkTemp] = useState(false);
  const [masters, setMasters] = useState<any[]>([]);
  const [allDisciplinasList, setAllDisciplinasList] = useState<any[]>([]);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);

  // Timetable
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [timetableTurmaId, setTimetableTurmaId] = useState('');
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Agenda / Calendar
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [newEventTitulo, setNewEventTitulo] = useState('');
  const [newEventDescricao, setNewEventDescricao] = useState('');
  const [newEventData, setNewEventData] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newEventTipo, setNewEventTipo] = useState('PROVA'); // PROVA, TRABALHO, TAREFA, EVENTO
  const [newEventTurmaId, setNewEventTurmaId] = useState('');

  // Afiar Quests / Arsenal de Rascunhos
  const [pendingBatches, setPendingBatches] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [editingEnunciado, setEditingEnunciado] = useState('');
  const [refiningQuestId, setRefiningQuestId] = useState<string | null>(null);
  const [sharpenPrompt, setSharpenPrompt] = useState('');
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertButtons, setAlertButtons] = useState<any[] | undefined>(undefined);

  // Help Requests State
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [loadingHelpRequests, setLoadingHelpRequests] = useState(false);

  // Gifted Artifacts History State
  const [giftedHistory, setGiftedHistory] = useState<any[]>([]);
  const [loadingGiftedHistory, setLoadingGiftedHistory] = useState(false);
  const [giftedHistoryPage, setGiftedHistoryPage] = useState(1);
  const [giftedHistoryTotalPages, setGiftedHistoryTotalPages] = useState(1);
  const [giftedHistoryDateFilter, setGiftedHistoryDateFilter] = useState('');
  const [helpReplyText, setHelpReplyText] = useState<{ [deliveryId: string]: string }>({});
  const prevHelpCountRef = useRef(0);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
      buttons?: any[]
    ) => {
      if (type === 'error' || type === 'warning') {
        sounds.playError();
      }
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertType(type);
      setAlertButtons(buttons);
      setAlertVisible(true);
    },
    [sounds]
  );

  const fetchHelpRequests = useCallback(async () => {
    try {
      setLoadingHelpRequests(true);
      const data = await getGoldenHelpRequests();
      const mapped = (data || []).map((item: any) => ({
        deliveryId: item.id,
        alunoNome: item.user?.nome || item.user?.nickname || 'Anônimo',
        questionText: item.quest?.enunciado || 'Questão indisponível',
        studentDoubt: item.studentDoubt,
      }));
      setHelpRequests(mapped);
      if (data && data.length > prevHelpCountRef.current) {
        sounds.playMission?.() || sounds.playSelect();
      }
      prevHelpCountRef.current = data ? data.length : 0;
    } catch (error) {
      console.error('Erro ao buscar chamados dourados:', error);
    } finally {
      setLoadingHelpRequests(false);
    }
  }, [sounds]);

  const fetchGiftedHistory = useCallback(async (page: number = 1, date?: string) => {
    try {
      setLoadingGiftedHistory(true);
      const activeDate = date !== undefined ? date : giftedHistoryDateFilter;
      const res = await getGiftedArtifactsHistory(page, 10, activeDate || undefined);
      setGiftedHistory(res.data || []);
      setGiftedHistoryPage(res.pagination?.page || 1);
      setGiftedHistoryTotalPages(res.pagination?.totalPages || 1);
      if (date !== undefined) {
        setGiftedHistoryDateFilter(date);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de presentes:', error);
    } finally {
      setLoadingGiftedHistory(false);
    }
  }, [giftedHistoryDateFilter]);

  const handleReplyHelp = async (deliveryId: string, useAi: boolean = false) => {
    const text = helpReplyText[deliveryId] || '';
    if (!useAi && !text.trim()) {
      showAlert('Aviso', 'Digite uma resposta conceitual ou ative a sugestão de IA.', 'warning');
      return;
    }

    try {
      setLoadingHelpRequests(true);
      const res = await replyGoldenHelpRequest(deliveryId, {
        response: useAi ? undefined : text.trim(),
        requestAiSuggestion: useAi,
      });

      if (useAi) {
        if (res && res.aiSuggestion) {
          setHelpReplyText((prev) => ({ ...prev, [deliveryId]: res.aiSuggestion }));
          showAlert(
            'Sugestão da IA Gerada!',
            'A IA de Solen gerou uma sugestão conceitual. Revise-a no campo abaixo, edite se necessário e clique em "Enviar Dica Manual" para salvar!',
            'success'
          );
        } else {
          showAlert('Erro', 'Não foi possível obter sugestão da IA.', 'error');
        }
      } else {
        showAlert('Sucesso', 'Sua dica conceitual foi registrada com sucesso!', 'success');
        setHelpReplyText((prev) => ({ ...prev, [deliveryId]: '' }));
        fetchHelpRequests();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao responder chamado.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingHelpRequests(false);
    }
  };

  const fetchGoldenQuestions = useCallback(async () => {
    try {
      setLoadingGolden(true);
      const data = await getGoldenQuestions();
      setGoldenQuestionsList(data);
    } catch (error) {
      console.error('Erro ao buscar perguntas douradas', error);
    } finally {
      setLoadingGolden(false);
    }
  }, []);

  const handleSendGoldenQuestion = async () => {
    if (!goldenQuestionText.trim()) {
      showAlert('CAMPO VAZIO', 'Digite o enunciado da pergunta dourada.', 'warning');
      return;
    }
    if (!goldenQuestionTurmaId) {
      showAlert('TURMA INDEFINIDA', 'Selecione uma turma para receber a pergunta dourada.', 'warning');
      return;
    }

    try {
      setLoadingGolden(true);
      await createGoldenQuestion(goldenQuestionText, goldenQuestionTurmaId);
      showAlert('MENSAGEM DO SISTEMA', 'Pergunta Dourada disparada com sucesso!', 'success');
      setGoldenQuestionText('');
      setGoldenQuestionTurmaId('');
      fetchGoldenQuestions();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao forjar pergunta dourada.';
      showAlert('ERRO DE TRANSMUTAÇÃO', msg, 'error');
    } finally {
      setLoadingGolden(false);
    }
  };

  const fetchDisciplinasWithProfessores = useCallback(async () => {
    try {
      setLoadingDisciplinas(true);
      const data = await getDisciplinasWithProfessores();
      setAllDisciplinasList(data);
    } catch (error) {
      console.error('Erro ao carregar matérias e professores:', error);
    } finally {
      setLoadingDisciplinas(false);
    }
  }, []);

  const fetchCalendarEvents = useCallback(async () => {
    try {
      setLoadingCalendar(true);
      const data = await getCalendarEvents();
      setCalendarEvents(data);
    } catch (error) {
      console.error('Erro ao carregar agenda:', error);
    } finally {
      setLoadingCalendar(false);
    }
  }, []);

  const fetchTimetable = useCallback(async (turmaId: string) => {
    if (!turmaId) return;
    try {
      setLoadingTimetable(true);
      const data = await getTurmaTimetable(turmaId);
      setTimetableSlots(data);
    } catch (error) {
      console.error('Erro ao carregar grade de horários:', error);
    } finally {
      setLoadingTimetable(false);
    }
  }, []);

  const handleCreateDisciplina = async () => {
    if (!newDisciplinaNome.trim()) {
      showAlert('Aviso', 'Digite o nome da disciplina.', 'warning');
      return;
    }
    try {
      setLoadingDisciplinas(true);
      await createDisciplina(newDisciplinaNome);
      showAlert('Sucesso', 'Matéria criada com sucesso!', 'success');
      setNewDisciplinaNome('');
      fetchDisciplinasWithProfessores();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao criar matéria.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  const handleLinkProfessor = async () => {
    if (!selectedProfessorId || !selectedDisciplinaId) {
      showAlert('Aviso', 'Selecione o professor e a disciplina.', 'warning');
      return;
    }
    try {
      setLoadingDisciplinas(true);
      await linkProfessorToDisciplina(selectedProfessorId, selectedDisciplinaId, isLinkTemp);
      showAlert('Sucesso', 'Professor vinculado com sucesso!', 'success');
      setIsLinkTemp(false);
      fetchDisciplinasWithProfessores();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao vincular professor.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  const handleUnlinkProfessor = async (professorId: string, disciplinaId: string) => {
    try {
      setLoadingDisciplinas(true);
      await unlinkProfessorFromDisciplina(professorId, disciplinaId);
      showAlert('Sucesso', 'Vínculo do professor removido com sucesso!', 'success');
      fetchDisciplinasWithProfessores();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao desvincular professor.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  const handleSaveTimetableSlot = async (
    diaSemana: string,
    posicao: number,
    disciplinaId: string
  ) => {
    if (!timetableTurmaId) return;
    try {
      setLoadingTimetable(true);
      await saveTurmaTimetable(timetableTurmaId, [{ diaSemana, posicao, disciplinaId }]);
      fetchTimetable(timetableTurmaId);
      showAlert('Sucesso', 'Horário salvo na grade!', 'success');
    } catch (err: any) {
      showAlert('Erro', 'Não foi possível salvar o horário.', 'error');
    } finally {
      setLoadingTimetable(false);
    }
  };

  const handleCreateCalendarEvent = async () => {
    if (!newEventTitulo.trim() || !newEventTurmaId) {
      showAlert('Aviso', 'Preencha o título e selecione a turma.', 'warning');
      return;
    }
    try {
      setLoadingCalendar(true);
      await createCalendarEvent(
        newEventTitulo,
        newEventData,
        newEventTipo,
        newEventTurmaId,
        newEventDescricao
      );
      showAlert('Sucesso', 'Evento adicionado na agenda!', 'success');
      setNewEventTitulo('');
      setNewEventDescricao('');
      fetchCalendarEvents();
    } catch (err: any) {
      showAlert('Erro', 'Erro ao criar evento na agenda.', 'error');
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleDeleteCalendarEvent = async (id: string) => {
    try {
      setLoadingCalendar(true);
      await deleteCalendarEvent(id);
      showAlert('Sucesso', 'Evento removido da agenda!', 'success');
      fetchCalendarEvents();
    } catch (err: any) {
      showAlert('Erro', 'Erro ao remover evento.', 'error');
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleUpdateUnidade = async (turmaId: string, unidade: number) => {
    try {
      await updateTurmaUnidade(turmaId, unidade);
      setTurmas((prev) => prev.map((t) => (t.id === turmaId ? { ...t, unidade } : t)));
      showAlert('Sucesso', `Unidade da turma alterada para a Unidade ${unidade}!`, 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao alterar unidade.';
      showAlert('Erro', msg, 'error');
    }
  };

  const fetchInitialData = useCallback(async () => {
    try {
      const userRaw = await AsyncStorage.getItem('@Solen:user');
      let localUser: any = null;
      if (userRaw) {
        const u = JSON.parse(userRaw);
        localUser = u;
        setCurrentUser(u);
        setCurrentUserRole(u.role || 'PROFESSOR');
        if (!u.acceptedTermsAt) {
          setShowTerms(true);
        }
      }

      const freshUser = await getMe();
      if (freshUser) {
        await AsyncStorage.setItem('@Solen:user', JSON.stringify(freshUser));
        setCurrentUser(freshUser);
        setCurrentUserRole(freshUser.role || 'PROFESSOR');
        if (!freshUser.acceptedTermsAt) {
          setShowTerms(true);
        } else {
          setShowTerms(false);
        }
      }

      getMasters()
        .then((data) => setMasters(data))
        .catch(() => {});
      fetchDisciplinasWithProfessores();
      fetchCalendarEvents();
    } catch (e) {
      console.error(e);
    }
  }, [fetchDisciplinasWithProfessores, fetchCalendarEvents]);

  const handleAcceptTerms = async (parentConsentName?: string) => {
    setTermsLoading(true);
    try {
      await acceptTerms(parentConsentName);
      setShowTerms(false);
      showAlert(
        '🛡️ ALIANÇA FIRMADA',
        'O Protocolo de Privacidade foi assinado com sucesso. Boa jornada, Mestre!',
        'success'
      );
    } catch (e: any) {
      console.error(e);
      showAlert('Erro', e.message || 'Erro ao firmar aliança.', 'error');
    } finally {
      setTermsLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);

  const handleDeleteAccount = () => {
    setDeleteReason('');
    setDeleteEmail('');
    setShowDeleteModal(true);
  };

  const handleSubmitDeleteRequest = async () => {
    if (!deleteReason.trim() || !deleteEmail.trim()) {
      showAlert('Aviso', 'O motivo e o e-mail de contato são obrigatórios.', 'warning');
      return;
    }
    try {
      setIsRequestingDeletion(true);
      await requestDeleteAccount(deleteReason, deleteEmail);
      setShowDeleteModal(false);
      showAlert('Solicitação Enviada', 'Sua solicitação de exclusão de conta foi enviada ao Arquiteto para avaliação.', 'success');
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Não foi possível enviar a solicitação.';
      showAlert('Erro', msg, 'error');
    } finally {
      setIsRequestingDeletion(false);
    }
  };

  const fetchTurmasData = useCallback(async () => {
    try {
      setLoadingTurmas(true);
      const data = await getTurmas();
      setTurmas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTurmas(false);
    }
  }, []);

  const fetchUnassignedStudents = useCallback(async () => {
    try {
      setLoadingUnassigned(true);
      const data = await getUnassignedStudents();
      setUnassignedStudents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUnassigned(false);
    }
  }, []);

  const fetchDisciplinas = useCallback(async () => {
    try {
      const data = await getProfessorDisciplinas();
      setDisciplinas(data);
      if (data.length > 0 && !forjaDisciplinaId) {
        setForjaDisciplinaId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas');
    }
  }, [forjaDisciplinaId]);

  const fetchPendingQuests = useCallback(async () => {
    try {
      setLoadingPending(true);
      const data = await getPendingQuests();
      setPendingBatches(data);
    } catch (error) {
      console.error('Erro ao buscar rascunhos:', error);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const fetchStudents = useCallback(
    async (turmaId: string) => {
      try {
        setLoadingRadar(true);
        const data = await getStudentsByTurma(turmaId);
        setStudents(data);
      } catch (error) {
        showAlert('Erro', 'Falha ao buscar caçadores.', 'error');
      } finally {
        setLoadingRadar(false);
      }
    },
    [showAlert]
  );

  const fetchHistory = useCallback(
    async () => {
      try {
        setLoadingHistory(true);
        const data = await getQuestHistory();
        setHistory(data);
      } catch (error) {
        showAlert('Erro', 'Falha ao buscar histórico.', 'error');
      } finally {
        setLoadingHistory(false);
      }
    },
    [showAlert]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTurmasData(),
      fetchUnassignedStudents(),
      fetchDisciplinas(),
      fetchGoldenQuestions(),
      fetchInitialData(),
      fetchPendingQuests(),
      fetchHelpRequests(),
      fetchGiftedHistory(),
      selectedTurmaId ? fetchStudents(selectedTurmaId) : Promise.resolve(),
      timetableTurmaId ? fetchTimetable(timetableTurmaId) : Promise.resolve(),
      activeTab === 'HISTÓRICO' ? fetchHistory() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    refreshRef.current = () => {
      fetchTurmasData();
      fetchUnassignedStudents();
      fetchDisciplinas();
      fetchGoldenQuestions();
      fetchInitialData();
      fetchPendingQuests();
      fetchHelpRequests();
      fetchGiftedHistory();
      if (selectedTurmaId) fetchStudents(selectedTurmaId);
      if (timetableTurmaId) fetchTimetable(timetableTurmaId);
      if (activeTab === 'HISTÓRICO') fetchHistory();
    };
  });

  useEffect(() => {
    // Executa imediatamente ao carregar/logar
    if (refreshRef.current) {
      refreshRef.current();
    }

    // Executa periodicamente a cada 5 minutos
    const silentRefreshInterval = setInterval(() => {
      if (refreshRef.current) {
        refreshRef.current();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(silentRefreshInterval);
  }, []);

  const handleAssignTurma = (student: any) => {
    if (turmas.length === 0) {
      showAlert('Aviso', 'Você precisa criar uma turma primeiro.', 'warning');
      return;
    }

    const options = turmas.map((t) => ({
      text: t.nome,
      onPress: async () => {
        try {
          await registerStudentAsProfessor(
            student.matricula,
            student.nome,
            student.turno || 'MATUTINO',
            t.id
          );
          showAlert('Sucesso', `${student.nome} associado à turma ${t.nome}!`, 'success');
          fetchUnassignedStudents();
        } catch (error: any) {
          showAlert('Erro', error.response?.data?.error || 'Erro ao associar aluno.', 'error');
        }
      },
    }));

    options.push({ text: 'Cancelar', onPress: () => {} } as any);

    showAlert(
      'Associar Aluno',
      `Escolha a turma para ${student.nickname || student.nome}:`,
      'info',
      options
    );
  };

  useEffect(() => {
    if (selectedTurmaId) {
      fetchStudents(selectedTurmaId);
    }
  }, [selectedTurmaId]);

  useEffect(() => {
    if (activeTab === 'HISTÓRICO') {
      fetchHistory();
    }
    if (activeTab === 'TURMAS') {
      fetchGoldenQuestions();
      fetchGiftedHistory();
    }
    if (activeTab === 'AJUDAS') {
      fetchHelpRequests();
    }
  }, [activeTab, fetchHistory, fetchGoldenQuestions, fetchGiftedHistory, fetchHelpRequests]);

  const handleApproveBatch = async (batchId: string) => {
    try {
      setLoadingActionId(batchId);
      await approveQuestBatch(batchId);
      showAlert(
        '🛡️ ORDEM CONCLUÍDA',
        'O lote foi forjado com sucesso e está ativo para os Caçadores!',
        'success'
      );
      fetchPendingQuests();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao aprovar lote.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleRegenerateQuest = async (questId: string) => {
    try {
      setLoadingActionId(questId);
      await regenerateQuest(questId);
      showAlert('⚡ RE-FORJA CONCLUÍDA', 'A missão foi gerada novamente pela IA com sucesso.', 'success');
      fetchPendingQuests();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao re-forjar missão.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleRefineQuest = async (questId: string) => {
    if (!sharpenPrompt.trim()) {
      showAlert('Aviso', 'Escreva uma instrução para a IA.', 'warning');
      return;
    }
    try {
      setLoadingActionId(questId);
      await refineQuest(questId, sharpenPrompt.trim());
      showAlert('✨ MISSÃO AFIADA', 'A IA adaptou a pergunta com base na sua instrução!', 'success');
      setRefiningQuestId(null);
      setSharpenPrompt('');
      fetchPendingQuests();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao afiar missão.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleSaveManualQuest = async (questId: string) => {
    if (!editingEnunciado.trim()) {
      showAlert('Aviso', 'O enunciado não pode ser vazio.', 'warning');
      return;
    }
    try {
      setLoadingActionId(questId);
      await updateQuest(questId, editingEnunciado.trim());
      showAlert('✏️ ALTERAÇÃO CONCLUÍDA', 'Missão atualizada manualmente.', 'success');
      setEditingQuestId(null);
      setEditingEnunciado('');
      fetchPendingQuests();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao atualizar missão.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleForjarQuest = async () => {
    if (!tema || !forjaTurmaId || !forjaDisciplinaId) {
      showAlert('Aviso', 'Preencha Turma, Tema e Disciplina.', 'warning');
      return;
    }
    const semana = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    try {
      setForjando(true);
      await generateQuest(
        semana,
        forjaTurmaId,
        tema,
        complexidade,
        exigeCalculo,
        forjaDisciplinaId,
        tipoQuest
      );
      showAlert(
        'Sucesso',
        'Nova missão gerada na forja! Verifique a aba de rascunhos abaixo para afiar e ativar.',
        'success'
      );
      setTema('');
      fetchPendingQuests();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao gerar missão.';
      const details = error.response?.data?.details
        ? `\n\nDetalhes: ${error.response.data.details}`
        : '';
      showAlert('Erro do Sistema', `${msg}${details}`, 'error');
    } finally {
      setForjando(false);
    }
  };

  const handleInvocacaoRapidaBOSS = async () => {
    if (!tema || !forjaTurmaId) {
      showAlert('Aviso', 'Preencha Turma e Tema.', 'warning');
      return;
    }
    const dias = parseInt(duracaoDiasBoss) || 1;
    const semana = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    try {
      setLoadingBoss(true);
      await mockBossQuest(forjaTurmaId, tema, semana, dias);
      showAlert('Sucesso', 'Missão BOSS invocada para teste!', 'success');
      setTema('');
      setDuracaoDiasBoss('1');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao invocar BOSS.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingBoss(false);
    }
  };

  const handleCreateOrUpdateTurma = async () => {
    if (!newTurmaNome.trim() || !newTurmaAno.trim()) {
      showAlert('Aviso', 'Nome e Ano são obrigatórios.', 'warning');
      return;
    }

    try {
      setLoadingTurmas(true);
      if (editingTurmaId) {
        await updateTurma(editingTurmaId, {
          nome: newTurmaNome.toUpperCase(),
          ano: newTurmaAno,
          codigoInvocacao: newTurmaCodigo,
          nivel: newTurmaNivel,
        });
        showAlert('Sucesso', 'Turma atualizada!', 'success');
      } else {
        await createTurma(newTurmaNome, newTurmaAno, newTurmaCodigo, newTurmaNivel);
        showAlert('Sucesso', 'Turma criada!', 'success');
      }
      setNewTurmaNome('');
      setNewTurmaAno('');
      setNewTurmaCodigo('1234');
      setEditingTurmaId(null);
      fetchTurmasData();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro na operação.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingTurmas(false);
    }
  };

  const handleRecrutar = async () => {
    if (!studentNome.trim() || !studentMatricula.trim() || !recrutTurmaId) {
      showAlert('Aviso', 'Preencha todos os campos.', 'warning');
      return;
    }
    try {
      setRecrutando(true);
      await registerStudentAsProfessor(
        studentMatricula.trim().toLowerCase(),
        studentNome.trim(),
        turno,
        recrutTurmaId
      );
      showAlert('Sucesso', 'Novo caçador recrutado!', 'success');
      setStudentNome('');
      setStudentMatricula('');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao recrutar.';
      showAlert('Erro', msg, 'error');
    } finally {
      setRecrutando(false);
    }
  };

  const handleCopyTemplate = async () => {
    try {
      const template =
        'Nome;Matricula;Turma;Turno\nArthur Pendragon;2026101;5A;MATUTINO\nSung Jinwoo;2026102;5A;VESPERTINO';
      await Clipboard.setStringAsync(template);
      sounds.playSuccess?.() || sounds.playSelect();
      showAlert('Copiado!', 'Template de importação CSV copiado para a área de transferência!', 'success');
    } catch (err) {
      showAlert('Erro', 'Não foi possível copiar o template.', 'error');
    }
  };

  const handleSelectExcel = async () => {
    try {
      sounds.playSelect();
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
          'application/csv'
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileAsset = result.assets[0];
      if (!fileAsset) return;

      setLoadingTurmas(true);
      let base64 = '';
      if (Platform.OS === 'web') {
        const response = await fetch(fileAsset.uri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            resolve(resultStr.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        const FileSystem = require('expo-file-system/legacy');
        base64 = await FileSystem.readAsStringAsync(fileAsset.uri, {
          encoding: 'base64',
        });
      }

      const parsedRows = await uploadExcel(base64);
      if (parsedRows && Array.isArray(parsedRows)) {
        setExcelData(parsedRows);
        showAlert(
          'Arquivo Carregado',
          `Planilha processada! Detectamos ${parsedRows.length} registros. Clique em Confirmar para salvar.`,
          'success'
        );
      } else {
        showAlert('Erro', 'Não foi possível interpretar os dados da planilha.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showAlert('Erro', 'Falha ao processar arquivo Excel: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoadingTurmas(false);
    }
  };

  const handleBatchRecrutarExcel = async () => {
    if (!excelData || excelData.length === 0) {
      showAlert('Aviso', 'Selecione uma planilha de alunos válida primeiro.', 'warning');
      return;
    }

    const studentsList: { nome: string; matricula: string; turno: string; targetTurmaId?: string }[] = [];
    const localValidationErrors: string[] = [];

    for (const row of excelData) {
      const nomeVal = row.nome || '';
      const matriculaVal = row.matricula || '';
      if (!nomeVal || !matriculaVal) continue;

      let turnoVal = row.turno || turno;
      const normalizedTurno = String(turnoVal)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      let finalTurno = 'MATUTINO';
      if (normalizedTurno.includes('VESPERTINO') || normalizedTurno.includes('TARDE')) {
        finalTurno = 'VESPERTINO';
      } else if (normalizedTurno.includes('NOTURNO') || normalizedTurno.includes('NOITE')) {
        finalTurno = 'NOTURNO';
      }

      let targetTurmaId = recrutTurmaId;
      if (row.turma) {
        const turmaNomeCSV = String(row.turma).trim();
        if (turmaNomeCSV) {
          const foundTurma = turmas.find((t) => t.nome.toUpperCase() === turmaNomeCSV.toUpperCase());
          if (foundTurma) {
            targetTurmaId = foundTurma.id;
          } else {
            localValidationErrors.push(
              `• Aluno "${nomeVal}": A guilda/turma "${turmaNomeCSV}" não existe nesta instituição.`
            );
          }
        }
      }

      studentsList.push({
        nome: String(nomeVal),
        matricula: String(matriculaVal),
        turno: finalTurno,
        targetTurmaId: targetTurmaId,
      });
    }

    if (localValidationErrors.length > 0) {
      showAlert(
        'Erro de Importação',
        `Inconsistência de Turmas detectada:\n\n${localValidationErrors.join(
          '\n'
        )}\n\nPor favor, crie as turmas correspondentes ou corrija o arquivo antes de tentar novamente.`,
        'error'
      );
      return;
    }

    if (studentsList.length === 0) {
      showAlert('Aviso', 'Nenhum aluno válido encontrado na planilha.', 'warning');
      return;
    }

    const firstStudentTurma = studentsList[0].targetTurmaId;
    if (!firstStudentTurma) {
      showAlert(
        'Aviso',
        'Por favor, selecione a turma de destino no topo ou certifique-se de que a turma informada na planilha já existe.',
        'warning'
      );
      return;
    }

    try {
      setRecrutando(true);
      const groups: { [turmaId: string]: typeof studentsList } = {};
      studentsList.forEach((s) => {
        const tId = s.targetTurmaId || firstStudentTurma;
        if (!groups[tId]) groups[tId] = [];
        groups[tId].push(s);
      });

      let totalSuccess = 0;
      let totalErrors: string[] = [];

      for (const tId of Object.keys(groups)) {
        const list = groups[tId].map(({ nome, matricula, turno }) => ({ nome, matricula, turno }));
        const res = await batchRegisterStudents(list, tId);
        totalSuccess += list.length;
        if (res.errors) {
          totalErrors = [...totalErrors, ...res.errors];
        }
      }

      showAlert(
        'Portal de Recrutamento',
        `Importação em lote concluído para ${totalSuccess} alunos.${
          totalErrors.length > 0 ? '\n\nErros:\n' + totalErrors.join('\n') : ''
        }`,
        'info'
      );
      setExcelData([]);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao processar lote de alunos.';
      showAlert('Erro', msg, 'error');
    } finally {
      setRecrutando(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return {
    fadeAnim,
    slideAnim,
    scaleAnim,
    rotateAnim,
    translateXAnim,
    activeTab,
    setActiveTab,
    showTerms,
    termsLoading,
    tema,
    setTema,
    forjaTurmaId,
    setForjaTurmaId,
    complexidade,
    setComplexidade,
    exigeCalculo,
    setExigeCalculo,
    tipoQuest,
    setTipoQuest,
    forjando,
    loadingBoss,
    disciplinas,
    forjaDisciplinaId,
    setForjaDisciplinaId,
    duracaoDiasBoss,
    setDuracaoDiasBoss,
    turmas,
    loadingTurmas,
    newTurmaNome,
    setNewTurmaNome,
    newTurmaAno,
    setNewTurmaAno,
    newTurmaCodigo,
    setNewTurmaCodigo,
    newTurmaNivel,
    setNewTurmaNivel,
    editingTurmaId,
    setEditingTurmaId,
    studentNome,
    setStudentNome,
    studentMatricula,
    setStudentMatricula,
    turno,
    setTurno,
    recrutTurmaId,
    setRecrutTurmaId,
    recrutando,
    useBatch,
    setUseBatch,
    csvText,
    setCsvText,
    selectedTurmaId,
    setSelectedTurmaId,
    students,
    loadingRadar,
    history,
    loadingHistory,
    expandedHistoryQuestId,
    setExpandedHistoryQuestId,
    unassignedStudents,
    loadingUnassigned,
    refreshing,
    goldenQuestionText,
    setGoldenQuestionText,
    goldenQuestionTurmaId,
    setGoldenQuestionTurmaId,
    goldenQuestionsList,
    loadingGolden,
    expandedQuestionId,
    setExpandedQuestionId,
    currentUserRole,
    currentUser,
    newDisciplinaNome,
    setNewDisciplinaNome,
    selectedProfessorId,
    setSelectedProfessorId,
    selectedDisciplinaId,
    setSelectedDisciplinaId,
    isLinkTemp,
    setIsLinkTemp,
    masters,
    allDisciplinasList,
    loadingDisciplinas,
    timetableSlots,
    timetableTurmaId,
    setTimetableTurmaId,
    loadingTimetable,
    calendarEvents,
    loadingCalendar,
    newEventTitulo,
    setNewEventTitulo,
    newEventDescricao,
    setNewEventDescricao,
    newEventData,
    setNewEventData,
    showDatePicker,
    setShowDatePicker,
    newEventTipo,
    setNewEventTipo,
    newEventTurmaId,
    setNewEventTurmaId,
    pendingBatches,
    loadingPending,
    editingQuestId,
    setEditingQuestId,
    editingEnunciado,
    setEditingEnunciado,
    refiningQuestId,
    setRefiningQuestId,
    sharpenPrompt,
    setSharpenPrompt,
    loadingActionId,
    alertVisible,
    setAlertVisible,
    alertTitle,
    alertMessage,
    alertType,
    alertButtons,
    helpRequests,
    loadingHelpRequests,
    helpReplyText,
    setHelpReplyText,
    showAlert,
    fetchHelpRequests,
    fetchPendingQuests,
    handleReplyHelp,
    fetchGoldenQuestions,
    handleSendGoldenQuestion,
    fetchDisciplinasWithProfessores,
    fetchCalendarEvents,
    fetchTimetable,
    handleCreateDisciplina,
    handleLinkProfessor,
    handleUnlinkProfessor,
    handleSaveTimetableSlot,
    handleCreateCalendarEvent,
    handleDeleteCalendarEvent,
    handleUpdateUnidade,
    fetchInitialData,
    handleAcceptTerms,
    handleDeleteAccount,
    showDeleteModal,
    setShowDeleteModal,
    deleteReason,
    setDeleteReason,
    deleteEmail,
    setDeleteEmail,
    isRequestingDeletion,
    handleSubmitDeleteRequest,
    giftedHistory,
    loadingGiftedHistory,
    giftedHistoryPage,
    giftedHistoryTotalPages,
    giftedHistoryDateFilter,
    fetchGiftedHistory,
    onRefresh,
    handleAssignTurma,
    handleApproveBatch,
    handleRegenerateQuest,
    handleRefineQuest,
    handleSaveManualQuest,
    handleForjarQuest,
    handleInvocacaoRapidaBOSS,
    handleCreateOrUpdateTurma,
    handleRecrutar,
    handleCopyTemplate,
    handleSelectExcel,
    handleBatchRecrutarExcel,
    excelData,
    setExcelData,
    handleLogout,
  };
}
