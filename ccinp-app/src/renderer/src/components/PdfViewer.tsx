import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, MousePointer2, Pen, Eraser, Undo2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PdfViewerProps {
    url: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
    const [zoom, setZoom] = useState(1);
    const [numPages, setNumPages] = useState<number>(1);
    const [pageNumber, setPageNumber] = useState<number>(1);

    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(800);

    const [drawMode, setDrawMode] = useState(false);
    const [tool, setTool] = useState<'pen'|'eraser'>('pen');
    const [color, setColor] = useState('#ef4444');
    const [strokes, setStrokes] = useState<any[]>([]);
    const [currentStroke, setCurrentStroke] = useState<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                setContainerWidth(entries[0].contentRect.width - 32);
            }
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        setStrokes([]);
        setZoom(1);
        setPageNumber(1);
    }, [url]);

    useEffect(() => {
        const handleUndo = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                setStrokes(prev => prev.slice(0, -1));
            }
        };
        window.addEventListener('keydown', handleUndo);
        return () => window.removeEventListener('keydown', handleUndo);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        strokes.forEach(stroke => {
            ctx.beginPath();
            ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

            const scaleFactor = rect.width / 800;
            ctx.lineWidth = (stroke.tool === 'eraser' ? 30 : 3) * scaleFactor;

            stroke.points.forEach((pt: any, i: number) => {
                const px = pt.x * rect.width;
                const py = pt.y * rect.height;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
        });
    }, [strokes, zoom, drawMode, containerWidth]);

    const getNormalizedCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawMode) return;
        const { x, y } = getNormalizedCoordinates(e);
        setCurrentStroke({ tool, color, points: [{ x, y }] });
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawMode || !currentStroke) return;
        const { x, y } = getNormalizedCoordinates(e);
        setCurrentStroke({ ...currentStroke, points: [...currentStroke.points, { x, y }] });

        const ctx = canvasRef.current?.getContext('2d');
        const rect = canvasRef.current?.getBoundingClientRect();
        if (ctx && rect) {
            ctx.beginPath();
            const lastPt = currentStroke.points[currentStroke.points.length - 1];
            ctx.moveTo(lastPt.x * rect.width, lastPt.y * rect.height);
            ctx.lineTo(x * rect.width, y * rect.height);
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
            const scaleFactor = rect.width / 800;
            ctx.lineWidth = (tool === 'eraser' ? 30 : 3) * scaleFactor;
            ctx.stroke();
        }
    };

    const endDrawing = () => {
        if (!drawMode || !currentStroke) return;
        setStrokes([...strokes, currentStroke]);
        setCurrentStroke(null);
    };

    const eraserSize = 30 * zoom;
    const halfSize = eraserSize / 2;
    const eraserSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${eraserSize}" height="${eraserSize}" viewBox="0 0 ${eraserSize} ${eraserSize}"><circle cx="${halfSize}" cy="${halfSize}" r="${halfSize - 1}" fill="rgba(0,0,0,0.05)" stroke="gray" stroke-width="1"/></svg>`;
    const eraserCursorUrl = `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(eraserSvg)}') ${halfSize} ${halfSize}, auto`;

    return (
        <div className="flex-1 flex flex-col relative z-0 bg-white overflow-hidden w-full h-full border-r border-slate-200">

            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex bg-white/95 backdrop-blur-md shadow-xl rounded-xl border border-slate-200 flex-wrap justify-end">

                {numPages > 1 && (
                    <div className="flex items-center p-1 border-r border-slate-200 bg-slate-50/50 rounded-l-xl">
                        <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} className="p-2 hover:bg-slate-200 disabled:opacity-30 text-slate-700 rounded-lg"><ChevronLeft size={18}/></button>
                        <span className="text-xs font-bold text-slate-500 w-12 text-center">{pageNumber}/{numPages}</span>
                        <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)} className="p-2 hover:bg-slate-200 disabled:opacity-30 text-slate-700 rounded-lg"><ChevronRight size={18}/></button>
                    </div>
                )}

                <div className="flex items-center p-1 border-r border-slate-200 bg-slate-50/50">
                    <button onClick={() => setDrawMode(false)} className={`p-2 rounded-lg transition-colors ${!drawMode ? 'bg-indigo-100 text-indigo-600 shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`} title="Mode Curseur"><MousePointer2 size={18}/></button>
                    <button onClick={() => {setDrawMode(true); setTool('pen');}} className={`p-2 rounded-lg transition-colors ${drawMode && tool === 'pen' ? 'bg-indigo-100 text-indigo-600 shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`} title="Stylo"><Pen size={18}/></button>
                    <button onClick={() => {setDrawMode(true); setTool('eraser');}} className={`p-2 rounded-lg transition-colors ${drawMode && tool === 'eraser' ? 'bg-indigo-100 text-indigo-600 shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`} title="Gomme"><Eraser size={18}/></button>

                    <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out h-8 ${drawMode && tool === 'pen' ? 'max-w-[150px] opacity-100 ml-2 pl-2 border-l border-slate-300' : 'max-w-0 opacity-0 ml-0 pl-0 border-transparent'}`}>
                        {['#ef4444', '#3b82f6', '#10b981', '#1e293b'].map(c => (
                            <button key={c} onClick={() => setColor(c)} className={`shrink-0 w-5 h-5 mx-1 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-slate-400 shadow-sm' : 'border-transparent'}`} style={{backgroundColor: c}}></button>
                        ))}
                    </div>

                    <button onClick={() => setStrokes(prev => prev.slice(0, -1))} disabled={strokes.length === 0} className="p-2 ml-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 disabled:opacity-30" title="Annuler Ctrl+Z"><Undo2 size={18}/></button>
                </div>

                <div className="flex items-center p-1 bg-slate-50/50 rounded-r-xl">
                    <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700"><ZoomOut size={18}/></button>
                    <div className="w-px h-5 bg-slate-300 mx-1"></div>
                    <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700"><ZoomIn size={18}/></button>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 w-full h-full overflow-auto custom-scrollbar bg-white p-4">
                <div className="min-w-fit min-h-full flex flex-col" style={{ alignItems: zoom > 1 ? 'flex-start' : 'center', justifyContent: 'center' }}>
                    <Document
                        file={url}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        loading={<div className="flex flex-col items-center justify-center text-slate-400 h-[50vh] w-[50vw]"><Loader2 className="animate-spin mb-4" size={32}/>Chargement...</div>}
                    >
                        <div className="relative shadow-sm border border-slate-200 bg-white group">
                            <Page
                                pageNumber={pageNumber}
                                width={containerWidth}
                                scale={zoom}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />

                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={endDrawing}
                                onMouseLeave={endDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={endDrawing}
                                style={{
                                    touchAction: drawMode ? 'none' : 'auto',
                                    cursor: drawMode ? (tool === 'eraser' ? eraserCursorUrl : 'crosshair') : 'auto'
                                }}
                                className={`absolute inset-0 w-full h-full ${drawMode ? 'pointer-events-auto z-10' : 'pointer-events-none z-0'}`}
                            />
                        </div>
                    </Document>
                </div>
            </div>
        </div>
    );
};