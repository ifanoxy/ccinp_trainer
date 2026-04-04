import React, {useEffect, useState} from "react";
import {CheckCircle2, Clock, FileText, Pause, Play as PlayIcon, Save, Sparkles, Trophy} from "lucide-react";
import {Exercise, SessionMode, UserNote} from "../types";
import {AnimatedBackground} from "./SharedUI";

interface SessionProps {
    queue: Exercise[];
    notesData: Record<number, UserNote>;
    sessionMode: SessionMode;
    endSession: () => void;
    onRate: (id: number, t: string, s: number, time: number) => Promise<void>;
    onSaveNote: (n: UserNote) => Promise<void>;
}

export const Session: React.FC<SessionProps> = ({ queue, notesData, sessionMode, endSession, onRate, onSaveNote }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const isSimulation = sessionMode === 'simulation';

    const [seconds, setSeconds] = useState(isSimulation ? 1500 : 0);
    const [isPaused, setIsPaused] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [sessionStartTs] = useState(Date.now());
    const [oralBlancEndTs] = useState(Date.now() + 25 * 60 * 1000);

    const currentEx = queue[currentIndex];
    const pdfUrl = currentEx ? `local://${currentEx.type}/exercice_${currentEx.id}.pdf#toolbar=0&navpanes=0&scrollbar=1&view=FitH` : '';

    useEffect(() => {
        if (!currentEx || !window.api || !window.api.updateDiscord) return;

        const modeNames = {
            'smart': 'Tirage Intelligent 🧠',
            'random': 'Aléatoire Total 🔀',
            'weakness': 'Mode Survie 🎯',
            'simulation': 'Oral Blanc 🎓'
        };

        const payload: any = {
            details: `${modeNames[sessionMode]}`,
            state: `Exo ${currentIndex + 1}/${queue.length} : #${currentEx.id} (${currentEx.type})`
        };

        if (sessionMode === 'simulation') {
            payload.endTimestamp = oralBlancEndTs;
        } else {
            payload.startTimestamp = sessionStartTs;
        }

        window.api.updateDiscord(payload);
    }, [currentEx, currentIndex, sessionMode]);

    useEffect(() => {
        if (!currentEx) return;
        if (!isSimulation) setSeconds(0);
        setIsPaused(false);
        setNoteText(notesData[currentEx.id]?.hint || '');
    }, [currentIndex, currentEx, isSimulation]);

    const handleSaveNote = async () => {
        if (!currentEx) return;
        setIsSavingNote(true);
        await onSaveNote({ id: currentEx.id, hint: noteText, tags: [] });
        setTimeout(() => setIsSavingNote(false), 2000);
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (currentEx && noteText !== (notesData[currentEx.id]?.hint || '')) {
                handleSaveNote();
            }
        }, 1500);
        return () => clearTimeout(timeoutId);
    }, [noteText, currentEx, notesData]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (!isPaused && !isFinished) {
            interval = setInterval(() => {
                setSeconds(s => isSimulation ? Math.max(0, s - 1) : s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPaused, isFinished, isSimulation]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished) return;
            const targetTag = (e.target as HTMLElement)?.tagName;
            if (targetTag === 'TEXTAREA' || targetTag === 'INPUT') return;

            if (e.code === 'Space') { e.preventDefault(); setIsPaused(p => !p); }
            if (!isPaused && e.key >= '1' && e.key <= '7') handleRateClick(parseInt(e.key));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPaused, currentIndex, isFinished]);

    const formatTime = (ts: number) => `${Math.floor(ts / 60).toString().padStart(2, '0')}:${(ts % 60).toString().padStart(2, '0')}`;

    const handleRateClick = async (score: number) => {
        if (!currentEx) return;
        const timeSpent = isSimulation ? 1500 - seconds : seconds;
        await onRate(currentEx.id, currentEx.type, score, timeSpent);

        if (currentIndex + 1 < queue.length) {
            setCurrentIndex(curr => curr + 1);
        } else {
            setIsFinished(true);
        }
    };

    if (isFinished || !currentEx) {
        return (
            <div className="h-full bg-slate-50 flex items-center justify-center">
                <AnimatedBackground />
                <div className="relative z-10 bg-white/90 backdrop-blur-2xl p-12 rounded-[3rem] shadow-2xl border border-white text-center max-w-lg">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trophy size={48}/></div>
                    <h1 className="text-4xl font-black mb-4">Session Terminée !</h1>
                    <p className="text-slate-500 mb-10 font-medium">Excellent travail. Tes statistiques ont été sauvegardées avec succès.</p>
                    <button onClick={endSession} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl transition-all hover:-translate-y-1">
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    const isTimeCritical = isSimulation && seconds < 300 && seconds > 0;

    return (
        <div className="h-full flex flex-col bg-slate-200/50 overflow-hidden font-sans">
            <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/50 px-8 py-3 flex justify-between items-center shadow-sm z-20">
                <div className="flex items-center gap-6">
                    <div className={`text-white px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-inner ${isSimulation ? 'bg-blue-600' : 'bg-slate-900'}`}>
                        {isSimulation ? "ORAL BLANC" : "ENTRAÎNEMENT"} • EXO {currentIndex + 1} / {queue.length}
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none italic">Exercice {currentEx.id}</h1>
                        <p className="text-xs font-bold text-indigo-600 mt-1">{currentEx.type}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center space-x-3 px-5 py-2.5 rounded-2xl font-mono text-xl font-bold shadow-inner transition-colors border ${
                        isPaused ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            isTimeCritical ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                        <Clock size={20} className={isPaused ? 'text-amber-500' : isTimeCritical ? 'text-red-500' : 'text-slate-400'} />
                        <span>{formatTime(seconds)}</span>
                    </div>
                    <button onClick={() => setIsPaused(!isPaused)} className={`p-3 rounded-2xl border transition-all ${isPaused ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`} title="Pause [Espace]">
                        {isPaused ? <PlayIcon size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                    </button>
                    <div className="h-10 w-px bg-slate-300 mx-2"></div>
                    <button onClick={() => { if(window.confirm("Quitter la session en cours ?")) endSession() }} className="px-5 py-3 text-slate-500 hover:text-white hover:bg-red-500 font-bold text-xs uppercase tracking-widest rounded-2xl transition-colors shadow-sm bg-white border border-slate-200 hover:border-red-500">
                        Terminer
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {isPaused && (
                    <div className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-in fade-in">
                        <div className="bg-slate-900 p-16 rounded-[3rem] shadow-2xl flex flex-col items-center border border-slate-700">
                            <Pause size={80} className="mb-8 text-indigo-400" />
                            <h2 className="text-4xl font-black mb-4 tracking-tight">Pause</h2>
                            <button onClick={() => setIsPaused(false)} className="px-10 py-5 mt-8 bg-white text-slate-900 hover:bg-indigo-50 rounded-2xl font-black text-lg flex items-center gap-4 transition-transform hover:scale-105 shadow-xl">
                                <PlayIcon size={24} fill="currentColor" /> REPRENDRE <span className="text-slate-400 text-sm ml-2 font-bold">[Espace]</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 p-6 flex flex-col">
                    <div className="flex-1 w-full max-w-6xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden relative">
                        <embed src={pdfUrl} type="application/pdf" className="w-full h-full" style={{filter: 'contrast(1.05)'}} />
                        {!window.api && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400"><FileText size={64} className="mb-4 opacity-20"/><p className="font-bold text-lg">Aperçu indisponible dans le navigateur</p></div>}
                    </div>
                </div>

                <div className="w-[380px] bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl flex flex-col z-10 relative">
                    <div className="p-6 flex-1 flex flex-col border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Sparkles size={16}/></div>
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Mes Astuces</h3>
                        </div>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onBlur={handleSaveNote}
                            placeholder="Écris tes remarques, erreurs à ne pas refaire ou indications..."
                            className="flex-1 w-full p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none outline-none shadow-inner transition-all font-medium text-slate-700"
                        />
                        <button
                            onClick={handleSaveNote}
                            disabled={isSavingNote}
                            className={`mt-3 w-full py-2 ${isSavingNote ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2`}
                        >
                            {isSavingNote ? <CheckCircle2 size={14}/> : <Save size={14}/>}
                            {isSavingNote ? 'Sauvegardé !' : 'Enregistrer la note'}
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Évaluation</h3>
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">Clavier 1-7</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {[
                                { s: 1, l: "Rien su faire", c: "bg-red-50 text-red-700 border-red-200 hover:bg-red-600 hover:text-white" },
                                { s: 2, l: "Très difficile", c: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-500 hover:text-white" },
                                { s: 3, l: "Besoin d'aide", c: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-500 hover:text-white" },
                                { s: 4, l: "Moyen", c: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-500 hover:text-white" },
                                { s: 5, l: "Assez bien", c: "bg-lime-50 text-lime-700 border-lime-200 hover:bg-lime-500 hover:text-white" },
                                { s: 6, l: "Réussi", c: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-500 hover:text-white" },
                                { s: 7, l: "Parfait", c: "bg-slate-900 text-white border-slate-800 hover:bg-black font-black shadow-lg hover:-translate-y-1" }
                            ].map(b => (
                                <button key={b.s} onClick={() => handleRateClick(b.s)} className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center justify-between transition-all duration-200 ${b.c}`}>
                                    <span className="flex items-center gap-4"><span className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center font-black text-xs shadow-sm">{b.s}</span><span>{b.l}</span></span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};