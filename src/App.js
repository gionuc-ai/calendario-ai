import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Clock, TrendingUp, Settings, Plus, X, Edit2, Power, Trash2, MessageSquare, BarChart3, ChevronLeft, ChevronRight, LogOut, User, Zap, AlertCircle } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVBoIl4nVxPOi7qgq1d0wp_n5c4GqygxA",
  authDomain: "calendario-ai-d976e.firebaseapp.com",
  projectId: "calendario-ai-d976e",
  storageBucket: "calendario-ai-d976e.firebasestorage.app",
  messagingSenderId: "233705052175",
  appId: "1:233705052175:web:3adefa53a9c6c429b3ab7a"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

const CalendarioAI = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [events, setEvents] = useState([]);
  const [habits, setHabits] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  
  const [chatMessages, setChatMessages] = useState([
    { 
      role: 'assistant', 
      content: '👋 Ciao! Sono il tuo assistente calendario intelligente.\n\nPosso aiutarti a:\n• Trovare il momento migliore per un nuovo impegno\n• Analizzare i tuoi giorni più liberi o occupati\n• Suggerirti quando programmare attività\n• Gestire il tuo tempo in modo ottimale\n\nProva a chiedermi: "Quando posso inserire una riunione questa settimana?" oppure "Quali sono i miei giorni più liberi?"' 
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    endTime: '',
    category: 'personale',
    description: ''
  });
  
  const [newHabit, setNewHabit] = useState('');

  const categories = {
    lavoro: '#3b82f6',
    sport: '#10b981',
    studio: '#f59e0b',
    personale: '#8b5cf6'
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserData(currentUser.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveUserData = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        habits,
        events: events.filter(e => !e.fromHabit),
        darkMode,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Errore nel salvataggio dati:', error);
    } finally {
      setSaving(false);
    }
  }, [user, habits, events, darkMode]);

  useEffect(() => {
    if (user && habits.length >= 0) {
      const timer = setTimeout(() => {
        saveUserData();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [habits, events, user, saveUserData]);

  const loadUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setHabits(data.habits || []);
        setEvents(data.events || []);
        setDarkMode(data.darkMode || false);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('Email già in uso');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Password troppo debole (minimo 6 caratteri)');
      } else if (error.code === 'auth/user-not-found') {
        setAuthError('Utente non trovato');
      } else if (error.code === 'auth/wrong-password') {
        setAuthError('Password errata');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Email non valida');
      } else {
        setAuthError('Errore durante l\'autenticazione');
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setHabits([]);
    setEvents([]);
  };

  const parseHabitInput = (input) => {
    const lowerInput = input.toLowerCase();
    const habit = {
      id: Date.now(),
      original: input,
      active: true,
      title: '',
      days: [],
      startTime: '',
      endTime: '',
      startDate: '',
      endDate: '',
      category: 'personale'
    };

    const titleMatch = input.match(/^([^d]+?)(?=\s+(?:dal|dalle|tutti|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|lunedi|martedi|mercoledi|giovedi|venerdi))/i);
    if (titleMatch) {
      habit.title = titleMatch[1].trim();
    } else {
      const fallbackMatch = input.match(/^(.+?)(?=\s+dalle)/i);
      habit.title = fallbackMatch ? fallbackMatch[1].trim() : input.split(' ')[0];
    }

    const dayMap = {
      'lunedì': 1, 'lunedi': 1,
      'martedì': 2, 'martedi': 2,
      'mercoledì': 3, 'mercoledi': 3,
      'giovedì': 4, 'giovedi': 4,
      'venerdì': 5, 'venerdi': 5,
      'sabato': 6,
      'domenica': 0
    };

    if (lowerInput.includes('tutti i giorni') || lowerInput.includes('ogni giorno')) {
      habit.days = [0, 1, 2, 3, 4, 5, 6];
    } else if (lowerInput.match(/dal\s+(lunedì|lunedi|martedì|martedi|mercoledì|mercoledi|giovedì|giovedi|venerdì|venerdi|sabato|domenica)\s+al(la)?\s+(lunedì|lunedi|martedì|martedi|mercoledì|mercoledi|giovedì|giovedi|venerdì|venerdi|sabato|domenica)/)) {
      const daysMatch = lowerInput.match(/dal\s+(lunedì|lunedi|martedì|martedi|mercoledì|mercoledi|giovedì|giovedi|venerdì|venerdi|sabato|domenica)\s+al(la)?\s+(lunedì|lunedi|martedì|martedi|mercoledì|mercoledi|giovedì|giovedi|venerdì|venerdi|sabato|domenica)/);
      if (daysMatch) {
        const startDay = dayMap[daysMatch[1]];
        const endDay = dayMap[daysMatch[3]];
        
        if (startDay <= endDay) {
          for (let d = startDay; d <= endDay; d++) {
            habit.days.push(d);
          }
        } else {
          for (let d = startDay; d <= 6; d++) {
            habit.days.push(d);
          }
          for (let d = 0; d <= endDay; d++) {
            habit.days.push(d);
          }
        }
      }
    } else {
      Object.keys(dayMap).forEach(day => {
        if (lowerInput.includes(day)) {
          const dayNum = dayMap[day];
          if (!habit.days.includes(dayNum)) {
            habit.days.push(dayNum);
          }
        }
      });
    }

    if (habit.days.length === 0) {
      habit.days = [1, 2, 3, 4, 5];
    }

    const timeMatch = input.match(/dalle?\s+(\d{1,2}):?(\d{2})?\s+alle?\s+(\d{1,2}):?(\d{2})?/i);
    if (timeMatch) {
      habit.startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`;
      habit.endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4] || '00'}`;
    }

    const dateMatch = input.match(/dal\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s+al\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (dateMatch) {
      const currentYear = new Date().getFullYear();
      const startYear = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : currentYear;
      const endYear = dateMatch[6] ? (dateMatch[6].length === 2 ? `20${dateMatch[6]}` : dateMatch[6]) : currentYear;
      
      habit.startDate = `${startYear}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      habit.endDate = `${endYear}-${dateMatch[5].padStart(2, '0')}-${dateMatch[4].padStart(2, '0')}`;
      
      if (new Date(habit.startDate) > new Date(habit.endDate)) {
        throw new Error('La data di inizio deve essere precedente alla data di fine');
      }
    } else {
      const today = new Date();
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      habit.startDate = today.toISOString().split('T')[0];
      habit.endDate = endOfYear.toISOString().split('T')[0];
    }

    if (lowerInput.includes('palestra') || lowerInput.includes('gym') || lowerInput.includes('allenamento') || lowerInput.includes('sport')) {
      habit.category = 'sport';
    } else if (lowerInput.includes('studio') || lowerInput.includes('lezione') || lowerInput.includes('università')) {
      habit.category = 'studio';
    } else if (lowerInput.includes('lavoro') || lowerInput.includes('ufficio') || lowerInput.includes('meeting')) {
      habit.category = 'lavoro';
    }

    return habit;
  };

  const generateEventsFromHabit = useCallback((habit) => {
    if (!habit.active || !habit.startDate || !habit.endDate) return [];
    
    const generatedEvents = [];
    const start = new Date(habit.startDate);
    const end = new Date(habit.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (habit.days.includes(d.getDay())) {
        generatedEvents.push({
          id: `${habit.id}-${d.toISOString()}`,
          title: habit.title,
          date: d.toISOString().split('T')[0],
          time: habit.startTime,
          endTime: habit.endTime,
          category: habit.category,
          habitId: habit.id,
          fromHabit: true
        });
      }
    }
    
    return generatedEvents;
  }, []);

  useEffect(() => {
    setEvents(prevEvents => {
      const habitEvents = habits.flatMap(h => generateEventsFromHabit(h));
      const manualEvents = prevEvents.filter(e => !e.fromHabit);
      return [...manualEvents, ...habitEvents];
    });
  }, [habits, generateEventsFromHabit]);

  const addHabit = () => {
    if (newHabit.trim()) {
      try {
        const parsedHabit = parseHabitInput(newHabit);
        
        if (!parsedHabit.title) {
          alert('⚠️ Non ho capito il titolo. Prova: "Lavoro dalle 9 alle 17"');
          return;
        }
        
        if (!parsedHabit.startTime || !parsedHabit.endTime) {
          alert('⚠️ Specifica gli orari. Es: "dalle 9:00 alle 17:00"');
          return;
        }
        
        setHabits(prev => [...prev, parsedHabit]);
        setNewHabit('');
        setShowHabitModal(false);
      } catch (error) {
        alert(`⚠️ Errore: ${error.message}`);
      }
    }
  };

  const toggleHabit = (id) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, active: !h.active } : h));
  };

  const deleteHabit = (id) => {
    const habitToDelete = habits.find(h => h.id === id);
    setConfirmAction({
      title: 'Elimina Abitudine',
      message: `Sei sicuro di voler eliminare l'abitudine "${habitToDelete?.title}"?`,
      onConfirm: () => {
        setHabits(prev => prev.filter(h => h.id !== id));
        setShowConfirmDialog(false);
        setConfirmAction(null);
      }
    });
    setShowConfirmDialog(true);
  };

  const addEvent = () => {
    if (!newEvent.title.trim()) {
      alert('⚠️ Inserisci un titolo per l\'evento');
      return;
    }
    
    if (!newEvent.date) {
      alert('⚠️ Seleziona una data per l\'evento');
      return;
    }

    if (newEvent.time && newEvent.endTime) {
      const [startH, startM] = newEvent.time.split(':').map(Number);
      const [endH, endM] = newEvent.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (endMinutes <= startMinutes) {
        alert('⚠️ L\'orario di fine deve essere successivo all\'orario di inizio');
        return;
      }
    }

    if (editingEvent) {
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id 
          ? { ...newEvent, id: editingEvent.id, fromHabit: false } 
          : e
      ));
      setEditingEvent(null);
    } else {
      setEvents(prev => [...prev, { 
        ...newEvent, 
        id: Date.now(), 
        fromHabit: false,
        title: newEvent.title.trim()
      }]);
    }
    
    setNewEvent({ 
      title: '', 
      date: '', 
      time: '', 
      endTime: '', 
      category: 'personale', 
      description: '' 
    });
    setShowEventModal(false);
  };

  const editEvent = (event) => {
    setNewEvent({
      title: event.title,
      date: event.date,
      time: event.time || '',
      endTime: event.endTime || '',
      category: event.category,
      description: event.description || ''
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const deleteEvent = (id) => {
    const eventToDelete = events.find(e => e.id === id);
    setConfirmAction({
      title: 'Elimina Evento',
      message: `Sei sicuro di voler eliminare "${eventToDelete?.title}"?`,
      onConfirm: () => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setShowConfirmDialog(false);
        setConfirmAction(null);
      }
    });
    setShowConfirmDialog(true);
  };

  const analyzeCalendar = useCallback(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const weekEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= today && eventDate <= nextWeek;
    });

    const dayAnalysis = {};
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      
      const dayEvents = weekEvents.filter(e => e.date === dateStr);
      const totalMinutes = dayEvents.reduce((acc, e) => {
        if (e.time && e.endTime) {
          const [sh, sm] = e.time.split(':').map(Number);
          const [eh, em] = e.endTime.split(':').map(Number);
          return acc + ((eh * 60 + em) - (sh * 60 + sm));
        }
        return acc;
      }, 0);
      
      dayAnalysis[dateStr] = {
        date: day,
        events: dayEvents,
        totalMinutes,
        isFree: dayEvents.length === 0
      };
    }

    return { weekEvents, dayAnalysis };
  }, [events]);

  const findFreeSlots = useCallback((date) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const dayEvents = events
      .filter(e => e.date === dateStr && e.time && e.endTime)
      .sort((a, b) => a.time.localeCompare(b.time));

    const slots = [];
    const workStart = 9 * 60;
    const workEnd = 19 * 60;

    if (dayEvents.length === 0) {
      slots.push({ start: '09:00', end: '19:00', duration: 600 });
      return slots;
    }

    const [fh, fm] = dayEvents[0].time.split(':').map(Number);
    const firstEventStart = fh * 60 + fm;
    if (firstEventStart > workStart) {
      const duration = firstEventStart - workStart;
      if (duration >= 30) {
        slots.push({
          start: '09:00',
          end: dayEvents[0].time,
          duration
        });
      }
    }

    for (let i = 0; i < dayEvents.length - 1; i++) {
      const [eh, em] = dayEvents[i].endTime.split(':').map(Number);
      const [nh, nm] = dayEvents[i + 1].time.split(':').map(Number);
      const gap = (nh * 60 + nm) - (eh * 60 + em);
      
      if (gap >= 30) {
        slots.push({
          start: dayEvents[i].endTime,
          end: dayEvents[i + 1].time,
          duration: gap
        });
      }
    }

    const [lh, lm] = dayEvents[dayEvents.length - 1].endTime.split(':').map(Number);
    const lastEventEnd = lh * 60 + lm;
    if (lastEventEnd < workEnd) {
      const duration = workEnd - lastEventEnd;
      if (duration >= 30) {
        slots.push({
          start: dayEvents[dayEvents.length - 1].endTime,
          end: '19:00',
          duration
        });
      }
    }

    return slots;
  }, [events]);

  const processAICommand = useCallback((message) => {
    const lower = message.toLowerCase();
    const { weekEvents, dayAnalysis } = analyzeCalendar();

    if (lower.includes('giorni') && (lower.includes('liberi') || lower.includes('libero') || lower.includes('disponibil'))) {
      const sortedDays = Object.entries(dayAnalysis)
        .sort((a, b) => a[1].totalMinutes - b[1].totalMinutes)
        .slice(0, 3);

      let response = '📅 **Giorni più liberi questa settimana:**\n\n';
      sortedDays.forEach(([date, info]) => {
        const dayName = info.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
        const hours = (info.totalMinutes / 60).toFixed(1);
        response += `• **${dayName}**: ${info.events.length} eventi (${hours}h impegnate)\n`;
      });
      
      return response;
    }

    if (lower.includes('giorni') && (lower.includes('occupat') || lower.includes('pieno') || lower.includes('pien'))) {
      const sortedDays = Object.entries(dayAnalysis)
        .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
        .slice(0, 3);

      let response = '📊 **Giorni più occupati questa settimana:**\n\n';
      sortedDays.forEach(([date, info]) => {
        const dayName = info.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
        const hours = (info.totalMinutes / 60).toFixed(1);
        response += `• **${dayName}**: ${info.events.length} eventi (${hours}h impegnate)\n`;
      });
      
      return response;
    }

    if (lower.includes('quando') && (lower.includes('inserire') || lower.includes('programmare') || lower.includes('mettere'))) {
      const durationMatch = message.match(/(\d+)\s*(ora|ore|minuti|h|min)/i);
      const requestedMinutes = durationMatch ? 
        (durationMatch[2].includes('ora') || durationMatch[2].includes('h') ? 
          parseInt(durationMatch[1]) * 60 : 
          parseInt(durationMatch[1])) : 60;

      let response = `🎯 **Migliori slot disponibili per un impegno di ${requestedMinutes >= 60 ? Math.floor(requestedMinutes/60) + 'h' : requestedMinutes + 'min'}:**\n\n`;
      let foundSlots = 0;

      Object.entries(dayAnalysis)
        .sort((a, b) => a[1].totalMinutes - b[1].totalMinutes)
        .forEach(([date, info]) => {
          if (foundSlots >= 5) return;
          
          const slots = findFreeSlots(date);
          const suitableSlots = slots.filter(s => s.duration >= requestedMinutes);
          
          if (suitableSlots.length > 0) {
            const dayName = info.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
            response += `📌 **${dayName}**\n`;
            suitableSlots.slice(0, 2).forEach(slot => {
              response += `   • ${slot.start} - ${slot.end} (${Math.floor(slot.duration/60)}h ${slot.duration%60}min liberi)\n`;
              foundSlots++;
            });
          }
        });

      if (foundSlots === 0) {
        response += 'Non ho trovato slot sufficientemente lunghi. Considera di:\n• Ridurre la durata dell\'impegno\n• Spostare altri eventi\n• Programmare per la settimana prossima';
      }

      return response;
    }

    if (lower.includes('analisi') || lower.includes('come va') || lower.includes('settimana') || lower.includes('riepilogo')) {
      const totalEvents = weekEvents.length;
      const totalHours = Object.values(dayAnalysis).reduce((acc, day) => acc + day.totalMinutes, 0) / 60;
      const freeDays = Object.values(dayAnalysis).filter(d => d.isFree).length;
      
      let response = `📊 **Analisi della tua settimana:**\n\n`;
      response += `• **Eventi totali**: ${totalEvents}\n`;
      response += `• **Ore impegnate**: ${totalHours.toFixed(1)}h\n`;
      response += `• **Giorni completamente liberi**: ${freeDays}\n`;
      response += `• **Media eventi/giorno**: ${(totalEvents / 7).toFixed(1)}\n\n`;
      
      if (totalHours > 40) {
        response += '⚠️ La tua settimana è molto intensa. Cerca di ritagliarti momenti di pausa.';
      } else if (totalHours < 20) {
        response += '✅ Hai una buona quantità di tempo libero. Ottima gestione!';
      } else {
        response += '👍 La tua settimana è ben bilanciata tra impegni e tempo libero.';
      }

      return response;
    }

    if (lower.includes('cerca') || lower.includes('trova')) {
      const searchTerm = message.replace(/cerca|trova|evento/gi, '').trim();
      const found = events.filter(e => 
        e.title.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5);

      if (found.length > 0) {
        let response = `🔍 **Ho trovato ${found.length} eventi:**\n\n`;
        found.forEach(e => {
          const date = new Date(e.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
          response += `• **${e.title}** - ${date}${e.time ? ` alle ${e.time}` : ''}\n`;
        });
        return response;
      }
      return 'Non ho trovato eventi corrispondenti alla tua ricerca.';
    }

    return `🤖 **Come posso aiutarti?**\n\nProva a chiedermi:\n\n📅 "Quali sono i miei giorni più liberi?"\n📊 "Quali giorni sono più occupati?"\n🎯 "Quando posso inserire una riunione di 2 ore?"\n📈 "Fammi un'analisi della settimana"\n🔍 "Cerca evento [nome]"\n\nSono qui per ottimizzare il tuo tempo!`;
  }, [analyzeCalendar, findFreeSlots, events]);

  const sendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages(prev => [...prev, { role: 'user', content: chatInput }]);
      const response = processAICommand(chatInput);
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }, 500);
      setChatInput('');
    }
  };

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    const prevMonthDays = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    for (let i = prevMonthDays; i > 0; i--) {
      const prevDate = new Date(year, month, -i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [currentDate]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const isToday = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === getTodayDate();
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const getEventsForDate = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  }, [events]);

  const getTodayEvents = useMemo(() => {
    const today = getTodayDate();
    return events.filter(e => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [events]);

  const getWeeklyStats = useMemo(() => {
    const categoryHours = {};
    events.forEach(e => {
      if (e.time && e.endTime) {
        const [sh, sm] = e.time.split(':').map(Number);
        const [eh, em] = e.endTime.split(':').map(Number);
        const hours = (eh + em/60) - (sh + sm/60);
        categoryHours[e.category] = (categoryHours[e.category] || 0) + hours;
      }
    });
    return categoryHours;
  }, [events]);

  const bgClass = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const cardClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Calendar className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Calendario AI</h1>
            <p className="text-gray-600 mt-2">Il tuo assistente intelligente per organizzare il tempo</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tua@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition font-medium"
            >
              {isLogin ? 'Accedi' : 'Registrati'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError('');
              }}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      <header className={`${cardClass} border-b ${borderClass} px-6 py-4 sticky top-0 z-40`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Calendar className="w-7 h-7 text-blue-500" />
            <h1 className="text-2xl font-bold">Calendario AI</h1>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-gray-500">Salvataggio...</span>}
            
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showAIPanel 
                  ? 'bg-blue-500 text-white' 
                  : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <Zap className="w-5 h-5" />
              <span className="font-medium">Assistente AI</span>
            </button>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <User className="w-4 h-4" />
              <span className="text-sm">{user.email}</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} hover:opacity-80 transition`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <nav className={`${cardClass} border-b ${borderClass} sticky top-[73px] z-30`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'home', icon: Calendar, label: 'Calendario' },
              { id: 'habits', icon: Clock, label: 'Abitudini' },
              { id: 'analytics', icon: BarChart3, label: 'Statistiche' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-500'
                    : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <div className={`flex-1 transition-all duration-300 ${showAIPanel ? 'mr-0' : ''}`}>
            {activeTab === 'home' && (
              <div className={`${cardClass} rounded-xl p-6 border ${borderClass}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2">
                    {['month', 'week', 'day'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-4 py-2 rounded-lg transition ${
                          viewMode === mode
                            ? 'bg-blue-500 text-white'
                            : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {mode === 'month' ? 'Mese' : mode === 'week' ? 'Settimana' : 'Giorno'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setNewEvent({
                        title: '',
                        date: currentDate.toISOString().split('T')[0],
                        time: '',
                        endTime: '',
                        category: 'personale',
                        description: ''
                      });
                      setEditingEvent(null);
                      setShowEventModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Nuovo Evento
                  </button>
                </div>

                {viewMode === 'month' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => navigateMonth(-1)} className={`p-2 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-xl font-semibold">
                        {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                      </h2>
                      <button onClick={() => navigateMonth(1)} className={`p-2 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold opacity-60 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                      {monthDays.map((day, i) => {
                        const dayEvents = getEventsForDate(day.date);
                        const today = isToday(day.date);
                        
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setCurrentDate(day.date);
                              setViewMode('day');
                            }}
                            className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-2 min-h-24 cursor-pointer hover:ring-2 hover:ring-blue-400 transition ${
                              !day.isCurrentMonth ? 'opacity-40' : ''
                            } ${today ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <div className={`text-sm font-semibold mb-1 ${today ? 'text-blue-500' : ''}`}>
                              {day.date.getDate()}
                            </div>
                            <div className="space-y-1">
                              {dayEvents.slice(0, 3).map(event => (
                                <div
                                  key={event.id}
                                  className="text-xs p-1 rounded truncate"
                                  style={{ backgroundColor: (categories[event.category] || '#8b5cf6') + '40' }}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-xs opacity-60">+{dayEvents.length - 3}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {viewMode === 'week' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => navigateWeek(-1)} className={`p-2 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-xl font-semibold">
                        {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                      </h2>
                      <button onClick={() => navigateWeek(1)} className={`p-2 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((day, i) => {
                        const dayEvents = getEventsForDate(day);
                        const today = isToday(day);
                        
                        return (
                          <div 
                            key={i} 
                            onClick={() => {
                              setCurrentDate(day);
                              setViewMode('day');
                            }}
                            className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-3 min-h-32 cursor-pointer hover:ring-2 hover:ring-blue-400 transition ${today ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <div className="text-center mb-2">
                              <div className="text-xs opacity-60">
                                {day.toLocaleDateString('it-IT', { weekday: 'short' })}
                              </div>
                              <div className={`font-semibold ${today ? 'text-blue-500' : ''}`}>{day.getDate()}</div>
                            </div>
                            <div className="space-y-1">
                              {dayEvents.map(event => (
                                <div
                                  key={event.id}
                                  className="text-xs p-1 rounded"
                                  style={{ backgroundColor: (categories[event.category] || '#8b5cf6') + '40', borderLeft: `3px solid ${categories[event.category] || '#8b5cf6'}` }}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                  {event.time && <div className="opacity-75">{event.time}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {viewMode === 'day' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => navigateDay(-1)} className={`p-2 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-xl font-semibold">
                        {currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h2>
                      <button onClick={() => navigateDay(1)} className={`p-2 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
                      <div className="space-y-3">
                        {getEventsForDate(currentDate).length > 0 ? (
                          getEventsForDate(currentDate).map(event => (
                            <div
                              key={event.id}
                              className={`p-4 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white'} border-l-4 shadow-sm`}
                              style={{ borderColor: categories[event.category] || '#8b5cf6' }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
                                  {event.time && (
                                    <div className="flex items-center gap-2 text-sm opacity-75">
                                      <Clock className="w-4 h-4" />
                                      {event.time} {event.endTime && `- ${event.endTime}`}
                                    </div>
                                  )}
                                  {event.description && (
                                    <p className="mt-2 text-sm opacity-75">{event.description}</p>
                                  )}
                                  <div className="mt-2">
                                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: (categories[event.category] || '#8b5cf6') + '20', color: categories[event.category] || '#8b5cf6' }}>
                                      {event.category}
                                    </span>
                                  </div>
                                </div>
                                {!event.fromHabit && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => editEvent(event)}
                                      className={`p-2 hover:${darkMode ? 'bg-gray-500' : 'bg-gray-200'} rounded transition`}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteEvent(event.id)}
                                      className={`p-2 hover:${darkMode ? 'bg-gray-500' : 'bg-gray-200'} rounded text-red-500 transition`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 opacity-60">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>Nessun evento per questo giorno</p>
                            <button
                              onClick={() => {
                                setNewEvent({
                                  ...newEvent,
                                  date: currentDate.toISOString().split('T')[0]
                                });
                                setShowEventModal(true);
                              }}
                              className="mt-4 text-blue-500 hover:text-blue-600 text-sm"
                            >
                              Aggiungi un evento
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'habits' && (
              <div className={`${cardClass} rounded-xl p-6 border ${borderClass}`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Le Tue Abitudini</h2>
                  <button
                    onClick={() => setShowHabitModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Nuova Abitudine
                  </button>
                </div>

                <div className="space-y-3">
                  {habits.map((habit, idx) => (
                    <div
                      key={habit.id}
                      className={`p-4 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-mono opacity-60">#{idx + 1}</span>
                            <h3 className="font-semibold text-lg">{habit.title}</h3>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: categories[habit.category] || '#8b5cf6' }}
                            />
                          </div>
                          <p className="text-sm opacity-75 mb-2">{habit.original}</p>
                          <div className="flex gap-4 text-xs opacity-60">
                            <div>
                              <strong>Giorni:</strong> {habit.days.map(d => ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][d]).join(', ')}
                            </div>
                            <div>
                              <strong>Orario:</strong> {habit.startTime} - {habit.endTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleHabit(habit.id)}
                            className={`p-2 rounded ${habit.active ? 'text-green-500 bg-green-500 bg-opacity-20' : 'opacity-40'} hover:bg-opacity-30 transition`}
                            title={habit.active ? 'Disattiva' : 'Attiva'}
                          >
                            <Power className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className={`p-2 rounded text-red-500 hover:${darkMode ? 'bg-gray-600' : 'bg-red-50'} transition`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {habits.length === 0 && (
                    <div className="text-center py-12 opacity-60">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="mb-4">Non hai ancora creato abitudini</p>
                      <button
                        onClick={() => setShowHabitModal(true)}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Crea la tua prima abitudine
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className={`${cardClass} rounded-xl p-6 border ${borderClass}`}>
                <h2 className="text-2xl font-bold mb-6">Statistiche e Analisi</h2>
                
                <div className="grid gap-4">
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      Ore per Categoria
                    </h3>
                    {Object.entries(getWeeklyStats).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(getWeeklyStats).map(([cat, hours]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categories[cat] || '#8b5cf6' }} />
                              <span className="capitalize">{cat}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min((hours / 40) * 100, 100)}%`,
                                    backgroundColor: categories[cat] || '#8b5cf6'
                                  }}
                                />
                              </div>
                              <span className="font-semibold w-12 text-right">{hours.toFixed(1)}h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm opacity-60">Nessun dato disponibile</p>
                    )}
                  </div>

                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Panoramica
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-gray-600 bg-opacity-20">
                        <div className="text-2xl font-bold text-blue-500">{events.filter(e => !e.fromHabit).length}</div>
                        <div className="text-sm opacity-60">Eventi Manuali</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-600 bg-opacity-20">
                        <div className="text-2xl font-bold text-green-500">{habits.filter(h => h.active).length}</div>
                        <div className="text-sm opacity-60">Abitudini Attive</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-600 bg-opacity-20">
                        <div className="text-2xl font-bold text-purple-500">{events.length}</div>
                        <div className="text-sm opacity-60">Eventi Totali</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-600 bg-opacity-20">
                        <div className="text-2xl font-bold text-orange-500">{getTodayEvents.length}</div>
                        <div className="text-sm opacity-60">Eventi Oggi</div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Suggerimenti AI
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>Il tuo calendario è ben organizzato. Continua così!</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <span>Chiedi all'assistente AI di trovare i migliori slot per nuovi impegni.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                        <span>Usa le abitudini per automatizzare eventi ricorrenti.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showAIPanel && (
            <div className={`w-96 ${cardClass} rounded-xl border ${borderClass} flex flex-col sticky top-[145px] h-[calc(100vh-180px)]`}>
              <div className={`p-4 border-b ${borderClass} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold">Assistente AI</h3>
                </div>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className={`p-1 rounded hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg whitespace-pre-line text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : darkMode ? 'bg-gray-700 rounded-bl-none' : 'bg-gray-100 rounded-bl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={`p-4 border-t ${borderClass}`}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Chiedimi qualcosa..."
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Giorni liberi?', 'Analisi settimana', 'Quando inserire riunione?'].map(quick => (
                    <button
                      key={quick}
                      onClick={() => {
                        setChatInput(quick);
                        setTimeout(() => sendMessage(), 100);
                      }}
                      className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition`}
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingEvent ? 'Modifica Evento' : 'Nuovo Evento'}
              </h3>
              <button onClick={() => {
                setShowEventModal(false);
                setEditingEvent(null);
                setNewEvent({ title: '', date: '', time: '', endTime: '', category: 'personale', description: '' });
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titolo *</label>
                <input
                  type="text"
                  placeholder="Es: Riunione con il team"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Data *</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Ora Inizio</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ora Fine</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Categoria</label>
                <select
                  value={newEvent.category}
                  onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  {Object.keys(categories).map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Descrizione</label>
                <textarea
                  placeholder="Note aggiuntive (opzionale)"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500 h-20`}
                />
              </div>
              
              <button
                onClick={addEvent}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
              >
                {editingEvent ? 'Salva Modifiche' : 'Crea Evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHabitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Nuova Abitudine</h3>
              <button onClick={() => {
                setShowHabitModal(false);
                setNewHabit('');
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} text-sm`}>
                <p className="mb-2 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Esempi di input:
                </p>
                <ul className="space-y-1 opacity-75 text-xs">
                  <li>• "lavoro dal lunedì al venerdì dalle 9:00 alle 17:00"</li>
                  <li>• "studio tutti i giorni dalle 18:00 alle 20:00"</li>
                  <li>• "palestra lunedì, mercoledì, venerdì dalle 19 alle 20:30"</li>
                  <li>• "corso dal 15/01 al 30/06 dalle 14:00 alle 16:00"</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Descrivi la tua abitudine</label>
                <textarea
                  placeholder="Es: palestra dal lunedì al venerdì dalle 18:00 alle 19:30"
                  value={newHabit}
                  onChange={(e) => setNewHabit(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500 h-32`}
                />
              </div>
              
              <button
                onClick={addHabit}
                disabled={!newHabit.trim()}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crea Abitudine
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Impostazioni</h3>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg border ${borderClass}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Tema Scuro</div>
                    <div className="text-sm opacity-60">Attiva il tema scuro</div>
                  </div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative w-14 h-7 rounded-full transition ${
                    darkMode ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                      darkMode ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
            <h3 className="text-xl font-bold mb-4">{confirmAction.title}</h3>
            <p className="mb-6 opacity-75">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                className={`flex-1 py-2 rounded-lg border ${borderClass} hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition`}
              >
                Annulla
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioAI;