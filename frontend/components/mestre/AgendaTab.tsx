import React from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AgendaTabProps {
  turmas: any[];
  newEventTitulo: string;
  setNewEventTitulo: (title: string) => void;
  newEventDescricao: string;
  setNewEventDescricao: (desc: string) => void;
  newEventData: string;
  setNewEventData: (date: string) => void;
  newEventTipo: string;
  setNewEventTipo: (type: string) => void;
  newEventTurmaIds: string[];
  setNewEventTurmaIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  loadingCalendar: boolean;
  calendarEvents: any[];
  sounds: any;
  setShowDatePicker: (show: boolean) => void;
  handleCreateCalendarEvent: () => void;
  handleDeleteCalendarEvent: (id: string) => void;
}

export const AgendaTab: React.FC<AgendaTabProps> = ({
  turmas,
  newEventTitulo,
  setNewEventTitulo,
  newEventDescricao,
  setNewEventDescricao,
  newEventData,
  setNewEventData,
  newEventTipo,
  setNewEventTipo,
  newEventTurmaIds,
  setNewEventTurmaIds,
  loadingCalendar,
  calendarEvents,
  sounds,
  setShowDatePicker,
  handleCreateCalendarEvent,
  handleDeleteCalendarEvent,
}) => {
  return (
    <View className="bg-[#0a1128]/90 border border-neonBlue/50 p-6 rounded-sm mb-6">
      <Text className="text-white text-lg font-bold uppercase tracking-widest mb-6">Agenda de Apontamentos</Text>

      {/* Form criar apontamento */}
      <View className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-6">
        <Text className="text-white font-bold uppercase text-xs tracking-wider mb-4">Adicionar Apontamento / Atividade</Text>

        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">Título da Atividade:</Text>
        <TextInput
          placeholder="ex: Prova Mensal de História"
          placeholderTextColor="#ffffff33"
          value={newEventTitulo}
          onChangeText={setNewEventTitulo}
          className="bg-black/60 border border-neonBlue/30 text-white px-4 py-2 rounded-sm text-sm mb-3"
          keyboardAppearance="dark"
        />

        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">Descrição / Instruções (Opcional):</Text>
        <TextInput
          placeholder="ex: Trazer caneta preta e folha de almaço"
          placeholderTextColor="#ffffff33"
          value={newEventDescricao}
          onChangeText={setNewEventDescricao}
          className="bg-black/60 border border-neonBlue/30 text-white px-4 py-2 rounded-sm text-sm mb-3"
          keyboardAppearance="dark"
        />

        {/* Data visual de apontamento */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-1">Data do Apontamento:</Text>
        <TouchableOpacity
          onPress={() => { setShowDatePicker(true); sounds.playSelect(); }}
          className="bg-black/60 border border-neonBlue/30 text-white px-4 py-3 rounded-sm text-sm mb-3 flex-row justify-between items-center"
          activeOpacity={0.7}
        >
          <Text className="text-white font-mono">
            {newEventData ? (() => {
              const parts = newEventData.split('-');
              if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/AAAA format for display
              }
              return newEventData;
            })() : 'Selecionar data...'}
          </Text>
          <Feather name="calendar" size={16} color="#00f3ff" />
        </TouchableOpacity>

        {/* Tipo Selector */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-2">Tipo de Apontamento:</Text>
        <View className="flex-row gap-2 mb-3">
          {['PROVA', 'TRABALHO', 'TAREFA', 'EVENTO'].map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => { setNewEventTipo(type); sounds.playSelect(); }}
              className={`flex-1 py-2 border rounded-sm items-center justify-center ${
                newEventTipo === type ? 'bg-neonBlue/20 border-neonBlue' : 'border-neonBlue/20'
              }`}
            >
              <Text className={`text-[9px] font-bold ${newEventTipo === type ? 'text-white' : 'text-neonBlue/40'}`}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Turma Alvo Selector */}
        <Text className="text-white/50 text-[10px] uppercase font-bold mb-2">Turmas Destinatárias:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {turmas.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  setNewEventTurmaIds((prev: string[]) => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]);
                  sounds.playSelect();
                }}
                className={`px-3 py-2 rounded-sm border ${newEventTurmaIds.includes(t.id) ? 'bg-neonBlue/20 border-neonBlue' : 'bg-black/50 border-neonBlue/20'}`}
              >
                <Text className={`text-xs font-bold uppercase ${newEventTurmaIds.includes(t.id) ? 'text-white' : 'text-neonBlue/40'}`}>
                  {t.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={handleCreateCalendarEvent}
          className="bg-neonBlue py-3 rounded-sm items-center justify-center"
        >
          <Text className="text-black font-bold text-xs uppercase tracking-widest">Publicar na Agenda</Text>
        </TouchableOpacity>
      </View>

      {/* Listagem */}
      <Text className="text-white/50 text-xs mb-3 uppercase font-bold">Apontamentos Publicados por Você:</Text>
      {loadingCalendar ? (
        <ActivityIndicator color="#00f3ff" />
      ) : calendarEvents.length === 0 ? (
        <Text className="text-white/30 text-center text-sm my-6">Nenhum apontamento ativo.</Text>
      ) : (
        calendarEvents.map(e => {
          let typeColor = '#ef4444'; // Prova
          if (e.tipo === 'TRABALHO') typeColor = '#eab308';
          if (e.tipo === 'TAREFA') typeColor = '#3b82f6';
          if (e.tipo === 'EVENTO') typeColor = '#a855f7';

          return (
            <View key={e.id} className="bg-black/50 border border-neonBlue/20 p-4 rounded-sm mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-white font-bold text-sm">{e.titulo}</Text>
                  <Text className="text-white/40 text-[10px] mt-1">{e.descricao || 'Sem descrição.'}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { handleDeleteCalendarEvent(e.id); sounds.playSelect(); }}
                  className="p-1"
                >
                  <Feather name="trash-2" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between items-center border-t border-white/5 pt-2 mt-2">
                <Text className="text-neonBlue/50 text-[10px] font-mono">📅 {new Date(e.data).toLocaleDateString('pt-BR')} · 🏫 {e.turmaNome}</Text>
                <View style={{ borderColor: typeColor }} className="border px-2 py-0.5 rounded-sm">
                  <Text style={{ color: typeColor }} className="text-[9px] font-bold font-mono">{e.tipo}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};
