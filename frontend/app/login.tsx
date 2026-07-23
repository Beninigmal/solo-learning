import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Modal, ScrollView, Animated, ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fingerprint } from 'lucide-react-native';
import { login, saveCredentials, loadCredentials, getServerUrl, setServerUrl, resetServerUrl, getErrorMessage, registerPushToken } from '../services/api';
import { BASE_URL, getAutoDiscoveredLocalBackendUrl } from '../config';
import { SystemAlert } from '../components/SystemAlert';
import { CyberSubmitButton } from '../components/CyberSubmitButton';
import { useSolenSounds } from '../hooks/useSolenSounds';
import versionInfo from '../version.json';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function LoginScreen() {
  const router = useRouter();
  const sounds = useSolenSounds();
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);

  // Server config modal
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [activeServerUrl, setActiveServerUrl] = useState(BASE_URL);
  const [savingUrl, setSavingUrl] = useState(false);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [alertButtons, setAlertButtons] = useState<any[] | undefined>(undefined);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertButtons(undefined);
    setAlertVisible(true);
  };

  const handleCloseAlert = () => {
    setAlertVisible(false);
    setAlertButtons(undefined);
  };

  // Biometrics States
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnrolled, setBiometricsEnrolled] = useState(false);
  const [biometricCredentials, setBiometricCredentials] = useState<{ matricula: string; password?: string } | null>(null);

  // Button Animation Value
  const glowPulse = useRef(new Animated.Value(0.5)).current;
  const passwordInputRef = useRef<TextInput>(null);

  const registerTokenSafely = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      if (token) {
        await registerPushToken(token);
        console.log('[Login Notifications] Push token registered successfully:', token);
      }
    } catch (e) {
      console.warn('[Login Notifications] Failed to get push token:', e);
    }
  };


  // Carrega credenciais e URL do servidor salvas
  useEffect(() => {
    loadCredentials().then(saved => {
      if (saved) {
        setMatricula(saved.matricula);
        setCredentialsSaved(true);
      }
    });
    getServerUrl().then(url => {
      setActiveServerUrl(url);
      setServerUrlInput(url);
    });

    // Biometrics support checking
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricsAvailable(hasHardware);
          setBiometricsEnrolled(isEnrolled);

          const savedBio = await AsyncStorage.getItem('@Solen:biometric_credentials');
          if (savedBio) {
            setBiometricCredentials(JSON.parse(savedBio));
          }
        } catch (err) {
          console.log('Erro ao checar biometria:', err);
        }
      })();
    }

    // Inicia a música de intro imediatamente ao montar a tela
    sounds.playIntroMusic(0.8);

    // A animação visual começa 1 segundo depois para sincronizar com a música
    const animTimer = setTimeout(() => {
      // Breathing glow loop for the main button
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1.0,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.5,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1000);

    return () => clearTimeout(animTimer);
  }, []);

  const handleLogin = async () => {
    if (!matricula.trim() || !password.trim()) {
      sounds.playError(); // Campo vazio
      showAlert('AVISO DO SISTEMA', 'Preencha todos os campos para ingressar na Dungeon.', 'warning');
      return;
    }
    
    setLoading(true);

    try {
      const user = await login(matricula.trim(), password.trim());
      await saveCredentials(matricula.trim(), user.role);
      await registerTokenSafely();

      const cleanMatricula = matricula.trim();
      // Só perguntar sobre biometria se NÃO há credenciais salvas (nunca vinculada ou resetada manualmente)
      const needsBiometricLink = biometricsAvailable && biometricsEnrolled && !biometricCredentials;

      let nextPath = '/(player)/status';
      if (user.isFirstAccess && (user.role === 'ALUNO' || user.role === 'PROFESSOR' || user.role === 'ARQUITETO')) {
        nextPath = '/first-access';
      } else if (user.role === 'ADMIN') {
        nextPath = '/(superadmin)/dashboard';
      } else if (user.role === 'ARQUITETO') {
        nextPath = '/(admin)/dashboard';
      } else if (user.role === 'PROFESSOR') {
        nextPath = '/(mestre)/dashboard';
      }

      if (needsBiometricLink) {
        setLoading(false);
        setAlertTitle('ATIVAR BIOMETRIA? 🧬');
        setAlertMessage(`Deseja associar o seu acesso (${user.nome}) à digital deste aparelho para realizar logins futuros ultra rápidos?`);
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
                    JSON.stringify({ matricula: cleanMatricula, password: password.trim() })
                  );
                  setBiometricCredentials({ matricula: cleanMatricula, password: password.trim() });
                  
                  setAlertTitle('🛡️ DIGITAL VINCULADA');
                  setAlertMessage('Sua digital foi associada com sucesso ao seu acesso!');
                  setAlertButtons(undefined);
                  setAlertType('success');
                  setAlertVisible(true);
                  
                  sounds.fadeOutIntroMusic(1200);
                  setTimeout(() => {
                    setAlertVisible(false);
                    router.replace(nextPath as any);
                  }, 1200);
                } else {
                  sounds.fadeOutIntroMusic(1200);
                  router.replace(nextPath as any);
                }
              } catch (err) {
                console.log('Erro ao salvar biometria no login:', err);
                sounds.fadeOutIntroMusic(1200);
                router.replace(nextPath as any);
              }
            }
          },
          {
            text: 'NÃO, APENAS SENHA 🚪',
            onPress: () => {
              sounds.fadeOutIntroMusic(1200);
              router.replace(nextPath as any);
            }
          }
        ]);
        setAlertType('info');
        setAlertVisible(true);
      } else {
        // Já existe vínculo biométrico (ou sem hardware) — navegar direto sem modificar credenciais salvas
        setLoading(false);
        sounds.fadeOutIntroMusic(1200);
        setTimeout(() => {
          router.replace(nextPath as any);
        }, 300);
      }
    } catch (error: any) {
      const msg = getErrorMessage(error);
      setLoading(false);
      sounds.playError(); // Toca o som de erro de API
      showAlert('ERRO DO SISTEMA', msg, 'error');
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricCredentials) return;
    sounds.playSelect();
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Despertar com Biometria',
        fallbackLabel: 'Usar Senha',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setLoading(true);
        const user = await login(biometricCredentials.matricula, biometricCredentials.password);
        await saveCredentials(biometricCredentials.matricula, user.role);
        await registerTokenSafely();

        let nextPath = '/(player)/status';
        if (user.isFirstAccess && (user.role === 'ALUNO' || user.role === 'PROFESSOR' || user.role === 'ARQUITETO')) {
          nextPath = '/first-access';
        } else if (user.role === 'ADMIN') {
          nextPath = '/(superadmin)/dashboard';
        } else if (user.role === 'ARQUITETO') {
          nextPath = '/(admin)/dashboard';
        } else if (user.role === 'PROFESSOR') {
          nextPath = '/(mestre)/dashboard';
        }

        setLoading(false);
        sounds.fadeOutIntroMusic(1200);
        setTimeout(() => {
          router.replace(nextPath as any);
        }, 300);
      }
    } catch (error: any) {
      setLoading(false);
      sounds.playError();
      showAlert('ERRO DE AUTENTICAÇÃO', getErrorMessage(error), 'error');
    }
  };

  const handleSaveServerUrl = async () => {
    if (!serverUrlInput.trim()) return;
    setSavingUrl(true);
    try {
      await setServerUrl(serverUrlInput);
      setActiveServerUrl(serverUrlInput.trim().replace(/\/$/, ''));
      setShowServerModal(false);
    } finally {
      setSavingUrl(false);
    }
  };

  const handleResetServerUrl = async () => {
    await resetServerUrl();
    const url = await getServerUrl();
    setActiveServerUrl(url);
    setServerUrlInput(url);
    setShowServerModal(false);
  };

  const isTunnel = activeServerUrl.includes('loca.lt') || activeServerUrl.includes('ngrok');



  return (
    <ImageBackground
      source={require('../assets/first.png')}
      style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#050b14' }}
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1 bg-black/60 justify-center items-center">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="w-full max-w-md p-6 items-center"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} className="w-full" showsVerticalScrollIndicator={false}>
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
            <View className="border-b border-neonBlue/30 w-full pb-3 mb-6 items-center relative">
              <Text className="text-neonBlue text-2xl font-bold uppercase tracking-[0.1em] font-mono shadow-lg text-center">Collegium: A Guilda do Aprendiz</Text>
            </View>



            {/* Badge credenciais salvas */}
            {credentialsSaved && (
              <View className="flex-row items-center gap-2 mb-4 bg-neonBlue/10 border border-neonBlue/30 px-3 py-2 rounded-sm w-full">
                <Feather name="check-circle" size={14} color="#00f3ff" />
                <Text className="text-neonBlue/70 text-xs flex-1">Credenciais salvas — só clicar em Entrar</Text>
                <TouchableOpacity onPress={() => { setMatricula(''); setPassword(''); setCredentialsSaved(false); }}>
                  <Feather name="x" size={14} color="#00f3ff60" />
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-lg py-3 rounded-sm mb-4"
              placeholder="Matrícula"
              placeholderTextColor="#00f3ff40"
              keyboardAppearance="dark"
              returnKeyType="next"
              value={matricula}
              onChangeText={setMatricula}
              editable={!loading}
              autoCapitalize="none"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
            />

            <View className="w-full mb-8 relative justify-center">
              <TextInput
                ref={passwordInputRef}
                className="w-full bg-black/50 border border-neonBlue/50 text-white text-center text-lg py-3 rounded-sm pr-12"
                placeholder="Senha"
                placeholderTextColor="#00f3ff40"
                keyboardAppearance="dark"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                secureTextEntry={!showPassword}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity className="absolute right-4" onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#00f3ff80" />
              </TouchableOpacity>
            </View>

            <View className="w-full flex-row gap-3 items-center mb-4">
              <View className="flex-1">
                <CyberSubmitButton
                  title="Despertar"
                  loadingTitle="Conectando ao Portal..."
                  loading={loading}
                  onPress={handleLogin}
                  className="shadow-neon shadow-lg"
                />
              </View>
              {Platform.OS !== 'web' && biometricsAvailable && biometricsEnrolled && biometricCredentials && (
                <TouchableOpacity
                  onPress={handleBiometricLogin}
                  disabled={loading}
                  className="bg-neonBlue/10 border-2 border-neonBlue p-3 rounded-sm items-center justify-center"
                  style={{
                    shadowColor: '#00f3ff',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 10,
                    elevation: 10,
                    height: 52
                  }}
                >
                  <Fingerprint size={24} color="#00f3ff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Botão de configuração do servidor */}
            <TouchableOpacity
              className="flex-row items-center gap-2 mt-1"
              onPress={() => setShowServerModal(true)}
            >
              <Feather name="settings" size={12} color="#00f3ff40" />
              <Text className="text-neonBlue/30 text-xs" numberOfLines={1}>
                {isTunnel ? '🌐 Túnel ativo' : '🔌 Local'} · {activeServerUrl.replace('http://', '').replace('https://', '').slice(0, 28)}
              </Text>
            </TouchableOpacity>

            <Text className="text-neonBlue/20 text-[9px] font-mono mt-3 uppercase tracking-widest text-center">
              v{versionInfo.version}
            </Text>
          </View>

          {/* Centralized Branding Title & Subtitle below card */}
          <View className="mt-8 items-center w-full pb-4">
            <Text className="text-white text-2xl font-black tracking-[0.1em] text-center px-4 uppercase" style={{ textShadowColor: '#00f3ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }}>
              Gamifique seus estudos
            </Text>
            <Text className="text-neonBlue/70 text-xs font-bold tracking-[0.18em] uppercase mt-2 text-center">
              e gerencie sua instituição
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Configurações Globais */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-6">
          <View
            className="w-full max-w-md bg-[#0a1128] border-2 border-neonBlue/60 rounded-sm p-6"
            style={{ shadowColor: '#00f3ff', shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 }}
          >
            <View className="flex-row items-center justify-between mb-6 border-b border-neonBlue/20 pb-3">
              <View className="flex-row items-center gap-3">
                <Feather name="settings" size={20} color="#00f3ff" />
                <Text className="text-neonBlue font-bold uppercase tracking-widest text-base">Configurações</Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <Feather name="x" size={20} color="#00f3ff60" />
              </TouchableOpacity>
            </View>

            {/* SEÇÃO ÁUDIO */}
            <View className="mb-6 bg-black/30 border border-neonBlue/10 p-3 rounded-sm">
              <Text className="text-neonBlue/40 text-[10px] font-mono mb-2 uppercase tracking-widest">Áudio & Multimídia</Text>
              
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-white text-sm font-bold">Música de Fundo</Text>
                  <Text className="text-neonBlue/50 text-[11px]">Silenciar músicas contínuas</Text>
                </View>
                <TouchableOpacity
                  className={`px-4 py-2 rounded-sm border ${sounds.musicMuted ? 'bg-red-500/10 border-red-500/40' : 'bg-neonBlue/10 border-neonBlue/50'}`}
                  onPress={async () => {
                    await sounds.setMusicMuted(!sounds.musicMuted);
                    if (!sounds.sfxMuted) sounds.playSelect();
                  }}
                >
                  <Text className={`font-mono text-xs font-bold ${sounds.musicMuted ? 'text-red-400' : 'text-neonBlue'}`}>
                    {sounds.musicMuted ? '🔇 MUTADO' : '🔊 ATIVO'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-sm font-bold">Efeitos Sonoros</Text>
                  <Text className="text-neonBlue/50 text-[11px]">Silenciar cliques e ações</Text>
                </View>
                <TouchableOpacity
                  className={`px-4 py-2 rounded-sm border ${sounds.sfxMuted ? 'bg-red-500/10 border-red-500/40' : 'bg-neonBlue/10 border-neonBlue/50'}`}
                  onPress={async () => {
                    await sounds.setSfxMuted(!sounds.sfxMuted);
                    if (!sounds.sfxMuted) sounds.playSelect();
                  }}
                >
                  <Text className={`font-mono text-xs font-bold ${sounds.sfxMuted ? 'text-red-400' : 'text-neonBlue'}`}>
                    {sounds.sfxMuted ? '🔇 MUTADO' : '🔊 ATIVO'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SEÇÃO BIOMETRIA */}
            {Platform.OS !== 'web' && (
              <View className="mb-6 bg-black/30 border border-neonBlue/10 p-3 rounded-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-2">
                    <Text className="text-white text-sm font-bold">Acesso Biométrico</Text>
                    <Text className="text-neonBlue/50 text-[11px]" numberOfLines={1}>
                      {biometricCredentials ? '🧬 Digital vinculada' : '❌ Nenhuma digital vinculada'}
                    </Text>
                  </View>
                  {biometricCredentials ? (
                    <TouchableOpacity
                      className="bg-red-500/20 border border-red-500/50 px-3 py-2 rounded-sm"
                      onPress={async () => {
                        try {
                          await AsyncStorage.removeItem('@Solen:biometric_credentials');
                          setBiometricCredentials(null);
                          sounds.playSelect();
                          showAlert('🛡️ DIGITAL REMOVIDA', 'O vínculo biométrico deste aparelho foi apagado com sucesso.', 'success');
                        } catch (err) {
                          console.log('Erro ao remover biometria:', err);
                        }
                      }}
                    >
                      <Text className="text-red-400 text-xs font-bold uppercase">Limpar</Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="bg-neonBlue/5 border border-neonBlue/20 px-3 py-2 rounded-sm">
                      <Text className="text-neonBlue/40 text-[11px] font-bold">AUTOMÁTICO</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* SEÇÃO SERVIDOR */}
            <View className="mb-6">
              <Text className="text-neonBlue/40 text-[10px] font-mono mb-2 uppercase tracking-widest">Portal do Servidor (API)</Text>
              
              {/* URL atual */}
              <View className="bg-black/50 border border-neonBlue/20 rounded-sm p-3 mb-3">
                <Text className="text-neonBlue/40 text-[9px] mb-1 uppercase tracking-widest">URL Conectada</Text>
                <Text className="text-neonBlue/80 text-xs font-mono" numberOfLines={2}>{activeServerUrl}</Text>
              </View>

              <Text className="text-neonBlue/40 text-[9px] mb-1 uppercase tracking-wider">Nova URL de Destino</Text>
              <TextInput
                className="w-full bg-black/50 border border-neonBlue/50 text-white text-sm py-2 px-3 rounded-sm mb-2 font-mono"
                placeholder="https://XXXXX.loca.lt  ou  http://192.168.18.115:3333"
                placeholderTextColor="#00f3ff30"
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                autoCapitalize="none"
                keyboardType="url"
                keyboardAppearance="dark"
              />

              {/* Exemplos rápidos */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="bg-neonBlue/20 border border-neonBlue px-2.5 py-1 rounded-sm"
                    onPress={async () => {
                      await setServerUrl('AUTO');
                      const autoUrl = await getServerUrl();
                      setActiveServerUrl(autoUrl);
                      setServerUrlInput(autoUrl);
                    }}
                  >
                    <Text className="text-neonBlue text-[10px] font-bold">🔍 Auto-Detect (Wi-Fi)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-neonBlue/10 border border-neonBlue/30 px-2 py-1 rounded-sm"
                    onPress={() => setServerUrlInput('https://solo-learning-api.onrender.com')}
                  >
                    <Text className="text-neonBlue/70 text-[10px]">🚀 Render (Produção)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-neonBlue/10 border border-neonBlue/30 px-2 py-1 rounded-sm"
                    onPress={() => setServerUrlInput('https://')}
                  >
                    <Text className="text-neonBlue/70 text-[10px]">🌐 Tunnel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border border-red-500/40 bg-red-500/10 py-3 rounded-sm items-center"
                onPress={handleResetServerUrl}
              >
                <Text className="text-red-400 text-xs font-bold uppercase tracking-wider">Restaurar Padrão</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-neonBlue/20 border border-neonBlue py-3 rounded-sm items-center"
                onPress={handleSaveServerUrl}
                disabled={savingUrl}
              >
                {savingUrl
                  ? <ActivityIndicator size="small" color="#00f3ff" />
                  : <Text className="text-neonBlue text-xs font-bold uppercase tracking-wider">✓ Aplicar URL</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </ImageBackground>
  );
}
