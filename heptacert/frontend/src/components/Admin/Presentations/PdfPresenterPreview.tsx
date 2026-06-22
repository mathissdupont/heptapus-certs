"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

type PdfPresenterPreviewProps = {
  fileUrl: string;
  pageIndex: number;
  requestHeaders?: Record<string, string>;
  currentLabel: string;
  nextLabel: string;
  loadingLabel: string;
  unavailableLabel: string;
  onPageCountChange?: (pageCount: number) => void;
};

function pageNumber(pageIndex: number, pageCount: number) {
  return Math.min(Math.max(pageIndex + 1, 1), Math.max(pageCount, 1));
}

function PreviewCanvas({
  pdf,
  pageIndex,
  pageCount,
  label,
}: {
  pdf: any;
  pageIndex: number;
  pageCount: number;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateSize = () => setSize({ width: container.clientWidth, height: container.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdf || !canvas || !size.width || !size.height) return;
    let cancelled = false;

    async function render() {
      try {
        renderTaskRef.current?.cancel?.();
        const page = await pdf.getPage(pageNumber(pageIndex, pageCount));
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(size.width / viewport.width, size.height / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const activeCanvas = canvasRef.current;
        const context = activeCanvas?.getContext("2d");
        if (!activeCanvas || !context) return;

        activeCanvas.width = Math.floor(scaledViewport.width * outputScale);
        activeCanvas.height = Math.floor(scaledViewport.height * outputScale);
        activeCanvas.style.width = `${Math.floor(scaledViewport.width)}px`;
        activeCanvas.style.height = `${Math.floor(scaledViewport.height)}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, scaledViewport.width, scaledViewport.height);

        const task = page.render({ canvasContext: context, viewport: scaledViewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (ex: any) {
        if (ex?.name !== "RenderingCancelledException") {
          // Preview is non-critical; keep controls usable even if rendering fails.
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [pageCount, pageIndex, pdf, size.height, size.width]);

  return (
    <div className="min-w-0">
      <p className="mb-2 text-11 font-black uppercase tracking-[0.18em] text-surface-400">{label}</p>
      <div ref={containerRef} className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-surface-200 bg-white">
        <canvas ref={canvasRef} aria-label={label} className="max-h-full max-w-full bg-white" />
      </div>
    </div>
  );
}

export default function PdfPresenterPreview({
  fileUrl,
  pageIndex,
  requestHeaders,
  currentLabel,
  nextLabel,
  loadingLabel,
  unavailableLabel,
  onPageCountChange,
}: PdfPresenterPreviewProps) {
  const pdfRef = useRef<any>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;

    setPdf(null);
    setPageCount(0);
    setLoading(true);
    setFailed(false);
    pdfRef.current = null;

    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        loadingTask = pdfjs.getDocument({
          url: fileUrl,
          httpHeaders: requestHeaders,
          rangeChunkSize: 1024 * 512,
          disableAutoFetch: false,
          disableStream: false,
        });
        const nextPdf = await loadingTask.promise;
        if (cancelled) {
          await nextPdf.destroy();
          return;
        }
        pdfRef.current = nextPdf;
        setPdf(nextPdf);
        setPageCount(nextPdf.numPages);
        onPageCountChange?.(nextPdf.numPages);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
      pdfRef.current?.destroy?.();
      pdfRef.current = null;
    };
  }, [fileUrl, onPageCountChange, requestHeaders]);

  if (loading) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-surface-400" />
        <span className="text-sm font-bold text-surface-500">{loadingLabel}</span>
      </div>
    );
  }

  if (failed || !pdf || pageCount <= 0) {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-surface-200 bg-white p-5 text-center shadow-sm">
        <FileText className="mb-2 h-6 w-6 text-surface-300" />
        <p className="text-sm font-bold text-surface-500">{unavailableLabel}</p>
      </div>
    );
  }

  const hasNext = pageIndex + 1 < pageCount;

  return (
    <section className="grid grid-cols-2 gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-sm">
      <PreviewCanvas pdf={pdf} pageIndex={pageIndex} pageCount={pageCount} label={currentLabel} />
      {hasNext ? (
        <PreviewCanvas pdf={pdf} pageIndex={pageIndex + 1} pageCount={pageCount} label={nextLabel} />
      ) : (
        <div className="min-w-0">
          <p className="mb-2 text-11 font-black uppercase tracking-[0.18em] text-surface-400">{nextLabel}</p>
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50 text-xs font-bold text-surface-400">
            {unavailableLabel}
          </div>
        </div>
      )}
    </section>
  );
}
