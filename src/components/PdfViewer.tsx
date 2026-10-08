import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Trash2,
  RotateCw,
  FileText,
  MousePointer,
  CheckCircle2,
  Upload,
  AlertCircle,
  Plus,
  Layers,
  ChevronUp,
  ChevronDown,
  Navigation
} from 'lucide-react';
import { pdfjsLib } from '../utils/pdfWorker';
import { SignatureItem, SignatureTemplate } from '../types';

interface PdfViewerProps {
  originalBytes: Uint8Array;
  signatures: SignatureItem[];
  onUpdateSignatures: (signatures: SignatureItem[]) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  activeSignatureTemplate: SignatureTemplate | null;
  onOpenSignatureModal: () => void;
  onUploadNewPdf?: (file: File) => void;
}

/**
 * Individual Page Component for continuous multi-page rendering
 */
const PdfPageCard: React.FC<{
  pageNum: number;
  totalPages: number;
  pdfDoc: any;
  zoom: number;
  signaturesOnPage: SignatureItem[];
  allSignatures: SignatureItem[];
  onUpdateAllSignatures: (signatures: SignatureItem[]) => void;
  activeSignatureTemplate: SignatureTemplate | null;
  selectedSigId: string | null;
  onSelectSigId: (id: string | null) => void;
}> = ({
  pageNum,
  totalPages,
  pdfDoc,
  zoom,
  signaturesOnPage,
  allSignatures,
  onUpdateAllSignatures,
  activeSignatureTemplate,
  selectedSigId,
  onSelectSigId,
}) => {
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 595.28, height: 841.89 });
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Dragging and resizing signature state
  const [dragState, setDragState] = useState<{
    sigId: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    aspectRatio: number;
  } | null>(null);

  // Render this specific page
  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;
    setIsRendering(true);

    const render = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        setPageSize({ width: unscaledViewport.width, height: unscaledViewport.height });

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const renderViewport = page.getViewport({ scale: zoom * pixelRatio });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        canvas.width = Math.round(renderViewport.width);
        canvas.height = Math.round(renderViewport.height);

        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx || isCancelled) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: renderViewport,
          canvas,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (isCancelled) return;

        // Render selectable text layer
        if (textLayerRef.current) {
          const textLayerDiv = textLayerRef.current;
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${unscaledViewport.width * zoom}px`;
          textLayerDiv.style.height = `${unscaledViewport.height * zoom}px`;

          try {
            const textContent = await page.getTextContent();
            if (!isCancelled) {
              textContent.items.forEach((item: any) => {
                if (!item.str || !item.transform) return;
                const [, , , scaleY, tx, ty] = item.transform;
                const span = document.createElement('span');
                span.textContent = item.str;
                span.style.position = 'absolute';
                const left = tx * zoom;
                const top = (unscaledViewport.height - ty - (item.height || Math.abs(scaleY))) * zoom;
                const fontSize = Math.abs(scaleY) * zoom;

                span.style.left = `${left}px`;
                span.style.top = `${top}px`;
                span.style.fontSize = `${fontSize}px`;
                span.style.fontFamily = 'Helvetica, Arial, sans-serif';
                span.style.color = 'transparent';
                span.style.pointerEvents = 'all';
                span.style.userSelect = 'text';
                span.className = 'select-text cursor-text';
                textLayerDiv.appendChild(span);
              });
            }
          } catch (e) {
            console.warn('Text layer render notice for page ' + pageNum, e);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNum} render error:`, err);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
          renderTaskRef.current = null;
        }
      }
    };

    render();
    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNum, zoom]);

  // Click on canvas to stamp active signature onto this page
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.signature-item-box')) return;
    if (dragState) return;

    if (activeSignatureTemplate) {
      const container = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - container.left;
      const clickY = e.clientY - container.top;

      let defaultW = 145;
      let defaultH = 55;

      const testImg = new Image();
      testImg.src = activeSignatureTemplate.dataUrl;
      if (testImg.naturalWidth && testImg.naturalHeight) {
        const ratio = testImg.naturalWidth / testImg.naturalHeight;
        defaultH = Math.max(25, Math.min(120, Math.round(defaultW / ratio)));
      }

      const pdfX = Math.max(5, Math.min(pageSize.width - defaultW - 5, clickX / zoom - defaultW / 2));
      const pdfY = Math.max(5, Math.min(pageSize.height - defaultH - 5, clickY / zoom - defaultH / 2));

      const newSig: SignatureItem = {
        id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        pageNumber: pageNum,
        x: Math.round(pdfX),
        y: Math.round(pdfY),
        width: defaultW,
        height: defaultH,
        rotation: 0,
        dataUrl: activeSignatureTemplate.dataUrl,
        label: activeSignatureTemplate.title || `Tanda Tangan Halaman ${pageNum}`,
      };

      onUpdateAllSignatures([...allSignatures, newSig]);
      onSelectSigId(newSig.id);
    }
  };

  const handleMouseMovePage = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeSignatureTemplate) return;
    const container = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - container.left,
      y: e.clientY - container.top,
    });
  };

  // Drag & Resize Handlers
  const startMove = (e: React.MouseEvent, sig: SignatureItem) => {
    e.stopPropagation();
    onSelectSigId(sig.id);
    setDragState({
      sigId: sig.id,
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      initialX: sig.x,
      initialY: sig.y,
      initialW: sig.width,
      initialH: sig.height,
      aspectRatio: sig.width / sig.height,
    });
  };

  const startResize = (e: React.MouseEvent, sig: SignatureItem) => {
    e.stopPropagation();
    onSelectSigId(sig.id);

    const testImg = new Image();
    testImg.src = sig.dataUrl;
    const ratio = (testImg.naturalWidth && testImg.naturalHeight)
      ? testImg.naturalWidth / testImg.naturalHeight
      : (sig.width / sig.height);

    setDragState({
      sigId: sig.id,
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      initialX: sig.x,
      initialY: sig.y,
      initialW: sig.width,
      initialH: sig.height,
      aspectRatio: ratio > 0 ? ratio : sig.width / sig.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      const deltaX = (e.clientX - dragState.startX) / zoom;
      const deltaY = (e.clientY - dragState.startY) / zoom;

      onUpdateAllSignatures(
        allSignatures.map((sig) => {
          if (sig.id !== dragState.sigId) return sig;

          if (dragState.mode === 'move') {
            const newX = Math.max(0, Math.min(pageSize.width - sig.width, dragState.initialX + deltaX));
            const newY = Math.max(0, Math.min(pageSize.height - sig.height, dragState.initialY + deltaY));
            return { ...sig, x: Math.round(newX), y: Math.round(newY) };
          } else {
            const newW = Math.max(45, Math.min(pageSize.width - sig.x, dragState.initialW + deltaX));
            const newH = Math.max(20, newW / dragState.aspectRatio);
            return { ...sig, width: Math.round(newW), height: Math.round(newH) };
          }
        })
      );
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, zoom, pageSize, allSignatures, onUpdateAllSignatures]);

  const handleDeleteSig = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateAllSignatures(allSignatures.filter((s) => s.id !== id));
    onSelectSigId(null);
  };

  const handleRotateSig = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onUpdateAllSignatures(
      allSignatures.map((s) => (s.id === id ? { ...s, rotation: ((s.rotation || 0) + 90) % 360 } : s))
    );
  };

  const pageWidthScaled = pageSize.width * zoom;
  const pageHeightScaled = pageSize.height * zoom;

  return (
    <div
      id={`pdf-page-${pageNum}`}
      className="flex flex-col items-center mb-8 scroll-mt-6"
    >
      {/* Page Header Bar */}
      <div
        className="flex items-center justify-between pb-2 text-xs text-slate-300"
        style={{ width: pageWidthScaled }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold bg-indigo-600/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
            Halaman {pageNum} dari {totalPages}
          </span>
          <span className="text-slate-400 text-[11px]">
            {Math.round(pageSize.width)} × {Math.round(pageSize.height)} pt
          </span>
          {signaturesOnPage.length > 0 && (
            <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              ✓ {signaturesOnPage.length} TTD
            </span>
          )}
        </div>

        {/* Quick Stamp to Page Center Button */}
        {activeSignatureTemplate && (
          <button
            type="button"
            onClick={() => {
              const defaultW = 140;
              const defaultH = 60;
              const centerPdfX = Math.round((pageSize.width - defaultW) / 2);
              const centerPdfY = Math.round((pageSize.height - defaultH) / 2);

              const newSig: SignatureItem = {
                id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                pageNumber: pageNum,
                x: centerPdfX,
                y: centerPdfY,
                width: defaultW,
                height: defaultH,
                rotation: 0,
                dataUrl: activeSignatureTemplate.dataUrl,
                label: activeSignatureTemplate.title,
              };

              onUpdateAllSignatures([...allSignatures, newSig]);
              onSelectSigId(newSig.id);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-[11px] transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Bubuhkan ke Halaman {pageNum}</span>
          </button>
        )}
      </div>

      {/* Page Canvas Container */}
      <div
        onClick={handlePageClick}
        onMouseMove={handleMouseMovePage}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setMousePos(null);
        }}
        className={`relative bg-white shadow-2xl transition-shadow select-none group/page border border-slate-700/60 rounded-xs ${
          activeSignatureTemplate ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{
          width: pageWidthScaled,
          height: pageHeightScaled,
        }}
      >
        {/* Ghost Cursor Preview when moving mouse over this page */}
        {activeSignatureTemplate && isHovering && mousePos && !dragState && (
          <div
            className="absolute pointer-events-none z-30 opacity-70 border-2 border-dashed border-indigo-600 rounded bg-indigo-50/20"
            style={{
              left: `${mousePos.x - (140 * zoom) / 2}px`,
              top: `${mousePos.y - (60 * zoom) / 2}px`,
              width: `${140 * zoom}px`,
              height: `${60 * zoom}px`,
            }}
          >
            <img
              src={activeSignatureTemplate.dataUrl}
              alt="Ghost preview"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Page Canvas (PDF Document Page) */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block pointer-events-none"
        />

        {/* Selectable text layer */}
        <div
          ref={textLayerRef}
          className="absolute inset-0 pointer-events-auto overflow-hidden opacity-100 z-10"
          style={{
            width: pageWidthScaled,
            height: pageHeightScaled,
          }}
        />

        {/* Loading Spinner */}
        {isRendering && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-40">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-700">
              Merender Halaman {pageNum}...
            </span>
          </div>
        )}

        {/* Signatures on this Page */}
        {signaturesOnPage.map((sig) => {
          const isSelected = selectedSigId === sig.id;
          const screenX = sig.x * zoom;
          const screenY = sig.y * zoom;
          const screenW = sig.width * zoom;
          const screenH = sig.height * zoom;

          return (
            <div
              key={sig.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSigId(sig.id);
              }}
              onMouseDown={(e) => startMove(e, sig)}
              className={`signature-item-box absolute z-20 group cursor-grab active:cursor-grabbing transition-shadow ${
                isSelected
                  ? 'ring-2 ring-indigo-600 shadow-2xl bg-indigo-500/10'
                  : 'hover:ring-2 hover:ring-indigo-400/80'
              }`}
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenW}px`,
                height: `${screenH}px`,
                transform: sig.rotation ? `rotate(${sig.rotation}deg)` : 'none',
                transformOrigin: 'center center',
              }}
            >
              <img
                src={sig.dataUrl}
                alt={sig.label || 'Tanda Tangan'}
                className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm"
                draggable={false}
              />

              {/* Floating controls toolbar on selected */}
              {isSelected && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="absolute -top-9 left-0 right-0 flex items-center justify-between pointer-events-auto z-30"
                >
                  <div className="bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow border border-slate-700 truncate max-w-[150px]">
                    {sig.label || 'Tanda Tangan'} ({sig.x}, {sig.y} pt)
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => handleRotateSig(sig.id, e)}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow"
                      title="Putar 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => handleDeleteSig(sig.id, e)}
                      className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow transition cursor-pointer"
                      title="Hapus tanda tangan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Resize Handle */}
              {isSelected && (
                <div
                  onMouseDown={(e) => startResize(e, sig)}
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik untuk mengubah ukuran tanda tangan"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PdfViewer: React.FC<PdfViewerProps> = ({
  originalBytes,
  signatures,
  onUpdateSignatures,
  currentPage,
  onPageChange,
  activeSignatureTemplate,
  onOpenSignatureModal,
  onUploadNewPdf,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = 100%
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);
  const [isDraggingPdfOver, setIsDraggingPdfOver] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setLoadError(null);

    const loadDoc = async () => {
      try {
        const data = originalBytes.slice(0);
        const loadingTask = pdfjsLib.getDocument({
          data,
        });
        const doc = await loadingTask.promise;
        if (isCancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to load PDF doc', err);
        setLoadError(err?.message || 'Gagal memuat dokumen PDF.');
        setIsLoading(false);
      }
    };

    loadDoc();
    return () => {
      isCancelled = true;
    };
  }, [originalBytes]);

  // Jump smoothly to a specific page
  const scrollToPage = (pageNum: number) => {
    onPageChange(pageNum);
    const element = document.getElementById(`pdf-page-${pageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Drag and drop file upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPdfOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingPdfOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPdfOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type === 'application/pdf') {
      onUploadNewPdf?.(files[0]);
    }
  };

  const pagesArray = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div
      className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag PDF Dropzone Overlay */}
      {isDraggingPdfOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/90 border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <Upload className="w-16 h-16 text-indigo-300 animate-bounce mb-3" />
          <h3 className="text-xl font-bold text-white">Lepaskan file PDF di sini</h3>
          <p className="text-sm text-indigo-200 mt-1">Dokumen baru akan langsung dibuka di editor</p>
        </div>
      )}

      {/* Main Top Viewer Toolbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-300 shrink-0">
        {/* Quick Page Jump Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-[50%] py-1">
          <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0">
            <Navigation className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lompat ke Halaman:</span>
          </span>

          <div className="flex items-center gap-1">
            {pagesArray.map((p) => {
              const sigsCount = signatures.filter((s) => s.pageNumber === p).length;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => scrollToPage(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    currentPage === p
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={`Lompat ke halaman ${p}`}
                >
                  <span>{p}</span>
                  {sigsCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>

          <span className="text-slate-500 font-mono text-xs">
            (Total {numPages} Halaman)
          </span>
        </div>

        {/* Text Layer Active Notice */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Semua halaman ditampilkan • Teks asli dapat diblok & dicopy</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Perkecil Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="w-12 text-center font-mono font-bold text-white">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Perbesar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoom(1.0)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition"
            title="Reset Zoom ke 100%"
          >
            100%
          </button>
        </div>
      </div>

      {/* Editor Main Canvas Scrollable Area (Continuous Multi-Page View) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex flex-col items-center bg-slate-950 relative scroll-smooth"
      >
        {loadError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md my-auto">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="text-base font-bold text-white">Gagal Membuka File PDF</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
            >
              Muat Ulang Halaman
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center my-auto text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm font-semibold">Memuat seluruh halaman dokumen PDF...</span>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* Banner Helper if Active Signature is Selected */}
            {activeSignatureTemplate && (
              <div className="sticky top-0 z-30 mb-6 bg-indigo-600/95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-2 border border-indigo-400/40">
                <MousePointer className="w-4 h-4 text-white animate-bounce" />
                <span>
                  TTD Aktif: <strong>{activeSignatureTemplate.title}</strong> — Klik di posisi mana saja pada halaman berapa pun untuk menempatkannya!
                </span>
              </div>
            )}

            {/* RENDER EVERY PAGE FROM 1 TO numPages */}
            {pagesArray.map((pageNum) => (
              <PdfPageCard
                key={`page-${pageNum}`}
                pageNum={pageNum}
                totalPages={numPages}
                pdfDoc={pdfDoc}
                zoom={zoom}
                signaturesOnPage={signatures.filter((s) => s.pageNumber === pageNum)}
                allSignatures={signatures}
                onUpdateAllSignatures={onUpdateSignatures}
                activeSignatureTemplate={activeSignatureTemplate}
                selectedSigId={selectedSigId}
                onSelectSigId={setSelectedSigId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Quick Placement Bar */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">Total Tanda Tangan:</span>
          <span className="font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            {signatures.length} TTD Terpasang
          </span>
          {activeSignatureTemplate && (
            <span className="text-indigo-300 font-medium truncate max-w-xs">
              • TTD Aktif: <strong className="text-white">{activeSignatureTemplate.title}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSignatureModal}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition"
          >
            Pilih / Upload TTD Lain
          </button>
        </div>
      </div>
    </div>
  );
};
