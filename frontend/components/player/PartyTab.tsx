import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface PartyTabProps {
  activeParty: any | null;
  chatMessages: any[];
  user: any;
  chatInput: string;
  setChatInput: (text: string) => void;
  sendingMessage: boolean;
  handleSendChatMessage: () => void;
  handleLeaveParty: () => void;
  handleCreateParty: () => void;
  handleJoinParty: () => void;
  partyCodeInput: string;
  setPartyCodeInput: (text: string) => void;
  loadingParty: boolean;
  setShowShareModal: (show: boolean) => void;
  sounds: any;
  handleToggleRaidMode?: () => void;
  handleJoinRaidQuest?: (deliveryId: string) => void;
}

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

export function PartyTab({
  activeParty,
  chatMessages,
  user,
  chatInput,
  setChatInput,
  sendingMessage,
  handleSendChatMessage,
  handleLeaveParty,
  handleCreateParty,
  handleJoinParty,
  partyCodeInput,
  setPartyCodeInput,
  loadingParty,
  setShowShareModal,
  sounds,
  handleToggleRaidMode,
  handleJoinRaidQuest
}: PartyTabProps) {
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      className="flex-1"
    >
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-2">Party System</Text>
      <Text className="text-white/40 text-xs mb-6 font-mono">Una-se a aventureiros da sua turma para enfrentar Raids!</Text>

      {activeParty ? (
        <View 
          className="bg-[#0a1128]/90 p-5 rounded-sm mb-4"
          style={{
            borderWidth: 2,
            borderColor: activeParty.bandeiraGuerraActive ? '#ffca28' : '#eab30850',
            shadowColor: activeParty.bandeiraGuerraActive ? '#ffca28' : 'transparent',
            shadowRadius: activeParty.bandeiraGuerraActive ? 15 : 0,
            shadowOpacity: activeParty.bandeiraGuerraActive ? 0.8 : 0,
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-3">
              <Feather name="users" size={20} color={activeParty.bandeiraGuerraActive ? "#ffca28" : "#eab308"} />
              <Text className="font-bold uppercase tracking-widest text-sm" style={{ color: activeParty.bandeiraGuerraActive ? "#ffca28" : "#eab308" }}>Sua Party Ativa</Text>
              {activeParty.bandeiraGuerraActive && (
                <View className="bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/30 rounded-sm flex-row items-center gap-1">
                  <Feather name="flag" size={8} color="#ffca28" />
                  <Text className="text-[#ffca28] text-[7.5px] font-bold font-mono uppercase">BUFF +20% XP</Text>
                </View>
              )}
            </View>
            <View className="bg-yellow-900/40 border border-yellow-700/50 px-3 py-1 rounded-sm">
              <Text className="text-yellow-400 font-mono font-bold text-xs uppercase tracking-widest">{activeParty.codigo}</Text>
            </View>
          </View>

          {/* Party Wipe Cooldown Alert */}
          {activeParty.partyCooldownUntil && new Date(activeParty.partyCooldownUntil) > new Date() && (
            <View className="bg-red-950/50 border border-red-500/50 p-3 rounded-sm mb-4">
              <Text className="text-red-400 font-bold uppercase tracking-widest text-xs mb-1">
                ⚠️ PARTY WIPE! MASMORRA BLOQUEADA
              </Text>
              <Text className="text-red-300/80 text-[10px] font-mono">
                Sua guilda falhou. O acesso a Raids está bloqueado. Aguardem o cooldown individual para tentar novamente.
              </Text>
            </View>
          )}

          {/* List participants */}
          <View className="mb-4">
            <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Aventureiros no Grupo (Max 3):</Text>
            {activeParty.participantes?.map((p: any) => (
              <View key={p.id} className="flex-row justify-between items-center py-2 border-b border-white/5">
                <View className="flex-row items-center gap-2">
                  <View className={`w-2 h-2 rounded-full ${getUserStatusColor(p.user?.lastActiveAt)}`} />
                  <View className="bg-yellow-500/20 px-2 py-0.5 rounded-full">
                    <Text className="text-yellow-500 text-[10px] font-bold font-mono">UNID {p.user?.turma?.unidade || 1}</Text>
                  </View>
                  <Text className={`font-bold text-sm ${p.isInvasor ? 'text-red-500 font-extrabold uppercase font-mono' : 'text-white'}`}>
                    {p.isInvasor ? '⚔️ [INVASOR] ' : ''}{p.user?.nickname || p.user?.nome}
                  </Text>
                  {activeParty.currentResponderId === p.userId && (
                    <View className="bg-neonBlue/20 px-2 py-0.5 rounded-sm border border-neonBlue">
                      <Text className="text-neonBlue text-[8px] font-bold uppercase tracking-widest font-mono">Da Vez</Text>
                    </View>
                  )}
                </View>
                <Text className="text-neonBlue text-xs font-mono font-bold">+{p.user?.xp} XP</Text>
              </View>
            ))}
          </View>

          {/* MODO RAID CONTROLS */}
          <View className="mt-2 border-t border-white/10 pt-4 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2">
                <Feather name="zap" size={16} color={activeParty.raidModeActive ? "#00f3ff" : "#ffffff40"} />
                <Text className="text-white text-xs font-bold uppercase tracking-widest font-mono">Modo Raid</Text>
              </View>
              <Text className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase ${
                activeParty.raidModeActive ? 'bg-neonBlue/20 text-neonBlue border border-neonBlue/30' : 'bg-white/10 text-white/40'
              }`}>
                {activeParty.raidModeActive ? 'ATIVADO' : 'INATIVO'}
              </Text>
            </View>

            {/* Toggle Button for Leader, or status display for members */}
            {(() => {
              const isLeader = activeParty.participantes && activeParty.participantes[0]?.userId === user?.id;
              if (isLeader) {
                return (
                  <TouchableOpacity
                    onPress={handleToggleRaidMode}
                    className={`w-full py-3 rounded-sm items-center justify-center flex-row gap-2 border ${
                      activeParty.raidModeActive 
                        ? 'bg-red-950/20 border-red-500/50' 
                        : 'bg-neonBlue/20 border-neonBlue/50'
                    }`}
                  >
                    <Feather name={activeParty.raidModeActive ? "pause" : "play"} size={14} color={activeParty.raidModeActive ? "#ef4444" : "#00f3ff"} />
                    <Text className={`font-mono font-bold text-xs uppercase tracking-widest ${
                      activeParty.raidModeActive ? 'text-red-400' : 'text-neonBlue'
                    }`}>
                      {activeParty.raidModeActive ? 'Desativar Modo Raid' : 'Ativar Modo Raid'}
                    </Text>
                  </TouchableOpacity>
                );
              } else {
                return (
                  <View className="w-full bg-black/40 border border-white/5 p-3 rounded-sm items-center">
                    <Text className="text-white/50 text-[10px] font-mono text-center">
                      {activeParty.raidModeActive 
                        ? '⚡ Raid ativada pelo líder! Aguardando invocação de monstro...' 
                        : '💤 Aguardando o líder do grupo iniciar a Raid.'}
                    </Text>
                  </View>
                );
              }
            })()}

            {/* Join Shared Raid Quest Banner */}
            {activeParty.raidModeActive && activeParty.activeQuestDeliveryId && (
              <TouchableOpacity
                onPress={() => handleJoinRaidQuest?.(activeParty.activeQuestDeliveryId)}
                className="w-full bg-[#3b82f6]/20 border-2 border-[#3b82f6] p-3.5 rounded-sm items-center justify-center mt-3 shadow-lg shadow-[#3b82f6]/30 animate-pulse animate-duration-1000"
              >
                <View className="flex-row items-center gap-2">
                  <Feather name="shield" size={16} color="#3b82f6" />
                  <Text className="text-white font-mono font-bold text-xs uppercase tracking-widest">
                    ⚔️ ENTRAR NA BATALHA DA RAID ⚔️
                  </Text>
                </View>
                <Text className="text-white/60 text-[9px] font-mono mt-1 text-center">
                  Uma quest compartilhada está ativa! Clique para unir forças!
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Canal de Comunicação da Raid (Chat de Texto) */}
          <View className="mt-2 border-t border-white/10 pt-4 mb-4">
            <Text className="text-neonBlue text-[10px] font-bold uppercase tracking-widest mb-3 font-mono">⚡ CANAL DE COMUNICAÇÃO (TEXTO):</Text>
            
            {/* Messages Scroller */}
            <View 
              className="h-40 bg-black/60 p-3 rounded-sm mb-3"
              style={{
                borderWidth: 1.5,
                borderColor: activeParty.bandeiraGuerraActive ? '#ffca28' : '#00f3ff20',
                shadowColor: activeParty.bandeiraGuerraActive ? '#ffca28' : 'transparent',
                shadowRadius: activeParty.bandeiraGuerraActive ? 8 : 0,
                shadowOpacity: activeParty.bandeiraGuerraActive ? 0.6 : 0,
              }}
            >
              <ScrollView 
                nestedScrollEnabled={true}
                ref={ref => { if (ref) { ref.scrollToEnd({ animated: true }); } }}
                showsVerticalScrollIndicator={true}
              >
                {chatMessages.length === 0 ? (
                  <Text className="text-white/20 text-[10px] font-mono italic text-center mt-12">Nenhuma transmissão registrada neste canal...</Text>
                ) : (
                  chatMessages.map((m: any) => {
                    const isMe = m.userId === user?.id;
                    return (
                      <View key={m.id} className="mb-2">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <View className={`w-1.5 h-1.5 rounded-full ${getUserStatusColor(m.user?.lastActiveAt)}`} />
                          {(() => {
                            const participant = activeParty?.participantes?.find((p: any) => p.userId === m.userId);
                            const isInvasorMsg = participant?.isInvasor === true;
                            return (
                              <Text className={`text-[10px] font-bold font-mono ${isInvasorMsg ? 'text-red-500 font-extrabold' : isMe ? 'text-neonBlue' : 'text-yellow-500'}`}>
                                {isInvasorMsg ? '⚔️ [INVASOR] ' : ''}[{m.user?.nickname || m.user?.nome}]:
                              </Text>
                            );
                          })()}
                          <Text className="text-white text-xs font-sans leading-4">{m.content}</Text>
                        </View>
                        <Text className="text-[8px] text-white/20 font-mono mt-0.5">
                          {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {/* Input Box */}
            <View className="flex-row gap-2">
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Transmitir mensagem..."
                placeholderTextColor="#00f3ff20"
                className="flex-1 bg-black/50 border border-neonBlue/30 text-white px-3 py-2 rounded-sm text-xs font-mono"
                onSubmitEditing={handleSendChatMessage}
                editable={!sendingMessage}
              />
              <TouchableOpacity
                onPress={handleSendChatMessage}
                disabled={sendingMessage || !chatInput.trim()}
                className={`px-4 bg-neonBlue/20 border border-neonBlue rounded-sm items-center justify-center ${(!chatInput.trim() || sendingMessage) ? 'opacity-40' : ''}`}
                activeOpacity={0.7}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#00f3ff" />
                ) : (
                  <Feather name="send" size={14} color="#00f3ff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => { sounds.playSelect(); setShowShareModal(true); }}
            className="w-full bg-neonBlue/10 border border-neonBlue py-3 rounded-sm items-center mt-2 flex-row justify-center gap-2 mb-2"
          >
            <Feather name="share-2" size={16} color="#00f3ff" />
            <Text className="text-neonBlue text-xs font-bold uppercase tracking-widest">Compartilhar Party</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLeaveParty}
            disabled={loadingParty}
            className="w-full bg-red-950/20 border border-red-800/50 py-3 rounded-sm items-center mt-2"
          >
            {loadingParty ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Text className="text-red-500 font-bold uppercase tracking-widest text-sm">Sair da Party</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-[#0a1128]/90 border border-neonBlue/30 p-5 rounded-sm mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <Feather name="users" size={20} color="#00f3ff" />
            <Text className="text-neonBlue font-bold uppercase tracking-widest text-sm">Sua Party</Text>
          </View>
          <View className="items-center py-6">
            <Feather name="shield" size={48} color="#00f3ff20" />
            <Text className="text-white/30 text-sm mt-3 text-center">Você não está em nenhuma party</Text>
          </View>
          <TouchableOpacity 
            onPress={handleCreateParty}
            disabled={loadingParty}
            className="w-full bg-neonBlue/20 border border-neonBlue/50 py-3 rounded-sm items-center mt-2"
          >
            {loadingParty ? (
              <ActivityIndicator size="small" color="#00f3ff" />
            ) : (
              <Text className="text-neonBlue font-bold uppercase tracking-widest text-sm">Criar Party</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!activeParty && (
        <View className="bg-[#0a1128]/90 border border-neonBlue/20 p-5 rounded-sm">
          <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Entrar com Código</Text>
          <View className="flex-row gap-3">
            <TextInput
              className="flex-1 bg-black/50 border border-neonBlue/30 text-white text-center py-3 rounded-sm font-mono font-bold"
              placeholder="Código da Raid... Ex: RAID-ABCD"
              placeholderTextColor="#00f3ff30"
              value={partyCodeInput}
              onChangeText={setPartyCodeInput}
              autoCapitalize="characters"
              editable={!loadingParty}
            />
            <TouchableOpacity 
              onPress={handleJoinParty}
              disabled={loadingParty}
              className="bg-neonBlue/20 border border-neonBlue/50 px-4 rounded-sm items-center justify-center"
            >
              {loadingParty ? (
                <ActivityIndicator size="small" color="#00f3ff" />
              ) : (
                <Feather name="arrow-right" size={18} color="#00f3ff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
