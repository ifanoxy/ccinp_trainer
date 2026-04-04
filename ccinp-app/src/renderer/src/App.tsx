import { useState, useEffect } from 'react';
import {Loader2} from 'lucide-react';
import {Exercise, ProgressRecord, SessionMode, UserNote, UserProfile} from "./types";
import {EXERCISES} from "./data";
import {CustomTitleBar} from "./components/SharedUI";
import {Dashboard} from "./components/Dashboard";
import {Session} from "./components/Session";
import {ProfileSelect} from "./components/ProfileSelect";
import {Setup} from "./components/Setup";
import {Home} from "./components/Home";

export default function App() {
    const [view, setView] = useState<'profiles' | 'setup' | 'home' | 'session' | 'dashboard'>('profiles');
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);

    const [progressData, setProgressData] = useState<ProgressRecord[]>([]);
    const [notesData, setNotesData] = useState<Record<number, UserNote>>({});
    const [isLoading, setIsLoading] = useState(true);

    const [sessionQueue, setSessionQueue] = useState<Exercise[]>([]);
    const [sessionMode, setSessionMode] = useState<SessionMode>('smart');

    useEffect(() => {
        const initApp = async () => {
            if (window.api && window.api.checkExercises) {
                const hasExercises = await window.api.checkExercises();
                if (!hasExercises) { setView('setup'); setIsLoading(false); return; }
                const loadedProfiles = await window.api.getProfiles();
                setProfiles(loadedProfiles);
            } else {
                setProfiles([{ id: 'guest', name: 'Démo Invité', isIncognito: true }]);
            }
            setIsLoading(false);
        };
        initApp();
    }, []);

    const handleSelectProfile = async (profile: UserProfile) => {
        setActiveProfile(profile);
        if (!profile.isIncognito && window.api && window.api.getProgress) {
            setProgressData(await window.api.getProgress(profile.id) || []);
            setNotesData(await window.api.getNotes(profile.id) || {});
        } else {
            setProgressData([]); setNotesData({});
        }
        setView('home');
    };

    const handleCreateProfile = async (name: string) => {
        const newProfile: UserProfile = { id: Date.now().toString(), name, isIncognito: false };
        const updated = [...profiles, newProfile];
        setProfiles(updated);
        if (window.api && window.api.saveProfiles) await window.api.saveProfiles(updated);
    };

    const handleDeleteProfile = async (id: string) => {
        if (window.confirm("Supprimer ce profil ET toutes ses données ?")) {
            const updated = profiles.filter(p => p.id !== id);
            setProfiles(updated);
            if (window.api && window.api.saveProfiles) {
                await window.api.saveProfiles(updated);
                await window.api.deleteData(id);
            }
        }
    };

    const handleDeleteData = async () => {
        if (!activeProfile || activeProfile.isIncognito) return;
        if (window.api && window.api.deleteData) await window.api.deleteData(activeProfile.id);
        setProgressData([]); setNotesData({});
    };

    const handleStartSession = (mode: SessionMode) => {
        let pool = [...EXERCISES];
        let available: Exercise[] = [];

        if (mode === 'simulation') {
            const analysePool = pool.filter(e => e.type === 'Analyse');
            const autrePool = pool.filter(e => e.type !== 'Analyse');
            available.push(analysePool[Math.floor(Math.random() * analysePool.length)]);
            available.push(autrePool[Math.floor(Math.random() * autrePool.length)]);
        }
        else if (mode === 'weakness') {
            const map = new Map<number, ProgressRecord>();
            progressData.forEach(r => map.set(r.id, r));
            const weakIds = Array.from(map.values()).filter(r => r.score <= 3).map(r => r.id);
            available = pool.filter(ex => weakIds.includes(ex.id));
            if (available.length === 0) { alert("Aucune faiblesse détectée !"); return; }
            available = available.sort(() => Math.random() - 0.5);
        }
        else if (mode === 'smart') {
            const seenIds = progressData.map(d => d.id);
            available = pool.filter(ex => !seenIds.includes(ex.id));
            if (available.length === 0) available = [...pool];
            available = available.sort(() => Math.random() - 0.5);
        }
        else {
            available = [...pool].sort(() => Math.random() - 0.5);
        }

        setSessionMode(mode);
        setSessionQueue(available);
        setView('session');
    };

    const onRate = async (id: number, type: string, score: number, timeSpent: number) => {
        const newRecord: ProgressRecord = { id, type, score, timeSpent, date: new Date().toISOString() };
        if (!activeProfile?.isIncognito && window.api && window.api.saveProgress) {
            setProgressData(await window.api.saveProgress(activeProfile!.id, newRecord));
        } else {
            setProgressData(prev => [...prev, newRecord]);
        }
    };

    const onSaveNote = async (note: UserNote) => {
        if (!activeProfile?.isIncognito && window.api && window.api.saveNote) {
            setNotesData(await window.api.saveNote(activeProfile!.id, note));
        } else {
            setNotesData(prev => ({ ...prev, [note.id]: note }));
        }
    };

    if (isLoading) return <div className="h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="text-indigo-500 animate-spin" size={64}/></div>;

    return (
        <div className="h-screen w-screen flex flex-col text-slate-800 antialiased selection:bg-indigo-200 overflow-hidden bg-slate-50">
            <CustomTitleBar />
            <div className="flex-1 overflow-hidden relative pt-10">
                {view === 'setup' && <Setup onSuccess={() => setView('profiles')} />}
                {view === 'profiles' && <ProfileSelect profiles={[...profiles, { id: 'incognito', name: 'Mode Invité', isIncognito: true }]} onSelect={handleSelectProfile} onCreate={handleCreateProfile} onDelete={handleDeleteProfile} />}
                {view === 'home' && activeProfile && <Home activeProfile={activeProfile} progressData={progressData} startSession={handleStartSession} goToDashboard={() => setView('dashboard')} onChangeProfile={() => setView('profiles')} onDeleteData={handleDeleteData} />}
                {view === 'session' && <Session queue={sessionQueue} notesData={notesData} sessionMode={sessionMode} endSession={() => setView('home')} onSaveNote={onSaveNote} onRate={onRate} />}
                {view === 'dashboard' && <Dashboard progressData={progressData} goHome={() => setView('home')} />}
            </div>
        </div>
    );
}