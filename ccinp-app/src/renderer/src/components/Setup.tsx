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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800 relative overflow-hidden">
            <AnimatedBackground />
            <div className="relative z-10 max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white p-12 text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <div className="w-28 h-28 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner"><FolderDown size={56} strokeWidth={1.5} /></div>
                <h1 className="text-4xl font-black mb-4 tracking-tight">Banque PDF</h1>
                <p className="text-slate-500 mb-10 leading-relaxed font-medium">
                    Pour garantir d'excellentes performances hors-ligne, nous allons importer tes fichiers PDF dans le stockage sécurisé de l'application.
                </p>
                {error && <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold border border-red-100 flex items-start gap-3 text-left"><AlertTriangle className="shrink-0" size={20}/> {error}</div>}
                <button onClick={handleImport} disabled={loading} className="w-full flex items-center justify-center gap-3 py-5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl disabled:opacity-70 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                    {loading ? <Loader2 size={24} className="animate-spin" /> : <FolderDown size={24} />}
                    {loading ? "Copie des fichiers..." : "Sélectionner le dossier source"}
                </button>
            </div>
        </div>
    );
};

