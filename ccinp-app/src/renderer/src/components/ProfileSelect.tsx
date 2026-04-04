import React, {useState} from "react";
import {BrainCircuit, Ghost, Trash2, UserPlus} from "lucide-react";
import {Modal} from "./SharedUI";
import {UserProfile} from "../types";

interface ProfileSelectProps {
    profiles: UserProfile[];
    onSelect: (p: UserProfile) => void;
    onCreate: (name: string) => void;
    onDelete: (id: string) => void;
}

export const ProfileSelect: React.FC<ProfileSelectProps> = ({ profiles, onSelect, onCreate, onDelete }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim()) {
            onCreate(newName.trim());
            setIsCreating(false);
            setNewName('');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30"></div>

            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
                <BrainCircuit size={40} className="text-indigo-400" />
                <h1 className="text-4xl font-black tracking-tighter text-white italic">CCINP <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Entrainement</span></h1>
            </div>

            <h2 className="text-4xl md:text-5xl font-black mb-16 tracking-tight relative z-10 mt-20">Qui s'entraîne aujourd'hui ?</h2>

            <div className="flex flex-wrap justify-center gap-10 max-w-5xl relative z-10">
                {profiles.map(p => (
                    <div key={p.id} className="flex flex-col items-center group relative">
                        {!p.isIncognito && profiles.length > 1 && (
                            <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} className="absolute -top-3 -right-3 bg-red-500 p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg hover:bg-red-600 hover:scale-110">
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => onSelect(p)}
                            className={`w-40 h-40 rounded-[2.5rem] flex items-center justify-center text-5xl font-black shadow-2xl transition-all duration-300 transform group-hover:scale-105 group-hover:-translate-y-2 ${
                                p.isIncognito ? 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500 hover:text-slate-300' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 hover:shadow-indigo-500/50'
                            }`}
                        >
                            {p.isIncognito ? <Ghost size={64} strokeWidth={1.5} /> : p.name.substring(0, 2).toUpperCase()}
                        </button>
                        <span className={`mt-6 font-bold text-2xl tracking-wide transition-colors ${p.isIncognito ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-300 group-hover:text-white'}`}>
              {p.name}
            </span>
                    </div>
                ))}

                <div className="flex flex-col items-center group">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-40 h-40 rounded-[2.5rem] flex items-center justify-center text-slate-400 bg-slate-900/50 backdrop-blur-sm transition-all duration-300 border-2 border-dashed border-slate-700 hover:border-slate-400 hover:bg-slate-800 transform group-hover:scale-105 group-hover:-translate-y-2"
                    >
                        <UserPlus size={56} strokeWidth={1.5} />
                    </button>
                    <span className="mt-6 font-bold text-2xl tracking-wide text-slate-500 group-hover:text-slate-300">Nouveau</span>
                </div>
            </div>

            <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Nouveau profil">
                <form onSubmit={handleCreate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-3">Prénom ou Pseudo</label>
                        <input
                            autoFocus type="text" placeholder="Ex: Marie..." value={newName} onChange={e => setNewName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 text-lg font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-inner"
                        />
                    </div>
                    <button type="submit" disabled={!newName.trim()} className="w-full py-4 rounded-2xl font-black text-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-all shadow-xl hover:shadow-2xl">
                        Créer et s'entraîner
                    </button>
                </form>
            </Modal>
        </div>
    );
};