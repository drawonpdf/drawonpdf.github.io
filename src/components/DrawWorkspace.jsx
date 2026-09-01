import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Pencil,
  Highlighter,
  Eraser,
  Hand,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ui, defaultLang } from '../i18n/ui';

// Safely resolve pdfjs-dist in the browser
let pdfjsLib = null;

const PEN_SIZES = [
  { id: 'thin', labelKey: 'penSizeThin', value: 2 },
  { id: 'medium', labelKey: 'penSizeMedium', value: 6 },
  { id: 'thick', labelKey: 'penSizeThick', value: 12 },
  { id: 'extra', labelKey: 'penSizeExtraThick', value: 24 }
];

const PRESET_COLORS = [
  { name: 'Sage Teal', hex: '#659287' },
  { name: 'Seafoam', hex: '#88BDA4' },
  { name: 'Mint Soft', hex: '#B1D3B9' },
  { name: 'Black', hex: '#0f172a' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Yellow', hex: '#eab308' },
];

export default function DrawWorkspace({ lang = 'en' }) {
  const t = (key) => (ui[lang] && ui[lang][key]) || ui[defaultLang][key] || key;

  // Board & Tool states
  const [boardMode, setBoardMode] = useState('whiteboard'); // 'whiteboard' | 'blackboard' | 'greenboard' | 'pdf'
  const [activeTool, setActiveTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser' | 'pan'
  const [penColor, setPenColor] = useState('#0f172a');
  const [penSize, setPenSize] = useState(6);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // PDF states
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusText, setExportStatusText] = useState('');

  // Per-page stroke history: { [pageNum: number]: Stroke[] }
  const [pageStrokes, setPageStrokes] = useState({ 1: [] });
  // Per-page redo stack: { [pageNum: number]: Stroke[] }
  const [pageRedoStacks, setPageRedoStacks] = useState({ 1: [] });

  // UI Popovers
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Canvas DOM references
  const containerRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Drawing runtime state refs
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const currentStrokeRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Dimensions state (in CSS pixels) - defaults to expansive device size
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1400, height: 850 });

  // Initialize PDF.js worker locally from project
  useEffect(() => {
    async function initPdfJs() {
      try {
        if (!pdfjsLib) {
          const pdfjs = await import('pdfjs-dist/build/pdf.js');
          pdfjsLib = pdfjs;
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }
      } catch (err) {
        console.warn('Failed to load pdfjs-dist dynamically:', err);
      }
    }
    initPdfJs();
  }, []);

  // Update default pen color when board mode changes to maintain contrast
  useEffect(() => {
    if (boardMode === 'blackboard' || boardMode === 'greenboard') {
      if (penColor === '#0f172a') {
        setPenColor('#ffffff');
      }
    } else {
      if (penColor === '#ffffff') {
        setPenColor('#0f172a');
      }
    }
  }, [boardMode]);

  // Adjust canvas size to full device size on window resize
  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;

        if (boardMode !== 'pdf') {
          // Full size of user device workspace
          setCanvasDimensions({
            width: Math.max(320, containerW),
            height: Math.max(320, containerH)
          });
        } else if (pdfDoc) {
          // Fit PDF page to available screen size
          pdfDoc.getPage(currentPage).then((page) => {
            const unscaledViewport = page.getViewport({ scale: 1.0 });
            const scaleW = (containerW - 32) / unscaledViewport.width;
            const scaleH = (containerH - 40) / unscaledViewport.height;
            const scale = Math.max(0.2, Math.min(scaleW, scaleH));
            const viewport = page.getViewport({ scale });
            setCanvasDimensions({
              width: Math.round(viewport.width),
              height: Math.round(viewport.height)
            });
          });
        }
      }
    }
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [boardMode, pdfDoc, currentPage]);

  // Setup HiDPI Canvases and redraw when dimensions, boardMode, or currentPage change
  const renderBackground = useCallback(async () => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    if (boardMode === 'pdf' && pdfDoc) {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        
        // Calculate fitting scale so the full PDF page is visible and centered
        const containerW = containerRef.current ? Math.max(300, containerRef.current.clientWidth - 32) : 1000;
        const containerH = containerRef.current ? Math.max(350, containerRef.current.clientHeight - 32) : 700;

        const scaleW = containerW / unscaledViewport.width;
        const scaleH = containerH / unscaledViewport.height;
        const scale = Math.min(2.0, Math.max(0.3, Math.min(scaleW, scaleH)));
        const viewport = page.getViewport({ scale });

        const width = Math.round(viewport.width);
        const height = Math.round(viewport.height);
        
        setCanvasDimensions((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });

        bgCanvas.width = Math.round(width * dpr);
        bgCanvas.height = Math.round(height * dpr);
        bgCanvas.style.width = `${width}px`;
        bgCanvas.style.height = `${height}px`;

        ctx.save();
        ctx.scale(dpr, dpr);

        // Cancel previous render task if active
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
        }

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
        ctx.restore();
      } catch (err) {
        if (err && err.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    } else {
      // Blank board rendering
      const { width, height } = canvasDimensions;
      bgCanvas.width = Math.round(width * dpr);
      bgCanvas.height = Math.round(height * dpr);
      bgCanvas.style.width = `${width}px`;
      bgCanvas.style.height = `${height}px`;

      ctx.save();
      ctx.scale(dpr, dpr);

      if (boardMode === 'whiteboard') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Faint modern dot grid using soft mint theme
        ctx.fillStyle = '#B1D3B9';
        const spacing = 32;
        for (let x = spacing; x < width; x += spacing) {
          for (let y = spacing; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (boardMode === 'blackboard') {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, width, height);
      } else if (boardMode === 'greenboard') {
        ctx.fillStyle = '#275c46';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }
  }, [boardMode, pdfDoc, currentPage, canvasDimensions]);

  // Redraw annotations on drawCanvas
  const redrawDrawingCanvas = useCallback(() => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvasDimensions;

    drawCanvas.width = Math.round(width * dpr);
    drawCanvas.height = Math.round(height * dpr);
    drawCanvas.style.width = `${width}px`;
    drawCanvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const strokes = pageStrokes[currentPage] || [];
    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    ctx.restore();
  }, [canvasDimensions, currentPage, pageStrokes]);

  useEffect(() => {
    renderBackground();
  }, [renderBackground]);

  useEffect(() => {
    redrawDrawingCanvas();
  }, [redrawDrawingCanvas]);

  // Helper: Draw an individual stroke onto a 2D context
  const drawStroke = (ctx, stroke) => {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size;

    if (stroke.mode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (stroke.mode === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      // Use translucent alpha for highlighter
      ctx.strokeStyle = hexToRgba(stroke.color, 0.4);
      ctx.lineWidth = stroke.size * 2.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    if (stroke.points.length === 1) {
      ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        const p1 = stroke.points[i - 1];
        const p2 = stroke.points[i];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
    }

    ctx.stroke();
    ctx.restore();
  };

  // Convert hex color to rgba
  const hexToRgba = (hex, alpha) => {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map((ch) => ch + ch).join('');
    }
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Pointer event handlers for drawing and panning
  const getCanvasCoords = (e) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Coordinates inside canvas element
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    // Scale by current zoom
    return {
      x: clientX / zoom,
      y: clientY / zoom
    };
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      try { e.preventDefault(); } catch (err) {}
    }

    if (activeTool === 'pan' || e.button === 1 || e.altKey) {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {}
    isDrawingRef.current = true;

    const coords = getCanvasCoords(e);
    const newStroke = {
      mode: activeTool,
      color: penColor,
      size: penSize,
      points: [coords]
    };
    currentStrokeRef.current = newStroke;

    // Draw single initial point
    const drawCanvas = drawCanvasRef.current;
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      drawStroke(ctx, newStroke);
      ctx.restore();
    }
  };

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      try { e.preventDefault(); } catch (err) {}
    }
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y
      });
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    const coords = getCanvasCoords(e);
    currentStrokeRef.current.points.push(coords);

    // Incrementally render latest segment
    const drawCanvas = drawCanvasRef.current;
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      drawStroke(ctx, currentStrokeRef.current);
      ctx.restore();
    }
  };

  const handlePointerUp = (e) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokeRef.current) {
      const finishedStroke = currentStrokeRef.current;
      currentStrokeRef.current = null;

      // Add to page strokes history
      setPageStrokes((prev) => {
        const currentList = prev[currentPage] || [];
        return {
          ...prev,
          [currentPage]: [...currentList, finishedStroke]
        };
      });

      // Clear redo stack on new stroke
      setPageRedoStacks((prev) => ({
        ...prev,
        [currentPage]: []
      }));
    }
  };

  // Undo / Redo / Clear Actions
  const handleUndo = () => {
    const strokes = pageStrokes[currentPage] || [];
    if (strokes.length === 0) return;

    const lastStroke = strokes[strokes.length - 1];
    const newStrokes = strokes.slice(0, -1);

    setPageStrokes((prev) => ({ ...prev, [currentPage]: newStrokes }));
    setPageRedoStacks((prev) => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), lastStroke]
    }));
  };

  const handleRedo = () => {
    const redoStack = pageRedoStacks[currentPage] || [];
    if (redoStack.length === 0) return;

    const restoredStroke = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setPageRedoStacks((prev) => ({ ...prev, [currentPage]: newRedoStack }));
    setPageStrokes((prev) => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), restoredStroke]
    }));
  };

  const handleClear = () => {
    if (window.confirm(t('clearConfirm'))) {
      setPageStrokes((prev) => ({ ...prev, [currentPage]: [] }));
      setPageRedoStacks((prev) => ({ ...prev, [currentPage]: [] }));
    }
  };

  // Zoom Actions
  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // PDF File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert(t('pdfLoadError'));
      return;
    }

    setIsLoadingPdf(true);
    setPdfFileName(file.name);

    try {
      if (!pdfjsLib) {
        const pdfjs = await import('pdfjs-dist/build/pdf.js');
        pdfjsLib = pdfjs;
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      setPdfDoc(loadedPdf);
      setNumPages(loadedPdf.numPages);
      setCurrentPage(1);
      setBoardMode('pdf');
      setPageStrokes({ 1: [] });
      setPageRedoStacks({ 1: [] });
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch (err) {
      console.error('Failed to parse PDF:', err);
      alert(t('pdfLoadError'));
    } finally {
      setIsLoadingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Multi-Page Navigation
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  // Export as Merged PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportStatusText(t('generatingPdf'));
    setShowExportMenu(false);

    try {
      const dpr = 2; // High-res export factor

      if (boardMode === 'pdf' && pdfDoc) {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4'
        });

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });

          // Offscreen Canvas for PDF page
          const offBg = document.createElement('canvas');
          offBg.width = viewport.width * dpr;
          offBg.height = viewport.height * dpr;
          const bgCtx = offBg.getContext('2d');
          bgCtx.scale(dpr, dpr);

          await page.render({
            canvasContext: bgCtx,
            viewport: viewport
          }).promise;

          // Composite Drawing Strokes for this page
          const strokesForPage = pageStrokes[pageNum] || [];
          if (strokesForPage.length > 0) {
            bgCtx.save();
            strokesForPage.forEach((s) => drawStroke(bgCtx, s));
            bgCtx.restore();
          }

          const imgData = offBg.toDataURL('image/jpeg', 0.92);
          const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';

          if (pageNum > 1) {
            doc.addPage([viewport.width, viewport.height], orientation);
          } else {
            // First page setup
            doc.deletePage(1);
            doc.addPage([viewport.width, viewport.height], orientation);
          }

          doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
        }

        const cleanName = pdfFileName.replace(/\.pdf$/i, '');
        doc.save(`annotated_${cleanName || 'document'}.pdf`);
      } else {
        // Blank Board Mode PDF Export
        const { width, height } = canvasDimensions;
        const orientation = width > height ? 'landscape' : 'portrait';
        const doc = new jsPDF({
          orientation,
          unit: 'pt',
          format: [width, height]
        });

        // Composite background + drawings
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width * dpr;
        offCanvas.height = height * dpr;
        const ctx = offCanvas.getContext('2d');
        ctx.scale(dpr, dpr);

        if (boardMode === 'whiteboard') {
          ctx.fillStyle = '#ffffff';
        } else if (boardMode === 'blackboard') {
          ctx.fillStyle = '#1e1e1e';
        } else {
          ctx.fillStyle = '#275c46';
        }
        ctx.fillRect(0, 0, width, height);

        const strokes = pageStrokes[currentPage] || [];
        strokes.forEach((s) => drawStroke(ctx, s));

        const imgData = offCanvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData, 'JPEG', 0, 0, width, height);
        doc.save(`drawonpdf_${boardMode}_export.pdf`);
      }
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Could not export PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setExportStatusText('');
    }
  };

  // Export as PNG Image
  const handleExportPng = () => {
    setIsExporting(true);
    setExportStatusText(t('exportingImage'));
    setShowExportMenu(false);

    try {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvasDimensions;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = Math.round(width * dpr);
      offCanvas.height = Math.round(height * dpr);
      const ctx = offCanvas.getContext('2d');

      // Draw background
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
      }
      // Draw annotations
      if (drawCanvasRef.current) {
        ctx.drawImage(drawCanvasRef.current, 0, 0);
      }

      const link = document.createElement('a');
      link.download = `drawonpdf_${boardMode}_page${currentPage}.png`;
      link.href = offCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export PNG error:', err);
      alert('Could not export PNG. Please try again.');
    } finally {
      setIsExporting(false);
      setExportStatusText('');
    }
  };

  const hasUndo = (pageStrokes[currentPage] || []).length > 0;
  const hasRedo = (pageRedoStacks[currentPage] || []).length > 0;

  return (
    <section className="relative w-full flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Workspace Bar: Board Selector & Status */}
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-4 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 z-20">
        {/* Board Mode Switcher */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setBoardMode('whiteboard')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              boardMode === 'whiteboard'
                ? 'bg-white dark:bg-slate-900 text-[#659287] dark:text-[#88BDA4] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shrink-0"></span>
            <span className="hidden sm:inline">{t('boardWhiteboard')}</span>
            <span className="sm:hidden text-[11px]">White</span>
          </button>

          <button
            type="button"
            onClick={() => setBoardMode('blackboard')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              boardMode === 'blackboard'
                ? 'bg-white dark:bg-slate-900 text-[#659287] dark:text-[#88BDA4] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e1e1e] border border-slate-600 shrink-0"></span>
            <span className="hidden sm:inline">{t('boardBlackboard')}</span>
            <span className="sm:hidden text-[11px]">Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setBoardMode('greenboard')}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              boardMode === 'greenboard'
                ? 'bg-white dark:bg-slate-900 text-[#659287] dark:text-[#88BDA4] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#275c46] shrink-0"></span>
            <span className="hidden sm:inline">{t('boardGreenboard')}</span>
            <span className="sm:hidden text-[11px]">Chalk</span>
          </button>

          {/* Upload PDF Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              boardMode === 'pdf'
                ? 'bg-[#659287] text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-[#E6F2DD] dark:hover:bg-[#659287]/20'
            }`}
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('uploadPdf')}</span>
            <span className="sm:hidden text-[11px]">PDF</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Multi-Page PDF Pagination (Shown only if PDF loaded) */}
        {boardMode === 'pdf' && numPages > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={handlePrevPage}
              className="p-1 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={t('prevPage')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('page')} {currentPage} {t('of')} {numPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={handleNextPage}
              className="p-1 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={t('nextPage')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Zoom & Export Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={t('zoomOut')}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              title={t('resetZoom')}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={t('zoomIn')}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              aria-haspopup="true"
              aria-expanded={showExportMenu}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#659287] hover:bg-[#507c72] text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{t('exportDropdown')}</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-[#E6F2DD] dark:hover:bg-[#659287]/20 rounded-xl transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span>{t('exportPdf')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPng}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-[#E6F2DD] dark:hover:bg-[#659287]/20 rounded-xl transition-colors text-left"
                >
                  <Download className="w-4 h-4 text-[#659287]" />
                  <span>{t('exportPng')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Scroll / Viewport Area - Full Device Size */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center cursor-crosshair"
        style={{ cursor: activeTool === 'pan' ? 'grab' : 'crosshair' }}
      >
        {/* Loading Overlay */}
        {(isLoadingPdf || isExporting) && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-40">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl flex items-center gap-3 border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-6 h-6 text-[#659287] animate-spin" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {exportStatusText || 'Loading PDF...'}
              </span>
            </div>
          </div>
        )}

        {/* Board Outer Container - Full size of user device */}
        <div
          className={`relative transition-transform duration-75 origin-center ${
            boardMode === 'pdf'
              ? 'm-auto shrink-0 shadow-2xl rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden'
              : 'w-full h-full'
          }`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: `${canvasDimensions.width}px`,
            height: `${canvasDimensions.height}px`
          }}
        >
          {/* Background Canvas: renders PDF page or board fill */}
          <canvas
            ref={bgCanvasRef}
            className="absolute inset-0 block w-full h-full"
            style={{ width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px` }}
          />

          {/* Drawing Canvas: receives all user pen & highlighter inputs */}
          <canvas
            ref={drawCanvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 block touch-none z-10 w-full h-full"
            style={{ width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px` }}
          />
        </div>
      </div>

      {/* Floating Modern Glassmorphic Drawing Toolbar */}
      <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-1.5 p-1 sm:p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/80 shadow-2xl max-w-[calc(100vw-12px)]">
        {/* Pen Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('pen')}
          className={`p-2 sm:p-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'pen'
              ? 'bg-[#659287] text-white shadow-md scale-105'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={t('modePen')}
        >
          <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Highlighter Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('highlighter')}
          className={`p-2 sm:p-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'highlighter'
              ? 'bg-[#659287] text-white shadow-md scale-105'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={t('modeHighlighter')}
        >
          <Highlighter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Eraser Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('eraser')}
          className={`p-2 sm:p-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'eraser'
              ? 'bg-[#659287] text-white shadow-md scale-105'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={t('modeEraser')}
        >
          <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Pan Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('pan')}
          className={`p-2 sm:p-2.5 rounded-xl transition-all shrink-0 ${
            activeTool === 'pan'
              ? 'bg-[#659287] text-white shadow-md scale-105'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={t('modePan')}
        >
          <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <div className="w-px h-5 sm:h-6 bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1 shrink-0"></div>

        {/* Color Palette Popover Trigger */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowSizePicker(false);
            }}
            aria-haspopup="true"
            aria-expanded={showColorPicker}
            className="p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            title={t('customColor')}
          >
            <span
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
              style={{ backgroundColor: penColor }}
            />
          </button>

          {showColorPicker && (
            <div className="absolute bottom-12 sm:bottom-14 left-1/2 -translate-x-1/2 p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 z-50 w-44 max-w-[calc(100vw-32px)]">
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setPenColor(c.hex);
                      setShowColorPicker(false);
                    }}
                    className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {penColor === c.hex && (
                      <Check
                        className={`w-4 h-4 ${
                          c.hex === '#ffffff' || c.hex === '#eab308' ? 'text-black' : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {penColor.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pen Size Popover Trigger */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowSizePicker(!showSizePicker);
              setShowColorPicker(false);
            }}
            aria-haspopup="true"
            aria-expanded={showSizePicker}
            className="px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 sm:gap-1.5"
            title="Pen Size"
          >
            <span
              className="rounded-full bg-slate-900 dark:bg-white shrink-0"
              style={{ width: `${Math.min(12, Math.max(3, penSize))}px`, height: `${Math.min(12, Math.max(3, penSize))}px` }}
            />
            <span>{penSize}px</span>
          </button>

          {showSizePicker && (
            <div className="absolute bottom-12 sm:bottom-14 left-1/2 -translate-x-1/2 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1 z-50 w-36 max-w-[calc(100vw-32px)]">
              {PEN_SIZES.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => {
                    setPenSize(size.value);
                    setShowSizePicker(false);
                  }}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    penSize === size.value
                      ? 'bg-[#E6F2DD] dark:bg-[#659287]/20 text-[#659287] dark:text-[#88BDA4]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{t(size.labelKey)}</span>
                  <span
                    className="rounded-full bg-current"
                    style={{ width: `${size.value}px`, height: `${size.value}px` }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 sm:h-6 bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1 shrink-0"></div>

        {/* Undo Button */}
        <button
          type="button"
          disabled={!hasUndo}
          onClick={handleUndo}
          className="p-2 sm:p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          title={t('undo')}
        >
          <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Redo Button */}
        <button
          type="button"
          disabled={!hasRedo}
          onClick={handleRedo}
          className="p-2 sm:p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          title={t('redo')}
        >
          <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Clear Canvas Button */}
        <button
          type="button"
          onClick={handleClear}
          className="p-2 sm:p-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
          title={t('clearCanvas')}
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </section>
  );
}
