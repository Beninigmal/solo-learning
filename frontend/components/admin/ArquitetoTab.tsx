import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
}: ArquitetoTabProps) {
  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-neonBlue text-lg font-bold uppercase tracking-widest mb-2">Visão do Arquiteto</Text>
      <Text className="text-white/30 text-xs mb-6">Painel analítico das turmas e alunos.</Text>

      {/* Resumo de turmas */}
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
                  {/* Accordion: Membros da Turma */}
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

                  {/* Accordion: Vincular Professores & Matérias */}
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
                            <View 
                              key={td.id}
                              className="flex-row justify-between items-center py-2.5 border-b border-white/5"
                            >
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

      {/* Pergunta Dourada */}
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
              <Text className={`text-xs font-bold uppercase ${goldenQuestionTurmaId === t.id ? 'text-white' : 'text-yellow-500/60'}`}>
                {t.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className="w-full bg-yellow-500 border border-yellow-600 py-3 rounded-sm items-center mb-6"
          onPress={() => { sounds.playSelect(); handleSendGoldenQuestion(); }}
          disabled={loadingGolden}
        >
          {loadingGolden ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text className="text-black font-bold uppercase tracking-widest text-xs">Disparar Pergunta Dourada</Text>
          )}
        </TouchableOpacity>

        {/* Histórico de Perguntas Douradas */}
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

                {/* Barra de Progresso */}
                <View className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                  <View style={{ width: `${q.taxaResposta}%` }} className="h-full bg-yellow-500" />
                </View>

                {/* Botão de Expandir Respostas */}
                <TouchableOpacity
                  className="flex-row justify-between items-center bg-yellow-500/10 px-3 py-2 rounded-sm"
                  onPress={() => { sounds.playSelect(); setExpandedQuestionId(isExpanded ? null : q.id); }}
                >
                  <Text className="text-yellow-500 font-bold uppercase text-[10px] tracking-widest">
                    Ver Respostas ({q.respostasContadas}/{q.totalAlunos})
                  </Text>
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
  );
}
