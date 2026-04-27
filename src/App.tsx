import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Trophy, 
  User, 
  Coins, 
  Flame, 
  Search, 
  Bell,
  LogOut,
  Zap,
  Swords
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface UserProfile {
  userId: string;
  displayName: string;
  photoURL: string;
  bio: string;
  coins: number;
  score: number;
  isVerified: boolean;
}

// --- Components ---

const Navbar = ({ coins }: { coins: number }) => {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: Heart, label: 'Discover' },
    { path: '/arena', icon: Swords, label: 'The Duel' },
    { path: '/leaderboard', icon: Trophy, label: 'Prestige' },
    { path: '/profile', icon: User, label: 'The Vault' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-panel/80 backdrop-blur-xl border-t border-dark-border px-6 py-3 flex justify-between items-center z-50 md:top-0 md:bottom-auto md:h-16">
      <div className="hidden md:flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-gold-500 to-gold-600 rounded-full flex items-center justify-center text-black font-bold">L</div>
        <h1 className="text-xl font-serif italic tracking-[0.2em] text-gold-500">L'AMOUR NOIR</h1>
      </div>
      
      <div className="flex gap-8 items-center flex-1 justify-around md:justify-center">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                isActive ? "text-gold-500" : "text-[#666] hover:text-[#999]"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[9px] uppercase font-medium tracking-[0.2em]">{item.label}</span>
              {isActive && <motion.div layoutId="nav-active" className="h-0.5 w-4 bg-gold-500 mt-0.5 rounded-full" />}
            </Link>
          );
        })}
      </div>

      <div className="hidden md:flex items-center gap-4">
        <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1.5 rounded-full flex items-center gap-2">
          <span className="text-gold-500 font-bold text-sm tracking-tighter">{coins.toLocaleString()}</span>
          <span className="text-[9px] uppercase text-[#888] font-medium tracking-widest">Gilded</span>
        </div>
      </div>
    </nav>
  );
};

const LoadingScreen = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-dark-bg gap-6">
    <motion.div
      animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.05, 0.95] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="w-16 h-16 rounded-full border border-gold-500/30 flex items-center justify-center p-2"
    >
      <div className="w-full h-full rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
    </motion.div>
    <p className="text-gold-500 font-serif italic text-sm tracking-[0.3em] uppercase opacity-60">Initializing Elegance</p>
  </div>
);

const AuthScreen = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-dark-bg p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.05),_transparent_40%)]" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_rgba(140,98,57,0.05),_transparent_40%)]" />
      
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="z-10 text-center max-w-lg"
      >
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 bg-dark-panel border border-gold-500/20 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.1)]">
            <Heart size={32} className="text-gold-500 italic" strokeWidth={1} />
          </div>
        </div>
        <h1 className="text-6xl font-serif italic text-white mb-6 tracking-tight">
          L'Amour <span className="text-gold-500">Noir</span>
        </h1>
        <p className="text-[#888] mb-12 text-base leading-relaxed tracking-wide font-light max-w-sm mx-auto italic">
          "Where mystery meets prestige. Compete for the most captivating presence in the midnight arena."
        </p>
        
        <button 
          onClick={handleLogin}
          className="w-full bg-gold-500 text-black font-bold py-4 px-10 rounded-full flex items-center justify-center gap-3 hover:bg-gold-400 transition-all active:scale-[0.98] shadow-[0_10px_30px_rgba(212,175,55,0.2)] tracking-widest text-xs uppercase"
        >
          ENTER THE VAULT
        </button>
        
        <p className="mt-10 text-[9px] text-[#444] uppercase tracking-[0.4em] leading-loose">
          By entering, you accept our <br/>Code of Prestige.
        </p>
      </motion.div>
    </div>
  );
};

// --- Pages ---

const Discover = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as UserProfile);
      setProfiles(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <div className="max-w-xl mx-auto pt-24 pb-32 px-4">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-4xl font-serif text-white italic">The Midnight Feed</h2>
          <p className="text-[#666] font-medium tracking-[0.2em] text-[10px] uppercase mt-2">Curated for your prestige</p>
        </div>
        <button className="bg-dark-panel border border-dark-border p-3.5 rounded-full text-[#888] hover:text-white transition-colors shadow-xl">
          <Search size={20} />
        </button>
      </div>

      <div className="space-y-12">
        {profiles.map((profile, i) => (
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1, duration: 0.8 }}
            key={profile.userId}
            className="group relative overflow-hidden rounded-[2.5rem] bg-[#111] aspect-[4/5] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-dark-border/50"
          >
            <img 
              src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName}`}
              alt={profile.displayName}
              className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
            
            <div className="absolute bottom-0 left-0 right-0 p-10">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-white text-3xl font-serif italic">{profile.displayName}</h3>
                {profile.isVerified && (
                  <div className="bg-gold-500 p-0.5 rounded-full">
                    <Zap size={10} className="text-black fill-black" />
                  </div>
                )}
              </div>
              <p className="text-[#999] text-sm italic font-light line-clamp-2 mb-8 tracking-wide">
                {profile.bio || "Maintaining an air of mystery in the digital vault."}
              </p>
              
              <div className="flex gap-4">
                <button className="flex-1 bg-white text-black h-14 rounded-full font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-gold-500 transition-colors">
                  <Heart className="fill-black" size={16} />
                  CHARM
                </button>
                <button className="bg-white/10 backdrop-blur-md border border-white/10 text-white h-14 w-14 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Swords size={20} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="absolute top-8 right-8 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
              <Trophy size={14} className="text-gold-500" />
              <span className="text-white font-bold text-xs tracking-widest">{profile.score}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Arena = () => (
  <div className="max-w-xl mx-auto pt-24 pb-32 px-4 text-center">
    <div className="bg-gradient-to-br from-[#0f0f0f] to-[#050505] rounded-[3rem] p-12 text-white mb-12 border border-dark-border relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-8 opacity-5 text-gold-500">
        <Swords size={200} strokeWidth={1} />
      </div>
      <div className="relative z-10">
        <h2 className="text-5xl font-serif italic mb-6 tracking-tight">The Midnight Duel</h2>
        <p className="text-[#888] text-base mb-10 max-w-sm mx-auto italic font-light leading-relaxed">
          Who possesses the most captivating presence? Stake your prestige in head-to-head combat.
        </p>
        <button className="bg-gold-500 text-black px-12 py-5 rounded-full font-bold text-sm tracking-[0.3em] uppercase hover:bg-gold-400 transition-all shadow-[0_10px_40px_rgba(212,175,55,0.2)] active:scale-95">
          BEGIN DUEL
        </button>
        <div className="mt-8 flex items-center justify-center gap-2">
          <Coins size={14} className="text-gold-500" />
          <p className="text-gold-500/60 font-medium text-[10px] uppercase tracking-[0.2em]">Stakes: 10 Gilded</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6">
      <div className="bg-dark-panel p-8 rounded-[2.5rem] border border-dark-border">
        <p className="text-[#666] font-bold text-[9px] uppercase tracking-[0.2em] mb-3">Victories</p>
        <span className="text-3xl font-serif italic text-white">0</span>
      </div>
      <div className="bg-dark-panel p-8 rounded-[2.5rem] border border-dark-border">
        <p className="text-[#666] font-bold text-[9px] uppercase tracking-[0.2em] mb-3">Prestige Tier</p>
        <span className="text-3xl font-serif italic text-white">Bronze</span>
      </div>
    </div>
  </div>
);

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("score", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTopUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-xl mx-auto pt-24 pb-32 px-4">
      <div className="mb-12">
        <h2 className="text-4xl font-serif italic text-white">Hall of Prestige</h2>
        <p className="text-[#666] text-[10px] uppercase tracking-[0.2em] font-medium mt-2">The most captivating elite</p>
      </div>

      <div className="space-y-3">
        {topUsers.map((user, i) => (
          <div 
            key={user.userId} 
            className={cn(
              "flex items-center gap-5 p-5 rounded-[2rem] border transition-all duration-500",
              i === 0 ? "bg-gold-500/5 border-gold-500/20 shadow-[0_10px_30px_-10px_rgba(212,175,55,0.1)]" : "bg-dark-panel border-dark-border hover:border-[#444]"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-serif italic text-lg",
              i === 0 ? "text-gold-500" : 
              i === 1 ? "text-slate-400" :
              i === 2 ? "text-orange-400" : "text-[#444]"
            )}>
              {i + 1}.
            </div>
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`}
              className={cn(
                "w-14 h-14 rounded-2xl object-cover grayscale transition-all duration-700 group-hover:grayscale-0",
                i === 0 && "grayscale-0 ring-2 ring-gold-500/30"
              )}
            />
            <div className="flex-1">
              <p className={cn("font-bold tracking-wide", i === 0 ? "text-white" : "text-[#aaa]")}>{user.displayName}</p>
              <p className="text-[9px] text-[#555] uppercase tracking-[0.2em] font-medium mt-1">{user.score} Prestige Pts</p>
            </div>
            {i < 3 && (
              <div className={cn(
                i === 0 ? "text-gold-500" : i === 1 ? "text-slate-400" : "text-amber-700"
              )}>
                <Trophy size={18} fill="currentColor" opacity={0.5} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Profile = ({ user, profile, onClaimDaily }: { user: FirebaseUser, profile: UserProfile | null, onClaimDaily: () => void }) => {
  return (
    <div className="max-w-xl mx-auto pt-24 pb-32 px-4">
      <div className="bg-dark-panel rounded-[3rem] p-10 border border-dark-border shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600" />
        
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-6">
            <div className="w-36 h-36 rounded-[3rem] p-1 bg-gradient-to-tr from-gold-600 to-gold-400 shadow-xl">
              <img 
                src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.displayName}`}
                className="w-full h-full rounded-[2.8rem] object-cover bg-dark-bg"
              />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-dark-bg p-2 rounded-2xl border-2 border-dark-border">
              <Zap size={24} className="text-gold-500" fill="currentColor" />
            </div>
          </div>
          <h2 className="text-4xl font-serif italic text-white mb-2">{profile?.displayName || user.displayName}</h2>
          <p className="text-[#666] text-[10px] uppercase tracking-[0.4em] font-bold">Initiate Envoy</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-12">
          <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-center transition-transform hover:scale-105">
            <Coins className="text-gold-500 mx-auto mb-3" size={20} />
            <span className="block text-3xl font-serif italic text-white mb-1">{profile?.coins.toLocaleString() || 0}</span>
            <span className="text-[8px] uppercase font-bold text-[#555] tracking-[0.3em]">Gilded Wealth</span>
          </div>
          <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 text-center transition-transform hover:scale-105">
            <Flame className="text-gold-500 mx-auto mb-3" size={20} />
            <span className="block text-3xl font-serif italic text-white mb-1">{profile?.score || 0}</span>
            <span className="text-[8px] uppercase font-bold text-[#555] tracking-[0.3em]">Prestige Aura</span>
          </div>
        </div>

        <button 
          onClick={onClaimDaily}
          className="w-full bg-[#1a1a1a] border border-gold-500/30 text-gold-500 py-6 rounded-[2.5rem] font-bold text-xs uppercase tracking-[0.4em] hover:bg-gold-500 hover:text-black transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-4"
        >
          <Zap fill="currentColor" size={18} />
          REPLENISH GOLD
        </button>
      </div>

      <button 
        onClick={() => auth.signOut()}
        className="w-full bg-[#050505] text-[#444] py-5 rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:text-rose-500/60 transition-all border border-transparent hover:border-rose-500/10"
      >
        <LogOut size={16} />
        ABANDON SESSION
      </button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            userId: u.uid,
            displayName: u.displayName || "New Charmer",
            photoURL: u.photoURL || "",
            bio: "",
            coins: 100,
            score: 0,
            isVerified: false
          };
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setProfile(newProfile);
        } else {
          setProfile(userDoc.data() as UserProfile);
        }

        // Live profile updates
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) setProfile(snap.data() as UserProfile);
        });
      }
      setLoading(false);
    });
  }, []);

  const handleClaimDaily = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/coins/claim-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      if (data.success) {
        alert("Claimed 100 bonus coins!");
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Navbar coins={profile?.coins || 0} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Discover />} />
            <Route path="/arena" element={<Arena />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile user={user} profile={profile} onClaimDaily={handleClaimDaily} />} />
          </Routes>
        </AnimatePresence>
      </div>
    </BrowserRouter>
  );
}
