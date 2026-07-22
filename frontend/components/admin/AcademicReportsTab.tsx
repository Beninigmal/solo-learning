import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../../services/api';
import { exportToPDF } from '../../utils/pdfExport';

interface AcademicReportsTabProps {
  turmas?: any[];
}

export function AcademicReportsTab({ turmas = [] }: AcademicReportsTabProps) {
  const [reportType, setReportType] = useState<'UNIT' | 'ANNUAL'>('UNIT');
  const [selectedUnidade, setSelectedUnidade] = useState<string>('1');
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [unitReport, setUnitReport] = useState<any>(null);
  const [annualReport, setAnnualReport] = useState<any>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      if (reportType === 'UNIT') {
        const params: any = { unidade: selectedUnidade };
        if (selectedTurmaId) params.turmaId = selectedTurmaId;
        const res = await api.get('/admin/reports/unit', { params });
        setUnitReport(res.data);
      } else {
        const params: any = {};
        if (selectedTurmaId) params.turmaId = selectedTurmaId;
        const res = await api.get('/admin/reports/annual', { params });
        setAnnualReport(res.data);
      }
    } catch (e) {
      console.error('Erro ao buscar relatórios:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, selectedUnidade, selectedTurmaId]);

  const handleExportPDF = () => {
    const turmaObj = turmas.find(t => t.id === selectedTurmaId);
    const turmaLabel = turmaObj ? `Turma ${turmaObj.nome}` : 'Todas as Turmas';

    if (reportType === 'UNIT') {
      const title = `Relatório Pedagógico — ${selectedUnidade}ª Unidade Letiva`;
      const subtitle = `Diagnóstico de Ganhos, Déficits e Mapeamento de Alunos (${turmaLabel})`;

      const ganhosHtml = (unitReport?.ganhos || []).map((g: any) => `
        <tr>
          <td><strong>${g.materia}</strong></td>
          <td><span class="badge-gain">${g.taxaAcerto}% Acertos</span></td>
          <td>Domínio Atingido (≥ 75%)</td>
        </tr>
      `).join('') || '<tr><td colspan="3">Nenhum ganho expressivo registrado nesta unidade.</td></tr>';

      const deficitsHtml = (unitReport?.deficits || []).map((d: any) => `
        <tr>
          <td><strong>${d.materia}</strong></td>
          <td><span class="badge-deficit">${d.taxaAcerto}% Acertos</span></td>
          <td>Ponto Crítico de Atenção (< 50%)</td>
        </tr>
      `).join('') || '<tr><td colspan="3">Nenhum déficit crítico registrado nesta unidade.</td></tr>';

      const destaquesHtml = (unitReport?.destaques || []).map((s: any) => `
        <tr>
          <td>${s.nome}</td>
          <td>${s.taxaAcerto}%</td>
          <td><span class="badge-gain">Excelente</span></td>
        </tr>
      `).join('') || '<tr><td colspan="3">Nenhum aluno destaque.</td></tr>';

      const emRiscoHtml = (unitReport?.emRisco || []).map((s: any) => `
        <tr>
          <td>${s.nome}</td>
          <td>${s.taxaAcerto}%</td>
          <td><span class="badge-deficit">Acompanhamento Especial</span></td>
        </tr>
      `).join('') || '<tr><td colspan="3">Nenhum aluno em risco crítico.</td></tr>';

      const body = `
        <div class="card-grid">
          <div class="card">
            <div class="card-lbl">Matérias em Destaque (Ganhos)</div>
            <div class="card-val" style="color: #16a34a">${unitReport?.ganhos?.length || 0}</div>
          </div>
          <div class="card">
            <div class="card-lbl">Matérias com Déficits</div>
            <div class="card-val" style="color: #dc2626">${unitReport?.deficits?.length || 0}</div>
          </div>
          <div class="card">
            <div class="card-lbl">Alunos Destaque</div>
            <div class="card-val" style="color: #0284c7">${unitReport?.destaques?.length || 0}</div>
          </div>
        </div>

        <div class="section-title">🏆 Ganhos Pedagógicos (Taxa de Acerto ≥ 75%)</div>
        <table>
          <thead>
            <tr>
              <th>Disciplina</th>
              <th>Taxa de Acerto</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${ganhosHtml}</tbody>
        </table>

        <div class="section-title">⚠️ Déficits Pedagógicos Críticos (Taxa de Acerto < 50%)</div>
        <table>
          <thead>
            <tr>
              <th>Disciplina</th>
              <th>Taxa de Acerto</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${deficitsHtml}</tbody>
        </table>

        <div class="section-title">👥 Mapeamento de Alunos na Unidade</div>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <div class="section-title" style="font-size: 12px;">🌟 Alunos Destaque</div>
            <table>
              <thead>
                <tr><th>Aluno</th><th>Desempenho</th><th>Status</th></tr>
              </thead>
              <tbody>${destaquesHtml}</tbody>
            </table>
          </div>
          <div style="flex: 1;">
            <div class="section-title" style="font-size: 12px; color: #dc2626;">🚨 Alunos Acompanhamento Especial</div>
            <table>
              <thead>
                <tr><th>Aluno</th><th>Desempenho</th><th>Status</th></tr>
              </thead>
              <tbody>${emRiscoHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      exportToPDF(title, subtitle, body);
    } else {
      const title = `Balanço Acadêmico Anual — Evolução Entre Unidades`;
      const subtitle = `Análise Consolidada do Ano Letivo (${turmaLabel})`;

      const unitPerfHtml = (annualReport?.unitPerformance || []).map((u: any) => `
        <tr>
          <td><strong>Unidade ${u.unidade}</strong></td>
          <td><strong>${u.hitRate}%</strong></td>
          <td>${u.correct} acertos de ${u.total} entregas</td>
        </tr>
      `).join('') || '<tr><td colspan="3">Sem dados anuais registrados.</td></tr>';

      const body = `
        <div class="card-grid">
          <div class="card">
            <div class="card-lbl">Média Geral Consolidada</div>
            <div class="card-val" style="color: #0284c7">${annualReport?.overallHitRate || 0}%</div>
          </div>
          <div class="card">
            <div class="card-lbl">Total de Entregas no Ano</div>
            <div class="card-val">${annualReport?.totalDeliveries || 0}</div>
          </div>
        </div>

        <div class="section-title">📈 Curva de Evolução Anual por Unidade Letiva</div>
        <table>
          <thead>
            <tr>
              <th>Unidade Letiva</th>
              <th>Taxa de Acerto</th>
              <th>Detalhamento</th>
            </tr>
          </thead>
          <tbody>${unitPerfHtml}</tbody>
        </table>
      `;

      exportToPDF(title, subtitle, body);
    }
  };

  return (
    <View className="flex-1">
      {/* Header & Tipo de Relatório */}
      <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
        <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
          <View className="flex-row items-center gap-2">
            <Feather name="file-text" size={18} color="#00f3ff" />
            <Text className="text-white text-base font-bold uppercase tracking-widest font-mono">
              Relatórios Acadêmicos & Diagnósticos
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {/* Botão Exportar PDF */}
            <TouchableOpacity
              onPress={handleExportPDF}
              className="bg-neonBlue/20 border border-neonBlue px-3 py-1.5 rounded-sm flex-row items-center gap-1.5"
            >
              <Feather name="printer" size={13} color="#00f3ff" />
              <Text className="text-neonBlue font-mono font-bold text-[10px] uppercase">Exportar PDF</Text>
            </TouchableOpacity>

            {/* Selector de Tipo */}
            <View className="flex-row bg-black/60 border border-neonBlue/30 rounded-sm p-0.5">
              <TouchableOpacity
                onPress={() => setReportType('UNIT')}
                className={`px-3 py-1 rounded-sm ${reportType === 'UNIT' ? 'bg-neonBlue/30 border border-neonBlue' : ''}`}
              >
                <Text className={`text-[10px] font-mono font-bold uppercase ${reportType === 'UNIT' ? 'text-white' : 'text-neonBlue/50'}`}>
                  Por Unidade
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setReportType('ANNUAL')}
                className={`px-3 py-1 rounded-sm ${reportType === 'ANNUAL' ? 'bg-neonBlue/30 border border-neonBlue' : ''}`}
              >
                <Text className={`text-[10px] font-mono font-bold uppercase ${reportType === 'ANNUAL' ? 'text-white' : 'text-neonBlue/50'}`}>
                  Balanço Anual
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Filtros */}
        <View className="flex-row gap-3">
          {reportType === 'UNIT' && (
            <View className="flex-1">
              <Text className="text-white/50 text-[10px] uppercase font-mono mb-1.5">Unidade:</Text>
              <View className="flex-row gap-1 bg-black/50 p-1 border border-neonBlue/30 rounded-sm">
                {['1', '2', '3'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setSelectedUnidade(u)}
                    className={`flex-1 py-1 rounded-sm items-center ${selectedUnidade === u ? 'bg-neonBlue/30 border border-neonBlue' : ''}`}
                  >
                    <Text className={`text-[10px] font-mono font-bold ${selectedUnidade === u ? 'text-white' : 'text-neonBlue/50'}`}>
                      Unidade {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View className="flex-1">
            <Text className="text-white/50 text-[10px] uppercase font-mono mb-1.5">Turma Específica:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-1">
                <TouchableOpacity
                  onPress={() => setSelectedTurmaId('')}
                  className={`px-2.5 py-1.5 rounded-sm border ${selectedTurmaId === '' ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                >
                  <Text className={`text-[10px] font-mono font-bold uppercase ${selectedTurmaId === '' ? 'text-white' : 'text-neonBlue/50'}`}>
                    Todas
                  </Text>
                </TouchableOpacity>
                {turmas.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSelectedTurmaId(t.id)}
                    className={`px-2.5 py-1.5 rounded-sm border ${selectedTurmaId === t.id ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
                  >
                    <Text className={`text-[10px] font-mono font-bold uppercase ${selectedTurmaId === t.id ? 'text-white' : 'text-neonBlue/50'}`}>
                      {t.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color="#00f3ff" />
          <Text className="text-neonBlue/70 font-mono text-xs mt-3 uppercase tracking-widest">
            Processando relatório pedagógico...
          </Text>
        </View>
      ) : reportType === 'UNIT' ? (
        <>
          {/* Ganhos vs Déficits */}
          <View className="flex-row gap-4 mb-6">
            {/* Ganhos */}
            <View className="flex-1 bg-black/60 border border-green-500/40 p-4 rounded-sm">
              <View className="flex-row items-center gap-2 mb-3 border-b border-green-500/30 pb-2">
                <Feather name="trending-up" size={16} color="#22c55e" />
                <Text className="text-green-400 font-bold uppercase font-mono text-xs">
                  🏆 GANHOS (Domínio & Exuperância ≥ 75%)
                </Text>
              </View>

              {unitReport?.ganhos?.length === 0 ? (
                <Text className="text-white/30 text-xs font-mono py-2">Nenhuma matéria com domínio atingido nesta unidade.</Text>
              ) : (
                unitReport?.ganhos?.map((g: any, idx: number) => (
                  <View key={idx} className="bg-green-950/20 border border-green-800/40 p-3 rounded-sm mb-2">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-white font-bold text-xs font-mono">{g.materia}</Text>
                      <Text className="text-green-400 font-mono font-bold text-xs">{g.taxaAcerto}% acertos</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Déficits */}
            <View className="flex-1 bg-black/60 border border-red-500/40 p-4 rounded-sm">
              <View className="flex-row items-center gap-2 mb-3 border-b border-red-500/30 pb-2">
                <Feather name="alert-triangle" size={16} color="#ef4444" />
                <Text className="text-red-400 font-bold uppercase font-mono text-xs">
                  ⚠️ DÉFICITS (Pontos Críticos {'<'} 50%)
                </Text>
              </View>

              {unitReport?.deficits?.length === 0 ? (
                <Text className="text-white/30 text-xs font-mono py-2">Nenhum déficit crítico detectado nesta unidade.</Text>
              ) : (
                unitReport?.deficits?.map((d: any, idx: number) => (
                  <View key={idx} className="bg-red-950/20 border border-red-800/40 p-3 rounded-sm mb-2">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-white font-bold text-xs font-mono">{d.materia}</Text>
                      <Text className="text-red-400 font-mono font-bold text-xs">{d.taxaAcerto}% acertos</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Destaques vs Em Risco */}
          <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
            <Text className="text-white text-sm font-bold uppercase tracking-widest font-mono mb-4">
              👥 Mapeamento de Alunos na Unidade
            </Text>

            <View className="flex-row gap-4">
              {/* Destaques */}
              <View className="flex-1">
                <Text className="text-neonBlue text-xs font-bold font-mono uppercase mb-2">🌟 Alunos Destaque:</Text>
                {unitReport?.destaques?.map((s: any) => (
                  <View key={s.id} className="bg-black/50 border border-neonBlue/30 p-2.5 rounded-sm mb-1.5 flex-row justify-between">
                    <Text className="text-white text-xs font-mono">{s.nome}</Text>
                    <Text className="text-neonBlue font-mono text-xs font-bold">{s.taxaAcerto}%</Text>
                  </View>
                ))}
              </View>

              {/* Em Risco */}
              <View className="flex-1">
                <Text className="text-red-400 text-xs font-bold font-mono uppercase mb-2">🚨 Alunos Acompanhamento Especial:</Text>
                {unitReport?.emRisco?.map((s: any) => (
                  <View key={s.id} className="bg-red-950/20 border border-red-800/30 p-2.5 rounded-sm mb-1.5 flex-row justify-between">
                    <Text className="text-white text-xs font-mono">{s.nome}</Text>
                    <Text className="text-red-400 font-mono text-xs font-bold">{s.taxaAcerto}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </>
      ) : (
        /* BALANÇO ANUAL */
        <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
          <Text className="text-white text-sm font-bold uppercase tracking-widest font-mono mb-4">
            📈 Curva de Evolução Anual por Unidade
          </Text>

          <View className="flex-row gap-3 mb-6">
            {annualReport?.unitPerformance?.map((u: any) => (
              <View key={u.unidade} className="flex-1 bg-black/60 border border-neonBlue/30 p-4 rounded-sm items-center">
                <Text className="text-neonBlue text-xs font-bold font-mono uppercase">Unidade {u.unidade}</Text>
                <Text className="text-white text-2xl font-bold font-mono mt-2">{u.hitRate}%</Text>
                <Text className="text-white/40 text-[9px] font-mono mt-1">{u.correct} de {u.total} acertos</Text>
              </View>
            ))}
          </View>

          <View className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm items-center">
            <Text className="text-white/60 text-xs font-mono uppercase mb-1">Média Geral Consolidada do Ano</Text>
            <Text className="text-neonBlue text-3xl font-bold font-mono">{annualReport?.overallHitRate ?? 0}%</Text>
            <Text className="text-white/40 text-[10px] font-mono mt-1">Total de {annualReport?.totalDeliveries ?? 0} resoluções de missões no ano</Text>
          </View>
        </View>
      )}
    </View>
  );
}
