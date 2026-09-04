import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { YearPicker } from '../YearPicker';
import { SelectPicker } from '../SelectPicker';
import { getCurrentInstitution, updateInstitutionRegimeLetivo } from '../../services/api';

interface ArquitetoTabProps {
  turmas: any[];
  expandedTurmaId: string | null;
  setExpandedTurmaId: (val: string | null) => void;
  expandedMembersId: string | null;
  setExpandedMembersId: (val: string | null) => void;
  handleFetchStudentStats: (student: any) => void;
  expandedLinkId: string | null;
  setExpandedLinkId: (val: string | null) => void;
  handleUnlinkProfessorFromClass: (vinculoId: string) => void;
  goldenQuestionText: string;
  setGoldenQuestionText: (val: string) => void;
  goldenQuestionTurmaId: string;
  setGoldenQuestionTurmaId: (val: string) => void;
  loadingGolden: boolean;
  handleSendGoldenQuestion: () => void;
  goldenQuestionsList: any[];
  expandedQuestionId: string | null;
  setExpandedQuestionId: (val: string | null) => void;
  sounds: any;

  // Novos props movidos do SistemaTab
  masters?: any[];
  loadingMasters?: boolean;
  fetchMasters?: () => void;
  handleEditMasterPress?: (master: any) => void;
  handleResetMasterAccess?: (id: string) => void;

  students?: any[];
  loadingStudents?: boolean;
  handleEditStudentPress?: (student: any) => void;
  handleResetStudentAccess?: (id: string) => void;

  deleteRequests?: any[];
  loadingDeleteRequests?: boolean;
  handleConfirmDeleteRequest?: (id: string) => void;
  handleRejectDeleteRequest?: (id: string) => void;

  handleDeleteUser?: (id: string, role: string) => void;
  showAlert?: (title: string, message: string, type?: 'success'|'error'|'warning'|'info', buttons?: any[]) => void;

  // Master Edit Props
  editingMasterId?: string | null;
  nome?: string;
  setNome?: (val: string) => void;
  matricula?: string;
  setMatricula?: (val: string) => void;
  maxAulasSemanais?: string;
  setMaxAulasSemanais?: (val: string) => void;
  categoria?: 'CONCURSADO' | 'REDA' | 'CLT';
  setCategoria?: (val: 'CONCURSADO' | 'REDA' | 'CLT') => void;
  loading?: boolean;
  handleRegisterOrUpdateMaster?: () => void;
  cancelEditMaster?: () => void;

  // Student Edit Props
  editingStudentId?: string | null;
  studentNome?: string;
  setStudentNome?: (val: string) => void;
  studentNickname?: string;
  setStudentNickname?: (val: string) => void;
  studentTurmaId?: string;
  setStudentTurmaId?: (val: string) => void;
  handleUpdateStudent?: () => void;
  cancelEditStudent?: () => void;
}

export function ArquitetoTab({
  turmas,
  expandedTurmaId,
  setExpandedTurmaId,
  expandedMembersId,
  setExpandedMembersId,
  handleFetchStudentStats,
  expandedLinkId,
  setExpandedLinkId,
  handleUnlinkProfessorFromClass,
  goldenQuestionText,
  setGoldenQuestionText,
  goldenQuestionTurmaId,
  setGoldenQuestionTurmaId,
  loadingGolden,
  handleSendGoldenQuestion,
  goldenQuestionsList,
  expandedQuestionId,
  setExpandedQuestionId,
  sounds,
  
  masters = [],
  loadingMasters = false,
  fetchMasters,
  handleEditMasterPress,
  handleResetMasterAccess,

  students = [],
  loadingStudents = false,
  handleEditStudentPress,
  handleResetStudentAccess,

  deleteRequests = [],
  loadingDeleteRequests = false,
  handleConfirmDeleteRequest,
  handleRejectDeleteRequest,

  handleDeleteUser,
  showAlert,

  editingMasterId,
  nome,
  setNome,
  matricula,
  setMatricula,
  maxAulasSemanais,
  setMaxAulasSemanais,
  categoria,
  setCategoria,
  loading,
  handleRegisterOrUpdateMaster,
  cancelEditMaster,

  editingStudentId,
  studentNome,
  setStudentNome,
  studentNickname,
  setStudentNickname,
  studentTurmaId,
  setStudentTurmaId,
  handleUpdateStudent,
  cancelEditStudent
}: ArquitetoTabProps) {
  const [subTab, setSubTab] = useState<'VISAO_GERAL' | 'REGIME_LETIVO' | 'SISTEMA' | 'MESTRES' | 'PLAYERS'>('VISAO_GERAL');

  const [currentInst, setCurrentInst] = useState<any>(null);
  const [loadingInst, setLoadingInst] = useState(false);
  const [savingRegime, setSavingRegime] = useState(false);
  const [regimeQtd, setRegimeQtd] = useState(3);
  const [regimeDivisao, setRegimeDivisao] = useState('UNIDADE');

  const fetchInst = async () => {
    try {
      setLoadingInst(true);
      const data = await getCurrentInstitution();
      setCurrentInst(data);
      setRegimeQtd(data.qtdUnidades || 3);
      setRegimeDivisao(data.tipoDivisao || 'UNIDADE');
    } catch (e) {
      console.error('Erro ao carregar dados da instituição:', e);
    } finally {
      setLoadingInst(false);
    }
  };

  useEffect(() => {
    fetchInst();
  }, []);

  const handleSaveRegime = async () => {
    try {
      setSavingRegime(true);
      sounds.playSelect();
      await updateInstitutionRegimeLetivo(regimeQtd, regimeDivisao);
      sounds.playSuccess();
      if (showAlert) showAlert('SUCESSO', 'Regime letivo atualizado com sucesso!', 'success');
      else Alert.alert('Sucesso', 'Regime letivo atualizado com sucesso!');
      fetchInst();
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Erro ao atualizar regime letivo.';
      sounds.playError();
      if (showAlert) showAlert('ERRO', msg, 'error');
      else Alert.alert('Erro', msg);
    } finally {
      setSavingRegime(false);
    }
  };

  const currentYear = new Date().getFullYear().toString();
  const [filterMasterYear, setFilterMasterYear] = useState(currentYear);
  const [filterMasterName, setFilterMasterName] = useState('');

  const [filterPlayerYear, setFilterPlayerYear] = useState(currentYear);
  const [filterPlayerName, setFilterPlayerName] = useState('');
  const [filterPlayerTurma, setFilterPlayerTurma] = useState('');

  const confirmDeleteUser = (id: string, nomeStr: string, role: string) => {
    sounds.playSelect();
    if (showAlert) {
      showAlert(
        "Atenção!",
        `Tem certeza que deseja apagar permanentemente o ${role} ${nomeStr}? Isso removerá todos os vínculos!`,
        'warning',
        [
          { text: "Apagar", style: "danger", onPress: () => handleDeleteUser?.(id, role) },
          { text: "Cancelar", style: "cancel" }
        ]
      );
    } else {
      Alert.alert(
        "Atenção!",
        `Tem certeza que deseja apagar permanentemente o ${role} ${nomeStr}? Isso removerá todos os vínculos!`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Apagar", style: "destructive", onPress: () => handleDeleteUser?.(id, role) }
        ]
      );
    }
  };

  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-neonBlue text-lg font-bold uppercase tracking-widest mb-4">Arquitetura do Sistema</Text>
      
      {/* Sub-tabs Arquiteto */}
      <View className="flex-row mb-6 bg-black/40 border border-neonBlue/20 rounded-sm p-1">
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${subTab === 'VISAO_GERAL' ? 'bg-neonBlue/30' : ''}`} onPress={() => { setSubTab('VISAO_GERAL'); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-[9px] ${subTab === 'VISAO_GERAL' ? 'text-white' : 'text-neonBlue/50'}`}>Visão Geral</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${subTab === 'REGIME_LETIVO' ? 'bg-neonBlue/30' : ''}`} onPress={() => { setSubTab('REGIME_LETIVO'); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-[9px] ${subTab === 'REGIME_LETIVO' ? 'text-white' : 'text-neonBlue/50'}`}>Regime Letivo</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${subTab === 'SISTEMA' ? 'bg-neonBlue/30' : ''}`} onPress={() => { setSubTab('SISTEMA'); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-[9px] ${subTab === 'SISTEMA' ? 'text-white' : 'text-neonBlue/50'}`}>Sistema LGPD</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${subTab === 'MESTRES' ? 'bg-neonBlue/30' : ''}`} onPress={() => { setSubTab('MESTRES'); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-[9px] ${subTab === 'MESTRES' ? 'text-white' : 'text-neonBlue/50'}`}>Mestres</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`flex-1 py-2 items-center rounded-sm ${subTab === 'PLAYERS' ? 'bg-neonBlue/30' : ''}`} onPress={() => { setSubTab('PLAYERS'); sounds.playSelect(); }}>
          <Text className={`font-bold uppercase text-[9px] ${subTab === 'PLAYERS' ? 'text-white' : 'text-neonBlue/50'}`}>Players</Text>
        </TouchableOpacity>
      </View>

      {/* ─── VISÃO GERAL (Antigo conteúdo completo da aba Arquiteto) ─── */}
      {subTab === 'VISAO_GERAL' && (
        <View>
          <Text className="text-white/30 text-xs mb-6">Painel analítico das turmas e alunos.</Text>
          <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Turmas Ativas</Text>
          {turmas.length === 0 ? (
            <Text className="text-white/30 text-sm text-center mb-6">Nenhuma turma cadastrada.</Text>
          ) : (
            turmas.map((t: any) => {
              const isExpanded = expandedTurmaId === t.id;
              return (
                <View key={t.id} className={`bg-black/50 border ${isExpanded ? 'border-neonBlue' : 'border-neonBlue/20'} p-4 rounded-sm mb-3`}>
                  <TouchableOpacity
                    className="flex-row justify-between items-center"
                    onPress={() => { sounds.playSelect(); setExpandedTurmaId(isExpanded ? null : t.id); }}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text className="text-white font-bold text-base">{t.nome}</Text>
                      <Text className="text-white/40 text-xs mt-1">{t.users?.length ?? 0} alunos • Cód: {t.codigoInvocacao}</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-neonBlue/50 text-xs font-mono">{t.ano}</Text>
                      <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#00f3ff" />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View className="mt-4 border-t border-neonBlue/25 pt-3">
                      <View className="mt-4 border-t border-neonBlue/25 pt-4">
                        <TouchableOpacity 
                          className="flex-row justify-between items-center bg-black/40 p-3 rounded-sm border border-neonBlue/20"
                          onPress={() => { sounds.playSelect(); setExpandedMembersId(expandedMembersId === t.id ? null : t.id); }}
                          activeOpacity={0.7}
                        >
                          <Text className="text-neonBlue text-[10px] font-bold uppercase tracking-widest font-mono">⚡ Membros da Turma ({t.users?.length || 0})</Text>
                          <Feather name={expandedMembersId === t.id ? 'chevron-up' : 'chevron-down'} size={14} color="#00f3ff" />
                        </TouchableOpacity>
                        {expandedMembersId === t.id && (
                          <View className="mt-2 bg-black/20 p-3 rounded-sm border border-white/5">
                            {(!t.users || t.users.length === 0) ? (
                              <Text className="text-white/30 text-xs italic py-2 text-center">Nenhum aluno recrutado nesta turma.</Text>
                            ) : (
                              t.users.map((student: any) => (
                                <TouchableOpacity
                                  key={student.id}
                                  className="flex-row justify-between items-center py-2.5 border-b border-white/5"
                                  onPress={() => handleFetchStudentStats(student)}
                                  activeOpacity={0.7}
                                >
                                  <View className="flex-1 pr-2">
                                    <Text className="text-white font-bold text-sm">{student.nome}</Text>
                                    <Text className="text-white/40 text-[10px] mt-0.5 font-mono">@{student.nickname || 'sem-nick'} · {student.matricula}</Text>
                                  </View>
                                  <View className="flex-row items-center gap-3">
                                    <View className="bg-neonBlue/10 border border-neonBlue/30 px-2 py-0.5 rounded-full">
                                      <Text className="text-neonBlue text-[9px] font-bold font-mono">UNID {t.unidade || 1}</Text>
                                    </View>
                                    <Text className="text-yellow-500 font-bold font-mono text-xs">+{student.xp} XP</Text>
                                    <Feather name="bar-chart-2" size={14} color="#eab308" />
                                  </View>
                                </TouchableOpacity>
                              ))
                            )}
                          </View>
                        )}
                      </View>

                      <View className="mt-4 mb-4">
                        <TouchableOpacity 
                          className="flex-row justify-between items-center bg-black/40 p-3 rounded-sm border border-neonBlue/20"
                          onPress={() => { sounds.playSelect(); setExpandedLinkId(expandedLinkId === t.id ? null : t.id); }}
                          activeOpacity={0.7}
                        >
                          <Text className="text-neonBlue text-[10px] font-bold uppercase tracking-widest font-mono">🧙‍♂️ Professores & Matérias ({t.turmaDisciplinas?.length || 0})</Text>
                          <Feather name={expandedLinkId === t.id ? 'chevron-up' : 'chevron-down'} size={14} color="#00f3ff" />
                        </TouchableOpacity>
                        {expandedLinkId === t.id && (
                          <View className="mt-2 p-3 bg-black/20 rounded-sm border border-white/5">
                            {(!t.turmaDisciplinas || t.turmaDisciplinas.length === 0) ? (
                              <Text className="text-white/30 text-xs italic py-3 text-center mb-4 border border-neonBlue/10 bg-black/30 rounded-sm">
                                Nenhum professor ou matéria vinculados a esta turma.
                              </Text>
                            ) : (
                              t.turmaDisciplinas.map((td: any) => (
                                <View key={td.id} className="flex-row justify-between items-center py-2.5 border-b border-white/5">
                                  <View>
                                    <Text className="text-white font-bold text-sm">{td.professor?.nickname || td.professor?.nome || 'Sem Nome'}</Text>
                                    <Text className="text-neonBlue/60 text-[10px] mt-0.5 font-mono uppercase">{td.disciplina?.nome || 'Sem Disciplina'}</Text>
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => { sounds.playSelect(); handleUnlinkProfessorFromClass(td.id); }}
                                    className="bg-red-950/20 border border-red-500/30 p-1.5 rounded-sm"
                                    activeOpacity={0.7}
                                  >
                                    <Feather name="trash-2" size={12} color="#ef4444" />
                                  </TouchableOpacity>
                                </View>
                              ))
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View className="mt-4 border-t border-neonBlue/20 pt-6">
            <Text className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-1">Pergunta Dourada</Text>
            <Text className="text-white/40 text-xs mb-4">Envie uma pergunta de feedback prioritária para os alunos. Sem XP, sem pressão — apenas feedback.</Text>
            
            <TextInput
              className="w-full bg-black/60 border border-yellow-500/40 text-white p-4 rounded-sm text-sm mb-4"
              placeholder="Ex: Qual conteúdo de Matemática você sentiu mais dificuldade esta semana?"
              placeholderTextColor="#eab30830"
              multiline
              numberOfLines={3}
              value={goldenQuestionText}
              onChangeText={setGoldenQuestionText}
            />

            <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Selecionar Turma Alvo</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {turmas.map((t: any) => (
                <TouchableOpacity
                  key={t.id}
                  className={`px-3 py-2 rounded-sm border ${goldenQuestionTurmaId === t.id ? 'bg-yellow-500/20 border-yellow-500' : 'bg-black/50 border-yellow-500/20'}`}
                  onPress={() => { setGoldenQuestionTurmaId(t.id); sounds.playSelect(); }}
                >
                  <Text className={`text-xs font-bold uppercase ${goldenQuestionTurmaId === t.id ? 'text-white' : 'text-yellow-500/60'}`}>{t.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="w-full bg-yellow-500 border border-yellow-600 py-3 rounded-sm items-center mb-6"
              onPress={() => { sounds.playSelect(); handleSendGoldenQuestion(); }}
              disabled={loadingGolden}
            >
              {loadingGolden ? <ActivityIndicator size="small" color="#000" /> : <Text className="text-black font-bold uppercase tracking-widest text-xs">Disparar Pergunta Dourada</Text>}
            </TouchableOpacity>

            <Text className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-3 border-t border-neonBlue/20 pt-6">Perguntas Douradas Ativas</Text>
            {goldenQuestionsList.length === 0 ? (
              <Text className="text-white/20 text-xs text-center italic py-4">Nenhuma pergunta dourada enviada ainda.</Text>
            ) : (
              goldenQuestionsList.map((q: any) => {
                const isExpanded = expandedQuestionId === q.id;
                return (
                  <View key={q.id} className="bg-black/40 border border-yellow-500/20 p-4 rounded-sm mb-3">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-yellow-500 text-xs font-mono font-bold uppercase">Turma: {q.turmaNome}</Text>
                        <Text className="text-white font-bold text-sm mt-1">{q.enunciado}</Text>
                      </View>
                      <View className="items-end ml-2">
                        <Text className="text-white/40 text-[10px] font-mono">{new Date(q.createdAt).toLocaleDateString('pt-BR')}</Text>
                        <Text className="text-yellow-400/80 text-[10px] font-bold font-mono mt-1">{q.taxaResposta}% Respondido</Text>
                      </View>
                    </View>
                    <View className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                      <View style={{ width: `${q.taxaResposta}%` }} className="h-full bg-yellow-500" />
                    </View>
                    <TouchableOpacity
                      className="flex-row justify-between items-center bg-yellow-500/10 px-3 py-2 rounded-sm"
                      onPress={() => { sounds.playSelect(); setExpandedQuestionId(isExpanded ? null : q.id); }}
                    >
                      <Text className="text-yellow-500 font-bold uppercase text-[10px] tracking-widest">Ver Respostas ({q.respostasContadas}/{q.totalAlunos})</Text>
                      <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#eab308" />
                    </TouchableOpacity>
                    {isExpanded && (
                      <View className="mt-3 border-t border-yellow-500/10 pt-3">
                        {q.respostas.length === 0 ? (
                          <Text className="text-white/30 text-xs text-center py-2">Nenhum aluno respondeu ainda.</Text>
                        ) : (
                          q.respostas.map((r: any) => (
                            <View key={r.id} className="bg-black/30 border border-white/5 p-3 rounded-sm mb-2">
                              <View className="flex-row justify-between mb-1">
                                <Text className="text-white font-bold text-[10px]">{r.alunoNome}</Text>
                                <Text className="text-white/40 text-[8px] font-mono">{r.alunoMatricula}</Text>
                              </View>
                              <Text className="text-white/70 text-xs mt-1 italic">"{r.resposta}"</Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      {/* ─── REGIME LETIVO DA INSTITUIÇÃO ─── */}
      {subTab === 'REGIME_LETIVO' && (
        <View>
          <Text className="text-white text-base font-bold uppercase tracking-widest mb-1">Regime Letivo da Instituição</Text>
          <Text className="text-white/40 text-xs mb-6 font-mono">Gerenciamento do calendário e das divisões de estudo do ano letivo.</Text>

          {loadingInst ? (
            <ActivityIndicator size="large" color="#00f3ff" className="my-8" />
          ) : !currentInst ? (
            <Text className="text-white/40 text-center py-6 font-mono text-xs">Dados da instituição não encontrados.</Text>
          ) : (
            <View className="bg-black/50 border border-neonBlue/30 p-5 rounded-sm">
              <View className="flex-row items-center justify-between pb-4 border-b border-neonBlue/20 mb-4">
                <View>
                  <Text className="text-white font-bold font-mono text-sm uppercase">{currentInst.nome}</Text>
                  <Text className="text-neonBlue/60 text-xs font-mono mt-0.5 uppercase">
                    Tipo: {currentInst.tipo || 'MUNICIPAL'} • Plano: {currentInst.plano || 'TRIAL'}
                  </Text>
                </View>
                <View className="bg-neonBlue/10 border border-neonBlue/30 px-3 py-1 rounded-sm">
                  <Text className="text-neonBlue font-mono text-xs font-bold uppercase">
                    {currentInst.qtdUnidades || 3} {currentInst.tipoDivisao === 'BIMESTRE' ? 'Bimestres' : currentInst.tipoDivisao === 'TRIMESTRE' ? 'Trimestres' : currentInst.tipoDivisao === 'SEMESTRE' ? 'Semestres' : 'Unidades'}
                  </Text>
                </View>
              </View>

              {/* Se for pública: Aviso e trava */}
              {(currentInst.tipo === 'MUNICIPAL' || currentInst.tipo === 'ESTADUAL') ? (
                <View className="bg-neonBlue/10 border border-neonBlue/30 p-4 rounded-sm">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Feather name="lock" size={16} color="#00f3ff" />
                    <Text className="text-neonBlue font-mono text-xs font-bold uppercase">Regime Público Padrão MEC</Text>
                  </View>
                  <Text className="text-white/70 text-xs font-mono leading-5">
                    Como instituição pública ({currentInst.tipo === 'MUNICIPAL' ? 'Rede Municipal' : 'Rede Estadual'}), o regime letivo é padronizado e fixado em <Text className="text-neonBlue font-bold">3 Unidades</Text> anuais conforme as diretrizes pedagógicas da BNCC e MEC.
                  </Text>
                </View>
              ) : (
                /* Se for privada ou livre: Gestão flexível */
                <View>
                  <Text className="text-white/70 text-xs font-mono mb-3 uppercase font-bold">
                    {currentInst.tipo === 'PRIVADO_LIVRE' ? 'Divisão do Curso / Ano Letivo Livre:' : 'Divisão do Ano Letivo da Escola:'}
                  </Text>

                  {currentInst.tipo === 'PRIVADO' ? (
                    <View className="flex-row gap-3 mb-6">
                      {[
                        { label: '4 Bimestres', qtd: 4, tipo: 'BIMESTRE' },
                        { label: '3 Trimestres', qtd: 3, tipo: 'TRIMESTRE' },
                        { label: '3 Unidades', qtd: 3, tipo: 'UNIDADE' }
                      ].map((opt) => {
                        const isSelected = regimeQtd === opt.qtd && regimeDivisao === opt.tipo;
                        return (
                          <TouchableOpacity
                            key={opt.label}
                            onPress={() => {
                              setRegimeQtd(opt.qtd);
                              setRegimeDivisao(opt.tipo);
                              sounds.playSelect();
                            }}
                            className={`flex-1 py-3 px-2 rounded-sm border items-center justify-center ${
                              isSelected ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/20'
                            }`}
                          >
                            <Text className={`font-mono text-xs font-bold uppercase ${isSelected ? 'text-white' : 'text-neonBlue/60'}`}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    /* PRIVADO_LIVRE */
                    <View className="mb-6">
                      <View className="flex-row flex-wrap gap-2 mb-4">
                        {[
                          { id: 'BIMESTRE', label: 'Bimestres (4)', defaultQtd: 4 },
                          { id: 'TRIMESTRE', label: 'Trimestres (3)', defaultQtd: 3 },
                          { id: 'SEMESTRE', label: 'Semestres (2)', defaultQtd: 2 },
                          { id: 'UNIDADE', label: 'Unidades', defaultQtd: 3 }
                        ].map((opt) => {
                          const isSelected = regimeDivisao === opt.id;
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              onPress={() => {
                                setRegimeDivisao(opt.id);
                                setRegimeQtd(opt.defaultQtd);
                                sounds.playSelect();
                              }}
                              className={`py-2.5 px-4 rounded-sm border ${
                                isSelected ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/20'
                              }`}
                            >
                              <Text className={`font-mono text-xs font-bold uppercase ${isSelected ? 'text-white' : 'text-neonBlue/60'}`}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {regimeDivisao === 'UNIDADE' && (
                        <View className="flex-row items-center gap-3 pt-3 border-t border-neonBlue/20">
                          <Text className="text-white/60 font-mono text-xs uppercase">Quantidade de Unidades:</Text>
                          {[2, 3, 4, 5, 6].map((num) => (
                            <TouchableOpacity
                              key={num}
                              onPress={() => { setRegimeQtd(num); sounds.playSelect(); }}
                              className={`w-9 h-9 rounded-sm items-center justify-center border ${
                                regimeQtd === num ? 'bg-neonBlue/40 border-neonBlue' : 'bg-black/60 border-neonBlue/30'
                              }`}
                            >
                              <Text className={`font-mono text-sm font-bold ${regimeQtd === num ? 'text-white' : 'text-neonBlue/60'}`}>
                                {num}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleSaveRegime}
                    disabled={savingRegime}
                    className="bg-neonBlue/20 border border-neonBlue py-3.5 rounded-sm items-center justify-center flex-row gap-2"
                    activeOpacity={0.7}
                  >
                    {savingRegime ? (
                      <ActivityIndicator size="small" color="#00f3ff" />
                    ) : (
                      <>
                        <Feather name="save" size={15} color="#00f3ff" />
                        <Text className="text-neonBlue font-mono font-bold uppercase text-xs tracking-wider">
                          Salvar Configuração do Regime Letivo
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ─── SISTEMA LGPD ─── */}
      {subTab === 'SISTEMA' && (
        <View>
          <Text className="text-white text-base font-bold uppercase tracking-widest mb-4">Exclusão de Contas (LGPD)</Text>
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
                    onPress={() => { sounds.playSelect(); handleRejectDeleteRequest?.(req.id); }}
                    className="flex-1 bg-green-950/20 border border-green-500/30 py-2.5 rounded-sm items-center justify-center flex-row gap-1.5"
                  >
                    <Feather name="x" size={13} color="#22c55e" />
                    <Text className="text-green-400 font-bold uppercase tracking-widest text-[9px] font-mono">Manter Conta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { sounds.playSelect(); handleConfirmDeleteRequest?.(req.id); }}
                    className="flex-1 bg-red-950/20 border border-red-500/50 py-2.5 rounded-sm items-center justify-center flex-row gap-1.5"
                  >
                    <Feather name="trash-2" size={13} color="#ef4444" />
                    <Text className="text-red-400 font-bold uppercase tracking-widest text-[9px] font-mono">Confirmar Exclusão</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* ─── LISTA DE MESTRES ─── */}
      {subTab === 'MESTRES' && (
        <View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-base font-bold uppercase tracking-widest">Guilda de Mestres</Text>
            <TouchableOpacity onPress={() => { sounds.playSelect(); fetchMasters?.(); }}>
              <Feather name="refresh-cw" size={16} color="#00f3ff" />
            </TouchableOpacity>
          </View>

          {/* Filtros Mestres */}
          <View className="bg-black/30 border border-neonBlue/20 p-3 rounded-sm mb-4 flex-row gap-2">
            <TextInput
              className="flex-1 bg-black/50 border border-neonBlue/40 text-white text-xs px-3 py-2 rounded-sm"
              placeholder="Nome ou Nickname"
              placeholderTextColor="#00f3ff40"
              value={filterMasterName}
              onChangeText={setFilterMasterName}
            />
            <YearPicker
              value={filterMasterYear}
              onChange={setFilterMasterYear}
            />
          </View>

          {loadingMasters ? (
            <ActivityIndicator size="large" color="#00f3ff" className="my-4" />
          ) : (() => {
            const filteredMasters = masters.filter(master => {
              const masterYear = new Date(master.createdAt || Date.now()).getFullYear().toString();
              const matchYear = filterMasterYear ? masterYear === filterMasterYear : true;
              const matchName = filterMasterName ? (master.nome?.toLowerCase().includes(filterMasterName.toLowerCase()) || master.nickname?.toLowerCase().includes(filterMasterName.toLowerCase())) : true;
              return matchYear && matchName;
            });

            if (filteredMasters.length === 0) {
              return <Text className="text-white/30 text-center text-sm py-4">Nenhum mestre encontrado com esses filtros.</Text>;
            }

            return filteredMasters.map((master) => (
              <View key={master.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3 flex-row justify-between items-center">
                <View className="flex-1 pr-2">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>{master.nome}</Text>
                  <Text className="text-neonBlue/70 text-xs mt-1" numberOfLines={1}>@{master.nickname || 'sem-nickname'} · {master.matricula}</Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity className="bg-neonBlue/10 p-2 border border-neonBlue/30 rounded-sm" onPress={() => { sounds.playSelect(); handleEditMasterPress?.(master); }}>
                    <Feather name="edit-2" size={14} color="#00f3ff" />
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-yellow-950/20 p-2 border border-yellow-600/30 rounded-sm" onPress={() => { sounds.playSelect(); handleResetMasterAccess?.(master.id); }}>
                    <Feather name="key" size={14} color="#eab308" />
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-red-900/20 p-2 border border-red-500/50 rounded-sm" onPress={() => confirmDeleteUser(master.id, master.nome, 'Mestre')}>
                    <Feather name="trash-2" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ));
          })()}
        </View>
      )}

      {/* ─── LISTA DE PLAYERS ─── */}
      {subTab === 'PLAYERS' && (
        <View>
          <Text className="text-white text-base font-bold uppercase tracking-widest mb-4">Controle de Players</Text>

          {/* Filtros Players */}
          <View className="bg-black/30 border border-neonBlue/20 p-3 rounded-sm mb-4">
            <View className="flex-row gap-2 mb-2">
              <TextInput
                className="flex-1 bg-black/50 border border-neonBlue/40 text-white text-xs px-3 py-2 rounded-sm"
                placeholder="Nome ou Nickname"
                placeholderTextColor="#00f3ff40"
                value={filterPlayerName}
                onChangeText={setFilterPlayerName}
              />
              <SelectPicker
                value={filterPlayerTurma}
                onChange={setFilterPlayerTurma}
                options={turmas
                  .filter(t => filterPlayerYear ? t.ano === filterPlayerYear : true)
                  .map(t => ({ label: t.nome, value: t.nome }))}
                placeholder="Selecione a Turma"
                title="Filtrar por Turma"
              />
            </View>
            <YearPicker
              value={filterPlayerYear}
              onChange={setFilterPlayerYear}
            />
          </View>

          {loadingStudents ? (
            <ActivityIndicator size="large" color="#00f3ff" className="my-4" />
          ) : (() => {
            const filteredStudents = students.filter(student => {
              const studentYear = student.turma?.ano || new Date(student.createdAt || Date.now()).getFullYear().toString();
              const matchYear = filterPlayerYear ? studentYear === filterPlayerYear : true;
              const matchName = filterPlayerName ? (
                student.nome?.toLowerCase().includes(filterPlayerName.toLowerCase()) || 
                student.nickname?.toLowerCase().includes(filterPlayerName.toLowerCase()) || 
                student.matricula?.toLowerCase().includes(filterPlayerName.toLowerCase())
              ) : true;
              const matchTurma = filterPlayerTurma ? student.turma?.nome?.toLowerCase().includes(filterPlayerTurma.toLowerCase()) : true;
              return matchYear && matchName && matchTurma;
            });

            if (filteredStudents.length === 0) {
              return <Text className="text-white/30 text-center text-sm py-4">Nenhum aluno encontrado com esses filtros.</Text>;
            }

            return filteredStudents.map((student) => (
              <View key={student.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3 flex-row justify-between items-center">
                <View className="flex-1 pr-2">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>{student.nome}</Text>
                  <Text className="text-neonBlue/70 text-xs mt-1" numberOfLines={1}>@{student.nickname || 'sem-nickname'} · {student.matricula}</Text>
                  <Text className="text-white/30 text-[10px] mt-1">Turma: {student.turma?.nome || 'Sem Turma'}</Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity className="bg-neonBlue/10 p-2 border border-neonBlue/30 rounded-sm" onPress={() => { sounds.playSelect(); handleEditStudentPress?.(student); }}>
                    <Feather name="edit-2" size={14} color="#00f3ff" />
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-yellow-950/20 p-2 border border-yellow-600/30 rounded-sm" onPress={() => { sounds.playSelect(); handleResetStudentAccess?.(student.id); }}>
                    <Feather name="key" size={14} color="#eab308" />
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-red-900/20 p-2 border border-red-500/50 rounded-sm" onPress={() => confirmDeleteUser(student.id, student.nome, 'Aluno')}>
                    <Feather name="trash-2" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ));
          })()}
        </View>
      )}

      {/* MODAL DE EDIÇÃO DE MESTRE */}
      <Modal visible={!!editingMasterId} animationType="fade" transparent onRequestClose={() => cancelEditMaster?.()}>
        <View className="flex-1 bg-black/85 justify-center items-center p-5 relative">
          <View className="bg-[#080d1a] border-2 border-neonBlue rounded-sm p-6 w-full max-w-md shadow-2xl relative">
            <View className="flex-row justify-between items-start border-b border-neonBlue/30 pb-3 mb-4">
              <Text className="text-white text-lg font-bold uppercase tracking-wider">Editar Mestre</Text>
              <TouchableOpacity onPress={() => { sounds.playSelect(); cancelEditMaster?.(); }} className="bg-neonBlue/10 p-1 border border-neonBlue/30 rounded-sm">
                <Feather name="x" size={16} color="#00f3ff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Nome Completo</Text>
              <TextInput
                className="w-full bg-black/50 border border-neonBlue/40 text-white p-3 rounded-sm mb-4"
                placeholder="Nome do Professor"
                placeholderTextColor="#00f3ff40"
                value={nome}
                onChangeText={setNome}
              />

              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Matrícula</Text>
              <TextInput
                className="w-full bg-black/50 border border-neonBlue/40 text-white p-3 rounded-sm mb-4"
                placeholder="Matrícula"
                placeholderTextColor="#00f3ff40"
                value={matricula}
                onChangeText={setMatricula}
                editable={false}
              />

              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Categoria</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {['CONCURSADO', 'REDA', 'CLT'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => { sounds.playSelect(); setCategoria?.(cat as any); }}
                    className={`px-4 py-2 rounded-sm border ${categoria === cat ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                  >
                    <Text className={`font-bold text-[10px] uppercase ${categoria === cat ? 'text-white' : 'text-neonBlue/50'}`}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Horas de Contrato (Aulas)</Text>
              <TextInput
                className="w-full bg-black/50 border border-neonBlue/40 text-white p-3 rounded-sm mb-6"
                keyboardType="numeric"
                value={maxAulasSemanais}
                onChangeText={setMaxAulasSemanais}
              />

              <TouchableOpacity
                className="w-full bg-neonBlue/20 border border-neonBlue p-4 rounded-sm items-center"
                onPress={() => { sounds.playSelect(); handleRegisterOrUpdateMaster?.(); }}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#00f3ff" /> : <Text className="text-neonBlue font-bold uppercase tracking-widest">Salvar Mestre</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE EDIÇÃO DE PLAYER */}
      <Modal visible={!!editingStudentId} animationType="fade" transparent onRequestClose={() => cancelEditStudent?.()}>
        <View className="flex-1 bg-black/85 justify-center items-center p-5 relative">
          <View className="bg-[#080d1a] border-2 border-neonBlue rounded-sm p-6 w-full max-w-md shadow-2xl relative">
            <View className="flex-row justify-between items-start border-b border-neonBlue/30 pb-3 mb-4">
              <Text className="text-white text-lg font-bold uppercase tracking-wider">Editar Player</Text>
              <TouchableOpacity onPress={() => { sounds.playSelect(); cancelEditStudent?.(); }} className="bg-neonBlue/10 p-1 border border-neonBlue/30 rounded-sm">
                <Feather name="x" size={16} color="#00f3ff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Nome do Aluno</Text>
              <TextInput
                className="w-full bg-black/50 border border-neonBlue/40 text-white p-3 rounded-sm mb-4"
                placeholder="Nome do Aluno"
                placeholderTextColor="#00f3ff40"
                value={studentNome}
                onChangeText={setStudentNome}
              />

              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Turma</Text>
              <SelectPicker
                value={studentTurmaId || ''}
                onChange={setStudentTurmaId!}
                options={turmas.map((t) => ({ label: t.nome, value: t.id }))}
                placeholder="Selecione a Turma"
                title="Turma"
              />
              <View className="h-6" />

              <TouchableOpacity
                className="w-full bg-neonBlue/20 border border-neonBlue p-4 rounded-sm items-center"
                onPress={() => { sounds.playSelect(); handleUpdateStudent?.(); }}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#00f3ff" /> : <Text className="text-neonBlue font-bold uppercase tracking-widest">Salvar Player</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
