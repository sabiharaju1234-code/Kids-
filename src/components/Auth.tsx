import { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { Shield, Lock, Eye, Smartphone, Users, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth() {
  const [mode, setMode] = useState<'select' | 'parent' | 'child'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChildPairing = async () => {
    if (pairingCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Sign in anonymously first to pass security rules
      const userCredential = await signInAnonymously(auth);
      const childUid = userCredential.user.uid;

      // 2. Find the parent with this pairing code
      const q = query(collection(db, 'users'), where('pairingCode', '==', pairingCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid pairing code. Please check your parent device.');
        await auth.signOut(); // Sign out if code is invalid
        setLoading(false);
        return;
      }

      const parentDoc = querySnapshot.docs[0];
      const parentId = parentDoc.id;

      // 3. Create child user document
      await setDoc(doc(db, 'users', childUid), {
        uid: childUid,
        role: 'child',
        parentId: parentId,
        displayName: `Child Device (${childUid.substring(0, 4)})`,
        createdAt: new Date().toISOString()
      });

    } catch (err: any) {
      setError(err.message);
      await auth.signOut();
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-bg-deep text-text-primary relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-red/5 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 bg-bg-surface backdrop-blur-xl rounded-[32px] border border-border-dim shadow-2xl relative z-10"
      >
        <AnimatePresence mode="wait">
          {mode === 'select' ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <div className="inline-block p-5 bg-accent-blue/10 rounded-3xl border border-accent-blue/20 shadow-glow-blue mb-6">
                  <Shield className="w-12 h-12 text-accent-blue" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight uppercase mb-2">Sentinel</h1>
                <p className="text-text-dim text-xs tracking-widest uppercase mb-10">Select Device Protocol</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setMode('parent')}
                  className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-accent-blue/10 hover:border-accent-blue/30 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent-blue/10 rounded-xl group-hover:shadow-glow-blue transition-all">
                      <Smartphone className="w-6 h-6 text-accent-blue" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-widest text-sm">Admin Phone</h3>
                      <p className="text-[10px] text-text-dim mt-1">Parental Dashboard & Monitoring</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setMode('child')}
                  className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-accent-red/10 hover:border-accent-red/30 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent-red/10 rounded-xl group-hover:shadow-glow-red transition-all">
                      <Users className="w-6 h-6 text-accent-red" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-widest text-sm">Children Lock Phone</h3>
                      <p className="text-[10px] text-text-dim mt-1">Device to be Monitored</p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          ) : mode === 'parent' ? (
            <motion.div
              key="parent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button onClick={() => setMode('select')} className="mb-8 flex items-center gap-2 text-text-dim hover:text-text-primary transition-colors text-xs font-bold uppercase tracking-widest">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Admin Access</h2>
                <p className="text-xs text-text-dim uppercase tracking-widest">Login with Google to access dashboard</p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-4 px-6 bg-accent-blue text-bg-deep font-black rounded-2xl shadow-glow-blue hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-sm"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-bg-deep border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Login as Parent
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="child"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button onClick={() => setMode('select')} className="mb-8 flex items-center gap-2 text-text-dim hover:text-text-primary transition-colors text-xs font-bold uppercase tracking-widest">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Child Pairing</h2>
                <p className="text-xs text-text-dim uppercase tracking-widest">Enter the code from parent device</p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-center text-3xl font-black tracking-[0.5em] text-accent-red focus:border-accent-red/50 focus:bg-accent-red/5 outline-none transition-all placeholder:opacity-20"
                  />
                </div>

                <button
                  onClick={handleChildPairing}
                  disabled={loading || pairingCode.length !== 6}
                  className="w-full py-4 px-6 bg-accent-red text-white font-black rounded-2xl shadow-glow-red hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-sm"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Pair This Device
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-accent-red/10 border border-accent-red/30 rounded-2xl text-accent-red text-[10px] text-center font-bold uppercase tracking-widest"
          >
            {error}
          </motion.div>
        )}

        <p className="mt-10 text-[10px] text-center text-text-dim uppercase tracking-[0.2em] font-bold opacity-50">
          Sentinel Security Protocol v2.5
        </p>
      </motion.div>
    </div>
  );
}
