import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ArtifactCard, Artifact } from './ArtifactCard';

interface ArtifactBagProps {
  visible: boolean;
  onClose: () => void;
  artifacts?: Artifact[];
  onUse?: (artifact: Artifact) => void;
  onProfileCardPress?: (artifact: Artifact) => void;
}

const ARTIFACT_CATALOG: Artifact[] = [
  { id: 'sussurros_sabios', name: 'Sussurros Sábios', type: 'legendary', description: 'Envia um pedido de ajuda ao Mestre para liberar uma dica pedagógica. Concede tentativa extra e +50% de XP.' },
  { id: 'becker_alquimista', name: 'Becker do Alquimista', type: 'legendary', description: 'Consome a essência alquímica para ganhar instantaneamente +500 XP flat!' },
  { id: 'olhar_monarca', name: 'Olhar do Monarca', type: 'legendary', description: 'Revela os tópicos conceituais e fórmulas conceituais que serão exigidos nas próximas missões do Mini Boss ou Boss Geral.' },
  { id: 'elixir_dourado', name: 'Elixir Dourado', type: 'epic', description: 'Dobra todo o XP ganho na missão em que for ativado.' },
  { id: 'pocao_cura', name: 'Poção de Cura', type: 'epic', description: 'Restaura a integridade de uma quest do Baú para 100% de XP, limpando as maldições de erros.' },
  { id: 'relogio_tempo', name: 'Relógio Ganha Tempo', type: 'epic', description: 'Estende o prazo de expiração de uma missão ativa por mais 24 horas, evitando que ela expire.' },
  { id: 'anel_serpente', name: 'Anel da Serpente', type: 'epic', description: 'Aumenta a taxa de drop de artefatos em Mini Bosses em +35% para toda a Party durante 7 dias.' },
  { id: 'lagrima_fenix', name: 'Lágrima da Fênix', type: 'epic', description: 'Reseta as tentativas e o temporizador de uma missão de Mini Boss falhada para permitir nova investida imediata.' },
  { id: 'bandeira_guerra', name: 'Bandeira de Guerra da Guilda', type: 'epic', description: 'Ao ser fincado, concede +20% de ganho de XP para toda a party nas próximas 24 horas (apenas Party).' },
  { id: 'orbe_perspicacia', name: 'Orbe de Perspicácia', type: 'epic', description: 'Permite ver o próximo tópico conceitual ou área de conhecimento no caminho de missões da Party/Guilda.' },
  { id: 'chave_mestra', name: 'Chave Mestra', type: 'epic', description: 'Permite entrar em qualquer party ativa, mesmo se o limite de membros já tiver sido atingido.' },
  { id: 'cetro_exilio', name: 'Cetro do Exílio', type: 'epic', description: 'Expulsa um invasor indesejado de uma masmorra/party ativa, revertendo XP roubado.' },
  { id: 'sapatilhas_veloz', name: 'Sapatilhas do Mundo Lento', type: 'magic', description: 'Reduz a dificuldade da missão diária ativa em 1 nível (não afeta Bosses).' },
  { id: 'martelo_magico', name: 'Martelo Mágico', type: 'magic', description: 'Decompõe o problema ativo em passos lógicos de raciocínio lógico/pedagógico sequencial.' },
  { id: 'poeira_estelar', name: 'Poeira Estelar', type: 'magic', description: 'Elimina uma das alternativas incorretas em missões de Múltipla Escolha.' },
  { id: 'pergaminho_oraculo', name: 'Pergaminho do Oráculo', type: 'magic', description: 'Gera uma dica parcial "Quente/Frio" sobre o raciocínio da sua resposta antes de submeter.' },
  { id: 'escudo_arcano', name: 'Escudo Arcano', type: 'magic', description: 'Cancela a maldição de 25% na próxima tentativa errada.' },
  { id: 'bracelete_cristal', name: 'Bracelete de Cristal', type: 'magic', description: 'Absorve a maldição (-25% de XP acumulado por erro) de uma tentativa incorreta (possui 2 cargas).' },
  { id: 'bolsa_sorte', name: 'Bolsa da Sorte', type: 'magic', description: 'Aumenta a taxa de drop de artefatos em missões diárias comuns em +15% por 7 dias.' },
  { id: 'mao_midas', name: 'Mão de Midas', type: 'magic', description: 'Oferece 50% de chance de transmutar um item Mágico em um Épico aleatório (falha destrói o item).' },
  { id: 'pena_escriba', name: 'Pena do Escriba', type: 'magic', description: 'Em perguntas teóricas dissertativas, revela as 3 principais palavras-chave esperadas para aprovação.' },
  { id: 'varinha_pinheiro', name: 'Varinha de Pinheiro', type: 'magic', description: 'Transforma uma missão de cálculo discursiva em múltipla escolha com opções.' },
  { id: 'chapeu_arcanista', name: 'Chapéu do Arcanista', type: 'legendary', description: 'Por 7 dias: missões comuns podem dropar Épicos e Mini Bosses podem dropar Lendários. Não entra no pool de drop enquanto ativo.' }
];

export function ArtifactBag({ visible, onClose, artifacts = [], onUse, onProfileCardPress }: ArtifactBagProps) {
  const [filter, setFilter] = React.useState<'all' | 'legendary' | 'epic' | 'magic'>('all');

  const getRarityWeight = (type?: string) => {
    if (type === 'legendary') return 3;
    if (type === 'epic') return 2;
    if (type === 'magic') return 1;
    return 0;
  };

  // Enrich artifacts with catalog types
  const enrichedArtifacts = React.useMemo(() => {
    return artifacts.map(art => {
      const catalog = ARTIFACT_CATALOG.find(a => a.id === art.id) || art;
      return { ...art, type: catalog.type };
    });
  }, [artifacts]);

  // Sort and filter artifacts
  const sortedAndFiltered = React.useMemo(() => {
    let list = enrichedArtifacts;
    if (filter !== 'all') {
      list = list.filter(art => art.type === filter);
    }
    return [...list].sort((a, b) => getRarityWeight(b.type) - getRarityWeight(a.type));
  }, [enrichedArtifacts, filter]);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/90 justify-end">
        <View className="bg-[#0a1128] border-t-2 border-neonBlue/50 rounded-t-2xl p-6" style={{ maxHeight: '85%' }}>
          
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-neonBlue text-xl font-bold uppercase tracking-[0.2em]">Bolsa de Artefatos</Text>
              <Text className="text-white/40 text-xs mt-1">{artifacts.length} item(s) no inventário</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="bg-white/10 p-2 rounded-full">
              <Feather name="x" size={20} color="#ffffff80" />
            </TouchableOpacity>
          </View>

          {/* Category Filter Bar */}
          <View className="flex-row gap-2 mb-5 flex-wrap">
            <TouchableOpacity 
              onPress={() => setFilter('all')} 
              className={`px-3 py-1.5 rounded-sm border ${
                filter === 'all' 
                  ? 'bg-neonBlue/20 border-neonBlue' 
                  : 'bg-black/40 border-white/10'
              }`}
            >
              <Text className={`text-[9px] font-mono font-bold uppercase ${filter === 'all' ? 'text-neonBlue' : 'text-white/40'}`}>
                Todos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setFilter('legendary')} 
              className={`px-3 py-1.5 rounded-sm border ${
                filter === 'legendary' 
                  ? 'bg-yellow-500/20 border-yellow-500' 
                  : 'bg-black/40 border-white/10'
              }`}
            >
              <Text className={`text-[9px] font-mono font-bold uppercase ${filter === 'legendary' ? 'text-yellow-400' : 'text-white/40'}`}>
                🏆 Lendário
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setFilter('epic')} 
              className={`px-3 py-1.5 rounded-sm border ${
                filter === 'epic' 
                  ? 'bg-purple-500/20 border-purple-500' 
                  : 'bg-black/40 border-white/10'
              }`}
            >
              <Text className={`text-[9px] font-mono font-bold uppercase ${filter === 'epic' ? 'text-purple-400' : 'text-white/40'}`}>
                ⭐ Épico
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setFilter('magic')} 
              className={`px-3 py-1.5 rounded-sm border ${
                filter === 'magic' 
                  ? 'bg-cyan-500/20 border-cyan-500' 
                  : 'bg-black/40 border-white/10'
              }`}
            >
              <Text className={`text-[9px] font-mono font-bold uppercase ${filter === 'magic' ? 'text-cyan-400' : 'text-white/40'}`}>
                🔮 Mágico
              </Text>
            </TouchableOpacity>
          </View>
 
          <ScrollView showsVerticalScrollIndicator={false}>
            {sortedAndFiltered.length === 0 ? (
              <View className="items-center py-12">
                <Feather name="briefcase" size={48} color="#00f3ff30" />
                <Text className="text-white/30 text-sm mt-4 text-center uppercase tracking-widest">Inventário Vazio</Text>
                <Text className="text-white/20 text-xs mt-2 text-center">Nenhum artefato encontrado nesta categoria!</Text>
              </View>
            ) : (
              <View className="items-center justify-center">
                <Text className="text-white/40 text-[9px] uppercase font-mono tracking-widest mb-3">
                  Deslize para o lado · Toque para escolher
                </Text>
                <ScrollView 
                   horizontal={true} 
                   showsHorizontalScrollIndicator={false}
                   contentContainerStyle={{ paddingHorizontal: 10, gap: 16, alignItems: 'center' }}
                   className="py-2"
                >
                  {sortedAndFiltered.map((artifact, index) => {
                    const catalog = ARTIFACT_CATALOG.find(a => a.id === artifact.id) || artifact;
                    return (
                      <ArtifactCard
                        key={`${artifact.id}-${index}`}
                        artifact={catalog as any}
                        size="normal"
                        animated={true}
                        onPress={() => {
                          onClose();
                          if (onUse) {
                            onUse(artifact);
                          } else if (onProfileCardPress) {
                            onProfileCardPress(artifact);
                          }
                        }}
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Catálogo */}
            <View className="mt-4 border-t border-neonBlue/20 pt-6">
              <Text className="text-white/30 text-xs font-bold uppercase tracking-widest mb-4">Catálogo de Artefatos</Text>
              {ARTIFACT_CATALOG.map(a => {
                const isLegendary = a.type === 'legendary';
                const isEpic = a.type === 'epic';
                const iconName = isLegendary ? 'award' : isEpic ? 'star' : 'hexagon';
                const iconColor = isLegendary ? '#ffca28' : isEpic ? '#a349ff' : '#00f3ff';
                const typeLabel = isLegendary ? 'Lendário' : isEpic ? 'Épico' : 'Mágico';
                const textStyle = isLegendary ? 'text-yellow-400' : isEpic ? 'text-purple-400' : 'text-cyan-400';
                return (
                  <View key={a.id} className="flex-row items-center gap-3 mb-3 opacity-50">
                    <Feather name={iconName} size={14} color={iconColor} />
                    <Text className="text-white text-xs flex-1">{a.name}</Text>
                    <Text className={`text-[10px] uppercase font-bold ${textStyle}`}>
                      {typeLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
