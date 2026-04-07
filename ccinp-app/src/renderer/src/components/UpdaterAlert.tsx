import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownToLine, CheckCircle2, DownloadCloud, Loader2, RefreshCw, X } from 'lucide-react';

export const UpdaterAlert: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'ready' | 'error'>('idle');
    const [version, setVersion] = useState('');
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!window.api || !window.api.updater) return;

        window.api.updater.onStatus((data: any) => {
            if (data.type === 'available') {
                setVersion(data.version);
                setStatus('available');
                setIsVisible(true);
            } else if (data.type === 'progress') {
                setStatus('downloading');
                setProgress(Math.round(data.percent));
            } else if (data.type === 'ready') {
                setStatus('ready');
            } else if (data.type === 'error') {
                setStatus('error');
                setTimeout(() => setIsVisible(false), 5000);
            }
        });

        const timer = setTimeout(() => {
            window.api.updater?.check();
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed top-12 right-2 md:top-14 md:right-6 z-[200] animate-in slide-in-from-top-10 fade-in duration-300 w-[calc(100vw-16px)] sm:w-80">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                    {status === 'available' && <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0"><DownloadCloud size={20} className="md:w-6 md:h-6" /></div>}
                    {status === 'downloading' && <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0"><Loader2 size={20} className="animate-spin md:w-6 md:h-6" /></div>}
                    {status === 'ready' && <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0"><CheckCircle2 size={20} className="md:w-6 md:h-6" /></div>}
                    {status === 'error' && <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0"><AlertCircle size={20} className="md:w-6 md:h-6" /></div>}

                    <div className="flex-1 pt-0.5 md:pt-1">
                        {status === 'available' && (
                            <>
                                <h3 className="text-xs md:text-sm font-black text-slate-800">Mise à jour v{version}</h3>
                                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold mb-2 md:mb-3 mt-1">Une nouvelle version est disponible.</p>
                                {window.navigator.userAgent.includes('Mac') ? (
                                    <button onClick={() => {
                                        window.open('https://github.com/TonPseudo/ccinp-trainer-pro/releases/latest', '_blank');
                                        setIsVisible(false);
                                    }} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2">
                                        <DownloadCloud size={14} /> Télécharger manuellement
                                    </button>
                                ) : (
                                    <button onClick={() => window.api.updater?.download()} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2">
                                        <ArrowDownToLine size={14} /> Télécharger
                                    </button>
                                )}
                            </>
                        )}

                        {status === 'downloading' && (
                            <>
                                <h3 className="text-xs md:text-sm font-black text-slate-800">Téléchargement...</h3>
                                <div className="flex items-center justify-between mt-1 md:mt-2 mb-1">
                                    <span className="text-[9px] md:text-[10px] font-bold text-slate-500">Progression</span>
                                    <span className="text-[9px] md:text-[10px] font-black text-indigo-600">{progress}%</span>
                                </div>
                                <div className="w-full h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                            </>
                        )}

                        {status === 'ready' && (
                            <>
                                <h3 className="text-xs md:text-sm font-black text-slate-800">Prêt à installer</h3>
                                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold mb-2 md:mb-3 mt-1">L'application va redémarrer.</p>
                                <button onClick={() => window.api.updater?.install()} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2">
                                    <RefreshCw size={14} /> Installer maintenant
                                </button>
                            </>
                        )}

                        {status === 'error' && (
                            <>
                                <h3 className="text-xs md:text-sm font-black text-slate-800">Échec</h3>
                                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold mt-1">Impossible de télécharger la mise à jour.</p>
                            </>
                        )}
                    </div>

                    {(status === 'available' || status === 'error') && (
                        <button onClick={() => setIsVisible(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                            <X size={14} className="md:w-4 md:h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};