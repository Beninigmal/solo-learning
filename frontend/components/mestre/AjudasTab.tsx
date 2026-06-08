import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AjudasTabProps {
  loadingHelpRequests: boolean;
  helpRequests: any[];
  helpReplyText: Record<string, string>;
  setHelpReplyText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleReplyHelp: (deliveryId: string, useAi: boolean) => void;
  sounds: any;
}

export const AjudasTab: React.FC<AjudasTabProps> = ({
  loadingHelpRequests,
  helpRequests,
  helpReplyText,
  setHelpReplyText,
  handleReplyHelp,
  sounds,
}) => {
  return (
    <View className="bg-[#1c1202]/90 border border-yellow-600/50 p-6 rounded-sm mb-6">
      <View className="flex-row items-center gap-2 mb-2">
        <Feather name="award" size={20} color="#ffca28" />
        <Text className="text-[#ffca28] text-lg font-bold uppercase tracking-widest">Sussurros Sábios</Text>
      </View>
      <Text className="text-white/60 text-xs font-serif leading-5 mb-6">
        Alunos invocaram sussurros sábios gastando seus artefatos lendários. Como Mestre, você deve ajudá-los "mastigando" o raciocínio sem fornecer a resposta final direto, incentivando a aprendizagem autônoma.
      </Text>

      {loadingHelpRequests ? (
        <ActivityIndicator color="#ffca28" />
      ) : helpRequests.length === 0 ? (
        <Text className="text-white/30 text-center text-sm my-6">Nenhum chamado de ajuda pendente.</Text>
      ) : (
        helpRequests.map((req) => (
          <View key={req.deliveryId} className="bg-black/50 border border-yellow-600/30 p-4 rounded-sm mb-4">
            {/* Header */}
            <View className="flex-row justify-between items-center pb-2 border-b border-white/5 mb-3">
              <View>
                <Text className="text-yellow-500 font-bold text-xs uppercase tracking-wider">⚡ Pergunta Dourada</Text>
                <Text className="text-white/80 font-mono text-[10px]">Caçador: {req.alunoNome || 'Anônimo'}</Text>
              </View>
              <Text className="text-white/40 text-[9px] font-mono">Status: Pendente</Text>
            </View>

            {/* Pergunta do Aluno */}
            <View className="bg-yellow-950/10 p-3 border border-yellow-950/30 rounded-sm mb-3.5">
              <Text className="text-yellow-500/50 text-[9px] font-mono uppercase font-bold mb-1">Questão do Aluno:</Text>
              <Text className="text-white/90 text-xs leading-5 font-serif">{req.questionText}</Text>
            </View>

            {/* Dúvida Específica do Aluno */}
            {req.studentDoubt && (
              <View className="bg-blue-950/10 p-3 border border-blue-950/30 rounded-sm mb-3.5">
                <Text className="text-[#00f3ff] text-[9px] font-mono uppercase font-bold mb-1">Dúvida Específica do Caçador:</Text>
                <Text className="text-white/90 text-xs leading-5 font-serif">{req.studentDoubt}</Text>
              </View>
            )}

            {/* Formulário de Resposta */}
            <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">Escreva sua dica conceitual:</Text>
            <TextInput
              placeholder="ex: Lembre de isolar o X mudando o sinal do termo para..."
              placeholderTextColor="#ffffff22"
              value={helpReplyText[req.deliveryId] || ''}
              onChangeText={(val) => setHelpReplyText(prev => ({ ...prev, [req.deliveryId]: val }))}
              multiline
              numberOfLines={3}
              className="bg-black/60 border border-yellow-600/30 text-white px-4 py-2 rounded-sm text-xs mb-3 font-serif min-h-[60px]"
              keyboardAppearance="dark"
            />

            {/* Ações */}
            <View className="flex-row gap-2 mt-1">
              <TouchableOpacity
                onPress={() => { sounds.playSelect(); handleReplyHelp(req.deliveryId, false); }}
                className="flex-1 bg-yellow-500/20 border border-yellow-500/60 py-2.5 rounded-sm items-center justify-center"
              >
                <Text className="text-yellow-500 font-bold text-[10px] uppercase tracking-wider">Enviar Dica Manual</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { sounds.playSelect(); handleReplyHelp(req.deliveryId, true); }}
                className="flex-1 bg-indigo-950/30 border border-indigo-500/60 py-2.5 rounded-sm items-center justify-center flex-row gap-1"
              >
                <Feather name="cpu" size={10} color="#a5b4fc" />
                <Text className="text-indigo-300 font-bold text-[10px] uppercase tracking-wider">Sugerir Dica por IA</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
};
