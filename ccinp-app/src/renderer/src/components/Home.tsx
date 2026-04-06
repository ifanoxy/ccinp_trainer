import React, {useMemo, useState, useEffect} from "react";
import {
    BarChart3, BrainCircuit, ChevronRight, FolderDown, Ghost, GraduationCap, Loader2, Play, Settings,
    Shuffle, Target, Trash2, Users, CalendarDays, Flag, Gamepad2, Layers, Timer, SlidersHorizontal, Brain, ExternalLink, Info, RefreshCw
} from "lucide-react";
import {ProgressRecord, SessionMode, UserProfile} from "../types";
import {EXERCISES} from "../data";
import {AnimatedBackground, Modal} from "./SharedUI";

interface HomeProps {
    activeProfile: UserProfile;
    progressData: ProgressRecord[];
    startSession: (mode: SessionMode, duration?: number, filters?: any) => void;
    goToDashboard: () => void;
    onChangeProfile: () => void;
    onDeleteData: () => void;
}

export const Home: React.FC<HomeProps> = ({ activeProfile, progressData, startSession, goToDashboard, onChangeProfile, onDeleteData }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isOtherModesOpen, setIsOtherModesOpen] = useState(false);
    const [showBlitzOptions, setShowBlitzOptions] = useState(false);

    // --- ÉTATS DU MODE PERSONNALISÉ ---
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customTypes, setCustomTypes] = useState<string[]>(['Analyse', 'Algebre', 'Probabilites']);
    const [customStatus, setCustomStatus] = useState<'all' | 'seen' | 'unseen'>('all');
    const [customScores, setCustomScores] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

    const [isImporting, setIsImporting] = useState(false);
    const [deadline, setDeadline] = useState<string>('');
    const [discordEnabled, setDiscordEnabled] = useState<boolean>(true);

    // NOUVEAU : État pour stocker la version de l'application
    const [appVersion, setAppVersion] = useState<string>('1.0.0');

    useEffect(() => {
        setDeadline(localStorage.getItem(`ccinp_deadline_${activeProfile.id}`) || '');
        setDiscordEnabled(localStorage.getItem('ccinp_discord_rpc') !== 'false');

        // NOUVEAU : On récupère la version depuis Electron
        if (window.api && window.api.getVersion) {
            window.api.getVersion().then(setAppVersion);
        }
    }, [activeProfile.id]);

    useEffect(() => {
        if (deadline) localStorage.setItem(`ccinp_deadline_${activeProfile.id}`, deadline);
        else localStorage.removeItem(`ccinp_deadline_${activeProfile.id}`);
    }, [deadline, activeProfile.id]);

    const toggleDiscord = () => {
        const newValue = !discordEnabled;
        setDiscordEnabled(newValue);
        localStorage.setItem('ccinp_discord_rpc', newValue.toString());

        if (!newValue && window.api && window.api.updateDiscord) {
            window.api.updateDiscord({ clear: true } as any);
        } else if (newValue && window.api && window.api.updateDiscord) {
            window.api.updateDiscord({ details: "Dans les paramètres", state: "Configuration de l'app" });
        }
    };

    const toggleCustomType = (type: string) => {
        if (customTypes.includes(type) && customTypes.length > 1) {
            setCustomTypes(customTypes.filter(t => t !== type));
        } else if (!customTypes.includes(type)) {
            setCustomTypes([...customTypes, type]);
        }
    };

    const toggleCustomScore = (score: number) => {
        if (customScores.includes(score) && customScores.length > 1) {
            setCustomScores(customScores.filter(s => s !== score));
        } else if (!customScores.includes(score)) {
            setCustomScores([...customScores, score].sort());
        }
    };

    const handleStartCustomSession = () => {
        startSession('custom', 0, {
            types: customTypes,
            status: customStatus,
            scores: customScores
        });
        setIsCustomModalOpen(false);
    };

    const uniqueSeenIds = new Set(progressData.map(p => p.id)).size;
    const progressPercent = Math.round((uniqueSeenIds / EXERCISES.length) * 100);

    const weakExercisesCount = useMemo(() => {
        const map = new Map<number, ProgressRecord>();
        progressData.forEach(r => map.set(r.id, r));
        return Array.from(map.values()).filter(r => r.score <= 3).length;
    }, [progressData]);

    const { masteredTodayCount, dailyGoal, daysRemaining } = useMemo(() => {
        const latestMap = new Map<number, ProgressRecord>();
        progressData.forEach(r => latestMap.set(r.id, r));
        const latest = Array.from(latestMap.values());

        const mastered = latest.filter(r => r.score >= 6);
        const remainingExos = EXERCISES.length - mastered.length;

        const todayStr = new Date().toDateString();
        const masteredTodayCount = mastered.filter(r => new Date(r.date).toDateString() === todayStr).length;

        let dailyGoal = 0;
        let daysRemaining = 0;

        if (deadline) {
            const diffTime = new Date(deadline).getTime() - new Date().getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysRemaining > 0) {
                dailyGoal = Math.ceil(remainingExos / daysRemaining);
            }
        }

        return { masteredTodayCount, dailyGoal, daysRemaining };
    }, [progressData, deadline]);

    const handleUpdateBankLocal = async () => {
        if (!window.api) return alert("Fonctionnalité disponible dans l'app locale.");
        setIsImporting(true);
        try {
            const res = await window.api.importExercises();
            if (res.success) alert("Banque d'exercices mise à jour avec succès !");
            else if (res.error) alert(`Erreur : ${res.error}`);
        } catch(e) { alert("Erreur."); }
        setIsImporting(false); setIsSettingsOpen(false);
    };

    const handleOpenBankPage = async () => {
        try {
            const res = await fetch('./config.json');
            const config = await res.json();
            if (config && config.bankUrl) window.open(config.bankUrl, '_blank');
            else throw new Error("L'URL n'est pas définie dans config.json");
        } catch (error) {
            window.open('https://github.com/ton-pseudo/ccinp-trainer-pro/releases', '_blank');
        }
        setIsSettingsOpen(false);
    };

    const handleCheckForUpdates = () => {
        if (window.api && window.api.updater) {
            window.api.updater.check();
        } else {
            alert("Les mises à jour automatiques ne sont pas disponibles dans cette version.");
        }
        setIsSettingsOpen(false);
    };

    const SCORE_COLORS: Record<number, { bg: string, text: string, border: string, active: string }> = {
        1: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", active: "bg-red-500 text-white border-red-600" },
        2: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", active: "bg-orange-500 text-white border-orange-600" },
        3: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", active: "bg-amber-500 text-white border-amber-600" },
        4: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200", active: "bg-yellow-500 text-white border-yellow-600" },
        5: { bg: "bg-lime-50", text: "text-lime-600", border: "border-lime-200", active: "bg-lime-500 text-white border-lime-600" },
        6: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", active: "bg-emerald-500 text-white border-emerald-600" },
        7: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", active: "bg-slate-900 text-white border-slate-950" }
    };

    return (
        <div className="relative h-full flex flex-col items-center p-6 text-slate-800 overflow-y-auto">
            <AnimatedBackground />

            {/* NOUVEAU : Affichage de la version en bas à droite */}
            <div className="absolute bottom-4 right-6 z-20 opacity-40 hover:opacity-100 transition-opacity select-none cursor-default">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Version {appVersion}</p>
            </div>

            <div className="relative z-30 mt-6 flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center transform -rotate-6">
                    <BrainCircuit size={36} />
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic text-center">
                    CCINP <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Entrainement</span>
                </h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Préparation Banque Orale</p>
            </div>

            <div className="absolute top-6 left-6 z-20">
                <button onClick={onChangeProfile} className="flex items-center gap-3 bg-white/70 backdrop-blur-xl border border-white px-3 py-2 pr-6 rounded-2xl shadow-lg hover:bg-white transition group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-inner">
                        {activeProfile.isIncognito ? <Ghost size={20}/> : activeProfile.name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Profil</span>
                        <span className="font-bold text-sm text-slate-800 leading-none">{activeProfile.name}</span>
                    </div>
                </button>
            </div>

            <div className="absolute top-6 right-6 z-20">
                <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white/70 backdrop-blur-xl border border-white rounded-2xl shadow-lg hover:bg-white text-slate-600 hover:text-indigo-600 transition-all hover:rotate-90">
                    <Settings size={24} />
                </button>
            </div>

            <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 mb-8">

                <div className="flex flex-col gap-6">
                    <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border border-white relative overflow-hidden">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Progression Globale</h2>
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-6xl font-black text-slate-900 tracking-tighter">{uniqueSeenIds}</p>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">sur 112 exercices</p>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                <span className="text-xl font-black text-indigo-600">{progressPercent}%</span>
                            </div>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        {weakExercisesCount > 0 && (
                            <div className="flex items-center gap-3 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl animate-pulse">
                                <Target size={16} /> {weakExercisesCount} exercice(s) raté(s) détecté(s)
                            </div>
                        )}
                        {activeProfile.isIncognito && (
                            <div className="mt-4 bg-slate-800 text-slate-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 border border-slate-700">
                                <Ghost size={16} className="text-indigo-400 shrink-0" /> Mode Invité : Progression non sauvegardée.
                            </div>
                        )}
                    </div>

                    {deadline && daysRemaining > 0 && !activeProfile.isIncognito && (
                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border border-white relative overflow-hidden flex-1">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Flag size={18} className="text-indigo-500" /> Objectif Quotidien (≥ 6/7)
                            </h2>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-5xl font-black text-slate-900 tracking-tighter">{masteredTodayCount} <span className="text-xl text-slate-300 font-medium">/ {dailyGoal}</span></p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Exos maîtrisés aujourd'hui</p>
                                </div>
                                <div className="text-right pb-1">
                                    <p className="text-3xl font-black text-indigo-600">{daysRemaining}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jours restants</p>
                                </div>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2 shadow-inner">
                                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000" style={{ width: `${Math.min(100, (masteredTodayCount / (dailyGoal || 1)) * 100)}%` }}></div>
                            </div>
                            {masteredTodayCount >= dailyGoal ? (
                                <p className="text-xs font-bold text-emerald-600 mt-4 text-center bg-emerald-50 py-2 rounded-xl border border-emerald-100">Objectif du jour atteint ! 🎉</p>
                            ) : (
                                <p className="text-[10px] text-slate-500 font-bold text-center mt-4">Encore {dailyGoal - masteredTodayCount} exercice{dailyGoal - masteredTodayCount > 1 ? 's' : ''} à maîtriser aujourd'hui.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">

                    <button onClick={() => startSession('smart')} className="w-full flex items-center justify-between p-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] transition-all shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1 group border border-slate-700">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><BrainCircuit size={28} className="text-indigo-400" /></div>
                            <div className="text-left">
                                <p className="font-black text-xl tracking-tight">Tirage Intelligent</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Focus exos jamais vus</p>
                            </div>
                        </div>
                        <ChevronRight className="text-slate-500 group-hover:text-white transition-colors" size={28} />
                    </button>

                    <button onClick={() => startSession('simulation')} className="w-full flex items-center justify-between p-6 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[2rem] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 group border border-blue-400">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><GraduationCap size={28} /></div>
                            <div className="text-left">
                                <p className="font-black text-xl tracking-tight">Oral Blanc</p>
                                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mt-1">2 exos • Chrono 25min</p>
                            </div>
                        </div>
                        <Play size={24} className="text-blue-200 group-hover:text-white transition-colors fill-current" />
                    </button>

                    <button onClick={() => { setIsOtherModesOpen(true); setShowBlitzOptions(false); }} className="w-full flex items-center justify-between p-5 bg-white/80 backdrop-blur-md hover:bg-white text-slate-800 rounded-[2rem] transition-all shadow-lg hover:shadow-xl border border-white hover:-translate-y-1 group">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Layers size={24} className="text-indigo-500" /></div>
                            <div className="text-left">
                                <p className="font-black text-lg tracking-tight">Autres modes</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Blitz, Anki, Survie, Personnalisé...</p>
                            </div>
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={24} />
                    </button>

                    <button onClick={goToDashboard} disabled={activeProfile.isIncognito} className="w-full mt-2 flex items-center justify-center gap-3 py-5 bg-indigo-50/80 backdrop-blur-md hover:bg-indigo-100 text-indigo-700 font-bold rounded-[2rem] transition-all shadow-lg border border-indigo-100 hover:-translate-y-1 disabled:opacity-50">
                        <BarChart3 size={20} /> Accéder au Tableau de Bord
                    </button>
                </div>
            </div>

            <Modal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} title="Mode Personnalisé">
                <div className="space-y-8">
                    <div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">1. Matières ciblées</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {['Analyse', 'Algebre', 'Probabilites'].map(t => (
                                <button key={t} onClick={() => toggleCustomType(t)} className={`py-4 px-2 rounded-2xl text-xs font-bold transition-all border shadow-sm ${customTypes.includes(t) ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 opacity-60'}`}>
                                    {t === 'Probabilites' ? 'Probas' : t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">2. Statut des exercices</h3>
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
                            <button onClick={() => setCustomStatus('all')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${customStatus === 'all' ? 'bg-white text-indigo-700 shadow border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Toute la banque</button>
                            <button onClick={() => setCustomStatus('unseen')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${customStatus === 'unseen' ? 'bg-white text-indigo-700 shadow border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Non vus</button>
                            <button onClick={() => setCustomStatus('seen')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${customStatus === 'seen' ? 'bg-white text-indigo-700 shadow border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Déjà vus</button>
                        </div>
                    </div>

                    {customStatus !== 'unseen' && (
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-end">
                                <span>3. Filtrer par notes précédentes</span>
                                <span className="text-[9px] font-bold text-slate-400 lowercase">Sélection multiple</span>
                            </h3>
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                {[1, 2, 3, 4, 5, 6, 7].map(score => {
                                    const isActive = customScores.includes(score);
                                    const c = SCORE_COLORS[score];
                                    return (
                                        <button
                                            key={score}
                                            onClick={() => toggleCustomScore(score)}
                                            className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center transition-all border ${isActive ? `${c.active} shadow-md scale-110` : `${c.bg} ${c.text} ${c.border} opacity-40 hover:opacity-100`}`}
                                        >
                                            {score}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <button onClick={handleStartCustomSession} className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-lg shadow-xl transition-all hover:-translate-y-1 mt-4">
                        Lancer l'entraînement ciblé
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isOtherModesOpen} onClose={() => setIsOtherModesOpen(false)} title="Sélection du mode">
                <div className="space-y-3">

                    <button onClick={() => startSession('anki')} className="w-full p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl flex flex-col gap-3 transition-all group text-left">
                        <div className="flex items-center gap-4 w-full">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"><Brain size={20} /></div>
                            <div className="flex-1">
                                <p className="font-black text-slate-800">Mode Anki (Révisions)</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Algorithme d'oubli espacé</p>
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-indigo-100 text-xs text-slate-600 font-medium flex gap-2 items-start shadow-sm w-full mt-1">
                            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                            <p>Priorise automatiquement les exercices ayant reçu <strong className="text-indigo-700">une mauvaise note</strong> ou qui n'ont <strong className="text-indigo-700">pas été revus depuis longtemps</strong>.</p>
                        </div>
                    </button>

                    {!showBlitzOptions ? (
                        <button onClick={() => setShowBlitzOptions(true)} className="w-full p-4 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-2xl flex items-center gap-4 transition-all group text-left">
                            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Timer size={20} /></div>
                            <div>
                                <p className="font-black text-slate-800">Mode Blitz</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Recherche sous pression</p>
                            </div>
                        </button>
                    ) : (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                            <p className="text-xs font-black text-orange-800 mb-3 uppercase tracking-widest text-center">Durée par exercice :</p>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => startSession('blitz', 5)} className="py-3 bg-white hover:bg-orange-500 hover:text-white text-orange-700 font-black rounded-xl border border-orange-200 transition-all shadow-sm">5 min</button>
                                <button onClick={() => startSession('blitz', 8)} className="py-3 bg-white hover:bg-orange-500 hover:text-white text-orange-700 font-black rounded-xl border border-orange-200 transition-all shadow-sm">8 min</button>
                                <button onClick={() => startSession('blitz', 10)} className="py-3 bg-white hover:bg-orange-500 hover:text-white text-orange-700 font-black rounded-xl border border-orange-200 transition-all shadow-sm">10 min</button>
                            </div>
                        </div>
                    )}

                    <button onClick={() => startSession('weakness')} className="w-full p-4 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-2xl flex items-center gap-4 transition-all group text-left">
                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Target size={20} /></div>
                        <div>
                            <p className="font-black text-slate-800">Mode Survie</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Refaire ses pires notes (≤ 3)</p>
                        </div>
                    </button>

                    <button onClick={() => startSession('random')} className="w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-4 transition-all group text-left">
                        <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Shuffle size={20} /></div>
                        <div>
                            <p className="font-black text-slate-800">Aléatoire Total</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Toute la banque (∞)</p>
                        </div>
                    </button>

                    <div className="h-px bg-slate-200 my-2"></div>

                    <button onClick={() => { setIsOtherModesOpen(false); setIsCustomModalOpen(true); }} className="w-full p-4 bg-slate-100 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 rounded-2xl flex items-center gap-4 transition-all group text-left">
                        <div className="w-10 h-10 bg-white text-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><SlidersHorizontal size={20} className="group-hover:text-indigo-600" /></div>
                        <div>
                            <p className="font-black text-slate-800">Mode Personnalisé</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Filtres : Matières, Notes, Statut</p>
                        </div>
                    </button>

                </div>
            </Modal>

            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Paramètres">
                <div className="space-y-4">

                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-2">
                        <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3">Gestion de la Banque PDF</h3>
                        <div className="space-y-2">
                            <button onClick={handleOpenBankPage} className="w-full flex items-center justify-between p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-bold shadow-md">
                                <span className="flex items-center gap-3"><ExternalLink size={18} /> Télécharger la banque</span>
                                <span className="text-[10px] bg-blue-800/50 px-2 py-1 rounded">Ouvrir le lien</span>
                            </button>
                            <button onClick={handleUpdateBankLocal} disabled={isImporting} className="w-full flex items-center gap-3 p-3 text-left bg-white hover:bg-slate-50 rounded-xl transition-colors font-bold text-slate-700 border border-slate-200 shadow-sm">
                                {isImporting ? <Loader2 size={18} className="animate-spin"/> : <FolderDown size={18}/>}
                                Importer un dossier PDF local
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <Gamepad2 size={20} className="text-indigo-500"/>
                            <div className="text-left">
                                <p className="text-sm font-bold text-slate-800">Discord Rich Presence</p>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight">Afficher votre statut</p>
                            </div>
                        </div>
                        <button onClick={toggleDiscord} className={`w-12 h-6 rounded-full transition-colors relative ${discordEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${discordEnabled ? 'left-7' : 'left-1'}`}/>
                        </button>
                    </div>

                    {!activeProfile.isIncognito && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <label className="flex items-center gap-3 text-sm font-bold text-slate-800 mb-3">
                                <CalendarDays size={20} className="text-indigo-500"/> Objectif : Date de l'oral
                            </label>
                            <input
                                type="date"
                                value={deadline}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                            />
                        </div>
                    )}

                    <div className="h-px bg-slate-200 my-4"></div>

                    {/* NOUVEAU BOUTON : Vérifier les mises à jour manuellement */}
                    <button onClick={handleCheckForUpdates} className="w-full flex items-center gap-4 p-4 text-left bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors font-bold text-slate-700 border border-slate-200">
                        <RefreshCw size={20} className="text-blue-500"/> Rechercher une mise à jour
                    </button>

                    <button onClick={onChangeProfile} className="w-full flex items-center gap-4 p-4 text-left bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors font-bold text-slate-700 border border-slate-200">
                        <Users size={20} className="text-indigo-500"/> Changer de profil
                    </button>

                    <button onClick={() => { if (window.confirm("Tout effacer ?")) { onDeleteData(); setIsSettingsOpen(false); } }} className="w-full flex items-center gap-4 p-4 text-left bg-red-50 hover:bg-red-100 rounded-2xl transition-colors font-bold text-red-600 border border-red-200">
                        <Trash2 size={20}/> Réinitialiser mes statistiques
                    </button>
                </div>
            </Modal>
        </div>
    );
};