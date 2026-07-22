import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../../services/api';

export function SaasFinancialsTab() {
  const [loading, setLoading] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/superadmin/matrix/saas-financials');
      setFinancialData(res.data);
    } catch (e) {
      console.error('Erro ao buscar financeiros SaaS:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const summary = financialData?.summary || {};
  const planBreakdown = financialData?.planBreakdown || {};
  const statusBreakdown = financialData?.statusBreakdown || {};
  const expiringTrials = financialData?.expiringTrials || [];

  return (
    <View className="flex-1">
      {/* Header Neon */}
      <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Feather name="dollar-sign" size={18} color="#00f3ff" />
            <Text className="text-white text-base font-bold uppercase tracking-widest font-mono">
              Painel Financeiro SaaS & Contratos
            </Text>
          </View>
          <TouchableOpacity onPress={fetchFinancials} className="bg-neonBlue/10 p-2 border border-neonBlue/40 rounded-full">
            <Feather name="refresh-cw" size={14} color="#00f3ff" />
          </TouchableOpacity>
        </View>

        <Text className="text-white/60 text-xs font-mono">
          Monitoramento em tempo real de receita recorrente mensal (MRR), status de inadimplência e projeções de contratos.
        </Text>
      </View>

      {loading ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color="#00f3ff" />
          <Text className="text-neonBlue/70 font-mono text-xs mt-3 uppercase tracking-widest">
            Calculando métricas financeiras SaaS...
          </Text>
        </View>
      ) : (
        <>
          {/* Grid de Cards MRR & Contratos */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-black/60 border border-green-500/50 p-4 rounded-sm items-center">
              <Text className="text-green-400 text-[10px] font-bold uppercase tracking-wider font-mono">MRR Estimado</Text>
              <Text className="text-white text-xl font-bold font-mono mt-1">R$ {summary.totalMrr?.toLocaleString('pt-BR') || 0}</Text>
            </View>

            <View className="flex-1 bg-black/60 border border-neonBlue/40 p-4 rounded-sm items-center">
              <Text className="text-neonBlue text-[10px] font-bold uppercase tracking-wider font-mono">Instituições Ativas</Text>
              <Text className="text-white text-xl font-bold font-mono mt-1">{summary.activeCount || 0} / {summary.totalInstitutions || 0}</Text>
            </View>

            <View className="flex-1 bg-black/60 border border-yellow-500/40 p-4 rounded-sm items-center">
              <Text className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider font-mono">Em Período Trial</Text>
              <Text className="text-white text-xl font-bold font-mono mt-1">{summary.trialCount || 0}</Text>
            </View>

            <View className="flex-1 bg-black/60 border border-red-500/40 p-4 rounded-sm items-center">
              <Text className="text-red-400 text-[10px] font-bold uppercase tracking-wider font-mono">Inadimplentes</Text>
              <Text className="text-white text-xl font-bold font-mono mt-1">{summary.delinquentCount || 0}</Text>
            </View>
          </View>

          {/* Distribuição de Planos SaaS */}
          <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
            <Text className="text-white text-sm font-bold uppercase tracking-widest font-mono mb-4">
              🛡️ Distribuição de Contratos por Rank
            </Text>

            <View className="flex-row gap-3">
              {[
                { rank: 'TRIAL', label: 'Trial Grátis', price: 'R$ 0/mês', count: planBreakdown.TRIAL || 0, color: '#9ca3af' },
                { rank: 'RANK_B', label: 'Rank B', price: 'R$ 499/mês', count: planBreakdown.RANK_B || 0, color: '#3b82f6' },
                { rank: 'RANK_A', label: 'Rank A', price: 'R$ 1.299/mês', count: planBreakdown.RANK_A || 0, color: '#a855f7' },
                { rank: 'RANK_S', label: 'Rank S', price: 'R$ 2.999/mês', count: planBreakdown.RANK_S || 0, color: '#eab308' }
              ].map((p) => (
                <View key={p.rank} className="flex-1 bg-black/50 border p-3 rounded-sm items-center" style={{ borderColor: `${p.color}50` }}>
                  <Text className="font-mono text-xs font-bold uppercase mb-1" style={{ color: p.color }}>{p.label}</Text>
                  <Text className="text-white/40 text-[9px] font-mono mb-2">{p.price}</Text>
                  <Text className="text-white text-lg font-bold font-mono">{p.count} Escolas</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Alertas de Vencimento de Trial */}
          <View className="bg-[#0a1128]/90 border border-neonBlue p-5 rounded-sm mb-6">
            <View className="flex-row items-center gap-2 mb-4">
              <Feather name="clock" size={16} color="#eab308" />
              <Text className="text-white text-sm font-bold uppercase tracking-widest font-mono">
                Alertas de Expiração de Trial (Próximos 30 Dias)
              </Text>
            </View>

            {expiringTrials.length === 0 ? (
              <Text className="text-white/40 text-xs font-mono text-center py-4">Nenhum contrato Trial expirando nos próximos 30 dias.</Text>
            ) : (
              expiringTrials.map((item: any) => (
                <View key={item.id} className="bg-yellow-950/20 border border-yellow-500/40 p-3 rounded-sm mb-2 flex-row justify-between items-center">
                  <View>
                    <Text className="text-white font-bold text-xs uppercase font-mono">{item.nome}</Text>
                    <Text className="text-yellow-400/70 text-[10px] font-mono mt-0.5">
                      Expira em: {new Date(item.trialExpiration).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <TouchableOpacity className="bg-yellow-500/20 border border-yellow-500 px-3 py-1 rounded-sm">
                    <Text className="text-yellow-400 font-mono font-bold text-[10px] uppercase">Converter Contrato</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </View>
  );
}
