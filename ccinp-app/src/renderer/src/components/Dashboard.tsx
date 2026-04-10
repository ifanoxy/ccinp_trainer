import React, { useMemo, useState, useEffect } from "react";
import { ArrowDownAZ, ArrowUpZA, BookOpen, BrainCircuit, Trophy, Clock, Target, X, List, Plus, Trash2, LibraryBig } from "lucide-react";
import { AnimatedBackground, Modal } from "./SharedUI";
import {ProgressRecord, Exercise, Bank} from "../types";
import { PdfViewer } from "./PdfViewer";

interface DashboardProps {
    progressData: ProgressRecord[];
    banks: Bank[];
    activeExos: number[];
    goHome: () => void;
    onRate?: (id: number, type: string, score: number, timeSpent: number) => Promise<void>;
    onDeleteRecord?: (record: ProgressRecord) => void;
}

type SortField = 'date' | 'score' | 'id' | 'timeSpent';

const ITEMS_PER_PAGE = 50;

export const Dashboard: React.FC<DashboardProps> = ({ progressData, banks, goHome, onRate, onDeleteRecord }) => {
    const [viewMode, setViewMode] = useState<'latest'|'history'>('latest');
    const [filterType, setFilterType] = useState('Tous');
    const [dashboardBankFilter, setDashboardBankFilter] = useState<string>('all');

    const [sortBy, setSortBy] = useState<SortField>('date');
    const [sortDesc, setSortDesc] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const [selectedPdf, setSelectedPdf] = useState<{id: number, type: string} | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [manualId, setManualId] = useState<number | ''>('');
    const [manualScore, setManualScore] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentDashboardCatalog = useMemo(() => {
        if (dashboardBankFilter === 'all') {
            const allExos = new Map<number, Exercise>();
            banks.forEach(b => b.catalog.forEach(ex => allExos.set(ex.id, ex)));
            return Array.from(allExos.values());
        }
        return banks.find(b => b.id === dashboardBankFilter)?.catalog || [];
    }, [banks, dashboardBankFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [dashboardBankFilter, filterType, viewMode, sortBy, sortDesc]);

    const availableTypes = useMemo(() => ['Tous', ...Array.from(new Set(currentDashboardCatalog.map(e => e.type)))], [currentDashboardCatalog]);

    const toggleSort = (field: SortField) => {
        if (sortBy === field) setSortDesc(!sortDesc);
        else { setSortBy(field); setSortDesc(true); }
    };

    const getExType = (id: number) => currentDashboardCatalog.find(e => e.id === id)?.type || 'Inconnu';

    const handleManualSubmit = async () => {
        const exObj = currentDashboardCatalog.find(e => e.id === manualId);
        if (!exObj || !manualScore || !onRate) return;
        setIsSubmitting(true);
        await onRate(exObj.id, exObj.type, manualScore, 0);
        setIsSubmitting(false);
        setIsManualAddOpen(false);
        setManualId('');
        setManualScore(null);
    };

    const { kpis, ratingBreakdown, unseenList, totalPages, paginatedData } = useMemo(() => {
        const catalogIds = new Set(currentDashboardCatalog.map(e => e.id));

        let tableData = progressData.filter(r => catalogIds.has(r.id));

        if (viewMode === 'latest') {
            const map = new Map<number, ProgressRecord>();
            tableData.forEach(r => map.set(r.id, r));
            tableData = Array.from(map.values());
        }
        if (filterType !== 'Tous') tableData = tableData.filter(r => r.type === filterType);

        const mod = sortDesc ? -1 : 1;
        tableData.sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            else cmp = a[sortBy] - b[sortBy];
            return cmp * mod;
        });

        const latestMap = new Map<number, ProgressRecord>();
        progressData.filter(r => catalogIds.has(r.id)).forEach(r => latestMap.set(r.id, r));
        const latest = Array.from(latestMap.values());

        const avg = latest.length > 0 ? (latest.reduce((a,c) => a+c.score,0)/latest.length) : 0;
        const totalSeconds = progressData.reduce((acc, curr) => catalogIds.has(curr.id) ? acc + curr.timeSpent : acc, 0);
        const mastered = latest.filter(r => r.score >= 6).length;

        const breakdown: Record<number, ProgressRecord[]> = { 7:[], 6:[], 5:[], 4:[], 3:[], 2:[], 1:[] };
        latest.forEach(r => { if (breakdown[r.score]) breakdown[r.score].push(r); });

        const unseenList = currentDashboardCatalog.map(e => e.id).filter(id => !latestMap.has(id));

        const tPages = Math.ceil(tableData.length / ITEMS_PER_PAGE);
        const pData = tableData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

        return {
            kpis: { count: latest.length, total: currentDashboardCatalog.length, avg: avg.toFixed(1), hours: Math.floor(totalSeconds / 3600), minutes: Math.floor((totalSeconds % 3600) / 60), mastered },
            ratingBreakdown: breakdown,
            unseenList,
            processedTableData: tableData,
            totalPages: tPages,
            paginatedData: pData
        };
    }, [progressData, viewMode, filterType, sortBy, sortDesc, currentDashboardCatalog, currentPage]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortBy !== field) return <ArrowDownAZ size={14} className="ml-1 md:ml-2 opacity-0 group-hover:opacity-40 inline transition-opacity"/>;
        return sortDesc ? <ArrowDownAZ size={14} className="ml-1 md:ml-2 text-indigo-500 inline"/> : <ArrowUpZA size={14} className="ml-1 md:ml-2 text-indigo-500 inline"/>;
    };

    const SCORE_UI: Record<number, { label: string, color: string, text: string }> = {
        7: { label: "Parfait", color: "bg-slate-900", text: "text-white" },
        6: { label: "Réussi", color: "bg-emerald-500", text: "text-white" },
        5: { label: "Assez bien", color: "bg-lime-500", text: "text-white" },
        4: { label: "Moyen", color: "bg-yellow-500", text: "text-white" },
        3: { label: "Besoin d'aide", color: "bg-amber-500", text: "text-white" },
        2: { label: "Très difficile", color: "bg-orange-500", text: "text-white" },
        1: { label: "Rien su faire", color: "bg-red-500", text: "text-white" }
    };

    return (
        <div className="h-full bg-slate-50 p-4 md:p-10 text-slate-800 font-sans relative overflow-y-auto overflow-x-hidden">
            <AnimatedBackground />
            <div className="max-w-7xl mx-auto relative z-10 mt-12 md:mt-6">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 bg-white/80 backdrop-blur-xl p-4 md:p-5 px-5 md:px-8 rounded-[2rem] md:rounded-3xl shadow-xl border border-white gap-4">
                    <div className="flex items-center gap-3 md:gap-5">
                        <div className="p-3 md:p-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-indigo-200"><Trophy className="w-6 h-6 md:w-7 md:h-7"/></div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900">Analyse de Performance</h1>
                            <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                                <LibraryBig size={14} className="text-indigo-500" />
                                <select
                                    value={dashboardBankFilter}
                                    onChange={e => setDashboardBankFilter(e.target.value)}
                                    className="bg-transparent text-[10px] md:text-xs font-bold text-indigo-600 uppercase tracking-widest outline-none cursor-pointer border-none p-0"
                                >
                                    <option value="all">TOUTES LES BANQUES</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <button onClick={goHome} className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl md:rounded-2xl font-black shadow-lg transition-all text-xs md:text-sm hover:-translate-y-1">Retour Accueil</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-10">

                    <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-3xl md:rounded-[2.5rem] border border-white shadow-xl flex flex-col justify-center relative overflow-hidden">
                                <BookOpen className="absolute top-4 right-4 md:top-6 md:right-6 text-blue-100 w-10 h-10 md:w-16 md:h-16"/>
                                <p className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 relative z-10">Vus</p>
                                <p className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 relative z-10">{kpis.count} <span className="text-sm md:text-xl text-slate-300 font-medium">/ {kpis.total}</span></p>
                            </div>
                            <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-3xl md:rounded-[2.5rem] border border-white shadow-xl flex flex-col justify-center relative overflow-hidden">
                                <BrainCircuit className="absolute top-4 right-4 md:top-6 md:right-6 text-emerald-100 w-10 h-10 md:w-16 md:h-16"/>
                                <p className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 relative z-10">Aisance</p>
                                <p className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-600 relative z-10">{kpis.avg} <span className="text-sm md:text-xl text-emerald-200 font-medium">/ 7</span></p>
                            </div>
                            <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-3xl md:rounded-[2.5rem] border border-white shadow-xl flex flex-col justify-center relative overflow-hidden">
                                <Target className="absolute top-4 right-4 md:top-6 md:right-6 text-amber-100 w-10 h-10 md:w-16 md:h-16"/>
                                <p className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 relative z-10">Maîtrisés</p>
                                <p className="text-3xl sm:text-4xl md:text-5xl font-black text-amber-500 relative z-10">{kpis.mastered}</p>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 sm:p-6 rounded-3xl md:rounded-[2.5rem] border border-indigo-400 shadow-2xl flex flex-col justify-center text-white relative overflow-hidden">
                                <Clock className="absolute top-4 right-4 md:top-6 md:right-6 opacity-20 w-10 h-10 md:w-16 md:h-16"/>
                                <p className="text-[9px] md:text-xs font-black text-indigo-200 uppercase tracking-widest mb-1 md:mb-2 relative z-10">Temps</p>
                                <p className="text-3xl sm:text-4xl md:text-5xl font-black relative z-10 whitespace-nowrap">{kpis.hours}<span className="text-sm sm:text-lg md:text-2xl text-indigo-300 font-medium mr-1 md:mr-2">h</span>{kpis.minutes}<span className="text-sm sm:text-lg md:text-2xl text-indigo-300 font-medium">m</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-white shadow-xl flex flex-col h-full">
                        <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2">
                            <List className="w-4 h-4 md:w-5 md:h-5 text-indigo-500"/> Répartition
                        </h3>

                        <div className="flex-1 flex flex-col gap-3 md:gap-4 mb-6">
                            {[7, 6, 5, 4, 3, 2, 1].map(score => {
                                const count = ratingBreakdown[score].length;
                                const ui = SCORE_UI[score];
                                return (
                                    <div key={score} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <span className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black ${ui.color} ${ui.text} shadow-sm group-hover:scale-110 transition-transform`}>{score}</span>
                                            <span className="font-bold text-slate-600 text-xs md:text-sm">{ui.label}</span>
                                        </div>
                                        <span className="font-black text-slate-900 text-sm md:text-lg">{count} <span className="text-[9px] md:text-xs text-slate-400 font-bold ml-1 uppercase">exo{count > 1 ? 's' : ''}</span></span>
                                    </div>
                                )
                            })}

                            <div className="w-full h-px bg-slate-100 my-1 md:my-2"></div>

                            <div className="flex justify-between items-center group">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <span className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black bg-slate-200 text-slate-500 group-hover:scale-110 transition-transform">-</span>
                                    <span className="font-bold text-slate-500 text-xs md:text-sm">Non vus</span>
                                </div>
                                <span className="font-black text-slate-400 text-sm md:text-lg">{unseenList.length} <span className="text-[9px] md:text-xs uppercase ml-1">exos</span></span>
                            </div>
                        </div>

                        <button onClick={() => setIsDetailsModalOpen(true)} className="w-full py-3 md:py-4 bg-indigo-50 text-indigo-700 font-bold text-xs md:text-sm rounded-xl md:rounded-2xl hover:bg-indigo-100 transition-colors shadow-sm mt-auto">
                            Voir le détail complet
                        </button>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xl p-3 md:p-4 rounded-3xl shadow-xl border border-white mb-6 md:mb-8 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex bg-slate-100 p-1 md:p-1.5 rounded-xl md:rounded-2xl shrink-0">
                        <button onClick={() => setViewMode('latest')} className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all ${viewMode === 'latest' ? 'bg-white text-indigo-700 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Dernier passage</button>
                        <button onClick={() => setViewMode('history')} className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all ${viewMode === 'history' ? 'bg-white text-indigo-700 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Historique</button>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 sm:pr-4">

                        <button onClick={() => setIsManualAddOpen(true)} className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all border border-indigo-100 shadow-sm shrink-0">
                            <Plus size={14} className="md:w-4 md:h-4"/> <span className="hidden sm:inline">Ajout Manuel</span><span className="sm:hidden">Ajouter</span>
                        </button>

                        <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest pl-2 sm:pl-0">Matière :</span>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl text-xs md:text-sm py-2 px-3 md:py-3 md:px-5 font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition shadow-inner">
                            {availableTypes.map(t => <option key={t} value={t}>{t === 'Tous' ? 'Toutes' : t}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xl rounded-3xl md:rounded-[2rem] shadow-2xl border border-white overflow-hidden mb-12">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse select-none whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-4 md:px-8 md:py-6 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => toggleSort('id')}><div className="flex items-center text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Exo <SortIcon field="id"/></div></th>
                                <th className="px-4 py-4 md:px-8 md:py-6"><div className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Matière</div></th>
                                <th className="px-4 py-4 md:px-8 md:py-6 cursor-pointer group hover:bg-slate-100 transition-colors text-center" onClick={() => toggleSort('score')}><div className="flex items-center justify-center text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Aisance <SortIcon field="score"/></div></th>
                                <th className="px-4 py-4 md:px-8 md:py-6 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => toggleSort('timeSpent')}><div className="flex items-center text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Temps <SortIcon field="timeSpent"/></div></th>
                                <th className="px-4 py-4 md:px-8 md:py-6 cursor-pointer group hover:bg-slate-100 transition-colors text-right" onClick={() => toggleSort('date')}><div className="flex items-center justify-end text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Date <SortIcon field="date"/></div></th>
                                <th className="px-2 py-4 md:px-4 md:py-6 w-12"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((r, i) => (
                                <tr key={i} className="hover:bg-indigo-50/50 transition-colors cursor-default group/row">
                                    <td className="px-4 py-3 md:px-8 md:py-5">
                                        <button onClick={() => setSelectedPdf({ id: r.id, type: r.type })} className="font-black text-slate-900 text-sm md:text-lg hover:text-indigo-600 transition-all flex items-center gap-1.5 md:gap-2 group/pdf hover:scale-105">
                                            #{r.id} <BookOpen size={14} className="md:w-4 md:h-4 opacity-50 md:opacity-0 md:group-hover/pdf:opacity-100 text-indigo-500 transition-opacity" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 md:px-8 md:py-5"><span className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest px-2 py-1 md:px-3 md:py-1.5 bg-slate-100 rounded-md md:rounded-lg">{r.type}</span></td>
                                    <td className="px-4 py-3 md:px-8 md:py-5 text-center"><div className="flex justify-center"><span className={`inline-flex items-center justify-center w-7 h-7 md:w-10 md:h-10 rounded-full font-black text-xs md:text-base shadow-sm border ${r.score >= 6 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : r.score >= 4 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{r.score}</span></div></td>
                                    <td className="px-4 py-3 md:px-8 md:py-5 font-mono text-xs md:text-sm font-bold text-slate-500">{formatTime(r.timeSpent)}</td>
                                    <td className="px-4 py-3 md:px-8 md:py-5 text-right text-slate-500 text-[10px] md:text-xs font-bold tracking-wide">{new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-2 py-3 md:px-4 md:py-5 text-center">
                                        <button onClick={() => { if(window.confirm('Es-tu sûr de vouloir supprimer cet enregistrement ?')) onDeleteRecord?.(r); }} className="text-slate-300 hover:text-red-500 transition-all p-1.5 md:p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover/row:opacity-100">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={6} className="py-12 md:py-24 text-center text-slate-400 font-bold text-sm">Aucun exercice trouvé avec ces filtres.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center p-4 md:p-6 bg-slate-50 border-t border-slate-200">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">Précédent</button>
                            <span className="text-xs md:text-sm font-bold text-slate-500">Page {currentPage} sur {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">Suivant</button>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isManualAddOpen} onClose={() => setIsManualAddOpen(false)} title="Ajout manuel d'une note">
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Numéro de l'exercice</label>
                        <input type="number" min="1" value={manualId} onChange={e => setManualId(e.target.value ? parseInt(e.target.value) : '')} placeholder="Ex: 67" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-slate-700 text-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all" />
                        <p className="text-[10px] text-indigo-500 font-bold mt-2 uppercase">
                            {manualId && typeof manualId === 'number' && currentDashboardCatalog.find(e => e.id === manualId) ? `Matière : ${getExType(manualId)}` : 'Veuillez entrer un numéro valide de la banque sélectionnée.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Évaluation (1 à 7)</label>
                        <div className="flex flex-wrap justify-between gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            {[1, 2, 3, 4, 5, 6, 7].map(score => {
                                const isActive = manualScore === score;
                                const c = SCORE_UI[score];
                                return (
                                    <button key={score} onClick={() => setManualScore(score)} className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center transition-all border ${isActive ? `${c.color} ${c.text} shadow-md scale-110 border-transparent` : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                                        {score}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button onClick={handleManualSubmit} disabled={!manualId || typeof manualId !== 'number' || !currentDashboardCatalog.find(e => e.id === manualId) || !manualScore || isSubmitting} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {isSubmitting ? "Enregistrement..." : "Valider la note"}
                    </button>
                </div>
            </Modal>

            {isDetailsModalOpen && (
                <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-xl flex flex-col p-4 sm:p-6 md:p-10 animate-in fade-in duration-200">
                    <div className="max-w-5xl mx-auto w-full flex justify-between items-start md:items-center mb-4 md:mb-6 mt-6 md:mt-0">
                        <div>
                            <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">Détail par Niveau</h2>
                            <p className="text-[10px] md:text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">Liste des exercices pour la banque sélectionnée</p>
                        </div>
                        <button onClick={() => setIsDetailsModalOpen(false)} className="p-3 md:p-4 bg-white/10 hover:bg-red-500 text-white rounded-xl md:rounded-2xl transition-all shadow-lg hover:scale-105 shrink-0 ml-4"><X className="w-5 h-5 md:w-7 md:h-7" /></button>
                    </div>

                    <div className="flex-1 w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] overflow-y-auto shadow-2xl border border-white p-5 md:p-12 mb-4 custom-scrollbar">
                        {[7, 6, 5, 4, 3, 2, 1].map(score => {
                            const exos = ratingBreakdown[score];
                            const ui = SCORE_UI[score];
                            return (
                                <div key={score} className="mb-6 md:mb-10 last:mb-0">
                                    <h3 className="text-sm md:text-lg font-black text-slate-800 mb-3 md:mb-4 flex items-center gap-2 md:gap-3">
                                        <span className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-black ${ui.color} ${ui.text} shadow-sm`}>{score}</span>
                                        {ui.label} <span className="text-slate-400 text-xs md:text-sm">({exos.length})</span>
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                                        {exos.map(ex => (
                                            <button key={ex.id} onClick={() => { setSelectedPdf({ id: ex.id, type: ex.type }); setIsDetailsModalOpen(false); }} className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 hover:ring-2 ring-indigo-400 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-slate-600 transition-all cursor-pointer shadow-sm group">
                                                #{ex.id} <span className="text-[8px] md:text-[10px] uppercase opacity-60 ml-1 group-hover:opacity-100">{ex.type.substring(0,3)}</span>
                                            </button>
                                        ))}
                                        {exos.length === 0 && <span className="text-xs md:text-sm text-slate-400 italic px-2 py-1">Aucun exercice dans cette catégorie.</span>}
                                    </div>
                                </div>
                            )
                        })}

                        <div className="w-full h-px bg-slate-200 my-6 md:my-10"></div>

                        <div className="mb-4">
                            <h3 className="text-sm md:text-lg font-black text-slate-800 mb-3 md:mb-4 flex items-center gap-2 md:gap-3">
                                <span className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-black bg-slate-200 text-slate-500 shadow-sm">-</span>
                                Non vus <span className="text-slate-400 text-xs md:text-sm">({unseenList.length})</span>
                            </h3>
                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                                {unseenList.map(id => (
                                    <button key={id} onClick={() => { setSelectedPdf({ id, type: getExType(id) }); setIsDetailsModalOpen(false); }} className="px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-slate-400 transition-all cursor-pointer shadow-sm">
                                        #{id}
                                    </button>
                                ))}
                                {unseenList.length === 0 && <span className="text-xs md:text-sm text-emerald-500 font-bold px-2 py-1">Bravo ! Tu as vu toute ta sélection.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedPdf && (
                <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-xl flex flex-col p-4 sm:p-6 md:p-10 animate-in fade-in duration-200">
                    <div className="max-w-6xl mx-auto w-full flex justify-between items-start md:items-center mb-4 md:mb-6 mt-6 md:mt-0">
                        <div>
                            <h2 className="text-xl md:text-3xl font-black text-white italic tracking-tight">Exercice {selectedPdf.id}</h2>
                            <p className="text-[10px] md:text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1">{selectedPdf.type}</p>
                        </div>
                        <button onClick={() => setSelectedPdf(null)} className="p-3 md:p-4 bg-white/10 hover:bg-red-500 text-white rounded-xl md:rounded-2xl transition-all shadow-lg hover:shadow-red-500/30 hover:scale-105 shrink-0 ml-4"><X className="w-5 h-5 md:w-7 md:h-7" /></button>
                    </div>
                    <div className="flex-1 w-full max-w-6xl mx-auto bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-700 relative mb-4">
                        <PdfViewer url={`local://${selectedPdf.type}/exercice_${selectedPdf.id}.pdf`} />
                    </div>
                </div>
            )}
        </div>
    );
};