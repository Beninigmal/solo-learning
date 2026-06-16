import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { BASE_URL } from '../config';

const SERVER_URL_KEY = '@Solen:serverUrl';

// Retorna a URL ativa (AsyncStorage tem prioridade sobre a do build)
export const getServerUrl = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
  return saved || BASE_URL;
};

// Salva uma nova URL de servidor (sem rebuild)
export const setServerUrl = async (url: string) => {
  const clean = url.trim().replace(/\/$/, ''); // remove barra final
  await AsyncStorage.setItem(SERVER_URL_KEY, clean);
};

// Limpa a URL customizada e volta para a do build
export const resetServerUrl = async () => {
  await AsyncStorage.removeItem(SERVER_URL_KEY);
};

export const api = axios.create({
  timeout: 60000, // Aumentado para 60s por causa do cold start do Render
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  // URL dinâmica: lê do AsyncStorage a cada request
  const activeUrl = await getServerUrl();
  config.baseURL = activeUrl;

  const token = await AsyncStorage.getItem('@Solen:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Bypassa a página de aviso do localtunnel (loca.lt)
  if (activeUrl.includes('loca.lt')) {
    config.headers['bypass-tunnel-reminder'] = '1';
    config.headers['User-Agent'] = 'SolenApp/1.0';
  }

  return config;
});

// Interceptor de Resposta: Limpa recursivamente os prefixos de escola dos nicknames dos usuários
const cleanNicknames = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanNicknames);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      if (key === 'nickname' && typeof obj[key] === 'string' && obj[key].includes('@')) {
        const clean = obj[key].split('@').pop()?.trim();
        newObj[key] = clean || obj[key];
      } else {
        newObj[key] = cleanNicknames(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = cleanNicknames(response.data);
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper para extrair mensagens de erro amigáveis do Axios
export const getErrorMessage = (error: any): string => {
  if (error.code === 'ECONNABORTED') {
    return 'O servidor demorou muito para responder (Cold Start). Tente novamente em alguns segundos.';
  }
  
  if (!error.response) {
    return 'Não foi possível alcançar o servidor. Verifique sua conexão e a URL configurada.';
  }

  const status = error.response.status;
  const data = error.response.data;

  if (status === 401) {
    return 'Usuário ou CPF não encontrados para este perfil.';
  }

  // Tenta pegar a mensagem de erro do backend (Solen usa .error ou .message)
  const backendError = data?.error || data?.message;
  if (backendError) {
    return backendError;
  }

  // Fallback com detalhes técnicos para debug
  return `Erro ${status}: ${typeof data === 'string' ? data.slice(0, 50) : JSON.stringify(data).slice(0, 50)}`;
};

export const login = async (matricula: string, password?: string, role?: string) => {
  try {
    const response = await api.post('/auth/login', { matricula, password, role });
    const { token, user } = response.data;
    await AsyncStorage.setItem('@Solen:token', token);
    await AsyncStorage.setItem('@Solen:user', JSON.stringify(user));
    return user;
  } catch (error: any) {
    console.error('Erro no login:', error);
    throw error;
  }
};

export const logout = async () => {
  await AsyncStorage.removeItem('@Solen:token');
  await AsyncStorage.removeItem('@Solen:user');
};

export const acceptTerms = async (parentConsentName?: string) => {
  const response = await api.post('/auth/accept-terms', { parentConsentName });
  return response.data;
};

export const deleteAccount = async () => {
  const response = await api.delete('/auth/delete-account');
  return response.data;
};

export const requestDeleteAccount = async (motivo: string, email: string) => {
  const response = await api.post('/auth/request-delete-account', { motivo, email });
  return response.data;
};

export const getDeleteRequests = async () => {
  const response = await api.get('/admin/delete-requests');
  return response.data;
};

export const confirmDeleteRequest = async (id: string) => {
  const response = await api.post(`/admin/delete-requests/${id}/confirm`);
  return response.data;
};

export const rejectDeleteRequest = async (id: string) => {
  const response = await api.delete(`/admin/delete-requests/${id}/reject`);
  return response.data;
};

// Salva credenciais para auto-fill no login
export const saveCredentials = async (matricula: string, role: string) => {
  await AsyncStorage.setItem('@Solen:credentials', JSON.stringify({ matricula, role }));
};

// Carrega credenciais salvas (pode ser null se nunca logou)
export const loadCredentials = async (): Promise<{ matricula: string; role: string } | null> => {
  const raw = await AsyncStorage.getItem('@Solen:credentials');
  return raw ? JSON.parse(raw) : null;
};

// Registra o Expo Push Token no backend para receber notificações
export const registerPushToken = async (expoPushToken: string) => {
  try {
    await api.post('/auth/push-token', { expoPushToken });
  } catch {
    // Silencioso — não bloqueia o fluxo se falhar
  }
};

export const registerMaster = async (matricula: string, nome: string, nickname?: string, instituicao?: string, novaMateria?: string, maxAulasSemanais?: number, categoria?: string) => {
  const response = await api.post('/admin/masters', { matricula, nome, nickname, instituicao, novaMateria, maxAulasSemanais, categoria });
  return response.data;
};

export const getMasters = async () => {
  const response = await api.get('/admin/masters');
  return response.data;
};

export const updateMaster = async (id: string, data: { nome?: string; nickname?: string; maxAulasSemanais?: number; categoria?: string }) => {
  const response = await api.put(`/admin/masters/${id}`, data);
  return response.data;
};

export const getAdminStudents = async (turmaId?: string) => {
  const response = await api.get('/admin/students', { params: { turmaId } });
  return response.data;
};

export const updateStudent = async (id: string, data: { nome?: string; nickname?: string; turmaId?: string }) => {
  const response = await api.put(`/admin/students/${id}`, data);
  return response.data;
};

export const getDisciplinas = async () => {
  const response = await api.get('/admin/disciplinas');
  return response.data;
};

export const getAdminTurmas = async () => {
  const response = await api.get('/admin/turmas');
  return response.data;
};

export const createTurma = async (nome: string, ano: string, codigoInvocacao?: string, nivel?: string) => {
  const response = await api.post('/admin/turmas', { nome, ano, codigoInvocacao, nivel });
  return response.data;
};

export const createVinculo = async (professorId: string, disciplinaId: string, turmaId: string) => {
  const response = await api.post('/admin/vinculos', { professorId, disciplinaId, turmaId });
  return response.data;
};

export const deleteVinculo = async (id: string) => {
  const response = await api.delete(`/admin/vinculos/${id}`);
  return response.data;
};

export const firstAccess = async (nickname: string, newPassword: string) => {
  const response = await api.post('/auth/first-access', { nickname, newPassword });
  return response.data;
};

export const getDailyQuest = async () => {
  const response = await api.get('/quests/daily');
  return response.data; // { deliveryId, question, xp }
};

export const waitQuest = async (deliveryId: string) => {
  const response = await api.post('/quests/wait', { deliveryId });
  return response.data;
};

export const requestNextQuest = async (disciplinaId?: string) => {
  const response = await api.post('/quests/request-next', { disciplinaId });
  return response.data;
};

export const getSubjectStats = async () => {
  const response = await api.get('/quests/subject-stats');
  return response.data;
};

export const getStudentSubjectStats = async (userId: string) => {
  const response = await api.get(`/quests/subject-stats/${userId}`);
  return response.data;
};

export const submitDailyQuest = async (deliveryId: string, question: string, answer: string, image?: string, artifactId?: string) => {
  const response = await api.post('/quests/daily/submit', {
    deliveryId,
    question,
    answer,
    image,
    artifactId
  });
  return response.data; // { status: string, message: string }
};

// Professor Routes
export const getTurmas = async () => {
  const response = await api.get('/professor/turmas');
  return response.data;
};

export const getProfessorDisciplinas = async () => {
  const response = await api.get('/professor/disciplinas');
  return response.data;
};



export const updateTurma = async (id: string, data: { nome?: string; ano?: string; codigoInvocacao?: string; nivel?: string }) => {
  const response = await api.put(`/professor/turmas/${id}`, data);
  return response.data;
};

export const batchRegisterMasters = async (teachers: { nome: string; matricula: string; cargahoraria?: number; categoria?: string }[]) => {
  const response = await api.post('/admin/masters/batch', { teachers });
  return response.data;
};

export const uploadExcel = async (base64: string) => {
  const response = await api.post('/admin/upload/excel', { base64 });
  return response.data;
};

export const getTemplateDownloadUrl = async (type: 'alunos' | 'professores') => {
  const base = await getServerUrl();
  const token = await AsyncStorage.getItem('@Solen:token');
  return `${base}/admin/templates/${type}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};

export const getStudentsByTurma = async (turmaId: string) => {
  const response = await api.get(`/professor/students?turmaId=${turmaId}`);
  return response.data;
};

export const getUnassignedStudents = async () => {
  const response = await api.get('/professor/students?unassigned=true');
  return response.data;
};

export const registerStudentAsProfessor = async (matricula: string, nome: string, turno: string, turmaId: string) => {
  const response = await api.post('/admin/students', { matricula, nome, turno, turmaId });
  return response.data;
};

// Quest Generation
export const generateQuest = async (semana: string, turmaId: string, tema: string, complexidade: string, exigeCalculo: boolean, disciplinaId: string, tipoQuest?: string) => {
  const response = await api.post('/quests/generate', { semana, turmaId, tema, complexidade, exigeCalculo, disciplinaId, tipoQuest });
  return response.data;
};

export const getPendingQuests = async () => {
  const response = await api.get('/quests/pending');
  return response.data;
};

export const approveQuestBatch = async (batchId: string) => {
  const response = await api.post(`/quests/batch/${batchId}/approve`);
  return response.data;
};

export const regenerateQuest = async (id: string) => {
  const response = await api.post(`/quests/${id}/regenerate`);
  return response.data;
};

export const refineQuest = async (id: string, prompt: string) => {
  const response = await api.post(`/quests/${id}/refine`, { prompt });
  return response.data;
};

export const updateQuest = async (id: string, enunciado: string) => {
  const response = await api.put(`/quests/${id}`, { enunciado });
  return response.data;
};

export const mockBossQuest = async (turmaId: string, tema: string, semana: string, duracaoDias?: number) => {
  const response = await api.post('/quests/mock-boss', { turmaId, tema, semana, duracaoDias });
  return response.data;
};

export const getQuestHistory = async () => {
  const response = await api.get('/quests/history');
  return response.data;
};

export const batchRegisterStudents = async (students: { nome: string; matricula: string; turno?: string }[], turmaId: string) => {
  const response = await api.post('/admin/students/batch', { students, turmaId });
  return response.data;
};

export const resetStudentAccess = async (id: string) => {
  const response = await api.post(`/admin/students/${id}/reset`);
  return response.data;
};

export const resetMasterAccess = async (id: string) => {
  const response = await api.post(`/admin/masters/${id}/reset`);
  return response.data;
};

export const getWrongAnswers = async () => {
  const response = await api.get('/quests/wrong-answers');
  return response.data;
};

export const retryWrongAnswer = async (id: string, answer: string, image?: string, artifactId?: string) => {
  const response = await api.post(`/quests/wrong-answers/${id}/retry`, { answer, image, artifactId });
  return response.data;
};

// Guardar quest no baú sem responder (adiamento voluntário)
export const storeQuestInChest = async (deliveryId: string) => {
  const response = await api.post('/quests/store-in-chest', { deliveryId });
  return response.data;
};

// --- ARTEFATOS AUXILIARES V3 ---
export const useHelperArtifact = async (deliveryId: string, artifactId: string, studentDoubt?: string) => {
  const response = await api.post(`/quests/${deliveryId}/use-helper`, { artifactId, studentDoubt });
  return response.data;
};

export const getQuestDeliveryStatus = async (deliveryId: string) => {
  const response = await api.get(`/quests/deliveries/${deliveryId}`);
  return response.data;
};

export const healWrongAnswer = async (id: string) => {
  const response = await api.post(`/quests/wrong-answers/${id}/heal`);
  return response.data;
};

export const getGoldenHelpRequests = async () => {
  const response = await api.get('/quests/professor/help-requests');
  return response.data;
};

export const replyGoldenHelpRequest = async (deliveryId: string, data: { response?: string; requestAiSuggestion?: boolean }) => {
  const response = await api.post(`/quests/professor/help-requests/${deliveryId}/reply`, data);
  return response.data;
};

export const consumeBecker = async (artifactId?: string) => {
  const response = await api.post('/quests/becker/consume', { artifactId });
  return response.data;
};

export const consumeDirectArtifact = async (artifactId: string) => {
  const response = await api.post('/quests/artifacts/consume-direct', { artifactId });
  return response.data;
};

export const transmuteArtifact = async (targetId: string, success: boolean, newEpicId?: string) => {
  const response = await api.post('/quests/artifacts/transmute', { targetId, success, newEpicId });
  return response.data;
};

export const getActiveParty = async () => {
  const response = await api.get('/quests/party/active');
  return response.data;
};

export const createParty = async () => {
  const response = await api.post('/quests/party/create');
  return response.data;
};

export const joinParty = async (codigo: string, useChaveMestra?: boolean) => {
  const response = await api.post('/quests/party/join', { codigo, useChaveMestra });
  return response.data;
};

export const leaveParty = async () => {
  const response = await api.post('/quests/party/leave');
  return response.data;
};

export const toggleRaidMode = async () => {
  const response = await api.post('/quests/party/toggle-raid');
  return response.data;
};

export const shareQuestInRaid = async (deliveryId: string) => {
  const response = await api.post('/quests/party/share-quest', { deliveryId });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

// Perguntas Douradas (Diretor <-> Alunos)
export const createGoldenQuestion = async (enunciado: string, turmaId: string) => {
  const response = await api.post('/quests/golden-question', { enunciado, turmaId });
  return response.data;
};

export const getGoldenQuestions = async () => {
  const response = await api.get('/quests/golden-questions');
  return response.data;
};

export const getActiveGoldenQuestion = async () => {
  const response = await api.get('/quests/golden-question/active');
  return response.data;
};

export const answerGoldenQuestion = async (goldenQuestionId: string, resposta: string) => {
  const response = await api.post('/quests/golden-question/answer', { goldenQuestionId, resposta });
  return response.data;
};

export const updateTurmaUnidade = async (id: string, unidade: number) => {
  const response = await api.put(`/quests/turmas/${id}/unidade`, { unidade });
  return response.data;
};

export const createDisciplina = async (nome: string) => {
  const response = await api.post('/quests/disciplinas', { nome });
  return response.data;
};

export const updateDisciplina = async (id: string, nome: string) => {
  const response = await api.put(`/quests/disciplinas/${id}`, { nome });
  return response.data;
};

export const deleteDisciplina = async (id: string) => {
  const response = await api.delete(`/quests/disciplinas/${id}`);
  return response.data;
};

export const getDisciplinasWithProfessores = async () => {
  const response = await api.get('/quests/disciplinas');
  return response.data;
};

export const linkProfessorToDisciplina = async (professorId: string, disciplinaId: string, temp?: boolean, turmaIds?: string[], aulasSemanais?: number) => {
  const response = await api.post('/quests/disciplinas/professor', { professorId, disciplinaId, temp, turmaIds, aulasSemanais });
  return response.data;
};

export const unlinkProfessorFromDisciplina = async (professorId: string, disciplinaId: string) => {
  const response = await api.delete('/quests/disciplinas/professor', { data: { professorId, disciplinaId } });
  return response.data;
};

export const getTurmaTimetable = async (turmaId: string) => {
  const response = await api.get(`/quests/turmas/${turmaId}/timetable`);
  return response.data;
};

export const saveTurmaTimetable = async (turmaId: string, slots: { diaSemana: string; posicao: number; disciplinaId: string }[]) => {
  const response = await api.post(`/quests/turmas/${turmaId}/timetable`, { slots });
  return response.data;
};

export const deleteTurmaTimetableSlot = async (turmaId: string, diaSemana: string, posicao: number) => {
  const response = await api.delete(`/quests/turmas/${turmaId}/timetable`, { data: { diaSemana, posicao } });
  return response.data;
};

export const autoGenerateTurmaTimetable = async (turmaId: string, shift: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO') => {
  const response = await api.post(`/quests/turmas/${turmaId}/timetable/auto-generate`, { shift });
  return response.data;
};

export const getInstitutionShiftSettings = async () => {
  const response = await api.get('/quests/institution/shifts');
  return response.data;
};

export const saveInstitutionShiftSetting = async (shift: string, slotsCount: number, intervalAfterSlot: number) => {
  const response = await api.post('/quests/institution/shifts', { shift, slotsCount, intervalAfterSlot });
  return response.data;
};

export const getProfessorRestrictions = async () => {
  const response = await api.get('/quests/professores/restrictions');
  return response.data;
};

export const saveProfessorRestrictions = async (professorId: string, restrictions: { diaSemana: string; shift: string }[]) => {
  const response = await api.post('/quests/professores/restrictions', { professorId, restrictions });
  return response.data;
};

// Monarch Engine v3 — Batch Generate (todas as turmas do turno)
export const batchGenerateTimetable = async (shift: 'MATUTINO' | 'VESPERTINO' | 'NOTURNO') => {
  const response = await api.post('/quests/institution/timetable/batch-generate', { shift });
  return response.data;
};

// Monarch Engine v3 — Atualizar configuração de aulasSemanais e geminada por TurmaDisciplina
export const updateTurmaDisciplinaConfig = async (
  turmaId: string,
  configs: { disciplinaId: string; aulasSemanais: number; geminada: boolean }[]
) => {
  const response = await api.put(`/quests/turmas/${turmaId}/disciplinas/config`, { configs });
  return response.data;
};

// Monarch Engine v3 — Buscar configuração atual de distribuição por turma
export const getTurmaDisciplinaConfig = async (turmaId: string) => {
  const response = await api.get(`/quests/turmas/${turmaId}/disciplinas/config`);
  return response.data;
};

export const getCalendarEvents = async () => {
  const response = await api.get('/quests/calendar/events');
  return response.data;
};

export const createCalendarEvent = async (titulo: string, data: string, tipo: string, turmaId: string, descricao?: string) => {
  const response = await api.post('/quests/calendar/events', { titulo, data, tipo, turmaId, descricao });
  return response.data;
};

export const deleteCalendarEvent = async (id: string) => {
  const response = await api.delete(`/quests/calendar/events/${id}`);
  return response.data;
};

export const getRaidMessages = async (raidId: string) => {
  const response = await api.get(`/quests/raids/${raidId}/messages`);
  return response.data;
};

export const sendRaidMessage = async (raidId: string, content: string) => {
  const response = await api.post(`/quests/raids/${raidId}/messages`, { content });
  return response.data;
};

// ─── SUPER ADMIN SERVICES ──────────────────────────────────────────────────
export const getInstitutions = async () => {
  const response = await api.get('/superadmin/institutions');
  return response.data;
};

export const createInstitution = async (nome: string, tipo?: string) => {
  const response = await api.post('/superadmin/institutions', { nome, tipo });
  return response.data;
};

export const getArchitects = async () => {
  const response = await api.get('/superadmin/architects');
  return response.data;
};

export const createArchitect = async (matricula: string, nome: string, nickname: string, password?: string, instituicao?: string) => {
  const response = await api.post('/superadmin/architects', { matricula, nome, nickname, password, instituicao });
  return response.data;
};

export const updateInstitution = async (id: string, nome: string, tipo?: string) => {
  const response = await api.put(`/superadmin/institutions/${id}`, { nome, tipo });
  return response.data;
};

export const updateArchitect = async (id: string, data: { matricula?: string; nome?: string; nickname?: string; password?: string; instituicao?: string }) => {
  const response = await api.put(`/superadmin/architects/${id}`, data);
  return response.data;
};

export const blockArchitect = async (id: string, blocked: boolean) => {
  const response = await api.patch(`/superadmin/architects/${id}/block`, { blocked });
  return response.data;
};

export const deleteArchitect = async (id: string) => {
  const response = await api.delete(`/superadmin/architects/${id}`);
  return response.data;
};

// ─── Presentes de Artefatos (Mestre -> Alunos) ──────────────────────────────
export const giftArtifactToStudent = async (studentId: string, artifactId: string) => {
  const response = await api.post('/quests/mestre/gift-artifact', { studentId, artifactId });
  return response.data;
};

export const getPendingGiftedArtifacts = async () => {
  const response = await api.get('/quests/pending-gifts');
  return response.data;
};

export const getArtifactInventory = async () => {
  const response = await api.get('/quests/artifacts/inventory');
  return response.data;
};

export const getGiftedArtifactsHistory = async (page: number = 1, limit: number = 10, date?: string) => {
  const params: any = { page, limit };
  if (date) params.date = date;
  const response = await api.get('/quests/mestre/gift-history', { params });
  return response.data;
};
