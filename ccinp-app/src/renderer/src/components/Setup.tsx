import React, {useState} from "react";
import {AlertTriangle, FolderDown, Loader2} from "lucide-react";
import {AnimatedBackground} from "./SharedUI";

export const Setup: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImport = async () => {
        setLoading(true); setError(null);
        try {
            if (window.api) {
                const result = await window.api.importExercises();
                if (result.success) onSuccess();
                else if (result.error) setError(result.error);
            } else {
                setError("API non disponible (Environnement web).");
                setTimeout(onSuccess, 1500);
            }
        } catch (err) { setError("Erreur inattendue."); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 text-slate-800 relative overflow-hidden">
            <AnimatedBackground />
            <div className="relative z-10 max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-3xl md:rounded-[3rem] shadow-2xl border border-white p-8 md:p-12 text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

                <div className="w-20 h-20 md:w-28 md:h-28 bg-indigo-50 text-indigo-600 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-10 shadow-inner">
                    <FolderDown className="w-10 h-10 md:w-14 md:h-14" strokeWidth={1.5} />
                </div>

                <h1 className="text-3xl md:text-4xl font-black mb-3 md:mb-4 tracking-tight">Banque PDF</h1>
                <p className="text-sm md:text-base text-slate-500 mb-8 md:mb-10 leading-relaxed font-medium">
                    Pour garantir d'excellentes performances hors-ligne, nous allons importer tes fichiers PDF dans le stockage sécurisé de l'application.
                </p>

                {error && (
                    <div className="mb-6 md:mb-8 p-3 md:p-4 bg-red-50 text-red-700 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold border border-red-100 flex items-start gap-3 text-left">
                        <AlertTriangle className="shrink-0 w-4 h-4 md:w-5 md:h-5"/> {error}
                    </div>
                )}

                <button onClick={handleImport} disabled={loading} className="w-full flex items-center justify-center gap-2 md:gap-3 py-4 md:py-5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl md:rounded-2xl disabled:opacity-70 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 text-sm md:text-base">
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <FolderDown className="w-5 h-5" />}
                    {loading ? "Copie des fichiers..." : "Importer le dossier .zip"}
                </button>
            </div>
        </div>
    );
};