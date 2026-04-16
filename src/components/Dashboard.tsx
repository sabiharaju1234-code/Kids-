import { useState, useEffect } from 'react';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDocs, addDoc, serverTimestamp, getCountFromServer, updateDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  Users, MapPin, MessageSquare, Smartphone, 
  Settings, LogOut, Bell, ShieldAlert, 
  Activity, LayoutDashboard, Search, Plus, X, AlertCircle,
  Camera, Binoculars, Headphones, ChevronRight, Mic,
  Zap, Hourglass, Box, MessageCircle, EyeOff,
  Sparkles, ArrowLeft, Battery, Signal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ChildDetail from './ChildDetail';
import SetupGuide from './SetupGuide';

interface Child {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  parentId: string;
}

interface Device {
  batteryLevel: number;
  networkType: string;
  wifiName?: string;
  isOnline: boolean;
}

export default function Dashboard({ user, role }: { user: User, role: string | null }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [deviceData, setDeviceData] = useState<Record<string, Device>>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [permissions, setPermissions] = useState({
    camera: 'prompt',
    microphone: 'prompt',
    geolocation: 'prompt'
  });
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      if ('permissions' in navigator) {
        try {
          // Note: Camera and Microphone queries are not supported in all browsers (e.g. Safari)
          const cam = await navigator.permissions.query({ name: 'camera' as any }).catch(() => null);
          const mic = await navigator.permissions.query({ name: 'microphone' as any }).catch(() => null);
          const geo = await navigator.permissions.query({ name: 'geolocation' as any }).catch(() => null);
          
          setPermissions({
            camera: cam?.state || 'prompt',
            microphone: mic?.state || 'prompt',
            geolocation: geo?.state || 'prompt'
          });

          // Listen for changes
          if (cam) cam.onchange = () => setPermissions(prev => ({ ...prev, camera: cam.state }));
          if (mic) mic.onchange = () => setPermissions(prev => ({ ...prev, microphone: mic.state }));
          if (geo) geo.onchange = () => setPermissions(prev => ({ ...prev, geolocation: geo.state }));
        } catch (e) {
          console.error("Permission query error", e);
        }
      }
    };
    checkPermissions();
  }, []);

  const requestPermission = async (type: 'camera' | 'microphone' | 'geolocation') => {
    setPermissionError(null);
    try {
      if (type === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately after getting permission
      }
      if (type === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
      if (type === 'geolocation') {
        await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      }
      
      // Refresh permissions
      if ('permissions' in navigator) {
        const state = await navigator.permissions.query({ name: type as any }).catch(() => null);
        if (state) {
          setPermissions(prev => ({ ...prev, [type]: state.state }));
        } else {
          // Fallback if query fails but getUserMedia succeeded
          setPermissions(prev => ({ ...prev, [type]: 'granted' }));
        }
      } else {
        setPermissions(prev => ({ ...prev, [type]: 'granted' }));
      }
    } catch (e: any) {
      console.error(`Error requesting ${type} permission:`, e);
      if (e.name === 'NotAllowedError' || e.message?.includes('dismissed')) {
        setPermissionError(`${type.charAt(0).toUpperCase() + type.slice(1)} permission was dismissed or denied. Please allow it in your browser settings.`);
      } else {
        setPermissionError(`Could not access ${type}. Please ensure your device supports it.`);
      }
    }
  };

  // Stats state
  const [stats, setStats] = useState({
    messages: 0,
    locations: 0,
    blockedApps: 0,
    screenTime: '0h 0m'
  });

  useEffect(() => {
    if (role === 'parent') {
      // Get or generate 6-digit pairing code
      const fetchPairingCode = async () => {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.pairingCode) {
              setPairingCode(data.pairingCode);
            } else {
              // Generate new 6-digit code
              const newCode = Math.floor(100000 + Math.random() * 900000).toString();
              await updateDoc(userDocRef, { pairingCode: newCode });
              setPairingCode(newCode);
            }
          }
        } catch (error) {
          console.error("Error fetching pairing code:", error);
        }
      };

      fetchPairingCode();

      const q = query(collection(db, 'users'), where('parentId', '==', user.uid));
      let unsubDevices: (() => void) | null = null;

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const childrenData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Child));
        setChildren(childrenData);
        
        // Listen for device data for all children
        if (childrenData.length > 0) {
          const childIds = childrenData.map(c => c.uid);
          const devQuery = query(collection(db, 'devices'), where('childId', 'in', childIds));
          
          if (unsubDevices) unsubDevices();
          unsubDevices = onSnapshot(devQuery, (devSnapshot) => {
            const devMap: Record<string, Device> = {};
            devSnapshot.docs.forEach(doc => {
              const data = doc.data();
              devMap[data.childId] = data as Device;
            });
            setDeviceData(devMap);
          });

          // Fetch stats for all children
          const childIdsForStats = childrenData.map(c => c.uid);
          
          // Total Messages
          const msgQuery = query(collection(db, 'messages'), where('childId', 'in', childIds));
          const msgCount = await getCountFromServer(msgQuery);
          
          // Total Locations
          const locQuery = query(collection(db, 'locations'), where('childId', 'in', childIds));
          const locCount = await getCountFromServer(locQuery);

          // Total Blocked Apps
          const blockQuery = query(collection(db, 'blocked_apps'), where('childId', 'in', childIds));
          const blockCount = await getCountFromServer(blockQuery);

          setStats({
            messages: msgCount.data().count,
            locations: locCount.data().count,
            blockedApps: blockCount.data().count,
            screenTime: '0h 0m' // Placeholder for now
          });
        } else {
          setStats({ messages: 0, locations: 0, blockedApps: 0, screenTime: '0h 0m' });
        }
        
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      return () => {
        unsubscribe();
        if (unsubDevices) unsubDevices();
      };
    }
  }, [user.uid, role]);

  const handleLogout = () => auth.signOut();

  if (role === 'child') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-deep p-8 text-center relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-red/5 blur-[120px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10"
        >
          <div className="p-8 bg-accent-red/10 rounded-[40px] border border-accent-red/20 shadow-glow-red mb-10 inline-block">
            <ShieldAlert className="w-20 h-20 text-accent-red" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-4">Device Secured</h1>
          <p className="text-text-dim max-w-md mx-auto leading-relaxed uppercase tracking-widest text-[10px] font-bold opacity-60">
            This device is currently under parental supervision. <br/>
            All activity is being securely monitored.
          </p>
          
          <div className="mt-12 p-8 bg-bg-surface rounded-3xl border border-border-dim w-full max-w-sm mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Link Status</span>
              </div>
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Encrypted</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-accent-blue" />
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Stealth Mode</span>
              </div>
              <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Active</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="mt-16 text-text-dim hover:text-accent-red transition-colors text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100"
          >
            Disconnect Device
          </button>
        </motion.div>
      </div>
    );
  }

  if (!role || (loading && role === 'parent')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-deep">
        <div className="w-10 h-10 border-4 border-accent-blue border-t-transparent rounded-full animate-spin shadow-glow-blue" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-deep overflow-hidden text-text-primary relative">
      {/* Full Screen Detail View Overlay */}
      <AnimatePresence>
        {selectedChild && (
          <motion.div
            key="child-detail-fullscreen"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[80] bg-bg-deep"
          >
            <ChildDetail 
              child={selectedChild} 
              onBack={() => { setSelectedChild(null); setActiveTab('overview'); }} 
              initialFeature={['camera', 'mirroring', 'audio'].includes(activeTab) ? activeTab : null}
              deviceInfo={deviceData[selectedChild.uid]}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-gradient-to-b from-[#0a0e14] to-bg-deep border-r border-border-dim flex flex-col z-[100] shadow-2xl"
            >
              <div className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-blue/10 rounded-lg border border-accent-blue/20 shadow-glow-blue">
                    <ShieldAlert className="w-5 h-5 text-accent-blue" />
                  </div>
                  <h1 className="text-lg font-black tracking-[0.2em] uppercase text-accent-blue shadow-glow-blue">Sentinel</h1>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all text-text-dim"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 space-y-1 mt-2">
                <NavItem 
                  icon={<LayoutDashboard className="w-4 h-4" />} 
                  label="Dashboard" 
                  active={activeTab === 'overview'} 
                  onClick={() => { setActiveTab('overview'); setSelectedChild(null); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Camera className="w-4 h-4" />} 
                  label="Remote Camera" 
                  active={activeTab === 'camera'} 
                  onClick={() => { setActiveTab('camera'); if(children.length > 0) setSelectedChild(children[0]); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Binoculars className="w-4 h-4" />} 
                  label="Screen Mirroring" 
                  active={activeTab === 'mirroring'} 
                  onClick={() => { setActiveTab('mirroring'); if(children.length > 0) setSelectedChild(children[0]); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Headphones className="w-4 h-4" />} 
                  label="One-Way Audio" 
                  active={activeTab === 'audio'} 
                  onClick={() => { setActiveTab('audio'); if(children.length > 0) setSelectedChild(children[0]); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Users className="w-4 h-4" />} 
                  label="Device Logs" 
                  active={activeTab === 'children'} 
                  onClick={() => { setActiveTab('children'); setSelectedChild(null); setIsSidebarOpen(false); }} 
                  badge={children.length > 0 ? children.length : undefined}
                />
                <NavItem 
                  icon={<Bell className="w-4 h-4" />} 
                  label="Live Media" 
                  active={activeTab === 'alerts'} 
                  onClick={() => { setActiveTab('alerts'); setSelectedChild(null); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Smartphone className="w-4 h-4" />} 
                  label="Geofencing" 
                  active={activeTab === 'geofencing'} 
                  onClick={() => { setActiveTab('geofencing'); setSelectedChild(null); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Settings className="w-4 h-4" />} 
                  label="Settings" 
                  active={activeTab === 'settings'} 
                  onClick={() => { setActiveTab('settings'); setSelectedChild(null); setIsSidebarOpen(false); }} 
                />
              </nav>

              <div className="p-6 mt-auto border-t border-border-dim">
                <div className="flex items-center gap-3 p-3 bg-bg-surface rounded-xl mb-4 border border-border-dim">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Avatar" className="w-8 h-8 rounded-lg bg-accent-blue/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate uppercase tracking-tight">{user.displayName}</p>
                    <p className="text-[10px] text-text-dim truncate font-mono uppercase opacity-50">{role}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-text-dim hover:bg-accent-red/10 hover:text-accent-red rounded-xl transition-all group"
                >
                  <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-widest">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="w-full h-full overflow-y-auto p-8">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 bg-bg-surface border border-border-dim rounded-xl hover:bg-white/10 transition-all text-accent-blue shadow-glow-blue"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="status-dot" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-text-primary">
                {selectedChild ? selectedChild.displayName : 'Parent Dashboard'}
                <span className="ml-3 text-xs font-bold text-text-dim uppercase tracking-widest opacity-50">
                  {selectedChild ? 'Stealth Mode Active' : 'System Online'}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-4 mr-4">
              <button 
                onClick={() => { setActiveTab('camera'); if(children.length > 0) setSelectedChild(children[0]); }}
                className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all group"
                title="Remote Camera"
              >
                <Camera className="w-4 h-4 text-blue-500" />
              </button>
              <button 
                onClick={() => { setActiveTab('mirroring'); if(children.length > 0) setSelectedChild(children[0]); }}
                className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all group"
                title="Screen Mirroring"
              >
                <Binoculars className="w-4 h-4 text-orange-500" />
              </button>
              <button 
                onClick={() => { setActiveTab('audio'); if(children.length > 0) setSelectedChild(children[0]); }}
                className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all group"
                title="One-Way Audio"
              >
                <Headphones className="w-4 h-4 text-green-500" />
              </button>
            </div>
            <div className="flex gap-8">
              <div className="text-right">
                <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Battery</p>
                <p className="text-sm font-black text-text-primary">
                  {selectedChild && deviceData[selectedChild.uid] ? `${deviceData[selectedChild.uid].batteryLevel}%` : '84%'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Network</p>
                <p className="text-sm font-black text-text-primary font-mono uppercase">
                  {selectedChild && deviceData[selectedChild.uid] 
                    ? (deviceData[selectedChild.uid].networkType === 'WiFi' 
                        ? deviceData[selectedChild.uid].wifiName || 'WiFi' 
                        : deviceData[selectedChild.uid].networkType)
                    : 'Just now'}
                </p>
              </div>
            </div>
            <button className="p-2.5 bg-bg-surface border border-border-dim rounded-xl hover:bg-white/10 transition-all relative">
              <Bell className="w-4 h-4 text-text-dim" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent-red rounded-full border border-bg-deep"></span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="p-10 immersive-card">
                <h3 className="text-2xl font-black uppercase tracking-tight mb-6">System Settings</h3>
                <div className="space-y-6">
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold uppercase tracking-widest text-sm">Stealth Mode</p>
                      <p className="text-xs text-text-dim mt-1">Hide Sentinel icon on child device</p>
                    </div>
                    <div className="w-12 h-6 bg-accent-blue rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold uppercase tracking-widest text-sm">Real-time Tracking</p>
                      <p className="text-xs text-text-dim mt-1">Update location every 30 seconds</p>
                    </div>
                    <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white/40 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 immersive-card">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldAlert className="w-6 h-6 text-accent-blue" />
                  <h3 className="text-2xl font-black uppercase tracking-tight">Permission Center</h3>
                </div>
                <p className="text-xs text-text-dim uppercase tracking-widest mb-8 leading-relaxed">
                  Ensure all system permissions are granted for full device synchronization and monitoring capabilities.
                </p>

                <AnimatePresence>
                  {permissionError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl flex items-center gap-3 text-accent-red text-[10px] font-bold uppercase tracking-widest"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{permissionError}</span>
                      <button onClick={() => setPermissionError(null)} className="ml-auto hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PermissionCard 
                    icon={<Camera className="w-5 h-5" />} 
                    label="Camera" 
                    status={permissions.camera} 
                    onClick={() => requestPermission('camera')} 
                  />
                  <PermissionCard 
                    icon={<Mic className="w-5 h-5" />} 
                    label="Microphone" 
                    status={permissions.microphone} 
                    onClick={() => requestPermission('microphone')} 
                  />
                  <PermissionCard 
                    icon={<MapPin className="w-5 h-5" />} 
                    label="Location" 
                    status={permissions.geolocation} 
                    onClick={() => requestPermission('geolocation')} 
                  />
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'alerts' ? (
            <motion.div
              key="live-media"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="p-10 immersive-card text-center">
                <div className="w-20 h-20 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bell className="w-10 h-10 text-accent-blue" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Live Media Feed</h3>
                <p className="text-text-dim text-sm mt-2 max-w-md mx-auto">
                  All live captures, recordings, and snapshots from monitored devices will appear here.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {/* Children Grid or Mobile-style Overview */}
              <section className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-dim">Monitored Assets</h3>
                  <button 
                    onClick={() => setShowSetup(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-accent-blue/10 border border-accent-blue/30 rounded-xl text-accent-blue text-[10px] font-black uppercase tracking-widest hover:bg-accent-blue/20 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Initialize New Device
                  </button>
                </div>

                {children.length > 0 ? (
                  <div className="space-y-10">
                    {/* Mobile-style Overview for the first child if only one exists, or a grid */}
                    {children.length === 1 ? (
                      <div className="max-w-2xl space-y-8">
                        {/* Today's Event Card */}
                        <div className="bg-white/5 rounded-[32px] p-8 border border-white/10 shadow-2xl">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <h3 className="font-black text-text-primary uppercase tracking-widest text-sm">Today's Event</h3>
                              <ChevronRight className="w-4 h-4 text-text-dim" />
                            </div>
                          </div>
                          <div className="mb-6">
                            <span className="text-4xl font-black text-text-primary tracking-tight">2h 25m 27s</span>
                          </div>
                          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#00ff88] w-1/4 rounded-full shadow-[0_0_10px_rgba(0,255,136,0.5)]"></div>
                          </div>
                        </div>

                        {/* Quick Actions Grid matching the requested image */}
                        <div className="grid grid-cols-3 gap-6">
                          <QuickActionCard 
                            icon={<Camera className="w-8 h-8 text-blue-500" />} 
                            label="Remote Camera" 
                            color="bg-blue-500/10"
                            onClick={() => { setActiveTab('camera'); setSelectedChild(children[0]); }}
                          />
                          <QuickActionCard 
                            icon={<Binoculars className="w-8 h-8 text-orange-500" />} 
                            label="Screen Mirroring" 
                            color="bg-orange-500/10"
                            onClick={() => { setActiveTab('mirroring'); setSelectedChild(children[0]); }}
                          />
                          <QuickActionCard 
                            icon={<Headphones className="w-8 h-8 text-green-500" />} 
                            label="One-Way Audio" 
                            color="bg-green-500/10"
                            onClick={() => { setActiveTab('audio'); setSelectedChild(children[0]); }}
                          />
                        </div>

                        {/* Child List as fallback */}
                        <div className="pt-10 border-t border-white/5">
                          <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-6">Active Device</p>
                          <ChildCard 
                            child={children[0]} 
                            onClick={() => setSelectedChild(children[0])} 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {children.map(child => (
                          <ChildCard 
                            key={child.uid} 
                            child={child} 
                            onClick={() => setSelectedChild(child)} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  !loading && (
                    <div className="p-16 immersive-card flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10">
                      <div className="p-5 bg-white/5 rounded-full mb-6">
                        <Users className="w-10 h-10 text-white/20" />
                      </div>
                      <h4 className="text-lg font-black uppercase tracking-tight">No Active Telemetry</h4>
                      <p className="text-text-dim text-xs mt-3 max-w-xs mx-auto leading-relaxed uppercase tracking-widest opacity-50">
                        Awaiting device initialization. Connect a child device to begin secure data tunneling.
                      </p>
                      <button 
                        onClick={() => setShowSetup(true)}
                        className="mt-8 px-8 py-4 bg-accent-blue text-bg-deep font-black rounded-2xl shadow-glow-blue hover:brightness-110 transition-all uppercase tracking-widest text-xs"
                      >
                        Setup First Device
                      </button>
                    </div>
                  )
                )}
              </section>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Total Messages" value={stats.messages.toString()} color="blue" />
                <StatCard icon={<MapPin className="w-5 h-5" />} label="Location Alerts" value={stats.locations.toString()} color="orange" />
                <StatCard icon={<Smartphone className="w-5 h-5" />} label="App Blocks" value={stats.blockedApps.toString()} color="red" />
                <StatCard icon={<Activity className="w-5 h-5" />} label="Screen Time" value={stats.screenTime} color="purple" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showSetup && (
          <SetupGuide onClose={() => setShowSetup(false)} pairingCode={pairingCode || user.uid.substring(0, 6)} />
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all group ${
        active 
          ? 'bg-bg-surface text-accent-blue border-l-2 border-accent-blue' 
          : 'text-text-dim hover:bg-white/5 hover:text-text-primary'
      }`}
    >
      <span className={`${active ? 'text-accent-blue shadow-glow-blue' : 'text-text-dim group-hover:text-text-primary'}`}>{icon}</span>
      <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-accent-blue text-bg-deep text-[10px] font-black px-2 py-0.5 rounded-md shadow-glow-blue">
          {badge}
        </span>
      )}
    </button>
  );
}

function QuickActionCard({ icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white/5 rounded-[32px] p-6 flex flex-col items-center text-center border border-white/10 hover:bg-white/10 transition-all group"
    >
      <div className={`w-16 h-16 ${color} rounded-[24px] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="text-[10px] font-black text-text-primary uppercase tracking-widest leading-tight">{label}</span>
    </button>
  );
}

function ChildCard({ child, onClick }: { child: Child, onClick: () => void, key?: string }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className="immersive-card group cursor-pointer hover:border-accent-blue/30 transition-all"
    >
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${child.uid}`} alt={child.displayName} className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00ff88] border-2 border-bg-deep rounded-full shadow-glow-green"></div>
        </div>
        <div>
          <h4 className="font-black text-text-primary uppercase tracking-tight group-hover:text-accent-blue transition-colors">{child.displayName}</h4>
          <p className="text-[10px] text-text-dim font-mono uppercase tracking-tighter mt-1 opacity-50">Last sync: 2 mins ago</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[9px] uppercase tracking-[0.2em] font-black text-text-dim mb-2 opacity-50">Energy</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#00ff88] w-[85%] shadow-glow-green"></div>
            </div>
            <span className="text-[10px] font-mono font-bold text-text-primary">85%</span>
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[9px] uppercase tracking-[0.2em] font-black text-text-dim mb-2 opacity-50">Status</p>
          <p className="text-[10px] font-black text-[#00ff88] uppercase tracking-widest">Active</p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  const colors: any = {
    blue: 'text-accent-blue bg-accent-blue/10 border-accent-blue/20',
    orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    red: 'text-accent-red bg-accent-red/10 border-accent-red/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  };

  return (
    <div className="immersive-card group hover:border-white/20 transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] opacity-50">{label}</p>
      <p className="text-2xl font-black text-text-primary mt-2 tracking-tight">{value}</p>
    </div>
  );
}

function PermissionCard({ icon, label, status, onClick }: { icon: any, label: string, status: string, onClick: () => void }) {
  const isGranted = status === 'granted';
  const isDenied = status === 'denied';

  return (
    <button 
      onClick={onClick}
      disabled={isGranted}
      className={`p-6 rounded-2xl border transition-all text-left flex flex-col gap-4 ${
        isGranted 
          ? 'bg-green-500/10 border-green-500/30 text-green-400' 
          : isDenied 
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-white/5 border-white/10 text-text-primary hover:border-accent-blue/30'
      }`}
    >
      <div className={`p-3 rounded-xl w-fit ${isGranted ? 'bg-green-500/20' : 'bg-white/10'}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">
          {isGranted ? 'Access Granted' : isDenied ? 'Access Denied' : 'Request Access'}
        </p>
      </div>
    </button>
  );
}
