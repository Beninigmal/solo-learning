import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface BountyBug {
  id: string;
  description: string;
  turmaNome: string;
  instituicao: string;
  imageUrl?: string | null;
  status: string;
  createdAt: string;
  user: {
    nome: string;
    matricula: string;
  };
}

interface BountyAdminTabProps {
  pendingBounties: BountyBug[];
  loadingBounties: boolean;
  fetchPendingBounties: () => void;
  handleApproveBounty: (id: string) => void;
  handleRejectBounty: (id: string) => void;
  sounds: any;
}

export function BountyAdminTab({
  pendingBounties,
  loadingBounties,
  fetchPendingBounties,
  handleApproveBounty,
  handleRejectBounty,
  sounds,
}: BountyAdminTabProps) {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  useEffect(() => {
    fetchPendingBounties();
  }, []);

  const filteredBounties = pendingBounties.filter((bug) => {
    if (filterStatus === 'ALL') return true;
    return bug.status === filterStatus;
  });

  return (
    <View className="flex-1 pt-2">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="w-2 h-8 bg-neonBlue mr-3" />
          <Text className="text-white text-lg font-bold uppercase tracking-[0.2em]">Painel Bounty Hunter</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            sounds.playSelect();
            fetchPendingBounties();
          }}
          className="bg-neonBlue/10 p-2 border border-neonBlue/30 rounded-full"
        >
          <Feather name="refresh-cw" size={14} color="#00f3ff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row bg-black/40 border border-neonBlue/20 rounded-sm p-1 mb-4">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => {
              sounds.playSelect();
              setFilterStatus(status);
            }}
            className={`flex-1 py-1.5 items-center rounded-sm ${
              filterStatus === status ? 'bg-neonBlue/30 border border-neonBlue' : ''
            }`}
          >
            <Text
              className={`text-[8px] font-bold uppercase font-mono tracking-wider ${
                filterStatus === status ? 'text-white' : 'text-neonBlue/50'
              }`}
            >
              {status === 'PENDING'
                ? 'Pendentes'
                : status === 'APPROVED'
                ? 'Aprovados'
                : status === 'REJECTED'
                ? 'Reprovados'
                : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loadingBounties ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#00f3ff" />
          <Text className="text-neonBlue mt-4 font-mono uppercase tracking-widest text-xs animate-pulse">
            Sincronizando Relatórios de Bugs...
          </Text>
        </View>
      ) : filteredBounties.length === 0 ? (
        <View className="flex-1 justify-center items-center py-10">
          <Feather name="info" size={28} color="#00f3ff50" />
          <Text className="text-neonBlue/50 font-mono text-xs uppercase mt-2">Nenhum bug reportado nesta categoria.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
          {filteredBounties.map((bug) => (
            <View key={bug.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm">
              <View className="flex-row justify-between items-start border-b border-neonBlue/10 pb-2 mb-3">
                <View>
                  <Text className="text-white font-mono font-bold text-xs uppercase">
                    Caçador: {bug.user?.nome || 'Desconhecido'}
                  </Text>
                  <Text className="text-neonBlue/70 font-mono text-[9px] mt-0.5 uppercase">
                    Turma: {bug.turmaNome} • Inst: {bug.instituicao}
                  </Text>
                </View>
                <View
                  className={`px-2 py-0.5 rounded-sm border ${
                    bug.status === 'APPROVED'
                      ? 'bg-green-500/10 border-green-500/40'
                      : bug.status === 'REJECTED'
                      ? 'bg-red-500/10 border-red-500/40'
                      : 'bg-yellow-500/10 border-yellow-500/40'
                  }`}
                >
                  <Text
                    className={`text-[8px] font-mono font-bold uppercase ${
                      bug.status === 'APPROVED'
                        ? 'text-green-400'
                        : bug.status === 'REJECTED'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {bug.status}
                  </Text>
                </View>
              </View>

              {/* Bug Description details */}
              <Text className="text-white/80 text-xs font-mono mb-3 leading-relaxed">
                {bug.description}
              </Text>

              {/* Attached Image inside admin moderator tab if present */}
              {bug.imageUrl && (
                <View className="mb-3 border border-neonBlue/20 rounded-sm overflow-hidden h-40 bg-black items-center justify-center">
                  <Image source={{ uri: bug.imageUrl }} className="w-full h-full" style={{ resizeMode: 'contain' }} />
                </View>
              )}

              {/* Action Buttons for PENDING bug reports */}
              {bug.status === 'PENDING' && (
                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => {
                      sounds.playSelect();
                      handleApproveBounty(bug.id);
                    }}
                    className="flex-1 bg-green-500/20 border border-green-500 py-2 rounded-sm items-center justify-center flex-row gap-1.5"
                  >
                    <Feather name="check" size={12} color="#4ade80" />
                    <Text className="text-green-400 font-bold uppercase text-[9px] font-mono tracking-widest">
                      Aprovar Bug
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      sounds.playSelect();
                      handleRejectBounty(bug.id);
                    }}
                    className="flex-1 bg-red-500/20 border border-red-500 py-2 rounded-sm items-center justify-center flex-row gap-1.5"
                  >
                    <Feather name="x" size={12} color="#f87171" />
                    <Text className="text-red-400 font-bold uppercase text-[9px] font-mono tracking-widest">
                      Reprovar
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
