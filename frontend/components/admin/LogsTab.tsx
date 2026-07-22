import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../../services/api';

interface LogsTabProps {
  schools?: any[];
  initialInstitutionId?: string | null;
}

export function LogsTab({ schools = [], initialInstitutionId = null }: LogsTabProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInstId, setSelectedInstId] = useState<string | null>(initialInstitutionId);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async (currentPage = page, currentLimit = limit, searchInput = search, instId = selectedInstId) => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: currentLimit,
      };
      if (searchInput.trim()) {
        params.search = searchInput.trim();
      }
      if (instId) {
        params.institutionId = instId;
      }

      const res = await api.get('/logs', { params });

      if (res.data && Array.isArray(res.data.logs)) {
        setLogs(res.data.logs);
        setPage(res.data.page || currentPage);
        setTotalPages(res.data.totalPages || 1);
        setTotalLogs(res.data.total || 0);
      } else if (Array.isArray(res.data)) {
        setLogs(res.data);
        setTotalLogs(res.data.length);
        setTotalPages(Math.ceil(res.data.length / currentLimit) || 1);
      } else {
        setLogs([]);
        setTotalLogs(0);
        setTotalPages(1);
      }
    } catch (e) {
      console.error('Erro ao buscar logs', e);
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, limit, search, selectedInstId);
  }, [limit, selectedInstId]);

  const handleSearchSubmit = () => {
    setPage(1);
    fetchLogs(1, limit, search, selectedInstId);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <View className="flex-1 pt-2">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="w-2 h-8 bg-neonBlue mr-3" />
          <Text className="text-white text-lg font-bold uppercase tracking-[0.2em]">Registro de Ações</Text>
        </View>
        <Text className="text-neonBlue/80 text-xs font-mono font-bold">
          Total: {totalLogs} registros
        </Text>
      </View>

      {/* Filtro por Instituição (se houver escolas fornecidas) */}
      {schools.length > 0 && (
        <View className="mb-4">
          <Text className="text-white/50 text-[10px] uppercase font-mono mb-2">Filtrar por Instituição:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => { setSelectedInstId(null); setPage(1); }}
                className={`px-3 py-1.5 rounded-sm border ${selectedInstId === null ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
              >
                <Text className={`text-[10px] font-mono uppercase font-bold ${selectedInstId === null ? 'text-white' : 'text-neonBlue/60'}`}>
                  Todas as Instituições
                </Text>
              </TouchableOpacity>
              {schools.map(s => {
                const isSelected = selectedInstId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => { setSelectedInstId(s.id); setPage(1); }}
                    className={`px-3 py-1.5 rounded-sm border ${isSelected ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
                  >
                    <Text className={`text-[10px] font-mono uppercase font-bold ${isSelected ? 'text-white' : 'text-neonBlue/60'}`}>
                      {s.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Input de Pesquisa por Termo & Seletor de Registros por Página */}
      <View className="mb-4">
        <View className="flex-row gap-2 mb-3">
          <TextInput
            placeholder="Pesquisar por ação, detalhes, operador (nome) ou matrícula..."
            placeholderTextColor="#00f3ff50"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            className="flex-1 bg-black/60 border border-neonBlue/40 text-white text-xs px-4 py-2.5 rounded-sm font-mono"
          />
          <TouchableOpacity
            onPress={handleSearchSubmit}
            className="bg-neonBlue/20 border border-neonBlue px-4 rounded-sm items-center justify-center flex-row gap-1.5"
          >
            <Feather name="search" size={14} color="#00f3ff" />
            <Text className="text-neonBlue font-mono font-bold text-xs uppercase">Buscar</Text>
          </TouchableOpacity>
        </View>

        {/* Seletor de Qtd por Página */}
        <View className="flex-row items-center justify-between bg-black/40 border border-neonBlue/20 px-3 py-2 rounded-sm">
          <Text className="text-white/60 text-[10px] font-mono uppercase">Registros por página:</Text>
          <View className="flex-row gap-2">
            {[10, 20, 50].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => handleLimitChange(num)}
                className={`px-2.5 py-1 rounded-sm border ${limit === num ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
              >
                <Text className={`text-[10px] font-mono font-bold ${limit === num ? 'text-white' : 'text-neonBlue/60'}`}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Conteúdo da Lista de Logs */}
      {loading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#00f3ff" />
          <Text className="text-neonBlue mt-4 font-mono uppercase tracking-widest text-xs animate-pulse">
            Filtrando Histórico de Ações...
          </Text>
        </View>
      ) : logs.length === 0 ? (
        <View className="flex-1 justify-center items-center py-10">
          <Feather name="alert-circle" size={28} color="#00f3ff50" />
          <Text className="text-neonBlue/50 font-mono text-xs uppercase mt-2">Nenhum log encontrado para o filtro digitado.</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
            {logs.map(log => (
              <View key={log.id} className="bg-black/40 border border-neonBlue/20 p-4 rounded-sm flex-row items-start">
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-white font-bold text-sm flex-1 mr-2">{log.action}</Text>
                    <Text className="text-white/40 text-[9px] font-mono">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </Text>
                  </View>

                  {log.details && (
                    <Text className="text-white/70 text-xs font-mono mb-2">{log.details}</Text>
                  )}

                  {log.user && (
                    <Text className="text-neonBlue/70 text-[10px] font-mono uppercase mt-1">
                      Operador: {log.user.nome} ({log.user.role}) - Matrícula: {log.user.matricula}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Controles de Paginação */}
          <View className="flex-row justify-between items-center pt-3 border-t border-neonBlue/20 mt-2">
            <TouchableOpacity
              disabled={page <= 1}
              onPress={() => { const newPage = page - 1; setPage(newPage); fetchLogs(newPage, limit, search, selectedInstId); }}
              className={`px-4 py-2 border rounded-sm ${page <= 1 ? 'border-white/10 opacity-30' : 'border-neonBlue bg-neonBlue/10'}`}
            >
              <Text className="text-white font-mono text-xs font-bold uppercase">← Anterior</Text>
            </TouchableOpacity>

            <Text className="text-neonBlue font-mono text-xs font-bold">
              Página {page} de {totalPages}
            </Text>

            <TouchableOpacity
              disabled={page >= totalPages}
              onPress={() => { const newPage = page + 1; setPage(newPage); fetchLogs(newPage, limit, search, selectedInstId); }}
              className={`px-4 py-2 border rounded-sm ${page >= totalPages ? 'border-white/10 opacity-30' : 'border-neonBlue bg-neonBlue/10'}`}
            >
              <Text className="text-white font-mono text-xs font-bold uppercase">Próxima →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}


