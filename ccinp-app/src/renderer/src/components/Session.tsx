import React, {useEffect, useState} from "react";
import {CheckCircle2, Clock, Pause, Play as PlayIcon, Save, Sparkles, Trophy, ChevronUp, X} from "lucide-react";
import {Exercise, SessionMode, UserNote} from "../types";
import {AnimatedBackground} from "./SharedUI";
import {PdfViewer} from "./PdfViewer";

interface SessionProps {
    queue: Exercise[];
    notesData: Record<number, UserNote>;
    sessionMode: SessionMode;
    sessionDuration: number;
    endSession: () => void;
    onRate: (id: number, t: string, s: number, time: number) => Promise<void>;
    onSaveNote: (n: UserNote) => Promise<void>;
}

export const Session: React.FC<SessionProps> = ({ queue, notesData, sessionMode, sessionDuration, endSession, onRate, onSaveNote }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const isCountdown = sessionDuration > 0;
    const [seconds, setSeconds] = useState(isCountdown ? sessionDuration : 0);
    const [isPaused, setIsPaused] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [showMobilePanel, setShowMobilePanel] = useState(false);

    const [sessionStartTs] = useState(Date.now());
    const [countdownEndTs] = useState(isCountdown ? Date.now() + sessionDuration * 1000 : 0);

    const currentEx = queue[currentIndex];
    const pdfUrl = currentEx ? `local://${currentEx.type}/exercice_${currentEx.id}.pdf` : '';

    useEffect(() => {
        if (!currentEx || !window.api || !window.api.updateDiscord) return;
        const modeNames: Record<string, string> = {
            'smart': 'Tirage Intelligent 🧠',
            'random': 'Aléatoire Total 🔀',
            'weakness': 'Mode Survie 🎯',
            'simulation': 'Oral Blanc 🎓',
            'blitz': 'Mode Blitz ⏱️',
            'anki': 'Répétition Espacée 🧠',
            'custom': 'Entraînement Libre ⚙️'
        };

        const payload: any = {
            details: `${modeNames[sessionMode] || 'Entraînement'}`,
            state: `Exo ${currentIndex + 1}/${queue.length} : #${currentEx.id} (${currentEx.type})`
        };
        if (isCountdown) payload.endTimestamp = countdownEndTs;
        else payload.startTimestamp = sessionStartTs;
        window.api.updateDiscord(payload);
    }, [currentEx, currentIndex, sessionMode, isCountdown, countdownEndTs]);

    useEffect(() => {
        if (!currentEx) return;
        if (!isCountdown || sessionMode === 'blitz') setSeconds(isCountdown ? sessionDuration : 0);
        setIsPaused(false);
        setNoteText(notesData[currentEx.id]?.hint || '');
        setShowMobilePanel(false);
    }, [currentIndex, currentEx, isCountdown, sessionDuration, sessionMode]);

    useEffect(() => {
        if (!currentEx) return;
        setIsPaused(false);
        setNoteText(notesData[currentEx.id]?.hint || '');
        setShowMobilePanel(false);
    }, [currentIndex, currentEx, notesData]);

    const handleSaveNote = async () => {
        if (!currentEx) return;
        setIsSavingNote(true);
        await onSaveNote({ id: currentEx.id, hint: noteText, tags: [] });
        setTimeout(() => setIsSavingNote(false), 2000);
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (currentEx && noteText !== (notesData[currentEx.id]?.hint || '')) handleSaveNote();
        }, 1500);
        return () => clearTimeout(timeoutId);
    }, [noteText, currentEx, notesData]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (!isPaused && !isFinished) {
            interval = setInterval(() => setSeconds(s => isCountdown ? Math.max(0, s - 1) : s + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isPaused, isFinished, isCountdown]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished || showMobilePanel) return;
            const targetTag = (e.target as HTMLElement)?.tagName;
            if (targetTag === 'TEXTAREA' || targetTag === 'INPUT') return;
            if (e.code === 'Space') { e.preventDefault(); setIsPaused(p => !p); }
            if (!isPaused && e.key >= '1' && e.key <= '7') handleRateClick(parseInt(e.key));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPaused, currentIndex, isFinished, showMobilePanel]);

    const formatTime = (ts: number) => `${Math.floor(ts / 60).toString().padStart(2, '0')}:${(ts % 60).toString().padStart(2, '0')}`;

    const handleRateClick = async (score: number) => {
        if (!currentEx) return;
        const timeSpent = isCountdown ? sessionDuration - seconds : seconds;
        await onRate(currentEx.id, currentEx.type, score, timeSpent);
        if (currentIndex + 1 < queue.length) setCurrentIndex(curr => curr + 1);
        else setIsFinished(true);
    };

    if (isFinished || !currentEx) {
        return (
            <div className="h-full bg-slate-50 flex items-center justify-center p-4">
                <AnimatedBackground />
                <div className="relative z-10 bg-white/90 backdrop-blur-2xl p-8 md:p-12 rounded-3xl shadow-2xl border border-white text-center max-w-lg w-full">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6"><Trophy className="w-8 h-8 md:w-12 md:h-12"/></div>
                    <h1 className="text-2xl md:text-4xl font-black mb-3 md:mb-4">Session Terminée !</h1>
                    <button onClick={endSession} className="w-full py-3 md:py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl transition-all hover:-translate-y-1">
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    const isTimeCritical = isCountdown && seconds < (sessionDuration * 0.2) && seconds > 0;

    const handleSkipExercise = () => {
        if (!currentEx) return;

        if (currentIndex + 1 < queue.length) {
            setCurrentIndex(curr => curr + 1);
        } else {
            setIsFinished(true);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-2 md:py-3 flex justify-between items-center shadow-sm z-20 shrink-0">
                <div className="flex items-center gap-3 md:gap-6">
                    <div className="hidden sm:block text-white px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest bg-slate-900 shadow-inner">
                        ENTRAÎNEMENT • EXO {currentIndex + 1} / {queue.length}
                    </div>
                    <div>
                        <h1 className="text-base md:text-xl font-black text-slate-800 uppercase leading-none italic">Exercice {currentEx.id}</h1>
                        <p className="text-[10px] md:text-xs font-bold text-indigo-600 mt-1">{currentEx.type}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className={`flex items-center space-x-1.5 md:space-x-3 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl font-mono text-sm md:text-xl font-bold border ${isPaused ? 'bg-amber-50 text-amber-700 border-amber-200' : isTimeCritical ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        <Clock className={`w-4 h-4 md:w-5 md:h-5 ${isPaused ? 'text-amber-500' : isTimeCritical ? 'text-red-500' : 'text-slate-400'}`} />
                        <span>{formatTime(seconds)}</span>
                    </div>
                    <button onClick={() => setIsPaused(!isPaused)} className={`p-2 md:p-3 rounded-xl border transition-all ${isPaused ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        {isPaused ? <PlayIcon className="w-5 h-5" fill="currentColor" /> : <Pause className="w-5 h-5" fill="currentColor" />}
                    </button>
                    <div className="hidden sm:block h-8 w-px bg-slate-300 mx-1"></div>

                    <button
                        onClick={handleSkipExercise}
                        className="px-3 py-2 md:px-5 md:py-3 text-amber-600 hover:text-white hover:bg-amber-500 font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-xl transition-colors bg-white border border-amber-200 mr-2"
                    >
                        Passer
                    </button>

                    <button onClick={() => { if(window.confirm("Quitter la session ?")) endSession() }} className="px-3 py-2 md:px-5 md:py-3 text-slate-500 hover:text-white hover:bg-red-500 font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-xl transition-colors bg-white border border-slate-200 hover:border-red-500">
                        Terminer
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 bg-white">


                {isPaused && (
                    <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-in fade-in p-4">
                        <div className="bg-slate-900 p-8 md:p-16 rounded-3xl md:rounded-[3rem] shadow-2xl flex flex-col items-center border border-slate-700 w-full max-w-md">
                            <Pause className="w-16 h-16 md:w-20 md:h-20 mb-6 md:mb-8 text-indigo-400" />
                            <h2 className="text-2xl md:text-4xl font-black mb-4 tracking-tight">Pause</h2>
                            <button onClick={() => setIsPaused(false)} className="px-6 py-3 md:px-10 md:py-5 mt-4 md:mt-8 bg-white text-slate-900 hover:bg-indigo-50 rounded-xl md:rounded-2xl font-black text-sm md:text-lg flex items-center gap-2 md:gap-4 transition-transform hover:scale-105 shadow-xl">
                                <PlayIcon className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" /> REPRENDRE <span className="hidden sm:inline text-slate-400 text-xs md:text-sm ml-1 md:ml-2 font-bold">[Espace]</span>
                            </button>
                        </div>
                    </div>
                )}

                <PdfViewer url={pdfUrl} />

                {showMobilePanel && (
                    <div className="lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowMobilePanel(false)}></div>
                )}

                <div className={`lg:hidden absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none transition-transform duration-300 ${showMobilePanel ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
                    <button onClick={() => setShowMobilePanel(true)} className="pointer-events-auto bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl font-black text-sm flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-emerald-400" /> ÉVALUER L'EXO <ChevronUp size={20} className="ml-2 opacity-50"/>
                    </button>
                </div>

                <div className={`
                    fixed lg:relative inset-x-0 bottom-0 top-24 lg:top-auto z-40 lg:z-10
                    w-full lg:w-[380px] bg-slate-50 border-t border-slate-200 lg:border-t-0 lg:border-l
                    flex flex-col shrink-0 lg:h-full overflow-y-auto custom-scrollbar
                    transition-transform duration-300 ease-in-out
                    ${showMobilePanel ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
                `}>
                    <div className="lg:hidden sticky top-0 flex justify-between items-center p-5 bg-white/90 backdrop-blur-md border-b border-slate-200 shrink-0 z-10 rounded-t-[2rem]">
                        <span className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2"><Trophy size={16} className="text-indigo-500"/> Fin de l'exercice</span>
                        <button onClick={() => setShowMobilePanel(false)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full"><X size={16}/></button>
                    </div>

                    <div className="p-4 md:p-6 flex-1 flex flex-col border-b border-slate-200 min-h-[150px] shrink-0 bg-white">
                        <div className="flex items-center gap-2 md:gap-3 mb-3 shrink-0">
                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Sparkles size={16}/></div>
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Mes Astuces</h3>
                        </div>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onBlur={handleSaveNote}
                            placeholder="Remarques ou erreurs à ne pas refaire..."
                            className="flex-1 w-full p-3 md:p-4 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none outline-none transition-all font-medium min-h-[60px]"
                        />
                        <button onClick={handleSaveNote} disabled={isSavingNote} className={`mt-3 w-full py-2.5 shrink-0 ${isSavingNote ? 'bg-emerald-600' : 'bg-slate-900'} text-white rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-2 shadow-sm`}>
                            {isSavingNote ? <CheckCircle2 size={16}/> : <Save size={16}/>} {isSavingNote ? 'Sauvegardé !' : 'Enregistrer la note'}
                        </button>
                    </div>

                    <div className="p-4 md:p-6 pb-8 shrink-0">
                        <div className="flex justify-between items-end mb-3">
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Évaluation</h3>
                            <span className="hidden sm:block text-[9px] font-black text-slate-400 bg-slate-200 px-2 py-1 rounded">Clavier 1-7</span>
                        </div>
                        <div className="flex flex-col gap-1.5 md:gap-2">
                            {[
                                { s: 1, l: "Rien su faire", c: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
                                { s: 2, l: "Très difficile", c: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
                                { s: 3, l: "Besoin d'aide", c: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
                                { s: 4, l: "Moyen", c: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100" },
                                { s: 5, l: "Assez bien", c: "bg-lime-50 text-lime-700 border-lime-200 hover:bg-lime-100" },
                                { s: 6, l: "Réussi", c: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
                                { s: 7, l: "Parfait", c: "bg-slate-900 text-white border-slate-800 hover:bg-slate-800" }
                            ].map(b => (
                                <button key={b.s} onClick={() => handleRateClick(b.s)} className={`w-full text-left px-3 py-2 md:px-4 md:py-2.5 rounded-xl border text-sm font-bold flex items-center gap-3 transition-transform hover:scale-[1.02] ${b.c}`}>
                                    <span className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center font-black text-xs shadow-sm">{b.s}</span>{b.l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};