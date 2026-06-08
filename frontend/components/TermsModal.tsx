import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CyberSubmitButton } from './CyberSubmitButton';

interface TermsModalProps {
  visible: boolean;
  role: string;
  onAccept: (parentConsentName?: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function TermsModal({ visible, role, onAccept, onCancel, loading = false }: TermsModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [parentName, setParentName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isStudent = role === 'ALUNO';

  const handleConfirm = async () => {
    if (!isChecked) {
      setErrorMsg('Você precisa aceitar os Termos e Políticas para prosseguir.');
      return;
    }

    if (isStudent && !parentName.trim()) {
      setErrorMsg('Por favor, informe o nome do seu responsável legal para fins de LGPD.');
      return;
    }

    setErrorMsg('');
    try {
      await onAccept(isStudent ? parentName.trim() : undefined);
    } catch (e: any) {
      setErrorMsg(e.message || 'Falha ao salvar o consentimento.');
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} statusBarTranslucent>
      <View className="flex-1 bg-black/90 justify-center items-center p-6 relative">
        <View 
          className="w-full max-h-[85%] bg-[#0a1128]/95 rounded-sm border-2 border-neonBlue p-6 relative overflow-hidden"
          style={{
            shadowColor: '#00f3ff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 15,
            elevation: 15
          }}
        >
          {/* Header */}
          <View className="flex-row items-center gap-3 mb-4 w-full justify-center">
            <Feather name="shield" size={24} color="#00f3ff" />
            <Text className="text-lg font-bold uppercase tracking-widest text-neonBlue text-center font-mono">
              🛡️ Protocolo de Segurança (LGPD)
            </Text>
          </View>

          <Text className="text-white/70 text-xs text-center mb-4 font-mono leading-5">
            O Sistema exige a aceitação do termo de privacidade e autorização para iniciar a jornada.
          </Text>

          {/* Terms Text Content */}
          <ScrollView 
            className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-4 max-h-[220px]" 
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text className="text-neonBlue font-bold text-xs uppercase mb-2 font-mono">1. Termos de Uso e Gamificação</Text>
            <Text className="text-white/60 text-xs mb-4 leading-5">
              O Solen processa dados acadêmicos (participação, acertos, horários escolares e quests resolvidas) para calcular o seu nível, progresso de XP, proficiências e recompensas gamificadas. Este processamento é estritamente limitado ao propósito educacional.
            </Text>

            <Text className="text-neonBlue font-bold text-xs uppercase mb-2 font-mono">2. Proteção de Dados e Privacidade (LGPD)</Text>
            <Text className="text-white/60 text-xs mb-4 leading-5">
              Respeitamos integralmente a Lei Geral de Proteção de Dados (Lei nº 13.709/18). Seus dados pessoais não serão compartilhados com terceiros fora do escopo da sua própria instituição de ensino. Você possui o direito ao esquecimento e pode solicitar a exclusão definitiva dos seus dados a qualquer momento em seu perfil.
            </Text>

            <Text className="text-neonBlue font-bold text-xs uppercase mb-2 font-mono">3. Caçadores Menores de Idade</Text>
            <Text className="text-white/60 text-xs mb-2 leading-5">
              De acordo com o Artigo 14 da LGPD, caçadores (alunos) menores de 18 anos exigem a anuência de pelo menos um dos pais ou responsável legal para o tratamento seguro de seus dados educacionais na plataforma.
            </Text>
          </ScrollView>

          {/* Student Parental Input */}
          {isStudent && (
            <View className="w-full mb-4">
              <Text className="text-white/50 text-[10px] uppercase font-bold mb-2 tracking-wider">
                👤 Nome Completo do Responsável Autorizador (LGPD):
              </Text>
              <TextInput
                placeholder="Ex: Maria Silva de Oliveira"
                placeholderTextColor="#00f3ff40"
                value={parentName}
                onChangeText={setParentName}
                className="w-full bg-black/60 border border-neonBlue text-white text-center text-xs py-3 rounded-sm font-mono"
              />
            </View>
          )}

          {/* Checkbox */}
          <TouchableOpacity 
            onPress={() => setIsChecked(!isChecked)} 
            className="flex-row items-center gap-3 w-full mb-4 px-1"
            activeOpacity={0.8}
          >
            <View className={`w-5 h-5 border rounded-sm items-center justify-center ${isChecked ? 'bg-neonBlue border-neonBlue' : 'border-neonBlue/50 bg-black/40'}`}>
              {isChecked && <Feather name="check" size={14} color="#0a1128" />}
            </View>
            <Text className="text-white text-[11px] font-mono leading-4 flex-1">
              Declaro que li e concordo com os Termos e que os meus dados sejam processados no sistema da instituição.
            </Text>
          </TouchableOpacity>

          {/* Error Message */}
          {errorMsg !== '' && (
            <Text className="text-red-500 text-xs text-center font-mono mb-4">
              ⚠️ {errorMsg}
            </Text>
          )}

          {/* Action Buttons */}
          {loading ? (
            <ActivityIndicator color="#00f3ff" />
          ) : (
            <View className="w-full gap-3">
              <TouchableOpacity 
                onPress={handleConfirm}
                className={`w-full py-3.5 border rounded-sm items-center ${isChecked ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/40 border-white/10 opacity-50'}`}
                disabled={!isChecked}
                activeOpacity={0.7}
              >
                <Text className={`font-bold uppercase tracking-widest text-xs font-mono ${isChecked ? 'text-neonBlue' : 'text-white/20'}`}>
                  Confirmar Aliança e Iniciar ⚔️
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={onCancel}
                className="w-full py-3 bg-red-950/20 border border-red-800/30 rounded-sm items-center"
                activeOpacity={0.7}
              >
                <Text className="font-bold uppercase tracking-widest text-xs font-mono text-red-400">
                  Recusar e Sair 🚪
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
