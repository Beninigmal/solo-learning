import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  logout, 
  getInstitutions, 
  createInstitution, 
  getArchitects, 
  createArchitect,
  updateInstitution,
  updateArchitect,
  blockArchitect,
  deleteArchitect,
  resetArchitectAccess
} from '../../services/api';
import { SystemAlert } from '../../components/SystemAlert';
import { CyberSubmitButton } from '../../components/CyberSubmitButton';
import { ACTIVE_ANIMATION_TYPE } from '../../config';
import { useSolenSounds } from '../../hooks/useSolenSounds';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const sounds = useSolenSounds();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // School states
  const [schools, setSchools] = useState<any[]>([]);
  const [newSchoolNome, setNewSchoolNome] = useState('');
  const [newSchoolTipo, setNewSchoolTipo] = useState('MUNICIPAL');
  const [newSchoolPlano, setNewSchoolPlano] = useState('TRIAL');
  const [newSchoolMaxTurmas, setNewSchoolMaxTurmas] = useState('2');
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);

  // Refs for navigation/feedback
  const scrollViewRef = useRef<ScrollView>(null);
  const schoolInputRef = useRef<TextInput>(null);

  // Architect states
  const [architects, setArchitects] = useState<any[]>([]);
  const [newArchMatricula, setNewArchMatricula] = useState('');
  const [newArchNome, setNewArchNome] = useState('');
  const [newArchNickname, setNewArchNickname] = useState('');
  const [newArchPassword, setNewArchPassword] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [loadingArchitects, setLoadingArchitects] = useState(false);
  const [editingArchitectId, setEditingArchitectId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Architect delete action states
  const [architectToDelete, setArchitectToDelete] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Architect reset action states
  const [architectToReset, setArchitectToReset] = useState<any | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const alertCallback = useRef<(() => void) | null>(null);

  // Entrance Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();

    const checkAuth = async () => {
      try {
        const userRaw = await AsyncStorage.getItem('@Solen:user');
        if (!userRaw) {
          router.replace('/login');
          return;
        }
        const u = JSON.parse(userRaw);
        if (u.role !== 'ADMIN') {
          if (u.role === 'ARQUITETO') router.replace('/(admin)/dashboard');
          else if (u.role === 'PROFESSOR') router.replace('/(mestre)/dashboard');
          else if (u.role === 'ALUNO') router.replace('/(player)/status');
          else router.replace('/login');
          return;
        }
        loadAllData();
      } catch (err) {
        console.error('Erro no checkAuth do superadmin:', err);
        router.replace('/login');
      }
    };

    checkAuth();
  }, []);

  const showAlert = (title: string, msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', callback?: () => void) => {
    if (type === 'success') sounds.playSuccess();
    else if (type === 'error') sounds.playError();
    else sounds.playSelect();

    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertType(type);
    alertCallback.current = callback || null;
    setAlertVisible(true);
  };

  const handleCloseAlert = () => {
    setAlertVisible(false);
    if (alertCallback.current) {
      alertCallback.current();
    }
  };

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const fetchedSchools = await getInstitutions();
      setSchools(fetchedSchools);

      const fetchedArchitects = await getArchitects();
      setArchitects(fetchedArchitects);
    } catch (err) {
      console.error('Erro ao carregar dados do superadmin:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    sounds.playSelect();
    setShowLogoutConfirm(true);
  };

  // School actions
  const handleEditSchoolPress = (school: any) => {
    sounds.playSelect();
    setEditingSchoolId(school.id);
    setNewSchoolNome(school.nome);
    setNewSchoolTipo(school.tipo || 'MUNICIPAL');
    setNewSchoolPlano(school.plano || 'TRIAL');
    setNewSchoolMaxTurmas(String(school.maxTurmasMonarch ?? 2));
    
    // Smoothly scroll to the top of the terminal and focus the input for editing
    setTimeout(() => {
      schoolInputRef.current?.focus();
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const cancelEditSchool = () => {
    sounds.playSelect();
    setEditingSchoolId(null);
    setNewSchoolNome('');
    setNewSchoolTipo('MUNICIPAL');
    setNewSchoolPlano('TRIAL');
    setNewSchoolMaxTurmas('2');
  };

  const handleCreateSchool = async () => {
    if (!newSchoolNome.trim()) {
      showAlert('AVISO DO SISTEMA', 'Insira o nome da instituição.', 'warning');
      return;
    }

    try {
      setLoadingSchools(true);
      if (editingSchoolId) {
        await updateInstitution(editingSchoolId, newSchoolNome.trim(), newSchoolTipo, newSchoolPlano, parseInt(newSchoolMaxTurmas) || 2);
        showAlert('SUCESSO', 'Instituição atualizada com sucesso!', 'success');
        setEditingSchoolId(null);
      } else {
        await createInstitution(newSchoolNome, newSchoolTipo, newSchoolPlano, parseInt(newSchoolMaxTurmas) || 2);
        showAlert('SUCESSO', 'Instituição cadastrada no sistema!', 'success');
      }
      setNewSchoolNome('');
      setNewSchoolTipo('MUNICIPAL');
      setNewSchoolPlano('TRIAL');
      setNewSchoolMaxTurmas('2');
      loadAllData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao processar requisição.';
      showAlert('ERRO DE PROCESSO', msg, 'error');
    } finally {
      setLoadingSchools(false);
    }
  };

  // Architect actions
  const handleEditArchitectPress = (arch: any) => {
    sounds.playSelect();
    setEditingArchitectId(arch.id);
    setNewArchMatricula(arch.matricula);
    setNewArchNome(arch.nome);
    setNewArchNickname(arch.nickname || '');
    setNewArchPassword('');
    setSelectedSchool(arch.instituicao || '');
  };

  const cancelEditArchitect = () => {
    sounds.playSelect();
    setEditingArchitectId(null);
    setNewArchMatricula('');
    setNewArchNome('');
    setNewArchNickname('');
    setNewArchPassword('');
    setSelectedSchool('');
  };

  const handleBlockArchitect = async (id: string, blocked: boolean) => {
    sounds.playSelect();
    try {
      await blockArchitect(id, blocked);
      showAlert(
        'STATUS ATUALIZADO', 
        blocked ? 'Perfil de Arquiteto suspenso com sucesso!' : 'Perfil de Arquiteto desbloqueado com sucesso!', 
        'success'
      );
      loadAllData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao alterar status do arquiteto.';
      showAlert('ERRO DE PROCESSO', msg, 'error');
    }
  };

  const handleDeleteArchitectPress = (arch: any) => {
    sounds.playSelect();
    setArchitectToDelete(arch);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteArchitect = async () => {
    if (!architectToDelete) return;
    try {
      await deleteArchitect(architectToDelete.id);
      showAlert('EXCLUÍDO', 'Perfil de Arquiteto excluído do sistema.', 'success');
      loadAllData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao excluir arquiteto.';
      showAlert('ERRO DE PROCESSO', msg, 'error');
    } finally {
      setShowDeleteConfirm(false);
      setArchitectToDelete(null);
    }
  };

  const handleResetArchitectPress = (arch: any) => {
    sounds.playSelect();
    setArchitectToReset(arch);
    setShowResetConfirm(true);
  };

  const confirmResetArchitect = async () => {
    if (!architectToReset) return;
    try {
      await resetArchitectAccess(architectToReset.id);
      showAlert('RESETADO', 'Acesso do arquiteto resetado com sucesso! A senha voltou a ser "Solen2026".', 'success');
      loadAllData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao resetar arquiteto.';
      showAlert('ERRO DE PROCESSO', msg, 'error');
    } finally {
      setShowResetConfirm(false);
      setArchitectToReset(null);
    }
  };

  const handleCreateArchitect = async () => {
    if (!newArchMatricula.trim() || !newArchNome.trim() || !selectedSchool) {
      showAlert('AVISO DO SISTEMA', 'Preencha matrícula, nome e selecione a escola.', 'warning');
      return;
    }

    try {
      setLoadingArchitects(true);
      if (editingArchitectId) {
        await updateArchitect(editingArchitectId, {
          matricula: newArchMatricula.trim(),
          nome: newArchNome.trim(),
          nickname: newArchNickname.trim() || undefined,
          password: newArchPassword.trim() || undefined,
          instituicao: selectedSchool
        });
        showAlert('SUCESSO', 'Perfil de Arquiteto atualizado!', 'success');
        setEditingArchitectId(null);
      } else {
        await createArchitect(
          newArchMatricula.trim(),
          newArchNome.trim(),
          newArchNickname.trim(),
          newArchPassword || undefined,
          selectedSchool
        );
        showAlert('SUCESSO', 'Perfil de Arquiteto criado com sucesso!', 'success');
      }
      setNewArchMatricula('');
      setNewArchNome('');
      setNewArchNickname('');
      setNewArchPassword('');
      setSelectedSchool('');
      loadAllData();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao processar requisição.';
      showAlert('ERRO DE PROCESSO', msg, 'error');
    } finally {
      setLoadingArchitects(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent p-6 w-full lg:max-w-6xl lg:mx-auto">
      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* HUD Header */}
        <View className="flex-row justify-between items-center mb-6 mt-4 border-b border-neonBlue/30 pb-4">
          <View>
            <Text className="text-neonBlue text-2xl font-bold uppercase tracking-[0.3em] font-mono">Matrix</Text>
            <Text className="text-white/50 text-xs mt-1 tracking-widest uppercase font-mono">Root Terminal</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => {
                sounds.playSelect();
                showAlert('Guia Matrix', "SUPERADMIN (Root Terminal):\nAqui você controla as raízes absolutas do sistema Solen.\n\n• INSTITUIÇÕES: Crie escolas e corporações parceiras no sistema. Cada instituição funciona de forma isolada.\n• FORJAR ARQUITETOS: Crie credenciais globais para diretores de escolas e vincule-os a uma Instituição. O Arquiteto será o 'deus' daquela instituição, gerenciando Turmas, Alunos e Professores.\n• GERENCIAR ACESSOS: Bloqueie (Suspenda) ou Exclua Arquitetos que não fazem mais parte da rede.\n\n⚠️ Cuidado: Este painel afeta toda a infraestrutura multitenant do jogo.", 'info');
              }}
              className="bg-neonBlue/10 p-3 border border-neonBlue/40 rounded-full"
              activeOpacity={0.7}
            >
              <Feather name="help-circle" size={18} color="#00f3ff" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleLogout} 
              className="bg-red-900/30 p-3 border border-red-900/50 rounded-full"
              activeOpacity={0.7}
            >
              <Feather name="power" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Scroll Container */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadAllData} tintColor="#00f3ff" colors={['#00f3ff']} />
          }
        >
          {/* ================= SEÇÃO DE INSTITUIÇÕES ================= */}
          <View className="bg-[#0a1128]/90 border border-neonBlue p-6 rounded-sm mb-6">
            <View className="flex-row items-center gap-2 mb-6">
              <Feather name="home" size={18} color="#00f3ff" />
              <Text className="text-white text-base font-bold uppercase tracking-widest">Instituições</Text>
            </View>

            {/* Criar Escola */}
            <View className="bg-black/50 border border-neonBlue/30 p-4 rounded-sm mb-6">
              <Text className="text-white/70 font-mono text-xs uppercase font-bold mb-3 text-center">
                {editingSchoolId ? 'Transmutar Instituição' : 'Registrar Nova Escola'}
              </Text>
              <TextInput
                ref={schoolInputRef}
                placeholder="Nome da escola (ex: Ruben Dário)"
                placeholderTextColor="#00f3ff80"
                value={newSchoolNome}
                onChangeText={setNewSchoolNome}
                className="w-full bg-black/60 border border-neonBlue text-white text-center text-sm py-3 rounded-sm mb-4 font-mono"
                keyboardAppearance="dark"
              />

              <Text className="text-white/50 text-[10px] uppercase font-mono mb-2 text-center">Tipo de Instituição:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {[
                    { id: 'MUNICIPAL', label: 'Municipal (Fund)' },
                    { id: 'ESTADUAL', label: 'Estadual (Médio)' },
                    { id: 'PRIVADO', label: 'Escola Privada' },
                    { id: 'PRIVADO_LIVRE', label: 'Privado Livre' }
                  ].map((t) => {
                    const isSelected = newSchoolTipo === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => { setNewSchoolTipo(t.id); sounds.playSelect(); }}
                        className={`px-3 py-2 rounded-sm border ${isSelected ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
                      >
                        <Text className={`text-[10px] font-mono uppercase font-bold ${isSelected ? 'text-white' : 'text-neonBlue/60'}`}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text className="text-white/50 text-[10px] uppercase font-mono mb-2 text-center">Plano SaaS:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {[
                    { id: 'TRIAL', label: 'Trial' },
                    { id: 'RANK_B', label: 'Rank B' },
                    { id: 'RANK_A', label: 'Rank A' },
                    { id: 'RANK_S', label: 'Rank S' }
                  ].map((p) => {
                    const isSelected = newSchoolPlano === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => { setNewSchoolPlano(p.id); sounds.playSelect(); }}
                        className={`px-3 py-2 rounded-sm border ${isSelected ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/60 border-neonBlue/30'}`}
                      >
                        <Text className={`text-[10px] font-mono uppercase font-bold ${isSelected ? 'text-white' : 'text-neonBlue/60'}`}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text className="text-white/50 text-[10px] uppercase font-mono mb-2 text-center">Máximo de Turmas (Monarch):</Text>
              <TextInput
                placeholder="Ex: 2"
                placeholderTextColor="#00f3ff80"
                value={newSchoolMaxTurmas}
                onChangeText={setNewSchoolMaxTurmas}
                keyboardType="numeric"
                className="w-full bg-black/60 border border-neonBlue text-white text-center text-sm py-3 rounded-sm mb-6 font-mono"
                keyboardAppearance="dark"
              />

              <View className={editingSchoolId ? 'flex-row gap-2' : 'w-full'}>
                {editingSchoolId && (
                  <TouchableOpacity
                    onPress={cancelEditSchool}
                    className="flex-1 bg-black border border-neonBlue py-3.5 rounded-sm items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-neonBlue font-mono font-bold uppercase text-xs tracking-wider">Cancelar</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: editingSchoolId ? 2 : 1 }}>
                  <CyberSubmitButton
                    title={editingSchoolId ? 'Salvar Alterações' : 'Cadastrar Escola'}
                    loadingTitle="Processando..."
                    loading={loadingSchools}
                    onPress={handleCreateSchool}
                    textClassName="text-xs"
                  />
                </View>
              </View>
            </View>

            {/* Listar Escolas */}
            <View>
              <Text className="text-white/50 font-bold uppercase text-[10px] tracking-wider mb-4 font-mono">Escolas Cadastradas ({schools.length})</Text>
              
              {schools.length === 0 ? (
                <Text className="text-white/30 text-center font-mono py-6 text-xs">Nenhuma instituição cadastrada.</Text>
              ) : (
                schools.map((item) => (
                  <View 
                    key={item.id} 
                    className="bg-black/50 border border-neonBlue/30 p-4 rounded-sm mb-3 flex-row justify-between items-center"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-2.5 h-2.5 rounded-full bg-neonBlue" style={{ shadowColor: '#00f3ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 5 }} />
                      <View>
                        <Text className="text-white text-xs font-mono font-bold uppercase">{item.nome}</Text>
                        <Text className="text-neonBlue/60 text-[9px] font-mono uppercase mt-0.5">{item.tipo || 'MUNICIPAL'} • {item.plano || 'TRIAL'} ({item.maxTurmasMonarch ?? 2} Turmas)</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <View className="bg-neonBlue/10 border border-neonBlue/30 px-2 py-0.5 rounded-sm">
                        <Text className="text-neonBlue text-[8px] font-mono">@{item.id.slice(0, 8).toUpperCase()}</Text>
                      </View>

                      {/* Botão Editar Escola */}
                      <TouchableOpacity 
                        onPress={() => handleEditSchoolPress(item)}
                        className="bg-black/50 border border-neonBlue/30 p-1.5 rounded-sm"
                        activeOpacity={0.7}
                      >
                        <Feather name="edit-2" size={11} color="#00f3ff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ================= SEÇÃO DE ARQUITETOS ================= */}
          <View className="bg-[#0a1128]/90 border border-neonBlue p-6 rounded-sm mb-6">
            <View className="flex-row items-center gap-2 mb-6">
              <Feather name="users" size={18} color="#00f3ff" />
              <Text className="text-white text-base font-bold uppercase tracking-widest">Arquitetos</Text>
            </View>

            {/* Criar Arquiteto */}
            <View className="bg-black/50 border border-neonBlue/30 p-4 rounded-sm mb-6">
              <Text className="text-white/70 font-mono text-xs uppercase font-bold mb-4 text-center">
                {editingArchitectId ? 'Transmutar Arquiteto' : 'Criar Novo Arquiteto & Vincular'}
              </Text>
              
              <TextInput
                placeholder="Matrícula / Usuário de Acesso"
                placeholderTextColor="#00f3ff80"
                value={newArchMatricula}
                onChangeText={setNewArchMatricula}
                className="w-full bg-black/60 border border-neonBlue text-white text-center text-sm py-3 rounded-sm mb-3 font-mono"
                keyboardAppearance="dark"
                autoCapitalize="none"
              />

              <TextInput
                placeholder="Nome Completo do Arquiteto"
                placeholderTextColor="#00f3ff80"
                value={newArchNome}
                onChangeText={setNewArchNome}
                className="w-full bg-black/60 border border-neonBlue text-white text-center text-sm py-3 rounded-sm mb-3 font-mono"
                keyboardAppearance="dark"
              />

              <TextInput
                placeholder="Apelido / Nickname (opcional)"
                placeholderTextColor="#00f3ff80"
                value={newArchNickname}
                onChangeText={setNewArchNickname}
                className="w-full bg-black/60 border border-neonBlue text-white text-center text-sm py-3 rounded-sm mb-3 font-mono"
                keyboardAppearance="dark"
                autoCapitalize="none"
              />

              <TextInput
                placeholder={editingArchitectId ? "Nova Senha (deixe vazio para manter atual)" : "Senha (deixe vazio para padrão: Solen2026)"}
                placeholderTextColor="#00f3ff80"
                value={newArchPassword}
                onChangeText={setNewArchPassword}
                secureTextEntry
                className="w-full bg-black/60 border border-neonBlue text-white text-center text-sm py-3 rounded-sm mb-4 font-mono"
                keyboardAppearance="dark"
              />

              {/* Escola Selector */}
              <Text className="text-white/50 text-[10px] uppercase font-mono mb-3 text-center">Vincular a Escola Associada:</Text>
              {schools.length === 0 ? (
                <Text className="text-red-500/80 text-xs font-mono mb-6 text-center">Crie uma instituição primeiro!</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                  <View className="flex-row gap-2">
                    {schools.map(s => {
                      const isSelected = selectedSchool === s.nome;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => { setSelectedSchool(s.nome); sounds.playSelect(); }}
                          className={`flex-row items-center gap-1.5 px-4 py-2.5 rounded-sm border ${isSelected ? 'bg-neonBlue/30 border-neonBlue' : 'bg-black/80 border-neonBlue/50'}`}
                          activeOpacity={0.7}
                        >
                          <Feather 
                            name={isSelected ? "check-circle" : "circle"} 
                            size={10} 
                            color={isSelected ? "#fff" : "#00f3ff80"} 
                          />
                          <Text className={`text-xs font-mono ${isSelected ? 'text-white font-bold' : 'text-neonBlue font-medium'}`}>
                            {s.nome}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              <View className={editingArchitectId ? 'flex-row gap-2' : 'w-full'}>
                {editingArchitectId && (
                  <TouchableOpacity
                    onPress={cancelEditArchitect}
                    className="flex-1 bg-black border border-neonBlue py-3.5 rounded-sm items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-neonBlue font-mono font-bold uppercase text-xs tracking-wider">Cancelar</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: editingArchitectId ? 2 : 1 }}>
                  <CyberSubmitButton
                    title={editingArchitectId ? 'Salvar Alterações' : 'Criar Arquiteto'}
                    loadingTitle="Processando..."
                    loading={loadingArchitects}
                    onPress={handleCreateArchitect}
                    textClassName="text-xs"
                  />
                </View>
              </View>
            </View>

            {/* Listar Arquitetos */}
            <View>
              <Text className="text-white/50 font-bold uppercase text-[10px] tracking-wider mb-4 font-mono">Arquitetos no Sistema ({architects.length})</Text>
              
              {architects.length === 0 ? (
                <Text className="text-white/30 text-center font-mono py-6 text-xs">Nenhum arquiteto cadastrado.</Text>
              ) : (
                architects.map((item) => (
                  <View 
                    key={item.id} 
                    className="bg-black/50 border border-neonBlue/30 p-4 rounded-sm mb-3"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className={`text-white text-xs font-mono font-bold uppercase shrink ${item.blocked ? 'line-through text-white/40' : ''}`} numberOfLines={1} ellipsizeMode="tail">{item.nome}</Text>
                          <View className={`border px-1.5 py-0.5 rounded-sm ${item.blocked ? 'bg-red-950/20 border-red-500/50' : 'bg-neonBlue/20 border-neonBlue'}`}>
                            <Text className={`text-[8px] font-bold font-mono ${item.blocked ? 'text-red-400' : 'text-neonBlue'}`}>@{item.matricula}</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1.5 mt-1.5">
                          <Feather name="home" size={10} color={item.blocked ? "#ef444480" : "#00f3ff"} />
                          <Text className={`${item.blocked ? 'text-red-500/40' : 'text-neonBlue/60'} text-[10px] font-mono uppercase shrink`} numberOfLines={1} ellipsizeMode="tail">{item.instituicao || 'Nenhuma'}</Text>
                        </View>
                      </View>
                      
                      {/* Ações */}
                      <View className="flex-row items-center gap-2">
                        {/* Editar */}
                        <TouchableOpacity 
                          onPress={() => handleEditArchitectPress(item)}
                          className="bg-black/50 border border-neonBlue/30 p-1.5 rounded-sm"
                          activeOpacity={0.7}
                        >
                          <Feather name="edit-2" size={11} color="#00f3ff" />
                        </TouchableOpacity>

                        {/* Resetar Senha (Novidade) */}
                        <TouchableOpacity 
                          onPress={() => handleResetArchitectPress(item)}
                          className="bg-yellow-950/20 p-1.5 border border-yellow-600/30 rounded-sm"
                          activeOpacity={0.7}
                        >
                          <Feather name="key" size={11} color="#eab308" />
                        </TouchableOpacity>

                        {/* Bloquear / Desbloquear */}
                        <TouchableOpacity 
                          onPress={() => handleBlockArchitect(item.id, !item.blocked)}
                          className={`p-1.5 rounded-sm border ${item.blocked ? 'bg-red-950/40 border-red-500/50' : 'bg-black/50 border-neonBlue/30'}`}
                          activeOpacity={0.7}
                        >
                          <Feather name={item.blocked ? "lock" : "unlock"} size={11} color={item.blocked ? "#ef4444" : "#00f3ff"} />
                        </TouchableOpacity>

                        {/* Excluir */}
                        <TouchableOpacity 
                          onPress={() => handleDeleteArchitectPress(item)}
                          className="bg-red-950/40 border border-red-500/50 p-1.5 rounded-sm"
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={11} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>

        {/* Custom Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <View className="absolute top-0 bottom-0 left-0 right-0 bg-black/85 z-50 justify-center items-center p-5">
            <View 
              className="bg-[#080d1a] border-2 border-neonBlue rounded-sm p-6 w-full max-w-sm shadow-2xl items-center"
              style={{
                shadowColor: "#00f3ff",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 15,
                elevation: 20,
              }}
            >
              <Feather name="alert-triangle" size={32} color="#00f3ff" className="mb-4" />
              <Text className="text-white text-lg font-bold uppercase tracking-wider mb-2 font-mono">Desconectar</Text>
              <Text className="text-white/70 text-xs text-center mb-6 font-mono">Deseja realmente sair do Matrix Terminal?</Text>
              
              <View className="flex-row gap-3 w-full">
                <TouchableOpacity 
                  className="flex-1 bg-black border border-neonBlue/50 py-3 rounded-sm items-center"
                  onPress={() => { sounds.playSelect(); setShowLogoutConfirm(false); }}
                >
                  <Text className="text-neonBlue font-bold uppercase tracking-widest text-[10px] font-mono">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-red-500/20 border border-red-500 py-3 rounded-sm items-center"
                  onPress={async () => {
                    sounds.playSelect();
                    setShowLogoutConfirm(false);
                    await logout();
                    router.replace('/login');
                  }}
                >
                  <Text className="text-red-400 font-bold uppercase tracking-widest text-[10px] font-mono">Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Custom Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <View className="absolute top-0 bottom-0 left-0 right-0 bg-black/85 z-50 justify-center items-center p-5">
            <View 
              className="bg-[#080d1a] border-2 border-red-500 rounded-sm p-6 w-full max-w-sm shadow-2xl items-center"
              style={{
                shadowColor: "#ef4444",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 15,
                elevation: 20,
              }}
            >
              <Feather name="trash-2" size={32} color="#ef4444" className="mb-4" />
              <Text className="text-white text-lg font-bold uppercase tracking-wider mb-2 font-mono">Excluir Registro</Text>
              <Text className="text-white/70 text-xs text-center mb-6 font-mono">
                Deseja realmente excluir o arquiteto {architectToDelete?.nome} (Matrícula: {architectToDelete?.matricula})? Esta ação é irreversível e removerá permanentemente o acesso dele ao sistema.
              </Text>
              
              <View className="flex-row gap-3 w-full">
                <TouchableOpacity 
                  className="flex-1 bg-black border border-neonBlue py-3.5 rounded-sm items-center justify-center"
                  onPress={() => { sounds.playSelect(); setShowDeleteConfirm(false); setArchitectToDelete(null); }}
                >
                  <Text className="text-neonBlue font-bold uppercase tracking-widest text-[10px] font-mono">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-red-500/20 border border-red-500 py-3.5 rounded-sm items-center justify-center"
                  onPress={confirmDeleteArchitect}
                >
                  <Text className="text-red-400 font-bold uppercase tracking-widest text-[10px] font-mono">Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Custom Reset Confirmation Modal */}
        {showResetConfirm && (
          <View className="absolute top-0 bottom-0 left-0 right-0 bg-black/85 z-50 justify-center items-center p-5">
            <View 
              className="bg-[#080d1a] border-2 border-yellow-500 rounded-sm p-6 w-full max-w-sm shadow-2xl items-center"
              style={{
                shadowColor: "#eab308",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 15,
                elevation: 20,
              }}
            >
              <Feather name="key" size={32} color="#eab308" className="mb-4" />
              <Text className="text-white text-lg font-bold uppercase tracking-wider mb-2 font-mono">Resetar Acesso</Text>
              <Text className="text-white/70 text-xs text-center mb-6 font-mono">
                Deseja realmente resetar o acesso do arquiteto {architectToReset?.nome} (Matrícula: {architectToReset?.matricula})? A senha padrão voltará a ser "Solen2026" e o apelido será limpo.
              </Text>
              
              <View className="flex-row gap-3 w-full">
                <TouchableOpacity 
                  className="flex-1 bg-black border border-neonBlue py-3.5 rounded-sm items-center justify-center"
                  onPress={() => { sounds.playSelect(); setShowResetConfirm(false); setArchitectToReset(null); }}
                >
                  <Text className="text-neonBlue font-bold uppercase tracking-widest text-[10px] font-mono">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-yellow-500/20 border border-yellow-500 py-3.5 rounded-sm items-center justify-center"
                  onPress={confirmResetArchitect}
                >
                  <Text className="text-yellow-400 font-bold uppercase tracking-widest text-[10px] font-mono">Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Cyber Alert */}
        <SystemAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMsg}
          type={alertType}
          onClose={handleCloseAlert}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
