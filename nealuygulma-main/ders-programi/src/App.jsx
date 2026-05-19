import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. SUPABASE AYARLARI (Buradaki bilgileri kendi Supabase panelinden almalısın)
const supabaseUrl = 'https://gzatlxlutmnmenreqwed.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YXRseGx1dG1ubWVucmVxd2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MDA1ODUsImV4cCI6MjA5Mzk3NjU4NX0.ce8QboYOMIgfxXVCPhjOnZ17rtPbYzrMHTVZes3Ue5k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  // --- STATELER ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [schedules, setSchedules] = useState([]);
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('');
  const [day, setDay] = useState('1');

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [lastPlayedId, setLastPlayedId] = useState(null);

  // Ses Dosyası (Zil Sesi)
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  // --- EFEKTLER ---
  useEffect(() => {
    // Oturum Kontrolü
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) fetchSchedules(session.user.id);
      setLoading(false);
    });

    // Oturum Değişikliklerini Dinle
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) fetchSchedules(session.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Alarm Kontrol Döngüsü
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAudioEnabled && user) {
        checkAlarms();
      }
    }, 15000); // 15 saniyede bir kontrol et

    return () => clearInterval(interval);
  }, [isAudioEnabled, schedules, user]);

  // --- FONKSİYONLAR ---
  const fetchSchedules = async (userId) => {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });
    
    if (error) console.error("Veri çekme hatası:", error);
    else setSchedules(data || []);
  };

  const handleAuth = async (type) => {
  // Eğer e-posta veya şifre boşsa işlem yapma
  if (!email || !password) {
    alert("Lütfen e-posta ve şifre alanlarını doldurun!");
    return;
  }

  setLoading(true);
  const { data, error } = type === 'login' 
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message); // Hata mesajını ekranda gösterir
  } else {
    if (type === 'register') {
      alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
    }
  }
  setLoading(false);
};

  const addSchedule = async (e) => {
    e.preventDefault();
    if (!subject || !startTime) return;

    const { error } = await supabase.from('schedules').insert([
      { 
        user_id: user.id, 
        subject_name: subject, 
        start_time: startTime, 
        end_time: startTime, // Basitleştirmek için bitişi başlangıçla aynı tuttuk
        day_of_week: parseInt(day) 
      }
    ]);

    if (error) alert(error.message);
    else {
      setSubject('');
      fetchSchedules(user.id);
    }
  };

  const deleteSchedule = async (id) => {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (!error) fetchSchedules(user.id);
  };

  const enableAudio = () => {
    audioRef.current.play().then(() => {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioEnabled(true);
    }).catch(err => alert("Ses başlatılamadı, lütfen tekrar deneyin."));
  };

  const checkAlarms = () => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();

    schedules.forEach(s => {
      const scheduleTime = s.start_time.substring(0, 5);
      if (s.day_of_week === currentDay && scheduleTime === currentTime) {
        if (lastPlayedId !== s.id + currentTime) { 
          playAlarm(s.subject_name);
          setLastPlayedId(s.id + currentTime);
        }
      }
    });
  };

  const playAlarm = (name) => {
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    alert(`DERS ZAMANI: ${name}`);
  };

  // --- ARAYÜZLER ---

  if (loading) return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;

  // GİRİŞ EKRANI
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">Öğretmen Girişi</h1>
          <input className="w-full mb-4 p-3 border rounded-lg" type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="w-full mb-6 p-3 border rounded-lg" type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="flex gap-4">
            <button onClick={() => handleAuth('login')} className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-bold">Giriş</button>
            <button onClick={() => handleAuth('register')} className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg font-bold">Kayıt Ol</button>
          </div>
        </div>
      </div>
    );
  }

  // ANA UYGULAMA EKRANI
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="font-bold text-lg text-blue-600">Ders Zil Sistemi</h1>
          <button onClick={() => supabase.auth.signOut()} className="text-xs text-red-500 border border-red-500 px-2 py-1 rounded">Çıkış</button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Ses İzni Paneli */}
        {!isAudioEnabled ? (
          <button 
            onClick={enableAudio}
            className="w-full bg-orange-500 text-white p-4 rounded-xl shadow-lg font-bold mb-6 animate-pulse"
          >
            🔔 SİSTEMİ AKTİF ET (ZİLİ AÇ)
          </button>
        ) : (
          <div className="w-full bg-green-100 text-green-700 p-3 rounded-lg text-center text-sm font-bold mb-6 border border-green-200">
            ✅ Zil Sistemi Aktif ve Dinlemede
          </div>
        )}

        {/* Ders Ekleme Formu */}
        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
          <h2 className="text-sm font-bold mb-3 text-gray-700">Yeni Ders/Tenefüs Ekle</h2>
          <form onSubmit={addSchedule} className="space-y-3">
            <input 
              className="w-full p-3 bg-gray-50 border rounded-lg outline-none focus:border-blue-500" 
              placeholder="Ders Adı (Örn: 1. Ders veya Tenefüs)" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
            />
            <div className="flex gap-2">
              <input 
                className="flex-1 p-3 bg-gray-50 border rounded-lg" 
                type="time" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)} 
              />
              <select 
                className="flex-1 p-3 bg-gray-50 border rounded-lg text-sm" 
                value={day} 
                onChange={e => setDay(e.target.value)}
              >
                <option value="1">Pazartesi</option>
                <option value="2">Salı</option>
                <option value="3">Çarşamba</option>
                <option value="4">Perşembe</option>
                <option value="5">Cuma</option>
                <option value="6">Cumartesi</option>
                <option value="7">Pazar</option>
              </select>
            </div>
            <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">Programa Ekle</button>
          </form>
        </div>

        {/* Liste */}
        <h2 className="font-bold text-gray-700 mb-3">Ders Programı</h2>
        <div className="space-y-3">
          {schedules.length === 0 && <p className="text-gray-400 text-center text-sm">Henüz ders eklenmemiş.</p>}
          {schedules.map(s => (
            <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-800">{s.subject_name}</div>
                <div className="text-sm text-gray-500">
                  {s.day_of_week === 1 ? 'Pazartesi' : s.day_of_week === 2 ? 'Salı' : s.day_of_week === 3 ? 'Çarşamba' : s.day_of_week === 4 ? 'Perşembe' : s.day_of_week === 5 ? 'Cuma' : 'Haftasonu'} | Saat: {s.start_time.substring(0,5)}
                </div>
              </div>
              <button onClick={() => deleteSchedule(s.id)} className="text-red-400 p-2">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;