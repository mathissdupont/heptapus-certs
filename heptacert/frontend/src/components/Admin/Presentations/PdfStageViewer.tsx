"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, RotateCcw } from "lucide-react";

type PdfStageViewerProps = {
  fileUrl: string;
  pageIndex: number;
  title: string;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  pageLabel: string;
  requestHeaders?: Record<string, string>;
  preloadAllSignal?: number;
  onPageCountChange?: (pageCount: number) => void;
  onPreloadStatusChange?: (status: "idle" | "loading" | "ready") => void;
};

function clampPage(pageIndex: number, pageCount: number) {
  return Math.min(Math.max(pageIndex + 1, 1), Math.max(pageCount, 1));
}

export default function PdfStageViewer({
  fileUrl,
  pageIndex,
  title,
  loadingLabel,
  errorLabel,
  retryLabel,
  pageLabel,
  requestHeaders,
  preloadAllSignal = 0,
  onPageCountChange,
  onPreloadStatusChange,
}: PdfStageViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const prefetchedPagesRef = useRef<Set<number>>(new Set());
  const [pageCount, setPageCount] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;

    setLoading(true);
    setError(null);
    setPageCount(0);
    prefetchedPagesRef.current = new Set();
    pdfRef.current = null;

    async function loadPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        loadingTask = pdfjs.getDocument({
          url: fileUrl,
          httpHeaders: requestHeaders,
          rangeChunkSize: 1024 * 512,
          disableAutoFetch: false,
          disableStream: false,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }

        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        onPageCountChange?.(pdf.numPages);
      } catch (ex: any) {
        if (!cancelled) setError(ex?.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
      loadingTask?.destroy?.();
      pdfRef.current?.destroy?.();
      pdfRef.current = null;
    };
  }, [errorLabel, fileUrl, onPageCountChange, reloadKey, requestHeaders]);

  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || !pageCount) return;

    const candidates = [pageIndex + 1, pageIndex + 2, pageIndex + 3, pageIndex]
      .filter((page) => page >= 1 && page <= pageCount && !prefetchedPagesRef.current.has(page));
    if (candidates.length === 0) return;

    let cancelled = false;
    async function prefetch() {
      for (const pageNumber of candidates) {
        if (cancelled) return;
        try {
          prefetchedPagesRef.current.add(pageNumber);
          await pdf.getPage(pageNumber);
        } catch {
          prefetchedPagesRef.current.delete(pageNumber);
        }
      }
    }

    const idleWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(() => void prefetch(), { timeout: 900 })
      : window.setTimeout(() => void prefetch(), 120);

    return () => {
      cancelled = true;
      if (idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [pageCount, pageIndex]);

  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || !pageCount || preloadAllSignal <= 0) return;
    let cancelled = false;

    async function preloadAllPages() {
      onPreloadStatusChange?.("loading");
      try {
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          if (cancelled) return;
          if (!prefetchedPagesRef.current.has(pageNumber)) {
            prefetchedPagesRef.current.add(pageNumber);
            await pdf.getPage(pageNumber);
          }
        }
        if (!cancelled) onPreloadStatusChange?.("ready");
      } catch {
        if (!cancelled) onPreloadStatusChange?.("idle");
      }
    }

    void preloadAllPages();
    return () => {
      cancelled = true;
    };
  }, [onPreloadStatusChange, pageCount, preloadAllSignal]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || !containerSize.width || !containerSize.height) return;

    let cancelled = false;
    const pageNumber = clampPage(pageIndex, pageCount || pdf.numPages);

    async function renderPage() {
      setRendering(true);
      setError(null);

      try {
        renderTaskRef.current?.cancel?.();
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          containerSize.width / viewport.width,
          containerSize.height / viewport.height
        );
        const scaledViewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const activeCanvas = canvasRef.current;
        if (!activeCanvas) return;
        const context = activeCanvas.getContext("2d");
        if (!context) throw new Error(errorLabel);

        activeCanvas.width = Math.floor(scaledViewport.width * outputScale);
        activeCanvas.height = Math.floor(scaledViewport.height * outputScale);
        activeCanvas.style.width = `${Math.floor(scaledViewport.width)}px`;
        activeCanvas.style.height = `${Math.floor(scaledViewport.height)}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, scaledViewport.width, scaledViewport.height);

        const renderTask = page.render({ canvasContext: context, viewport: scaledViewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (ex: any) {
        if (!cancelled && ex?.name !== "RenderingCancelledException") {
          setError(ex?.message || errorLabel);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [containerSize.height, containerSize.width, errorLabel, pageCount, pageIndex]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
      <div ref={containerRef} className="flex h-full w-full items-center justify-center bg-white p-3">
        <canvas ref={canvasRef} aria-label={title} className="max-h-full max-w-full bg-white shadow-sm" />
      </div>

      {(loading || rendering) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-4 py-2 text-sm font-bold text-surface-600 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loading ? loadingLabel : pageLabel}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white p-6">
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
            <FileText className="mx-auto mb-3 h-9 w-9 text-red-400" />
            <p className="text-sm font-bold text-red-700">{errorLabel}</p>
            <p className="mt-2 break-words text-xs font-semibold text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700"
            >
              <RotateCcw className="h-4 w-4" />
              {retryLabel}
            </button>
          </div>
        </div>
      )}

      {pageCount > 0 && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-surface-200 bg-white/95 px-3 py-1.5 text-xs font-black text-surface-500 shadow-sm">
          {pageLabel} {clampPage(pageIndex, pageCount)} / {pageCount}
        </div>
      )}
    </div>
  );
}
