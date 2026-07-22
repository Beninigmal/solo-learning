import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { useSolenSounds } from './useSolenSounds';
import { ACTIVE_ANIMATION_TYPE } from '../config';
import {
  registerMaster,
  getMasters,
  updateMaster,
  logout,
  getAdminTurmas,
  getAdminStudents,
  updateStudent,
  getDisciplinas,
  createVinculo,
  deleteVinculo,
  createTurma, createDefaultDisciplinas, deleteUnlinkedDisciplinas,
  updateAdminTurma,
  createGoldenQuestion,
  getGoldenQuestions,
  createDisciplina,
  getDisciplinasWithProfessores,
  linkProfessorToDisciplina,
  unlinkProfessorFromDisciplina,
  getStudentSubjectStats,
  saveTurmaTimetable,
  getTurmaTimetable,
  updateDisciplina,
  deleteDisciplina,
  deleteTurmaTimetableSlot,
  autoGenerateTurmaTimetable,
  acceptTerms,
  deleteAccount,
  getMe,
  registerStudentAsProfessor,
  batchRegisterStudents,
  resetStudentAccess,
  resetMasterAccess,
  getInstitutionShiftSettings,
  saveInstitutionShiftSetting,
  getProfessorRestrictions,
  saveProfessorRestrictions,
  batchGenerateTimetable,
  updateTurmaDisciplinaConfig,
  getTurmaDisciplinaConfig,
  uploadExcel,
  batchRegisterMasters,
  updateTurmaUnidade,
  getDeleteRequests,
  confirmDeleteRequest,
  rejectDeleteRequest,
  deleteUser,
} from '../services/api';

export function useAdminState() {
  const router = useRouter();
  const sounds = useSolenSounds();

  // Entrance Animation Setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (ACTIVE_ANIMATION_TYPE === 1) {
      fadeAnim.setValue(0);
      slideAnim.setValue(35);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start();
    } else if (ACTIVE_ANIMATION_TYPE === 2) {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      scaleAnim.setValue(0.85);
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

  const [currentUser, setCurrentUser] = useState<any>(null);

  // State para Mestres
  const [nome, setNome] = useState('');
  const [nickname, setNickname] = useState('');
  const [matricula, setMatricula] = useState('');
  const [instituicao, setInstituicao] = useState('');
  // Aqui maxAulasSemanais no state representa as Horas de Contrato (ex: 20, 24, 40)
  // que o arquiteto digita. Na hora de salvar, convertemos para o limite de aulas em sala.
  const [maxAulasSemanais, setMaxAulasSemanais] = useState('20');
  const [categoria, setCategoria] = useState<'CONCURSADO' | 'REDA' | 'CLT'>('CONCURSADO');

  useEffect(() => {
    if (currentUser?.institution?.tipo) {
      const tipo = currentUser.institution.tipo;
      const isPrivate = tipo.startsWith('PRIVADO');
      if (isPrivate) {
        setCategoria('CLT');
      } else {
        setCategoria('CONCURSADO');
      }

      // Automatically set default turmaNivel based on active institution's type
      if (tipo === 'MUNICIPAL') {
        setTurmaNivel('FUNDAMENTAL');
      } else if (tipo === 'ESTADUAL') {
        setTurmaNivel('MEDIO');
      } else if (tipo === 'PRIVADO_LIVRE') {
        setTurmaNivel('LIVRE');
      } else if (tipo === 'PRIVADO') {
        setTurmaNivel('FUNDAMENTAL');
      }
    }
  }, [currentUser]);

  const [loading, setLoading] = useState(false);
  const [masters, setMasters] = useState<any[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);

  // State para Alunos
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentNome, setStudentNome] = useState('');
  const [studentNickname, setStudentNickname] = useState('');
  const [studentTurmaId, setStudentTurmaId] = useState('');

  // Recrutamento Alunos
  const [turno, setTurno] = useState('MATUTINO');
  const [recrutTurmaId, setRecrutTurmaId] = useState('');
  const [recrutStudentNome, setRecrutStudentNome] = useState('');
  const [recrutStudentMatricula, setRecrutStudentMatricula] = useState('');
  const [recrutando, setRecrutando] = useState(false);
  const [useBatch, setUseBatch] = useState(false);
  const [csvText, setCsvText] = useState('');

  // State para Vínculos
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [selectedProfId, setSelectedProfId] = useState('');
  const [selectedDiscId, setSelectedDiscId] = useState('');
  const [selectedLinkTurmaId, setSelectedLinkTurmaId] = useState('');
  const [loadingLink, setLoadingLink] = useState(false);

  // State para Manejo de Disciplinas (Matérias)
  const [newDisciplinaNome, setNewDisciplinaNome] = useState('');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState('');
  const [isLinkTemp, setIsLinkTemp] = useState(false);
  const [selectedLinkTurmaIds, setSelectedLinkTurmaIds] = useState<string[]>([]);
  const [allDisciplinasList, setAllDisciplinasList] = useState<any[]>([]);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);
  const [loadingCreateDisciplina, setLoadingCreateDisciplina] = useState(false);
  const [loadingLinkProfessor, setLoadingLinkProfessor] = useState(false);
  const [aulasSemanais, setAulasSemanais] = useState('0');
  const [deleteRequests, setDeleteRequests] = useState<any[]>([]);
  const [loadingDeleteRequests, setLoadingDeleteRequests] = useState(false);

  // State para Criação de Turmas
  const [turmaNome, setTurmaNome] = useState('');
  const [turmaAno, setTurmaAno] = useState('');
  const [turmaCodigo, setTurmaCodigo] = useState('');
  const [turmaNivel, setTurmaNivel] = useState('FUNDAMENTAL');
  const [excelData, setExcelData] = useState<any[]>([]);
  const [loadingTurma, setLoadingTurma] = useState(false);
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Turma accordions
  const [expandedMembersId, setExpandedMembersId] = useState<string | null>(null);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('RECRUTAR');
  const [showTerms, setShowTerms] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  // Rastreamento analitico de alunos (Arquiteto)
  const [expandedTurmaId, setExpandedTurmaId] = useState<string | null>(null);
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState('');
  const [selectedClassProfessorId, setSelectedClassProfessorId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentStats, setStudentStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // State para Perguntas Douradas
  const [goldenQuestionText, setGoldenQuestionText] = useState('');
  const [goldenQuestionTurmaId, setGoldenQuestionTurmaId] = useState('');
  const [goldenQuestionsList, setGoldenQuestionsList] = useState<any[]>([]);
  const [loadingGolden, setLoadingGolden] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // State para Edição de Disciplina
  const [editingDisciplinaId, setEditingDisciplinaId] = useState<string | null>(null);
  const [editingDisciplinaNome, setEditingDisciplinaNome] = useState('');

  // State para SystemAlert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertButtons, setAlertButtons] = useState<any[]>([]);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
      buttons?: any[]
    ) => {
      if (type === 'error') {
        sounds.playError();
      } else if (type === 'warning') {
        sounds.playSelect();
      }
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertType(type);
      setAlertButtons(buttons || [{ text: 'OK', onPress: () => setAlertVisible(false) }]);
      setAlertVisible(true);
    },
    [sounds]
  );

  const fetchMasters = useCallback(async () => {
    try {
      setLoadingMasters(true);
      const data = await getMasters();
      setMasters(data);
    } catch (error) {
      console.error('Erro ao carregar mestres');
    } finally {
      setLoadingMasters(false);
    }
  }, []);

  const fetchTurmas = useCallback(async () => {
    try {
      const data = await getAdminTurmas();
      const sorted = (data || []).sort((a: any, b: any) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));
      setTurmas(sorted);
    } catch (error) {
      console.error('Erro ao carregar turmas');
    }
  }, []);

  const fetchDisciplinas = useCallback(async () => {
    try {
      const data = await getDisciplinas();
      setDisciplinas(data);
    } catch (error) {
      console.error('Erro ao carregar disciplinas');
    }
  }, []);

  const fetchDisciplinasWithProfessores = useCallback(async () => {
    try {
      setLoadingDisciplinas(true);
      const data = await getDisciplinasWithProfessores();
      setAllDisciplinasList(data);
    } catch (err) {
      console.error('Erro ao buscar matérias com professores', err);
    } finally {
      setLoadingDisciplinas(false);
    }
  }, []);

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

  const fetchStudents = useCallback(async (turmaId?: string) => {
    try {
      setLoadingStudents(true);
      const data = await getAdminStudents(turmaId);
      setStudents(data);
    } catch (error) {
      console.error('Erro ao carregar alunos');
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  // State para Timetable (Grade de Horários)
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [timetableTurmaId, setTimetableTurmaId] = useState('');
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [selectedShift, setSelectedShift] = useState<'MATUTINO' | 'VESPERTINO' | 'NOTURNO'>(
    'MATUTINO'
  );
  const [selectedTimetableDisciplinaId, setSelectedTimetableDisciplinaId] = useState('');
  // Monarch Engine v3 — Configuração de aulas por disciplina
  const [disciplinaConfig, setDisciplinaConfig] = useState<{ disciplinaId: string; disciplinaNome: string; aulasSemanais: number; geminada: boolean }[]>([]);
  const [loadingBatchGenerate, setLoadingBatchGenerate] = useState(false);
  const [batchGenerateResult, setBatchGenerateResult] = useState<any>(null);

  const fetchTimetable = useCallback(async (turmaId: string) => {
    if (!turmaId) return;
    try {
      setLoadingTimetable(true);
      const data = await getTurmaTimetable(turmaId);
      setTimetableSlots(data);
      
      // Auto-detect and switch to the shift that has slots
      if (data && data.length > 0) {
        const hasMatutino = data.some((s: any) => s.posicao >= 1 && s.posicao <= 6);
        const hasVespertino = data.some((s: any) => s.posicao >= 11 && s.posicao <= 16);
        const hasNoturno = data.some((s: any) => s.posicao >= 21 && s.posicao <= 26);
        
        if (hasVespertino && !hasMatutino && !hasNoturno) {
          setSelectedShift('VESPERTINO');
        } else if (hasNoturno && !hasMatutino && !hasVespertino) {
          setSelectedShift('NOTURNO');
        } else if (hasMatutino) {
          setSelectedShift('MATUTINO');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grade de horários', error);
      showAlert('Erro', 'Não foi possível carregar a grade de horários.', 'error');
    } finally {
      setLoadingTimetable(false);
    }
  }, [showAlert, setSelectedShift]);

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
    } catch (e: any) {
      console.error(e);
      setTimeout(() => {
        showAlert('Erro', 'Não foi possível salvar o horário na grade.', 'error');
      }, 150);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const handleDeleteTimetableSlot = async (
    diaSemana: string,
    posicao: number,
    disciplinaNome: string
  ) => {
    if (!timetableTurmaId) return;
    try {
      setLoadingTimetable(true);
      await deleteTurmaTimetableSlot(timetableTurmaId, diaSemana, posicao);
      fetchTimetable(timetableTurmaId);
      setTimeout(() => {
        showAlert('Sucesso', `Aula de "${disciplinaNome}" removida com sucesso!`, 'success');
      }, 150);
    } catch (e: any) {
      console.error(e);
      setTimeout(() => {
        showAlert('Erro', 'Não foi possível remover o horário.', 'error');
      }, 150);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const handleAutoGenerateTimetable = async (shift: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO') => {
    if (!timetableTurmaId) return;
    try {
      setLoadingTimetable(true);
      const res = await autoGenerateTurmaTimetable(timetableTurmaId, shift);
      fetchTimetable(timetableTurmaId);
      sounds.playSuccess();
      setTimeout(() => {
        showAlert('Sucesso', res.message || 'Grade de horários gerada com sucesso!', 'success');
      }, 150);
    } catch (e: any) {
      console.error(e);
      sounds.playError();
      const errMsg = e.response?.data?.error || 'Erro ao gerar grade de horários automaticamente.';
      setTimeout(() => {
        showAlert('Conflito ou Restrição', errMsg, 'error');
      }, 150);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const handleBatchGenerateTimetable = async (shift: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO') => {
    try {
      setLoadingBatchGenerate(true);
      const res = await batchGenerateTimetable(shift);
      setBatchGenerateResult(res);
      // Atualizar a grade da turma selecionada também
      if (timetableTurmaId) fetchTimetable(timetableTurmaId);
      sounds.playSuccess();
      setTimeout(() => {
        showAlert('⚡ Monarch Engine v3', res.message || 'Grades geradas!', 'success');
      }, 150);
    } catch (e: any) {
      console.error(e);
      sounds.playError();
      const errMsg = e.response?.data?.error || 'Erro ao gerar grades em lote.';
      setTimeout(() => {
        showAlert('Conflito ou Restrição', errMsg, 'error');
      }, 150);
    } finally {
      setLoadingBatchGenerate(false);
    }
  };

  const fetchDisciplinaConfig = useCallback(async (turmaId: string) => {
    if (!turmaId) return;
    try {
      const data = await getTurmaDisciplinaConfig(turmaId);
      setDisciplinaConfig(data);
    } catch (e) {
      console.error('Erro ao buscar config de disciplinas', e);
    }
  }, []);

  const handleSaveDisciplinaConfig = async (turmaId: string) => {
    try {
      await updateTurmaDisciplinaConfig(turmaId, disciplinaConfig.map(d => ({
        disciplinaId: d.disciplinaId,
        aulasSemanais: d.aulasSemanais,
        geminada: d.geminada
      })));
      setTimeout(() => {
        showAlert('Sucesso', 'Configuração de aulas salva com sucesso!', 'success');
      }, 150);
    } catch (e: any) {
      const errMsg = e.response?.data?.error || 'Erro ao salvar configuração.';
      setTimeout(() => {
        showAlert('Erro', errMsg, 'error');
      }, 150);
    }
  };

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

  const fetchInitialData = useCallback(async () => {
    try {
      const userRaw = await AsyncStorage.getItem('@Solen:user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.role === 'ADMIN') {
          router.replace('/(superadmin)/dashboard');
          return;
        } else if (u.role !== 'ARQUITETO') {
          if (u.role === 'PROFESSOR') router.replace('/(mestre)/dashboard');
          else if (u.role === 'ALUNO') router.replace('/(player)/status');
          else router.replace('/login');
          return;
        }
        setCurrentUser(u);
        if (!u.acceptedTermsAt) {
          setShowTerms(true);
        }
      } else {
        router.replace('/login');
        return;
      }

      const freshUser = await getMe();
      if (freshUser) {
        if (freshUser.role === 'ADMIN') {
          router.replace('/(superadmin)/dashboard');
          return;
        } else if (freshUser.role !== 'ARQUITETO') {
          if (freshUser.role === 'PROFESSOR') router.replace('/(mestre)/dashboard');
          else if (freshUser.role === 'ALUNO') router.replace('/(player)/status');
          else router.replace('/login');
          return;
        }
        setCurrentUser(freshUser);
        await AsyncStorage.setItem('@Solen:user', JSON.stringify(freshUser));
        if (!freshUser.acceptedTermsAt) {
          setShowTerms(true);
        } else {
          setShowTerms(false);
        }
      }
    } catch (e) {
      console.error(e);
      router.replace('/login');
    }
  }, [router]);

  const handleAcceptTerms = async (parentConsentName?: string) => {
    setTermsLoading(true);
    try {
      await acceptTerms(parentConsentName);
      setShowTerms(false);
      showAlert(
        '🛡️ ALIANÇA FIRMADA',
        'O Protocolo de Privacidade foi assinado com sucesso. Boa jornada, Arquiteto!',
        'success'
      );
    } catch (e: any) {
      console.error(e);
      showAlert('Erro', e.message || 'Erro ao firmar aliança.', 'error');
    } finally {
      setTermsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setAlertTitle('🚨 EXCLUIR CONTA 🚨');
    setAlertMessage(
      'ATENÇÃO: Esta ação é definitiva e apagará permanentemente todo o seu progresso, mestres cadastrados, matérias e turmas criadas. Deseja prosseguir?'
    );
    setAlertButtons([
      {
        text: 'EXCLUIR',
        style: 'danger',
        onPress: async () => {
          try {
            await deleteAccount();
            await logout();
            router.replace('/login');
          } catch (e: any) {
            showAlert('Erro', e.response?.data?.error || 'Não foi possível excluir sua conta.', 'error');
          }
        },
      },
      {
        text: 'CANCELAR',
        style: 'cancel',
        onPress: () => {},
      },
    ]);
    setAlertVisible(true);
  };

  const [shiftSettings, setShiftSettings] = useState<any[]>([]);
  const [professorRestrictions, setProfessorRestrictions] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingRestrictions, setLoadingRestrictions] = useState(false);

  const fetchShiftSettings = useCallback(async () => {
    try {
      setLoadingShifts(true);
      const data = await getInstitutionShiftSettings();
      setShiftSettings(data);
    } catch (e) {
      console.error('Erro ao buscar shift settings', e);
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  const fetchProfessorRestrictions = useCallback(async () => {
    try {
      setLoadingRestrictions(true);
      const data = await getProfessorRestrictions();
      setProfessorRestrictions(data);
    } catch (e) {
      console.error('Erro ao buscar professor restrictions', e);
    } finally {
      setLoadingRestrictions(false);
    }
  }, []);

  const handleSaveShiftSetting = async (shift: string, slotsCount: number, intervalAfterSlot: number) => {
    try {
      setLoadingShifts(true);
      await saveInstitutionShiftSetting(shift, slotsCount, intervalAfterSlot);
      await fetchShiftSettings();
      showAlert('Sucesso', 'Configuração de turno salva com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Erro', 'Não foi possível salvar a configuração de turno.', 'error');
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleSaveProfessorRestriction = async (professorId: string, restrictions: { diaSemana: string; shift: string }[]) => {
    try {
      setLoadingRestrictions(true);
      await saveProfessorRestrictions(professorId, restrictions);
      await fetchProfessorRestrictions();
      showAlert('Sucesso', 'Restrições de disponibilidade salvas com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Erro', 'Não foi possível salvar as restrições do professor.', 'error');
    } finally {
      setLoadingRestrictions(false);
    }
  };

  const fetchDeleteRequests = useCallback(async () => {
    try {
      setLoadingDeleteRequests(true);
      const reqs = await getDeleteRequests();
      setDeleteRequests(reqs);
    } catch (err: any) {
      console.error('Erro ao buscar solicitações de exclusão:', err);
    } finally {
      setLoadingDeleteRequests(false);
    }
  }, []);

  const handleConfirmDeleteRequest = async (id: string) => {
    try {
      await confirmDeleteRequest(id);
      showAlert('Sucesso', 'Conta excluída com sucesso!', 'success');
      fetchDeleteRequests();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao confirmar exclusão.';
      showAlert('Erro', msg, 'error');
    }
  };

  const handleRejectDeleteRequest = async (id: string) => {
    try {
      await rejectDeleteRequest(id);
      showAlert('Sucesso', 'Solicitação de exclusão rejeitada.', 'success');
      fetchDeleteRequests();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao rejeitar solicitação.';
      showAlert('Erro', msg, 'error');
    }
  };

  const handleDeleteUser = async (id: string, role: string) => {
    try {
      if (role === 'Aluno') setLoadingStudents(true);
      if (role === 'Mestre') setLoadingMasters(true);
      await deleteUser(id);
      showAlert('Sucesso', 'Usuário removido permanentemente.', 'success');
      if (role === 'Aluno') fetchStudents(selectedTurmaId);
      if (role === 'Mestre') fetchMasters();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao excluir usuário.';
      showAlert('Erro', msg, 'error');
    } finally {
      if (role === 'Aluno') setLoadingStudents(false);
      if (role === 'Mestre') setLoadingMasters(false);
    }
  };

  const handleUpdateUnidade = async (turmaId: string, unidade: number) => {
    try {
      await updateTurmaUnidade(turmaId, unidade);
      showAlert('Sucesso', 'Unidade da turma atualizada com sucesso!', 'success');
      fetchTurmas();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao atualizar unidade da turma.';
      showAlert('Erro', msg, 'error');
    }
  };

  useEffect(() => {
    fetchMasters();
    fetchTurmas();
    fetchDisciplinas();
    fetchGoldenQuestions();
    fetchDisciplinasWithProfessores();
    fetchInitialData();
    fetchShiftSettings();
    fetchProfessorRestrictions();
    fetchDeleteRequests();
  }, [fetchMasters, fetchTurmas, fetchDisciplinas, fetchGoldenQuestions, fetchDisciplinasWithProfessores, fetchInitialData, fetchShiftSettings, fetchProfessorRestrictions, fetchDeleteRequests]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchMasters(),
      fetchTurmas(),
      fetchDisciplinas(),
      fetchGoldenQuestions(),
      fetchDisciplinasWithProfessores(),
      fetchShiftSettings(),
      fetchProfessorRestrictions(),
      fetchDeleteRequests(),
      fetchStudents(selectedTurmaId),
      timetableTurmaId ? fetchTimetable(timetableTurmaId) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStudents(selectedTurmaId);
  }, [selectedTurmaId, fetchStudents]);

  useEffect(() => {
    if (selectedProfessorId && selectedDisciplinaId && allDisciplinasList.length > 0) {
      const disc = allDisciplinasList.find(d => d.id === selectedDisciplinaId);
      if (disc) {
        const prof = disc.professores.find((p: any) => p.id === selectedProfessorId);
        if (prof && Array.isArray(prof.turmas)) {
          setSelectedLinkTurmaIds(prof.turmas.map((t: any) => t.id));
          setIsLinkTemp(prof.temp || false);
          return;
        }
      }
    }
    setSelectedLinkTurmaIds([]);
    setIsLinkTemp(false);
  }, [selectedProfessorId, selectedDisciplinaId, allDisciplinasList]);

  const handleToggleLinkTurma = (turmaId: string) => {
    if (selectedLinkTurmaIds.includes(turmaId)) {
      setSelectedLinkTurmaIds(selectedLinkTurmaIds.filter(id => id !== turmaId));
    } else {
      setSelectedLinkTurmaIds([...selectedLinkTurmaIds, turmaId]);
    }
  };

  const handleCreateDisciplina = async () => {
    if (!newDisciplinaNome.trim()) {
      showAlert('Aviso', 'Digite o nome da matéria.', 'warning');
      return;
    }
    try {
      setLoadingCreateDisciplina(true);
      await createDisciplina(newDisciplinaNome.trim());
      showAlert('Sucesso', 'Matéria criada com sucesso!', 'success');
      setNewDisciplinaNome('');
      fetchDisciplinasWithProfessores();
      fetchDisciplinas();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao criar matéria.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingCreateDisciplina(false);
    }
  };

  const handleLinkProfessor = async () => {
    if (!selectedProfessorId || !selectedDisciplinaId) {
      showAlert('Aviso', 'Selecione o professor e a disciplina.', 'warning');
      return;
    }
    try {
      setLoadingLinkProfessor(true);
      await linkProfessorToDisciplina(selectedProfessorId, selectedDisciplinaId, isLinkTemp, selectedLinkTurmaIds, Number(aulasSemanais) || 0);
      showAlert('Sucesso', 'Vínculos atualizados com sucesso!', 'success');
      setIsLinkTemp(false);
      setSelectedLinkTurmaIds([]);
      setAulasSemanais('0');
      fetchDisciplinasWithProfessores();
      fetchTurmas();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao vincular professor.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingLinkProfessor(false);
    }
  };

  const handleUnlinkProfessor = async (professorId: string, disciplinaId: string) => {
    try {
      setLoadingDisciplinas(true);
      await unlinkProfessorFromDisciplina(professorId, disciplinaId);
      showAlert('Sucesso', 'Vínculo do professor removido com sucesso!', 'success');
      fetchDisciplinasWithProfessores();
      fetchTurmas();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao remover vínculo.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  const handleCreateVinculo = async () => {
    if (!selectedProfId || !selectedDiscId || !selectedLinkTurmaId) {
      showAlert('AVISO DO SISTEMA', 'Selecione Professor, Disciplina e Turma.', 'warning');
      return;
    }

    try {
      setLoadingLink(true);
      await createVinculo(selectedProfId, selectedDiscId, selectedLinkTurmaId);
      showAlert('MENSAGEM DO SISTEMA', 'Vínculo criado com sucesso!', 'success');
      setSelectedProfId('');
      setSelectedDiscId('');
      setSelectedLinkTurmaId('');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Falha ao criar vínculo.';
      showAlert('ERRO DO SISTEMA', msg, 'error');
    } finally {
      setLoadingLink(false);
    }
  };

  const handleLinkProfessorToClass = async (turmaId: string) => {
    if (!selectedClassProfessorId || !selectedClassSubjectId) {
      showAlert('AVISO DO SISTEMA', 'Selecione a matéria e o professor.', 'warning');
      return;
    }

    try {
      await linkProfessorToDisciplina(selectedClassProfessorId, selectedClassSubjectId, false);
      await createVinculo(selectedClassProfessorId, selectedClassSubjectId, turmaId);
      showAlert('SUCESSO', 'Professor associado à turma com sucesso!', 'success');
      setSelectedClassProfessorId('');
      setSelectedClassSubjectId('');
      fetchTurmas();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao associar professor.';
      showAlert('ERRO DE PROCESSO', msg, 'error');
    }
  };

  const handleUnlinkProfessorFromClass = async (vinculoId: string) => {
    try {
      await deleteVinculo(vinculoId);
      showAlert('SUCESSO', 'Vínculo removido com sucesso!', 'success');
      fetchTurmas();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao remover vínculo.';
      showAlert('ERRO DE PROCESSO', msg, 'error');
    }
  };

  const handleFetchStudentStats = async (student: any) => {
    sounds.playSelect();
    setSelectedStudent(student);
    setLoadingStats(true);
    setStudentStats([]);
    try {
      const stats = await getStudentSubjectStats(student.id);
      setStudentStats(stats);
    } catch (e: any) {
      showAlert('Erro', 'Não foi possível carregar o desempenho do aluno.', 'error');
      setSelectedStudent(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleEditTurmaPress = (turma: any) => {
    sounds.playSelect();
    setEditingTurmaId(turma.id);
    setTurmaNome(turma.nome);
    setTurmaAno(turma.ano || '');
    setTurmaCodigo(turma.codigoInvocacao || '');
    setTurmaNivel(turma.nivel || 'FUNDAMENTAL');
  };

  const cancelEditTurma = () => {
    sounds.playSelect();
    setEditingTurmaId(null);
    setTurmaNome('');
    setTurmaAno('');
    setTurmaCodigo('');
    const tipo = currentUser?.institution?.tipo;
    if (tipo === 'ESTADUAL') {
      setTurmaNivel('MEDIO');
    } else if (tipo === 'PRIVADO_LIVRE') {
      setTurmaNivel('LIVRE');
    } else {
      setTurmaNivel('FUNDAMENTAL');
    }
  };

  const handleCreateTurma = async () => {
    if (!turmaNome.trim() || !turmaAno.trim()) {
      showAlert('AVISO DO SISTEMA', 'Nome e Ano são obrigatórios.', 'warning');
      return;
    }

    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(turmaAno.trim());
    if (isNaN(yearNum) || yearNum < currentYear) {
      showAlert('ERRO DE VALIDAÇÃO', `O ano não pode ser menor que o ano corrente (${currentYear}).`, 'warning');
      return;
    }

    try {
      setLoadingTurma(true);
      if (editingTurmaId) {
        await updateAdminTurma(editingTurmaId, {
          nome: turmaNome.trim(),
          ano: turmaAno.trim(),
          codigoInvocacao: turmaCodigo.trim() || undefined,
          nivel: turmaNivel,
        });
        showAlert('MENSAGEM DO SISTEMA', 'Turma atualizada com sucesso!', 'success');
      } else {
        await createTurma(turmaNome.trim(), turmaAno.trim(), turmaCodigo.trim() || undefined, turmaNivel);
        showAlert('MENSAGEM DO SISTEMA', 'Turma criada com sucesso!', 'success');
      }
      setTurmaNome('');
      setTurmaAno('');
      setTurmaCodigo('');
      setEditingTurmaId(null);
      fetchTurmas();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Falha na operação.';
      showAlert('ERRO DO SISTEMA', msg, 'error');
    } finally {
      setLoadingTurma(false);
    }
  };

  const handleRecrutar = async () => {
    if (!recrutStudentNome.trim() || !recrutStudentMatricula.trim() || !recrutTurmaId) {
      showAlert('AVISO DO SISTEMA', 'Preencha todos os campos.', 'warning');
      return;
    }
    try {
      setRecrutando(true);
      await registerStudentAsProfessor(
        recrutStudentMatricula.trim().toLowerCase(),
        recrutStudentNome.trim(),
        turno,
        recrutTurmaId
      );
      showAlert('MENSAGEM DO SISTEMA', 'Novo caçador recrutado com sucesso!', 'success');
      setRecrutStudentNome('');
      setRecrutStudentMatricula('');
      fetchStudents(selectedTurmaId);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao recrutar.';
      showAlert('ERRO DO SISTEMA', msg, 'error');
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
      showAlert(
        'COPIADO!',
        'Template de importação CSV copiado para a área de transferência!',
        'success'
      );
    } catch (err) {
      showAlert('ERRO', 'Não foi possível copiar o template.', 'error');
    }
  };

  const handleUploadFile = async (base64: string, type: 'alunos' | 'professores') => {
    try {
      setLoading(true);
      const parsedRows = await uploadExcel(base64);
      if (parsedRows && Array.isArray(parsedRows)) {
        setExcelData(parsedRows);
        // sounds.playSuccess() // optional, but let's just keep silent or just set data

      } else {
        showAlert('ERRO', 'Não foi possível interpretar os dados da planilha.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showAlert('ERRO', 'Falha ao processar arquivo Excel: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExcel = async (type: 'alunos' | 'professores') => {
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

      setLoading(true);
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

      await handleUploadFile(base64, type);
    } catch (err: any) {
      console.error(err);
      showAlert('ERRO', 'Falha ao processar arquivo Excel: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
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
      let targetTurmaNome = '';
      if (row.turma) {
        const turmaNomeCSV = String(row.turma).trim();
        if (turmaNomeCSV) {
          const foundTurma = turmas.find((t) => t.nome.toUpperCase() === turmaNomeCSV.toUpperCase());
          if (foundTurma) {
            targetTurmaId = foundTurma.id;
          } else {
            targetTurmaId = undefined;
            targetTurmaNome = turmaNomeCSV.toUpperCase();
          }
        }
      }

      studentsList.push({
        nome: String(nomeVal),
        matricula: String(matriculaVal),
        turno: finalTurno,
        targetTurmaId: targetTurmaId,
        targetTurmaNome: targetTurmaNome
      });
    }

    // Removida a trava de erro local, pois o backend criará a turma se necessário.

    if (studentsList.length === 0) {
      showAlert('Aviso', 'Nenhum aluno válido encontrado na planilha.', 'warning');
      return;
    }

    const firstStudentTurma = studentsList[0].targetTurmaId || studentsList[0].targetTurmaNome;
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
      const groups: { [turmaIdOrName: string]: typeof studentsList } = {};
      studentsList.forEach((s) => {
        const tId = s.targetTurmaId || s.targetTurmaNome || firstStudentTurma;
        if (tId) {
          if (!groups[tId]) groups[tId] = [];
          groups[tId].push(s);
        }
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
      
      // Como turmas podem ter sido criadas no backend, forçar atualização
      fetchTurmas();

      showAlert(
        'PORTAL DE RECRUTAMENTO',
        `Importação em lote concluída para ${totalSuccess} alunos.${
          totalErrors.length > 0 ? '\n\nErros:\n' + totalErrors.join('\n') : ''
        }`,
        'info'
      );
      setExcelData([]);
      fetchStudents(selectedTurmaId);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao processar lote de alunos.';
      showAlert('Erro', msg, 'error');
    } finally {
      setRecrutando(false);
    }
  };

  const handleBatchRegisterMastersExcel = async () => {
    if (!excelData || excelData.length === 0) {
      showAlert('Aviso', 'Selecione uma planilha de professores válida primeiro.', 'warning');
      return;
    }

    const teachersList: { nome: string; matricula: string; cargahoraria?: number; categoria?: string; disciplina?: string }[] = [];

    for (const row of excelData) {
      console.log('--- DEBUG FRONTEND ROW ---', JSON.stringify(row));
      const nomeVal = row.nome || row.nomedoprofessor || row.professor || row.docente || '';
      const matriculaVal = row.matricula || row.registro || row.chapa || '';
      if (!nomeVal || !matriculaVal) {
        console.log('Linha ignorada - faltou nome ou matricula:', { nomeVal, matriculaVal });
        continue;
      }

      const rawCarga = row.cargahorariacontratual || row.cargahoraria || row.horas || row.cargahorariacontratualhoras;
      const hours = rawCarga ? Number(rawCarga) : 20;

      const categoriaVal = row.categoria || row.vinculo || row.contrato || '';
      const disciplinaVal = row.disciplina || row.materia || '';

      teachersList.push({
        nome: String(nomeVal),
        matricula: String(matriculaVal),
        cargahoraria: hours,
        categoria: categoriaVal ? String(categoriaVal) : undefined,
        disciplina: disciplinaVal ? String(disciplinaVal) : undefined
      });
    }

    if (teachersList.length === 0) {
      showAlert('Aviso', 'Nenhum professor válido encontrado na planilha.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await batchRegisterMasters(teachersList);
      showAlert(
        'PORTAL DE VÍNCULOS',
        `Importação em lote concluída para ${teachersList.length} professores.${
          res.errors && res.errors.length > 0 ? '\n\nErros:\n' + res.errors.join('\n') : ''
        }`,
        'info'
      );
      setExcelData([]);
      fetchMasters();
      fetchDisciplinas();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao processar lote de professores.';
      showAlert('Erro', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetStudentAccess = async (id: string) => {
    showAlert(
      'MENSAGEM DO PORTAL',
      'Tem certeza de que deseja resetar o acesso deste caçador? Ele precisará usar o código de invocação da guilda.',
      'warning',
      [
        { text: 'Cancelar', onPress: () => setAlertVisible(false), style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAlertVisible(false);
            try {
              setLoading(true);
              await resetStudentAccess(id);
              showAlert(
                'MENSAGEM DO PORTAL',
                'Acesso resetado com sucesso! O caçador precisará usar o código de invocação.',
                'success'
              );
              fetchStudents(selectedTurmaId);
            } catch (err: any) {
              const msg = err.response?.data?.error || 'Erro ao resetar.';
              showAlert('ERRO DO SISTEMA', msg, 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetMasterAccess = async (id: string) => {
    showAlert(
      'MENSAGEM DO PORTAL',
      'Tem certeza de que deseja resetar o acesso deste mestre? A senha padrão voltará a ser "1234" e ele fará o primeiro acesso novamente.',
      'warning',
      [
        { text: 'Cancelar', onPress: () => setAlertVisible(false), style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAlertVisible(false);
            try {
              setLoading(true);
              await resetMasterAccess(id);
              showAlert(
                'MENSAGEM DO PORTAL',
                'Acesso do mestre resetado com sucesso! A senha padrão voltou a ser "1234".',
                'success'
              );
              fetchMasters();
            } catch (err: any) {
              const msg = err.response?.data?.error || 'Erro ao resetar.';
              showAlert('ERRO DO SISTEMA', msg, 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Funções auxiliares para conversão de Carga Horária (Lei do Piso 1/3, REDA 80% e CLT 1:1)
  const convertContractHoursToClasses = (hours: number, cat: 'CONCURSADO' | 'REDA' | 'CLT' = categoria): number => {
    if (cat === 'CLT') {
      return hours;
    }
    if (cat === 'REDA') {
      if (hours === 20) return 16;
      if (hours === 40) return 32;
      return Math.floor(hours * 0.8);
    }
    if (hours === 20) return 13;
    if (hours === 40) return 26;
    return Math.floor(hours * (2 / 3));
  };

  const convertClassesToContractHours = (classes: number, cat: 'CONCURSADO' | 'REDA' | 'CLT' = categoria): number => {
    if (cat === 'CLT') {
      return classes;
    }
    if (cat === 'REDA') {
      if (classes === 16) return 20;
      if (classes === 32) return 40;
      return Math.round(classes / 0.8);
    }
    if (classes === 13) return 20;
    if (classes === 26) return 40;
    return Math.round(classes * 1.5);
  };

  const handleRegisterOrUpdateMaster = async () => {
    if (!nome.trim() || (!editingMasterId && !matricula.trim())) {
      showAlert('AVISO DO SISTEMA', 'Preencha os campos obrigatórios.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const contractHours = parseInt(maxAulasSemanais) || 20;
      const parsedMax = convertContractHoursToClasses(contractHours, categoria);
      if (editingMasterId) {
        await updateMaster(editingMasterId, {
          nome: nome.trim(),
          maxAulasSemanais: parsedMax,
          categoria,
        });
        showAlert('MENSAGEM DO SISTEMA', 'Mestre atualizado com sucesso!', 'success');
      } else {
        await registerMaster(
          matricula.trim(),
          nome.trim(),
          undefined,
          currentUser?.instituicao || undefined,
          undefined,
          parsedMax,
          categoria
        );
        showAlert('MENSAGEM DO SISTEMA', 'Mestre forjado com sucesso!', 'success');
      }
      setNome('');
      setNickname('');
      setMatricula('');
      setInstituicao('');
      setMaxAulasSemanais('20');
      const isPrivate = currentUser?.institution?.tipo?.startsWith('PRIVADO');
      setCategoria(isPrivate ? 'CLT' : 'CONCURSADO');
      setEditingMasterId(null);
      fetchMasters();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Falha na operação.';
      showAlert('ERRO DO SISTEMA', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMasterPress = (master: any) => {
    setEditingMasterId(master.id);
    setNome(master.nome);
    setNickname(master.nickname || '');
    setMatricula(master.matricula);
    const catValRaw = String(master.categoria || 'CONCURSADO').toUpperCase();
    const catVal = catValRaw === 'CLT' ? 'CLT' : (catValRaw === 'REDA' ? 'REDA' : 'CONCURSADO');
    setCategoria(catVal);
    const dbValue = master.maxAulasSemanais ?? (catVal === 'REDA' ? 16 : (catVal === 'CLT' ? 20 : 13));
    setMaxAulasSemanais(String(convertClassesToContractHours(dbValue, catVal)));
  };

  const cancelEditMaster = () => {
    setEditingMasterId(null);
    setNome('');
    setNickname('');
    setMatricula('');
    setMaxAulasSemanais('20');
    const isPrivate = currentUser?.institution?.tipo?.startsWith('PRIVADO');
    setCategoria(isPrivate ? 'CLT' : 'CONCURSADO');
  };

  const handleEditStudentPress = (student: any) => {
    setEditingStudentId(student.id);
    setStudentNome(student.nome);
    setStudentNickname(student.nickname || '');
    setStudentTurmaId(student.turmaId || '');
  };

  const handleUpdateStudent = async () => {
    if (!studentNome.trim()) {
      showAlert('AVISO DO SISTEMA', 'O nome do aluno é obrigatório.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await updateStudent(editingStudentId!, {
        nome: studentNome.trim(),
        nickname: studentNickname.trim() || undefined,
        turmaId: studentTurmaId || '',
      });
      showAlert('MENSAGEM DO SISTEMA', 'Aluno atualizado com sucesso!', 'success');
      setEditingStudentId(null);
      setStudentNome('');
      setStudentNickname('');
      setStudentTurmaId('');
      fetchStudents(selectedTurmaId);
    } catch (error) {
      showAlert('ERRO DO SISTEMA', 'Falha ao atualizar aluno.', 'error');
    } finally {
      setLoading(false);
    }
  };
  const cancelEditStudent = () => {
    setEditingStudentId(null);
    setStudentNome('');
    setStudentNickname('');
    setStudentTurmaId('');
  };
  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleUpdateDisciplina = async () => {
    if (!editingDisciplinaId || !editingDisciplinaNome.trim()) {
      showAlert('Erro', 'O nome da matéria não pode ser vazio.', 'warning');
      return;
    }
    try {
      await updateDisciplina(editingDisciplinaId, editingDisciplinaNome.trim());
      showAlert('Sucesso', 'Matéria editada com sucesso!', 'success');
      setEditingDisciplinaId(null);
      setEditingDisciplinaNome('');
      fetchDisciplinasWithProfessores();
      fetchDisciplinas();
    } catch (e: any) {
      console.error(e);
      showAlert('Erro', e.response?.data?.error || 'Não foi possível editar a matéria.', 'error');
    }
  };

  const handleDeleteDisciplina = async (id: string) => {
    showAlert(
      'Confirmar Exclusão',
      'Tem certeza de que deseja excluir esta matéria? Todas as aulas agendadas e quests ligadas a ela serão excluídas!',
      'warning',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDisciplina(id);
              showAlert('Sucesso', 'Matéria excluída com sucesso!', 'success');
              fetchDisciplinasWithProfessores();
              fetchDisciplinas();
              fetchTurmas();
            } catch (e: any) {
              console.error(e);
              showAlert('Erro', e.response?.data?.error || 'Não foi possível excluir a matéria.', 'error');
            }
          },
        },
      ]
    );
  };

  const handleCreateDefaultDisciplinas = async (nivel?: string) => {
    try {
      setLoadingDisciplinas(true);
      const res = await createDefaultDisciplinas(nivel);
      showAlert('Sucesso', res.message, 'success');
      fetchDisciplinasWithProfessores();
      fetchDisciplinas();
    } catch (e: any) {
      console.error(e);
      showAlert('Erro', e.response?.data?.error || 'Não foi possível gerar matérias padrão.', 'error');
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  const handleDeleteUnlinkedDisciplinas = async () => {
    try {
      setLoadingDisciplinas(true);
      const res = await deleteUnlinkedDisciplinas();
      showAlert('Sucesso', res.message, 'success');
      fetchDisciplinasWithProfessores();
      fetchDisciplinas();
    } catch (e: any) {
      console.error(e);
      showAlert('Erro', e.response?.data?.error || 'Não foi possível limpar matérias órfãs.', 'error');
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  return {
    fadeAnim,
    slideAnim,
    scaleAnim,
    rotateAnim,
    translateXAnim,
    currentUser,
    nome,
    setNome,
    nickname,
    setNickname,
    matricula,
    setMatricula,
    instituicao,
    setInstituicao,
    loading,
    masters,
    loadingMasters,
    editingMasterId,
    turmas,
    selectedTurmaId,
    setSelectedTurmaId,
    students,
    loadingStudents,
    editingStudentId,
    setEditingStudentId,
    studentNome,
    setStudentNome,
    studentNickname,
    setStudentNickname,
    studentTurmaId,
    setStudentTurmaId,
    turno,
    setTurno,
    recrutTurmaId,
    setRecrutTurmaId,
    recrutStudentNome,
    setRecrutStudentNome,
    recrutStudentMatricula,
    setRecrutStudentMatricula,
    recrutando,
    useBatch,
    setUseBatch,
    csvText,
    setCsvText,
    disciplinas,
    selectedProfId,
    setSelectedProfId,
    selectedDiscId,
    setSelectedDiscId,
    selectedLinkTurmaId,
    setSelectedLinkTurmaId,
    loadingLink,
    newDisciplinaNome,
    setNewDisciplinaNome,
    selectedProfessorId,
    setSelectedProfessorId,
    selectedDisciplinaId,
    setSelectedDisciplinaId,
    isLinkTemp,
    setIsLinkTemp,
    selectedLinkTurmaIds,
    setSelectedLinkTurmaIds,
    handleToggleLinkTurma,
    allDisciplinasList,
    loadingDisciplinas,
    loadingCreateDisciplina,
    loadingLinkProfessor,
    turmaNome,
    setTurmaNome,
    turmaAno,
    setTurmaAno,
    turmaCodigo,
    setTurmaCodigo,
    loadingTurma,
    refreshing,
    expandedMembersId,
    setExpandedMembersId,
    expandedLinkId,
    setExpandedLinkId,
    activeTab,
    setActiveTab,
    showTerms,
    termsLoading,
    expandedTurmaId,
    setExpandedTurmaId,
    selectedClassSubjectId,
    setSelectedClassSubjectId,
    selectedClassProfessorId,
    setSelectedClassProfessorId,
    selectedStudent,
    setSelectedStudent,
    studentStats,
    loadingStats,
    goldenQuestionText,
    setGoldenQuestionText,
    goldenQuestionTurmaId,
    setGoldenQuestionTurmaId,
    goldenQuestionsList,
    loadingGolden,
    expandedQuestionId,
    setExpandedQuestionId,
    editingDisciplinaId,
    setEditingDisciplinaId,
    editingDisciplinaNome,
    setEditingDisciplinaNome,
    timetableSlots,
    timetableTurmaId,
    setTimetableTurmaId,
    loadingTimetable,
    selectedShift,
    setSelectedShift,
    selectedTimetableDisciplinaId,
    setSelectedTimetableDisciplinaId,
    alertVisible,
    setAlertVisible,
    alertTitle,
    alertMessage,
    alertType,
    alertButtons,
    showAlert,
    fetchMasters,
    fetchTurmas,
    fetchDisciplinas,
    fetchDisciplinasWithProfessores,
    fetchGoldenQuestions,
    fetchStudents,
    fetchTimetable,
    handleSaveTimetableSlot,
    handleDeleteTimetableSlot,
    handleAutoGenerateTimetable,
    handleSendGoldenQuestion,
    fetchInitialData,
    handleAcceptTerms,
    handleDeleteAccount,
    onRefresh,
    handleCreateDisciplina,
    handleLinkProfessor,
    handleUnlinkProfessor,
    handleCreateVinculo,
    handleLinkProfessorToClass,
    handleUnlinkProfessorFromClass,
    handleFetchStudentStats,
    handleCreateTurma,
    editingTurmaId,
    handleEditTurmaPress,
    cancelEditTurma,
    handleRecrutar,
    handleCopyTemplate,
    turmaNivel,
    setTurmaNivel,
    excelData,
    setExcelData,
    handleSelectExcel,
    handleUploadFile,
    handleBatchRecrutarExcel,
    handleBatchRegisterMastersExcel,
    handleResetStudentAccess,
    handleResetMasterAccess,
    handleRegisterOrUpdateMaster,
    handleEditMasterPress,
    cancelEditMaster,
    handleEditStudentPress,
    handleUpdateStudent,
    cancelEditStudent,
    handleLogout,
    handleUpdateDisciplina,
    handleDeleteDisciplina,
    shiftSettings,
    professorRestrictions,
    loadingShifts,
    loadingRestrictions,
    handleSaveShiftSetting,
    handleSaveProfessorRestriction,
    fetchShiftSettings,
    fetchProfessorRestrictions,
    // Monarch Engine v3
    maxAulasSemanais,
    setMaxAulasSemanais,
    disciplinaConfig,
    setDisciplinaConfig,
    loadingBatchGenerate,
    batchGenerateResult,
    handleBatchGenerateTimetable,
    fetchDisciplinaConfig,
    handleSaveDisciplinaConfig,
    categoria,
    setCategoria,
    aulasSemanais,
    setAulasSemanais,
    deleteRequests,
    loadingDeleteRequests,
    fetchDeleteRequests,
    handleConfirmDeleteRequest,
    handleRejectDeleteRequest,
    handleUpdateUnidade,
    handleDeleteUser,
    handleCreateDefaultDisciplinas,
    handleDeleteUnlinkedDisciplinas,
  };
}
