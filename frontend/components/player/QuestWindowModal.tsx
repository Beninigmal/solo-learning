import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, StyleSheet, Dimensions, Animated, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DoomFireParticles } from '../DoomFireParticles';
import { ArtifactCard } from '../ArtifactCard';
import { BossChallengeCard } from './BossChallengeCard';
import { CyberSubmitButton } from '../CyberSubmitButton';

interface QuestWindowModalProps {
  visible: boolean;
  onClose: () => void;
  questNivel: string;
  isFromChest: boolean;
  fromQueue: boolean;
  selectedArtifact: any | null;
  setSelectedArtifact: (art: any) => void;
  questXp: number;
  questErros: number;
  timeRemainingText: string;
  feedback: { status: string; message: string; youtubeLink?: string; cooldownUntil?: string } | null;
  hammerSteps: string[] | null;
  oracleHint: string | null;
  scribeKeywords: string[];
  studentDoubt: string | null;
  helpRequested: boolean;
  helpResponse: string | null;
  resetSystem: () => void;
  question: string;
  isCalculation: boolean;
  answer: string;
  setAnswer: (ans: string) => void;
  eliminatedOption: string | null;
  submitting: boolean;
  waiting: boolean;
  pickImage: () => void;
  image: string | null;
  setImage: (img: string | null) => void;
  setImageBase64: (base64: string | null) => void;
  pendingArtifact: any | null;
  setPendingArtifact: (art: any) => void;
  setBurnArtifact: (art: any) => void;
  setShowBurnModal: (show: boolean) => void;
  setShowUseBag: (show: boolean) => void;
  bagInventory: any[];
  handleAnswerSubmit: () => void;
  handleStoreInChest: (targetDeliveryId?: string) => void;
  storingInChest: boolean;
  sounds: any;
  activeParty: any | null;
  user: any;
  handleShareQuestInRaid?: (deliveryId: string) => void;
  deliveryId?: string;
  hintsObsolete?: boolean;
  handleRefreshQuest?: () => void;
  loadingRefresh?: boolean;
  chatMessages?: any[];
  chatInput?: string;
  setChatInput?: (text: string) => void;
  handleSendChatMessage?: () => void;
  sendingMessage?: boolean;
  questCooldownUntil?: string | Date | null;
  unreadChatCount?: number;
  showFloatingChat?: boolean;
  setShowFloatingChat?: (show: boolean) => void;
  usedHelpers?: string[];
  isRaidQuest?: boolean;
  // Mini Boss multi-selection
  activeBosses?: any[];
  showMultiBossSelection?: boolean;
  onSelectBoss?: (boss: any) => void;
}

const parseOptions = (text: string) => {
  if (!text) return null;
  
  const optionRegex = /(?:\r?\n)+(?:[A-Ea-e][\.\)\-]\s+)/;
  if (!optionRegex.test(text)) {
    return null;
  }
  
  const parts = text.split(/(?=\r?\n(?:[A-Ea-e][\.\)\-]\s+))/);
  const questionPart = parts[0].trim();
  const optionsParts = parts.slice(1).map(p => p.trim());
  
  if (optionsParts.length < 2) return null;
  
  const parsedOptions = optionsParts.map(opt => {
    const match = opt.match(/^([A-Ea-e])[\.\)\-]\s+(.*)$/s);
    if (match) {
      return {
        key: match[1].toUpperCase(),
        text: match[2].trim(),
        fullText: opt
      };
    }
    return {
      key: opt.charAt(0).toUpperCase(),
      text: opt.substring(2).trim(),
      fullText: opt
    };
  });
  
  return {
    question: questionPart,
    options: parsedOptions
  };
};

const getUserStatusColor = (lastActiveAtStr?: string) => {
  if (!lastActiveAtStr) return 'bg-red-500';
  const lastActive = new Date(lastActiveAtStr).getTime();
  const now = Date.now();
  const diff = now - lastActive;

  if (diff < 15000) {
    return 'bg-green-500';
  } else if (diff < 60000) {
    return 'bg-[#e6ad12]'; // Mustard yellow
  } else {
    return 'bg-red-500';
  }
};

const HammerStepsView = ({ steps, hintsObsolete }: { steps: string[] | null; hintsObsolete?: boolean }) => {
  if (!steps || steps.length === 0) return null;
  return (
    <View className={`w-full bg-[#071329] border border-[#00f3ff]/40 p-3 rounded-sm mb-4 ${hintsObsolete ? 'opacity-40' : ''}`}>
      <View className="flex-row items-center gap-2 mb-2 pb-1 border-b border-[#00f3ff]/20">
        <Feather name="tool" size={12} color="#00f3ff" />
        <Text className="text-neonBlue text-[9px] md:text-[11px] font-mono font-bold uppercase tracking-wider text-left">🔨 Raciocínio (Martelo Mágico)</Text>
      </View>
      {hintsObsolete && (
        <View className="bg-red-500/20 border border-red-500/40 px-2 py-1 rounded-sm mb-2 flex-row items-center gap-1.5 w-full">
          <Feather name="alert-triangle" size={10} color="#ef4444" />
          <Text className="text-red-400 text-[8px] font-mono font-bold uppercase tracking-wider">⚠️ DICA OBSOLETA (QUESTÃO SIMPLIFICADA)</Text>
        </View>
      )}
      {steps.map((step, idx) => (
        <Text key={idx} className="text-white/90 text-[11px] md:text-[13px] leading-5 md:leading-6 mb-1 text-left">
          <Text className="text-neonBlue font-mono font-bold">{idx + 1}.</Text> {step}
        </Text>
      ))}
    </View>
  );
};

const OracleHintView = ({ hint, hintsObsolete }: { hint: string | null; hintsObsolete?: boolean }) => {
  if (!hint) return null;
  return (
    <View className={`w-full bg-[#160729] border border-[#a349ff]/40 p-3 rounded-sm mb-4 ${hintsObsolete ? 'opacity-40' : ''}`}>
      <View className="flex-row items-center gap-2 mb-2 pb-1 border-b border-[#a349ff]/20">
        <Feather name="eye" size={12} color="#a349ff" />
        <Text className="text-[#a349ff] text-[9px] md:text-[11px] font-mono font-bold uppercase tracking-wider text-left">🔮 Visão do Oráculo</Text>
      </View>
      {hintsObsolete && (
        <View className="bg-red-500/20 border border-red-500/40 px-2 py-1 rounded-sm mb-2 flex-row items-center gap-1.5 w-full">
          <Feather name="alert-triangle" size={10} color="#ef4444" />
          <Text className="text-red-400 text-[8px] font-mono font-bold uppercase tracking-wider">⚠️ DICA OBSOLETA (QUESTÃO SIMPLIFICADA)</Text>
        </View>
      )}
      <Text className="text-white/95 text-[11px] md:text-[13px] leading-5 md:leading-6 italic text-left">
        "{hint}"
      </Text>
    </View>
  );
};

const ScribeKeywordsView = ({ keywords, isFeedback, hintsObsolete }: { keywords: string[] | null; isFeedback?: boolean; hintsObsolete?: boolean }) => {
  if (!keywords || keywords.length === 0) return null;
  return (
    <View className={`w-full bg-[#0a1128] border border-[#3b82f6]/40 p-3 rounded-sm ${isFeedback ? 'mb-3' : 'mb-4'} ${hintsObsolete ? 'opacity-40' : ''}`}>
      <View className="flex-row items-center gap-2 mb-2 pb-1 border-b border-[#3b82f6]/20">
        <Feather name="edit-3" size={12} color="#3b82f6" />
        <Text className="text-[#3b82f6] text-[9px] md:text-[11px] font-mono font-bold uppercase tracking-wider text-left">✒️ Palavras do Escriba</Text>
      </View>
      {hintsObsolete && (
        <View className="bg-red-500/20 border border-red-500/40 px-2 py-1 rounded-sm mb-2 flex-row items-center gap-1.5 w-full">
          <Feather name="alert-triangle" size={10} color="#ef4444" />
          <Text className="text-red-400 text-[8px] font-mono font-bold uppercase tracking-wider">⚠️ DICA OBSOLETA (QUESTÃO SIMPLIFICADA)</Text>
        </View>
      )}
      <Text className="text-white/80 text-[11px] md:text-[13px] leading-5 md:leading-6 italic text-left">O validador espera encontrar as seguintes palavras-chave:</Text>
      <View className="flex-row flex-wrap gap-2 mt-2">
        {keywords.map((kw, idx) => (
          <View key={idx} className="bg-[#3b82f6]/20 border border-[#3b82f6]/50 px-2 py-1 rounded-sm">
            <Text className="text-[#3b82f6] text-[10px] md:text-[12px] font-bold">{kw}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const MasterDialogueView = ({ studentDoubt, helpRequested, helpResponse, hintsObsolete }: { studentDoubt: string | null; helpRequested: boolean; helpResponse: string | null; hintsObsolete?: boolean }) => {
  if (!studentDoubt && !helpRequested) return null;
  return (
    <View className={`w-full bg-[#071329] border border-yellow-500/40 p-3 rounded-sm mb-4 ${hintsObsolete ? 'opacity-40' : ''}`}>
      <View className="flex-row items-center gap-2 mb-2 pb-1 border-b border-yellow-500/20">
        <Feather name="message-square" size={12} color="#eab308" />
        <Text className="text-yellow-500 text-[9px] md:text-[11px] font-mono font-bold uppercase tracking-wider text-left">💬 DIÁLOGO COM O O MESTRE</Text>
      </View>
      {hintsObsolete && (
        <View className="bg-red-500/20 border border-red-500/40 px-2 py-1 rounded-sm mb-2 flex-row items-center gap-1.5 w-full">
          <Feather name="alert-triangle" size={10} color="#ef4444" />
          <Text className="text-red-400 text-[8px] font-mono font-bold uppercase tracking-wider">⚠️ DICA OBSOLETA (QUESTÃO SIMPLIFICADA)</Text>
        </View>
      )}
      
      <View className="mb-2 text-left">
        <Text className="text-yellow-500/60 text-[9px] md:text-[11px] font-mono font-bold uppercase text-left">PLAYER (Sua Dúvida):</Text>
        <Text className="text-white/90 text-xs md:text-sm font-serif leading-5 mt-0.5 text-left">{studentDoubt || "Solicitou uma dica conceitual sobre a questão."}</Text>
      </View>

      {helpResponse ? (
        <View className="mt-2 pt-2 border-t border-yellow-500/10 text-left">
          <Text className="text-green-400 text-[9px] md:text-[11px] font-mono font-bold uppercase text-left">MESTRE (Resposta):</Text>
          <Text className="text-white/90 text-xs md:text-sm font-serif leading-5 mt-0.5 text-left">{helpResponse}</Text>
          <View className="flex-row items-center gap-1 mt-2 bg-yellow-500/10 px-2 py-0.5 rounded-sm border border-yellow-500/20 w-fit">
            <Feather name="gift" size={10} color="#ffca28" style={{ marginRight: 2 }} />
            <Text className="text-[#ffca28] text-[8px] font-mono font-bold uppercase">Bônus: +50% XP Ativo!</Text>
          </View>
        </View>
      ) : (
        <View className="mt-2 pt-2 border-t border-yellow-500/10 flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#eab308" />
          <Text className="text-white/40 text-[10px] italic text-left">Aguardando resposta do Mestre...</Text>
        </View>
      )}
    </View>
  );
};

const FeedbackMasterDialogueView = ({ studentDoubt, helpRequested, helpResponse, hintsObsolete }: { studentDoubt: string | null; helpRequested: boolean; helpResponse: string | null; hintsObsolete?: boolean }) => {
  if (!studentDoubt && !helpRequested) return null;
  return (
    <View className={`w-full bg-[#071329] border border-yellow-500/40 p-3 rounded-sm ${hintsObsolete ? 'opacity-40' : ''}`}>
      <View className="flex-row items-center gap-2 mb-2 pb-1 border-b border-yellow-500/20">
        <Feather name="message-square" size={12} color="#eab308" />
        <Text className="text-yellow-500 text-[9px] md:text-[11px] font-mono font-bold uppercase tracking-wider text-left">💬 DIÁLOGO COM O MESTRE</Text>
      </View>
      {hintsObsolete && (
        <View className="bg-red-500/20 border border-red-500/40 px-2 py-1 rounded-sm mb-2 flex-row items-center gap-1.5 w-full">
          <Feather name="alert-triangle" size={10} color="#ef4444" />
          <Text className="text-red-400 text-[8px] font-mono font-bold uppercase tracking-wider">⚠️ DICA OBSOLETA (QUESTÃO SIMPLIFICADA)</Text>
        </View>
      )}
      
      <View className="mb-2 text-left">
        <Text className="text-yellow-500/60 text-[9px] md:text-[11px] font-mono font-bold uppercase text-left">PLAYER (Sua Dúvida):</Text>
        <Text className="text-white/90 text-xs md:text-sm font-serif leading-5 mt-0.5 text-left">{studentDoubt || "Solicitou uma dica conceitual sobre a questão."}</Text>
      </View>

      {helpResponse && (
        <View className="mt-2 pt-2 border-t border-yellow-500/10 text-left">
          <Text className="text-green-400 text-[9px] md:text-[11px] font-mono font-bold uppercase text-left">MESTRE (Resposta):</Text>
          <Text className="text-white/90 text-xs md:text-sm font-serif leading-5 mt-0.5 text-left">{helpResponse}</Text>
        </View>
      )}
    </View>
  );
};

const CalculationUploaderView = ({
  isCalculation,
  pickImage,
  image,
  setImage,
  setImageBase64,
  submitting,
  waiting,
  isMyTurnToRespond = true
}: {
  isCalculation: boolean;
  pickImage: () => void;
  image: string | null;
  setImage: (img: string | null) => void;
  setImageBase64: (base64: string | null) => void;
  submitting: boolean;
  waiting: boolean;
  isMyTurnToRespond?: boolean;
}) => {
  if (!isCalculation) return null;
  return (
    <>
      <TouchableOpacity 
        className="w-full bg-black/50 border border-neonBlue/30 py-3 rounded-sm items-center justify-center flex-row mb-4"
        onPress={pickImage}
        disabled={submitting || waiting || !isMyTurnToRespond}
      >
        <Feather name="camera" size={16} color="#00f3ff" style={{ marginRight: 8 }} />
        <Text className="text-neonBlue/80 font-bold text-sm uppercase tracking-wider">
          {image ? 'Alterar Foto' : 'Tirar Foto do Raciocínio'}
        </Text>
      </TouchableOpacity>

      {image && (
        <View className="mb-4 items-center">
          <Text className="text-white/50 text-xs mb-2">Imagem anexada:</Text>
          <Image source={{ uri: image }} style={{ width: 100, height: 100, borderRadius: 4 }} />
          {isMyTurnToRespond && (
            <TouchableOpacity onPress={() => { setImage(null); setImageBase64(null); }}>
              <Text className="text-red-500 text-xs mt-1">Remover</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
};

const HELPER_INFO: Record<string, { name: string; type: string; icon: string }> = {
  sussurros_sabios: { name: 'Sussurros Sábios', type: 'rare', icon: 'message-square' },
  martelo_magico: { name: 'Martelo Mágico', type: 'rare', icon: 'tool' },
  poeira_estelar: { name: 'Poeira Estelar', type: 'rare', icon: 'wind' },
  pergaminho_oraculo: { name: 'Pergaminho do Oráculo', type: 'rare', icon: 'file-text' },
  pena_escriba: { name: 'Pena do Escriba', type: 'rare', icon: 'edit-3' },
  sapatilhas_veloz: { name: 'Sapatilhas do Veloz', type: 'epic', icon: 'zap' },
  relogio_tempo: { name: 'Relógio Ganha Tempo', type: 'epic', icon: 'clock' },
  varinha_pinheiro: { name: 'Varinha de Pinheiro', type: 'epic', icon: 'wand' },
  elixir_dourado: { name: 'Elixir Dourado', type: 'epic', icon: 'droplet' },
  escudo_arcano: { name: 'Escudo Arcano', type: 'epic', icon: 'shield' },
  bracelete_cristal: { name: 'Bracelete de Cristal', type: 'magic', icon: 'shield' },
};

const ActiveArtifactSelectorView = ({
  selectedArtifact,
  submitting,
  waiting,
  bagInventory,
  sounds,
  setSelectedArtifact,
  setShowUseBag,
  usedHelpers = []
}: {
  selectedArtifact: any | null;
  submitting: boolean;
  waiting: boolean;
  bagInventory: any[];
  sounds: any;
  setSelectedArtifact: (art: any) => void;
  setShowUseBag: (show: boolean) => void;
  usedHelpers?: string[];
}) => {
  return (
    <View className="w-full mb-4 items-center">
      {usedHelpers.length > 0 && (
        <View className="w-full mb-3 gap-2">
          <Text className="text-neonBlue/60 text-[10px] font-bold uppercase tracking-wider text-left">
            Artefatos Ativos
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {usedHelpers.map((hId) => {
              const info = HELPER_INFO[hId] || { name: hId, type: 'rare', icon: 'help-circle' };
              const color = info.type === 'epic' ? '#eab308' : '#38bdf8';
              const bg = info.type === 'epic' ? 'bg-yellow-950/35 border-yellow-800/40' : 'bg-sky-950/35 border-sky-800/40';
              const textCol = info.type === 'epic' ? 'text-yellow-400' : 'text-sky-400';
              return (
                <View 
                  key={hId}
                  className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-sm border ${bg}`}
                >
                  <Feather name={info.icon as any} size={11} color={color} />
                  <Text className={`font-mono text-[10px] font-bold uppercase ${textCol}`}>
                    {info.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {selectedArtifact ? (
        <View className="w-full bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-sm flex-row justify-between items-center animate-pulse">
          <View className="flex-row items-center gap-2">
            <Feather name={selectedArtifact.type === 'epic' ? 'star' : 'hexagon'} size={16} color="#eab308" />
            <View>
              <Text className="text-yellow-500 text-[10px] font-bold uppercase tracking-widest text-left">Artefato Ativo</Text>
              <Text className="text-white font-bold text-xs text-left">{selectedArtifact.name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => { sounds.playSelect(); setSelectedArtifact(null); }} className="bg-white/10 px-2 py-1 rounded-sm">
            <Text className="text-red-400 text-[10px] font-bold uppercase">Remover</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          onPress={() => { sounds.playSelect(); setShowUseBag(true); }}
          disabled={submitting || waiting}
          className="w-full bg-black/50 border border-neonBlue/30 py-2.5 rounded-sm items-center justify-center flex-row"
        >
          <Feather name="briefcase" size={14} color="#00f3ff" style={{ marginRight: 8 }} />
          <Text className="text-neonBlue/80 font-bold text-xs uppercase tracking-widest">
            Aplicar Artefato ({bagInventory.length} disponíveis)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export function QuestWindowModal({
  visible,
  onClose,
  questNivel,
  isFromChest,
  fromQueue,
  selectedArtifact,
  setSelectedArtifact,
  questXp,
  questErros,
  timeRemainingText,
  feedback,
  hammerSteps,
  oracleHint,
  scribeKeywords,
  studentDoubt,
  helpRequested,
  helpResponse,
  resetSystem,
  question,
  isCalculation,
  answer,
  setAnswer,
  eliminatedOption,
  submitting,
  waiting,
  pickImage,
  image,
  setImage,
  setImageBase64,
  pendingArtifact,
  setPendingArtifact,
  setBurnArtifact,
  setShowBurnModal,
  setShowUseBag,
  bagInventory,
  handleAnswerSubmit,
  handleStoreInChest,
  storingInChest,
  sounds,
  activeParty,
  user,
  handleShareQuestInRaid,
  deliveryId,
  hintsObsolete,
  handleRefreshQuest,
  loadingRefresh,
  chatMessages = [],
  chatInput = '',
  setChatInput,
  handleSendChatMessage,
  sendingMessage = false,
  unreadChatCount = 0,
  showFloatingChat = false,
  setShowFloatingChat,
  usedHelpers = [],
  isRaidQuest = false,
  activeBosses = [],
  showMultiBossSelection = false,
  onSelectBoss,
  questCooldownUntil
}: QuestWindowModalProps) {
  const isWarBannerActive = activeParty?.bandeiraGuerraActive &&
    activeParty?.bandeiraGuerraExpires &&
    new Date(activeParty.bandeiraGuerraExpires) > new Date();

  const isSerpentRingActive = (user?.anelSerpenteExpires &&
    new Date(user.anelSerpenteExpires) > new Date()) ||
    (activeParty?.participantes && activeParty.participantes.some((p: any) =>
      p.user?.anelSerpenteExpires && new Date(p.user.anelSerpenteExpires) > new Date()
    ));

  const isLuckBagActive = (user?.bolsaSorteExpires &&
    new Date(user.bolsaSorteExpires) > new Date()) ||
    (activeParty?.participantes && activeParty.participantes.some((p: any) =>
      p.user?.bolsaSorteExpires && new Date(p.user.bolsaSorteExpires) > new Date()
    ));

  const serpentRingOwner = (user?.anelSerpenteExpires && new Date(user.anelSerpenteExpires) > new Date())
    ? 'Você'
    : activeParty?.participantes?.find((p: any) => p.user?.anelSerpenteExpires && new Date(p.user.anelSerpenteExpires) > new Date())?.user?.nickname || 'Aliado';

  const luckBagOwner = (user?.bolsaSorteExpires && new Date(user.bolsaSorteExpires) > new Date())
    ? 'Você'
    : activeParty?.participantes?.find((p: any) => p.user?.bolsaSorteExpires && new Date(p.user.bolsaSorteExpires) > new Date())?.user?.nickname || 'Aliado';

  const isSharedRaidQuest = activeParty && activeParty.raidModeActive && (activeParty.activeQuestDeliveryId === deliveryId || isRaidQuest);
  const currentResponder = activeParty?.participantes?.find((p: any) => p.userId === activeParty.currentResponderId || p.user?.id === activeParty.currentResponderId);
  const currentResponderNickname = (currentResponder?.user?.nickname?.trim() || currentResponder?.user?.nome?.trim() || 'outro jogador');
  const isMyTurnToRespond = !isSharedRaidQuest || !activeParty.currentResponderId || activeParty.currentResponderId.toString().trim().toLowerCase() === user?.id?.toString().trim().toLowerCase();
  const hasElixirDourado = selectedArtifact?.id === 'elixir_dourado' || usedHelpers?.includes('elixir_dourado');
  const hasEscudoArcano = selectedArtifact?.id === 'escudo_arcano' || selectedArtifact?.id === 'bracelete_cristal' || usedHelpers?.some((h: string) => h.startsWith('escudo_arcano') || h.startsWith('bracelete_cristal'));
  const isSuccessFeedback = feedback?.status === 'success' || feedback?.status === 'CORRECT';

  // ── COMBAT ANIMATION STATE ────────────────────────────────────────────────
  const [battleState, setBattleState] = useState<'idle' | 'taking_damage' | 'attacking_player' | null>(null);

  useEffect(() => {
    if (feedback && (questNivel === 'BOSS' || questNivel === 'MINIBOSS')) {
      const isCorrect = feedback.status === 'success' || feedback.status === 'CORRECT';
      setBattleState(isCorrect ? 'taking_damage' : 'attacking_player');
      const timer = setTimeout(() => {
        setBattleState(null);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setBattleState(null);
    }
  }, [feedback, questNivel]);

  const [cooldownRemaining, setCooldownRemaining] = useState<string>('');
  
  useEffect(() => {
    if (!questCooldownUntil) {
      setCooldownRemaining('');
      return;
    }
    
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(questCooldownUntil);
      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCooldownRemaining('');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCooldownRemaining(`Bloqueado por ${mins}m ${secs}s`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [questCooldownUntil, visible]);

  const extractBossName = (q: string) => {
    const match = q.match(/O inimigo (.*?) surgiu!/);
    return match ? match[1] : (questNivel === 'BOSS' ? 'Desconhecido' : 'Mini Boss');
  };

  const isShowBattle = battleState !== null && (questNivel === 'BOSS' || questNivel === 'MINIBOSS');
  const mockBoss = activeBosses?.[0] || {
    monsterName: extractBossName(question || ''),
    subjectName: 'Desafio Épico',
    xp: questXp,
    question: question || 'Desafio em andamento...'
  };

  // ── FLIP-CARD REVEAL STATE ─────────────────────────────────────────────────
  // When a boss card is tapped from the selection grid, we show a dramatic
  // "reveal" screen with a 3D flip animation before entering the actual fight.
  const [revealingBoss, setRevealingBoss] = useState<any | null>(null);
  
  // For General Bosses or Single Minibosses, we also want the reveal screen
  const [hasRevealedSingleBoss, setHasRevealedSingleBoss] = useState(false);
  
  useEffect(() => {
    if (visible) {
      setHasRevealedSingleBoss(false);
      if (questNivel === 'BOSS' || questNivel === 'MINIBOSS') {
        sounds.playBossArena?.();
      }
    } else {
      sounds.stopBossArena?.();
    }
  }, [visible]);

  const showSingleBossReveal = (questNivel === 'BOSS' || (questNivel === 'MINIBOSS' && !showMultiBossSelection)) && !hasRevealedSingleBoss;

  const handleBossCardTap = (boss: any) => {
    setRevealingBoss(boss);
  };

  const handleStartBattle = () => {
    if (revealingBoss && onSelectBoss) {
      onSelectBoss(revealingBoss);
      setRevealingBoss(null);
    } else if (showSingleBossReveal) {
      setHasRevealedSingleBoss(true);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-center items-center p-6 relative">
        {questNivel === 'BOSS' && <DoomFireParticles />}

        {/* ── MINI BOSS SELECTION / REVEAL SCREEN ─────────────────────────── */}
        {(showMultiBossSelection && activeBosses.length > 0) || showSingleBossReveal ? (
          <View
            style={{
              width: '100%',
              maxWidth: 620,
              backgroundColor: '#0d0905',
              borderRadius: 2,
              borderWidth: 2,
              borderColor: questNivel === 'BOSS' ? '#ff0055' : '#ff9f00',
              shadowColor: questNivel === 'BOSS' ? '#ff0055' : '#ff9f00',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.85,
              shadowRadius: 22,
              elevation: 15,
              maxHeight: '92%',
              overflow: 'hidden'
            }}
          >
            {revealingBoss || showSingleBossReveal ? (
              <BossChallengeCard 
                 boss={revealingBoss || mockBoss} 
                 onStartBattle={handleStartBattle} 
                 onBack={() => {
                   if (showSingleBossReveal) {
                     onClose();
                   } else {
                     setRevealingBoss(null);
                   }
                 }} 
              />
            ) : (
              /* ── BOSS SELECTION GRID ── */
              <ScrollView
                style={{ width: '100%' }}
                contentContainerStyle={{ padding: 24, alignItems: 'center' }}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ borderBottomWidth: 1, borderColor: 'rgba(255,159,0,0.3)', width: '100%', paddingBottom: 12, marginBottom: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#ff9f00', fontSize: 22, fontWeight: 'bold', letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center' }}>
                    ⚔ Mini Bosses Invocados!
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 6, textAlign: 'center', letterSpacing: 1 }}>
                    Escolha qual inimigo enfrentar primeiro
                  </Text>
                </View>

                {activeBosses.map((boss, idx) => (
                  <View
                    key={boss.deliveryId || idx}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255, 100, 0, 0.08)',
                      borderWidth: 1.5,
                      borderColor: 'rgba(255,140,0,0.5)',
                      borderRadius: 2,
                      padding: 16,
                      marginBottom: 16,
                      shadowColor: '#ff7700',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 6
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(255,80,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.6)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Text style={{ fontSize: 18 }}>🔥</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#ff9f00', fontSize: 14, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
                          {boss.monsterName}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {boss.subjectName}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: 'rgba(255,140,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.4)', borderRadius: 2, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: '#ffaa00', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' }}>+{boss.xp} XP</Text>
                      </View>
                    </View>
                    <View style={{ height: 1, backgroundColor: 'rgba(255,140,0,0.2)', marginBottom: 10 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <TouchableOpacity
                        onPress={() => handleStoreInChest(boss.deliveryId)}
                        activeOpacity={0.7}
                        disabled={storingInChest}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', borderRadius: 2 }}
                      >
                        {storingInChest ? (
                          <ActivityIndicator size="small" color="#eab308" />
                        ) : (
                          <>
                            <Feather name="archive" size={12} color="#eab308" />
                            <Text style={{ color: '#eab308', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>Guardar no Baú</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleBossCardTap(boss)}
                        activeOpacity={0.7}
                        disabled={storingInChest}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,159,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,159,0,0.4)', borderRadius: 2 }}
                      >
                        <Feather name="zap" size={12} color="#ff9f00" />
                        <Text style={{ color: '#ff9f00', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase' }}>Revelar Desafio</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                  Você pode enfrentar os outros inimigos depois
                </Text>
              </ScrollView>
            )}
          </View>
        ) : (
        <View 
          className={`w-full ${questNivel === 'BOSS' ? 'bg-[#0a1128]/80' : questNivel === 'MINIBOSS' ? 'bg-[#0d0905]/95' : 'bg-[#0a1128]/95'} rounded-sm border-2 ${isWarBannerActive ? 'border-purple-600' : questNivel === 'BOSS' ? 'border-red-600' : questNivel === 'MINIBOSS' ? 'border-[#ff9f00]' : 'border-neonBlue'} relative overflow-hidden`}
          style={{
            shadowColor: isWarBannerActive ? "#a855f7" : questNivel === 'BOSS' ? "#ff0055" : questNivel === 'MINIBOSS' ? "#ff9f00" : "#00f3ff",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
            elevation: 15,
            maxHeight: '92%',
            maxWidth: 768
          }}
        >
          <ScrollView 
            style={{ width: '100%' }} 
            contentContainerStyle={{ padding: 24, alignItems: 'center' }} 
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <View className={`border-b ${questNivel === 'MINIBOSS' ? 'border-[#ff9f00]/30' : 'border-neonBlue/30'} w-full pb-3 mb-6 items-center relative z-10`}>
              {handleRefreshQuest && (
                <TouchableOpacity 
                  onPress={() => { handleRefreshQuest(); sounds.playSelect?.(); }} 
                  disabled={loadingRefresh}
                  className="absolute left-0 top-0 p-1"
                >
                  {loadingRefresh ? (
                    <ActivityIndicator size="small" color={questNivel === 'MINIBOSS' ? '#ff9f00' : '#00f3ff'} />
                  ) : (
                    <Feather name="refresh-cw" size={18} color={questNivel === 'MINIBOSS' ? '#ff9f00' : '#00f3ff'} />
                  )}
                </TouchableOpacity>
              )}
              {isFromChest && (
                <TouchableOpacity 
                  onPress={() => { onClose(); resetSystem(); sounds.playSelect(); }} 
                  className="absolute right-0 top-0 p-1"
                >
                  <Feather name="x" size={20} color={questNivel === 'MINIBOSS' ? '#ff9f00' : '#00f3ff'} />
                </TouchableOpacity>
              )}
              <Text className={`text-xl md:text-2xl font-bold uppercase tracking-[0.3em] ${ questNivel === 'BOSS' ? 'text-red-500' : questNivel === 'MINIBOSS' ? 'text-[#ff9f00]' : isFromChest ? 'text-red-400' : fromQueue ? 'text-yellow-400' : 'text-neonBlue'}`}>
                {questNivel === 'BOSS' ? 'Desafio BOSS' : questNivel === 'MINIBOSS' ? 'Desafio Mini Boss' : isFromChest ? 'Missão do Baú' : fromQueue ? 'Missão Retomada' : 'Missão Diária'}
              </Text>
              <View className="flex-row items-center justify-center flex-wrap gap-2 mt-2 w-full px-2">
                <Text
                  className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                    questNivel === 'FACIL'     ? 'bg-green-500/20 text-green-400' :
                    questNivel === 'MEDIO'     ? 'bg-yellow-500/20 text-yellow-400' :
                    questNivel === 'MINIBOSS'  ? 'bg-[#ff5500]/20 text-[#ffaa00] border border-[#ff5500]/30' :
                    questNivel === 'BOSS'      ? 'bg-red-600/20 text-red-500' :
                                                'bg-red-500/20 text-red-400'
                  }`}
                >
                  {questNivel === 'FACIL' ? 'Nível Fácil' : questNivel === 'MEDIO' ? 'Nível Médio' : questNivel === 'MINIBOSS' ? 'Mini Boss' : questNivel === 'BOSS' ? 'Nível BOSS' : 'Nível Difícil'}
                </Text>
                <Text className={`text-xs md:text-sm font-mono ${hasElixirDourado ? 'text-yellow-400 font-bold' : questNivel === 'MINIBOSS' ? 'text-[#ffaa00]' : 'text-neonBlue/50'}`}>
                  +{hasElixirDourado ? questXp * 2 : questXp} XP {hasElixirDourado && '🏆'}
                </Text>
                {questErros > 0 && (
                  hasEscudoArcano ? (
                    <View className="flex-row items-center gap-1 bg-green-900/30 px-2 py-0.5 rounded-sm border border-green-800/50">
                      <Feather name="shield" size={10} color="#22c55e" />
                      <Text className="text-green-400 text-[10px] font-bold uppercase">Penalidade Anulada</Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-1 bg-red-900/30 px-2 py-0.5 rounded-sm border border-red-800/50">
                      <Feather name="alert-triangle" size={10} color="#ef4444" />
                      <Text className="text-red-500 text-[10px] font-bold uppercase">Penalidade x{questErros}</Text>
                    </View>
                  )
                )}
                {timeRemainingText !== '' && (
                  <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-sm border ${timeRemainingText === 'EXPIRADA' ? 'bg-red-500/10 border-red-500/30' : 'bg-neonBlue/10 border-neonBlue/30'}`}>
                    <Feather name="clock" size={10} color={timeRemainingText === 'EXPIRADA' ? '#ef4444' : '#00f3ff'} />
                    <Text className={`text-[10px] font-bold font-mono ${timeRemainingText === 'EXPIRADA' ? 'text-red-400' : 'text-neonBlue'}`}>{timeRemainingText}</Text>
                  </View>
                )}
              </View>
            </View>

            {isShowBattle ? (
              <View className="w-full items-center py-4 relative z-10" style={{ minHeight: 400 }}>
                <BossChallengeCard boss={mockBoss} battleState={battleState} />
              </View>
            ) : feedback ? (
              <View className="w-full items-center py-4 relative z-10">
                <Text 
                  className={`text-2xl font-bold mb-4 uppercase ${isSuccessFeedback ? 'text-green-400' : 'text-red-500'}`}
                  style={{
                    textShadowColor: isSuccessFeedback ? '#4ade80' : '#ef4444',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 10
                  }}
                >
                  {isSuccessFeedback ? 'Missão Concluída' : 'Falha na Missão'}
                </Text>
                <Text className="text-white text-base text-center mb-6 font-serif leading-6">
                  {feedback.message}
                </Text>

                {feedback.youtubeLink && (
                  <View className="w-full bg-red-950/40 border border-red-500/30 p-3 rounded-sm mb-4">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Feather name="youtube" size={14} color="#ef4444" />
                      <Text className="text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider">REVISÃO NECESSÁRIA</Text>
                    </View>
                    <Text className="text-white/80 text-[11px] mb-2 leading-5 text-left">
                      Foi detectada uma lacuna em seu conhecimento. Assista a este vídeo para recuperar seu foco:
                    </Text>
                    <TouchableOpacity onPress={() => Linking.openURL(feedback.youtubeLink!)}>
                      <Text className="text-neonBlue text-[10px] underline text-left">
                        {feedback.youtubeLink}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {feedback.cooldownUntil && (
                  <View className="w-full bg-red-900/30 p-3 rounded-sm border border-red-500/50 mb-6">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Feather name="clock" size={14} color="#ef4444" />
                      <Text className="text-red-400 text-[10px] font-bold font-mono uppercase">PENALIDADE DE COOLDOWN</Text>
                    </View>
                    <Text className="text-white/80 text-[11px] text-left">
                      Novas missões desta matéria estão bloqueadas até {new Date(feedback.cooldownUntil).toLocaleTimeString()}.
                    </Text>
                  </View>
                )}

                {/* --- PERSISTÊNCIA VISUAL DE DICAS DE ARTEFATOS NO FEEDBACK --- */}
                {((hammerSteps && hammerSteps.length > 0) || oracleHint || (scribeKeywords && scribeKeywords.length > 0) || studentDoubt || helpRequested) && (
                  <View className="w-full mb-6 max-h-48 overflow-hidden">
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      <HammerStepsView steps={hammerSteps} hintsObsolete={hintsObsolete} />
                      <OracleHintView hint={oracleHint} hintsObsolete={hintsObsolete} />
                      <ScribeKeywordsView keywords={scribeKeywords} isFeedback={true} hintsObsolete={hintsObsolete} />
                      <FeedbackMasterDialogueView studentDoubt={studentDoubt} helpRequested={helpRequested} helpResponse={helpResponse} hintsObsolete={hintsObsolete} />
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity 
                  className="bg-neonBlue/20 border border-neonBlue px-8 py-3 rounded-sm" 
                  onPress={() => {
                    resetSystem();
                    onClose();
                  }}
                >
                  <Text className="text-neonBlue font-bold uppercase tracking-wider">Confirmar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="w-full items-center relative z-10">
                {(() => {
                  const parsed = parseOptions(question);
                  return (
                    <>
                      <ScrollView style={{ width: '100%' }} className="max-h-[200px] md:max-h-[450px] mb-4" showsVerticalScrollIndicator={true}>
                        <Text className="text-white text-base md:text-lg lg:text-xl text-center font-serif leading-7 md:leading-8 lg:leading-9">
                          {parsed ? parsed.question : question}
                        </Text>
                      </ScrollView>

                      {/* --- ARTEFATOS UTILITÁRIOS: CONTEÚDO VISUAL EXTRA --- */}
                      <HammerStepsView steps={hammerSteps} hintsObsolete={hintsObsolete} />
                      <OracleHintView hint={oracleHint} hintsObsolete={hintsObsolete} />
                      <ScribeKeywordsView keywords={scribeKeywords} hintsObsolete={hintsObsolete} />
                      <MasterDialogueView studentDoubt={studentDoubt} helpRequested={helpRequested} helpResponse={helpResponse} hintsObsolete={hintsObsolete} />

                      {/* --- INPUTS --- */}
                      {isCalculation ? null : parsed ? (
                        /* Modo Múltipla Escolha (Radio Buttons) */
                        <View className="w-full gap-2.5 mb-4">
                          {parsed.options.map((option) => {
                            const isSelected = answer === option.key;
                            const isEliminated = eliminatedOption === option.key;
                            
                            return (
                              <TouchableOpacity
                                key={option.key}
                                disabled={submitting || waiting || isEliminated || !isMyTurnToRespond}
                                onPress={() => {
                                  sounds.playSelect();
                                  setAnswer(option.key);
                                }}
                                className={`w-full flex-row items-center p-3 rounded-sm border ${
                                  isSelected
                                    ? 'border-neonBlue bg-neonBlue/10'
                                    : 'border-white/10 bg-black/40'
                                }`}
                                style={isEliminated ? { borderColor: 'rgba(153, 27, 27, 0.2)', backgroundColor: 'rgba(153, 27, 27, 0.05)', opacity: 0.3 } : undefined}
                              >
                                <View 
                                  className={`w-4.5 h-4.5 rounded-full border items-center justify-center mr-3 ${
                                    isSelected
                                      ? 'border-neonBlue bg-neonBlue/20'
                                      : 'border-white/30 bg-black/50'
                                  }`}
                                  style={isEliminated ? { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(127, 29, 29, 0.1)' } : undefined}
                                >
                                  {isEliminated ? (
                                    <Feather name="x" size={9} color="#ef4444" />
                                  ) : isSelected ? (
                                    <View className="w-2.2 h-2.2 rounded-full bg-neonBlue" />
                                  ) : null}
                                </View>
                                <View className="flex-1">
                                  <Text 
                                    className={`text-xs md:text-sm lg:text-base font-mono font-bold text-left ${
                                      isSelected
                                        ? 'text-neonBlue'
                                        : 'text-white/40'
                                    }`}
                                    style={isEliminated ? { color: 'rgba(239, 68, 68, 0.5)', textDecorationLine: 'line-through' } : undefined}
                                  >
                                    {option.key}) <Text 
                                      className={`${isSelected ? 'text-white font-bold' : 'text-white/80 font-normal'}`}
                                      style={isEliminated ? { color: 'rgba(255, 255, 255, 0.2)', textDecorationLine: 'line-through', fontWeight: 'normal' } : undefined}
                                    >
                                      {option.text}
                                    </Text>
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        /* Modo Livre Escrita */
                        <TextInput 
                          className="w-full bg-black/50 border border-neonBlue/50 text-white p-3 rounded-sm mb-4 text-xs md:text-sm font-mono"
                          style={{ minHeight: 80, textAlignVertical: 'top' }}
                          placeholder="Sua resposta..."
                          placeholderTextColor="#00f3ff40"
                          value={answer}
                          onChangeText={setAnswer}
                          editable={!submitting && !waiting && isMyTurnToRespond}
                          multiline={true}
                          numberOfLines={4}
                        />
                      )}
                    </>
                  );
                })()}

                <CalculationUploaderView
                  isCalculation={isCalculation}
                  pickImage={pickImage}
                  image={image}
                  setImage={setImage}
                  setImageBase64={setImageBase64}
                  submitting={submitting}
                  waiting={waiting}
                  isMyTurnToRespond={isMyTurnToRespond}
                />
 
                {/* Aplicar Artefato UI */}
                <ActiveArtifactSelectorView
                  selectedArtifact={selectedArtifact}
                  submitting={submitting}
                  waiting={waiting}
                  bagInventory={bagInventory}
                  sounds={sounds}
                  setSelectedArtifact={setSelectedArtifact}
                  setShowUseBag={setShowUseBag}
                  usedHelpers={usedHelpers}
                />

                {isSharedRaidQuest && !isMyTurnToRespond ? (
                  <View className="w-full bg-[#160729] border border-[#a349ff]/40 p-3.5 rounded-sm mb-4 items-center justify-center flex-row gap-2">
                    <Feather name="clock" size={14} color="#a349ff" />
                    <Text className="text-[#a349ff] text-xs font-mono font-bold uppercase tracking-wider text-center">
                      Aguardando resposta de: {currentResponderNickname}
                    </Text>
                  </View>
                ) : cooldownRemaining ? (
                  <View className="w-full bg-red-950/40 border border-red-500/50 p-3.5 rounded-sm mb-3 items-center justify-center flex-row gap-2">
                    <Feather name="lock" size={14} color="#ef4444" />
                    <Text className="text-red-400 text-xs font-mono font-bold uppercase tracking-wider text-center">
                      {cooldownRemaining}
                    </Text>
                  </View>
                ) : (
                  <CyberSubmitButton
                    title="Responder"
                    loadingTitle="Enviando..."
                    loading={submitting}
                    onPress={handleAnswerSubmit}
                    disabled={waiting || (isCalculation ? !image : !answer.trim())}
                    className="mb-3"
                  />
                )}

                {!isFromChest && (!isSharedRaidQuest || isMyTurnToRespond) && (
                  <TouchableOpacity 
                    className="w-full bg-yellow-900/20 border border-yellow-800/50 py-3 rounded-sm items-center justify-center flex-row mb-3"
                    onPress={() => handleStoreInChest()}
                    disabled={submitting || storingInChest}
                  >
                    {storingInChest ? (
                      <ActivityIndicator size="small" color="#eab308" />
                    ) : (
                      <>
                        <Feather name="archive" size={14} color="#eab308" style={{ marginRight: 8 }} />
                        <Text className="text-yellow-500/80 font-bold text-sm uppercase tracking-widest">Guardar no Baú</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Botão de Compartilhar Quest na Raid */}
                {activeParty && activeParty.raidModeActive && (activeParty.participantes && activeParty.participantes[0]?.userId === user?.id) && deliveryId && (
                  activeParty.activeQuestDeliveryId === deliveryId ? (
                    <View className="w-full bg-green-950/20 border border-green-800/50 py-3 rounded-sm items-center justify-center flex-row mb-3">
                      <Feather name="shield" size={14} color="#22c55e" style={{ marginRight: 8 }} />
                      <Text className="text-green-400 font-bold text-xs uppercase tracking-widest font-mono">Missão ativa na Raid ⚔️</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      className="w-full bg-[#3b82f6]/20 border border-[#3b82f6] py-3 rounded-sm items-center justify-center flex-row mb-3"
                      onPress={() => { sounds.playSelect(); handleShareQuestInRaid?.(deliveryId); }}
                      disabled={submitting}
                    >
                      <Feather name="share-2" size={14} color="#3b82f6" style={{ marginRight: 8 }} />
                      <Text className="text-[#3b82f6] font-bold text-xs uppercase tracking-widest font-mono">Invocar na Raid ⚔️</Text>
                    </TouchableOpacity>
                  )
                )}

                {/* EFEITOS ATIVOS / BUFFS DA RAID E SOLO */}
                {(isWarBannerActive || isSerpentRingActive || isLuckBagActive) && (
                  <View className="w-full bg-black/40 border border-purple-500/20 p-3 rounded-sm mt-4">
                    <Text className="text-purple-400 text-[9px] font-bold uppercase tracking-widest font-mono mb-2">✨ Efeitos & Buffs Ativos</Text>
                    <View className="gap-2">
                      {isWarBannerActive && (
                        <View className="flex-row items-center gap-2 bg-purple-950/30 border border-purple-500/30 px-2.5 py-1.5 rounded-sm">
                          <Feather name="flag" size={12} color="#a855f7" />
                          <View className="flex-1 text-left">
                            <Text className="text-purple-300 text-[10px] font-bold text-left">Bandeira de Guerra (Party)</Text>
                            <Text className="text-white/40 text-[8px] font-mono text-left">+20% de ganho de XP em todas as missões</Text>
                          </View>
                        </View>
                      )}
                       {isSerpentRingActive && (
                        <View className="flex-row items-center gap-2 bg-blue-950/30 border border-blue-500/30 px-2.5 py-1.5 rounded-sm">
                          <Feather name="circle" size={12} color="#3b82f6" />
                          <View className="flex-1 text-left">
                            <Text className="text-blue-300 text-[10px] font-bold text-left">Anel da Serpente (Buff de Drop)</Text>
                            <Text className="text-white/40 text-[8px] font-mono text-left">+35% taxa de drop de artefatos em Mini Bosses (Ativo por: {serpentRingOwner})</Text>
                          </View>
                        </View>
                      )}
                      {isLuckBagActive && (
                        <View className="flex-row items-center gap-2 bg-green-950/30 border border-green-500/30 px-2.5 py-1.5 rounded-sm">
                          <Feather name="package" size={12} color="#22c55e" />
                          <View className="flex-1 text-left">
                            <Text className="text-green-300 text-[10px] font-bold text-left">Bolsa da Sorte (Sorte Extra)</Text>
                            <Text className="text-white/40 text-[8px] font-mono text-left">+15% taxa de drop de artefatos em comuns (Ativo por: {luckBagOwner})</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
        )}

        {/* Botão Flutuante e Caixa de Chat da Missão */}
        {activeParty && (
          <View className="absolute bottom-12 right-6 z-50 items-end">
            {showFloatingChat && (
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
                  <TouchableOpacity onPress={() => { sounds.playSelect(); setShowFloatingChat?.(false); }}>
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
                    {chatMessages.length === 0 ? (
                      <Text className="text-white/20 text-[9px] font-mono italic text-center mt-14">Sem transmissões no momento...</Text>
                    ) : (
                      chatMessages.map((m: any) => {
                        const isMe = m.userId === user?.id;
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
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Transmitir mensagem..."
                    placeholderTextColor="#00f3ff20"
                    className="flex-1 bg-black/40 border border-neonBlue/20 text-white px-2 py-1 rounded-sm text-[11px] font-mono"
                    onSubmitEditing={handleSendChatMessage}
                    editable={!sendingMessage}
                  />
                  <TouchableOpacity
                    onPress={handleSendChatMessage}
                    disabled={sendingMessage || !chatInput.trim()}
                    className={`px-3 bg-neonBlue/20 border border-neonBlue rounded-sm items-center justify-center ${(!chatInput.trim() || sendingMessage) ? 'opacity-40' : ''}`}
                    activeOpacity={0.7}
                  >
                    {sendingMessage ? (
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
              onPress={() => { sounds.playSelect(); setShowFloatingChat?.(!showFloatingChat); }}
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
              {unreadChatCount > 0 && !showFloatingChat && (
                <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center">
                  <Text className="text-white text-[8px] font-mono font-bold">{unreadChatCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

      </View>
    </Modal>
  );
}
