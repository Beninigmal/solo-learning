import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';

interface TurmasTabProps {
  turmaNome: string;
  setTurmaNome: (val: string) => void;
  turmaAno: string;
  setTurmaAno: (val: string) => void;
  turmaCodigo: string;
  setTurmaCodigo: (val: string) => void;
  turmaNivel: string;
  setTurmaNivel: (val: string) => void;
  loadingTurma: boolean;
  handleCreateTurma: () => void;
  editingTurmaId: string | null;
  handleEditTurmaPress: (turma: any) => void;
  cancelEditTurma: () => void;
  turmas: any[];
  fetchTurmas: () => void;
  sounds: any;
  handleUpdateUnidade: (turmaId: string, unidade: number) => void;
}

export function TurmasTab({
  turmaNome,
  setTurmaNome,
  turmaAno,
  setTurmaAno,
  turmaCodigo,
  setTurmaCodigo,
  turmaNivel,
  setTurmaNivel,
  loadingTurma,
  handleCreateTurma,
  editingTurmaId,
  handleEditTurmaPress,
  cancelEditTurma,
  turmas,
  fetchTurmas,
  sounds,
  currentUser,
  handleUpdateUnidade,
}: TurmasTabProps) {
  const instTipo = currentUser?.institution?.tipo || 'MUNICIPAL';
  const showLevelSelector = instTipo === 'PRIVADO';

  return (
    <>
      {/* ─── SEÇÃO DE CRIAÇÃO DE TURMAS ────────────────────────────────── */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">
          {editingTurmaId ? 'Transmutar Turma' : 'Forjar Nova Turma'}
        </Text>
        
        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Nome da Turma (Ex: 3º Ano A)"
          placeholderTextColor="#00f3ff40"
          value={turmaNome}
          onChangeText={setTurmaNome}
        />

        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Ano (Ex: 2026)"
          placeholderTextColor="#00f3ff40"
          value={turmaAno}
          onChangeText={setTurmaAno}
          keyboardType="numeric"
        />

        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Código de Invocação (Padrão: 1234)"
          placeholderTextColor="#00f3ff40"
          value={turmaCodigo}
          onChangeText={setTurmaCodigo}
          autoCapitalize="none"
        />

        {showLevelSelector && (
          <>
            <Text className="text-white/50 text-xs mb-2.5 uppercase font-bold font-mono">Nível Acadêmico:</Text>
            <View className="flex-row mb-6 gap-2 flex-wrap">
              {[
                { key: 'FUNDAMENTAL', label: 'Fundamental' },
                { key: 'MEDIO', label: 'Ensino Médio' }
              ].map(lvl => (
                <TouchableOpacity 
                  key={lvl.key} 
                  onPress={() => { setTurmaNivel(lvl.key); sounds.playSelect(); }} 
                  className={`px-3.5 py-2 rounded-sm border ${turmaNivel === lvl.key ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'} items-center`}
                >
                  <Text className={`text-[9px] uppercase font-bold tracking-wider ${turmaNivel === lvl.key ? 'text-white' : 'text-neonBlue/50'}`}>
                    {lvl.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View className="flex-row gap-3">
          {editingTurmaId && (
            <TouchableOpacity 
              className="flex-1 border border-red-500/40 bg-red-500/10 py-3 rounded-sm items-center justify-center"
              onPress={cancelEditTurma}
              disabled={loadingTurma}
            >
              <Text className="text-red-400 font-bold uppercase tracking-widest text-xs">Cancelar</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: editingTurmaId ? 2 : 1 }}>
            <CyberSubmitButton
              title={editingTurmaId ? 'Salvar Alterações' : 'Criar Turma'}
              loadingTitle={editingTurmaId ? 'Salvando...' : 'Criando...'}
              loading={loadingTurma}
              onPress={handleCreateTurma}
              textClassName="text-xs"
            />
          </View>
        </View>
      </View>

      {/* Guilda de Turmas / Classes */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-lg font-bold uppercase tracking-widest">Guilda de Turmas</Text>
          <TouchableOpacity onPress={() => { sounds.playSelect(); fetchTurmas(); }}>
            <Feather name="refresh-cw" size={16} color="#00f3ff" />
          </TouchableOpacity>
        </View>

        {turmas.length === 0 ? (
          <Text className="text-white/30 text-center text-sm py-4">Nenhuma turma forjada ainda.</Text>
        ) : (
          turmas.map((t: any) => (
            <View key={t.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-1 pr-2">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>{t.nome}</Text>
                  <Text className="text-neonBlue/70 text-xs mt-1" numberOfLines={1}>
                    Ano: {t.ano} · Código: {t.codigoInvocacao || 'sem código'} · Nível: {t.nivel || 'FUNDAMENTAL'}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => handleEditTurmaPress(t)}
                    className="bg-neonBlue/10 border border-neonBlue/30 p-1.5 rounded-sm"
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={12} color="#00f3ff" />
                  </TouchableOpacity>
                  <View className="bg-neonBlue/10 border border-neonBlue/30 px-2 py-1.5 rounded-sm">
                    <Text className="text-neonBlue font-bold text-[10px] uppercase">Unidade {t.unidade || 1}</Text>
                  </View>
                </View>
              </View>

              {/* Unidade Selector Grid */}
              <View className="flex-row items-center justify-between border-t border-neonBlue/10 pt-3">
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Definir Unidade:</Text>
                <View className="flex-row gap-1">
                  {[1, 2, 3].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => { handleUpdateUnidade(t.id, unit); sounds.playSelect(); }}
                      className={`w-8 h-8 rounded-sm items-center justify-center border ${
                        (t.unidade || 1) === unit
                          ? 'bg-neonBlue/30 border-neonBlue'
                          : 'bg-black/50 border-neonBlue/20'
                      }`}
                    >
                      <Text className={`font-bold text-xs ${(t.unidade || 1) === unit ? 'text-white' : 'text-neonBlue/50'}`}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
}
