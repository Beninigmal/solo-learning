import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../services/api';
import { SelectPicker } from '../SelectPicker';

interface Message {
  id: string;
  sender: 'user' | 'ordinator';
  text: string;
  widget?: {
    type: 'STUDENT_LIST' | 'BATCH_CONFIRM' | 'TIMETABLE_PREVIEW' | 'GENERIC_CONFIRM' | 'RAG_CITATIONS';
    data: any;
  };
  attachment?: {
    name: string;
    content: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

interface OrdinatorTabProps {
  onDataChanged?: () => void;
  currentUser?: any;
}

export function OrdinatorTab({ onDataChanged, currentUser }: OrdinatorTabProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Layout Management States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(width >= 1024);

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Bom dia';
    if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
    else if (hour >= 18) greeting = 'Boa noite';
    const name = currentUser?.nome ? currentUser.nome.split(' ')[0] : 'Arquiteto';
    return `${greeting} ${name}, como posso te ajudar hoje?`;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      sender: 'ordinator',
      text: getGreeting()
    }
  ]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{name: string, content: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [turmas, setTurmas] = useState<any[]>([]);
  
  // Document RAG management states
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Inspector Panel State (Generative UI right column)
  const [activeWidget, setActiveWidget] = useState<{
    type: 'STUDENT_LIST' | 'TEACHER_LIST' | 'DYNAMIC_DATA_GRID' | 'BATCH_CONFIRM' | 'TIMETABLE_PREVIEW' | 'GENERIC_CONFIRM' | 'RAG_CITATIONS';
    data: any;
    msgId: string;
  } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/ordinator/documents');
      setDocuments(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/ordinator/sessions');
      const data = res.data || [];
      setSessions(data);
      return data;
    } catch (e) {
      console.error('Erro ao buscar sessões:', e);
      return [];
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/ordinator/sessions/${sessionId}`);
      const session = res.data;
      setCurrentSessionId(sessionId);
      
      const mappedMessages = session.messages.map((m: any) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        widget: m.widgetType ? { type: m.widgetType, data: m.widgetData } : undefined
      }));

      if (mappedMessages.length === 0) {
        setMessages([
          {
            id: 'initial',
            sender: 'ordinator',
            text: 'Nova conversa iniciada. Como posso auxiliar no planejamento da instituição hoje?'
          }
        ]);
      } else {
        setMessages(mappedMessages);
        
        const lastMsgWithWidget = [...mappedMessages].reverse().find(m => m.widget);
        if (lastMsgWithWidget) {
          setActiveWidget({
            type: lastMsgWithWidget.widget.type,
            data: lastMsgWithWidget.widget.data,
            msgId: lastMsgWithWidget.id
          });
          setIsInspectorOpen(true);
          if (isDesktop) setIsSidebarOpen(false);
        } else {
          setActiveWidget(null);
          setIsInspectorOpen(false);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar mensagens da sessão:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewSession = async () => {
    try {
      setLoading(true);
      const res = await api.post('/ordinator/sessions');
      const newSession = res.data;
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([
        {
          id: 'initial',
          sender: 'ordinator',
          text: getGreeting()
        }
      ]);
      setActiveWidget(null);
      setIsInspectorOpen(false);
      if (isDesktop) setIsSidebarOpen(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api.delete(`/ordinator/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([
          {
            id: 'initial',
            sender: 'ordinator',
            text: 'Selecione uma conversa ou inicie uma nova na barra lateral.'
          }
        ]);
        setActiveWidget(null);
        setIsInspectorOpen(false);
      }
    } catch (e) {
      console.error('Erro ao deletar sessão:', e);
    }
  };

  useEffect(() => {
    const fetchTurmas = async () => {
      try {
        const res = await api.get('/admin/turmas');
        const sorted = (res.data || []).sort((a: any, b: any) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));
        setTurmas(sorted);
      } catch (e) {
        console.error(e);
      }
    };
    
    const initData = async () => {
      await fetchTurmas();
      await fetchDocs();
      const sessionsList = await fetchSessions();
      if (sessionsList.length > 0) {
        loadSession(sessionsList[0].id);
      } else {
        handleCreateNewSession();
      }
    };

    initData();
    if (width >= 1024) {
      setIsSidebarOpen(false);
      setIsInspectorOpen(true);
    } else {
      setIsSidebarOpen(false);
      setIsInspectorOpen(false);
    }
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const convertFileToBase64 = (file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      fetch(file.uri)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });
  };

  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
        multiple: false
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const base64 = await convertFileToBase64(result.assets[0]);
        const res = await api.post('/ordinator/upload', { filename: result.assets[0].name, base64 });
        if (res.data.success) {
          setAttachedFile({ name: result.assets[0].name, content: res.data.text });
        } else {
          alert('Erro ao processar arquivo no servidor.');
        }
      }
    } catch (err) {
      console.log('Error picking document', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/csv', 'application/octet-stream'],
        copyToCacheDirectory: true,
        multiple: false
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLoadingDoc(true);
        const response = await fetch(file.uri);
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const textContent = reader.result as string;
          try {
            await api.post('/ordinator/documents', {
              filename: file.name,
              content: textContent
            });
            fetchDocs();
          } catch (e: any) {
            console.error('Erro ao fazer upload do regulamento', e);
          } finally {
            setLoadingDoc(false);
          }
        };
        reader.readAsText(blob);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      setLoadingDoc(true);
      await api.delete(`/ordinator/documents/${id}`);
      fetchDocs();
    } catch (e) {
      console.error('Erro ao remover documento', e);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    const currentAttachment = attachedFile;
    
    setInput('');
    setAttachedFile(null);
    setMessages(prev => {
      const updatedMessages = prev.map(m => {
        if (m.widget && (m.widget.type === 'GENERIC_CONFIRM' || m.widget.type === 'BATCH_CONFIRM')) {
          return { ...m, widget: undefined };
        }
        return m;
      });
      return [...updatedMessages, { 
        id: Date.now().toString(), 
        sender: 'user', 
        text: userMsg,
        attachment: currentAttachment ? { name: currentAttachment.name, content: currentAttachment.content } : undefined
      }];
    });
    setLoading(true);
    
    // Clear old active widget to prevent it from persisting or reappearing unless the new response provides one
    setActiveWidget(null);
    if (!isDesktop) {
      setIsInspectorOpen(false);
    }

    let fullPayload = userMsg;
    if (currentAttachment) {
      fullPayload += `\n\n${currentAttachment.content}`;
    }

    try {
      const response = await api.post('/ordinator/chat', { 
        message: fullPayload, 
        sessionId: currentSessionId 
      });
      
      const replyMsgId = (Date.now() + 1).toString();
      
      if (response.data.sessionId && response.data.sessionId !== currentSessionId) {
        setCurrentSessionId(response.data.sessionId);
        fetchSessions();
      }

      const newMsg: Message = { 
        id: replyMsgId, 
        sender: 'ordinator', 
        text: response.data.reply,
        widget: response.data.widget
      };
      console.log('Ordinator response:', response.data);
      
      setMessages(prev => [...prev, newMsg]);

      if (response.data.widget) {
        setActiveWidget({
          type: response.data.widget.type,
          data: response.data.widget.data,
          msgId: replyMsgId
        });
        
        setIsInspectorOpen(true);
        if (isDesktop) {
          setIsSidebarOpen(false);
        }
      }

      if (response.data.action === 'TRIGGER_MONARCH') {
        const shift = response.data.actionData?.shift || 'MATUTINO';
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ordinator', text: `Iniciando o Monarch Engine para o turno ${shift}... (Por favor, aguarde)` }]);
        setLoading(true);
        try {
          await api.post('/quests/institution/timetable/batch-generate', { shift });
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ordinator', text: `Monarch Engine finalizou a geração da grade para o turno ${shift} com sucesso! Todas as restrições foram aplicadas e o dashboard foi atualizado.` }]);
          if (onDataChanged) onDataChanged();
        } catch(e: any) {
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ordinator', text: 'Ocorreu um erro ao executar o Monarch Engine: ' + (e.response?.data?.error || e.message) }]);
        }
      } else if (response.data.action === 'REFRESH_TIMETABLE') {
        if (onDataChanged) onDataChanged();
      }
      
      fetchSessions();
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ordinator', text: 'Houve um distúrbio na conexão. Não pude processar seu pedido.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Interactive Widgets Renderers (Rendered in right inspector panel)

  // 1. Batch Confirm Widget
  const BatchConfirmWidget = ({ widgetData, msgId }: { widgetData: any, msgId: string }) => {
    const [items, setItems] = useState<any[]>(widgetData.items || []);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    const updateItem = (index: number, key: string, value: string) => {
      const copy = [...items];
      copy[index] = { ...copy[index], [key]: value };
      setItems(copy);
    };

    const removeItem = (index: number) => {
      setItems(items.filter((_, i) => i !== index));
    };

    const handleConfirm = async () => {
      setSaving(true);
      try {
        const res = await api.post('/ordinator/confirm-batch', {
          role: widgetData.role,
          items
        });
        setDone(true);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `🎯 [CADASTRO CONFIRMADO] ${res.data.message}`
        }]);
        setActiveWidget(null);
        setIsInspectorOpen(false);
        if (onDataChanged) onDataChanged();
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `❌ Falha ao cadastrar lote: ${err.response?.data?.error || err.message}`
        }]);
      } finally {
        setSaving(false);
      }
    };

    if (done) return <Text className="text-[#00f3ff] font-mono text-center my-12 text-sm font-bold">Lote enviado com sucesso.</Text>;

    return (
      <View className="flex-1 p-5 bg-[#070b19] border border-cyan-500/30 rounded-xl relative flex flex-col justify-between h-full">
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-cyan-500/20">
            <Text className="text-cyan-400 font-mono text-sm uppercase font-bold tracking-wider">
              📋 Revisar Cadastros: {widgetData.role === 'ALUNO' ? 'Alunos' : 'Professores'} ({items.length})
            </Text>
          </View>
          <ScrollView className="flex-1" nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
            {items.map((item, idx) => (
              <View key={idx} className="bg-black/60 border border-cyan-500/10 p-3 mb-3 rounded-lg flex-row flex-wrap gap-3 items-center">
                <View className="flex-1 min-w-[150px]">
                  <Text className="text-white/70 text-[10px] uppercase font-mono mb-1 font-bold">Nome Completo</Text>
                  <TextInput
                    className="bg-black/95 text-white font-mono text-xs border border-cyan-500/40 p-2 rounded-sm"
                    value={item.nome}
                    onChangeText={(val) => updateItem(idx, 'nome', val)}
                  />
                </View>
                <View className="w-32">
                  <Text className="text-white/70 text-[10px] uppercase font-mono mb-1 font-bold">Matrícula</Text>
                  <TextInput
                    className="bg-black/95 text-white font-mono text-xs border border-cyan-500/40 p-2 rounded-sm"
                    value={item.matricula}
                    onChangeText={(val) => updateItem(idx, 'matricula', val)}
                  />
                </View>
                {widgetData.role === 'ALUNO' ? (
                  <>
                    <View className="w-32">
                      <Text className="text-white/70 text-[10px] uppercase font-mono mb-1 font-bold">Turma</Text>
                      <TextInput
                        className="bg-black/95 text-white font-mono text-xs border border-cyan-500/40 p-2 rounded-sm"
                        value={item.turma}
                        onChangeText={(val) => updateItem(idx, 'turma', val)}
                      />
                    </View>
                    <View className="w-32">
                      <Text className="text-white/70 text-[10px] uppercase font-mono mb-1 font-bold">Turno</Text>
                      <TextInput
                        className="bg-black/95 text-white font-mono text-xs border border-cyan-500/40 p-2 rounded-sm"
                        value={item.turno}
                        onChangeText={(val) => updateItem(idx, 'turno', val)}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View className="w-32">
                      <Text className="text-white/70 text-[10px] uppercase font-mono mb-1 font-bold">Contratação</Text>
                      <TextInput
                        className="bg-black/95 text-white font-mono text-xs border border-cyan-500/40 p-2 rounded-sm"
                        value={item.categoria || 'CONCURSADO'}
                        onChangeText={(val) => updateItem(idx, 'categoria', val)}
                        placeholder="CLT, REDA ou CONCURSADO"
                        placeholderTextColor="#ffffff40"
                      />
                    </View>
                    <View className="flex-1 min-w-[100px]">
                      <Text className="text-white/70 text-[10px] uppercase font-mono mb-1 font-bold">Matéria</Text>
                      <TextInput
                        className="bg-black/95 text-white font-mono text-xs border border-cyan-500/40 p-2 rounded-sm"
                        value={item.materia}
                        onChangeText={(val) => updateItem(idx, 'materia', val)}
                      />
                    </View>
                  </>
                )}
                <TouchableOpacity onPress={() => removeItem(idx)} className="bg-red-950/20 border border-red-500/30 p-2 rounded-sm self-end mt-4">
                  <Feather name="trash-2" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={saving || items.length === 0}
          className="bg-cyan-500/20 border border-cyan-400 py-3 rounded-lg items-center justify-center mt-4"
        >
          {saving ? <ActivityIndicator size="small" color="#00f3ff" /> : <Text className="text-[#00f3ff] font-bold uppercase tracking-widest text-sm">Confirmar e Importar</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  // 2. Student List Widget
  const StudentListWidget = ({ widgetData }: { widgetData: any }) => {
    const list = widgetData || [];
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeList, setActiveList] = useState<any[]>(list);

    const handleDelete = async (id: string, name: string) => {
      setActionLoading(id);
      try {
        await api.delete(`/admin/users/${id}`);
        setActiveList(prev => prev.filter(s => s.id !== id));
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `🗑️ [SISTEMA] Aluno ${name} removido com sucesso.`
        }]);
        if (onDataChanged) onDataChanged();
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `❌ Erro ao remover aluno: ${err.message}`
        }]);
      } finally {
        setActionLoading(null);
      }
    };

    const handleMoveTurma = async (id: string, name: string, tId: string) => {
      const selectedTurma = turmas.find(t => t.id === tId);
      if (!selectedTurma) return;
      setActionLoading(id);
      try {
        await api.post(`/admin/users/${id}/move`, { turmaId: tId });
        setActiveList(prev => prev.map(s => s.id === id ? { ...s, turma: selectedTurma.nome } : s));
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `🔄 [SISTEMA] Aluno ${name} transferido para ${selectedTurma.nome}.`
        }]);
        if (onDataChanged) onDataChanged();
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `❌ Erro ao mover aluno: ${err.message}`
        }]);
      } finally {
        setActionLoading(null);
      }
    };

    return (
      <View className="flex-1 p-5 bg-[#070b19] border border-cyan-500/30 rounded-xl h-full">
        <Text className="text-cyan-400 font-mono text-xs uppercase font-bold mb-4 pb-3 border-b border-cyan-500/20">
          🎓 Alunos Encontrados ({activeList.length})
        </Text>
        <ScrollView className="flex-1" nestedScrollEnabled={true}>
          {activeList.map((st) => (
            <View key={st.id} className="bg-black/60 border border-cyan-500/10 p-3 rounded-lg mb-3 flex-row justify-between items-center w-full">
              <View className="flex-1 mr-3">
                <Text className="text-white font-bold text-sm" numberOfLines={1}>{st.nome}</Text>
                <Text className="text-cyan-500/70 text-xs font-mono mt-1">@{st.nickname || 'sem-nickname'} · Matrícula: {st.matricula}</Text>
                <Text className="text-white/60 text-[10px] mt-1 font-mono">Turma Atual: {st.turma}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                {turmas.length > 0 && (
                  <View className="w-28 overflow-hidden border border-cyan-500/25 rounded-sm bg-black/80">
                    <SelectPicker
                      value=""
                      onChange={(tId) => handleMoveTurma(st.id, st.nome, tId)}
                      options={turmas.map(t => ({ label: t.nome, value: t.id }))}
                      placeholder="Mover para..."
                      title="Mudar Turma"
                    />
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => handleDelete(st.id, st.nome)}
                  disabled={!!actionLoading}
                  className="bg-red-950/20 border border-red-500/30 p-2.5 rounded-sm"
                >
                  {actionLoading === st.id ? <ActivityIndicator size="small" color="#ef4444" /> : <Feather name="trash-2" size={14} color="#ef4444" />}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // 2.5 Teacher List Widget
  const TeacherListWidget = ({ widgetData }: { widgetData: any[] }) => {
    const list = Array.isArray(widgetData) ? widgetData : [];
    const [activeList, setActiveList] = useState<any[]>(list);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleDelete = async (id: string, name: string) => {
      setActionLoading(id);
      try {
        await api.delete(`/admin/users/${id}`);
        setActiveList(prev => prev.filter(t => t.id !== id));
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `🗑️ [SISTEMA] Mestre ${name} removido com sucesso.`
        }]);
        if (onDataChanged) onDataChanged();
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `❌ Erro ao remover mestre: ${err.message}`
        }]);
      } finally {
        setActionLoading(null);
      }
    };

    return (
      <View className="flex-1 p-5 bg-[#070b19] border border-cyan-500/30 rounded-xl h-full">
        <Text className="text-cyan-400 font-mono text-xs uppercase font-bold mb-4 pb-3 border-b border-cyan-500/20">
          🧙‍♂️ Mestres Encontrados ({activeList.length})
        </Text>
        <ScrollView className="flex-1" nestedScrollEnabled={true}>
          {activeList.map((st) => (
            <View key={st.id} className="bg-black/60 border border-cyan-500/10 p-3 rounded-lg mb-3 flex-row justify-between items-center w-full">
              <View className="flex-1 mr-3">
                <Text className="text-white font-bold text-sm" numberOfLines={1}>{st.nome}</Text>
                <Text className="text-cyan-500/70 text-xs font-mono mt-1">@{st.nickname || 'sem-nickname'} · Matrícula: {st.matricula}</Text>
                <Text className="text-white/60 text-[10px] mt-1 font-mono">Categoria: {st.categoria} · Carga: {st.aulas}h</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => handleDelete(st.id, st.nome)}
                  disabled={!!actionLoading}
                  className="bg-red-950/20 border border-red-500/30 p-2.5 rounded-sm"
                >
                  {actionLoading === st.id ? <ActivityIndicator size="small" color="#ef4444" /> : <Feather name="trash-2" size={14} color="#ef4444" />}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // 2.6 Dynamic Data Grid Widget
  const DynamicDataGridWidget = ({ widgetData }: { widgetData: any }) => {
    const { entity, items } = widgetData;
    const records = Array.isArray(items) ? items : [];

    if (records.length === 0) {
      return (
        <View className="flex-1 p-5 bg-[#070b19] border border-cyan-500/30 rounded-xl justify-center items-center h-full">
           <Text className="text-cyan-500/40 text-center font-mono text-xs uppercase tracking-widest mt-4">
            Consulta: {entity}
          </Text>
          <Text className="text-white/50 text-xs italic mt-2">Nenhum registro encontrado para estes filtros.</Text>
        </View>
      );
    }

    // Get up to 4 keys for the table headers
    const allKeys = Object.keys(records[0]).filter(k => k !== 'password' && k !== 'id' && typeof records[0][k] !== 'object');
    const cols = allKeys.slice(0, 4);

    return (
      <View className="flex-1 p-5 bg-[#070b19] border border-cyan-500/30 rounded-xl h-full">
        <Text className="text-cyan-400 font-mono text-xs uppercase font-bold mb-4 pb-3 border-b border-cyan-500/20">
          🔍 Resultados ({records.length}) - {entity}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border border-cyan-500/10 rounded-sm mb-4">
          <View>
            <View className="flex-row bg-cyan-900/30 border-b border-cyan-500/30 p-2">
              {cols.map(c => (
                <Text key={c} className="w-32 text-cyan-400 font-bold uppercase text-[10px] tracking-wider" numberOfLines={1}>{c}</Text>
              ))}
            </View>
            <ScrollView className="max-h-[500px]">
              {records.map((r, i) => (
                <View key={i} className={`flex-row p-3 border-b border-white/5 ${i % 2 === 0 ? 'bg-black/40' : 'bg-[#070b19]'}`}>
                  {cols.map(c => (
                    <Text key={c} className="w-32 text-white/80 text-[10px]" numberOfLines={1}>{String(r[c] ?? '-')}</Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  };

  // 3. Timetable Preview Widget
  const TimetablePreviewWidget = ({ widgetData }: { widgetData: any }) => {
    const dias = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
    const posicoes = [1, 2, 3, 4, 5, 6];
    const slots = widgetData.slots || [];

    const getSlotText = (dia: string, pos: number) => {
      const match = slots.find((s: any) => s.diaSemana === dia && s.posicao === pos);
      return match ? match.disciplinaNome : '-';
    };

    return (
      <View className="flex-1 p-5 bg-[#070b19] border border-cyan-500/30 rounded-xl h-full">
        <Text className="text-cyan-400 font-mono text-xs uppercase font-bold mb-4 pb-3 border-b border-cyan-500/20">
          📅 Grade de Horários: {widgetData.turmaNome}
        </Text>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} className="w-full">
            <View className="flex-col">
              {/* Headers */}
              <View className="flex-row border-b border-cyan-500/30 pb-2 mb-2">
                <View className="w-16 justify-center"><Text className="text-cyan-500/60 font-mono text-[10px] text-center font-bold">AULA</Text></View>
                {dias.map(d => (
                  <View key={d} className="w-24"><Text className="text-cyan-400 font-mono text-xs text-center font-bold">{d}</Text></View>
                ))}
              </View>
              {/* Rows */}
              {posicoes.map(pos => (
                <View key={pos} className="flex-row items-center border-b border-cyan-500/10 py-2">
                  <View className="w-16"><Text className="text-cyan-500/60 font-mono text-[10px] text-center">{pos}ª Aula</Text></View>
                  {dias.map(d => {
                    const txt = getSlotText(d, pos);
                    const isAllocated = txt !== '-';
                    return (
                      <View key={d} className="w-24 px-1">
                        <View className={`py-2 rounded-sm border ${isAllocated ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-black/30 border-dashed border-white/10'}`}>
                          <Text className={`text-center font-mono text-[10px] font-bold ${isAllocated ? 'text-white' : 'text-white/20'}`} numberOfLines={1}>
                            {txt}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    );
  };

  // 4. Generic Confirmation Widget
  const GenericConfirmWidget = ({ widgetData }: { widgetData: any }) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleConfirm = async () => {
      setActionLoading(true);
      try {
        if (widgetData.action === 'DELETE_USER') {
          await api.delete(`/admin/users/${widgetData.payload.id}?ai=true`);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'ordinator',
            text: `Ação concluída com êxito!`
          }]);
        }
        setDone(true);
        setActiveWidget(null);
        setIsInspectorOpen(false);
        if (activeWidget?.msgId) {
          setMessages(prev => prev.map(m => m.id === activeWidget.msgId ? { ...m, widget: undefined } : m));
        }
        if (onDataChanged) onDataChanged();
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ordinator',
          text: `❌ Falha ao executar ação: ${err.message}`
        }]);
      } finally {
        setActionLoading(false);
      }
    };

    if (done) return <Text className="text-cyan-400 font-mono text-center my-12 text-sm">Confirmação efetuada.</Text>;

    return (
      <View className="flex-1 p-5 bg-[#070b19] border border-yellow-500/35 rounded-xl justify-center h-full">
        <View className="flex-row items-center gap-2 mb-3">
          <Feather name="alert-triangle" size={20} color="#eab308" />
          <Text className="text-yellow-500 font-bold uppercase tracking-widest text-xs font-mono">
            {widgetData.title || 'Confirmação Necessária'}
          </Text>
        </View>
        <Text className="text-white text-sm mb-6 font-mono leading-5">
          {widgetData.description}
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            testID="confirm-generic-action"
            onPress={handleConfirm}
            disabled={actionLoading}
            className="flex-1 bg-yellow-500/20 border border-yellow-500 py-3 rounded-lg items-center justify-center"
          >
            {actionLoading ? <ActivityIndicator size="small" color="#eab308" /> : <Text className="text-yellow-500 font-bold uppercase tracking-widest text-xs font-mono">Confirmar</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setDone(true);
              setActiveWidget(null);
              setIsInspectorOpen(false);
              if (activeWidget?.msgId) {
                setMessages(prev => prev.map(m => m.id === activeWidget.msgId ? { ...m, widget: undefined } : m));
              }
            }}
            disabled={actionLoading}
            className="flex-1 bg-black/45 border border-white/20 py-3 rounded-lg items-center justify-center"
          >
            <Text className="text-white/60 font-bold uppercase tracking-widest text-xs font-mono">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 5. RAG Citations Widget
  const RagCitationsWidget = ({ widgetData }: { widgetData: any }) => {
    const sources = widgetData.sources || [];
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    return (
      <View className="flex-1 p-5 bg-[#070b19] border border-cyan-500/30 rounded-xl h-full">
        <Text className="text-cyan-400 font-mono text-xs uppercase font-bold mb-4 pb-3 border-b border-cyan-500/20">
          📖 Registros e Logs Localizados via RAG
        </Text>
        <ScrollView className="flex-1" nestedScrollEnabled={true}>
          {sources.length === 0 ? (
            <Text className="text-white/60 text-xs font-mono">Nenhum trecho correspondente no banco semântico.</Text>
          ) : (
            sources.map((src: any, index: number) => (
              <View key={index} className="mb-3 border border-cyan-500/10 rounded-lg overflow-hidden">
                <TouchableOpacity
                  onPress={() => setExpandedIdx(expandedIdx === index ? null : index)}
                  className="bg-black/40 px-3 py-3.5 flex-row justify-between items-center"
                >
                  <View className="flex-row items-center gap-2 flex-1 mr-2">
                    <Feather name="file-text" size={12} color="#00f3ff" />
                    <Text className="text-white font-mono text-xs font-bold" numberOfLines={1}>
                      {src.filename}
                    </Text>
                  </View>
                  <Text className="text-cyan-400/80 font-mono text-[10px]">
                    {src.similarity}% relevância
                  </Text>
                </TouchableOpacity>
                {expandedIdx === index && (
                  <View className="bg-black/70 p-4 border-t border-cyan-500/10">
                    <Text className="text-cyan-200/90 text-xs font-mono leading-5">
                      {src.content}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderInspectorContent = () => {
    if (!activeWidget) {
      return (
        <View className="flex-1 items-center justify-center p-6 border border-dashed border-cyan-500/15 rounded-xl bg-[#040813]/30 h-full">
          <Feather name="clipboard" size={40} color="#00f3ff20" />
          <Text className="text-cyan-500/40 text-center font-mono text-xs uppercase tracking-widest mt-4">
            Painel de Inspeção Ordinator
          </Text>
          <Text className="text-white/55 text-center font-mono text-[10px] mt-2 uppercase leading-4 max-w-[240px] font-bold">
            Selecione uma atividade ou execute uma busca/cadastro no chat para inspecionar os resultados operacionais aqui.
          </Text>
        </View>
      );
    }

    const content = (() => {
      switch (activeWidget.type) {
        case 'BATCH_CONFIRM':
          return <BatchConfirmWidget widgetData={activeWidget.data} msgId={activeWidget.msgId} />;
        case 'STUDENT_LIST':
          return <StudentListWidget widgetData={activeWidget.data} />;
        case 'TEACHER_LIST':
          return <TeacherListWidget widgetData={activeWidget.data} />;
        case 'DYNAMIC_DATA_GRID':
          return <DynamicDataGridWidget widgetData={activeWidget.data} />;
        case 'TIMETABLE_PREVIEW':
          return <TimetablePreviewWidget widgetData={activeWidget.data} />;
        case 'GENERIC_CONFIRM':
          return <GenericConfirmWidget widgetData={activeWidget.data} />;
        case 'RAG_CITATIONS':
          return <RagCitationsWidget widgetData={activeWidget.data} />;
        default:
          return <Text className="text-white font-bold text-xl">WIDGET TIPO DESCONHECIDO: {activeWidget.type}</Text>;
      }
    })();

    return (
      <View style={{ flex: 1 }}>
        {content}
      </View>
    );
  };

  const toggleSidebar = () => {
    const nextVal = !isSidebarOpen;
    setIsSidebarOpen(nextVal);
    if (nextVal) {
      setIsInspectorOpen(false);
    }
  };

  const openInspector = () => {
    setIsInspectorOpen(true);
    setIsSidebarOpen(false);
  };

  const renderSidebarContent = () => (
    <View className="flex-1 flex-col justify-between h-full bg-[#050914] p-3">
      <View className="flex-1">
        <TouchableOpacity
          onPress={handleCreateNewSession}
          className="bg-cyan-500/10 border border-cyan-400/40 py-2.5 px-3 rounded-lg flex-row items-center justify-center gap-2 mb-4"
        >
          <Feather name="plus" size={14} color="#00f3ff" />
          <Text className="text-[#00f3ff] font-mono text-xs uppercase font-bold tracking-wider">Nova Conversa</Text>
        </TouchableOpacity>

        <Text className="text-white/40 text-[9px] uppercase tracking-widest font-mono font-bold mb-3 px-1">Recentes</Text>
        
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {sessions.map(s => {
            const isActive = s.id === currentSessionId;
            return (
              <View
                key={s.id}
                className={`flex-row items-center justify-between p-2 rounded-lg mb-1.5 border ${isActive ? 'bg-cyan-500/10 border-cyan-500/35' : 'bg-transparent border-transparent'}`}
              >
                <TouchableOpacity
                  onPress={() => {
                    loadSession(s.id);
                    if (!isDesktop) setIsSidebarOpen(false);
                  }}
                  className="flex-1 flex-row items-center gap-2 mr-2"
                >
                  <Feather name="message-square" size={12} color={isActive ? '#00f3ff' : '#ffffff60'} />
                  <Text
                    className={`font-mono text-xs truncate max-w-[150px] ${isActive ? 'text-cyan-400 font-bold' : 'text-white/70'}`}
                    numberOfLines={1}
                  >
                    {s.title}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSession(s.id)} className="p-1">
                  <Feather name="trash-2" size={10} color="#ef444490" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
      <Text className="text-white/35 font-mono text-[9px] text-center pt-2 border-t border-white/5 uppercase">Ordinator Session History</Text>
    </View>
  );

  return (
    <View className="flex-1 flex-row gap-4 h-full w-full px-1 py-1 relative">
      {/* 1. Desktop Persistent Sidebar Drawer */}
      {isDesktop && isSidebarOpen && (
        <View className="w-64 bg-[#050914]/90 border border-white/5 rounded-xl overflow-hidden h-full">
          {renderSidebarContent()}
        </View>
      )}

      {/* 2. Mobile Absolute Overlay Sidebar Drawer */}
      {!isDesktop && isSidebarOpen && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsSidebarOpen(false)}
        >
          <View className="flex-1 flex-row">
            <View className="w-3/4 h-full bg-[#050914] border-r border-white/10 shadow-2xl">
              <View className="flex-row items-center justify-between p-3 border-b border-white/5">
                <Text className="text-white font-mono text-xs uppercase font-bold">Menu Conversas</Text>
                <TouchableOpacity onPress={() => setIsSidebarOpen(false)} className="p-1">
                  <Feather name="x" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
              {renderSidebarContent()}
            </View>
            <TouchableOpacity className="flex-1 bg-black/60" onPress={() => setIsSidebarOpen(false)} />
          </View>
        </Modal>
      )}

      {/* Column 1: Chat interface (Open, Borderless ChatGPT/Gemini Style) */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 h-full flex flex-col justify-between relative bg-[#03060f]/20 p-2 rounded-xl"
      >
        {/* Header (Minimalist) */}
        <View className="flex-row items-center justify-between border-b border-white/5 pb-3 mb-4">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={toggleSidebar} className="p-1.5 bg-white/5 border border-white/10 rounded-lg mr-2">
              <Feather name="sidebar" size={14} color="#00f3ff" />
            </TouchableOpacity>
            <Feather name="cpu" size={20} color="#00f3ff" />
            <View>
              <Text className="text-white text-base font-bold uppercase tracking-wider font-mono">Ordinator AI</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            {/* Toggle icon-only layout panel buttons as requested */}
            {!isInspectorOpen && (
              <TouchableOpacity
                onPress={openInspector}
                className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg relative"
              >
                <Feather name="clipboard" size={14} color="#00f3ff" />
                {activeWidget && <View className="w-2 h-2 rounded-full bg-cyan-400 absolute -top-1 -right-1" />}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowDocPanel(!showDocPanel)}
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${showDocPanel ? 'bg-cyan-500/20 border-cyan-400' : 'bg-transparent border-white/10'}`}
            >
              <Feather name="folder" size={12} color="#00f3ff" />
              <Text className="text-[#00f3ff] text-[10px] font-mono font-bold uppercase">RAG</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RAG Knowledge Management Panel */}
        {showDocPanel && (
          <View className="bg-black/85 border border-cyan-500/20 p-3 mb-4 rounded-xl">
            <View className="flex-row justify-between items-center mb-2 pb-2 border-b border-cyan-500/10">
              <Text className="text-white font-mono text-[10px] font-bold uppercase">📁 Vetores Indexados</Text>
              <TouchableOpacity
                onPress={handleUploadDocument}
                disabled={loadingDoc}
                className="bg-cyan-500/20 border border-cyan-400 px-2.5 py-1 rounded-full flex-row items-center gap-1"
              >
                {loadingDoc ? <ActivityIndicator size="small" color="#00f3ff" /> : (
                  <>
                    <Feather name="plus" size={10} color="#00f3ff" />
                    <Text className="text-cyan-400 font-mono text-[8px] uppercase font-bold">Importar TXT/CSV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 80 }}>
              {documents.length === 0 ? (
                <Text className="text-white/60 font-mono text-[9px] py-2 text-center">Nenhum regulamento extra indexado.</Text>
              ) : (
                documents.map(d => (
                  <View key={d.id} className="flex-row justify-between items-center py-1.5 border-b border-white/5">
                    <Text className="text-cyan-300 font-mono text-[10px] flex-1 mr-2" numberOfLines={1}>📄 {d.filename}</Text>
                    <TouchableOpacity onPress={() => handleDeleteDocument(d.id)} className="p-1">
                      <Feather name="trash-2" size={10} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Messages Stream */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 mb-4"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {messages.map(m => {
            const isUser = m.sender === 'user';
            return (
              <View key={m.id} className={`flex-row mb-6 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                {/* Bot Avatar */}
                {!isUser && (
                  <View className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-400/30 items-center justify-center mr-3 mt-1 shadow-sm shadow-cyan-400/20">
                    <Feather name="cpu" size={15} color="#00f3ff" />
                  </View>
                )}

                {/* Message Bubble Container */}
                <View className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <View className={isUser ? 'bg-white/10 border border-white/20 px-4 py-3 rounded-2xl' : 'px-1 py-1'}>
                    <Text testID="chat-message-text" className={`font-mono text-sm leading-6 ${isUser ? 'text-white font-bold' : 'text-slate-100 font-bold'}`}>
                      {m.text}
                    </Text>
                  </View>

                  {/* Inspector Panel Trigger Button for bot widgets */}
                  {m.widget && (
                    <TouchableOpacity
                      onPress={() => {
                        setActiveWidget({
                          type: m.widget!.type,
                          data: m.widget!.data,
                          msgId: m.id
                        });
                        openInspector();
                      }}
                      className={`mt-3 flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${activeWidget?.msgId === m.id && isInspectorOpen ? 'bg-cyan-500/20 border-cyan-400' : 'bg-transparent border-cyan-500/40'}`}
                    >
                      <Feather name="eye" size={11} color="#00f3ff" />
                      <Text className="text-[#00f3ff] font-mono text-[9px] uppercase font-bold tracking-wider">
                        {activeWidget?.msgId === m.id && isInspectorOpen ? 'Inspecionando no Painel' : 'Visualizar Detalhes'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Attached File Chip in Bubble */}
                {isUser && m.attachment && (
                  <View className="mt-2 flex-row items-center bg-[#050914]/50 border border-cyan-500/20 px-3 py-2 rounded-lg gap-2 mr-2">
                    <Feather name="file-text" size={12} color="#00f3ff" />
                    <Text className="text-cyan-400 font-mono text-[10px]" numberOfLines={1}>{m.attachment.name}</Text>
                  </View>
                )}

                {/* User Avatar */}
                {isUser && (
                  <View className="w-9 h-9 rounded-full bg-white/15 border border-white/20 items-center justify-center ml-3 mt-1">
                    <Feather name="user" size={15} color="#ffffff" />
                  </View>
                )}
              </View>
            );
          })}
          {loading && (
            <View className="flex-row mb-6 w-full justify-start">
              <View className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-400/30 items-center justify-center mr-3 mt-1">
                <Feather name="cpu" size={15} color="#00f3ff" />
              </View>
              <View className="px-1 py-3 flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#00f3ff" />
                <Text className="text-cyan-400/80 font-mono text-xs font-bold animate-pulse">Processando dados...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar (Pill / Capsule Style Floating at the bottom) */}
        <View className="flex-col bg-black/85 border border-cyan-500/40 rounded-3xl p-3 shadow-lg shadow-black/90 mb-2">
          
          {attachedFile && (
             <View className="flex-row items-center gap-2 mb-2 ml-1">
               <View className="flex-row items-center bg-[#050914] border border-cyan-500/30 px-3 py-1.5 rounded-full gap-2">
                 <Feather name="file-text" size={12} color="#00f3ff" />
                 <Text className="text-cyan-400 font-mono text-[10px]">{attachedFile.name}</Text>
                 <TouchableOpacity onPress={() => setAttachedFile(null)} className="ml-2">
                   <Feather name="x" size={12} color="#ffffff80" />
                 </TouchableOpacity>
               </View>
             </View>
          )}

          <View className="flex-row items-end gap-3">
            <TouchableOpacity
              onPress={handleAttach}
              disabled={loading}
              className="p-1.5 mb-1 items-center justify-center bg-cyan-500/15 border border-cyan-500/30 rounded-full"
            >
              <Feather name="plus" size={16} color="#00f3ff" />
            </TouchableOpacity>
            
            <TextInput
              testID="chat-input"
              className="flex-1 text-white font-mono text-sm font-bold min-h-[36px] max-h-32 mb-1"
              placeholder="Pergunte sobre turmas, logs, ou cadastre professores..."
              placeholderTextColor="#00f3ff60"
              value={input}
              onChangeText={setInput}
              multiline={true}
              editable={!loading}
              onKeyPress={(e) => {
                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !(e.nativeEvent as any).shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            
            <TouchableOpacity
              testID="chat-send-button"
              onPress={handleSend}
              disabled={loading || (!input.trim() && !attachedFile)}
              className={`p-2 mb-1 rounded-full items-center justify-center ${(!input.trim() && !attachedFile || loading) ? 'opacity-30' : 'bg-cyan-500/15 border border-cyan-400'}`}
            >
              <Feather name="arrow-up" size={16} color="#00f3ff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 3. Desktop Inspector Panel (Split column) */}
      {isDesktop && isInspectorOpen && (
        <View className="w-full lg:w-1/2 h-full flex flex-col bg-[#050914]/65 border border-cyan-500/20 rounded-2xl shadow-2xl shadow-cyan-500/5 overflow-hidden">
          <View className="flex-row justify-between items-center bg-black/25 px-4 py-3 border-b border-cyan-500/10">
            <View className="flex-row items-center gap-2">
              <Feather name="clipboard" size={14} color="#00f3ff" />
              <Text className="text-white font-mono text-xs uppercase font-bold tracking-wider">Visualização de Atividade</Text>
            </View>
            <TouchableOpacity onPress={() => setIsInspectorOpen(false)} className="p-1">
              <Feather name="x" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
          {renderInspectorContent()}
        </View>
      )}

      {/* 5. Mobile Full Screen Inspector Overlay Sheet */}
      {!isDesktop && isInspectorOpen && (
        <Modal
          visible={true}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setIsInspectorOpen(false)}
        >
          <View className="flex-1 bg-[#050914] p-3">
            <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
              <View className="flex-row items-center gap-2">
                <Feather name="clipboard" size={16} color="#00f3ff" />
                <Text className="text-white font-mono text-xs uppercase font-bold">Visualização de Atividade</Text>
              </View>
              <TouchableOpacity onPress={() => setIsInspectorOpen(false)} className="p-2.5 bg-white/5 border border-white/10 rounded-full">
                <Feather name="x" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View className="flex-1">
              {renderInspectorContent()}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
