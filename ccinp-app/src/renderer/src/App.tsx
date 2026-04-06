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

const APP_START_TIME = Date.now();

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export default function App() {
    const [view, setView] = useState<'profiles' | 'setup' | 'home' | 'session' | 'dashboard'>('profiles');
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);

    const [progressData, setProgressData] = useState<ProgressRecord[]>([]);
    const [notesData, setNotesData] = useState<Record<number, UserNote>>({});
    const [isLoading, setIsLoading] = useState(true);

    const [sessionQueue, setSessionQueue] = useState<Exercise[]>([]);
    const [sessionMode, setSessionMode] = useState<SessionMode>('smart');
    const [sessionDuration, setSessionDuration] = useState<number>(0);

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

    useEffect(() => {
        if (!window.api || !window.api.updateDiscord) return;

        if (localStorage.getItem('ccinp_discord_rpc') === 'false') {
            window.api.updateDiscord({ clear: true });
            return;
        }

        if (view === 'profiles' || view === 'setup' || view === 'home') {
            window.api.updateDiscord({ details: "Dans les menus", state: "Se prépare à réviser...", startTimestamp: APP_START_TIME });
        } else if (view === 'dashboard') {
            window.api.updateDiscord({ details: "Analyse ses statistiques 📊", state: "Tableau de Bord", startTimestamp: APP_START_TIME });
        }
    }, [view, activeProfile]);

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

    const handleStartSession = (mode: SessionMode, duration: number = 0, filters?: any) => {
        let pool = [...EXERCISES];
        let available: Exercise[] = [];

        if (mode === 'simulation') {
            const analysePool = pool.filter(e => e.type === 'Analyse');
            const autrePool = pool.filter(e => e.type !== 'Analyse');
            available.push(analysePool[Math.floor(Math.random() * analysePool.length)]);
            available.push(autrePool[Math.floor(Math.random() * autrePool.length)]);
            setSessionDuration(25 * 60);
        }
        else if (mode === 'weakness') {
            const map = new Map<number, ProgressRecord>();
            progressData.forEach(r => map.set(r.id, r));
            const weakIds = Array.from(map.values()).filter(r => r.score <= 3).map(r => r.id);
            available = pool.filter(ex => weakIds.includes(ex.id));
            if (available.length === 0) { alert("Aucune faiblesse détectée !"); return; }
            available = shuffle(available);
            setSessionDuration(0);
        }
        else if (mode === 'smart') {
            const seenIds = progressData.map(d => d.id);
            available = pool.filter(ex => !seenIds.includes(ex.id));
            if (available.length === 0) available = [...pool];
            available = shuffle(available);
            setSessionDuration(0);
        }
        else if (mode === 'anki') {
            const map = new Map<number, ProgressRecord>();
            progressData.forEach(r => map.set(r.id, r));
            const seen = Array.from(map.values());

            if (seen.length === 0) { alert("Fais quelques exercices d'abord pour créer un historique !"); return; }

            const now = Date.now();
            seen.sort((a, b) => {
                const daysA = Math.max(0.1, (now - new Date(a.date).getTime()) / (1000 * 3600 * 24));
                const daysB = Math.max(0.1, (now - new Date(b.date).getTime()) / (1000 * 3600 * 24));
                const urgencyA = (8 - a.score) * daysA;
                const urgencyB = (8 - b.score) * daysB;
                return urgencyB - urgencyA;
            });

            available = seen.map(r => pool.find(e => e.id === r.id)).filter(Boolean) as Exercise[];
            setSessionDuration(0);
        }
        else if (mode === 'blitz') {
            available = shuffle([...pool]);
            setSessionDuration(duration * 60);
        }
        else if (mode === 'custom' && filters) {
            const map = new Map<number, ProgressRecord>();
            progressData.forEach(r => map.set(r.id, r));

            available = pool.filter(ex => {
                if (!filters.types.includes(ex.type)) return false;

                const hasSeen = map.has(ex.id);

                if (filters.status === 'seen' && !hasSeen) return false;
                if (filters.status === 'unseen' && hasSeen) return false;

                if (hasSeen && filters.status !== 'unseen') {
                    const score = map.get(ex.id)!.score;
                    if (!filters.scores.includes(score)) return false;
                }

                return true;
            });

            if (available.length === 0) {
                alert("Aucun exercice ne correspond à ces critères exacts ! Essaie d'élargir tes filtres.");
                return;
            }
            available = shuffle(available);
            setSessionDuration(0);
        }
        else {
            available = shuffle([...pool]);
            setSessionDuration(0);
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
                {view === 'session' && <Session queue={sessionQueue} notesData={notesData} sessionMode={sessionMode} sessionDuration={sessionDuration} endSession={() => setView('home')} onSaveNote={onSaveNote} onRate={onRate} />}
                {view === 'dashboard' && <Dashboard progressData={progressData} goHome={() => setView('home')} />}
            </div>
        </div>
    );
}