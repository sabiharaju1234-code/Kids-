import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { 
  ArrowLeft, MapPin, MessageSquare, Smartphone, 
  Activity, Shield, Eye, Keyboard, AlertCircle,
  Clock, Calendar, Filter, Search, Camera,
  Binoculars, Headphones, Mic, Monitor, Bell,
  Plus, Battery, Signal, Zap, Hourglass, Box,
  MessageCircle, EyeOff, ChevronRight, Sparkles,
  Home, User as UserIcon, Users as FamilyIcon, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Child {
  uid: string;
  displayName: string;
  email: string;
}

interface Message {
  id: string;
  platform: string;
  sender: string;
  content: string;
  timestamp: any;
  type: string;
}

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: any;
}

interface Notification {
  id: string;
  appName: string;
  title: string;
  content: string;
  timestamp: any;
}

export default function ChildDetail({ child, onBack, initialFeature, deviceInfo }: { child: Child, onBack: () => void, initialFeature?: string | null, deviceInfo?: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeTab, setActiveTab] = useState('messages');
  const [activeFeature, setActiveFeature] = useState<string | null>(initialFeature || null);
  const [wakeLock, setWakeLock] = useState<any>(null);

  // Wake Lock logic to prevent screen off
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          setWakeLock(lock);
          console.log('Wake Lock is active');
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    if (activeFeature) {
      requestWakeLock();
    } else {
      if (wakeLock) {
        wakeLock.release().then(() => setWakeLock(null));
      }
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [activeFeature]);

  useEffect(() => {
    if (initialFeature) {
      setActiveFeature(initialFeature);
    }
  }, [initialFeature]);

  useEffect(() => {
    // Listen for messages
    const qMessages = query(
      collection(db, 'messages'), 
      where('childId', '==', child.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages'));

    // Listen for notifications
    const qNotifications = query(
      collection(db, 'notifications'), 
      where('childId', '==', child.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications'));

    // Listen for locations
    const qLocations = query(
      collection(db, 'locations'), 
      where('childId', '==', child.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubLocations = onSnapshot(qLocations, (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'locations'));

    return () => {
      unsubMessages();
      unsubNotifications();
      unsubLocations();
    };
  }, [child.uid]);

  return (
    <div className="max-w-md mx-auto bg-[#f8faff] min-h-screen shadow-2xl relative flex flex-col font-sans text-slate-900">
      {/* Mobile Header */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-500 p-6 pb-12 rounded-b-[40px] text-white relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${child.uid}`} alt={child.displayName} />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h2 className="font-bold text-lg">{child.displayName}</h2>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                  <Battery className="w-3 h-3" />
                  <span>{deviceInfo?.batteryLevel || 54}%</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                  <Signal className="w-3 h-3" />
                  <span>{deviceInfo?.networkType === 'WiFi' ? deviceInfo?.wifiName || 'WiFi' : deviceInfo?.networkType || '4G'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative">
              <Bell className="w-6 h-6" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-blue-600"></div>
            </button>
            <button onClick={onBack} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 -mt-8 px-5 pb-24 space-y-6 overflow-y-auto">
        {/* Today's Event Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800">Today's Event</h3>
              <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
            </div>
          </div>
          <div className="mb-4">
            <span className="text-3xl font-black text-slate-900 tracking-tight">2h 25m 27s</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 w-1/4 rounded-full"></div>
          </div>
        </div>

        {/* Promo Banner */}
        <div className="bg-gradient-to-r from-blue-400 to-blue-300 rounded-[28px] p-4 relative overflow-hidden shadow-md">
          <div className="relative z-10 flex items-center justify-between">
            <div className="text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Celebrating 15 Years</p>
              <h4 className="text-2xl font-black italic">50% OFF</h4>
            </div>
            <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-4">
          <SmallActionCard 
            icon={<Camera className="w-7 h-7 text-blue-600" />} 
            label="Remote Camera" 
            color="bg-blue-100"
            textColor="text-blue-700"
            onClick={() => setActiveFeature('camera')}
          />
          <SmallActionCard 
            icon={<Binoculars className="w-7 h-7 text-orange-600" />} 
            label="Screen Mirroring" 
            color="bg-orange-100"
            textColor="text-orange-900"
            onClick={() => setActiveFeature('mirroring')}
          />
          <SmallActionCard 
            icon={<Headphones className="w-7 h-7 text-green-600" />} 
            label="One-Way Audio" 
            color="bg-green-100"
            textColor="text-green-800"
            onClick={() => setActiveFeature('audio')}
          />
        </div>

        {/* Live Stream Full Screen Overlay */}
        <AnimatePresence>
          {activeFeature && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black flex flex-col"
            >
              {/* Top Bar */}
              <div className="p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveFeature(null)} 
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">
                      {activeFeature === 'camera' && 'REMOTE OPTICS'}
                      {activeFeature === 'mirroring' && 'SCREEN TELEMETRY'}
                      {activeFeature === 'audio' && 'AUDIO INTERCEPT'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Live • {child.displayName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <Battery className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-black text-white">{deviceInfo?.batteryLevel || 84}%</span>
                  </div>
                  <div className="px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <Signal className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-black text-white">
                      {deviceInfo?.networkType === 'WiFi' ? deviceInfo?.wifiName || 'WiFi' : deviceInfo?.networkType || 'LTE'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Main Viewport */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#050505]">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                
                {activeFeature === 'camera' ? (
                  <div className="w-full h-full relative">
                    <img 
                      src={`https://picsum.photos/seed/${child.uid}/1080/1920?blur=1`} 
                      alt="Remote Camera" 
                      className="w-full h-full object-cover opacity-40"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-10">
                      <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
                      <p className="text-white font-black uppercase tracking-[0.3em] text-sm animate-pulse">ESTABLISHING ENCRYPTED LINK...</p>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Protocol: AES-256-GCM</p>
                    </div>
                  </div>
                ) : activeFeature === 'mirroring' ? (
                  <div className="w-[280px] h-[560px] bg-slate-900 rounded-[40px] border-[6px] border-slate-800 shadow-2xl relative overflow-hidden flex items-center justify-center">
                    <div className="text-center space-y-4 p-8">
                      <Smartphone className="w-12 h-12 text-blue-500 mx-auto animate-bounce" />
                      <p className="text-white font-black uppercase tracking-[0.2em] text-[10px]">SCREEN MIRRORING ACTIVE</p>
                      <p className="text-white/40 text-[9px] font-bold leading-relaxed uppercase">Waiting for data packets from Android service...</p>
                    </div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/20 rounded-full"></div>
                  </div>
                ) : (
                  <div className="text-center space-y-10">
                    <div className="flex items-center justify-center gap-1.5 h-20">
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [20, 70, 20] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.08 }}
                          className="w-2 bg-red-500 rounded-full shadow-glow-red"
                        />
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-white font-black uppercase tracking-[0.3em] text-sm">AUDIO INTERCEPT ACTIVE</p>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">LISTENING VIA REMOTE MICROPHONE</p>
                    </div>
                  </div>
                )}

                {/* Corner Accents */}
                <div className="absolute top-24 left-10 w-12 h-12 border-t-2 border-l-2 border-white/20 rounded-tl-xl" />
                <div className="absolute top-24 right-10 w-12 h-12 border-t-2 border-r-2 border-white/20 rounded-tr-xl" />
                <div className="absolute bottom-32 left-10 w-12 h-12 border-b-2 border-l-2 border-white/20 rounded-bl-xl" />
                <div className="absolute bottom-32 right-10 w-12 h-12 border-b-2 border-r-2 border-white/20 rounded-br-xl" />
              </div>

              {/* Bottom Controls */}
              <div className="p-10 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8">
                <button className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all border border-white/10 group">
                  <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => setActiveFeature(null)}
                  className="w-24 h-24 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all group"
                >
                  <X className="w-8 h-8 group-hover:rotate-90 transition-transform" />
                </button>
                <button className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all border border-white/10 group">
                  <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Screen Time & Apps Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h3 className="font-bold text-slate-800">Screen Time & Apps</h3>
            </div>
            <button className="text-xs font-bold text-slate-400 flex items-center gap-1">
              Plan <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
            <ListActionItem icon={<Zap className="w-5 h-5" />} label="Instant Block" pro />
            <ListActionItem icon={<Hourglass className="w-5 h-5" />} label="Downtime" pro />
            <ListActionItem icon={<Box className="w-5 h-5" />} label="App Management" hasArrow />
          </div>
        </div>

        {/* Content Safety Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h3 className="font-bold text-slate-800">Content Safety</h3>
            </div>
          </div>
          
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
            <ListActionItem 
              icon={<MessageCircle className="w-5 h-5" />} 
              label="Notification Monitoring" 
              hasArrow 
              onClick={() => setActiveTab('notifications')}
            />
            <ListActionItem icon={<EyeOff className="w-5 h-5" />} label="Social Content Detection" pro />
          </div>
        </div>

        {/* Messages & Notifications List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              <h3 className="font-bold text-slate-800">Recent Activity</h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('messages')}
                className={`text-[10px] font-black px-3 py-1 rounded-full transition-all ${activeTab === 'messages' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
              >
                MESSAGES
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`text-[10px] font-black px-3 py-1 rounded-full transition-all ${activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
              >
                NOTIFICATIONS
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-4 shadow-sm border border-slate-100 min-h-[200px]">
            <AnimatePresence mode="wait">
              {activeTab === 'messages' ? (
                <motion.div
                  key="messages-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {messages.length > 0 ? messages.map(msg => (
                    <div key={msg.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shrink-0">
                        {msg.sender[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{msg.sender}</p>
                          <p className="text-[9px] text-slate-400 uppercase">{msg.platform}</p>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{msg.content}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10">
                      <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No messages captured</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="notifications-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {notifications.length > 0 ? notifications.map(notif => (
                    <div key={notif.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold shrink-0">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{notif.appName}</p>
                          <p className="text-[9px] text-slate-400 uppercase">
                            {notif.timestamp?.toDate ? format(notif.timestamp.toDate(), 'HH:mm') : 'Just now'}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{notif.content}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10">
                      <Bell className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No notifications captured</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <BottomNavItem icon={<Smartphone className="w-6 h-6" />} label="Device" active />
        <BottomNavItem icon={<MapPin className="w-6 h-6" />} label="Location" />
        <BottomNavItem icon={<FamilyIcon className="w-6 h-6" />} label="Family" />
        <BottomNavItem icon={<UserIcon className="w-6 h-6" />} label="My" />
      </div>
    </div>
  );
}

function SmallActionCard({ icon, label, color, textColor, onClick }: { icon: any, label: string, color: string, textColor?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white rounded-[28px] p-5 flex flex-col items-center text-center shadow-sm border border-slate-100 active:scale-95 transition-all hover:shadow-md group"
    >
      <div className={`w-14 h-14 ${color} rounded-[20px] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className={`text-[11px] font-bold ${textColor || 'text-slate-600'} leading-tight`}>{label}</span>
    </button>
  );
}

function ListActionItem({ icon, label, pro, hasArrow, onClick }: { icon: any, label: string, pro?: boolean, hasArrow?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
    >
      <div className="flex items-center gap-4">
        <div className="text-slate-700">{icon}</div>
        <span className="font-bold text-slate-800 text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {pro && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-md">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">PRO</span>
          </div>
        )}
        {hasArrow && <ChevronRight className="w-4 h-4 text-slate-300" />}
      </div>
    </button>
  );
}

function BottomNavItem({ icon, label, active }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={`flex flex-col items-center gap-1 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function RemoteFeatureCard({ icon, label, subLabel, color, textColor, onClick }: { icon: any, label: string, subLabel: string, color: string, textColor: string, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-[32px] p-8 flex flex-col items-center text-center shadow-xl border border-white/10 transition-all group"
    >
      <div className={`w-20 h-20 ${color} rounded-[24px] flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h4 className={`text-lg font-black ${textColor} tracking-tight leading-tight mb-1`}>{label}</h4>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subLabel}</p>
    </motion.button>
  );
}

function TabButton({ icon, label, active, onClick, count }: { icon: any, label: string, active: boolean, onClick: () => void, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
        active 
          ? 'bg-accent-blue text-bg-deep shadow-glow-blue' 
          : 'text-text-dim hover:bg-white/5 hover:text-text-primary'
      }`}
    >
      <span className={`${active ? 'text-bg-deep' : 'text-text-dim group-hover:text-text-primary'}`}>{icon}</span>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      {count !== undefined && (
        <span className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded-md ${
          active ? 'bg-bg-deep/20 text-bg-deep' : 'bg-white/10 text-text-dim'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
