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
    { path: '/arena', icon: Swords, label: 'Arena' },
    { path: '/leaderboard', icon: Trophy, label: 'Top' },
    { path: '/profile', icon: User, label: 'Me' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 md:top-0 md:bottom-auto">
      <div className="hidden md:flex items-center gap-2 font-black text-2xl text-rose-500">
        <Flame className="fill-rose-500" />
        <span>CHARM</span>
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
                isActive ? "text-rose-500 scale-110" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] uppercase font-bold tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="hidden md:flex items-center gap-4">
        <div className="bg-amber-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-amber-100">
          <Coins size={18} className="text-amber-500" />
          <span className="font-bold text-amber-700">{coins}</span>
        </div>
      </div>
    </nav>
  );
};

const LoadingScreen = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-rose-50 gap-4">
    <motion.div
      animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
    >
      <Heart size={64} className="text-rose-500 fill-rose-500" />
    </motion.div>
    <p className="text-rose-700 font-bold animate-pulse uppercase tracking-[0.2em]">Finding Charms...</p>
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
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from),_transparent_40%)] from-rose-100 opacity-50" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-from),_transparent_40%)] from-amber-100 opacity-50" />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="z-10 text-center max-w-md"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-rose-500 p-4 rounded-[2rem] transform -rotate-12 shadow-2xl shadow-rose-200">
            <Heart size={48} className="text-white fill-white" />
          </div>
        </div>
        <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">
          Find your <span className="text-rose-500">Charm</span>.
        </h1>
        <p className="text-gray-500 mb-12 text-lg leading-relaxed">
          The world's first charisma-based dating app. Compete, earn coins, and rank among the most charming.
        </p>
        
        <button 
          onClick={handleLogin}
          className="w-full bg-gray-900 text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-95 shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 invert" alt="Google" />
          CONTINUE WITH GOOGLE
        </button>
        
        <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest leading-loose">
          By continuing, you agree to our <br/>Terms & Charisma Guidelines.
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Charm Feed</h2>
          <p className="text-gray-400 font-medium">Top profiles near you</p>
        </div>
        <button className="bg-gray-100 p-3 rounded-2xl text-gray-600 hover:bg-gray-200">
          <Search size={24} />
        </button>
      </div>

      <div className="space-y-6">
        {profiles.map((profile, i) => (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            key={profile.userId}
            className="group relative overflow-hidden rounded-[2.5rem] bg-gray-100 aspect-[3/4] shadow-2xl"
          >
            <img 
              src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName}`}
              alt={profile.displayName}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-90" />
            
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-white text-3xl font-black">{profile.displayName}</h3>
                {profile.isVerified && (
                  <div className="bg-sky-400 p-1 rounded-full">
                    <Zap size={14} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <p className="text-white/80 text-lg line-clamp-2 mb-6 font-medium">
                {profile.bio || "Just joined Charm! Looking for interesting people to battle and connect with."}
              </p>
              
              <div className="flex gap-4">
                <button className="flex-1 bg-white text-gray-900 h-14 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors">
                  <Heart className="text-rose-500 fill-rose-500" size={20} />
                  LIKE
                </button>
                <button className="bg-white/20 backdrop-blur-md text-white h-14 w-14 rounded-2xl flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Swords size={24} />
                </button>
              </div>
            </div>

            <div className="absolute top-6 right-6 bg-amber-400/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-amber-300 shadow-lg">
              <Trophy size={16} className="text-white" />
              <span className="text-white font-black text-sm">{profile.score}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Arena = () => (
  <div className="max-w-xl mx-auto pt-24 pb-32 px-4 text-center">
    <div className="bg-gray-900 rounded-[3rem] p-10 text-white mb-8 border-4 border-rose-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <Swords size={120} strokeWidth={1} />
      </div>
      <h2 className="text-4xl font-black mb-4 tracking-tight">The Arena</h2>
      <p className="text-gray-400 text-lg mb-8 max-w-sm mx-auto">
        Battle head-to-head for Charisma points. Stake coins to win real rewards.
      </p>
      <button className="bg-rose-500 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-rose-400 transition-all shadow-xl shadow-rose-900/40">
        START BATTLE
      </button>
      <p className="mt-4 text-rose-400 font-bold text-sm uppercase tracking-widest">Entry Fee: 10 Coins</p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-100 p-6 rounded-[2rem] border-b-4 border-gray-200">
        <p className="text-gray-400 font-bold text-xs uppercase mb-2">My Wins</p>
        <span className="text-3xl font-black text-gray-900">0</span>
      </div>
      <div className="bg-gray-100 p-6 rounded-[2rem] border-b-4 border-gray-200">
        <p className="text-gray-400 font-bold text-xs uppercase mb-2">My Rank</p>
        <span className="text-3xl font-black text-gray-900">#--</span>
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
      <h2 className="text-4xl font-black text-gray-900 mb-2">Elite Charms</h2>
      <p className="text-gray-400 font-medium mb-10">Real-time global rankings</p>

      <div className="space-y-4">
        {topUsers.map((user, i) => (
          <div 
            key={user.userId} 
            className="flex items-center gap-4 bg-white p-4 rounded-[2rem] border-2 border-gray-50 shadow-sm hover:border-rose-100 transition-colors"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl",
              i === 0 ? "bg-amber-100 text-amber-600" : 
              i === 1 ? "bg-slate-100 text-slate-600" :
              i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"
            )}>
              {i + 1}
            </div>
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-gray-100"
            />
            <div className="flex-1">
              <p className="font-black text-gray-900">{user.displayName}</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{user.score} Charisma</p>
            </div>
            {i < 3 && (
              <div className="text-amber-500">
                <Trophy size={20} fill="currentColor" />
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
      <div className="bg-white rounded-[3rem] p-8 border-2 border-gray-100 shadow-xl mb-8">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <img 
              src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.displayName}`}
              className="w-32 h-32 rounded-[2.5rem] object-cover ring-4 ring-rose-50"
            />
            <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-2 rounded-2xl border-4 border-white">
              <Zap size={20} fill="currentColor" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-gray-900">{profile?.displayName || user.displayName}</h2>
          <p className="text-gray-400 font-medium">Level 1 Charmer</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-100 text-center">
            <div className="flex justify-center mb-2">
              <Coins className="text-amber-500" />
            </div>
            <span className="block text-2xl font-black text-amber-900">{profile?.coins || 0}</span>
            <span className="text-[10px] uppercase font-black text-amber-600 tracking-widest">Coins Available</span>
          </div>
          <div className="bg-rose-50 p-6 rounded-[2rem] border-2 border-rose-100 text-center">
            <div className="flex justify-center mb-2">
              <Flame className="text-rose-500" />
            </div>
            <span className="block text-2xl font-black text-rose-900">{profile?.score || 0}</span>
            <span className="text-[10px] uppercase font-black text-rose-600 tracking-widest">Charisma Score</span>
          </div>
        </div>

        <button 
          onClick={onClaimDaily}
          className="w-full bg-amber-400 text-white py-5 rounded-[2rem] font-black text-xl hover:bg-amber-500 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
        >
          <Zap fill="currentColor" />
          CLAIM DAILY 100 COINS
        </button>
      </div>

      <button 
        onClick={() => auth.signOut()}
        className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 hover:text-gray-600 transition-all"
      >
        <LogOut size={20} />
        SIGN OUT
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
