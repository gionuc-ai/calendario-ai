import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Clock, TrendingUp, Settings, Plus, X, Edit2, Power, Trash2, MessageSquare, BarChart3, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCVBoIl4nVxPOi7qgq1d0wp_n5c4GqygxA",
  authDomain: "calendario-ai-d976e.firebaseapp.com",
  projectId: "calendario-ai-d976e",
  storageBucket: "calendario-ai-d976e.firebasestorage.app",
  messagingSenderId: "233705052175",
  appId: "1:233705052175:web:3adefa53a9c6c429b3ab7a"
};

// FIX #1: Inizializza Firebase solo una volta
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
  
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [events, setEvents] = useState([]);
  const [habits, setHabits] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Benvenuto in Calendario AI; io sono il tuo personale assistente e ti aiuterò ad organizzare le tue settimane nel modo più efficiente possibile. Per prima cosa se non l\'hai ancora fatto inserisci le tue abitudini nella sezione apposita.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
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

  // Controlla lo stato di autenticazione
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

  // FIX #2: Debounce auto-save con useCallback
  const saveUserData = useCallback(async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        habits,
        events: events.filter(e => !e.fromHabit),
        darkMode,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Errore nel salvataggio dati:', error);
    }
  }, [user, habits, events, darkMode]);

  // FIX #3: Debounce per evitare troppe scritture
  useEffect(() => {
    if (user && habits.length >= 0) {
      const timer = setTimeout(() => {
        saveUserData();
      }, 2000); // Salva dopo 2 secondi di inattività
      
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

    const titleMatch = input.match(/^([^d]+?)(?=dal|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)/i);
    if (titleMatch) habit.title = titleMatch[1].trim();

    const dayMap = {
      'lunedì': 1, 'martedì': 2, 'mercoledì': 3, 'giovedì': 4,
      'venerdì': 5, 'sabato': 6, 'domenica': 0
    };

    if (lowerInput.includes('dal') && lowerInput.includes('al')) {
      const daysMatch = lowerInput.match(/dal\s+(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\s+al\s+(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)/);
      if (daysMatch) {
        const startDay = dayMap[daysMatch[1]];
        const endDay = dayMap[daysMatch[2]];
        for (let d = startDay; d <= endDay; d++) {
          habit.days.push(d);
        }
      }
    }

    const timeMatch = input.match(/dalle?\s+(\d{1,2}):?(\d{2})?\s+alle?\s+(\d{1,2}):?(\d{2})?/i);
    if (timeMatch) {
      habit.startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`;
      habit.endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4] || '00'}`;
    }

    const dateMatch = input.match(/dal\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+al\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
      const year = new Date().getFullYear();
      habit.startDate = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      habit.endDate = `${year}-${dateMatch[5].padStart(2, '0')}-${dateMatch[4].padStart(2, '0')}`;
    }

    if (lowerInput.includes('palestra') || lowerInput.includes('gym')) habit.category = 'sport';
    if (lowerInput.includes('studio') || lowerInput.includes('lezione')) habit.category = 'studio';
    if (lowerInput.includes('lavoro') || lowerInput.includes('ufficio')) habit.category = 'lavoro';

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

  // FIX #4: Usa callback form per evitare dipendenze circolari
  useEffect(() => {
    setEvents(prevEvents => {
      const habitEvents = habits.flatMap(h => generateEventsFromHabit(h));
      const manualEvents = prevEvents.filter(e => !e.fromHabit);
      return [...manualEvents, ...habitEvents];
    });
  }, [habits, generateEventsFromHabit]);

  const addEvent = () => {
    if (newEvent.title && newEvent.date) {
      setEvents(prev => [...prev, { ...newEvent, id: Date.now(), fromHabit: false }]);
      setNewEvent({ title: '', date: '', time: '', category: 'personale', description: '' });
      setShowEventModal(false);
    }
  };

  const addHabit = () => {
    if (newHabit.trim()) {
      const parsedHabit = parseHabitInput(newHabit);
      setHabits(prev => [...prev, parsedHabit]);
      setNewHabit('');
      setShowHabitModal(false);
    }
  };

  const toggleHabit = (id) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, active: !h.active } : h));
  };

  const deleteHabit = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const processAICommand = (message) => {
    const lower = message.toLowerCase();
    
    if (lower.includes('elimina abitudine')) {
      const numMatch = message.match(/\d+/);
      if (numMatch && habits[numMatch[0] - 1]) {
        deleteHabit(habits[numMatch[0] - 1].id);
        return `Ho eliminato l'abitudine ${numMatch[0]}: "${habits[numMatch[0] - 1].title}"`;
      }
    }
    
    if (lower.includes('disattiva abitudine') || lower.includes('attiva abitudine')) {
      const numMatch = message.match(/\d+/);
      if (numMatch && habits[numMatch[0] - 1]) {
        toggleHabit(habits[numMatch[0] - 1].id);
        const action = lower.includes('disattiva') ? 'disattivata' : 'attivata';
        return `Ho ${action} l'abitudine ${numMatch[0]}: "${habits[numMatch[0] - 1].title}"`;
      }
    }
    
    if (lower.includes('analisi') || lower.includes('come va')) {
      const totalEvents = events.length;
      return `Hai ${totalEvents} eventi nel calendario. La tua settimana sembra ben organizzata! Continua così.`;
    }
    
    if (lower.includes('slot liberi') || lower.includes('tempo libero')) {
      return `Ho analizzato il tuo calendario. Hai diversi slot liberi nelle mattinate e nei fine settimana. Vuoi che ti proponga delle attività?`;
    }
    
    return `Ho capito la tua richiesta. Al momento posso aiutarti con: eliminare/attivare/disattivare abitudini, analizzare il calendario, trovare slot liberi. Cosa posso fare per te?`;
  };

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

  // FIX #5: Ottimizza con useMemo
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

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const isToday = (date) => {
    return date.toISOString().split('T')[0] === getTodayDate();
  };

  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [currentDate]);

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
    const today = new Date().toISOString().split('T')[0];
    return events.filter(e => e.date === today);
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
            <p className="text-gray-600 mt-2">Organizza la tua vita con intelligenza artificiale</p>
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
      <header className={`${cardClass} border-b ${borderClass} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-7 h-7 text-blue-500" />
            <h1 className="text-2xl font-bold">Calendario AI</h1>
          </div>
          <div className="flex items-center gap-3">
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

      <nav className={`${cardClass} border-b ${borderClass}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'home', icon: Calendar, label: 'Calendario' },
              { id: 'habits', icon: Clock, label: 'Abitudini' },
              { id: 'assistant', icon: MessageSquare, label: 'Assistente AI' },
              { id: 'analytics', icon: BarChart3, label: 'Analisi' }
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
        {activeTab === 'home' && (
          <div className="flex gap-6">
            <div className={`flex-1 ${cardClass} rounded-xl p-6 border ${borderClass}`}>
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
                  onClick={() => setShowEventModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo Evento
                </button>
              </div>

              {viewMode === 'month' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-200 rounded">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-semibold">
                      {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-200 rounded">
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
                          className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-2 min-h-24 cursor-pointer hover:ring-2 hover:ring-blue-300 transition ${
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
                                style={{ backgroundColor: categories[event.category] + '40' }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs opacity-60">+{dayEvents.length - 3} altri</div>
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
                    <button onClick={() => navigateWeek(-1)}>
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-semibold">
                      {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => navigateWeek(1)}>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day, i) => {
                      const dayEvents = getEventsForDate(day);
                      const today = isToday(day);
                      
                      return (
                        <div key={i} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-3 min-h-32 ${today ? 'ring-2 ring-blue-500' : ''}`}>
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
                                style={{ backgroundColor: categories[event.category] + '40', borderLeft: `3px solid ${categories[event.category]}` }}
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
                    <button onClick={() => navigateDay(-1)} className="p-2 hover:bg-gray-200 rounded">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-semibold">
                      {currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => navigateDay(1)} className="p-2 hover:bg-gray-200 rounded">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6`}>
                    <div className="space-y-3">
                      {getEventsForDate(currentDate).length > 0 ? (
                        getEventsForDate(currentDate).map(event => (
                          <div
                            key={event.id}
                            className={`p-4 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white'} border-l-4`}
                            style={{ borderColor: categories[event.category] }}
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
                              </div>
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: categories[event.category] }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 opacity-60">
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                          <p>Nessun evento per questo giorno</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-80 space-y-4">
              <div className={`${cardClass} rounded-xl p-4 border ${borderClass}`}>
                <h3 className="font-semibold mb-3">Eventi di Oggi</h3>
                <div className="space-y-2">
                  {getTodayEvents.length > 0 ? (
                    getTodayEvents.map(event => (
                      <div key={event.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{event.title}</div>
                            {event.time && <div className="text-sm opacity-60">{event.time}</div>}
                          </div>
                          <div
                            className="w-3 h-3 rounded-full mt-1"
                            style={{ backgroundColor: categories[event.category] }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm opacity-60">Nessun evento oggi</p>
                  )}
                </div>
              </div>

              <div className={`${cardClass} rounded-xl p-4 border ${borderClass}`}>
                <h3 className="font-semibold mb-3">Abitudini Attive</h3>
                <div className="space-y-2">
                  {habits.filter(h => h.active).length > 0 ? (
                    habits.filter(h => h.active).map((habit) => (
                      <div key={habit.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="font-medium text-sm">{habit.title}</div>
                        <div className="text-xs opacity-60 mt-1">
                          {habit.startTime} - {habit.endTime}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm opacity-60">Nessuna abitudine attiva</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'habits' && (
          <div className={`${cardClass} rounded-xl p-6 border ${borderClass} max-w-3xl mx-auto`}>
            <h2 className="text-2xl font-bold mb-6">Le Tue Abitudini</h2>
            
            <div className="mb-6">
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
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono opacity-60">#{idx + 1}</span>
                        <h3 className="font-semibold">{habit.title}</h3>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: categories[habit.category] }}
                        />
                      </div>
                      <p className="text-sm opacity-75">{habit.original}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleHabit(habit.id)}
                        className={`p-2 rounded ${habit.active ? 'text-green-500' : 'opacity-40'} hover:bg-gray-600 transition`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="p-2 rounded text-red-500 hover:bg-gray-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {habits.length === 0 && (
                <p className="text-center py-8 opacity-60">
                  Non hai ancora creato abitudini. Inizia aggiungendone una!
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className={`${cardClass} rounded-xl border ${borderClass} max-w-3xl mx-auto h-[600px] flex flex-col`}>
            <div className={`p-4 border-b ${borderClass}`}>
              <h2 className="text-xl font-bold">Assistente AI</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : darkMode ? 'bg-gray-700' : 'bg-gray-100'
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
                  placeholder="Scrivi un messaggio..."
                  className={`flex-1 px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Invia
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className={`${cardClass} rounded-xl p-6 border ${borderClass} max-w-3xl mx-auto`}>
            <h2 className="text-2xl font-bold mb-6">Analisi Settimanale</h2>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className="font-semibold mb-3">Ore per Categoria</h3>
                {Object.entries(getWeeklyStats).map(([cat, hours]) => (
                  <div key={cat} className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categories[cat] }} />
                      <span className="capitalize">{cat}</span>
                    </div>
                    <span className="font-semibold">{hours.toFixed(1)}h</span>
                  </div>
                ))}
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className="font-semibold mb-3">Insight dell'AI</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 text-green-500" />
                    <span>La tua settimana è ben bilanciata tra lavoro e tempo personale.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 text-blue-500" />
                    <span>Livello di produttività: Alto. Continua così!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 text-yellow-500" />
                    <span>Suggerimento: Considera di aggiungere più pause tra gli impegni intensi.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${cardClass} rounded-xl p-6 max-w-md w-full`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Nuovo Evento</h3>
              <button onClick={() => setShowEventModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Titolo"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              
              <input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              
              <select
                value={newEvent.category}
                onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                {Object.keys(categories).map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
              
              <textarea
                placeholder="Descrizione (opzionale)"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500 h-24`}
              />
              
              <button
                onClick={addEvent}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Crea Evento
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
              <button onClick={() => setShowHabitModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} text-sm`}>
                <p className="mb-2 font-medium">Esempi di input:</p>
                <ul className="space-y-1 opacity-75">
                  <li>• "Palestra dal lunedì al giovedì dalle 18:30 alle 20:30 dal 20/03 al 20/04"</li>
                  <li>• "Studio dal lunedì al venerdì dalle 9:00 alle 13:00 dal 01/01 al 30/06"</li>
                  <li>• "Lavoro dal lunedì al venerdì dalle 14:00 alle 18:00 dal 15/01 al 31/12"</li>
                </ul>
              </div>
              
              <textarea
                placeholder="Descrivi la tua abitudine in linguaggio naturale..."
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${darkMode ? 'bg-gray-700' : 'bg-white'} focus:outline-none focus:ring-2 focus:ring-blue-500 h-32`}
              />
              
              <button
                onClick={addHabit}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
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
                    <div className="font-semibold">Dark Mode</div>
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
    </div>
  );
};

export default CalendarioAI;