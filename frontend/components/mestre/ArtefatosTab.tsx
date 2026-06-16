import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { giftArtifactToStudent } from '../../services/api';

interface ArtefatosTabProps {
  turmas: any[];
  selectedTurmaId: string | null;
  setSelectedTurmaId: (id: string | null) => void;
  loadingRadar: boolean;
  students: any[];
  sounds: any;
  showAlert: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ArtefatosTab: React.FC<ArtefatosTabProps> = ({
  turmas,
  selectedTurmaId,
  setSelectedTurmaId,
  loadingRadar,
  students,
  sounds,
  showAlert,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [giftingId, setGiftingId] = useState<string | null>(null);

  const ARTEFATOS_DISPONIVEIS = [
    { id: 'pocao_cura', name: 'Poção de Cura', type: 'epic', icon: 'heart', description: 'Restaura a integridade de uma quest do Baú para 100% de XP, limpando as penalidades de erros.' },
    { id: 'sussurros_sabios', name: 'Sussurros Sábios', type: 'legendary', icon: 'message-square', description: 'Envia um pedido de ajuda ao Mestre para dica pedagógica. Concede tentativa extra e +50% de XP.' },
    { id: 'becker_alquimista', name: 'Becker do Alquimista', type: 'legendary', icon: 'droplet', description: 'Consome a essência alquímica para ganhar instantaneamente +500 XP flat!' },
    { id: 'olhar_monarca', name: 'Olhar do Monarca', type: 'legendary', icon: 'eye', description: 'Revela os tópicos conceituais que serão exigidos nas próximas missões de Mini Boss ou Boss.' },
    { id: 'elixir_dourado', name: 'Elixir Dourado', type: 'epic', icon: 'zap', description: 'Dobra todo o XP ganho na missão em que for ativado.' },
    { id: 'relogio_tempo', name: 'Relógio Ganha Tempo', type: 'epic', icon: 'clock', description: 'Estende o prazo de expiração de uma missão ativa por mais 24 horas.' },
    { id: 'anel_serpente', name: 'Anel da Serpente', type: 'epic', icon: 'circle', description: 'Aumenta a taxa de drop de artefatos in Mini Bosses em +35% durante 7 dias.' },
    { id: 'lagrima_fenix', name: 'Lágrima da Fênix', type: 'epic', icon: 'wind', description: 'Reseta as tentativas e o temporizador de um Mini Boss falhado.' },
    { id: 'bandeira_guerra', name: 'Bandeira de Guerra', type: 'epic', icon: 'flag', description: 'Concede +20% de ganho de XP para toda a party nas próximas 24 horas.' },
    { id: 'orbe_perspicacia', name: 'Orbe de Perspicácia', type: 'epic', icon: 'globe', description: 'Permite ver o próximo tópico conceitual no caminho de missões da Guilda.' },
    { id: 'chave_mestra', name: 'Chave Mestra', type: 'epic', icon: 'key', description: 'Permite entrar em qualquer party ativa, mesmo se o limite já tiver sido atingido.' },
    { id: 'cetro_exilio', name: 'Cetro do Exílio', type: 'epic', icon: 'shield', description: 'Expulsa um invasor indesejado de uma masmorra/party ativa.' },
    { id: 'sapatilhas_veloz', name: 'Sapatilhas do Mundo Lento', type: 'magic', icon: 'feather', description: 'Reduz a dificuldade da missão diária ativa em 1 nível.' },
    { id: 'varinha_pinheiro', name: 'Varinha de Pinheiro', type: 'magic', icon: 'wand', description: 'Transforma uma missão discursiva em múltipla escolha.' },
    { id: 'mao_midas', name: 'Mão de Midas', type: 'legendary', icon: 'shuffle', description: 'Consome essência para transmutar um artefato repetido em outro aleatório!' },
    { id: 'martelo_magico', name: 'Martelo Mágico', type: 'magic', icon: 'tool', description: 'Fraciona um problema complexo em 3 pequenos passos passo-a-passo.' },
    { id: 'pena_escriba', name: 'Pena do Escriba', type: 'magic', icon: 'edit-3', description: 'Decodifica e exibe as palavras-chaves essenciais esperadas pelo validador.' },
    { id: 'pergaminho_oraculo', name: 'Pergaminho do Oráculo', type: 'magic', icon: 'eye', description: 'Concede uma dica enigmática e conceitual sobre a questão.' },
    { id: 'poeira_estelar', name: 'Poeira Estelar', type: 'magic', icon: 'sparkles', description: 'Elimina uma alternativa incorreta em qualquer missão de múltipla escolha.' },
    { id: 'chapeu_arcanista', name: 'Chapéu do Arcanista', type: 'legendary', icon: 'cpu', description: 'Aumenta a chance de dropar itens Épicos em missões comuns e Lendários em Bosses por 7 dias.' }
  ];

  const handleGift = async (artifactId: string) => {
    if (!selectedStudentId) {
      showAlert('Aviso', 'Selecione um Caçador primeiro.', 'warning');
      return;
    }
    const studentName = students.find(s => s.id === selectedStudentId)?.nome || 'Caçador';
    const artifactName = ARTEFATOS_DISPONIVEIS.find(a => a.id === artifactId)?.name || 'Artefato';

    try {
      setGiftingId(artifactId);
      sounds.playSelect();
      await giftArtifactToStudent(selectedStudentId, artifactId);
      sounds.playSuccess?.() || sounds.playSelect();
      showAlert(
        '🎁 TRANSMUTAÇÃO CONCLUÍDA',
        `Você concedeu com sucesso o artefato "${artifactName}" para o arsenal de ${studentName}!`,
        'success'
      );
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao conceder artefato.';
      showAlert('Falha na Forja', msg, 'error');
    } finally {
      setGiftingId(null);
    }
  };

  const getBadgeStyle = (type: string) => {
    if (type === 'legendary') {
      return {
        viewClass: 'bg-yellow-950/40 border border-yellow-500/60',
        textClass: 'text-yellow-400'
      };
    }
    if (type === 'epic') {
      return {
        viewClass: 'bg-purple-950/40 border border-purple-500/60',
        textClass: 'text-purple-400'
      };
    }
    return {
      viewClass: 'bg-cyan-950/40 border border-[#00f3ff]/60',
      textClass: 'text-[#00f3ff]'
    };
  };

  return (
    <View className="flex-1">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-4">Conceder Artefatos</Text>

      {/* 1. Selecionar Turma */}
      <Text className="text-neonBlue font-bold text-xs uppercase tracking-wider mb-2 font-mono">1. SELECIONE A TURMA</Text>
      {turmas.length === 0 ? (
        <Text className="text-white/50 text-center mb-4">Nenhuma turma detectada.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 max-h-12">
          {turmas.map(t => (
            <TouchableOpacity 
              key={t.id} 
              onPress={() => { 
                setSelectedTurmaId(t.id); 
                setSelectedStudentId(null);
                sounds.playSelect(); 
              }}
              className={`px-4 py-2 border rounded-sm mr-3 justify-center ${selectedTurmaId === t.id ? 'bg-neonBlue border-neonBlue' : 'border-neonBlue/30'}`}
            >
              <Text className={`font-bold ${selectedTurmaId === t.id ? 'text-black' : 'text-neonBlue'}`}>{t.nome}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 2. Selecionar Aluno */}
      {selectedTurmaId && (
        <View className="mb-6">
          <Text className="text-neonBlue font-bold text-xs uppercase tracking-wider mb-2 font-mono">2. SELECIONE O CAÇADOR (PLAYER)</Text>
          {loadingRadar ? (
            <ActivityIndicator color="#00f3ff" size="small" className="my-4" />
          ) : students.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-14">
              {students.map(s => (
                <TouchableOpacity 
                  key={s.id} 
                  onPress={() => { 
                    setSelectedStudentId(s.id); 
                    sounds.playSelect(); 
                  }}
                  className={`px-4 py-2 border rounded-sm mr-3 justify-center items-center ${selectedStudentId === s.id ? 'bg-neonBlue border-neonBlue' : 'border-neonBlue/20 bg-black/40'}`}
                >
                  <Text className={`font-bold text-xs ${selectedStudentId === s.id ? 'text-black' : 'text-white'}`}>{s.nickname || s.nome}</Text>
                  <Text className={`text-[8px] font-mono ${selectedStudentId === s.id ? 'text-black/60' : 'text-white/40'}`}>Lvl {s.level}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text className="text-white/30 text-xs italic">Nenhum caçador ativo nesta turma.</Text>
          )}
        </View>
      )}

      {/* 3. Selecionar Artefato para Conceder */}
      {selectedStudentId && (
        <View className="mt-2">
          <Text className="text-neonBlue font-bold text-xs uppercase tracking-wider mb-3 font-mono">3. SELECIONE O ARTEFATO PARA CONCEDER</Text>
          <View className="gap-3">
            {ARTEFATOS_DISPONIVEIS.map(art => {
              const badgeStyle = getBadgeStyle(art.type);
              const isGifting = giftingId === art.id;

              return (
                <View key={art.id} className="bg-black/60 border border-neonBlue/10 p-4 rounded-sm flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Feather name={art.icon as any} size={14} color="#00f3ff" />
                      <Text className="text-white font-bold text-sm">{art.name}</Text>
                      <View className={`px-2 py-0.5 rounded-full ${badgeStyle.viewClass}`}>
                        <Text className={`text-[8px] font-bold uppercase tracking-widest font-mono ${badgeStyle.textClass}`}>{art.type}</Text>
                      </View>
                    </View>
                    <Text className="text-white/50 text-[10px] leading-4">{art.description}</Text>
                  </View>

                  <TouchableOpacity
                    disabled={isGifting}
                    onPress={() => handleGift(art.id)}
                    className="bg-neonBlue/15 border border-neonBlue p-3 rounded-sm items-center justify-center min-w-[100px]"
                  >
                    {isGifting ? (
                      <ActivityIndicator size="small" color="#00f3ff" />
                    ) : (
                      <View className="flex-row items-center gap-1">
                        <Feather name="gift" size={14} color="#00f3ff" />
                        <Text className="text-neonBlue font-bold text-xs uppercase tracking-widest font-mono">Conceder</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};
