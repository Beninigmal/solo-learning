import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Linking, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from '../CyberSubmitButton';
import { getTemplateDownloadUrl } from '../../services/api';

interface SistemaTabProps {
  editingMasterId: string | null;
  nome: string;
  setNome: (val: string) => void;
  nickname: string;
  setNickname: (val: string) => void;
  matricula: string;
  setMatricula: (val: string) => void;
  loading: boolean;
  handleRegisterOrUpdateMaster: () => void;
  cancelEditMaster: () => void;
  masters: any[];
  loadingMasters: boolean;
  fetchMasters: () => void;
  handleEditMasterPress: (master: any) => void;
  selectedTurmaId: string;
  setSelectedTurmaId: (val: string) => void;
  turmas: any[];
  sounds: any;
  loadingStudents: boolean;
  students: any[];
  editingStudentId: string | null;
  setEditingStudentId: (val: string | null) => void;
  studentNome: string;
  setStudentNome: (val: string) => void;
  studentNickname: string;
  setStudentNickname: (val: string) => void;
  studentTurmaId: string;
  setStudentTurmaId: (val: string) => void;
  handleUpdateStudent: () => void;
  handleEditStudentPress: (student: any) => void;
  handleResetStudentAccess: (id: string) => void;
  handleResetMasterAccess: (id: string) => void;
  // Monarch Engine v3
  maxAulasSemanais: string;
  setMaxAulasSemanais: (val: string) => void;
  handleSelectExcel: (type: 'alunos' | 'professores') => void;
  handleUploadFile: (base64: string, type: 'alunos' | 'professores') => Promise<void>;
  excelData: any[];
  handleBatchRegisterMastersExcel: () => void;
  categoria: 'CONCURSADO' | 'REDA' | 'CLT';
  setCategoria: (val: 'CONCURSADO' | 'REDA' | 'CLT') => void;
  currentUser?: any;
  deleteRequests: any[];
  loadingDeleteRequests: boolean;
  handleConfirmDeleteRequest: (id: string) => void;
  handleRejectDeleteRequest: (id: string) => void;
}

export function SistemaTab({
  editingMasterId,
  nome,
  setNome,
  nickname,
  setNickname,
  matricula,
  setMatricula,
  loading,
  handleRegisterOrUpdateMaster,
  cancelEditMaster,
  masters,
  loadingMasters,
  fetchMasters,
  handleEditMasterPress,
  selectedTurmaId,
  setSelectedTurmaId,
  turmas,
  sounds,
  loadingStudents,
  students,
  editingStudentId,
  setEditingStudentId,
  studentNome,
  setStudentNome,
  studentNickname,
  setStudentNickname,
  studentTurmaId,
  setStudentTurmaId,
  handleUpdateStudent,
  handleEditStudentPress,
  handleResetStudentAccess,
  handleResetMasterAccess,
  // Monarch Engine v3
  maxAulasSemanais,
  setMaxAulasSemanais,
  handleSelectExcel,
  handleUploadFile,
  excelData,
  handleBatchRegisterMastersExcel,
  categoria,
  setCategoria,
  currentUser,
  deleteRequests,
  loadingDeleteRequests,
  handleConfirmDeleteRequest,
  handleRejectDeleteRequest,
}: SistemaTabProps) {

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
      handleUploadFile(base64, 'professores');
    };
    reader.readAsDataURL(file);
  };
  return (
    <>
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">
          {editingMasterId ? 'Transmutar Mestre' : 'Forjar Novo Mestre'}
        </Text>

        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Nome Completo"
          placeholderTextColor="#00f3ff40"
          value={nome}
          onChangeText={setNome}
        />

        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Matrícula"
          placeholderTextColor="#00f3ff40"
          value={matricula}
          onChangeText={setMatricula}
          autoCapitalize="none"
          editable={!editingMasterId}
        />

        <TextInput
          className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-base py-3 rounded-sm mb-4"
          placeholder="Carga Horária Contratual (horas, ex: 20, 24, 40)"
          placeholderTextColor="#00f3ff40"
          value={maxAulasSemanais}
          onChangeText={setMaxAulasSemanais}
          keyboardType="numeric"
        />

        {/* Seletor de Categoria se for Escola Pública */}
        {(() => {
          const instTipo = currentUser?.institution?.tipo || 'MUNICIPAL';
          const isPrivate = instTipo.startsWith('PRIVADO');
          if (isPrivate) return null;

          return (
            <View className="mb-4">
              <Text className="text-white/50 text-[10px] uppercase font-mono mb-2 text-center">Categoria de Contratação:</Text>
              <View className="flex-row gap-2">
                {['CONCURSADO', 'REDA'].map((cat) => {
                  const isSelected = categoria === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => { setCategoria(cat as any); sounds.playSelect(); }}
                      className={`flex-1 py-3 rounded-sm border ${isSelected ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/50 border-neonBlue/30'} items-center`}
                    >
                      <Text className={`text-xs font-mono font-bold uppercase ${isSelected ? 'text-white' : 'text-neonBlue/50'}`}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Prévia Dinâmica da Regra de 1/3 do MEC ou 80% REDA ou 100% CLT */}
        {(() => {
          const hours = parseInt(maxAulasSemanais) || 20;
          const instTipo = currentUser?.institution?.tipo || 'MUNICIPAL';
          const isPrivate = instTipo.startsWith('PRIVADO');
          const finalCat = isPrivate ? 'CLT' : categoria;

          let classes = 13;
          let label = 'Regra MEC 1/3';
          if (finalCat === 'CLT') {
            classes = hours;
            label = 'Regra CLT 1:1';
          } else if (finalCat === 'REDA') {
            classes = hours === 20 ? 16 : (hours === 40 ? 32 : Math.floor(hours * 0.8));
            label = 'Regra REDA 80%';
          } else {
            classes = hours === 20 ? 13 : (hours === 40 ? 26 : Math.floor(hours * (2 / 3)));
          }

          return (
            <Text className="text-neonBlue/80 text-[10px] text-center font-mono font-bold uppercase tracking-wider mb-6">
              ⚡ Limite em sala: {classes} aulas de 50 min ({label})
            </Text>
          );
        })()}

        <View className="flex-row gap-3">
          {editingMasterId && (
            <TouchableOpacity 
              className="flex-1 border border-red-500/40 bg-red-500/10 py-4 rounded-sm items-center justify-center"
              onPress={cancelEditMaster}
              disabled={loading}
            >
              <Text className="text-red-400 font-bold uppercase tracking-widest text-xs">Cancelar</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: editingMasterId ? 2 : 1 }}>
            <CyberSubmitButton
              title={editingMasterId ? 'Salvar Alterações' : 'Criar Registro'}
              loadingTitle="Processando..."
              loading={loading}
              onPress={handleRegisterOrUpdateMaster}
              textClassName="text-xs"
            />
          </View>
        </View>
      </View>

      {!editingMasterId && (
        <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
          <Text className="text-white text-base font-mono font-bold uppercase tracking-widest mb-4">
            ⚡ Importar Mestres em Lote
          </Text>
          <Text className="text-white/60 text-xs mb-5">
            Registre vários professores de uma vez usando uma planilha Excel. Baixe o modelo oficial abaixo.
          </Text>

          <TouchableOpacity
            className="bg-neonBlue/20 border border-neonBlue/50 py-3 rounded-sm items-center flex-row justify-center gap-1.5 mb-4"
            onPress={async () => {
              try {
                sounds.playSelect();
                const url = await getTemplateDownloadUrl('professores');
                if (Platform.OS === 'web') {
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'template_professores.xlsx';
                  link.click();
                } else {
                  await Linking.openURL(url);
                }
              } catch (e) {
                console.error(e);
              }
            }}
          >
            <Feather name="download" size={14} color="#00f3ff" />
            <Text className="text-neonBlue font-bold uppercase tracking-widest text-[10px] font-mono">
              Baixar Modelo Excel (.xlsx)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`w-full py-6 border border-dashed rounded-sm items-center justify-center flex-col gap-2.5 mb-4 ${
              isDragging 
                ? 'bg-yellow-500/10 border-yellow-500' 
                : 'bg-neonBlue/10 border-neonBlue/50'
            }`}
            onPress={() => handleSelectExcel('professores')}
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
                Detectamos <Text className="font-bold text-neonBlue">{excelData.length}</Text> professores prontos para importação.
              </Text>
              {excelData.slice(0, 4).map((prof, index) => (
                <Text key={index} className="text-white/50 text-[10px] font-mono mb-1">
                  • {prof.nome || 'Sem Nome'} - {prof.matricula || 'Sem Matrícula'} ({prof.cargahorariacontratual || prof.cargahoraria || prof.horas || 20}h)
                </Text>
              ))}
              {excelData.length > 4 && (
                <Text className="text-neonBlue/50 text-[9px] font-mono mt-1">
                  ...e mais {excelData.length - 4} professores.
                </Text>
              )}
            </View>
          )}

          <CyberSubmitButton
            title="Importar Mestres"
            loadingTitle="Importando..."
            loading={loading}
            onPress={handleBatchRegisterMastersExcel}
            textClassName="text-xs"
          />
        </View>
      )}

      {/* Guilda de Mestres */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-lg font-bold uppercase tracking-widest">Guilda de Mestres</Text>
          <TouchableOpacity onPress={() => { sounds.playSelect(); fetchMasters(); }}>
            <Feather name="refresh-cw" size={16} color="#00f3ff" />
          </TouchableOpacity>
        </View>

        {loadingMasters ? (
          <ActivityIndicator size="large" color="#00f3ff" className="my-4" />
        ) : masters.length === 0 ? (
          <Text className="text-white/30 text-center text-sm py-4">Nenhum mestre forjado ainda.</Text>
        ) : (
          masters.map((master) => {
            const dbVal = master.maxAulasSemanais ?? 13;
            const catVal = String(master.categoria || 'CONCURSADO').toUpperCase();
            let contractH = 20;
            if (catVal === 'CLT') {
              contractH = dbVal;
            } else if (catVal === 'REDA') {
              contractH = dbVal === 16 ? 20 : (dbVal === 32 ? 40 : Math.round(dbVal / 0.8));
            } else {
              contractH = dbVal === 13 ? 20 : (dbVal === 26 ? 40 : Math.round(dbVal * 1.5));
            }
            return (
              <View key={master.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3 flex-row justify-between items-center">
                <View className="flex-1 pr-2">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>{master.nome}</Text>
                  <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                    <Text className="text-neonBlue/70 text-xs" numberOfLines={1}>
                      @{master.nickname || 'sem-nickname'} · {master.matricula}
                    </Text>
                    <View className="bg-neonBlue/15 border border-neonBlue/30 px-1.5 py-0.5 rounded-sm">
                      <Text className="text-neonBlue text-[8px] font-extrabold font-mono uppercase">
                        Contrato: {contractH}h ({dbVal} aulas) [{catVal}]
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity 
                    className="bg-neonBlue/10 p-2 border border-neonBlue/30 rounded-sm"
                    onPress={() => { sounds.playSelect(); handleEditMasterPress(master); }}
                  >
                    <Feather name="edit-2" size={14} color="#00f3ff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="bg-yellow-950/20 p-2 border border-yellow-600/30 rounded-sm"
                    onPress={() => { sounds.playSelect(); handleResetMasterAccess(master.id); }}
                  >
                    <Feather name="key" size={14} color="#eab308" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ─── SEÇÃO DE ALUNOS ────────────────────────────────────────── */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">Controle de Players</Text>

        {/* Seletor de Turma */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ paddingHorizontal: 8 }}>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`px-4 py-2 rounded-sm border ${selectedTurmaId === '' ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
              onPress={() => { setSelectedTurmaId(''); sounds.playSelect(); }}
            >
              <Text className={`text-xs font-bold uppercase ${selectedTurmaId === '' ? 'text-white' : 'text-neonBlue/50'}`}>Todos</Text>
            </TouchableOpacity>
            {turmas.map((turma) => (
              <TouchableOpacity
                key={turma.id}
                className={`px-4 py-2 rounded-sm border ${selectedTurmaId === turma.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                onPress={() => { setSelectedTurmaId(turma.id); sounds.playSelect(); }}
              >
                <Text className={`text-xs font-bold uppercase ${selectedTurmaId === turma.id ? 'text-white' : 'text-neonBlue/50'}`}>
                  {turma.nome} ({turma.ano})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loadingStudents ? (
          <ActivityIndicator size="large" color="#00f3ff" className="my-4" />
        ) : students.length === 0 ? (
          <Text className="text-white/30 text-center text-sm py-4">Nenhum aluno encontrado.</Text>
        ) : (
          students.map((student) => (
            <View key={student.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3">
              {editingStudentId === student.id ? (
                // Modo Edição
                <View>
                  <TextInput
                    className="w-full bg-black border border-neonBlue text-white text-sm py-2 px-3 rounded-sm mb-2"
                    value={studentNome}
                    onChangeText={setStudentNome}
                    placeholder="Nome do Aluno"
                    placeholderTextColor="#00f3ff40"
                  />
                  <TextInput
                    className="w-full bg-black border border-neonBlue text-white text-sm py-2 px-3 rounded-sm mb-3"
                    value={studentNickname}
                    onChangeText={setStudentNickname}
                    placeholder="Nickname"
                    placeholderTextColor="#00f3ff40"
                  />
                  
                  {/* Seletor de Turma para Transferência */}
                  <Text className="text-neonBlue/70 text-[10px] mb-2 uppercase font-bold">Transferir de Turma</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 8 }}>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className={`px-3 py-1.5 rounded-sm border ${studentTurmaId === '' ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                        onPress={() => { setStudentTurmaId(''); sounds.playSelect(); }}
                      >
                        <Text className={`text-[10px] font-bold uppercase ${studentTurmaId === '' ? 'text-white' : 'text-neonBlue/50'}`}>Sem Turma</Text>
                      </TouchableOpacity>
                      {turmas.map((turma) => (
                        <TouchableOpacity
                          key={turma.id}
                          className={`px-3 py-1.5 rounded-sm border ${studentTurmaId === turma.id ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                          onPress={() => { setStudentTurmaId(turma.id); sounds.playSelect(); }}
                        >
                          <Text className={`text-[10px] font-bold uppercase ${studentTurmaId === turma.id ? 'text-white' : 'text-neonBlue/50'}`}>
                            {turma.nome}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <View className="flex-row gap-2">
                    <TouchableOpacity 
                      className="flex-1 bg-red-900/20 border border-red-500/50 py-2 rounded-sm items-center"
                      onPress={() => { sounds.playSelect(); setEditingStudentId(null); }}
                    >
                      <Text className="text-red-400 text-xs font-bold uppercase">Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="flex-1 bg-neonBlue/20 border border-neonBlue py-2 rounded-sm items-center"
                      onPress={() => { sounds.playSelect(); handleUpdateStudent(); }}
                    >
                      <Text className="text-neonBlue text-xs font-bold uppercase">Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // Modo Visualização
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 pr-2">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>{student.nome}</Text>
                    <Text className="text-neonBlue/70 text-xs mt-1" numberOfLines={1}>
                      @{student.nickname || 'sem-nickname'} · {student.matricula}
                    </Text>
                    <Text className="text-white/30 text-[10px] mt-1">
                      Turma: {student.turma?.nome || 'Sem Turma'}
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity 
                      className="bg-neonBlue/10 p-2 border border-neonBlue/30 rounded-sm"
                      onPress={() => handleEditStudentPress(student)}
                    >
                      <Feather name="edit-2" size={14} color="#00f3ff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="bg-yellow-950/20 p-2 border border-yellow-600/30 rounded-sm"
                      onPress={() => handleResetStudentAccess(student.id)}
                    >
                      <Feather name="key" size={14} color="#eab308" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* ─── SEÇÃO DE SOLICITAÇÕES DE EXCLUSÃO ────────────────────────── */}
      <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
        <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">Exclusão de Contas</Text>
        
        {loadingDeleteRequests ? (
          <ActivityIndicator size="large" color="#00f3ff" className="my-4" />
        ) : deleteRequests.length === 0 ? (
          <Text className="text-white/30 text-center text-sm py-4">Nenhuma solicitação de exclusão pendente.</Text>
        ) : (
          deleteRequests.map((req) => (
            <View key={req.id} className="bg-black/50 border border-red-500/30 p-4 rounded-sm mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-white font-bold text-sm">{req.nome}</Text>
                  <Text className="text-red-400 text-xs font-mono mt-0.5 uppercase tracking-wide">
                    {req.role === 'PROFESSOR' ? 'Mestre' : 'Caçador'} · Matrícula: {req.matricula}
                  </Text>
                </View>
                <View className="bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-sm">
                  <Text className="text-red-400 text-[8px] font-bold uppercase font-mono">Aguardando</Text>
                </View>
              </View>

              <View className="mt-2 bg-black/45 border border-white/5 p-3 rounded-sm mb-3">
                <Text className="text-white/40 text-[9px] uppercase font-bold tracking-wider mb-1 font-mono">Motivo Informado:</Text>
                <Text className="text-white/80 text-xs leading-relaxed italic">"{req.motivo}"</Text>
                
                <Text className="text-white/40 text-[9px] uppercase font-bold tracking-wider mt-2.5 mb-1 font-mono">E-mail para Contato:</Text>
                <Text className="text-neonBlue text-xs font-mono">{req.email}</Text>
              </View>

              <View className="flex-row gap-2 mt-2">
                <TouchableOpacity
                  onPress={() => { sounds.playSelect(); handleRejectDeleteRequest(req.id); }}
                  className="flex-1 bg-green-950/20 border border-green-500/30 py-2.5 rounded-sm items-center justify-center flex-row gap-1.5"
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={13} color="#22c55e" />
                  <Text className="text-green-400 font-bold uppercase tracking-widest text-[9px] font-mono">Manter Conta</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { sounds.playSelect(); handleConfirmDeleteRequest(req.id); }}
                  className="flex-1 bg-red-950/20 border border-red-500/50 py-2.5 rounded-sm items-center justify-center flex-row gap-1.5"
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={13} color="#ef4444" />
                  <Text className="text-red-400 font-bold uppercase tracking-widest text-[9px] font-mono">Confirmar Exclusão</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
}
