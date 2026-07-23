import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api, getInstitutions } from '../../services/api';
import { exportToPDF } from '../../utils/pdfExport';

interface MatrixAuditTabProps {
  currentUser?: any;
  turmas?: any[];
  disciplinas?: any[];
}

export function MatrixAuditTab({ currentUser, turmas = [], disciplinas = [] }: MatrixAuditTabProps) {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>(currentUser?.institutionId || '');
  const [selectedInstNome, setSelectedInstNome] = useState<string>(currentUser?.instituicao || '');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [selectedAno, setSelectedAno] = useState<string>('');
  const [selectedUnidade, setSelectedUnidade] = useState<string>('');
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);

  useEffect(() => {
    async function loadSchools() {
      try {
        const insts = await getInstitutions();
        setInstitutions(insts || []);
      } catch (e) {
        console.error('Erro ao carregar lista de instituições na matriz:', e);
      }
    }
    loadSchools();
  }, []);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedInstId) params.institutionId = selectedInstId;
      else if (selectedInstNome) params.instituicao = selectedInstNome;
      if (selectedTurmaId) params.turmaId = selectedTurmaId;
      if (selectedAno) params.ano = selectedAno;
      if (selectedUnidade) params.unidade = selectedUnidade;
      if (selectedDisciplinaId) params.disciplinaId = selectedDisciplinaId;

      const res = await api.get('/admin/matrix/audit', { params });
      setAuditData(res.data);
    } catch (e) {
      console.error('Erro ao buscar dados da matriz de auditoria:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedInstId, selectedInstNome, selectedTurmaId, selectedAno, selectedUnidade, selectedDisciplinaId]);

  const summary = auditData?.summary || {};
  const disciplinaStats = auditData?.disciplinaStats || [];
  const auditLogs = auditData?.auditLogs || [];

  const currentAuditedName = selectedInstNome || currentUser?.instituicao || 'TODAS AS INSTITUIÇÕES';

  const handleExportPDF = () => {
    const title = `Relatório de Auditoria Multidimensional — Matriz Solen`;
    const subtitle = `Escopo: ${currentAuditedName} | Ano: ${selectedAno || 'Todos'} | Unidade: ${selectedUnidade ? `${selectedUnidade}ª Unidade` : 'Todas'}`;

    const rowsHtml = disciplinaStats.map((item: any) => `
      <tr>
        <td><strong>${item.nome}</strong></td>
        <td>${item.totalQuests ?? 0}</td>
        <td>${item.totalDeliveries ?? item.total ?? 0}</td>
        <td>${item.totalAnswered ?? (item.correct + item.wrong)}</td>
        <td><span class="badge-gain">${item.correct}</span></td>
        <td><span class="badge-deficit">${item.wrong}</span></td>
        <td><strong>${item.hitRate}%</strong></td>
      </tr>
    `).join('') || '<tr><td colspan="7">Sem dados de disciplinas registrados.</td></tr>';

    const body = `
      <div class="card-grid">
        <div class="card">
          <div class="card-lbl">Taxa de Acerto Global</div>
          <div class="card-val" style="color: #0284c7">${summary.hitRate ?? 0}%</div>
        </div>
        <div class="card">
          <div class="card-lbl">Quests Criadas</div>
          <div class="card-val" style="color: #7c3aed">${summary.totalQuestsCreated ?? 0}</div>
        </div>
        <div class="card">
          <div class="card-lbl">Entregas aos Alunos</div>
          <div class="card-val" style="color: #16a34a">${summary.totalDeliveries ?? 0}</div>
        </div>
        <div class="card">
          <div class="card-lbl">Resoluções no Baú</div>
          <div class="card-val" style="color: #dc2626">${summary.bauResolutionRate ?? 0}%</div>
        </div>
      </div>

      <div class="section-title">📊 Desempenho Auditado por Disciplina</div>
      <table>
        <thead>
          <tr>
            <th>Disciplina</th>
            <th>Quests Criadas</th>
            <th>Entregas Alunos</th>
            <th>Respondidas</th>
            <th>Acertos</th>
            <th>Erros</th>
            <th>% Acerto</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    exportToPDF(title, subtitle, body);
  };

  return (
    <View className="flex-1">
      {/* Badge de Instituição Auditada */}
      <View className="bg-black/60 border border-neonBlue p-3 rounded-sm mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Feather name="home" size={16} color="#00f3ff" />
          <Text className="text-white text-xs font-mono font-bold uppercase">
            AUDITANDO: <Text className="text-neonBlue">{currentAuditedName}</Text>
          </Text>
        </View>
        <Text className="text-white/40 text-[9px] font-mono uppercase">
          Escopo: {selectedInstNome ? 'Instituição Isolada' : 'Rede Global Solen'}
        </Text>
      </View>

      {/* Container de Filtros em Matriz */}
      <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
        <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
          <View className="flex-row items-center gap-2">
            <Feather name="grid" size={18} color="#00f3ff" />
            <Text className="text-white text-base font-bold uppercase tracking-widest font-mono">
              Matriz Multidimensional de Auditoria
            </Text>
          </View>

          {/* Botão Exportar PDF da Matriz */}
          <TouchableOpacity
            onPress={handleExportPDF}
            className="bg-neonBlue/20 border border-neonBlue px-3 py-1.5 rounded-sm flex-row items-center gap-1.5"
          >
            <Feather name="printer" size={13} color="#00f3ff" />
            <Text className="text-neonBlue font-mono font-bold text-[10px] uppercase">Exportar PDF da Matriz</Text>
          </TouchableOpacity>
        </View>

        {/* Seletor de Instituição (Para Admin/Superadmin ou Mudança) */}
        {institutions.length > 0 && (
          <>
            <Text className="text-white/50 text-[10px] uppercase font-mono mb-2">Filtrar por Instituição de Ensino:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => { setSelectedInstId(''); setSelectedInstNome(''); }}
                  className={`px-3 py-1.5 rounded-sm border ${selectedInstId === '' && selectedInstNome === '' ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
                >
                  <Text className={`text-[10px] font-mono uppercase font-bold ${selectedInstId === '' && selectedInstNome === '' ? 'text-white' : 'text-neonBlue/60'}`}>
                    Todas as Instituições
                  </Text>
                </TouchableOpacity>
                {institutions.map((inst) => (
                  <TouchableOpacity
                    key={inst.id}
                    onPress={() => { setSelectedInstId(inst.id); setSelectedInstNome(inst.nome); }}
                    className={`px-3 py-1.5 rounded-sm border ${selectedInstId === inst.id || selectedInstNome === inst.nome ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
                  >
                    <Text className={`text-[10px] font-mono uppercase font-bold ${selectedInstId === inst.id || selectedInstNome === inst.nome ? 'text-white' : 'text-neonBlue/60'}`}>
                      {inst.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Filtro por Ano */}
        <Text className="text-white/50 text-[10px] uppercase font-mono mb-2">Ano / Série:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setSelectedAno('')}
              className={`px-3 py-1.5 rounded-sm border ${selectedAno === '' ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
            >
              <Text className={`text-[10px] font-mono uppercase font-bold ${selectedAno === '' ? 'text-white' : 'text-neonBlue/60'}`}>
                Todos os Anos
              </Text>
            </TouchableOpacity>
            {['1º Ano', '2º Ano', '3º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'].map((ano) => (
              <TouchableOpacity
                key={ano}
                onPress={() => setSelectedAno(ano)}
                className={`px-3 py-1.5 rounded-sm border ${selectedAno === ano ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
              >
                <Text className={`text-[10px] font-mono uppercase font-bold ${selectedAno === ano ? 'text-white' : 'text-neonBlue/60'}`}>
                  {ano}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Filtro por Unidade */}
        <Text className="text-white/50 text-[10px] uppercase font-mono mb-2">Unidade Letiva:</Text>
        <View className="flex-row gap-2 mb-4">
          {[
            { id: '', label: 'Todas' },
            { id: '1', label: '1ª Unidade' },
            { id: '2', label: '2ª Unidade' },
            { id: '3', label: '3ª Unidade' }
          ].map((u) => (
            <TouchableOpacity
              key={u.id}
              onPress={() => setSelectedUnidade(u.id)}
              className={`px-3 py-1.5 rounded-sm border flex-1 items-center ${selectedUnidade === u.id ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
            >
              <Text className={`text-[10px] font-mono uppercase font-bold ${selectedUnidade === u.id ? 'text-white' : 'text-neonBlue/60'}`}>
                {u.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Métricas Principais (Cards Neon) */}
      {loading ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color="#00f3ff" />
          <Text className="text-neonBlue/70 font-mono text-xs mt-3 uppercase tracking-widest">
            Compilando estatísticas da matriz...
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row gap-3 mb-6 flex-wrap">
            <View className="flex-1 min-w-[140px] bg-black/60 border border-neonBlue/40 p-4 rounded-sm items-center">
              <Text className="text-neonBlue text-[10px] font-bold uppercase tracking-wider font-mono">Taxa de Acerto Global</Text>
              <Text className="text-white text-2xl font-bold font-mono mt-1">{summary.hitRate ?? 0}%</Text>
              <Text className="text-white/40 text-[9px] font-mono mt-0.5">{summary.totalAnswered ?? 0} respondidas</Text>
            </View>

            <View className="flex-1 min-w-[140px] bg-black/60 border border-purple-500/40 p-4 rounded-sm items-center">
              <Text className="text-purple-400 text-[10px] font-bold uppercase tracking-wider font-mono">Quests Criadas</Text>
              <Text className="text-white text-2xl font-bold font-mono mt-1">{summary.totalQuestsCreated ?? 0}</Text>
              <Text className="text-purple-300/60 text-[9px] font-mono mt-0.5">Temas dos Professores</Text>
            </View>

            <View className="flex-1 min-w-[140px] bg-black/60 border border-green-500/40 p-4 rounded-sm items-center">
              <Text className="text-green-400 text-[10px] font-bold uppercase tracking-wider font-mono">Entregas aos Alunos</Text>
              <Text className="text-white text-2xl font-bold font-mono mt-1">{summary.totalDeliveries ?? 0}</Text>
              <Text className="text-green-300/60 text-[9px] font-mono mt-0.5">Atribuições Indiv.</Text>
            </View>

            <View className="flex-1 min-w-[140px] bg-black/60 border border-red-500/40 p-4 rounded-sm items-center">
              <Text className="text-red-400 text-[10px] font-bold uppercase tracking-wider font-mono">Resolução no Baú</Text>
              <Text className="text-white text-2xl font-bold font-mono mt-1">{summary.bauResolutionRate ?? 0}%</Text>
              <Text className="text-red-300/60 text-[9px] font-mono mt-0.5">Erros Superados</Text>
            </View>
          </View>

          {/* Desempenho por Disciplina */}
          <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
            <Text className="text-white text-sm font-bold uppercase tracking-widest font-mono mb-4">
              📊 Taxa de Acerto por Disciplina
            </Text>

            {disciplinaStats.length === 0 ? (
              <Text className="text-white/30 text-xs font-mono text-center py-4">Sem dados para o filtro selecionado.</Text>
            ) : (
              disciplinaStats.map((item: any) => (
                <View key={item.disciplinaId} className="bg-black/50 border border-neonBlue/20 p-3 rounded-sm mb-3">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-white font-bold text-xs uppercase font-mono">{item.nome}</Text>
                    <Text className="text-neonBlue font-mono font-bold text-xs">{item.hitRate}% Acertos</Text>
                  </View>
                  <View className="flex-row justify-between text-[10px] font-mono text-white/50 mb-2 flex-wrap gap-2">
                    <Text className="text-purple-300 text-[10px]">Quests Criadas: {item.totalQuests ?? 0}</Text>
                    <Text className="text-white/40 text-[10px]">Entregas Alunos: {item.totalDeliveries ?? item.total ?? 0} ({item.totalAnswered ?? (item.correct + item.wrong)} respondidas)</Text>
                    <Text className="text-green-400 text-[10px]">Acertos: {item.correct}</Text>
                    <Text className="text-red-400 text-[10px]">Erros: {item.wrong}</Text>
                  </View>
                  <View className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <View style={{ width: `${item.hitRate}%` }} className="h-full bg-neonBlue" />
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Log de Auditoria em Tempo Real */}
          <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
            <View className="flex-row items-center gap-2 mb-4">
              <Feather name="shield" size={16} color="#00f3ff" />
              <Text className="text-white text-sm font-bold uppercase tracking-widest font-mono">
                Log de Auditoria
              </Text>
            </View>

            {auditLogs.length === 0 ? (
              <Text className="text-white/30 text-xs font-mono text-center py-4">Nenhum evento registrado.</Text>
            ) : (
              auditLogs.map((log: any) => (
                <View key={log.id} className="bg-black/40 border border-neonBlue/10 p-3 rounded-sm mb-2">
                  <View className="flex-row justify-between items-start">
                    <Text className="text-white font-bold text-xs font-mono flex-1 mr-2">{log.action}</Text>
                    <Text className="text-white/30 text-[9px] font-mono">{new Date(log.createdAt).toLocaleTimeString('pt-BR')}</Text>
                  </View>
                  {log.details && <Text className="text-white/60 text-[10px] font-mono mt-1">{log.details}</Text>}
                  {log.user && (
                    <Text className="text-neonBlue/60 text-[9px] font-mono mt-1">Operador: {log.user.nome} ({log.user.role})</Text>
                  )}
                </View>
              ))
            )}
          </View>
        </>
      )}
    </View>
  );
}
