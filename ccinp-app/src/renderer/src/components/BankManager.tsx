import React, { useState, useMemo, useRef, useEffect } from "react";
import {
    ArrowLeft, Save, Upload, CheckSquare, Square, Database, Eye, X, Loader2,
    FileText, CheckCircle2, Clock, Play, Trash2, Archive, AlertTriangle, DownloadCloud, Download
} from "lucide-react";
import { Exercise } from "../types";
import { AnimatedBackground, Modal } from "./SharedUI";
import { PdfViewer } from "./PdfViewer";

interface Bank {
    id: string;
    name: string;
    catalog: Exercise[];
}

interface BankManagerProps {
    banks: Bank[];
    activeBankId: string;
    activeExos: number[];
    onChangeBank: (bankId: string) => void;
    onCreateBank: (name: string, catalog: Exercise[]) => void;
    onDeleteBank: (bankId: string) => void;
    onSave: (activeExos: number[]) => void;
    onCancel: () => void;
}

export const BankManager: React.FC<BankManagerProps> = ({ banks, activeBankId, activeExos, onChangeBank, onCreateBank, onDeleteBank, onSave, onCancel }) => {
    const currentBank = banks.find(b => b.id === activeBankId);

    const [localCatalog, setLocalCatalog] = useState<Exercise[]>(currentBank?.catalog || []);
    const [localActive, setLocalActive] = useState<Set<number>>(new Set(activeExos));
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [newBankModalOpen, setNewBankModalOpen] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [tempCatalog, setTempCatalog] = useState<Exercise[]>([]);

    const [isZipModalOpen, setIsZipModalOpen] = useState(false);
    const [newZipBankName, setNewZipBankName] = useState('');
    const [isImportingZip, setIsImportingZip] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);
    const [isCheckingLatex, setIsCheckingLatex] = useState(true);
    const [hasLatex, setHasLatex] = useState<boolean>(false);

    const [hoveredExo, setHoveredExo] = useState<{id: number, type: string} | null>(null);
    const [selectedPdf, setSelectedPdf] = useState<{id: number, type: string} | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState({ current: 0, total: 0, startTime: 0 });
    const [generatedExos, setGeneratedExos] = useState<Exercise[]>([]);
    const [currentPreviewPdf, setCurrentPreviewPdf] = useState<{id: number, type: string} | null>(null);
    const [pendingBankData, setPendingBankData] = useState<{name: string, catalog: Exercise[]} | null>(null);
    const timer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setLocalCatalog(banks.find(b => b.id === activeBankId)?.catalog || []);
        setLocalActive(new Set(activeExos));
    }, [banks, activeBankId, activeExos]);

    const verifyLatex = async () => {
        setIsCheckingLatex(true);
        if (window.api && window.api.checkLatex) {
            const isInstalled = await window.api.checkLatex();
            setHasLatex(isInstalled);
        } else {
            setHasLatex(false);
        }
        setIsCheckingLatex(false);
    };

    useEffect(() => {
        verifyLatex();
    }, []);

    const groupedExos = useMemo(() => {
        const groups: Record<string, Exercise[]> = {};
        localCatalog.forEach(ex => {
            if (!groups[ex.type]) groups[ex.type] = [];
            groups[ex.type].push(ex);
        });
        return groups;
    }, [localCatalog]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const exerciseRegex = /\\section\*\{(?:EXERCICE|Exercice|exercice)\s+(\d+)(.*?)\}/gi;

            const newCatalog: Exercise[] = [];
            let match;

            const normalizeCategory = (cat: string) => {
                cat = cat.trim().toLowerCase();
                if (cat.includes('analys')) return 'Analyse';
                if (cat.includes('alg')) return 'Algebre';
                if (cat.includes('prob')) return 'Probabilites';
                return 'Autres';
            };

            while ((match = exerciseRegex.exec(text)) !== null) {
                const num = parseInt(match[1], 10);
                const rawCategory = match[2].replace(/[^a-zA-ZàâéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ]/g, ' ').trim();
                newCatalog.push({ id: num, type: normalizeCategory(rawCategory) });
            }

            if (newCatalog.length > 0) {
                setTempCatalog(newCatalog);
                setNewBankName("");
                setNewBankModalOpen(true);
            } else {
                alert("Aucun exercice trouvé. Vérifie le format du fichier .tex.");
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmNewBank = () => {
        setNewBankModalOpen(false);
        const name = newBankName.trim() || 'Nouvelle Banque';
        setPendingBankData({ name, catalog: tempCatalog });
        startGenerationSimulation(tempCatalog);
    };

    const handleZipImportClick = () => {
        setNewZipBankName("");
        setIsZipModalOpen(true);
    };

    const handleConfirmZipImport = async () => {
        setIsZipModalOpen(false);
        if (!window.api || !window.api.importBankZip) return alert("Fonctionnalité disponible uniquement dans l'application native.");

        setIsImportingZip(true);
        try {
            const res = await window.api.importBankZip();
            if (res.success && res.catalog) {
                alert("Dossier de PDF importé avec succès !");
                const name = newZipBankName.trim() || 'Banque Importée';
                onCreateBank(name, res.catalog);
            }
            else if (res.error) alert(`Erreur : ${res.error}`);
        } catch(e) {
            alert("Erreur inattendue.");
        }
        setIsImportingZip(false);
    };

    const handleExportBank = async () => {
        if (!currentBank) return;
        if (!window.api || !window.api.exportBank) return alert("Fonctionnalité disponible uniquement dans l'application native.");

        setIsExporting(true);
        try {
            const res = await window.api.exportBank(currentBank);
            if (res.success) alert("Banque exportée avec succès !");
            else if (res.error) alert(`Erreur : ${res.error}`);
        } catch(e) {
            alert("Erreur inattendue lors de l'exportation.");
        }
        setIsExporting(false);
    };

    const startGenerationSimulation = async (catalog: Exercise[]) => {
        setIsGenerating(true);
        setGenProgress({ current: 0, total: catalog.length, startTime: Date.now() });
        setGeneratedExos([]);
        setCurrentPreviewPdf(null);

        const generated: Exercise[] = [];

        for (let i = 0; i < catalog.length; i++) {
            const ex = catalog[i];
            await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
            generated.push(ex);
            setGeneratedExos([...generated]);
            setGenProgress(prev => ({ ...prev, current: i + 1 }));
            setCurrentPreviewPdf({ id: ex.id, type: ex.type });
        }
    };

    const handleFinishGeneration = () => {
        if (pendingBankData) {
            onCreateBank(pendingBankData.name, pendingBankData.catalog);
        }
        setIsGenerating(false);
        setPendingBankData(null);
    };

    const formatETA = () => {
        if (genProgress.current === 0) return "Calcul...";
        const elapsed = Date.now() - genProgress.startTime;
        const timePerItem = elapsed / genProgress.current;
        const remainingTime = (genProgress.total - genProgress.current) * timePerItem;
        const seconds = Math.ceil(remainingTime / 1000);
        if (seconds < 60) return `${seconds}s restantes`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s restantes`;
    };

    const toggleExo = (id: number) => {
        const next = new Set(localActive);
        if (next.has(id)) next.delete(id); else next.add(id);
        setLocalActive(next);
    };

    const toggleCategory = (type: string, forceState?: boolean) => {
        const next = new Set(localActive);
        const ids = groupedExos[type].map(e => e.id);
        const allActive = ids.every(id => next.has(id));
        const targetState = forceState !== undefined ? forceState : !allActive;
        ids.forEach(id => { if (targetState) next.add(id); else next.delete(id); });
        setLocalActive(next);
    };

    const toggleAll = (activate: boolean) => {
        if (activate) setLocalActive(new Set(localCatalog.map(e => e.id)));
        else setLocalActive(new Set());
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col font-sans overflow-hidden relative">
            <AnimatedBackground />

            <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center shadow-sm z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">Configuration des exercices</h1>
                        </div>
                    </div>
                </div>
                <button onClick={() => onSave(Array.from(localActive))} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-1">
                    <Save size={18} /> Sauvegarder
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 custom-scrollbar relative">
                <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-12">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Database size={18}/> Banque Actuelle
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleExportBank} disabled={isExporting} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-100 hover:border-indigo-600 disabled:opacity-50">
                                            {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12}/>} Télécharger
                                        </button>
                                        {activeBankId !== 'default' && (
                                            <button onClick={() => { if (window.confirm("Supprimer cette banque ? Action irréversible.")) onDeleteBank(activeBankId); }} className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-red-100 hover:border-red-500">
                                                <Trash2 size={12}/> Supprimer
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <select value={activeBankId} onChange={(e) => onChangeBank(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg md:text-xl rounded-xl px-4 py-3 outline-none cursor-pointer focus:ring-4 focus:ring-indigo-500/20">
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <p className="text-xs text-slate-400 font-bold mt-4">
                                {localActive.size} exercices actifs sur un total de {localCatalog.length}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl shadow-xl flex flex-col justify-between text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                                <Upload size={64} />
                            </div>
                            <div className="relative z-10 mb-4">
                                <h2 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-2">Mise à jour</h2>
                                <p className="text-lg md:text-xl font-black mb-1">Créer une nouvelle banque</p>
                                <p className="text-xs text-slate-300 font-medium">Deux méthodes pour actualiser tes exercices :</p>
                            </div>

                            <input type="file" accept=".tex" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

                            <div className="relative z-10 flex flex-col gap-2 mt-auto">
                                <button onClick={() => { if (hasLatex) fileInputRef.current?.click(); else setIsLatexModalOpen(true); }} disabled={isCheckingLatex} className={`w-full py-3 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${hasLatex ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                    {isCheckingLatex ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} Générer depuis un fichier .tex
                                </button>

                                {!hasLatex && !isCheckingLatex && (
                                    <button onClick={() => setIsLatexModalOpen(true)} className="text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center justify-center gap-1 mt-1 mb-2 transition-colors">
                                        <AlertTriangle size={12} /> Installation de LaTeX requise. (En savoir plus)
                                    </button>
                                )}

                                <button onClick={handleZipImportClick} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                    <Archive size={18} /> Importer un dossier .zip
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-200/50 p-2 rounded-2xl">
                        <div className="flex gap-2">
                            <button onClick={() => toggleAll(true)} className="cursor-pointer px-4 py-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm">
                                <CheckSquare size={16}/> Tout cocher
                            </button>
                            <button onClick={() => toggleAll(false)} className="cursor-pointer px-4 py-2 bg-white border border-slate-200 hover:border-red-500 hover:text-red-600 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm">
                                <Square size={16}/> Tout décocher
                            </button>
                        </div>
                        <p className="text-xs font-bold text-slate-500 px-2 italic">Seulement les exercices cochés apparaitront dans les entraînements.</p>
                    </div>

                    {Object.entries(groupedExos).map(([type, exos]) => {
                        const activeCount = exos.filter(e => localActive.has(e.id)).length;
                        const allActive = activeCount === exos.length;

                        return (
                            <div key={type} className="bg-white/90 backdrop-blur-xl p-5 md:p-8 rounded-3xl border border-white shadow-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">{type}</h3>
                                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{activeCount} / {exos.length} ACTIFS</p>
                                    </div>
                                    <button onClick={() => toggleCategory(type)} className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${allActive ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                                        {allActive ? <CheckSquare size={16}/> : <Square size={16}/>}
                                        {allActive ? 'Désactiver le chapitre' : 'Activer le chapitre'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 md:gap-3">
                                    {exos.map(ex => {
                                        const isActive = localActive.has(ex.id);
                                        return (
                                            <div key={ex.id} className="relative group"
                                                 onMouseEnter={() => { timer.current = setTimeout(() => setHoveredExo({ id: ex.id, type: ex.type }), 1000); }}
                                                 onMouseLeave={() => { setHoveredExo(null); if (timer.current) clearTimeout(timer.current); }}
                                            >
                                                <button onClick={() => toggleExo(ex.id)} className={`cursor-pointer w-full aspect-square rounded-lg md:rounded-xl font-black text-xs md:text-sm flex items-center justify-center transition-all border-b-2 ${isActive ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-700 shadow-md transform hover:-translate-y-1' : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border-slate-200'}`}>
                                                    {ex.id}
                                                </button>
                                                <div onClick={(e) => { e.stopPropagation(); setSelectedPdf({ id: ex.id, type: ex.type }); }} className={`absolute top-1 right-1 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer ${isActive ? 'hover:bg-white/30 text-white' : 'hover:bg-slate-300 text-slate-500'}`} title="Ouvrir le PDF">
                                                    <Eye size={14} />
                                                </div>

                                                {hoveredExo?.id === ex.id && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 md:w-[25vw] w-64 h-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
                                                        <div className="bg-slate-800 text-white text-[10px] font-black uppercase text-center py-1">Aperçu Ex. {ex.id}</div>
                                                        <embed src={`local://${ex.type}/exercice_${ex.id}.pdf#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} className="w-full h-full object-cover" />
                                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-8 border-transparent border-t-white"></div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <Modal isOpen={isZipModalOpen} onClose={() => setIsZipModalOpen(false)} title="Importation ZIP">
                <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-600 bg-indigo-50 p-4 rounded-xl border border-indigo-100 leading-relaxed">
                        Importez un fichier ZIP préalablement téléchargé depuis l'application. La liste des exercices sera configurée automatiquement.
                    </p>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 mt-4">Nom de cette nouvelle banque</label>
                        <input type="text" autoFocus value={newZipBankName} onChange={e => setNewZipBankName(e.target.value)} placeholder="Ex: Banque CCINP 2026" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20" />
                    </div>
                    <button onClick={handleConfirmZipImport} disabled={!newZipBankName.trim() || isImportingZip} className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {isImportingZip ? <Loader2 size={18} className="animate-spin"/> : <Archive size={18}/>}
                        Sélectionner le .zip
                    </button>
                </div>
            </Modal>

            <Modal isOpen={newBankModalOpen} onClose={() => setNewBankModalOpen(false)} title="Génération LaTeX">
                <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <span className="font-black text-indigo-600">{tempCatalog.length} exercices</span> détectés classés dans {new Set(tempCatalog.map(e => e.type)).size} chapitres !
                    </p>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 mt-4">Nom de la banque</label>
                        <input type="text" autoFocus value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder={`Ex: Session ${new Date().getFullYear() + 1}`} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20" />
                    </div>
                    <button onClick={handleConfirmNewBank} disabled={!newBankName.trim()} className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-colors disabled:opacity-50">
                        Démarrer la création des PDF
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isLatexModalOpen} onClose={() => setIsLatexModalOpen(false)} title="Installation Requise">
                <div className="space-y-6">
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 flex items-start gap-4">
                        <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" />
                        <div className="text-sm font-medium">
                            <p className="font-black mb-1">LaTeX n'est pas détecté</p>
                            <p>Pour pouvoir compiler le fichier officiel <code>.tex</code> et le transformer en fiches, vous devez avoir installé un moteur LaTeX sur votre système.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="font-black text-slate-800 text-sm mb-2">Windows</h3>
                            <button onClick={() => window.open('https://miktex.org/download', '_blank')} className="w-full py-2 bg-white border border-slate-300 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-2">
                                <DownloadCloud size={14} /> Installer MiKTeX
                            </button>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="font-black text-slate-800 text-sm mb-2">Mac</h3>
                            <button onClick={() => window.open('https://tug.org/mactex/mactex-download.html', '_blank')} className="w-full py-2 bg-white border border-slate-300 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-2">
                                <DownloadCloud size={14} /> Installer MacTeX
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 flex flex-col gap-2">
                        <button onClick={verifyLatex} disabled={isCheckingLatex} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                            {isCheckingLatex ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                            J'ai installé LaTeX, revérifier
                        </button>
                        <button onClick={() => { setHasLatex(true); setIsLatexModalOpen(false); }} className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs">
                            Forcer l'accès
                        </button>
                    </div>
                </div>
            </Modal>

            {isGenerating && (
                <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
                    <div className="flex-1 flex flex-col p-4 md:p-8">
                        <div className="mb-6 flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3">
                                    <Loader2 className="animate-spin text-indigo-500" /> Génération en cours...
                                </h2>
                                <p className="text-slate-400 font-bold mt-2">Le moteur LaTeX compile les exercices un par un.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black text-indigo-400">{genProgress.current} <span className="text-xl text-slate-600">/ {genProgress.total}</span></p>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest"><Clock size={12} className="inline mr-1"/> {formatETA()}</p>
                            </div>
                        </div>

                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-6 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out" style={{ width: `${(genProgress.current / genProgress.total) * 100}%` }}></div>
                        </div>

                        <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-slate-700">
                            {currentPreviewPdf ? (
                                <PdfViewer url={`local://${currentPreviewPdf.type}/exercice_${currentPreviewPdf.id}.pdf`} />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                    <FileText size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold">Préparation du moteur...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                            <h3 className="font-black text-white text-sm uppercase tracking-widest">Historique de création</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                            {generatedExos.slice().reverse().map((ex, index) => (
                                <div key={`${ex.id}-${index}`} onClick={() => setCurrentPreviewPdf({ id: ex.id, type: ex.type })} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer transition-colors border border-slate-700 hover:border-indigo-500 flex items-center justify-between group">
                                    <div>
                                        <p className="text-white font-bold text-sm">Exercice {ex.id}</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{ex.type}</p>
                                    </div>
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                </div>
                            ))}
                        </div>
                        {genProgress.current === genProgress.total && (
                            <div className="p-4 bg-slate-800 border-t border-slate-700">
                                <button onClick={handleFinishGeneration} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all">
                                    <Play size={18} /> Terminer et Sauvegarder
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedPdf && !isGenerating && (
                <div className="fixed inset-0 z-[600] bg-slate-900/90 backdrop-blur-xl flex flex-col p-4 sm:p-6 md:p-10 animate-in fade-in duration-200">
                    <div className="max-w-6xl mx-auto w-full flex justify-between items-start md:items-center mb-4 md:mb-6 mt-6 md:mt-0">
                        <div>
                            <h2 className="text-xl md:text-3xl font-black text-white italic tracking-tight">Aperçu : Exercice {selectedPdf.id}</h2>
                            <p className="text-[10px] md:text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">{selectedPdf.type}</p>
                        </div>
                        <button onClick={() => setSelectedPdf(null)} className="p-3 md:p-4 bg-white/10 hover:bg-red-500 text-white rounded-xl md:rounded-2xl transition-all shadow-lg hover:scale-105 shrink-0 ml-4">
                            <X className="w-5 h-5 md:w-7 md:h-7" />
                        </button>
                    </div>
                    <div className="flex-1 w-full max-w-6xl mx-auto bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-700 relative mb-4">
                        <PdfViewer url={`local://${selectedPdf.type}/exercice_${selectedPdf.id}.pdf`} />
                    </div>
                </div>
            )}
        </div>
    );
};