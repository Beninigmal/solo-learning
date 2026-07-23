import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, Platform, AppState, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { useSolenSounds } from './useSolenSounds';
import { ACTIVE_ANIMATION_TYPE } from '../config';
import {
  api,
  getDailyQuest,
  waitQuest,
  submitDailyQuest,
  logout,
  getWrongAnswers,
  retryWrongAnswer,
  requestNextQuest,
  storeQuestInChest,
  getActiveParty,
  createParty,
  joinParty,
  leaveParty,
  toggleRaidMode,
  shareQuestInRaid,
  getMe,
  getSubjectStats,
  getActiveGoldenQuestion,
  answerGoldenQuestion,
  getTurmaTimetable,
  getCalendarEvents,
  getRaidMessages,
  sendRaidMessage,
  acceptTerms,
  deleteAccount,
  requestDeleteAccount,
  useHelperArtifact,
  healWrongAnswer,
  consumeBecker,
  consumeDirectArtifact,
  getQuestDeliveryStatus,
  registerPushToken,
  getPendingGiftedArtifacts,
  getArtifactInventory,
  transmuteArtifact,
} from '../services/api';

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

const allAvailableArtifacts = [
  { id: 'sussurros_sabios', name: 'Sussurros Sábios', type: 'legendary', description: 'Envia um pedido de ajuda ao Mestre para liberar uma dica pedagógica. Concede tentativa extra e +50% de XP.' },
  { id: 'becker_alquimista', name: 'Becker do Alquimista', type: 'legendary', description: 'Consome a essência alquímica para ganhar instantaneamente +500 XP flat!' },
  { id: 'olhar_monarca', name: 'Olhar do Monarca', type: 'legendary', description: 'Revela os tópicos conceituais e fórmulas conceituais que serão exigidos nas próximas missões do Mini Boss ou Boss Geral.' },
  { id: 'elixir_dourado', name: 'Elixir Dourado', type: 'epic', description: 'Dobra todo o XP ganho na missão em que for ativado.' },
  { id: 'pocao_cura', name: 'Poção de Cura', type: 'epic', description: 'Restaura a integridade de uma quest do Baú para 100% de XP, limpando as penalidades de erros.' },
  { id: 'relogio_tempo', name: 'Relógio Ganha Tempo', type: 'epic', description: 'Estende o prazo de expiração de uma missão ativa por mais 24 horas, evitando que ela expire.' },
  { id: 'anel_serpente', name: 'Anel da Serpente', type: 'epic', description: 'Aumenta a taxa de drop de artefatos em Mini Bosses em +35% para toda a Party durante 7 dias.' },
  { id: 'lagrima_fenix', name: 'Lágrima da Fênix', type: 'epic', description: 'Reseta as tentativas e o temporizador de uma missão de Mini Boss falhada para permitir nova investida imediata.' },
  { id: 'bandeira_guerra', name: 'Bandeira de Guerra da Guilda', type: 'epic', description: 'Ao ser fincado, concede +20% de ganho de XP para toda a party nas próximas 24 horas (apenas Party).' },
  { id: 'orbe_perspicacia', name: 'Orbe de Perspicácia', type: 'epic', description: 'Permite ver o próximo tópico conceitual ou área de conhecimento no caminho de missões da Party/Guilda.' },
  { id: 'chave_mestra', name: 'Chave Mestra', type: 'epic', description: 'Permite entrar em qualquer party ativa, mesmo se o limite de membros já tiver sido atingido.' },
  { id: 'cetro_exilio', name: 'Cetro do Exílio', type: 'epic', description: 'Expulsa um invasor indesejado de uma masmorra/party ativa, revertendo XP roubado.' },
  { id: 'sapatilhas_veloz', name: 'Sapatilhas do Mundo Lento', type: 'magic', description: 'Reduz a dificuldade da missão diária ativa em 1 nível (não afeta Bosses).' },
  { id: 'martelo_magico', name: 'Martelo Mágico', type: 'magic', description: 'Decompõe o problema ativo em passos lógicos de raciocínio lógico/pedagógico sequencial.' },
  { id: 'poeira_estelar', name: 'Poeira Estelar', type: 'magic', description: 'Elimina uma das alternativas incorretas em missões de Múltipla Escolha.' },
  { id: 'pergaminho_oraculo', name: 'Pergaminho do Oráculo', type: 'magic', description: 'Gera uma dica parcial "Quente/Frio" sobre o raciocínio da sua resposta antes de submeter.' },
  { id: 'escudo_arcano', name: 'Escudo Arcano', type: 'magic', description: 'Cancela a penalidade de 25% na próxima tentativa errada.' },
  { id: 'bracelete_cristal', name: 'Bracelete de Cristal', type: 'magic', description: 'Absorve a penalidade (-25% de XP acumulado por erro) de uma tentativa incorreta (possui 2 cargas).' },
  { id: 'bolsa_sorte', name: 'Bolsa da Sorte', type: 'magic', description: 'Aumenta a taxa de drop de artefatos em missões diárias comuns em +15% por 7 dias.' },
  { id: 'mao_midas', name: 'Mão de Midas', type: 'magic', description: 'Oferece 50% de chance de transmutar um item Mágico em um Épico aleatório (falha destrói o item).' },
  { id: 'pena_escriba', name: 'Pena do Escriba', type: 'magic', description: 'Em perguntas teóricas dissertativas, revela as 3 principais palavras-chave esperadas para aprovação.' },
  { id: 'varinha_pinheiro', name: 'Varinha de Pinheiro', type: 'magic', description: 'Transforma uma missão de cálculo discursiva em múltipla escolha com opções.' },
  { id: 'chapeu_arcanista', name: 'Chapéu do Arcanista', type: 'legendary', description: 'Aumenta a chance de dropar itens Épicos em missões comuns e Lendários em Bosses por 7 dias.' }
];

export function usePlayerState() {
  const router = useRouter();
  const sounds = useSolenSounds();
  const soundsRef = useRef(sounds);
  useEffect(() => {
    soundsRef.current = sounds;
  }, [sounds]);

  const [user, setUser] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isCalculation, setIsCalculation] = useState(false);

  // Tabs: 'STATUS', 'BAÚ'
  const [activeTab, setActiveTab] = useState('STATUS');
  const [showTerms, setShowTerms] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  // Quest State
  const [showWindow, setShowWindow] = useState(false);
  const [deliveryId, setDeliveryId] = useState('');
  const [question, setQuestion] = useState('');
  const [questXp, setQuestXp] = useState(0);
  const [baseQuestXp, setBaseQuestXp] = useState(0);
  const [questNivel, setQuestNivel] = useState('FACIL');
  const [fromQueue, setFromQueue] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [feedback, setFeedback] = useState<{ status: string; message: string; youtubeLink?: string; cooldownUntil?: string } | null>(null);
  const [isFromChest, setIsFromChest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  // Estados de ajuda dos Artefatos V3
  const [helpRequested, setHelpRequested] = useState(false);
  const [helpResponse, setHelpResponse] = useState<string | null>(null);
  const [eliminatedOption, setEliminatedOption] = useState<string | null>(null);
  const [hammerSteps, setHammerSteps] = useState<string[] | null>(null);
  const [oracleHint, setOracleHint] = useState<string | null>(null);
  const [scribeKeywords, setScribeKeywords] = useState<string[]>([]);
  const [hintsObsolete, setHintsObsolete] = useState(false); // true quando sapatilhas_veloz invalida as dicas anteriores
  const [questErros, setQuestErros] = useState(0);
  const [storingInChest, setStoringInChest] = useState(false);
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [studentDoubtText, setStudentDoubtText] = useState('');
  const [studentDoubt, setStudentDoubt] = useState<string | null>(null);
  const [usedHelpers, setUsedHelpers] = useState<string[]>([]);
  const [isRaidQuest, setIsRaidQuest] = useState(false);

  const [questExpiresAt, setQuestExpiresAt] = useState<Date | string | null>(null);
  const [questCooldownUntil, setQuestCooldownUntil] = useState<Date | string | null>(null);
  const [timeRemainingText, setTimeRemainingText] = useState('');

  // Multi-Boss States
  const [activeBosses, setActiveBosses] = useState<any[]>([]);
  const [showMultiBossSelection, setShowMultiBossSelection] = useState(false);

  // Subject Stats States
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [showFailedStats, setShowFailedStats] = useState(false);
  const [selectedSubjectToInvoke, setSelectedSubjectToInvoke] = useState<any | null>(null);
  const [loadingSubjectStats, setLoadingSubjectStats] = useState(false);

  // Rank Up State
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankUpMessage, setRankUpMessage] = useState('');
  const [rankUpArtifact, setRankUpArtifact] = useState<{
    id: string;
    name: string;
    type: 'epic' | 'magic' | 'legendary';
    description?: string;
  } | null>(null);
  const rankUpScaleAnim = useRef(new Animated.Value(0)).current;

  // Bolsa de Artefatos
  const [showBag, setShowBag] = useState(false);
  const [bagInventory, setBagInventory] = useState<any[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);
  const [showUseBag, setShowUseBag] = useState(false);

  const hasLoadedRef = useRef(false);

  // Auto-salvar inventário no AsyncStorage quando houver alteração
  useEffect(() => {
    if (user?.id && hasLoadedRef.current) {
      AsyncStorage.setItem(`@Solen:inventory:${user.id}`, JSON.stringify(bagInventory)).catch((err) =>
        console.error('Erro ao salvar inventário no AsyncStorage:', err)
      );
    }
  }, [bagInventory, user?.id]);

  // Estado para Animação de Queima de Artefato (Vaporização Premium)
  const [burnArtifact, setBurnArtifact] = useState<any | null>(null);
  const [showBurnModal, setShowBurnModal] = useState(false);

  const consumeItemLocally = async (itemId: string) => {
    try {
      if (!user?.id) return;
      const stored = await AsyncStorage.getItem(`@Solen:inventory:${user.id}`);
      let currentBag = stored ? JSON.parse(stored) : bagInventory;
      const idx = currentBag.findIndex((item: any) => item.id === itemId);
      if (idx !== -1) {
        currentBag.splice(idx, 1);
        await AsyncStorage.setItem(`@Solen:inventory:${user.id}`, JSON.stringify(currentBag));
        setBagInventory(currentBag);
      }
    } catch (e) {
      console.error('Erro ao consumir item localmente:', e);
    }
  };

  // --- INÍCIO DE PERSISTÊNCIA DE DICAS DE ARTEFATOS EM CACHE LOCAL (PREVENÇÃO DE CRASHES) ---
  const saveArtifactHintToCache = async (delivId: string, type: 'martelo' | 'oraculo' | 'escriba' | 'poeira' | 'obsoleto', value: any) => {
    if (!delivId) return;
    try {
      const cacheKey = `@Solen:hints:${delivId}`;
      const existingRaw = await AsyncStorage.getItem(cacheKey);
      const cache = existingRaw ? JSON.parse(existingRaw) : {};
      
      if (type === 'martelo') cache.hammerSteps = value;
      if (type === 'oraculo') cache.oracleHint = value;
      if (type === 'escriba') cache.scribeKeywords = value;
      if (type === 'poeira') cache.eliminatedOption = value;
      if (type === 'obsoleto') cache.hintsObsolete = value;
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (e) {
      console.warn('Erro ao salvar cache de dicas:', e);
    }
  };

  const loadArtifactHintsFromCache = async (delivId: string) => {
    if (!delivId) return;
    try {
      const cacheKey = `@Solen:hints:${delivId}`;
      const existingRaw = await AsyncStorage.getItem(cacheKey);
      if (existingRaw) {
        const cache = JSON.parse(existingRaw);
        if (cache.hammerSteps) setHammerSteps(cache.hammerSteps);
        if (cache.oracleHint) setOracleHint(cache.oracleHint);
        if (cache.scribeKeywords) setScribeKeywords(cache.scribeKeywords);
        if (cache.eliminatedOption) setEliminatedOption(cache.eliminatedOption);
        setHintsObsolete(cache.hintsObsolete || false);
      } else {
        setHintsObsolete(false);
      }
    } catch (e) {
      console.warn('Erro ao carregar cache de dicas:', e);
    }
  };

  const clearArtifactHintsCache = async (delivId: string) => {
    if (!delivId) return;
    try {
      await AsyncStorage.removeItem(`@Solen:hints:${delivId}`);
      setHintsObsolete(false);
    } catch (e) {
      console.warn('Erro ao limpar cache de dicas:', e);
    }
  };
  // --- FIM DE PERSISTÊNCIA DE DICAS ---

  const checkAndTriggerRankUp = (oldXp: number, newXp: number) => {
    const oldRankInfo = getPlayerRankInfo(oldXp);
    const newRankInfo = getPlayerRankInfo(newXp);

    if (newRankInfo.currentRank !== oldRankInfo.currentRank) {
      const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S'];
      const oldIdx = rankOrder.indexOf(oldRankInfo.currentRank);
      const newIdx = rankOrder.indexOf(newRankInfo.currentRank);

      if (newIdx > oldIdx) {
        let awarded: any = null;
        if (newRankInfo.currentRank === 'D') {
          awarded = { id: 'poeira_estelar', name: 'Poeira Estelar', type: 'legendary', description: 'Elimina uma alternativa incorreta em qualquer missão.' };
        } else if (newRankInfo.currentRank === 'C') {
          awarded = { id: 'martelo_magico', name: 'Martelo Mágico', type: 'legendary', description: 'Fracione um problema complexo em 3 pequenos passos passo-a-passo.' };
        } else if (newRankInfo.currentRank === 'B') {
          awarded = { id: 'becker_alquimista', name: 'Becker do Alquimista', type: 'legendary', description: 'Consome a essência alquímica para ganhar instantaneamente +500 XP flat!' };
        } else if (newRankInfo.currentRank === 'A') {
          awarded = { id: 'sussurros_sabios', name: 'Sussurros Sábios', type: 'legendary', description: 'Envia um pedido de ajuda ao Mestre para liberar uma dica pedagógica. Concede tentativa extra e +50% de XP.' };
        } else if (newRankInfo.currentRank === 'S') {
          awarded = { id: 'olhar_monarca', name: 'Olhar do Monarca', type: 'legendary', description: 'Revela os tópicos conceituais e fórmulas conceituais que serão exigidos nas próximas missões do Mini Boss ou Boss Geral.' };
          // Chapéu do Arcanista também cai no Rank S (único drop possível além de presentes do Mestre)
          const chapeu = { id: 'chapeu_arcanista', name: 'Chapéu do Arcanista', type: 'legendary', description: 'Aumenta a chance de dropar itens Épicos em missões comuns e Lendários em Bosses por 7 dias.' };
          setBagInventory((prev) => [...prev, chapeu]);
        }

        if (awarded) {
          setBagInventory((prev) => [...prev, awarded]);
          setRankUpArtifact(awarded);
        } else {
          setRankUpArtifact(null);
        }

        setRankUpMessage(
          `Parabéns Caçador! Você ascendeu para o Rank "${newRankInfo.currentRank}"!\nSeu poder acaba de invocar um novo artefato de poder para o seu inventário!`
        );
        setShowRankUp(true);
        sounds.playSuccess?.() || sounds.playSelect();
      }
    }
  };

  // Estado para Artefato Selecionado mas ainda NÃO Queimado (Fase Pendente)
  const [pendingArtifact, setPendingArtifact] = useState<any | null>(null);

  // Party System State
  const [activeParty, setActiveParty] = useState<any | null>(null);
  const [partyCodeInput, setPartyCodeInput] = useState('');
  const [loadingParty, setLoadingParty] = useState(false);

  // Chat na Raid State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFloatingChat, setShowFloatingChat] = useState(false);

  // Unread Notification Counts
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadCalendarCount, setUnreadCalendarCount] = useState(0);
  const [unreadBagCount, setUnreadBagCount] = useState(0);

  // Timetable and Calendar Agenda States
  const [showCalendar, setShowCalendar] = useState(false);
  const [playerTimetable, setPlayerTimetable] = useState<any[]>([]);
  const [playerCalendarEvents, setPlayerCalendarEvents] = useState<any[]>([]);
  const [loadingPlayerAgenda, setLoadingPlayerAgenda] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  // Automatic Unread Clearing Effects
  useEffect(() => {
    if (showBag || activeTab === 'BAÚ') {
      setUnreadBagCount(0);
    }
  }, [showBag, activeTab]);

  useEffect(() => {
    if (bagInventory.length > 0 && !showBag && activeTab !== 'BAÚ') {
      setUnreadBagCount((prev) => prev + 1);
    }
  }, [bagInventory.length, showBag, activeTab]);

  useEffect(() => {
    const markCalendarAsRead = async () => {
      if (showCalendar && playerCalendarEvents.length > 0) {
        setUnreadCalendarCount(0);
        try {
          const viewedIds = playerCalendarEvents.map((e) => e.id);
          await AsyncStorage.setItem('@Solen:viewedCalendarEventIds', JSON.stringify(viewedIds));
        } catch (err) {
          console.error('Erro ao salvar viewedCalendarEventIds:', err);
        }
      }
    };
    markCalendarAsRead();
  }, [showCalendar, playerCalendarEvents]);

  useEffect(() => {
    const checkUnreadCalendarEvents = async () => {
      if (playerCalendarEvents.length > 0 && !showCalendar) {
        try {
          const stored = await AsyncStorage.getItem('@Solen:viewedCalendarEventIds');
          const viewedIds = stored ? JSON.parse(stored) : [];
          const unreadEvents = playerCalendarEvents.filter((e) => !viewedIds.includes(e.id));
          setUnreadCalendarCount(unreadEvents.length);
        } catch (err) {
          setUnreadCalendarCount(playerCalendarEvents.length);
        }
      }
    };
    checkUnreadCalendarEvents();
  }, [playerCalendarEvents, showCalendar]);

  useEffect(() => {
    if (showFloatingChat || activeTab === 'PARTY') {
      setUnreadChatCount(0);
    }
  }, [showFloatingChat, activeTab]);

  // State para Pergunta Dourada
  const [activeGoldenQuestion, setActiveGoldenQuestion] = useState<any | null>(null);
  const [goldenAnswerText, setGoldenAnswerText] = useState('');
  const [submittingGolden, setSubmittingGolden] = useState(false);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info' | 'BOSS'>('info');
  const [alertButtons, setAlertButtons] = useState<any[] | undefined>(undefined);
  const alertCloseCallback = useRef<(() => void) | null>(null);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' | 'BOSS' = 'info',
      onCloseCallback?: () => void,
      buttons?: any[]
    ) => {
      if (type === 'error' || type === 'warning') {
        sounds.playError();
      }
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertType(type);
      setAlertButtons(buttons);
      if (onCloseCallback) {
        alertCloseCallback.current = onCloseCallback;
      } else {
        alertCloseCallback.current = null;
      }
      setAlertVisible(true);
    },
    [sounds.playError]
  );

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

  useEffect(() => {
    if (showRankUp) {
      sounds.playRankUp();
      rankUpScaleAnim.setValue(0.5);
      Animated.spring(rankUpScaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [showRankUp, sounds, rankUpScaleAnim]);

  // Baú State
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([]);
  const [loadingBaú, setLoadingBaú] = useState(false);
  const [retryAnswer, setRetryAnswer] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchActiveGoldenQuestion = useCallback(async () => {
    try {
      const q = await getActiveGoldenQuestion();
      setActiveGoldenQuestion(q);
    } catch (e) {
      console.warn('Erro ao buscar pergunta dourada ativa');
    }
  }, []);

  const handleAnswerGoldenQuestion = async () => {
    if (!activeGoldenQuestion || !goldenAnswerText.trim()) return;
    try {
      setSubmittingGolden(true);
      await answerGoldenQuestion(activeGoldenQuestion.id, goldenAnswerText.trim());
      showAlert(
        'OPINIÃO ENVIADA',
        'Seu feedback foi canalizado diretamente ao Arquiteto. Obrigado, Caçador!',
        'success'
      );
      setGoldenAnswerText('');
      setActiveGoldenQuestion(null);
    } catch (e) {
      showAlert('ERRO DE CANALIZAÇÃO', 'Não foi possível enviar sua resposta.', 'error');
    } finally {
      setSubmittingGolden(false);
    }
  };

  const handleTimerFinish = useCallback(() => {
    setTimeRemainingText('EXPIRADA');
    setShowWindow(false);
    setDeliveryId('');
    showAlert('TEMPO ESGOTADO', 'O tempo limite da missão expirou! A missão sumiu.', 'error');
  }, [showAlert]);

  useEffect(() => {
    let timer: any = null;
    if (showWindow && questExpiresAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const expiry = new Date(questExpiresAt).getTime();
        const diff = expiry - now;

        if (diff <= 0) {
          handleTimerFinish();
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          let text = '';
          if (hours > 0) {
            text += `${hours}h `;
          }
          text += `${minutes}m ${seconds}s`;
          setTimeRemainingText(text);
        }
      };

      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setTimeRemainingText('');
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showWindow, questExpiresAt, handleTimerFinish]);

  const loadBagInventoryFromStorage = async (userId: string) => {
    hasLoadedRef.current = false;
    try {
      const stored = await AsyncStorage.getItem(`@Solen:inventory:${userId}`);
      let currentBag = stored ? JSON.parse(stored) : [];

      if (userId === '8c9d53bb-087b-45c9-863d-526bfe3ef20e') {
        const hasSapatilhas = currentBag.some((x: any) => x.id === 'sapatilhas_veloz');
        const hasVarinha = currentBag.some((x: any) => x.id === 'varinha_pinheiro');
        let updated = false;

        if (!hasSapatilhas) {
          currentBag.push(
            { id: 'sapatilhas_veloz', name: 'Sapatilhas do Mundo Lento', type: 'magic', description: 'Reduz a dificuldade da missão diária ativa em 1 nível (não afeta Bosses).' },
            { id: 'sapatilhas_veloz', name: 'Sapatilhas do Mundo Lento', type: 'magic', description: 'Reduz a dificuldade da missão diária ativa em 1 nível (não afeta Bosses).' }
          );
          updated = true;
        }
        if (!hasVarinha) {
          currentBag.push(
            { id: 'varinha_pinheiro', name: 'Varinha de Pinheiro', type: 'magic', description: 'Transforma uma missão de cálculo discursiva em múltipla escolha com opções.' },
            { id: 'varinha_pinheiro', name: 'Varinha de Pinheiro', type: 'magic', description: 'Transforma uma missão de cálculo discursiva em múltipla escolha com opções.' }
          );
          updated = true;
        }

        if (updated) {
          await AsyncStorage.setItem(`@Solen:inventory:${userId}`, JSON.stringify(currentBag));
        }
      }

      if (userId === 'fa4e11dd-9357-4251-98b9-7be6ca692092') {
        const count = currentBag.filter((x: any) => x.id === 'pocao_cura').length;
        if (count < 5) {
          for (let i = 0; i < 15; i++) {
            currentBag.push({ 
              id: 'pocao_cura', 
              name: 'Poção de Cura', 
              type: 'epic', 
              description: 'Restaura a integridade de uma quest do Baú para 100% de XP, limpando as penalidades de erros.' 
            });
          }
          await AsyncStorage.setItem(`@Solen:inventory:${userId}`, JSON.stringify(currentBag));
        }
      }

      if ((userId === '8c9d53bb-087b-45c9-863d-526bfe3ef20e' || userId === '85f129e3-f8af-45da-a4c8-c759a329e226' || userId === 'fa4e11dd-9357-4251-98b9-7be6ca692092') && (!stored || currentBag.length < 40 || !currentBag.some((x: any) => x.id === 'cetro_exilio'))) {
        const compensationArtifacts = [
          // 2x Sussurros Sábios
          { id: 'sussurros_sabios', name: 'Sussurros Sábios', type: 'legendary', description: 'Envia um pedido de ajuda ao Mestre para liberar uma dica pedagógica. Concede tentativa extra e +50% de XP.' },
          { id: 'sussurros_sabios', name: 'Sussurros Sábios', type: 'legendary', description: 'Envia um pedido de ajuda ao Mestre para liberar uma dica pedagógica. Concede tentativa extra e +50% de XP.' },
          // 2x Becker do Alquimista
          { id: 'becker_alquimista', name: 'Becker do Alquimista', type: 'legendary', description: 'Consome a essência alquímica para ganhar instantaneamente +500 XP flat!' },
          { id: 'becker_alquimista', name: 'Becker do Alquimista', type: 'legendary', description: 'Consome a essência alquímica para ganhar instantaneamente +500 XP flat!' },
          // 2x Olhar do Monarca
          { id: 'olhar_monarca', name: 'Olhar do Monarca', type: 'legendary', description: 'Revela os tópicos conceituais e fórmulas conceituais que serão exigidos nas próximas missões do Mini Boss ou Boss Geral.' },
          { id: 'olhar_monarca', name: 'Olhar do Monarca', type: 'legendary', description: 'Revela os tópicos conceituais e fórmulas conceituais que serão exigidos nas próximas missões do Mini Boss ou Boss Geral.' },
          // 2x Elixir Dourado
          { id: 'elixir_dourado', name: 'Elixir Dourado', type: 'epic', description: 'Dobra todo o XP ganho na missão em que for ativado.' },
          { id: 'elixir_dourado', name: 'Elixir Dourado', type: 'epic', description: 'Dobra todo o XP ganho na missão em que for ativado.' },
          // 2x Poção de Cura
          { id: 'pocao_cura', name: 'Poção de Cura', type: 'epic', description: 'Restaura a integridade de uma quest do Baú para 100% de XP, limpando as penalidades de erros.' },
          { id: 'pocao_cura', name: 'Poção de Cura', type: 'epic', description: 'Restaura a integridade de uma quest do Baú para 100% de XP, limpando as penalidades de erros.' },
          // 2x Relógio Ganha Tempo
          { id: 'relogio_tempo', name: 'Relógio Ganha Tempo', type: 'epic', description: 'Estende o prazo de expiração de uma missão ativa por mais 24 horas, evitando que ela expire.' },
          { id: 'relogio_tempo', name: 'Relógio Ganha Tempo', type: 'epic', description: 'Estende o prazo de expiração de uma missão ativa por mais 24 horas, evitando que ela expire.' },
          // 2x Anel da Serpente
          { id: 'anel_serpente', name: 'Anel da Serpente', type: 'epic', description: 'Aumenta a taxa de drop de artefatos em Mini Bosses em +35% para toda a Party durante 7 dias.' },
          { id: 'anel_serpente', name: 'Anel da Serpente', type: 'epic', description: 'Aumenta a taxa de drop de artefatos em Mini Bosses em +35% para toda a Party durante 7 dias.' },
          // 2x Lágrima da Fênix
          { id: 'lagrima_fenix', name: 'Lágrima da Fênix', type: 'epic', description: 'Reseta as tentativas e o temporizador de uma missão de Mini Boss falhada para permitir nova investida imediata.' },
          { id: 'lagrima_fenix', name: 'Lágrima da Fênix', type: 'epic', description: 'Reseta as tentativas e o temporizador de uma missão de Mini Boss falhada para permitir nova investida imediata.' },
          // 2x Bandeira de Guerra
          { id: 'bandeira_guerra', name: 'Bandeira de Guerra da Guilda', type: 'epic', description: 'Ao ser fincado, concede +20% de ganho de XP para toda a party nas próximas 24 horas (apenas Party).' },
          { id: 'bandeira_guerra', name: 'Bandeira de Guerra da Guilda', type: 'epic', description: 'Ao ser fincado, concede +20% de ganho de XP para toda a party nas próximas 24 horas (apenas Party).' },
          // 2x Orbe de Perspicácia
          { id: 'orbe_perspicacia', name: 'Orbe de Perspicácia', type: 'epic', description: 'Permite ver o próximo tópico conceitual ou área de conhecimento no caminho de missões da Party/Guilda.' },
          { id: 'orbe_perspicacia', name: 'Orbe de Perspicácia', type: 'epic', description: 'Permite ver o próximo tópico conceitual ou área de conhecimento no caminho de missões da Party/Guilda.' },
          // 2x Chave Mestra
          { id: 'chave_mestra', name: 'Chave Mestra', type: 'epic', description: 'Permite entrar em qualquer party ativa, mesmo se o limite de membros já tiver sido atingido.' },
          { id: 'chave_mestra', name: 'Chave Mestra', type: 'epic', description: 'Permite entrar em qualquer party ativa, mesmo se o limite de membros já tiver sido atingido.' },
          // 2x Cetro do Exílio (Artefato de Expurgo)
          { id: 'cetro_exilio', name: 'Cetro do Exílio', type: 'epic', description: 'Expulsa um invasor indesejado de uma masmorra/party ativa, revertendo XP roubado.' },
          { id: 'cetro_exilio', name: 'Cetro do Exílio', type: 'epic', description: 'Expulsa um invasor indesejado de uma masmorra/party ativa, revertendo XP roubado.' },
          // 2x Sapatilhas do Mundo Lento
          { id: 'sapatilhas_veloz', name: 'Sapatilhas do Mundo Lento', type: 'magic', description: 'Reduz a dificuldade da missão diária ativa em 1 nível (não afeta Bosses).' },
          { id: 'sapatilhas_veloz', name: 'Sapatilhas do Mundo Lento', type: 'magic', description: 'Reduz a dificuldade da missão diária ativa em 1 nível (não afeta Bosses).' },
          // 2x Varinha de Pinheiro
          { id: 'varinha_pinheiro', name: 'Varinha de Pinheiro', type: 'magic', description: 'Transforma uma missão de cálculo discursiva em múltipla escolha com opções.' },
          { id: 'varinha_pinheiro', name: 'Varinha de Pinheiro', type: 'magic', description: 'Transforma uma missão de cálculo discursiva em múltipla escolha com opções.' },
          // 2x Martelo Mágico
          { id: 'martelo_magico', name: 'Martelo Mágico', type: 'magic', description: 'Decompõe o problema active em passos lógicos de raciocínio lógico/pedagógico sequencial.' },
          { id: 'martelo_magico', name: 'Martelo Mágico', type: 'magic', description: 'Decompõe o problema active em passos lógicos de raciocínio lógico/pedagógico sequencial.' },
          // 2x Poeira Estelar
          { id: 'poeira_estelar', name: 'Poeira Estelar', type: 'magic', description: 'Elimina uma das alternativas incorretas em missões de Múltipla Escolha.' },
          { id: 'poeira_estelar', name: 'Poeira Estelar', type: 'magic', description: 'Elimina uma das alternativas incorretas em missões de Múltipla Escolha.' },
          // 2x Pergaminho do Oráculo
          { id: 'pergaminho_oraculo', name: 'Pergaminho do Oráculo', type: 'magic', description: 'Gera uma dica parcial "Quente/Frio" sobre o raciocínio da sua resposta antes de submeter.' },
          { id: 'pergaminho_oraculo', name: 'Pergaminho do Oráculo', type: 'magic', description: 'Gera uma dica parcial "Quente/Frio" sobre o raciocínio da sua resposta antes de submeter.' },
          // 2x Escudo Arcano
          { id: 'escudo_arcano', name: 'Escudo Arcano', type: 'magic', description: 'Cancela a penalidade de 25% na próxima tentativa errada.' },
          { id: 'escudo_arcano', name: 'Escudo Arcano', type: 'magic', description: 'Cancela a penalidade de 25% na próxima tentativa errada.' },
          // 2x Bracelete de Cristal
          { id: 'bracelete_cristal', name: 'Bracelete de Cristal', type: 'magic', description: 'Absorve a penalidade (-25% de XP acumulado por erro) de uma tentativa incorreta (possui 2 cargas).' },
          { id: 'bracelete_cristal', name: 'Bracelete de Cristal', type: 'magic', description: 'Absorve a penalidade (-25% de XP acumulado por erro) de uma tentativa incorreta (possui 2 cargas).' },
          // 2x Bolsa da Sorte
          { id: 'bolsa_sorte', name: 'Bolsa da Sorte', type: 'magic', description: 'Aumenta a taxa de drop de artefatos em missões diárias comuns em +15% por 7 dias.' },
          { id: 'bolsa_sorte', name: 'Bolsa da Sorte', type: 'magic', description: 'Aumenta a taxa de drop de artefatos em missões diárias comuns em +15% por 7 dias.' },
          // 2x Mão de Midas
          { id: 'mao_midas', name: 'Mão de Midas', type: 'magic', description: 'Oferece 50% de chance de transmutar um item Mágico em um Épico aleatório (falha destrói o item).' },
          { id: 'mao_midas', name: 'Mão de Midas', type: 'magic', description: 'Oferece 50% de chance de transmutar um item Mágico em um Épico aleatório (falha destrói o item).' },
          // 2x Pena do Escriba
          { id: 'pena_escriba', name: 'Pena do Escriba', type: 'magic', description: 'Em perguntas teóricas dissertativas, revela as 3 principais palavras-chave esperadas para aprovação.' },
          { id: 'pena_escriba', name: 'Pena do Escriba', type: 'magic', description: 'Em perguntas teóricas dissertativas, revela as 3 principais palavras-chave esperadas para aprovação.' }
        ];
        currentBag = compensationArtifacts;
        await AsyncStorage.setItem(`@Solen:inventory:${userId}`, JSON.stringify(compensationArtifacts));
      } else if (!stored) {
        currentBag = [];
      }
      
      setBagInventory(currentBag);
    } catch (e) {
      console.warn('Erro ao carregar bolsa do armazenamento local:', e);
    } finally {
      hasLoadedRef.current = true;
    }
  };

  const checkForPendingGifts = async (isQuestCompletion = false) => {
    try {
      const giftRes = await getPendingGiftedArtifacts();
      if (giftRes && giftRes.success && giftRes.gifts && giftRes.gifts.length > 0) {
        const allArtifacts = allAvailableArtifacts;
        const serverIds = new Set(giftRes.gifts);

        setBagInventory((prev) => {
          const existingIds = new Set(prev.map((x: any) => x.id));
          const trulyNew = allArtifacts
            .filter((x: any) => serverIds.has(x.id) && !existingIds.has(x.id));

          if (trulyNew.length === 0) return prev;

          const updatedBag = [...prev, ...trulyNew];
          AsyncStorage.setItem(`@Solen:inventory:${user?.id || ''}`, JSON.stringify(updatedBag)).catch(() => {});
          return updatedBag;
        });

        // Notificar apenas sobre itens realmente novos
        const existingIds = new Set(bagInventory.map((x: any) => x.id));
        const trulyNewItems = allArtifacts
          .filter((x: any) => serverIds.has(x.id) && !existingIds.has(x.id));

        if (trulyNewItems.length > 0) {
          sounds.playSuccess?.() || sounds.playSelect();
          showAlert(
            isQuestCompletion ? '🔮 NOVO ARTEFATO ENCONTRADO!' : '🎁 PRESENTE DO MESTRE',
            isQuestCompletion
              ? `Você encontrou novos artefatos ao concluir o desafio:\n\n${trulyNewItems.map((x: any) => `• ${x.name}`).join('\n')}`
              : `O Mestre das Masmorras concedeu novos artefatos para o seu arsenal:\n\n${trulyNewItems.map((x: any) => `• ${x.name}`).join('\n')}`,
            'success'
          );
        }
      }
    } catch (error) {
      console.warn('Erro ao verificar artefatos pendentes:', error);
    }
  };

  const fetchPlayerAgenda = useCallback(async () => {
    try {
      setLoadingPlayerAgenda(true);
      const userRaw = await AsyncStorage.getItem('@Solen:user');
      const localUser = userRaw ? JSON.parse(userRaw) : null;
      const tId = localUser?.turmaId || user?.turmaId;
      const [table, events] = await Promise.all([
        tId ? getTurmaTimetable(tId) : Promise.resolve([]),
        getCalendarEvents()
      ]);
      setPlayerTimetable(table || []);
      setPlayerCalendarEvents(events || []);
    } catch (err) {
      console.error('Erro ao carregar agenda do jogador:', err);
    } finally {
      setLoadingPlayerAgenda(false);
    }
  }, [user?.turmaId]);

  const loadInitialData = useCallback(async () => {
    try {
      const userRaw = await AsyncStorage.getItem('@Solen:user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setUser(u);
        if (!u.acceptedTermsAt) {
          setShowTerms(true);
        }
      }

      const freshUser = await getMe();
      if (freshUser) {
        setUser(freshUser);
        await AsyncStorage.setItem('@Solen:user', JSON.stringify(freshUser));
        if (!freshUser.acceptedTermsAt) {
          setShowTerms(true);
        } else {
          setShowTerms(false);
        }
        if (freshUser.turmaId) {
          fetchPlayerAgenda();
        }

        // Buscar inventário de artefatos do servidor (fonte da verdade)
        try {
          const invRes = await getArtifactInventory();
          if (invRes && invRes.success) {
            // Array vazio = usuário não tem artefatos. Não usar cache — servidor é fonte de verdade.
            const artifacts = (invRes.gifts || [])
              .map((giftId: string) => allAvailableArtifacts.find((x: any) => x.id === giftId))
              .filter(Boolean);
            setBagInventory(artifacts);
            await AsyncStorage.setItem(`@Solen:inventory:${freshUser.id}`, JSON.stringify(artifacts)).catch(() => {});
          } else {
            // Fallback: AsyncStorage como cache local (só quando request falha)
            loadBagInventoryFromStorage(freshUser.id);
          }
        } catch (invErr) {
          console.warn('Erro ao buscar inventário do servidor, usando cache local:', invErr);
          loadBagInventoryFromStorage(freshUser.id);
        }
      }

      fetchActiveGoldenQuestion();
    } catch (e) {
      console.error(e);
    }
  }, [fetchPlayerAgenda, fetchActiveGoldenQuestion]);

  const handleAcceptTerms = async (parentConsentName?: string) => {
    setTermsLoading(true);
    try {
      await acceptTerms(parentConsentName);
      setShowTerms(false);
      showAlert(
        '🛡️ ALIANÇA FIRMADA',
        'O Protocolo de Privacidade foi assinado com sucesso. Boa jornada, Caçador!',
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

  const handleSelectDay = (dayIndex: number) => {
    sounds.playSelect();
    setSelectedDayNumber(dayIndex);
    const diasSemana = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
    const diaNome = diasSemana[dayIndex];

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const diff = dayIndex - currentDayOfWeek;
    const targetDate = new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().split('T')[0];

    const dayEvents = playerCalendarEvents.filter((e) => e.data.startsWith(dateStr));
    setSelectedDayEvents(dayEvents);
  };

  const fetchSubjectStats = useCallback(async () => {
    try {
      setLoadingSubjectStats(true);
      const data = await getSubjectStats();
      setSubjectStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubjectStats(false);
    }
  }, []);

  const handleCheckQuestChestStatus = useCallback(async () => {
    try {
      const q = await getDailyQuest();
      if (q && q.deliveryId) {
        const dStatus = await getQuestDeliveryStatus(q.deliveryId);
        if (dStatus && dStatus.storedInChest) {
          setIsFromChest(true);
        }
      }
    } catch (e) {
      console.warn('Erro ao verificar status do baú');
    }
  }, []);

  const loadCurrentQuest = useCallback(async () => {
    if (!user || !user.acceptedTermsAt) return;

    if (showWindow && deliveryId && !isFromChest && activeParty?.raidModeActive && feedback === null && !submitting) {
      try {
        const dStatus = await getQuestDeliveryStatus(deliveryId);
        if (dStatus) {
          setIsRaidQuest(dStatus.isRaidQuest || false);
          if (dStatus.status === 'COMPLETED') {
            if (feedback === null) {
              soundsRef.current.playSuccess?.() || soundsRef.current.playSelect();
              setFeedback({ 
                status: 'CORRECT', 
                message: 'Missão cumprida! O caçador parceiro superou o desafio.' 
              });
              showAlert('MISSAO CUMPRIDA', 'Seu grupo completou o desafio da Raid!', 'success');
              setIsRaidQuest(false);
              loadInitialData();
              loadChestData();
            }
            return;
          }
          if (dStatus.status === 'WAITING') {
            const isStillActiveInRaid = dStatus.isRaidQuest;
            if (!isStillActiveInRaid) {
              if (feedback === null) {
                soundsRef.current.playError?.();
                setFeedback({ 
                  status: 'WRONG', 
                  message: 'Missão falhada! O caçador parceiro falhou no desafio.' 
                });
                showAlert('MISSÃO FALHADA', 'O caçador parceiro errou a resposta e a missão foi removida da Raid.', 'error');
                setIsRaidQuest(false);
                loadChestData();
              }
              return;
            }
          }

          if (dStatus.status !== 'COMPLETED') {
            setHelpRequested(dStatus.helpRequested || false);
            setHelpResponse(dStatus.helpResponse || null);
            setStudentDoubt(dStatus.studentDoubt || null);
            setQuestion(dStatus.question || '');
            setQuestXp(dStatus.xp || 100);
            setQuestNivel(dStatus.nivel || 'FACIL');
            setQuestErros(dStatus.erros || 0);
            if (dStatus.expiresAt) {
              setQuestExpiresAt(dStatus.expiresAt);
            }
            if (dStatus.usedHelpers !== undefined) {
              setUsedHelpers(Array.isArray(dStatus.usedHelpers) ? dStatus.usedHelpers : []);
            }
            if (dStatus.eliminatedOption !== undefined) setEliminatedOption(dStatus.eliminatedOption);
            if (dStatus.hammerSteps !== undefined) setHammerSteps(dStatus.hammerSteps);
            if (dStatus.oracleHint !== undefined) setOracleHint(dStatus.oracleHint);
            if (dStatus.scribeKeywords !== undefined) setScribeKeywords(dStatus.scribeKeywords);
          }
        }
      } catch (e) {
        console.warn('Erro ao verificar sincronização de status da Raid:', e);
      }
    }

    try {
      const q = await getDailyQuest();
      if (!q) {
        setShowWindow(false);
        setQuestion('');
        setQuestXp(0);
        setQuestNivel('FACIL');
        setFromQueue(false);
        setDeliveryId('');
        setQuestErros(0);
        setIsRaidQuest(false);
        setActiveBosses([]);
        setShowMultiBossSelection(false);
        setImage(null);
        setImageBase64(null);
        return;
      }

      // --- MULTI-BOSS SELECTION MODE ---
      // When the server returns isMultiBoss:true, show a card selection screen
      // so the player can choose which Mini Boss to fight first.
      if ((q as any).isMultiBoss && Array.isArray((q as any).bosses)) {
        const bossList = (q as any).bosses;

        // If a boss fight is already in progress (deliveryId is set), do NOT reset
        // back to the selection screen — the polling would otherwise interrupt the fight.
        if (deliveryId) {
          return;
        }

        setActiveBosses(bossList);
        setShowMultiBossSelection(true);
        // If the window is already showing a regular quest, keep it open.
        // Otherwise open it so the selection modal appears.
        if (!showWindow) {
          soundsRef.current.playMission?.();
          setShowWindow(true);
        }
        return;
      }

      // --- REGULAR QUEST MODE ---
      setActiveBosses([]);
      setShowMultiBossSelection(false);

      setDeliveryId(q.deliveryId || '');
      setQuestion(q.enunciado || q.question || '');
      setIsCalculation(q.tipo === 'CALCULO' || q.tags?.includes('CALCULO') || q.tags?.includes('calculo') || false);
      setQuestXp(q.xp || 100);
      setQuestNivel(q.nivel || 'FACIL');
      setFromQueue(q.fromQueue || false);
      setQuestErros(q.errosCount || q.erros || 0);
      setIsRaidQuest(q.isRaidQuest || false);

      if (q.expiresAt) {
        setQuestExpiresAt(q.expiresAt);
      } else {
        setQuestExpiresAt(null);
      }

      setHelpRequested(q.helpRequested || false);
      setHelpResponse(q.helpResponse || null);

      const isNewQuest = (q.deliveryId || '') !== deliveryId;
      if (isNewQuest) {
        setEliminatedOption(q.eliminatedOption || null);
        setHammerSteps(q.hammerSteps || null);
        setOracleHint(q.oracleHint || null);
        setScribeKeywords(q.scribeKeywords || []);
        setStudentDoubt(q.studentDoubt || null);
        setUsedHelpers(Array.isArray(q.usedHelpers) ? q.usedHelpers : []);
        setHintsObsolete(false);
        setImage(null);
        setImageBase64(null);
      } else {
        if (q.eliminatedOption !== undefined) setEliminatedOption(q.eliminatedOption);
        if (q.hammerSteps !== undefined) setHammerSteps(q.hammerSteps);
        if (q.oracleHint !== undefined) setOracleHint(q.oracleHint);
        if (q.scribeKeywords !== undefined) setScribeKeywords(q.scribeKeywords);
        if (q.studentDoubt !== undefined) setStudentDoubt(q.studentDoubt);
        if (q.usedHelpers !== undefined) setUsedHelpers(Array.isArray(q.usedHelpers) ? q.usedHelpers : []);
      }
      if (q.deliveryId) {
        loadArtifactHintsFromCache(q.deliveryId);
      }

      if (q.storedInChest) {
        setIsFromChest(true);
      } else {
        setIsFromChest(false);
      }

      if (isNewQuest) {
        soundsRef.current.playMission();
        setShowWindow(true);
      }
    } catch (error) {
      console.warn('Nenhuma missão ativa.');
    }
  }, [deliveryId, user, showWindow, activeParty, feedback, submitting]);


  // Versão silenciosa para uso após aplicar artefato:
  // Atualiza campos do servidor sem fechar/reabrir o modal, sem tocar som,
  // e sem sobrescrever os estados locais de hints (eles vêm do AsyncStorage).
  const refreshQuestSilent = useCallback(async () => {
    try {
      const q = await getDailyQuest();
      if (!q) return;

      setQuestion(q.enunciado || q.question || '');
      setQuestXp(q.xp || 100);
      setQuestNivel(q.nivel || 'FACIL');
      setFromQueue(q.fromQueue || false);
      setQuestErros(q.errosCount || q.erros || 0);

      if (q.expiresAt) setQuestExpiresAt(q.expiresAt);
      if (q.helpRequested !== undefined) setHelpRequested(q.helpRequested);
      if (q.helpResponse !== undefined) setHelpResponse(q.helpResponse);
      if (q.studentDoubt !== undefined) setStudentDoubt(q.studentDoubt);

      // Não sobrescreve usedHelpers com o que o servidor retorna,
      // porque o estado local já está correto após o consumo do artefato.
    } catch (error) {
      console.warn('Erro ao atualizar questão silenciosamente:', error);
    }
  }, []);

  const loadPartyData = useCallback(async () => {
    try {
      setLoadingParty(true);
      const party = await getActiveParty();
      setActiveParty(party);
      if (party && party.id) {
        const msgs = await getRaidMessages(party.id);
        setChatMessages(msgs || []);
      }
    } catch (e) {
      console.warn('Erro ao carregar Party');
    } finally {
      setLoadingParty(false);
    }
  }, []);

  const handleRefreshQuest = useCallback(async () => {
    if (!deliveryId) return;
    try {
      setLoadingRefresh(true);
      const dStatus = await getQuestDeliveryStatus(deliveryId);
      if (dStatus) {
        setHelpRequested(dStatus.helpRequested || false);
        setHelpResponse(dStatus.helpResponse || null);
        setStudentDoubt(dStatus.studentDoubt || null);
        setQuestion(dStatus.question || '');
        setQuestXp(dStatus.xp || 100);
        setQuestNivel(dStatus.nivel || 'FACIL');
        setQuestErros(dStatus.erros || 0);
        setIsRaidQuest(dStatus.isRaidQuest || false);
        if (dStatus.expiresAt) {
          setQuestExpiresAt(dStatus.expiresAt);
        }
        if (dStatus.cooldownUntil || dStatus.questCooldownUntil) {
          setQuestCooldownUntil(dStatus.cooldownUntil || dStatus.questCooldownUntil);
        }
        if (dStatus.usedHelpers !== undefined) {
          setUsedHelpers(Array.isArray(dStatus.usedHelpers) ? dStatus.usedHelpers : []);
        }
        if (dStatus.eliminatedOption !== undefined) setEliminatedOption(dStatus.eliminatedOption);
        if (dStatus.hammerSteps !== undefined) setHammerSteps(dStatus.hammerSteps);
        if (dStatus.oracleHint !== undefined) setOracleHint(dStatus.oracleHint);
        if (dStatus.scribeKeywords !== undefined) setScribeKeywords(dStatus.scribeKeywords);
      }
      await loadPartyData();
    } catch (e) {
      console.warn('Erro ao atualizar missão:', e);
    } finally {
      setLoadingRefresh(false);
    }
  }, [deliveryId, loadPartyData]);

  const loadChestData = useCallback(async () => {
    try {
      setLoadingBaú(true);
      const data = await getWrongAnswers();
      setWrongAnswers(data);
    } catch (e) {
      showAlert('Erro', 'Não foi possível abrir o baú.', 'error');
    } finally {
      setLoadingBaú(false);
    }
  }, [showAlert]);

  const handleCreateParty = async () => {
    try {
      setLoadingParty(true);
      const party = await createParty();
      setActiveParty(party);
      sounds.playSuccess?.() || sounds.playSelect();
      showAlert('GRUPO FORJADO', `Compartilhe o código para recrutar aliados: ${party.codigo}`, 'success');
      loadPartyData();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Erro ao criar grupo.';
      showAlert('FALHA DE INVOCAÇÃO', msg, 'error');
    } finally {
      setLoadingParty(false);
    }
  };

  const handleJoinParty = async () => {
    if (!partyCodeInput.trim()) {
      showAlert('Aviso', 'Digite o código da Guilda/Party.', 'warning');
      return;
    }
    const code = partyCodeInput.trim().toUpperCase();
    try {
      setLoadingParty(true);
      const party = await joinParty(code);
      setActiveParty(party);
      sounds.playSuccess?.() || sounds.playSelect();
      showAlert('ALIANÇA CRISTALIZADA', 'Você se juntou à Party! Rumo à Raid.', 'success');
      setPartyCodeInput('');
      loadPartyData();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Código inválido ou party cheia.';
      const hasKey = bagInventory.some((x) => x.id === 'chave_mestra');
      const isPortalClosed = errorMsg.includes('limite máximo') || errorMsg.includes('mesma turma');

      if (hasKey && isPortalClosed) {
        showAlert(
          '🚨 CHAVE MESTRA DETECTADA!',
          'Este Portal está selado ou cheio! Deseja forçar sua entrada e invadir esta Party usando sua Chave Mestra? O item será consumido e você entrará como um [INVASOR]!',
          'warning',
          undefined,
          [
            {
              text: 'INVADIR PORTAL',
              onPress: async () => {
                try {
                  setLoadingParty(true);
                  const party = await joinParty(code, true);
                  setActiveParty(party);
                  await consumeItemLocally('chave_mestra');
                  sounds.playSuccess?.() || sounds.playSelect();
                  showAlert('PORTAL INFILTRADO', 'Você forçou a entrada usando a Chave Mestra! Agora você é um [INVASOR] nesta Raid.', 'success');
                  setPartyCodeInput('');
                  loadPartyData();
                } catch (err: any) {
                  const subMsg = err?.response?.data?.error || err?.message || 'O portal repeliu sua tentativa.';
                  showAlert('FALHA NA INFILTRAÇÃO', subMsg, 'error');
                } finally {
                  setLoadingParty(false);
                }
              }
            },
            {
              text: 'RECUAR',
              style: 'cancel'
            }
          ]
        );
      } else {
        showAlert('PORTAL BLOQUEADO', errorMsg, 'error');
      }
    } finally {
      setLoadingParty(false);
    }
  };

  const handleLeaveParty = async () => {
    try {
      setLoadingParty(true);
      await leaveParty();
      setActiveParty(null);
      setChatMessages([]);
      sounds.playSelect();
      showAlert('MENSAGEM DO GRUPO', 'Você abandonou a Raid. Retornando ao modo solo.', 'info');
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || 'Não foi possível sair do grupo.';
      showAlert('Erro ao sair do grupo', errorMsg, 'error');
    } finally {
      setLoadingParty(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !activeParty || !activeParty.id) return;
    try {
      setSendingMessage(true);
      await sendRaidMessage(activeParty.id, chatInput.trim());
      setChatInput('');
      sounds.playSelect();
      const msgs = await getRaidMessages(activeParty.id);
      setChatMessages(msgs || []);
    } catch (e) {
      console.warn('Erro ao enviar mensagem na raid');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDoubtSubmit = async () => {
    if (!studentDoubtText.trim()) {
      showAlert('Aviso', 'Escreva a sua dúvida conceitual para o Mestre.', 'warning');
      return;
    }
    setShowDoubtModal(false);
    const sussurroArt = bagInventory.find((item: any) => item.id === 'sussurros_sabios') || {
      id: 'sussurros_sabios',
      name: 'Sussurros Sábios',
      type: 'legendary'
    };
    setBurnArtifact(sussurroArt);
    setShowBurnModal(true);
  };

  const handleRequestQuest = async (disciplinaId?: string) => {
    try {
      setWaiting(true);
      await requestNextQuest(disciplinaId);
      sounds.playSelect();
      await loadCurrentQuest();
      fetchSubjectStats();

      // Se o jogador estiver em uma party com Modo Raid ativo, dispara a quest para o grupo automaticamente!
      if (activeParty && activeParty.raidModeActive) {
        const q = await getDailyQuest();
        if (q && q.deliveryId) {
          try {
            await shareQuestInRaid(q.deliveryId);
            await loadPartyData();
          } catch (e) {
            console.warn('Erro ao disparar quest na raid automaticamente:', e);
          }
        }
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Nenhuma missão disponível.';
      showAlert('MENSAGEM DO SISTEMA', msg, 'info');
    } finally {
      setWaiting(false);
    }
  };

  const handleSubmitQuest = async () => {
    const textToSubmit = isCalculation ? 'Cálculo na imagem' : answer.trim();
    if (isCalculation ? !imageBase64 : !textToSubmit) {
      showAlert('Aviso', 'Forneça uma resposta antes de submeter.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitDailyQuest(
        deliveryId,
        question,
        textToSubmit,
        imageBase64 || undefined,
        selectedArtifact?.id
      );
      setAnswer('');
      setImage(null);
      setImageBase64(null);
      setEliminatedOption(null);
      setHammerSteps(null);
      setOracleHint(null);
      setScribeKeywords([]);
      setHelpRequested(false);
      setHelpResponse(null);
      setStudentDoubt(null);
      setSelectedArtifact(null);
      setIsRaidQuest(false);
      if (deliveryId) {
        clearArtifactHintsCache(deliveryId);
      }

      if (res.isCorrect || res.status === 'success') {
        sounds.playSuccess?.() || sounds.playSelect();
        setFeedback({ status: 'CORRECT', message: res.feedback || 'Incrível! Resposta correta.' });
        loadChestData();

        const oldXp = user?.xp || 0;
        const newXp = oldXp + (res.xpGanho || questXp);

        if (res.rankUp) {
          setRankUpMessage(
            `Você ascendeu para o Rank "${res.newRank}"!\nSeu poder acadêmico acaba de transmutar um novo artefato para o seu arsenal!`
          );
          if (res.awardedArtifact) {
            setRankUpArtifact(res.awardedArtifact);
            setBagInventory((prev) => {
              const filter = prev.filter(x => x.id !== res.awardedArtifact.id);
              return [...filter, res.awardedArtifact];
            });
          } else {
            setRankUpArtifact(null);
          }
          setShowRankUp(true);
        } else {
          checkAndTriggerRankUp(oldXp, newXp);
          showAlert('MISSAO CUMPRIDA', `Você ganhou +${res.xpGanho || questXp} XP!`, 'success');
        }

        setTimeout(() => {
          checkForPendingGifts(true);
        }, 1000);

      } else {
        sounds.playError();
        setFeedback({ status: 'WRONG', message: res.feedback || 'A resposta está incorreta.', youtubeLink: res.youtubeLink, cooldownUntil: res.cooldownUntil });
        showAlert(
          'MISSÃO FALHADA',
          `A resposta está incorreta! O desafio foi enviado para o seu Baú de Relíquias de Aprendizado, onde você poderá tentar novamente para purificar o erro!`,
          'error'
        );
        loadChestData();
      }

      loadInitialData();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Erro ao submeter.';
      showAlert('Erro', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStoreInChest = async (targetDeliveryId?: string) => {
    const id = targetDeliveryId || deliveryId;
    if (!id) return;
    try {
      setStoringInChest(true);
      await storeQuestInChest(id);
      sounds.playSelect();
      showAlert(
        'TRANSMUTAÇÃO CONCLUÍDA',
        'A missão ativa foi guardada no Baú de Questões Falhadas com sucesso!',
        'success'
      );
      if (targetDeliveryId) {
        const remaining = activeBosses.filter(b => b.deliveryId !== targetDeliveryId);
        setActiveBosses(remaining);
        if (remaining.length === 0) {
          setShowWindow(false);
          setDeliveryId('');
        }
      } else {
        setShowWindow(false);
        setDeliveryId('');
      }
      loadChestData();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Não foi possível guardar no Baú.';
      showAlert('Erro', msg, 'error');
    } finally {
      setStoringInChest(false);
    }
  };

  const handleRetryWrong = async (wrongId: string) => {
    const textToSubmit = isCalculation ? 'Cálculo na imagem' : (answer.trim() || retryAnswer.trim());
    if (isCalculation ? !imageBase64 : !textToSubmit) {
      showAlert('Aviso', 'Forneça uma resposta antes de submeter.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      setRetryingId(wrongId);
      const res = await retryWrongAnswer(
        wrongId,
        textToSubmit,
        imageBase64 || undefined,
        selectedArtifact?.id
      );
      setRetryAnswer('');
      setAnswer('');
      setEliminatedOption(null);
      setHammerSteps(null);
      setOracleHint(null);
      setScribeKeywords([]);
      setHelpRequested(false);
      setHelpResponse(null);
      setStudentDoubt(null);
      setSelectedArtifact(null);
      setImage(null);
      setImageBase64(null);
      setIsRaidQuest(false);
      if (wrongId) {
        clearArtifactHintsCache(wrongId);
      }

      if (res.isCorrect || res.status === 'success') {
        sounds.playSuccess?.() || sounds.playSelect();
        setFeedback({ status: 'CORRECT', message: res.feedback || 'Incrível! Você acertou e recuperou o seu mana!' });
        showAlert(
          'ALMA PURIFICADA',
          `Incrível! Você acertou e recuperou o seu mana (+100 XP adicionados)! A penalidade foi limpa.`,
          'success'
        );
        loadChestData();
        
        const oldXp = user?.xp || 0;
        const newXp = oldXp + 100;
        setUser((prev: any) => ({ ...prev, xp: newXp }));
        checkAndTriggerRankUp(oldXp, newXp);

        loadInitialData();
      } else {
        sounds.playError();
        setFeedback({ status: 'WRONG', message: res.feedback || 'A resposta continua incorreta!', youtubeLink: res.youtubeLink, cooldownUntil: res.cooldownUntil });
        showAlert(
          'PENALIDADE CONTINUA',
          'A resposta continua incorreta! A penalidade de erros foi aplicada e a missão foi enviada de volta para o Baú!',
          'error'
        );
        loadChestData();
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Erro ao processar tentativa.';
      showAlert('Erro', msg, 'error');
    } finally {
      setRetryingId(null);
      setSubmitting(false);
    }
  };
  const getBaseXpForNivel = (nivel: string) => {
    const upperNivel = nivel?.toUpperCase();
    if (upperNivel === 'BOSS') return 500;
    if (upperNivel === 'MINIBOSS') return 300;
    if (upperNivel === 'DIFICIL') return 200;
    if (upperNivel === 'MEDIO') return 150;
    return 100; // default para FACIL
  };

  const selectBossToFight = (boss: any) => {
    setDeliveryId(boss.deliveryId);
    setQuestion(boss.question);
    const baseXp = getBaseXpForNivel(boss.nivel);
    setBaseQuestXp(baseXp);
    setQuestXp(boss.xp);
    setQuestNivel(boss.nivel);
    setFromQueue(false);
    setQuestErros(boss.erros ?? 0);
    setIsCalculation(boss.rawEnunciado?.includes('CALCULO') || false);
    setFeedback(null);
    setAnswer('');
    setIsFromChest(false);
    setSelectedArtifact(null);
    setShowUseBag(false);
    setQuestExpiresAt(boss.expiresAt || null);
    
    setShowMultiBossSelection(false);
    setShowWindow(true);
  };

  const setupAndOpenQuestFromChest = (targetItem: any, updatedExpiresAt?: Date, resetAttempts = false) => {
    setDeliveryId(targetItem.id);
    setQuestion(targetItem.quest?.enunciado);
    const baseXp = targetItem.quest?.xp || getBaseXpForNivel(targetItem.quest?.nivel || 'FACIL');
    setBaseQuestXp(baseXp);
    
    const attempts = resetAttempts ? 0 : (targetItem.tentativas || 0);
    const xpRestante = targetItem.quest?.nivel === 'BOSS' || targetItem.quest?.nivel === 'MINIBOSS'
      ? baseXp
      : Math.max(Math.round(baseXp * Math.pow(0.75, attempts)), 25);
    setQuestXp(xpRestante);
    setQuestNivel(targetItem.quest?.nivel || 'FACIL');
    setQuestErros(attempts);
    setIsCalculation(targetItem.quest?.tags?.includes('CALCULO') || false);
    setIsFromChest(true);
    setAnswer('');
    setFeedback(null);
    setSelectedArtifact(null);
    setShowUseBag(false);
    setHelpRequested(targetItem.delivery?.helpRequested || false);
    setHelpResponse(targetItem.delivery?.helpResponse || null);
    setStudentDoubt(targetItem.delivery?.studentDoubt || null);
    setQuestExpiresAt(updatedExpiresAt || targetItem.delivery?.expiresAt || targetItem.quest?.expiresAt || null);
    setQuestCooldownUntil(targetItem.delivery?.cooldownUntil || targetItem.cooldownUntil || null);
    
    // Carrega ajudas persistidas se existirem no delivery
    setEliminatedOption(targetItem.delivery?.eliminatedOption || null);
    
    let parsedSteps = null;
    if (targetItem.delivery?.hammerStepsRaw) {
      try {
        parsedSteps = JSON.parse(targetItem.delivery.hammerStepsRaw);
      } catch (e) {
        console.warn('Erro ao decodificar hammerStepsRaw', e);
      }
    }
    setHammerSteps(parsedSteps);

    setOracleHint(targetItem.delivery?.oracleHint || null);

    let parsedKeywords = [];
    if (targetItem.delivery?.scribeKeywordsRaw) {
      try {
        parsedKeywords = JSON.parse(targetItem.delivery.scribeKeywordsRaw);
      } catch (e) {
        console.warn('Erro ao decodificar scribeKeywordsRaw', e);
      }
    }
    setScribeKeywords(parsedKeywords);
    setUsedHelpers([]);

    if (targetItem.id) {
      loadArtifactHintsFromCache(targetItem.id);
    }
    
    setShowWindow(true);
  };

  const handleOpenBaúQuest = (item: any) => {
    const expiresAt = item.delivery?.expiresAt || item.quest?.expiresAt;
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

    if (isExpired) {
      const hasFenix = bagInventory.some((x: any) => x.id === 'lagrima_fenix');
      const hasRelogio = bagInventory.some((x: any) => x.id === 'relogio_tempo');

      if (!hasFenix && !hasRelogio) {
        showAlert(
          'Portal Selado',
          'Esta missão expirou no baú. Você precisa de uma Lágrima da Fênix ou de um Relógio do Tempo no inventário para reativá-la.',
          'warning'
        );
        return;
      }

      const options: any[] = [];
      if (hasFenix) {
        options.push({
          text: '💧 LÁGRIMA DA FÊNIX',
          onPress: async () => {
            try {
              setLoadingBaú(true);
              const res = await useHelperArtifact(item.id, 'lagrima_fenix');
              await consumeItemLocally('lagrima_fenix');
              sounds.playSuccess?.() || sounds.playSelect();
              showAlert(
                'Masmorra Reaberta!',
                res.message || 'Lágrima da Fênix utilizada! A missão foi purificada e reativada por 24 horas.',
                'success'
              );
              await loadChestData();

              const newExpiresAt = res.expiresAt ? new Date(res.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
              setupAndOpenQuestFromChest(item, newExpiresAt, true);
            } catch (err: any) {
              const msg = err?.response?.data?.error || err?.message || 'Erro ao aplicar artefato.';
              showAlert('Erro', msg, 'error');
            } finally {
              setLoadingBaú(false);
            }
          }
        });
      }
      if (hasRelogio) {
        options.push({
          text: '🕰️ RELÓGIO DO TEMPO',
          onPress: async () => {
            try {
              setLoadingBaú(true);
              const res = await useHelperArtifact(item.id, 'relogio_tempo');
              await consumeItemLocally('relogio_tempo');
              sounds.playSuccess?.() || sounds.playSelect();
              showAlert(
                'Tempo Distorcido!',
                res.message || 'Relógio do Tempo utilizado! O prazo da missão foi estendido por 24 horas.',
                'success'
              );
              await loadChestData();

              const newExpiresAt = res.expiresAt ? new Date(res.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
              setupAndOpenQuestFromChest(item, newExpiresAt, false);
            } catch (err: any) {
              const msg = err?.response?.data?.error || err?.message || 'Erro ao aplicar artefato.';
              showAlert('Erro', msg, 'error');
            } finally {
              setLoadingBaú(false);
            }
          }
        });
      }
      options.push({
        text: 'FECHAR',
        style: 'cancel'
      });

      showAlert(
        'Missão Expirada',
        'Esta missão do Baú está expirada e selada. Escolha um artefato para reativá-la:',
        'warning',
        undefined,
        options
      );
      return;
    }

    setupAndOpenQuestFromChest(item);
  };

  const handleHealWrong = async (wrongId: string) => {
    try {
      setRetryingId(wrongId);
      await healWrongAnswer(wrongId);
      sounds.playSuccess?.() || sounds.playSelect();
      showAlert('ALMA PURIFICADA', 'Você usou Becker Conceitual! Penalidade limpa da alma (+100 XP)!', 'success');
      loadChestData();

      const oldXp = user?.xp || 0;
      const newXp = oldXp + 100;
      setUser((prev: any) => ({ ...prev, xp: newXp }));
      checkAndTriggerRankUp(oldXp, newXp);

      loadInitialData();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Erro ao purificar.';
      showAlert('Erro', msg, 'error');
    } finally {
      setRetryingId(null);
    }
  };

  const handleUseArtifactFromBag = async (artifact: any) => {
    const questHelpers = [
      'relogio_tempo',
      'pocao_cura',
      'elixir_dourado',
      'escudo_arcano',
      'bracelete_cristal',
      'sapatilhas_veloz',
      'martelo_magico',
      'poeira_estelar',
      'pergaminho_oraculo',
      'pena_escriba',
      'varinha_pinheiro',
      'lagrima_fenix'
    ];

    if (questHelpers.includes(artifact.id)) {
      const isChestItem = artifact.id === 'relogio_tempo' || artifact.id === 'lagrima_fenix';
      const detailMsg = isChestItem 
        ? ` ou selecionando uma missão expirada diretamente no seu Baú para reativá-la!`
        : `!`;
      showAlert('Uso Mágico!', `O artefato [${artifact.name}] só pode ser ativado a partir de dentro de uma missão aberta${detailMsg}`, 'warning');
      return;
    }

    if (artifact.type === 'wisdom_whisper' || artifact.id === 'sussurros_sabios') {
      setShowBag(false);
      setShowUseBag(false);
      setStudentDoubtText('');
      setShowDoubtModal(true);
      return;
    }

    // Para todos os outros itens, vamos disparar a belíssima animação de queima/glow!
    setShowBag(false);
    setShowUseBag(false);
    setBurnArtifact(artifact);
    setShowBurnModal(true);
  };

  const handleVaporizePress = (item: any) => {
    sounds.playSelect();
    setBurnArtifact(item);
    setShowBurnModal(true);
  };

  const handleConfirmVaporization = async () => {
    if (!burnArtifact) return;
    try {
      setSubmitting(true);
      sounds.playSelect();

      const artId = burnArtifact.id;

      // 1. MÃO DE MIDAS
      if (artId === 'mao_midas') {
        const items = bagInventory.filter((x: any) => x.id !== 'mao_midas');
        if (items.length === 0) {
          showAlert('Mão de Midas', 'Você não possui outros itens na bolsa para transmutar!', 'warning');
          setShowBurnModal(false);
          setBurnArtifact(null);
          return;
        }

        const itemAlvo = items[Math.floor(Math.random() * items.length)];
        const sorte = Math.random() < 0.70;
        
        setShowBurnModal(false);
        setBurnArtifact(null);

        let newEpic: any = null;
        if (sorte) {
          const epics = [
            { id: 'elixir_dourado', name: 'Elixir Dourado', type: 'epic', description: 'Duplica o XP da próxima missão respondida corretamente.' },
            { id: 'pocao_cura', name: 'Poção de Cura', type: 'epic', description: 'Restaura a perda de XP de questões acumuladas no baú.' },
            { id: 'relogio_tempo', name: 'Relógio Ganha Tempo', type: 'epic', description: 'Estende o prazo de expiração de uma missão ativa por mais 24 horas.' }
          ];
          newEpic = epics[Math.floor(Math.random() * epics.length)];
          setBagInventory((prev) => {
            const temp = prev.filter((x) => x.id !== itemAlvo.id && x.id !== 'mao_midas');
            return [...temp, newEpic];
          });
          sounds.playSuccess?.() || sounds.playSelect();
          showAlert('Transmutação Concluída!', `Sua Mão de Midas converteu com sucesso o seu [${itemAlvo.name}] em um poderoso [${newEpic.name}] de classe Épica!`, 'success');
        } else {
          setBagInventory((prev) => prev.filter((x) => x.id !== itemAlvo.id && x.id !== 'mao_midas'));
          if (user) {
            const oldXp = user.xp;
            const newXp = oldXp + 50;
            setUser({ ...user, xp: newXp });
            checkAndTriggerRankUp(oldXp, newXp);
          }
          sounds.playError?.() || sounds.playSelect();
          showAlert('Midas Falhou!', `Seu [${itemAlvo.name}] desintegrou-se na tentativa de transmutação, mas você obteve 50 XP de consolação!`, 'warning');
        }
        
        await transmuteArtifact(itemAlvo.id, sorte, newEpic?.id);
        
        loadInitialData();
        return;
      }

      // 2. OUTROS ITENS DE CONSUMO DIRETO DO BAÚ / BOLSA
      const directIds = [
        'becker_alquimista',
        'olhar_monarca',
        'anel_serpente',
        'bolsa_sorte',
        'bandeira_guerra',
        'orbe_perspicacia',
        'chave_mestra',
        'cetro_exilio',
        'chapeu_arcanista'
      ];

      if (directIds.includes(artId)) {
        // Remove optimisticamente antes das chamadas async — bolsa mostra correto se reaberta
        setBagInventory((prev: any[]) => {
          const idx = prev.findIndex((x: any) => x.id === artId);
          if (idx === -1) return prev;
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        });

        const res = await consumeDirectArtifact(artId);
        await consumeItemLocally(artId);
        
        setShowBurnModal(false);
        setBurnArtifact(null);
        sounds.playSuccess?.() || sounds.playSelect();

        // Se for Becker, acrescentar XP localmente também para feedback instantâneo
        if (artId === 'becker_alquimista' && user) {
          const oldXp = user.xp;
          const newXp = oldXp + 500;
          setUser((prev: any) => ({ ...prev, xp: newXp }));
          checkAndTriggerRankUp(oldXp, newXp);
        }

        // Se for Cetro do Exílio, acrescentar XP localmente também para feedback instantâneo
        if (artId === 'cetro_exilio' && user) {
          const oldXp = user.xp;
          const newXp = oldXp + 100;
          setUser((prev: any) => ({ ...prev, xp: newXp }));
          checkAndTriggerRankUp(oldXp, newXp);
        }

        showAlert('Artefato Ativado!', res.message || 'Consumido com sucesso!', 'success');

        if (artId === 'bandeira_guerra' || artId === 'chave_mestra' || artId === 'cetro_exilio') {
          loadPartyData();
        }
        loadInitialData();
        return;
      }

      // 3. SE FOR QUALQUER OUTRO ITEM (Queima genérica de Becker/XP)
      setBagInventory((prev: any[]) => {
        const idx = prev.findIndex((x: any) => x.id === artId);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      });

      await consumeBecker(artId);
      await consumeItemLocally(artId);
      setShowBurnModal(false);
      setBurnArtifact(null);
      sounds.playSuccess?.() || sounds.playSelect();
      
      if (user) {
        const oldXp = user.xp;
        const newXp = oldXp + 500;
        setUser((prev: any) => ({ ...prev, xp: newXp }));
        checkAndTriggerRankUp(oldXp, newXp);
      }

      showAlert('CINZAS DE ALQUIMIA', `O item [${burnArtifact.name}] foi vaporizado com sucesso em +500 XP!`, 'success');
      loadInitialData();

    } catch (err: any) {
      setShowBurnModal(false);
      setBurnArtifact(null);
      const msg = err?.response?.data?.error || err?.message || 'Erro ao consumir artefato.';
      showAlert('Erro', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseHelperArtifact = async (artifact: any) => {
    if (!artifact) return;

    const isSharedRaidQuest = activeParty && activeParty.raidModeActive && activeParty.activeQuestDeliveryId === deliveryId;

    if (usedHelpers.includes(artifact.id)) {
      showAlert('Uso Duplicado!', `O artefato [${artifact.name}] já foi ativado nesta missão! Você não pode usar o mesmo artefato duas vezes no mesmo desafio.`, 'warning');
      setBurnArtifact(null);
      setShowBurnModal(false);
      return;
    }

    // 1. ESCUDO ARCANO ou BRACELETE DE CRISTAL
    if (artifact.id === 'escudo_arcano' || artifact.id === 'bracelete_cristal') {
      if (!isSharedRaidQuest) {
        setSelectedArtifact(artifact);
        consumeItemLocally(artifact.id);
        if (deliveryId) useHelperArtifact(deliveryId, artifact.id).catch(console.error);
        else consumeDirectArtifact(artifact.id).catch(console.error);
        setUsedHelpers((prev) => [...prev, artifact.id]);
        setPendingArtifact(null);
        setBurnArtifact(null);
        setShowBurnModal(false);
        sounds.playSuccess?.() || sounds.playSelect();
        showAlert('Artefato Ativo!', 'O artefato irá absorver a penalidade de XP caso você erre a resposta.', 'success');
        return;
      }
    }

    // 2. ELIXIR DOURADO
    if (artifact.id === 'elixir_dourado') {
      if (!isSharedRaidQuest) {
        setSelectedArtifact(artifact);
        consumeItemLocally(artifact.id);
        if (deliveryId) useHelperArtifact(deliveryId, artifact.id).catch(console.error);
        else consumeDirectArtifact(artifact.id).catch(console.error);
        setUsedHelpers((prev) => [...prev, artifact.id]);
        setPendingArtifact(null);
        setBurnArtifact(null);
        setShowBurnModal(false);
        sounds.playSuccess?.() || sounds.playSelect();
        showAlert('Elixir Dourado Ativo!', 'Seu XP ganho nesta missão será DOBRADO ao acertar!', 'success');
        return;
      }
    }

    // 2.7. POÇÃO DE CURA
    if (artifact.id === 'pocao_cura') {
      try {
        setSubmitting(true);
        await healWrongAnswer(deliveryId);
        consumeItemLocally('pocao_cura');
        setUsedHelpers((prev) => [...prev, 'pocao_cura']);
        setPendingArtifact(null);
        setBurnArtifact(null);
        setShowBurnModal(false);
        sounds.playSuccess?.() || sounds.playSelect();
        showAlert('Cura Concluída!', 'A integridade da missão foi restaurada para 100%! As penalidades de erros foram expurgadas.', 'success');
        
        // Sincroniza visualmente a quest aberta em tempo real!
        setQuestErros(0);
        setQuestXp(baseQuestXp);
        
        loadChestData();
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Falha na comunicação com o servidor.';
        showAlert('Erro da Poção', `Falha ao usar Poção de Cura: ${msg}`, 'error');
        setPendingArtifact(null);
        setBurnArtifact(null);
        setShowBurnModal(false);
      } finally {
        setSubmitting(false);
      }
      return;
    }



    // 2.5. BECKER DO ALQUIMISTA (XP Flat)
    if (artifact.id === 'becker_alquimista') {
      try {
        setSubmitting(true);
        await consumeBecker();
        if (user) {
          setUser({ ...user, xp: user.xp + 500 });
        }
        consumeItemLocally('becker_alquimista');
        setPendingArtifact(null);
        setBurnArtifact(null);
        setShowBurnModal(false);
        sounds.playSuccess?.() || sounds.playSelect();
        showAlert('Alquimia Concluída!', 'Você ganhou +500 XP flat instantaneamente!', 'success');
        loadInitialData();
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Falha na comunicação com o servidor.';
        showAlert('Erro do Becker', `Falha ao transmutar XP: ${msg}`, 'error');
        setPendingArtifact(null);
        setBurnArtifact(null);
        setShowBurnModal(false);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2.6. MÃO DE MIDAS (Transmuta item)
    if (artifact.id === 'mao_midas') {
      const itemsAlvos = bagInventory.filter((x) => x.type === 'magic' && x.id !== 'mao_midas');
      if (itemsAlvos.length === 0) {
        showAlert('Mão de Midas', 'Você não tem outros itens mágicos em seu inventário para transmutar!', 'warning');
        setPendingArtifact(null);
        setBurnArtifact(null);
        setShowBurnModal(false);
        return;
      }
      
      const itemAlvo = itemsAlvos[0];
      try {
        setSubmitting(true);
        sounds.playSelect();
        const chance = Math.random() < 0.5;
        if (chance) {
          const epics = [
            { id: 'elixir_dourado', name: 'Elixir Dourado', type: 'epic', description: 'Duplica o XP da próxima missão respondida corretamente.' },
            { id: 'pocao_cura', name: 'Poção de Cura', type: 'epic', description: 'Restaura a perda de XP de questões acumuladas no baú.' },
            { id: 'relogio_tempo', name: 'Relógio Ganha Tempo', type: 'epic', description: 'Estende o prazo de expiração de uma missão active por mais 24 horas.' }
          ];
          const newEpic = epics[Math.floor(Math.random() * epics.length)];
          setBagInventory((prev) => {
            const temp = prev.filter((x) => x.id !== itemAlvo.id && x.id !== 'mao_midas');
            return [...temp, newEpic];
          });
          showAlert('Transmutação Concluída!', `Sua Mão de Midas converteu com sucesso o seu [${itemAlvo.name}] em um poderoso [${newEpic.name}] de classe Épica!`, 'success');
        } else {
          setBagInventory((prev) => prev.filter((x) => x.id !== itemAlvo.id && x.id !== 'mao_midas'));
          if (user) {
            setUser({ ...user, xp: user.xp + 50 });
          }
          showAlert('Midas Falhou!', `Seu [${itemAlvo.name}] desintegrou-se na tentativa de transmutação, mas você obteve 50 XP de consolação!`, 'warning');
        }
      } catch (err: any) {
        showAlert('Erro', 'Falha ao utilizar Mão de Midas.', 'error');
      } finally {
        setSubmitting(false);
        setPendingArtifact(null);
        setBurnArtifact(null);
        setShowBurnModal(false);
      }
      return;
    }

    if (artifact.id === 'poeira_estelar') {
      const hasOptions = /(?:^|\n)\s*([A-E])[\.\)\-]\s+/i.test(question);
      if (!hasOptions) {
        showAlert('Poeira Estelar', 'A Poeira Estelar só pode ser usada em missões de Múltipla Escolha.', 'warning');
        setBurnArtifact(null);
        setShowBurnModal(false);
        return;
      }
    }

    // Fecha o modal de queima imediatamente para dar fluidez e feedback visual instantâneo!
    setShowBurnModal(false);
    setBurnArtifact(null);
    setPendingArtifact(null);

    try {
      setSubmitting(true);
      const isSussurros = artifact.id === 'sussurros_sabios';
      const res = await useHelperArtifact(
        deliveryId, 
        artifact.id, 
        isSussurros ? studentDoubtText.trim() : undefined
      );
      consumeItemLocally(artifact.id);
      setUsedHelpers((prev) => [...prev, artifact.id]);
      sounds.playSuccess?.() || sounds.playSelect();

      if (isSussurros) {
        setStudentDoubtText('');
        showAlert(
          'SUSSURRO ENVIADO',
          'Seu Sussurro Sábio foi enviado ao Mestre. Aguarde a dica conceitual.',
          'success'
        );
      } else if (artifact.id === 'martelo_magico') {
        const rawSteps = res?.steps;
        const sanitizedSteps = Array.isArray(rawSteps)
          ? rawSteps.map(s => String(s))
          : typeof rawSteps === 'string'
            ? [rawSteps]
            : [];
        setHammerSteps(sanitizedSteps);
        saveArtifactHintToCache(deliveryId, 'martelo', sanitizedSteps);
        showAlert('Martelo Mágico!', 'O problema foi fragmentado em pequenos passos pedagógicos!', 'success');
      } else if (artifact.id === 'poeira_estelar') {
        const elim = res?.eliminate || 'C';
        setEliminatedOption(elim);
        saveArtifactHintToCache(deliveryId, 'poeira', elim);
        showAlert('Poeira Estelar!', `A alternativa [${elim}] foi eliminada como incorreta!`, 'success');
      } else if (artifact.id === 'pergaminho_oraculo') {
        const hintText = res && typeof res.hint === 'string' ? res.hint : 'Pense bem!';
        setOracleHint(hintText);
        saveArtifactHintToCache(deliveryId, 'oraculo', hintText);
        showAlert('Dica do Oráculo!', 'Uma dica enigmática conceitual foi concedida!', 'success');
      } else if (artifact.id === 'pena_escriba') {
        const rawKeywords = res?.keywords;
        const sanitizedKeywords = Array.isArray(rawKeywords)
          ? rawKeywords.map(k => String(k))
          : typeof rawKeywords === 'string'
            ? [rawKeywords]
            : [];
        setScribeKeywords(sanitizedKeywords);
        saveArtifactHintToCache(deliveryId, 'escriba', sanitizedKeywords);
        showAlert('Pena do Escriba!', `As palavras-chaves essenciais decodificadas são: ${sanitizedKeywords.join(', ')}`, 'success');
      } else if (artifact.id === 'sapatilhas_veloz') {
        setHintsObsolete(true);
        saveArtifactHintToCache(deliveryId, 'obsoleto', true);
        showAlert('Mundo Desacelerado! 👟', res?.message || 'A missão foi suavizada com sucesso!', 'success');
      } else if (artifact.id === 'relogio_tempo') {
        if (res && res.expiresAt) {
          setQuestExpiresAt(res.expiresAt);
        }
        showAlert('Tempo Distorcido! ⏰', res?.message || 'O prazo da missão foi estendido por 24 horas!', 'success');
      } else if (artifact.id === 'varinha_pinheiro') {
        showAlert('Transmutação Arcana! 🪄', res?.message || 'A missão de cálculo foi transmutada em múltipla escolha!', 'success');
      } else if (artifact.id === 'elixir_dourado') {
        showAlert('Elixir Dourado Ativo! 🏆', res?.message || 'Seu XP ganho nesta missão será DOBRADO ao acertar!', 'success');
      } else if (artifact.id === 'escudo_arcano' || artifact.id === 'bracelete_cristal') {
        showAlert('Artefato Ativo! 🛡️', res?.message || 'O artefato irá absorver a penalidade de XP caso você erre a resposta.', 'success');
      }

      if (res?.enunciado) {
        setQuestion(res.enunciado);
      }
      if (res?.nivel) {
        setQuestNivel(res.nivel);
      }
      if (artifact.id === 'varinha_pinheiro') {
        setIsCalculation(false);
      }

      if (isFromChest) {
        // No baú, só atualizamos silenciosamente sem re-abrir modais
        refreshQuestSilent();
      } else {
        // Na missão diária, atualiza silenciosamente sem fechar/reabrir o modal
        refreshQuestSilent();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao aplicar artefato.';
      showAlert('Erro', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const statusResult = await ImagePicker.getCameraPermissionsAsync();
      
      const requestAndLaunch = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted) {
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
          });

          if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            setImage(asset.uri);
            if (asset.base64) {
              setImageBase64(asset.base64);
            }
          }
        } else {
          showAlert('Permissão Negada', 'Não é possível tirar foto do raciocínio sem acesso à câmera.', 'warning');
        }
      };

      if (statusResult.granted) {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          setImage(asset.uri);
          if (asset.base64) {
            setImageBase64(asset.base64);
          }
        }
      } else {
        showAlert(
          'Acesso à Câmera',
          'O Sistema precisa de acesso à câmera para que você possa tirar foto do seu raciocínio matemático. Deseja permitir?',
          'info',
          undefined,
          [
            {
              text: 'Permitir',
              onPress: () => {
                requestAndLaunch();
              }
            },
            {
              text: 'Cancelar',
              onPress: () => {}
            }
          ]
        );
      }
    } catch (e) {
      console.warn('Erro ao abrir câmera:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    if (user?.acceptedTermsAt) {
      await Promise.all([
        loadCurrentQuest(),
        loadChestData(),
        loadPartyData(),
        fetchSubjectStats(),
      ]);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user?.id && user?.acceptedTermsAt) {
      loadCurrentQuest();
      loadChestData();
      loadPartyData();
      fetchSubjectStats();
    }
  }, [user?.id, user?.acceptedTermsAt]);

  const loadPartyDataRef = useRef(loadPartyData);
  const loadCurrentQuestRef = useRef(loadCurrentQuest);

  useEffect(() => {
    loadPartyDataRef.current = loadPartyData;
  }, [loadPartyData]);

  useEffect(() => {
    loadCurrentQuestRef.current = loadCurrentQuest;
  }, [loadCurrentQuest]);

  useEffect(() => {
    if (!activeParty?.id) return;

    const chatInterval = setInterval(() => {
      loadPartyDataRef.current();
      loadCurrentQuestRef.current();
    }, 5000);

    return () => clearInterval(chatInterval);
  }, [activeParty?.id]);

  const showShareModal = false;
  const setShowShareModal = async (val: boolean) => {
    if (!val) return;
    if (!activeParty || !activeParty.codigo) {
      showAlert('Aviso', 'Você não está em nenhuma Party ativa.', 'warning');
      return;
    }
    try {
      sounds.playSelect();
      const message = `⚔️ SOLEN RAID ⚔️\n\nJunte-se à minha guilda no Solen e vamos derrotar as missões juntos!\n\nCódigo da Party: ${activeParty.codigo}\n\nAbra o app e insira o código na aba Party!`;
      await Share.share({
        message,
        title: 'Compartilhar Party do Solen',
      });
    } catch (error) {
      console.warn('Erro ao compartilhar party:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleToggleRaidMode = async () => {
    try {
      setLoadingParty(true);
      const res = await toggleRaidMode();
      setActiveParty(res);
      sounds.playSelect();
      showAlert(
        'SISTEMA DE RAID', 
        res.raidModeActive 
          ? 'Modo Raid ATIVADO! As missões em andamento agora são compartilhadas.' 
          : 'Modo Raid Desativado.', 
        'success'
      );
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Não foi possível alterar o modo Raid.';
      showAlert('Erro', errorMsg, 'error');
    } finally {
      setLoadingParty(false);
    }
  };

  const handleShareQuestInRaid = async (sharedId: string) => {
    try {
      const res = await shareQuestInRaid(sharedId);
      setActiveParty(res);
      sounds.playSelect();
      showAlert('SISTEMA DE RAID', 'Missão compartilhada com sucesso na masmorra!', 'success');
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Não foi possível compartilhar a missão.';
      showAlert('Erro', errorMsg, 'error');
    }
  };

  const handleJoinRaidQuest = async (raidQuestDeliveryId: string) => {
    try {
      setSubmitting(true);
      const res = await api.get(`/quests/deliveries/${raidQuestDeliveryId}`);
      const q = res.data;

      setDeliveryId(q.deliveryId || '');
      setIsRaidQuest(true);
      setQuestion(q.question || '');
      setIsCalculation(q.tags?.includes('CALCULO') || q.tags?.includes('calculo') || false);
      setQuestXp(q.xp || 100);
      setQuestNivel(q.nivel || 'FACIL');
      setFromQueue(false);
      setQuestErros(q.erros || 0);

      if (q.expiresAt) {
        setQuestExpiresAt(q.expiresAt);
      } else {
        setQuestExpiresAt(null);
      }

      setHelpRequested(q.helpRequested || false);
      setHelpResponse(q.helpResponse || null);
      setStudentDoubt(q.studentDoubt || null);
      
      setEliminatedOption(null);
      setHammerSteps(null);
      setOracleHint(null);
      setScribeKeywords([]);
      setUsedHelpers(Array.isArray(q.usedHelpers) ? q.usedHelpers : []);
      setImage(null);
      setImageBase64(null);

      setIsFromChest(false);
      setShowWindow(true);
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Não foi possível entrar na batalha da Raid.';
      showAlert('Erro', errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Called when a player taps on a Mini Boss card in the selection screen.
   * Populates all quest state from the chosen boss and enters battle mode.
   */
  const handleSelectBoss = (boss: any) => {
    setShowMultiBossSelection(false);
    setActiveBosses(prev => prev.filter(b => b.deliveryId !== boss.deliveryId));
    setDeliveryId(boss.deliveryId || '');
    setQuestion(boss.question || boss.rawEnunciado || '');
    setQuestXp(boss.xp || 300);
    setQuestNivel('MINIBOSS');
    setQuestErros(boss.erros || 0);
    setHelpRequested(boss.helpRequested || false);
    setHelpResponse(boss.helpResponse || null);
    setEliminatedOption(boss.eliminatedOption || null);
    setHammerSteps(boss.hammerSteps || null);
    setOracleHint(boss.oracleHint || null);
    setScribeKeywords(boss.scribeKeywords || []);
    setStudentDoubt(boss.studentDoubt || null);
    setUsedHelpers(boss.usedHelpers || []);
    setFromQueue(false);
    setIsRaidQuest(false);
    setIsFromChest(false);
    if (boss.expiresAt) setQuestExpiresAt(boss.expiresAt);
    soundsRef.current.playMission?.();
  };

  return {
    user,
    setUser,
    image,
    setImage,
    imageBase64,
    setImageBase64,
    isCalculation,
    activeTab,
    setActiveTab,
    showTerms,
    termsLoading,
    showWindow,
    setShowWindow,
    deliveryId,
    setDeliveryId,
    question,
    questXp,
    baseQuestXp,
    questNivel,
    fromQueue,
    answer,
    setAnswer,
    submitting,
    waiting,
    feedback,
    setFeedback,
    isFromChest,
    refreshing,
    loadingRefresh,
    handleRefreshQuest,
    helpRequested,
    helpResponse,
    eliminatedOption,
    hammerSteps,
    oracleHint,
    scribeKeywords,
    hintsObsolete,
    questErros,
    storingInChest,
    showDoubtModal,
    setShowDoubtModal,
    studentDoubtText,
    setStudentDoubtText,
    studentDoubt,
    questExpiresAt,
    questCooldownUntil,
    timeRemainingText,
    activeBosses,
    setActiveBosses,
    showMultiBossSelection,
    setShowMultiBossSelection,
    handleSelectBoss,
    subjectStats,
    showFailedStats,
    setShowFailedStats,
    selectedSubjectToInvoke,
    setSelectedSubjectToInvoke,
    loadingSubjectStats,
    showRankUp,
    setShowRankUp,
    rankUpMessage,
    rankUpArtifact,
    rankUpScaleAnim,
    showBag,
    setShowBag,
    bagInventory,
    setBagInventory,
    selectedArtifact,
    setSelectedArtifact,
    showUseBag,
    setShowUseBag,
    burnArtifact,
    setBurnArtifact,
    showBurnModal,
    setShowBurnModal,
    pendingArtifact,
    setPendingArtifact,
    usedHelpers,
    setUsedHelpers,
    isRaidQuest,
    setIsRaidQuest,
    activeParty,
    partyCodeInput,
    setPartyCodeInput,
    loadingParty,
    showShareModal,
    setShowShareModal,
    chatMessages,
    chatInput,
    setChatInput,
    sendingMessage,
    showFloatingChat,
    setShowFloatingChat,
    unreadChatCount,
    unreadCalendarCount,
    unreadBagCount,
    showCalendar,
    setShowCalendar,
    playerTimetable,
    playerCalendarEvents,
    loadingPlayerAgenda,
    selectedDayEvents,
    setSelectedDayEvents,
    selectedDayNumber,
    setSelectedDayNumber,
    activeGoldenQuestion,
    goldenAnswerText,
    setGoldenAnswerText,
    submittingGolden,
    alertVisible,
    setAlertVisible,
    alertTitle,
    alertMessage,
    alertType,
    alertButtons,
    fadeAnim,
    slideAnim,
    scaleAnim,
    rotateAnim,
    translateXAnim,
    wrongAnswers,
    loadingBaú,
    retryAnswer,
    setRetryAnswer,
    retryingId,
    showAlert,
    fetchActiveGoldenQuestion,
    handleAnswerGoldenQuestion,
    handleTimerFinish,
    loadBagInventoryFromStorage,
    fetchPlayerAgenda,
    loadInitialData,
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
    handleSelectDay,
    fetchSubjectStats,
    handleCheckQuestChestStatus,
    loadCurrentQuest,
    loadChestData,
    loadPartyData,
    handleCreateParty,
    handleJoinParty,
    handleLeaveParty,
    handleSendChatMessage,
    handleDoubtSubmit,
    handleRequestQuest,
    handleSubmitQuest,
    handleStoreInChest,
    handleRetryWrong,
    handleHealWrong,
    handleUseArtifactFromBag,
    handleUseHelperArtifact,
    handleVaporizePress,
    handleConfirmVaporization,
    handlePickImage,
    onRefresh,
    handleLogout,
    handleToggleRaidMode,
    handleShareQuestInRaid,
    handleJoinRaidQuest,
    getBaseXpForNivel,
    selectBossToFight,
    handleOpenBaúQuest,
  };
}
