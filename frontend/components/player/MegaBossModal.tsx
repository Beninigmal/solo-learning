import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  TextInput
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getBossBacklog, lockBossQuest, submitBossQuest } from '../../services/api';
import { getBossImage } from '../../utils/getBossImage';
import { SystemAlert } from '../SystemAlert';
import { DoomFireParticles } from '../DoomFireParticles';

interface MegaBossModalProps {
  visible: boolean;
  onClose: () => void;
  activeBoss: any;
  userToken: string;
  activeParty: any;
  sounds: any;
  refreshUserData: () => void;
}

export const MegaBossModal: React.FC<MegaBossModalProps> = ({
  visible,
  onClose,
  activeBoss,
  userToken,
  activeParty,
  sounds,
  refreshUserData
}) => {
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [bossData, setBossData] = useState<any>(null);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);
  const [showFullBossCard, setShowFullBossCard] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [locking, setLocking] = useState(false);

  const [respostaTexto, setRespostaTexto] = useState('');
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);

  // Alerta Customizado Cybernetico
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'BOSS';
    buttons?: Array<{ text: string; onPress?: () => void }>;
  }>({ visible: false, title: '', message: '', type: 'info' });

  const showCustomAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' | 'BOSS' = 'info',
    buttons?: Array<{ text: string; onPress?: () => void }>
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const fetchBacklog = async () => {
    if (!activeBoss?.id) return;
    try {
      setLoadingQuests(true);
      const data = await getBossBacklog(activeBoss.id);
      if (data?.bossFight) {
        setBossData(data.bossFight);
        // Focar automaticamente na quest travada pela Party para todos os membros da guilda!
        if (data.activePartyQuest) {
          setSelectedQuest(data.activePartyQuest);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar backlog do Boss:', err);
    } finally {
      setLoadingQuests(false);
    }
  };

  useEffect(() => {
    if (visible) {
      sounds?.playBossArena?.();
      if (activeBoss) {
        fetchBacklog();
      }
    } else {
      sounds?.stopBossArena?.();
    }

    return () => {
      sounds?.stopBossArena?.();
    };
  }, [visible, activeBoss]);

  const handleTakePhoto = async () => {
    sounds.playSelect?.();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showCustomAlert('PERMISSÃO NECESSÁRIA', 'Precisamos de permissão para utilizar a câmera do dispositivo.', 'warning');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setImagemBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handlePickLibrary = async () => {
    sounds.playSelect?.();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showCustomAlert('PERMISSÃO NECESSÁRIA', 'Precisamos de acesso à galeria para enviar a foto do caderno.', 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setImagemBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleLockQuest = async (quest: any) => {
    if (!activeParty) {
      showCustomAlert(
        'PARTY EM RAID OBRIGATÓRIA!',
        'O Mega Boss exige a presença de uma Party ativa completa! Entre ou crie uma Party na aba PARTY para participar.',
        'BOSS'
      );
      return;
    }

    try {
      setLocking(true);
      sounds.playSelect?.();

      const data = await lockBossQuest(quest.id);
      setSelectedQuest(data.quest || quest);
      showCustomAlert('QUEST RESERVADA!', 'Sua Party assumiu o combate desta quest! Vocês têm 15 minutos de inatividade máxima.', 'BOSS');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Não foi possível reservar esta quest.';
      showCustomAlert('COMBATE INDISPONÍVEL', msg, 'error');
      fetchBacklog();
    } finally {
      setLocking(false);
    }
  };

  const handleSubmitQuest = async () => {
    if (!selectedQuest) return;

    if (
      (selectedQuest.tipoResposta === 'FOTO_MATEMATICA' || selectedQuest.tipoResposta === 'FOTO_REDACAO') &&
      !imagemBase64
    ) {
      showCustomAlert('FOTO OBRIGATÓRIA', 'Por favor, tire ou selecione a foto do caderno manuscrito para que a IA analise o raciocínio.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      sounds.playSelect?.();

      const data = await submitBossQuest(selectedQuest.id, {
        respostaTexto,
        imagemBase64: imagemBase64 || undefined
      });

      if (data.turnRotated) {
        showCustomAlert(
          '⚠️ TURNO PASSOU!',
          `Nota obtida: ${data.nota}% (Corte mínimo: 60%).\n\n${data.feedbackIA}\n\nA vez de responder passou para o seu aliado @${data.nextResponderNick}!`,
          'warning',
          [{ text: 'ENTENDIDO', onPress: () => { fetchBacklog(); } }]
        );
      } else if (data.wipe) {
        showCustomAlert(
          '💀 PARTY DIZIMADA!',
          `Nota obtida: ${data.nota}% (Corte mínimo: 60%).\n\n${data.feedbackIA}\n\nTodos os caçadores da guilda falharam nesta quest. Ela retornou ao backlog do Boss!`,
          'error',
          [{ text: 'ENTENDIDO', onPress: () => { setSelectedQuest(null); setImagemBase64(null); setRespostaTexto(''); fetchBacklog(); } }]
        );
      } else if (data.success) {
        sounds.playVictory?.();
        showCustomAlert(
          '⚔️ QUEST CONCLUÍDA!',
          `Parabéns Caçadores! Nota obtida: ${data.nota}%\n\n${data.feedbackIA}\n\nRecompensa: +${data.rewards?.xpGained || data.xpGanho || 150} XP concedido a toda a sua Party!`,
          'success',
          [{ text: 'EXCELENTE!', onPress: () => { setSelectedQuest(null); setImagemBase64(null); setRespostaTexto(''); fetchBacklog(); refreshUserData(); } }]
        );
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Falha ao avaliar resposta da quest.';
      showCustomAlert('ERRO NO COMBATE', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const bossName = bossData?.nomeBoss || activeBoss?.nomeBoss || 'MEGA BOSS';
  const bossImage = getBossImage(bossName);
  const currentHp = bossData?.currentHp ?? activeBoss?.currentHp ?? 300;
  const totalHp = bossData?.totalHp ?? activeBoss?.totalHp ?? 300;
  const hpPercent = Math.max(0, Math.min(100, (currentHp / totalHp) * 100));

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/95 p-4 justify-center items-center relative">
        {/* FOGO DE FUNDO (DOOM FIRE PARTICLES) PARA DAR TENSÃO */}
        <DoomFireParticles />

        <View className="w-full max-w-4xl bg-[#080d1a]/95 border-2 border-red-500/80 rounded-sm p-4 flex-1 my-4 relative z-10 shadow-2xl">
          
          {/* HEADER DO MEGA BOSS COM RETRATO ARTWORK DO MONSTRO D&D */}
          <View className="bg-black/80 border border-red-500/50 p-3 rounded-sm mb-4 relative overflow-hidden flex-row items-center gap-3">
            {/* Avatar Manhwa do Boss (CLICÁVEL PARA EXPANDIR) */}
            <TouchableOpacity
              onPress={() => {
                sounds?.playSelect?.();
                setShowFullBossCard(true);
              }}
              className="w-20 h-24 sm:w-24 sm:h-28 rounded-sm border-2 border-red-500 overflow-hidden relative justify-center items-center bg-black shadow-lg"
              activeOpacity={0.8}
            >
              <Image
                source={bossImage}
                className="w-full h-full"
                resizeMode="contain"
                style={{ objectFit: 'contain', objectPosition: 'center top' } as any}
              />
              <View className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 items-center border-t border-red-500/40">
                <Text className="text-red-400 text-[8px] font-mono font-bold uppercase tracking-tighter">🔍 EXPANDIR</Text>
              </View>
            </TouchableOpacity>

            {/* Informações do Chefe */}
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-red-500 font-bold uppercase tracking-widest text-sm sm:text-base font-mono flex-1 pr-1" numberOfLines={1}>
                  {bossName}
                </Text>
                <TouchableOpacity onPress={onClose} className="p-1.5 border border-red-500/40 rounded-full bg-red-950/40">
                  <Feather name="x" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <Text className="text-white/60 text-[11px] font-mono mt-0.5">
                DISCIPLINA: {activeBoss?.disciplina?.nome || 'MATÉRIAS ESCOLARES'}
              </Text>

              <View className="flex-row items-center gap-2 mt-2">
                <TouchableOpacity
                  onPress={() => {
                    sounds?.playSelect?.();
                    setShowFullBossCard(true);
                  }}
                  className="bg-red-500/20 border border-red-500/60 px-2 py-0.5 rounded-sm flex-row items-center gap-1"
                >
                  <Text className="text-red-400 text-[9px] font-mono font-bold uppercase">⚔️ MEGA BOSS (VER CARTA)</Text>
                </TouchableOpacity>
                <View className="bg-amber-500/20 border border-amber-500/60 px-2 py-0.5 rounded-sm">
                  <Text className="text-amber-300 text-[9px] font-mono font-bold uppercase">
                    HP: {currentHp} / {totalHp}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* BARRA DE VIDA ÉPICA DO BOSS */}
          <View className="bg-black/60 border border-red-500/50 p-3 rounded-sm mb-4">
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className="text-red-400 font-bold font-mono text-xs uppercase tracking-wider">
                BARRA DE VIDA DO BOSS (HP)
              </Text>
              <Text className="text-white font-bold font-mono text-xs">
                {currentHp} / {totalHp} HP ({hpPercent.toFixed(1)}%)
              </Text>
            </View>
            <View className="w-full h-4 bg-black border border-red-900/60 rounded-full overflow-hidden">
              <View
                style={{ width: `${hpPercent}%`, backgroundColor: '#ef4444' }}
                className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full"
              />
            </View>
          </View>

          {/* AVISO DE PARTY EXCLUSIVA */}
          {!activeParty && (
            <View className="bg-amber-950/30 border border-amber-500/50 p-3 rounded-sm mb-4 flex-row items-center gap-3">
              <Feather name="alert-triangle" size={20} color="#f59e0b" />
              <Text className="text-amber-200 text-xs font-mono flex-1 leading-relaxed">
                ⚠️ O Mega Boss é exclusivo para Parties em RAID completa! Junte-se a uma Party na aba PARTY para destravar o combate.
              </Text>
            </View>
          )}

          {/* CONTEÚDO PRINCIPAL: MURAL OU FORMULÁRIO DE QUEST */}
          {selectedQuest ? (
            <ScrollView className="flex-1 bg-black/60 border border-neonBlue/30 p-4 rounded-sm">
              <TouchableOpacity
                onPress={() => setSelectedQuest(null)}
                className="flex-row items-center gap-2 mb-3 bg-neonBlue/10 p-2 border border-neonBlue/30 rounded-sm self-start"
              >
                <Feather name="arrow-left" size={16} color="#00f3ff" />
                <Text className="text-neonBlue text-xs font-mono font-bold uppercase">Voltar ao Mural do Boss</Text>
              </TouchableOpacity>

              <View className="mb-4">
                <Text className="text-white font-bold text-sm mb-2 font-mono leading-relaxed">
                  {selectedQuest.enunciado}
                </Text>
                {selectedQuest.defeatCount > 0 && (
                  <View className="bg-red-950/40 border border-red-500/40 p-2 rounded-sm mt-2 flex-row items-center gap-2">
                    <Text className="text-red-400 font-bold font-mono text-xs">
                      💀 Dizimou {selectedQuest.defeatCount} Parties! (+{selectedQuest.defeatCount * 50}% Bônus de XP & Drop)
                    </Text>
                  </View>
                )}
              </View>

              {/* VERIFICAÇÃO DE MODO DE RESPOSTA (FOTO VS TEXTO DISSERTATIVO) */}
              {(() => {
                const discNome = (activeBoss?.disciplina?.nome || '').toLowerCase();
                const isExatasDisc = discNome.includes('matemática') || discNome.includes('matematica') || discNome.includes('física') || discNome.includes('química');
                const isRedacaoDisc = discNome.includes('redação') || discNome.includes('redacao');
                const isFotoRequired = (selectedQuest.tipoResposta === 'FOTO_MATEMATICA' || selectedQuest.tipoResposta === 'FOTO_REDACAO') && (isExatasDisc || isRedacaoDisc);

                if (isFotoRequired) {
                  return (
                    <View className="mb-4">
                      <Text className="text-neonBlue text-xs font-mono font-bold uppercase mb-2">
                        📷 Resposta Obrigatória por Foto ({selectedQuest.tipoResposta === 'FOTO_REDACAO' ? 'Redação Livre Manuscrita' : 'Cálculos no Caderno'})
                      </Text>
                      
                      {imagemBase64 ? (
                        <View className="relative mb-3 border-2 border-neonBlue rounded-sm overflow-hidden h-48">
                          <Image source={{ uri: imagemBase64 }} className="w-full h-full" resizeMode="cover" />
                          <TouchableOpacity
                            onPress={() => setImagemBase64(null)}
                            className="absolute top-2 right-2 bg-red-600 p-2 rounded-full"
                          >
                            <Feather name="trash-2" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="flex-row gap-3 mb-3">
                          <TouchableOpacity
                            onPress={handleTakePhoto}
                            className="flex-1 bg-black/80 border-2 border-neonBlue/60 p-4 rounded-sm items-center justify-center gap-2"
                          >
                            <Feather name="camera" size={24} color="#00f3ff" />
                            <Text className="text-neonBlue text-[11px] font-mono font-bold uppercase text-center">
                              📷 Usar Câmera
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={handlePickLibrary}
                            className="flex-1 bg-black/80 border-2 border-neonBlue/60 p-4 rounded-sm items-center justify-center gap-2"
                          >
                            <Feather name="image" size={24} color="#00f3ff" />
                            <Text className="text-neonBlue text-[11px] font-mono font-bold uppercase text-center">
                              🖼️ Galeria de Fotos
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }

                return (
                  <View className="mb-4">
                    <Text className="text-neonBlue text-xs font-mono font-bold uppercase mb-2">
                      ✍️ Resposta Dissertativa em Texto Livre
                    </Text>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      value={respostaTexto}
                      onChangeText={setRespostaTexto}
                      placeholder="Digite sua resposta dissertativa ou explicação..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      className="bg-black/80 border border-neonBlue/40 p-3 rounded-sm text-white font-mono text-xs"
                    />
                  </View>
                );
              })()}

              {/* INDICADOR DE TURNO DA RAID & BOTÃO DE ATAQUE */}
              {selectedQuest.isMyTurn === false ? (
                <View className="bg-amber-950/60 border-2 border-amber-500/80 p-4 rounded-sm items-center justify-center mb-6 flex-row gap-2">
                  <Feather name="clock" size={20} color="#f59e0b" />
                  <Text className="text-amber-300 font-bold font-mono text-xs uppercase flex-1 leading-relaxed text-center">
                    ⏳ TURNO DO ALIADO: @{selectedQuest.responderNick || 'Caçador'}. AGUARDE O SEU TURNO NO COMBATE!
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleSubmitQuest}
                  disabled={submitting}
                  className="bg-red-600/30 border-2 border-red-500 py-3 rounded-sm items-center mb-6"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Text className="text-red-400 font-bold uppercase tracking-widest text-xs font-mono">
                      ⚔️ Canalizar Ataque no Boss (Submeter)
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            /* BACKLOG MURAL DE QUESTS DO BOSS */
            <View className="flex-1">
              <Text className="text-neonBlue text-xs font-mono font-bold uppercase mb-2">
                📋 MURAL DO BACKLOG DO BOSS ({bossData?.quests?.length || 0} Quests Disponíveis)
              </Text>

              {loadingQuests ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#00f3ff" />
                  <Text className="text-neonBlue/60 text-xs font-mono mt-3">Carregando Fila do Boss...</Text>
                </View>
              ) : (
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                  {bossData?.quests?.map((q: any, idx: number) => {
                    const isCompleted = q.status === 'COMPLETED';
                    const isLocked = q.status === 'LOCKED';

                    return (
                      <View
                        key={q.id}
                        className={`p-3 rounded-sm mb-3 border ${
                          isCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/40 opacity-60'
                            : isLocked
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-black/60 border-neonBlue/30'
                        }`}
                      >
                        <View className="flex-row justify-between items-start mb-2">
                          <Text className="text-neonBlue font-bold font-mono text-xs">
                            QUEST #{idx + 1} • {q.nivel} ({q.xpBase} XP)
                          </Text>

                          {isCompleted ? (
                            <View className="bg-emerald-500/20 border border-emerald-500 px-2 py-0.5 rounded-sm">
                              <Text className="text-emerald-400 text-[10px] font-mono font-bold">DERROTADA</Text>
                            </View>
                          ) : isLocked ? (
                            <View className="bg-amber-500/20 border border-amber-500 px-2 py-0.5 rounded-sm flex-row items-center gap-1">
                              <Feather name="lock" size={10} color="#f59e0b" />
                              <Text className="text-amber-400 text-[10px] font-mono font-bold">EM COMBATE POR OUTRO GRUPO</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleLockQuest(q)}
                              disabled={locking || !activeParty}
                              className="bg-neonBlue/20 border border-neonBlue px-3 py-1 rounded-sm"
                            >
                              <Text className="text-neonBlue text-[10px] font-mono font-bold uppercase">
                                ⚔️ PEGAR QUEST DA FILA
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <Text className="text-white text-xs font-mono leading-relaxed" numberOfLines={2}>
                          {q.enunciado}
                        </Text>

                        {q.defeatCount > 0 && (
                          <View className="mt-2 pt-2 border-t border-red-500/20 flex-row items-center gap-2">
                            <Text className="text-red-400 font-bold font-mono text-[10px]">
                              💀 Dizimou {q.defeatCount} Parties! (+{q.defeatCount * 50}% Bônus de Drop)
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

        </View>
      </View>

      {/* ALERTA CUSTOMIZADO CYBERNETICO */}
      <SystemAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      {/* MODAL FULLSCREEN EXPANDIDO DA CARTA DO BOSS (60% DA TELA) */}
      <Modal visible={showFullBossCard} animationType="fade" transparent={true} onRequestClose={() => setShowFullBossCard(false)}>
        <View className="flex-1 bg-black/95 justify-center items-center p-4 sm:p-8 relative">
          <DoomFireParticles />

          <View className="w-full max-w-2xl sm:w-[60vw] bg-[#0e0709] border-2 border-red-500 p-5 sm:p-6 rounded-sm items-center relative z-10 shadow-2xl">
            {/* Carta Manhwa em Destaque (60% da Tela) */}
            <View className="w-full h-[55vh] sm:h-[60vh] rounded-sm border-2 border-amber-500/80 overflow-hidden relative mb-4 bg-black justify-center items-center shadow-2xl">
              <Image
                source={bossImage}
                className="w-full h-full"
                resizeMode="contain"
                style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center top' } as any}
              />
              <View className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
              <View className="absolute bottom-4 left-4 right-4 items-center">
                <Text className="text-amber-400 font-bold uppercase tracking-widest text-xl sm:text-2xl font-mono text-center drop-shadow-md">
                  {bossName}
                </Text>
                <View className="bg-red-500/30 border border-red-500 px-3 py-1 rounded-sm mt-1.5">
                  <Text className="text-red-300 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                    ⚔️ DESAFIO DE COMBATE ÉPICO
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                sounds?.playSelect?.();
                setShowFullBossCard(false);
              }}
              className="bg-red-950/60 border-2 border-red-500 py-3.5 rounded-sm items-center w-full"
            >
              <Text className="text-red-400 font-bold uppercase tracking-widest text-xs sm:text-sm font-mono">
                ← VOLTAR AO COMBATE / QUESTS
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
