import React, { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpZA, BookOpen, BrainCircuit, Trophy, Clock, Target, X, List } from "lucide-react";
import { AnimatedBackground } from "./SharedUI";
import { ProgressRecord } from "../types";

const ActivityHeatmap: React.FC<{ progressData: ProgressRecord[] }> = ({ progressData }) => {
    const days = useMemo(() => {
        const today = new Date();
        return Array.from({ length: 90 }).map((_, i) => {
            const d = new Date(today); d.setDate(d.getDate() - (89 - i));
            return d.toISOString().split('T')[0];
        });
    }, []);

    const counts = useMemo(() => progressData.reduce((acc, curr) => {
        const d = new Date(curr.date).toISOString().split('T')[0];
        acc[d] = (acc[d] || 0) + 1; return acc;
    }, {} as Record<string, number>), [progressData]);

    const maxCount = useMemo(() => {
        const values = Object.values(counts);
        return values.length > 0 ? Math.max(...values) : 0;
    }, [counts]);

    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col relative z-10 w-full h-full justify-between">
            <div className="flex justify-between items-end mb-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Régularité (90 derniers jours)</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span>Moins</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-[3px] bg-slate-100"></div>
                        <div className="w-3 h-3 rounded-[3px] bg-emerald-200"></div>
                        <div className="w-3 h-3 rounded-[3px] bg-emerald-400"></div>
                        <div className="w-3 h-3 rounded-[3px] bg-emerald-600"></div>
                        <div className="w-3 h-3 rounded-[3px] bg-emerald-800"></div>
                    </div>
                    <span>Plus</span>
                    {maxCount > 0 && <span className="ml-2 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Max: {maxCount}</span>}
                </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {days.map(d => {
                    const count = counts[d] || 0;
                    let bg = "bg-slate-100";

                    if (count > 0 && maxCount > 0) {
                        const ratio = count / maxCount;
                        if (ratio <= 0.25) bg = "bg-emerald-200";
                        else if (ratio <= 0.5) bg = "bg-emerald-400";
                        else if (ratio <= 0.75) bg = "bg-emerald-600";
                        else bg = "bg-emerald-800";
                    }

                    const dateStr = new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

                    return (
                        <div key={d} className="relative group">
                            <div className={`w-4 h-4 rounded-[4px] transition-all duration-200 hover:ring-2 hover:ring-offset-1 ring-indigo-400 cursor-pointer ${bg}`} />

                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-xl whitespace-nowrap z-50 translate-y-1 group-hover:translate-y-0">
                                {dateStr} : {count} exercice{count > 1 ? 's' : ''}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

type SortField = 'date' | 'score' | 'id' | 'timeSpent';

export const Dashboard: React.FC<{ progressData: ProgressRecord[], goHome: () => void }> = ({ progressData, goHome }) => {
    const [viewMode, setViewMode] = useState<'latest'|'history'>('latest');
    const [filterType, setFilterType] = useState('Tous');
    const [sortBy, setSortBy] = useState<SortField>('date');
    const [sortDesc, setSortDesc] = useState(true);

    const [selectedPdf, setSelectedPdf] = useState<{id: number, type: string} | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const toggleSort = (field: SortField) => {
        if (sortBy === field) setSortDesc(!sortDesc);
        else { setSortBy(field); setSortDesc(true); }
    };

    const getExType = (id: number) => {
        if (id <= 58) return 'Analyse';
        if (id <= 94) return 'Algebre';
        return 'Probabilites';
    };

    const { kpis, ratingBreakdown, unseenList, processedTableData } = useMemo(() => {
        let tableData = [...progressData];
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
        progressData.forEach(r => latestMap.set(r.id, r));
        const latest = Array.from(latestMap.values());

        const avg = latest.length > 0 ? (latest.reduce((a,c) => a+c.score,0)/latest.length) : 0;
        const totalSeconds = progressData.reduce((acc, curr) => acc + curr.timeSpent, 0);
        const mastered = latest.filter(r => r.score >= 6).length;

        const breakdown: Record<number, ProgressRecord[]> = { 7:[], 6:[], 5:[], 4:[], 3:[], 2:[], 1:[] };
        latest.forEach(r => {
            if (breakdown[r.score]) breakdown[r.score].push(r);
        });

        const allExIds = Array.from({ length: 112 }, (_, i) => i + 1);
        const unseenList = allExIds.filter(id => !latestMap.has(id));

        return {
            kpis: { count: latest.length, avg: avg.toFixed(1), hours: Math.floor(totalSeconds / 3600), minutes: Math.floor((totalSeconds % 3600) / 60), mastered },
            ratingBreakdown: breakdown,
            unseenList,
            processedTableData: tableData
        };
    }, [progressData, viewMode, filterType, sortBy, sortDesc]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortBy !== field) return <ArrowDownAZ size={16} className="ml-2 opacity-0 group-hover:opacity-40 inline transition-opacity"/>;
        return sortDesc ? <ArrowDownAZ size={16} className="ml-2 text-indigo-500 inline"/> : <ArrowUpZA size={16} className="ml-2 text-indigo-500 inline"/>;
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
        <div className="h-full bg-slate-50 p-6 md:p-10 text-slate-800 font-sans relative overflow-y-auto">
            <AnimatedBackground />
            <div className="max-w-7xl mx-auto relative z-10 mt-6">

                <div className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur-xl p-5 px-8 rounded-3xl shadow-xl border border-white">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200"><Trophy size={28}/></div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Analyse de Performance</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Statistiques CCINP</p>
                        </div>
                    </div>
                    <button onClick={goHome} className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-lg transition-all text-sm hover:-translate-y-1">Retour</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-xl flex flex-col justify-center relative overflow-hidden">
                                <BookOpen className="absolute top-6 right-6 text-blue-100" size={64}/>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Exercices vus</p>
                                <p className="text-5xl font-black text-slate-900 relative z-10">{kpis.count} <span className="text-xl text-slate-300 font-medium">/ 112</span></p>
                            </div>
                            <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-xl flex flex-col justify-center relative overflow-hidden">
                                <BrainCircuit className="absolute top-6 right-6 text-emerald-100" size={64}/>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Aisance globale</p>
                                <p className="text-5xl font-black text-emerald-600 relative z-10">{kpis.avg} <span className="text-xl text-emerald-200 font-medium">/ 7</span></p>
                            </div>
                            <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-xl flex flex-col justify-center relative overflow-hidden">
                                <Target className="absolute top-6 right-6 text-amber-100" size={64}/>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Maîtrisés (≥ 6)</p>
                                <p className="text-5xl font-black text-amber-500 relative z-10">{kpis.mastered}</p>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2.5rem] border border-indigo-400 shadow-2xl flex flex-col justify-center text-white relative overflow-hidden">
                                <Clock className="absolute top-6 right-6 opacity-20" size={64}/>
                                <p className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-2 relative z-10">Temps investi</p>
                                <p className="text-5xl font-black relative z-10">{kpis.hours}<span className="text-2xl text-indigo-300 font-medium mr-2">h</span>{kpis.minutes}<span className="text-2xl text-indigo-300 font-medium">m</span></p>
                            </div>
                        </div>

                        <div className="flex-1">
                            <ActivityHeatmap progressData={progressData} />
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-white/90 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-xl flex flex-col h-full">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <List size={20} className="text-indigo-500"/> Répartition
                        </h3>

                        <div className="flex-1 flex flex-col gap-4 mb-6">
                            {[7, 6, 5, 4, 3, 2, 1].map(score => {
                                const count = ratingBreakdown[score].length;
                                const ui = SCORE_UI[score];
                                return (
                                    <div key={score} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${ui.color} ${ui.text} shadow-sm group-hover:scale-110 transition-transform`}>
                                                {score}
                                            </span>
                                            <span className="font-bold text-slate-600 text-sm">{ui.label}</span>
                                        </div>
                                        <span className="font-black text-slate-900 text-lg">{count} <span className="text-xs text-slate-400 font-bold ml-1 uppercase">exo{count > 1 ? 's' : ''}</span></span>
                                    </div>
                                )
                            })}

                            <div className="w-full h-px bg-slate-100 my-2"></div>

                            <div className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black bg-slate-200 text-slate-500 group-hover:scale-110 transition-transform">-</span>
                                    <span className="font-bold text-slate-500 text-sm">Non vus</span>
                                </div>
                                <span className="font-black text-slate-400 text-lg">{unseenList.length} <span className="text-xs uppercase ml-1">exos</span></span>
                            </div>
                        </div>

                        <button onClick={() => setIsDetailsModalOpen(true)} className="w-full py-4 bg-indigo-50 text-indigo-700 font-bold rounded-2xl hover:bg-indigo-100 transition-colors shadow-sm mt-auto">
                            Voir le détail complet
                        </button>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white mb-8 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                        <button onClick={() => setViewMode('latest')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${viewMode === 'latest' ? 'bg-white text-indigo-700 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Dernier passage</button>
                        <button onClick={() => setViewMode('history')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${viewMode === 'history' ? 'bg-white text-indigo-700 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Historique complet</button>
                    </div>
                    <div className="flex items-center gap-4 pr-4">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Matière :</span>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl text-sm py-3 px-5 font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition shadow-inner">
                            <option value="Tous">Toutes</option><option value="Analyse">Analyse</option><option value="Algebre">Algèbre</option><option value="Probabilites">Proba</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white overflow-hidden mb-12">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse select-none">
                            <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-8 py-6 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => toggleSort('id')}><div className="flex items-center text-xs font-black text-slate-500 uppercase tracking-widest">Exo <SortIcon field="id"/></div></th>
                                <th className="px-8 py-6"><div className="text-xs font-black text-slate-500 uppercase tracking-widest">Matière</div></th>
                                <th className="px-8 py-6 cursor-pointer group hover:bg-slate-100 transition-colors text-center" onClick={() => toggleSort('score')}><div className="flex items-center justify-center text-xs font-black text-slate-500 uppercase tracking-widest">Aisance <SortIcon field="score"/></div></th>
                                <th className="px-8 py-6 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => toggleSort('timeSpent')}><div className="flex items-center text-xs font-black text-slate-500 uppercase tracking-widest">Temps <SortIcon field="timeSpent"/></div></th>
                                <th className="px-8 py-6 cursor-pointer group hover:bg-slate-100 transition-colors text-right" onClick={() => toggleSort('date')}><div className="flex items-center justify-end text-xs font-black text-slate-500 uppercase tracking-widest">Date <SortIcon field="date"/></div></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {processedTableData.map((r, i) => (
                                <tr key={i} className="hover:bg-indigo-50/50 transition-colors cursor-default">
                                    <td className="px-8 py-5">
                                        <button
                                            onClick={() => setSelectedPdf({ id: r.id, type: r.type })}
                                            className="font-black text-slate-900 text-lg hover:text-indigo-600 transition-all flex items-center gap-2 group/pdf hover:scale-105"
                                            title="Consulter le PDF de l'exercice"
                                        >
                                            #{r.id}
                                            <BookOpen size={16} className="opacity-0 group-hover/pdf:opacity-100 text-indigo-500 transition-opacity" />
                                        </button>
                                    </td>
                                    <td className="px-8 py-5"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-3 py-1.5 bg-slate-100 rounded-lg">{r.type}</span></td>
                                    <td className="px-8 py-5 text-center"><div className="flex justify-center"><span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-base shadow-sm border ${r.score >= 6 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : r.score >= 4 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{r.score}</span></div></td>
                                    <td className="px-8 py-5 font-mono text-sm font-bold text-slate-500">{formatTime(r.timeSpent)}</td>
                                    <td className="px-8 py-5 text-right text-slate-500 text-xs font-bold tracking-wide">{new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                </tr>
                            ))}
                            {processedTableData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center text-slate-400 font-bold">Aucun exercice trouvé avec ces filtres.</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isDetailsModalOpen && (
                <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-xl flex flex-col p-6 md:p-10 animate-in fade-in duration-200">
                    <div className="max-w-5xl mx-auto w-full flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Détail par Niveau</h2>
                            <p className="text-indigo-400 font-bold uppercase tracking-widest mt-1">Liste complète des exercices</p>
                        </div>
                        <button onClick={() => setIsDetailsModalOpen(false)} className="p-4 bg-white/10 hover:bg-red-500 text-white rounded-2xl transition-all shadow-lg hover:scale-105">
                            <X size={28} />
                        </button>
                    </div>

                    <div className="flex-1 w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-3xl rounded-[3rem] overflow-y-auto shadow-2xl border border-white p-8 md:p-12">
                        {[7, 6, 5, 4, 3, 2, 1].map(score => {
                            const exos = ratingBreakdown[score];
                            const ui = SCORE_UI[score];
                            return (
                                <div key={score} className="mb-10 last:mb-0">
                                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${ui.color} ${ui.text} shadow-sm`}>{score}</span>
                                        {ui.label} <span className="text-slate-400 text-sm">({exos.length})</span>
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {exos.map(ex => (
                                            <button
                                                key={ex.id}
                                                onClick={() => { setSelectedPdf({ id: ex.id, type: ex.type }); setIsDetailsModalOpen(false); }}
                                                className="px-4 py-2 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 hover:ring-2 ring-indigo-400 rounded-xl text-sm font-bold text-slate-600 transition-all cursor-pointer shadow-sm group"
                                            >
                                                #{ex.id} <span className="text-[10px] uppercase opacity-60 ml-1 group-hover:opacity-100">{ex.type.substring(0,3)}</span>
                                            </button>
                                        ))}
                                        {exos.length === 0 && <span className="text-sm text-slate-400 italic px-2">Aucun exercice dans cette catégorie.</span>}
                                    </div>
                                </div>
                            )
                        })}

                        <div className="w-full h-px bg-slate-200 my-10"></div>

                        <div className="mb-4">
                            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-slate-200 text-slate-500 shadow-sm">-</span>
                                Non vus <span className="text-slate-400 text-sm">({unseenList.length})</span>
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {unseenList.map(id => (
                                    <button
                                        key={id}
                                        onClick={() => { setSelectedPdf({ id, type: getExType(id) }); setIsDetailsModalOpen(false); }}
                                        className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-sm font-bold text-slate-400 transition-all cursor-pointer shadow-sm"
                                    >
                                        #{id}
                                    </button>
                                ))}
                                {unseenList.length === 0 && <span className="text-sm text-emerald-500 font-bold px-2">Bravo ! Tu as vu toute la banque.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedPdf && (
                <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-xl flex flex-col p-6 md:p-10 animate-in fade-in duration-200">
                    <div className="max-w-6xl mx-auto w-full flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-3xl font-black text-white italic tracking-tight">Exercice {selectedPdf.id}</h2>
                            <p className="text-indigo-400 font-bold uppercase tracking-widest mt-1">{selectedPdf.type}</p>
                        </div>
                        <button
                            onClick={() => setSelectedPdf(null)}
                            className="p-4 bg-white/10 hover:bg-red-500 text-white rounded-2xl transition-all shadow-lg hover:shadow-red-500/30 hover:scale-105"
                            title="Fermer l'aperçu"
                        >
                            <X size={28} />
                        </button>
                    </div>

                    <div className="flex-1 w-full max-w-6xl mx-auto bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-700 relative">
                        <embed
                            src={`local://${selectedPdf.type}/exercice_${selectedPdf.id}.pdf#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                            type="application/pdf"
                            className="w-full h-full relative z-10"
                            style={{filter: 'contrast(1.05)'}}
                        />
                        {!window.api && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 z-0">
                                <BookOpen size={64} className="mb-4 opacity-20"/>
                                <p className="font-bold text-lg">Aperçu indisponible dans le navigateur</p>
                                <p className="text-sm font-medium mt-2">Le PDF s'affichera dans l'application native.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};