import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';
import { getTemplateDownloadUrl } from '../../services/api';

interface RecrutarTabProps {
  useBatch: boolean;
  setUseBatch: (val: boolean) => void;
  turno: string;
  setTurno: (val: string) => void;
  turmas: any[];
  recrutTurmaId: string;
  setRecrutTurmaId: (val: string) => void;
  recrutStudentNome: string;
  setRecrutStudentNome: (val: string) => void;
  recrutStudentMatricula: string;
  setRecrutStudentMatricula: (val: string) => void;
  recrutando: boolean;
  handleRecrutar: () => void;
  handleSelectExcel: (type: 'alunos' | 'professores') => void;
  excelData: any[];
  handleBatchRecrutarExcel: () => void;
  sounds: any;
  
  // Props para Mestre
  editingMasterId?: string | null;
  nome?: string;
  setNome?: (val: string) => void;
  matricula?: string;
  setMatricula?: (val: string) => void;
  maxAulasSemanais?: string;
  setMaxAulasSemanais?: (val: string) => void;
  categoria?: 'CONCURSADO' | 'REDA' | 'CLT';
  setCategoria?: (val: 'CONCURSADO' | 'REDA' | 'CLT') => void;
  currentUser?: any;
  loading?: boolean;
  handleRegisterOrUpdateMaster?: () => void;
  cancelEditMaster?: () => void;
  handleBatchRegisterMastersExcel?: () => void;
}

export function RecrutarTab({
  useBatch,
  setUseBatch,
  turno,
  setTurno,
  turmas,
  recrutTurmaId,
  setRecrutTurmaId,
  recrutStudentNome,
  setRecrutStudentNome,
  recrutStudentMatricula,
  setRecrutStudentMatricula,
  recrutando,
  handleRecrutar,
  handleSelectExcel,
  excelData,
  handleBatchRecrutarExcel,
  sounds,
  
  editingMasterId,
  nome,
  setNome,
  matricula,
  setMatricula,
  maxAulasSemanais,
  setMaxAulasSemanais,
  categoria,
  setCategoria,
  currentUser,
  loading,
  handleRegisterOrUpdateMaster,
  cancelEditMaster,
  handleBatchRegisterMastersExcel
}: RecrutarTabProps) {
  const [subTab, setSubTab] = useState<'PLAYER' | 'MESTRE'>('PLAYER');

  const handleDownloadTemplate = async (type: 'alunos' | 'professores') => {
    try {
      sounds.playSelect();
      const url = await getTemplateDownloadUrl(type);
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = url;
        link.download = `template_${type}.xlsx`;
        link.click();
      } else {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-4">Recrutar</Text>
      
      {/* Sub-tabs Player / Mestre */}
      <View className="flex-row mb-6 bg-black/40 border border-neonBlue/20 rounded-sm p-1">
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${subTab === 'PLAYER' ? 'bg-neonBlue/30' : ''}`} onPress={() => { setSubTab('PLAYER'); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-xs ${subTab === 'PLAYER' ? 'text-white' : 'text-neonBlue/50'}`}>PLAYER (Aluno)</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${subTab === 'MESTRE' ? 'bg-neonBlue/30' : ''}`} onPress={() => { setSubTab('MESTRE'); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-xs ${subTab === 'MESTRE' ? 'text-white' : 'text-neonBlue/50'}`}>MESTRE (Professor)</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'PLAYER' && (
        <>
          <View className="flex-row mb-6 bg-black/40 border border-neonBlue/20 rounded-sm p-1">
            <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${!useBatch ? 'bg-neonBlue/30' : ''}`} onPress={() => { setUseBatch(false); sounds.playSelect(); }}>
              <Text className={`font-bold uppercase text-[10px] ${!useBatch ? 'text-white' : 'text-neonBlue/50'}`}>Individual</Text>
            </TouchableOpacity>
            <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${useBatch ? 'bg-neonBlue/30' : ''}`} onPress={() => { setUseBatch(true); sounds.playSelect(); }}>
              <Text className={`font-bold uppercase text-[10px] ${useBatch ? 'text-white' : 'text-neonBlue/50'}`}>Lote (Excel)</Text>
            </TouchableOpacity>
          </View>

          {!useBatch ? (
            <>
              <View className="flex-row mb-4 gap-2">
                {['MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL'].map(t => (
                  <TouchableOpacity key={t} onPress={() => { setTurno(t); sounds.playSelect(); }} className={`flex-1 py-2.5 rounded-sm border ${turno === t ? 'bg-neonBlue/30 border-neonBlue' : 'border-neonBlue/20'} items-center`}>
                    <Text className={`text-[8px] uppercase font-bold tracking-wider ${turno === t ? 'text-white' : 'text-neonBlue/50'}`}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-white/50 text-xs mb-2 uppercase font-bold">Vincular à Turma:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ paddingHorizontal: 8 }}>
                <View className="flex-row gap-2">
                  {turmas.map((t) => (
                    <TouchableOpacity
                       key={t.id}
                       className={`px-4 py-2 rounded-sm border ${recrutTurmaId === t.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                       onPress={() => { setRecrutTurmaId(t.id); sounds.playSelect(); }}
                    >
                      <Text className={`text-xs font-bold uppercase ${recrutTurmaId === t.id ? 'text-white' : 'text-neonBlue/50'}`}>
                        {t.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              
              <TextInput className="w-full bg-black/50 border border-neonBlue/50 text-white text-center py-3 rounded-sm mb-4" placeholder="Nome Completo" placeholderTextColor="#00f3ff40" value={recrutStudentNome} onChangeText={setRecrutStudentNome} keyboardAppearance="dark" />
              <TextInput className="w-full bg-black/50 border border-neonBlue/50 text-white text-center py-3 rounded-sm mb-6" placeholder="Matrícula" placeholderTextColor="#00f3ff40" value={recrutStudentMatricula} onChangeText={setRecrutStudentMatricula} keyboardAppearance="dark" autoCapitalize="none" />
              
              <CyberSubmitButton
                title="Recrutar Caçador"
                loadingTitle="Recrutando..."
                loading={recrutando}
                onPress={handleRecrutar}
              />
            </>
          ) : (
            <>
              <View className="bg-black/40 border border-neonBlue/20 p-4 rounded-sm mb-4">
                <Text className="text-neonBlue text-[11px] font-bold uppercase tracking-widest mb-1.5">📊 Modelo de Planilha Excel</Text>
                <TouchableOpacity
                  className="bg-neonBlue/20 border border-neonBlue/50 py-3 rounded-sm items-center flex-row justify-center gap-1.5 mt-2"
                  onPress={() => handleDownloadTemplate('alunos')}
                >
                  <Feather name="download" size={14} color="#00f3ff" />
                  <Text className="text-neonBlue font-bold uppercase tracking-widest text-[10px] font-mono">Baixar Modelo Excel (.xlsx)</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="w-full bg-neonBlue/10 border border-neonBlue/50 py-3.5 rounded-sm items-center flex-row justify-center gap-2 mb-4"
                onPress={() => handleSelectExcel('alunos')}
              >
                <Feather name="file" size={16} color="#00f3ff" />
                <Text className="text-neonBlue font-bold uppercase tracking-widest text-xs font-mono">Selecionar Planilha Excel</Text>
              </TouchableOpacity>

              <Text className="text-white/50 text-xs mb-2 uppercase font-bold mt-2">Vincular alunos importados à Turma:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ paddingHorizontal: 8 }}>
                <View className="flex-row gap-2">
                  {turmas.map((t) => (
                    <TouchableOpacity
                       key={t.id}
                       className={`px-4 py-2 rounded-sm border ${recrutTurmaId === t.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                       onPress={() => { setRecrutTurmaId(t.id); sounds.playSelect(); }}
                    >
                      <Text className={`text-xs font-bold uppercase ${recrutTurmaId === t.id ? 'text-white' : 'text-neonBlue/50'}`}>
                        {t.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {excelData && excelData.length > 0 && (
                <View className="bg-neonBlue/10 border border-neonBlue p-4 rounded-sm mb-6">
                  <Text className="text-neonBlue text-[10px] font-mono font-bold uppercase tracking-wider mb-2">⚡ PLANILHA CARREGADA</Text>
                  <Text className="text-white text-xs mb-3">Detectamos <Text className="font-bold text-neonBlue">{excelData.length}</Text> alunos.</Text>
                </View>
              )}
              
              <CyberSubmitButton
                title="Importar Planilha de Alunos"
                loadingTitle="Importando..."
                loading={recrutando}
                onPress={handleBatchRecrutarExcel}
              />
            </>
          )}
        </>
      )}

      {subTab === 'MESTRE' && (
        <>
          <View className="flex-row mb-6 bg-black/40 border border-neonBlue/20 rounded-sm p-1">
            <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${!useBatch ? 'bg-neonBlue/30' : ''}`} onPress={() => { setUseBatch(false); sounds.playSelect(); }}>
              <Text className={`font-bold uppercase text-[10px] ${!useBatch ? 'text-white' : 'text-neonBlue/50'}`}>Individual</Text>
            </TouchableOpacity>
            <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${useBatch ? 'bg-neonBlue/30' : ''}`} onPress={() => { setUseBatch(true); sounds.playSelect(); }}>
              <Text className={`font-bold uppercase text-[10px] ${useBatch ? 'text-white' : 'text-neonBlue/50'}`}>Lote (Excel)</Text>
            </TouchableOpacity>
          </View>

          {!useBatch ? (
            <View>
              <Text className="text-white/60 text-xs mb-4 text-center">
                {editingMasterId ? 'Transmutar dados do Mestre' : 'Forjar Novo Mestre individualmente'}
              </Text>

              <TextInput className="w-full bg-black/50 border border-neonBlue/50 text-white text-center py-3 rounded-sm mb-4" placeholder="Nome Completo" placeholderTextColor="#00f3ff40" value={nome} onChangeText={setNome} keyboardAppearance="dark" />
              <TextInput className="w-full bg-black/50 border border-neonBlue/50 text-white text-center py-3 rounded-sm mb-4" placeholder="Matrícula" placeholderTextColor="#00f3ff40" value={matricula} onChangeText={setMatricula} keyboardAppearance="dark" autoCapitalize="none" editable={!editingMasterId} />
              <TextInput className="w-full bg-black/50 border border-neonBlue/50 text-white text-center py-3 rounded-sm mb-4" placeholder="Carga Horária Contratual (horas)" placeholderTextColor="#00f3ff40" value={maxAulasSemanais} onChangeText={setMaxAulasSemanais} keyboardType="numeric" keyboardAppearance="dark" />

              {currentUser?.institution?.tipo && !currentUser.institution.tipo.startsWith('PRIVADO') && (
                <View className="mb-4">
                  <Text className="text-white/50 text-[10px] uppercase font-mono mb-2 text-center">Categoria:</Text>
                  <View className="flex-row gap-2">
                    {['CONCURSADO', 'REDA'].map((cat) => (
                      <TouchableOpacity key={cat} onPress={() => { setCategoria?.(cat as any); sounds.playSelect(); }} className={`flex-1 py-3 rounded-sm border ${categoria === cat ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/50 border-neonBlue/30'} items-center`}>
                        <Text className={`text-xs font-mono font-bold uppercase ${categoria === cat ? 'text-white' : 'text-neonBlue/50'}`}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View className="flex-row gap-3">
                {editingMasterId && (
                  <TouchableOpacity className="flex-1 border border-red-500/40 bg-red-500/10 py-4 rounded-sm items-center justify-center" onPress={cancelEditMaster} disabled={loading}>
                    <Text className="text-red-400 font-bold uppercase tracking-widest text-xs">Cancelar</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: editingMasterId ? 2 : 1 }}>
                  <CyberSubmitButton title={editingMasterId ? 'Salvar Alterações' : 'Criar Registro'} loadingTitle="Processando..." loading={!!loading} onPress={handleRegisterOrUpdateMaster!} textClassName="text-xs" />
                </View>
              </View>
            </View>
          ) : (
            <View>
              <View className="bg-black/40 border border-neonBlue/20 p-4 rounded-sm mb-4">
                <Text className="text-neonBlue text-[11px] font-bold uppercase tracking-widest mb-1.5">📊 Modelo de Planilha Excel</Text>
                <TouchableOpacity className="bg-neonBlue/20 border border-neonBlue/50 py-3 rounded-sm items-center flex-row justify-center gap-1.5 mt-2" onPress={() => handleDownloadTemplate('professores')}>
                  <Feather name="download" size={14} color="#00f3ff" />
                  <Text className="text-neonBlue font-bold uppercase tracking-widest text-[10px] font-mono">Baixar Modelo Excel (.xlsx)</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity className="w-full bg-neonBlue/10 border border-neonBlue/50 py-3.5 rounded-sm items-center flex-row justify-center gap-2 mb-4" onPress={() => handleSelectExcel('professores')}>
                <Feather name="file" size={16} color="#00f3ff" />
                <Text className="text-neonBlue font-bold uppercase tracking-widest text-xs font-mono">Selecionar Planilha Excel</Text>
              </TouchableOpacity>

              {excelData && excelData.length > 0 && (
                <View className="bg-neonBlue/10 border border-neonBlue p-4 rounded-sm mb-6">
                  <Text className="text-neonBlue text-[10px] font-mono font-bold uppercase tracking-wider mb-2">⚡ PLANILHA CARREGADA</Text>
                  <Text className="text-white text-xs mb-3">Detectamos <Text className="font-bold text-neonBlue">{excelData.length}</Text> professores.</Text>
                </View>
              )}

              <CyberSubmitButton title="Importar Mestres" loadingTitle="Importando..." loading={!!loading} onPress={handleBatchRegisterMastersExcel!} textClassName="text-xs" />
            </View>
          )}
        </>
      )}
    </View>
  );
}
