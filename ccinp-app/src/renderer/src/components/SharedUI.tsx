import {
    BrainCircuit,
    FunctionSquare,
    Infinity as InfinityIcon,
    Maximize,
    Minus,
    Pi,
    Sigma, X,
    XCircle
} from "lucide-react";
import React from "react";
import {BACKGROUND_LOGOS} from "../data";

const ICONS = [BrainCircuit, Sigma, Pi, InfinityIcon, FunctionSquare];

export const AnimatedBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <style>{`
      @keyframes float-rect {
        from { transform: translate(0vw, 0vh) rotate(0deg); }
        to { transform: translate(var(--tx), var(--ty)) rotate(var(--tr)); }
      }
    `}</style>
        {BACKGROUND_LOGOS.map((logo) => {
            const Icon = ICONS[logo.iconIndex];
            return (
                <div key={logo.id} className="absolute text-indigo-900/10" style={{
                    '--tx': `${logo.endX - logo.startX}vw`,
                    '--ty': `${logo.endY - logo.startY}vh`,
                    '--tr': `${logo.rot}deg`,
                    left: `${logo.startX}vw`, top: `${logo.startY}vh`,
                    animation: `float-rect ${logo.duration}s linear infinite alternate`,
                    animationDelay: `${logo.delay}s`
                } as React.CSSProperties}>
                    <Icon size={logo.size} strokeWidth={1.5} />
                </div>
            );
        })}
    </div>
);

export const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><XCircle size={24}/></button>
                </div>
                <div className="p-8">{children}</div>
            </div>
        </div>
    );
};

export const CustomTitleBar = () => (
    <div className="h-10 w-full bg-slate-950 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-[100] text-slate-400 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="ml-16 flex items-center gap-3 text-xs font-bold tracking-widest uppercase">
            <BrainCircuit size={16} className="text-indigo-500"/> CCINP Trainer
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button onClick={() => window.api?.windowMin?.()} className="p-2 hover:bg-slate-800 hover:text-white rounded transition-colors"><Minus size={14}/></button>
            <button onClick={() => window.api?.windowMax?.()} className="p-2 hover:bg-slate-800 hover:text-white rounded transition-colors"><Maximize size={14}/></button>
            <button onClick={() => window.api?.windowClose?.()} className="p-2 hover:bg-red-500 hover:text-white rounded transition-colors"><X size={14}/></button>
        </div>
    </div>
);