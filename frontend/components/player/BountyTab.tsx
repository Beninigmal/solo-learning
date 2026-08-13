import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CyberSubmitButton } from '../CyberSubmitButton';

interface BountyBug {
  id: string;
  userId: string;
  description: string;
  turmaNome: string;
  instituicao: string;
  imageUrl?: string | null;
  status: string; // PENDING, APPROVED, REJECTED
  artifactAwarded?: string | null;
  devQuestion?: string | null;
  studentResponse?: string | null;
  createdAt: string;
  user: {
    nome: string;
    matricula: string;
  };
}

interface BountyTabProps {
  bounties: BountyBug[];
  loadingBounties: boolean;
  fetchBounties: () => void;
  submitBounty: (description: string, imageBase64?: string) => Promise<boolean>;
  submitBountyResponse: (id: string, response: string) => Promise<boolean>;
  sounds: any;
  showAlert: (title: string, msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  currentUser?: any;
}

const ARTIFACT_NAMES: Record<string, string> = {
  sussurros_sabios: '📜 Sussurros Sábios',
  becker_alquimista: '🧪 Becker do Alquimista',
  olhar_monarca: '👁️ Olhar do Monarca',
  elixir_dourado: '🏆 Elixir Dourado',
  pocao_cura: '🧪 Poção de Cura',
  relogio_tempo: '🕰️ Relógio Ganha Tempo',
  anel_serpente: '🐍 Anel da Serpente',
  lagrima_fenix: '💧 Lágrima da Fênix',
  bandeira_guerra: '🚩 Bandeira de Guerra',
  orbe_perspicacia: '🔮 Orbe de Perspicácia',
  chave_mestra: '🔑 Chave Mestra',
  cetro_exilio: '🚩 Cetro do Exílio',
  sapatilhas_veloz: '👟 Sapatilhas do Mundo Lento',
  martelo_magico: '🔨 Martelo Mágico',
  poeira_estelar: '🎯 Poeira Estelar',
  pergaminho_oraculo: '📜 Pergaminho do Oráculo',
  escudo_arcano: '🛡️ Escudo Arcano',
  bracelete_cristal: '🛡️ Bracelete de Cristal',
  bolsa_sorte: '🎒 Bolsa da Sorte',
  mao_midas: '🪙 Mão de Midas',
  pena_escriba: '🪶 Pena do Escriba',
  varinha_pinheiro: '🪄 Varinha de Pinheiro',
  chapeu_arcanista: '🎩 Chapéu do Arcanista',
  chronomancia_netheril: 'Pedra de Chronomancia de Netheril',
};

const PREMIUM_ARTIFACT_SLUGS = [
  'sussurros_sabios',
  'becker_alquimista',
  'olhar_monarca',
  'elixir_dourado',
  'pocao_cura',
  'relogio_tempo',
  'anel_serpente',
  'lagrima_fenix',
  'bandeira_guerra',
  'orbe_perspicacia',
  'chave_mestra',
  'cetro_exilio',
  'chapeu_arcanista',
  'chronomancia_netheril'
];

const CYBER_BUG_IMAGES = [
  require('../../assets/bug_cyber_1.png'),
  require('../../assets/bug_cyber_2.png'),
  require('../../assets/bug_cyber_3.png'),
  require('../../assets/bug_cyber_4.png'),
  require('../../assets/bug_cyber_5.png'),
];

export function BountyTab({
  bounties,
  loadingBounties,
  fetchBounties,
  submitBounty,
  submitBountyResponse,
  sounds,
  showAlert,
  currentUser,
}: BountyTabProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [subTab, setSubTab] = useState<'MURAL' | 'MEUS_REPORTS'>('MURAL');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [submittingReplies, setSubmittingReplies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchBounties();
  }, []);

  const getCyberBugImage = (id: string, index?: number) => {
    if (typeof index === 'number') {
      return CYBER_BUG_IMAGES[index % CYBER_BUG_IMAGES.length];
    }
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % CYBER_BUG_IMAGES.length;
    return CYBER_BUG_IMAGES[idx];
  };

  const getPotentialReward = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PREMIUM_ARTIFACT_SLUGS.length;
    const slug = PREMIUM_ARTIFACT_SLUGS[index];
    return ARTIFACT_NAMES[slug] || slug.toUpperCase();
  };

  const handlePickImage = async () => {
    sounds.playSelect();
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert('Permissão necessária', 'Precisamos de acesso à sua galeria para anexar imagens.', 'warning');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        if (result.assets[0].base64) {
          setSelectedImageBase64(result.assets[0].base64);
        }
      }
    } catch (err) {
      console.warn('Erro ao selecionar imagem:', err);
    }
  };

  const handleRemoveImage = () => {
    sounds.playSelect();
    setSelectedImage(null);
    setSelectedImageBase64(null);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showAlert('Aviso', 'Por favor, forneça uma descrição detalhada do bug.', 'warning');
      return;
    }
    setSubmitting(true);
    const imgPayload = selectedImageBase64 ? `data:image/jpeg;base64,${selectedImageBase64}` : undefined;
    const success = await submitBounty(description, imgPayload);
    setSubmitting(false);
    if (success) {
      setDescription('');
      setSelectedImage(null);
      setSelectedImageBase64(null);
      setModalVisible(false);
      fetchBounties();
    }
  };

  const handleSendReply = async (id: string) => {
    const text = replyTexts[id];
    if (!text || text.trim().length === 0) {
      showAlert('Aviso', 'Por favor, digite sua resposta.', 'warning');
      return;
    }

    setSubmittingReplies(prev => ({ ...prev, [id]: true }));
    const success = await submitBountyResponse(id, text);
    setSubmittingReplies(prev => ({ ...prev, [id]: false }));
    if (success) {
      setReplyTexts(prev => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <View className="flex-1 w-full mt-2">
      {/* Bounty Hunter Dashboard Header */}
      <View className="bg-[#0a1128]/95 border border-neonBlue p-5 rounded-sm mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center gap-2">
            <Feather name="crosshair" size={18} color="#00f3ff" />
            <Text className="text-white text-sm font-bold uppercase tracking-[0.2em] font-mono">Mural Bounty Hunter</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              sounds.playSelect();
              setModalVisible(true);
            }}
            className="bg-neonBlue/15 border border-neonBlue/50 px-3 py-1.5 rounded-sm flex-row items-center gap-1"
          >
            <Feather name="plus" size={12} color="#00f3ff" />
            <Text className="text-neonBlue text-[10px] font-mono font-bold uppercase tracking-wider">Reportar Bug</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-white/60 text-[10px] font-mono leading-relaxed">
          Encontrou um erro na matrix acadêmica? Reporte-o imediatamente. Se o bug for aprovado pelo Mestre Arquiteto, você receberá um ARTEFATO DE PODER aleatório!
        </Text>
      </View>
      
      {/* Sub-tabs segment selector */}
      <View className="flex-row mb-4 bg-black/40 border border-neonBlue/20 rounded-sm p-1">
        <TouchableOpacity 
          className={`flex-1 py-2 items-center rounded-sm ${subTab === 'MURAL' ? 'bg-neonBlue/30' : ''}`} 
          onPress={() => { setSubTab('MURAL'); sounds.playSelect(); }}
        >
          <Text className={`font-bold uppercase text-[10px] tracking-wider ${subTab === 'MURAL' ? 'text-white' : 'text-neonBlue/50'}`}>Mural de Procurados</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-2 items-center rounded-sm ${subTab === 'MEUS_REPORTS' ? 'bg-neonBlue/30' : ''}`} 
          onPress={() => { setSubTab('MEUS_REPORTS'); sounds.playSelect(); }}
        >
          <Text className={`font-bold uppercase text-[10px] tracking-wider ${subTab === 'MEUS_REPORTS' ? 'text-white' : 'text-neonBlue/50'}`}>Meus Reports</Text>
        </TouchableOpacity>
      </View>

      {/* Wanted Posters List */}
      {subTab === 'MURAL' && (
        loadingBounties ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#00f3ff" />
            <Text className="text-neonBlue/60 text-[10px] font-mono mt-4 uppercase">Rastreando Masmorra de Bugs...</Text>
          </View>
        ) : bounties.length === 0 ? (
          <View className="bg-black/40 border border-white/10 p-8 rounded-sm items-center">
            <Feather name="shield-off" size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
            <Text className="text-white/40 text-xs font-mono uppercase tracking-widest text-center">Nenhum bug ativo procurado neste setor.</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {bounties.map((bug, index) => {
              // Cyberpunk Wanted Poster custom styles
              let posterBorderColor = 'border-neonBlue';
              let headerText = 'WANTED';
              let subHeaderText = 'SYSTEM ANOMALY';
              let mainColor = '#00f3ff';
              let textTailwindColor = 'text-neonBlue';

              if (bug.status === 'APPROVED') {
                posterBorderColor = 'border-green-500';
                headerText = 'ELIMINATED';
                subHeaderText = 'PATCHED BY MATRIX';
                mainColor = '#22c55e';
                textTailwindColor = 'text-green-400';
              } else if (bug.status === 'REJECTED') {
                posterBorderColor = 'border-red-500';
                headerText = 'ARCHIVED';
                subHeaderText = 'FALSE ALARM';
                mainColor = '#ef4444';
                textTailwindColor = 'text-red-400';
              }

              // Reward representation
              const rewardTitle = bug.status === 'APPROVED'
                ? (bug.artifactAwarded ? (ARTIFACT_NAMES[bug.artifactAwarded] || bug.artifactAwarded.replace(/_/g, ' ').toUpperCase()) : 'ARTEFATO DE PODER')
                : bug.status === 'REJECTED'
                ? 'NENHUM'
                : getPotentialReward(bug.id);

              return (
                <View
                  key={bug.id}
                  style={{ width: '48%', borderColor: mainColor, height: 280 }}
                  className={`border-2 rounded-sm mb-4 relative overflow-hidden flex-col justify-between`}
                >
                  {/* Background Image taking 100% of the card */}
                  <Image 
                    source={getCyberBugImage(bug.id, index)} 
                    className="absolute top-0 left-0 right-0 bottom-0 w-full h-full"
                    style={{ resizeMode: 'cover' }}
                  />

                  {/* Cyberpunk grid overlays */}
                  <View className="absolute top-0 bottom-0 left-0 right-0 bg-black/45" />

                  {/* Status Overlay Stamps in the middle */}
                  {bug.status === 'APPROVED' && (
                    <View className="absolute top-[40%] left-0 right-0 items-center justify-center z-20 rotate-[-12deg] pointer-events-none opacity-90">
                      <View className="border-2 border-green-500 bg-black/95 px-2 py-0.5 rounded-sm">
                        <Text className="text-green-500 font-mono font-bold text-[8px] uppercase tracking-[0.2em]">APROVADO</Text>
                      </View>
                    </View>
                  )}

                  {bug.status === 'REJECTED' && (
                    <View className="absolute top-[40%] left-0 right-0 items-center justify-center z-20 rotate-[-12deg] pointer-events-none opacity-90">
                      <View className="border-2 border-red-500 bg-black/95 px-2 py-0.5 rounded-sm">
                        <Text className="text-red-500 font-mono font-bold text-[8px] uppercase tracking-[0.2em]">REPROVADO</Text>
                      </View>
                    </View>
                  )}

                  {/* Header HUD (Overlay on top of the background image) */}
                  <View className="bg-black/60 border-b border-white/10 px-2 py-1.5 items-center z-10 w-full">
                    <Text className={`font-mono font-extrabold text-[12px] tracking-[0.25em] ${textTailwindColor}`}>{headerText}</Text>
                    <Text className="text-white/40 text-[5px] font-mono tracking-widest uppercase mt-0.5">{subHeaderText}</Text>
                  </View>

                  {/* Detalhes de rede da matrix (Middle overlay) */}
                  <View className="absolute top-12 right-2 bg-black/60 border border-white/5 px-1 py-0.5 rounded-sm z-10">
                    <Text className="text-white/50 text-[4px] font-mono">SYS.LNK_{bug.id.slice(0, 4).toUpperCase()}</Text>
                  </View>

                  {/* Bottom HUD Group (Contains name, description, reward) */}
                  <View className="bg-black/65 border-t border-white/10 p-2 z-10 gap-1">
                    {/* Name and Class */}
                    <View className="bg-black/50 border border-white/15 px-2 py-0.5 rounded-sm flex-row justify-between items-center">
                      <Text className="text-white font-mono font-bold text-[8px] uppercase tracking-wider shrink" numberOfLines={1}>
                        {bug.user?.nome?.split(' ')[0] || 'CAÇADOR'}
                      </Text>
                      <Text className={`text-[6px] font-mono uppercase tracking-[0.1em] ${textTailwindColor}`}>
                        T: {bug.turmaNome}
                      </Text>
                    </View>

                    {/* Description area */}
                    <View className="bg-black/50 border border-white/5 p-1 rounded-sm min-h-[35px] justify-center">
                      <Text className="text-white/80 text-center font-mono text-[7px] leading-relaxed" numberOfLines={3}>
                        "{bug.description}"
                      </Text>
                    </View>

                    {/* Reward line */}
                    <View 
                      style={{ backgroundColor: mainColor + '15', borderColor: mainColor + '30' }} 
                      className="border py-1 px-1.5 rounded-sm items-center justify-center flex-row gap-1"
                    >
                      <Text className={`font-extrabold text-[6.5px] font-mono tracking-[0.05em] text-center ${textTailwindColor}`} numberOfLines={1}>
                        RECOMPENSA: {rewardTitle}
                      </Text>
                    </View>

                    {/* Matrix footer stamp */}
                    <View className="border-t border-white/5 pt-1">
                      <Text className="text-white/30 text-[4px] font-mono leading-none text-center uppercase">
                        ALL NET DATA ROUTED TO: SOLEN_NETSPHERE // NODE_{bug.instituicao.slice(0, 4).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )
      )}

      {/* My Reports List */}
      {subTab === 'MEUS_REPORTS' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {bounties.filter(b => currentUser && b.userId === currentUser.id).length === 0 ? (
            <View className="bg-black/40 border border-white/10 p-8 rounded-sm items-center">
              <Feather name="folder-minus" size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
              <Text className="text-white/40 text-xs font-mono uppercase tracking-widest text-center">Você ainda não reportou nenhum bug.</Text>
            </View>
          ) : (
            bounties
              .filter(b => currentUser && b.userId === currentUser.id)
              .map((bug) => (
                <View key={bug.id} className="bg-[#0a1128]/80 border border-neonBlue/20 p-4 rounded-sm mb-3">
                  <View className="flex-row justify-between items-start border-b border-neonBlue/10 pb-2 mb-3">
                    <View className="flex-1 mr-2">
                      <Text className="text-white font-mono font-bold text-xs uppercase" numberOfLines={1}>
                        [BUG-{bug.id.slice(0, 8).toUpperCase()}]
                      </Text>
                      <Text className="text-white/40 text-[9px] font-mono mt-0.5">
                        {new Date(bug.createdAt).toLocaleDateString('pt-BR')} às {new Date(bug.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View className={`border px-1.5 py-0.5 rounded-sm ${bug.status === 'APPROVED' ? 'bg-green-500/10 border-green-500/40' : bug.status === 'REJECTED' ? 'bg-red-500/10 border-red-500/40' : 'bg-yellow-500/10 border-yellow-500/40'}`}>
                      <Text className={`text-[8px] font-mono font-bold uppercase ${bug.status === 'APPROVED' ? 'text-green-400' : bug.status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}`}>{bug.status}</Text>
                    </View>
                  </View>

                  <Text className="text-white/80 text-xs font-mono mb-3 leading-relaxed">{bug.description}</Text>

                  {/* Render Image thumbnail if exists */}
                  {bug.imageUrl && (bug.imageUrl.startsWith('data:image') || bug.imageUrl.startsWith('http')) && (
                    <View className="mb-3 border border-neonBlue/10 rounded-sm overflow-hidden h-32 bg-black items-center justify-center">
                      <Image source={{ uri: bug.imageUrl }} className="w-full h-full" style={{ resizeMode: 'contain' }} />
                    </View>
                  )}

                  {/* Chat de Feedback Dourado / Amarelo do Dev */}
                  {bug.devQuestion && (
                    <View className="mt-2 border border-yellow-500/30 bg-yellow-500/5 p-3 rounded-sm">
                      <View className="flex-row items-center gap-1.5 mb-2">
                        <Feather name="message-square" size={12} color="#eab308" />
                        <Text className="text-yellow-500 text-[9px] font-bold font-mono uppercase tracking-wider">Transmissão da Matrix (Dúvida do Dev)</Text>
                      </View>

                      <View className="bg-black/40 p-2.5 rounded-sm border border-yellow-500/20 mb-3">
                        <Text className="text-yellow-300 text-xs font-mono">{bug.devQuestion}</Text>
                      </View>

                      {bug.studentResponse ? (
                        <View className="bg-black/40 p-2.5 rounded-sm border border-green-500/20">
                          <Text className="text-white/40 text-[8px] font-mono uppercase">Sua Resposta:</Text>
                          <Text className="text-green-300 text-xs mt-0.5 font-mono">"{bug.studentResponse}"</Text>
                        </View>
                      ) : (
                        <View className="gap-2">
                          <TextInput
                            className="bg-black/60 border border-yellow-500/40 text-white px-3 py-2 rounded-sm text-xs font-mono"
                            placeholder="Escreva sua explicação para o desenvolvedor..."
                            placeholderTextColor="#eab30825"
                            value={replyTexts[bug.id] || ''}
                            onChangeText={(val) => setReplyTexts(prev => ({ ...prev, [bug.id]: val }))}
                            multiline
                            numberOfLines={2}
                          />
                          <TouchableOpacity
                            onPress={() => handleSendReply(bug.id)}
                            disabled={submittingReplies[bug.id]}
                            className="bg-yellow-500 border border-yellow-600 py-2 rounded-sm items-center justify-center flex-row gap-1"
                            activeOpacity={0.7}
                          >
                            {submittingReplies[bug.id] ? (
                              <ActivityIndicator size="small" color="#000" />
                            ) : (
                              <>
                                <Feather name="send" size={10} color="#000" />
                                <Text className="text-black font-bold uppercase text-[9px] font-mono tracking-wider">Enviar Resposta</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))
          )}
        </ScrollView>
      )}

      {/* Report Bug Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          sounds.playSelect();
          setModalVisible(false);
        }}
      >
        <View className="flex-1 bg-black/90 justify-center items-center p-4">
          <View className="bg-[#080d1a] border border-neonBlue p-5 rounded-sm w-full max-w-sm">
            <View className="flex-row justify-between items-center border-b border-neonBlue/20 pb-3 mb-4">
              <View className="flex-row items-center gap-2">
                <Feather name="shield" size={18} color="#00f3ff" />
                <Text className="text-white font-mono font-bold uppercase tracking-wider text-xs">
                  Reportar Bug Acadêmico
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  sounds.playSelect();
                  setModalVisible(false);
                }}
                className="p-1"
              >
                <Feather name="x" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <Text className="text-white/60 text-[10px] font-mono mb-4 leading-relaxed">
              Descreva com detalhes o que aconteceu, os passos para reproduzir o bug e anexe um screenshot se possível.
            </Text>

            <TextInput
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva o comportamento do bug e como causá-lo..."
              placeholderTextColor="rgba(0, 243, 255, 0.4)"
              className="bg-black/60 border border-neonBlue/40 rounded-sm p-3 text-white text-xs mb-4 font-mono w-full"
            />

            {/* Screenshot attachment preview */}
            {selectedImage ? (
              <View className="relative mb-4 border border-neonBlue/30 rounded-sm overflow-hidden h-32 items-center justify-center bg-black">
                <Image source={{ uri: selectedImage }} className="w-full h-full" style={{ resizeMode: 'contain' }} />
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-600/80 p-1.5 rounded-full"
                >
                  <Feather name="trash-2" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                className="border border-dashed border-neonBlue/40 rounded-sm py-4 mb-4 items-center justify-center bg-black/40 flex-row gap-2"
              >
                <Feather name="image" size={14} color="#00f3ff" />
                <Text className="text-neonBlue text-[10px] font-mono font-bold uppercase tracking-wider">
                  Anexar Screenshot (Galeria)
                </Text>
              </TouchableOpacity>
            )}

            <View className="flex-row gap-3 mt-2 w-full">
              <TouchableOpacity
                onPress={() => {
                  sounds.playSelect();
                  setModalVisible(false);
                }}
                className="flex-1 bg-white/5 border border-white/10 py-3 rounded-sm items-center justify-center"
              >
                <Text className="text-white/60 font-bold uppercase text-[10px] tracking-widest font-mono">Voltar</Text>
              </TouchableOpacity>
              
              <View className="flex-1">
                <CyberSubmitButton
                  title="Transmitir Bug"
                  loading={submitting}
                  onPress={handleSubmit}
                  className="py-3"
                  textClassName="text-[10px] font-mono"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
