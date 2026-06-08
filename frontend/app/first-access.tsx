import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firstAccess, loadCredentials } from '../services/api';
import { SystemAlert } from '../components/SystemAlert';
import { ACTIVE_ANIMATION_TYPE } from '../config';
import { useSolenSounds } from '../hooks/useSolenSounds';
import { CyberSubmitButton } from '../components/CyberSubmitButton';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function FirstAccessScreen() {
  const router = useRouter();
  const sounds = useSolenSounds();
  const [nickname, setNickname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('ALUNO');
  const [matricula, setMatricula] = useState('');
  const [alertButtons, setAlertButtons] = useState<any[] | undefined>(undefined);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [successRedirect, setSuccessRedirect] = useState(false);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertButtons(undefined);
    setAlertVisible(true);
  };

  const redirectToDashboard = () => {
    if (role === 'PROFESSOR') {
      router.replace('/(mestre)/dashboard');
    } else if (role === 'ARQUITETO') {
      router.replace('/(admin)/dashboard');
    } else {
      router.replace('/(player)/status');
    }
  };

  const handleCloseAlert = () => {
    setAlertVisible(false);
    setAlertButtons(undefined);
    if (successRedirect) {
      redirectToDashboard();
    }
  };

  // Entrance Animation Setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current; // For roll perspective (3D effect)
  const translateXAnim = useRef(new Animated.Value(0)).current;

  const getAnimatedStyle = () => {
    if (ACTIVE_ANIMATION_TYPE === 4) {
      return {
        opacity: fadeAnim,
        transform: [{ translateX: translateXAnim }],
      };
    }
    return {
      opacity: fadeAnim,
      transform: [
        { translateY: slideAnim },
        { scale: scaleAnim },
        { rotate: spinStyle },
      ],
    };
  };

  useEffect(() => {
    if (ACTIVE_ANIMATION_TYPE === 1) {
      fadeAnim.setValue(0);
      slideAnim.setValue(35);
      scaleAnim.setValue(1);
      rotateAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (ACTIVE_ANIMATION_TYPE === 2) {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      scaleAnim.setValue(0.85);
      rotateAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 90,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 90,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (ACTIVE_ANIMATION_TYPE === 4) {
      fadeAnim.setValue(0);
      translateXAnim.setValue(-50);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(translateXAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } else {
      // Animação 3: Holographic Roll
      fadeAnim.setValue(0);
      slideAnim.setValue(80);
      scaleAnim.setValue(0.8);
      rotateAnim.setValue(1); // 1 maps to '-5deg'

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(rotateAnim, {
          toValue: 0,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  useEffect(() => {
    loadCredentials().then(saved => {
      if (saved) {
        setRole(saved.role);
        setMatricula(saved.matricula);
      }
    });
  }, []);

  const handleFirstAccess = async () => {
    if (!nickname.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      sounds.playError();
      showAlert('AVISO DO SISTEMA', 'Preencha todos os campos para despertar seu poder.', 'warning');
      return;
    }

    if (/\s/.test(nickname.trim())) {
      sounds.playError();
      showAlert('AVISO DO SISTEMA', 'O nickname não pode conter espaços.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      sounds.playError();
      showAlert('AVISO DO SISTEMA', 'As senhas não coincidem.', 'warning');
      return;
    }

    if (newPassword.length < 4 || newPassword.length > 12) {
      sounds.playError();
      showAlert('AVISO DO SISTEMA', 'A senha deve ter entre 4 e 12 caracteres.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await firstAccess(nickname.trim(), newPassword.trim());
      
      // Checar se há hardware de biometria cadastrado no celular do Caçador
      const hasHardware = Platform.OS !== 'web' && await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = Platform.OS !== 'web' && await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        setAlertTitle('ATIVAR BIOMETRIA? 🧬');
        setAlertMessage('Gostaria de associar o seu novo acesso à digital (Biometria) deste dispositivo para entrar sem precisar digitar a senha?');
        setAlertButtons([
          {
            text: 'SIM, ATIVAR DIGITAL 🧬',
            onPress: async () => {
              try {
                const challenge = await LocalAuthentication.authenticateAsync({
                  promptMessage: 'Autorizar Despertar por Biometria',
                  fallbackLabel: 'Cancelar',
                });
                
                if (challenge.success) {
                  await AsyncStorage.setItem(
                    '@Solen:biometric_credentials',
                    JSON.stringify({ matricula: matricula.trim(), password: newPassword.trim() })
                  );
                  
                  setAlertTitle('🛡️ DIGITAL VINCULADA');
                  setAlertMessage('Sua digital foi atrelada com sucesso à sua nova senha! Agora você pode "Despertar" instantaneamente!');
                  setAlertButtons(undefined);
                  setAlertType('success');
                  setSuccessRedirect(true);
                  setAlertVisible(true);
                } else {
                  redirectToDashboard();
                }
              } catch (err) {
                console.log('Erro ao associar biometria:', err);
                redirectToDashboard();
              }
            }
          },
          {
            text: 'NÃO, APENAS SENHA 🚪',
            onPress: () => {
              redirectToDashboard();
            }
          }
        ]);
        setAlertType('info');
        setAlertVisible(true);
      } else {
        setSuccessRedirect(true);
        showAlert('PARABÉNS!', 'Seu perfil foi forjado com sucesso! Bem-vindo à jornada.', 'success');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Falha ao atualizar perfil.';
      sounds.playError();
      showAlert('ERRO DO SISTEMA', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const spinStyle = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-5deg'],
  });


  return (
    <SafeAreaView className="flex-1 w-full bg-transparent justify-center items-center">
      <Animated.View style={getAnimatedStyle()} className="w-full items-center">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="w-full max-w-md p-6 items-center"
        >
          <View
            className="w-full bg-[#0a1128]/90 rounded-sm border-2 border-neonBlue p-6 items-center"
          style={{
            shadowColor: '#00f3ff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
            elevation: 15
          }}
        >
          {/* Header */}
          <View className="border-b border-neonBlue/30 w-full pb-3 mb-6 items-center">
            <Text className="text-neonBlue text-2xl font-bold uppercase tracking-[0.3em]">Primeiro Acesso</Text>
            <Text className="text-neonBlue/50 text-xs mt-1 tracking-widest uppercase">Forje seu Herói</Text>
          </View>

          <Text className="text-white/70 text-sm text-center mb-6 leading-5">
            Você acessou o portal com o código de invocação. Agora, defina seu nickname e sua senha pessoal para continuar.
          </Text>

          <TextInput
            className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-lg py-3 rounded-sm mb-4"
            placeholder="Escolha seu Nickname"
            placeholderTextColor="#00f3ff40"
            keyboardAppearance="dark"
            value={nickname}
            onChangeText={setNickname}
            editable={!loading}
          />

          <View className="w-full mb-4 relative justify-center">
            <TextInput
              className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-lg py-3 rounded-sm pl-12 pr-12"
              placeholder="Nova Senha (4-12 carac.)"
              placeholderTextColor="#00f3ff40"
              keyboardAppearance="dark"
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!loading}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity className="absolute right-4" onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#00f3ff80" />
            </TouchableOpacity>
          </View>

          <TextInput
            className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-lg py-3 rounded-sm mb-6 pl-12 pr-12"
            placeholder="Confirme a Senha"
            placeholderTextColor="#00f3ff40"
            keyboardAppearance="dark"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
            secureTextEntry={!showPassword}
          />

          {/* Botão Animado */}
          <View className="mb-4 w-full">
            <CyberSubmitButton
              title="Forjar Perfil"
              loadingTitle="Forjando..."
              loading={loading}
              onPress={handleFirstAccess}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      </Animated.View>

      {/* SystemAlert Customizado */}
      <SystemAlert 
        visible={alertVisible} 
        title={alertTitle} 
        message={alertMessage} 
        type={alertType} 
        buttons={alertButtons}
        onClose={handleCloseAlert} 
      />
    </SafeAreaView>
  );
}
