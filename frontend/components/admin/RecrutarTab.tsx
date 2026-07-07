import React from 'react';
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
  handleUploadFile: (base64: string, type: 'alunos' | 'professores') => Promise<void>;
  excelData: any[];
  handleBatchRecrutarExcel: () => void;
  sounds: any;
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
  handleUploadFile,
  excelData,
  handleBatchRecrutarExcel,
  sounds,
}: RecrutarTabProps) {

  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: any) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (Platform.OS !== 'web') return;
    setIsDragging(false);
  };

  const handleDrop = async (e: any) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0] || e.nativeEvent?.dataTransfer?.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      sounds.playError?.() || sounds.playSelect();
      return;
    }

    sounds.playSelect();
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      const base64 = resultStr.split(',')[1];
      handleUploadFile(base64, 'alunos');
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      sounds.playSelect();
      const url = await getTemplateDownloadUrl('alunos');
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'template_alunos.xlsx';
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
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-4">Recrutar Caçador</Text>
      
      {/* Toggle Individual vs Batch */}
      <View className="flex-row mb-6 bg-black/40 border border-neonBlue/20 rounded-sm p-1">
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${!useBatch ? 'bg-neonBlue/30' : ''}`} onPress={() => { setUseBatch(false); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-[10px] ${!useBatch ? 'text-white' : 'text-neonBlue/50'}`}>Individual</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${useBatch ? 'bg-neonBlue/30' : ''}`} onPress={() => { setUseBatch(true); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-[10px] ${useBatch ? 'text-white' : 'text-neonBlue/50'}`}>Lote (Excel)</Text>
        </TouchableOpacity>
      </View>

      {!useBatch && (
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
        </>
      )}

      {!useBatch ? (
        <>
          <TextInput className="w-full bg-black/50 border border-neonBlue/50 text-white text-center py-3 rounded-sm mb-4" style={{ flexShrink: 0 }} placeholder="Nome Completo" placeholderTextColor="#00f3ff40" value={recrutStudentNome} onChangeText={setRecrutStudentNome} keyboardAppearance="dark" />
          <TextInput className="w-full bg-black/50 border border-neonBlue/50 text-white text-center py-3 rounded-sm mb-6" style={{ flexShrink: 0 }} placeholder="Matrícula" placeholderTextColor="#00f3ff40" value={recrutStudentMatricula} onChangeText={setRecrutStudentMatricula} keyboardAppearance="dark" autoCapitalize="none" />
          
          <CyberSubmitButton
            title="Recrutar Caçador"
            loadingTitle="Recrutando..."
            loading={recrutando}
            onPress={handleRecrutar}
          />
        </>
      ) : (
        <>
          {/* Template Excel Card */}
          <View className="bg-black/40 border border-neonBlue/20 p-4 rounded-sm mb-4">
            <Text className="text-neonBlue text-[11px] font-bold uppercase tracking-widest mb-1.5">📊 Modelo de Planilha Excel</Text>
            <Text className="text-white/60 text-[10px] leading-relaxed mb-4">
              Baixe o template oficial em Excel (.xlsx) com a estrutura correta. Preencha os dados dos alunos e envie o arquivo.
            </Text>
            
            <TouchableOpacity
              className="bg-neonBlue/20 border border-neonBlue/50 py-3 rounded-sm items-center flex-row justify-center gap-1.5"
              onPress={handleDownloadTemplate}
            >
              <Feather name="download" size={14} color="#00f3ff" />
              <Text className="text-neonBlue font-bold uppercase tracking-widest text-[10px] font-mono">Baixar Modelo Excel (.xlsx)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={`w-full py-6 border border-dashed rounded-sm items-center justify-center flex-col gap-2.5 mb-4 ${
              isDragging 
                ? 'bg-yellow-500/10 border-yellow-500' 
                : 'bg-neonBlue/10 border-neonBlue/50'
            }`}
            onPress={() => handleSelectExcel('alunos')}
            {...({
              onDragOver: handleDragOver,
              onDragLeave: handleDragLeave,
              onDrop: handleDrop
            } as any)}
          >
            <Feather name={isDragging ? "upload-cloud" : "upload"} size={20} color={isDragging ? "#eab308" : "#00f3ff"} />
            <Text className={`font-mono text-xs uppercase tracking-widest ${isDragging ? 'text-yellow-500 font-bold' : 'text-neonBlue'}`}>
              {isDragging ? 'Soltar Planilha Excel' : 'Importar Planilha'}
            </Text>
            {Platform.OS === 'web' && !isDragging && (
              <Text className="text-[9px] text-white/30 uppercase tracking-wider font-mono">
                Ou arraste e solte o arquivo aqui
              </Text>
            )}
          </TouchableOpacity>

          {excelData && excelData.length > 0 && (
            <View className="bg-neonBlue/10 border border-neonBlue p-4 rounded-sm mb-6">
              <Text className="text-neonBlue text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                ⚡ PLANILHA CARREGADA
              </Text>
              <Text className="text-white text-xs mb-3">
                Detectamos <Text className="font-bold text-neonBlue">{excelData.length}</Text> alunos prontos para importação.
              </Text>
              {excelData.slice(0, 4).map((student, index) => (
                <Text key={index} className="text-white/50 text-[10px] font-mono mb-1">
                  • {student.nome || 'Sem Nome'} ({student.matricula || 'Sem Matrícula'}) {student.turma ? `[Turma: ${student.turma}]` : ''}
                </Text>
              ))}
              {excelData.length > 4 && (
                <Text className="text-neonBlue/50 text-[9px] font-mono mt-1">
                  ...e mais {excelData.length - 4} caçadores.
                </Text>
              )}
            </View>
          )}
          
          <CyberSubmitButton
            title="Importar Planilha"
            loadingTitle="Importando..."
            loading={recrutando}
            onPress={handleBatchRecrutarExcel}
          />
        </>
      )}
    </View>
  );
}
