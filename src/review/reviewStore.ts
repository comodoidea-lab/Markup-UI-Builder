import { create } from "zustand";
import type { Annotation, AnnotationKind, BoardRecord, ReviewSourceType } from "../state/types";
import { deleteBoard, readBoard, writeBoard } from "../state/persistence";

export type ReviewTool = AnnotationKind;

function sanitizeId(value: unknown, fallback = "board"): string {
  const sanitized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return sanitized || `${fallback}-${Date.now().toString(36)}`;
}

export function boardIdFromLocation(): string {
  const match = location.hash.match(/^#local=([a-zA-Z0-9_-]+)$/);
  return match ? match[1] : "";
}

function annotationStorageKey(boardId: string): string {
  return `markup-annotations:${boardId}`;
}

function loadAnnotations(boardId: string): Annotation[] {
  try {
    const stored = JSON.parse(localStorage.getItem(annotationStorageKey(boardId)) || "null");
    if (Array.isArray(stored)) return stored;
    if (boardId === "default") {
      const legacy = JSON.parse(localStorage.getItem("markup-annotations") || "[]");
      return Array.isArray(legacy) ? legacy : [];
    }
  } catch {
    return [];
  }
  return [];
}

export function normalizeLiveUrl(value: string): string {
  const input = String(value || "").trim();
  if (!input) throw new Error("WebアプリのURLを入力してください");
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `http://${input}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("HTTPまたはHTTPSのURLを入力してください");
  }
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (location.protocol === "https:" && url.protocol === "http:" && !isLoopback) {
    throw new Error("HTTPS版のMarkupではHTTPSのWebアプリを指定してください");
  }
  return url.href;
}

function pathFromUrl(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}` || "/";
}

interface ReviewState {
  boardId: string;
  boardTitle: string;
  sourceType: ReviewSourceType;
  imageSrc: string | null;
  annotations: Annotation[];
  nextId: number;
  activeTool: ReviewTool;
  selectedColor: string;
  outputFormat: "markdown" | "json";
  liveUrl: string;
  liveOrigin: string;
  livePath: string;
  liveInteraction: boolean;
  liveAutoReload: boolean;
  liveReloadNonce: number;

  setTool: (tool: ReviewTool) => void;
  setColor: (color: string) => void;
  setFormat: (format: "markdown" | "json") => void;
  addAnnotation: (annotation: Omit<Annotation, "id">) => void;
  updateAnnotation: (id: number, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: number) => void;
  undo: () => void;
  clearAnnotations: () => void;

  loadImage: (src: string, title?: string) => void;
  openLiveUrl: (value: string, options?: { clearAnnotations?: boolean; autoReload?: boolean }) => void;
  applyLivePath: (path: string) => void;
  syncLiveUrl: (href: string) => void;
  setLiveInteraction: (enabled: boolean) => void;
  setLiveAutoReload: (enabled: boolean) => void;
  reloadLive: () => void;

  restoreFromLocation: () => Promise<{ restored: boolean; boardId?: string }>;
  importBoard: (payload: unknown) => Promise<{
    boardId: string;
    title: string;
    url: string;
    imageCount: number;
  }>;
  clearImportedBoard: (payload?: { boardId?: string }) => Promise<{ boardId: string; cleared: boolean }>;
  getSnapshot: () => Record<string, unknown>;
}

let saveTimer: number | undefined;

function persist(state: ReviewState) {
  localStorage.setItem(
    annotationStorageKey(state.boardId),
    JSON.stringify(state.annotations),
  );
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    if (state.sourceType === "demo") return;
    const record: BoardRecord = {
      id: state.boardId,
      title: state.boardTitle,
      sourceType: state.sourceType,
      image: state.sourceType === "image" ? state.imageSrc : null,
      liveUrl: state.sourceType === "live" ? state.liveUrl : null,
      liveOrigin: state.sourceType === "live" ? state.liveOrigin : null,
      livePath: state.sourceType === "live" ? state.livePath : null,
      liveAutoReload: state.sourceType === "live" ? state.liveAutoReload : false,
      annotations: state.annotations,
      updatedAt: new Date().toISOString(),
    };
    writeBoard(record).catch(() => {});
  }, 300);
}

function setBoardUrl(boardId: string) {
  history.replaceState(null, "", `${location.pathname}#local=${encodeURIComponent(boardId)}`);
}

export const useReviewStore = create<ReviewState>((set, get) => {
  const apply = (patch: Partial<ReviewState>) => {
    set(patch);
    persist(get());
  };

  return {
    boardId: boardIdFromLocation() || "default",
    boardTitle: "UI Review",
    sourceType: "demo",
    imageSrc: null,
    annotations: [],
    nextId: 1,
    activeTool: "rect",
    selectedColor: "#2563eb",
    outputFormat: "markdown",
    liveUrl: "",
    liveOrigin: "",
    livePath: "/",
    liveInteraction: false,
    liveAutoReload: false,
    liveReloadNonce: 0,

    setTool: (activeTool) => set({ activeTool, liveInteraction: false }),
    setColor: (selectedColor) => set({ selectedColor }),
    setFormat: (outputFormat) => set({ outputFormat }),

    addAnnotation: (annotation) => {
      const { nextId, annotations } = get();
      apply({
        annotations: [...annotations, { ...annotation, id: nextId }],
        nextId: nextId + 1,
      });
    },
    updateAnnotation: (id, patch) => {
      apply({
        annotations: get().annotations.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      });
    },
    removeAnnotation: (id) => {
      apply({ annotations: get().annotations.filter((item) => item.id !== id) });
    },
    undo: () => apply({ annotations: get().annotations.slice(0, -1) }),
    clearAnnotations: () => apply({ annotations: [] }),

    loadImage: (src, title) => {
      const boardId = sanitizeId(`review-${Date.now().toString(36)}`);
      setBoardUrl(boardId);
      apply({
        boardId,
        boardTitle: title || "UI Review",
        sourceType: "image",
        imageSrc: src,
        annotations: [],
        nextId: 1,
        liveUrl: "",
        liveOrigin: "",
        livePath: "/",
        liveAutoReload: false,
        liveInteraction: false,
      });
    },

    openLiveUrl: (value, options) => {
      const href = normalizeLiveUrl(value);
      const url = new URL(href);
      const boardId = sanitizeId(`live-${Date.now().toString(36)}`);
      setBoardUrl(boardId);
      apply({
        boardId,
        boardTitle: url.hostname || "Live UI Review",
        sourceType: "live",
        imageSrc: null,
        liveUrl: url.href,
        liveOrigin: url.origin,
        livePath: pathFromUrl(url),
        liveInteraction: false,
        liveAutoReload: options?.autoReload ?? false,
        annotations: options?.clearAnnotations === false ? get().annotations : [],
        nextId: options?.clearAnnotations === false ? get().nextId : 1,
        liveReloadNonce: get().liveReloadNonce + 1,
      });
    },

    applyLivePath: (path) => {
      const { liveOrigin, livePath, annotations, nextId } = get();
      if (get().sourceType !== "live" || !liveOrigin) {
        throw new Error("先にWebアプリを開いてください");
      }
      const target = new URL(String(path || "/").trim() || "/", `${liveOrigin}/`);
      if (target.origin !== liveOrigin) {
        throw new Error("画面パスには同じ開発サーバー内のパスを指定してください");
      }
      const pathChanged = pathFromUrl(target) !== livePath;
      apply({
        liveUrl: target.href,
        livePath: pathFromUrl(target),
        annotations: pathChanged ? [] : annotations,
        nextId: pathChanged ? 1 : nextId,
        liveReloadNonce: get().liveReloadNonce + 1,
      });
    },

    syncLiveUrl: (href) => {
      const { liveOrigin, livePath, annotations, nextId } = get();
      try {
        const url = new URL(href, `${liveOrigin}/`);
        if (url.origin !== liveOrigin) return;
        const pathChanged = pathFromUrl(url) !== livePath;
        apply({
          liveUrl: url.href,
          livePath: pathFromUrl(url),
          annotations: pathChanged ? [] : annotations,
          nextId: pathChanged ? 1 : nextId,
        });
      } catch {
        // Ignore malformed route notifications.
      }
    },

    setLiveInteraction: (liveInteraction) => set({ liveInteraction }),
    setLiveAutoReload: (liveAutoReload) => apply({ liveAutoReload }),
    reloadLive: () => set({ liveReloadNonce: get().liveReloadNonce + 1 }),

    restoreFromLocation: async () => {
      const boardId = boardIdFromLocation();
      if (!boardId) {
        const annotations = loadAnnotations("default");
        set({
          annotations,
          nextId: Math.max(0, ...annotations.map((item) => Number(item.id) || 0)) + 1,
        });
        return { restored: false };
      }

      const board = await readBoard(boardId).catch(() => null);
      const localAnnotations = loadAnnotations(boardId);
      const hasLocal = localStorage.getItem(annotationStorageKey(boardId)) !== null;
      if (!board?.image && !board?.liveUrl) {
        set({ boardId, annotations: localAnnotations });
        return { restored: false, boardId };
      }

      const annotations = hasLocal
        ? localAnnotations
        : Array.isArray(board.annotations)
          ? board.annotations
          : [];
      const nextId = Math.max(0, ...annotations.map((item) => Number(item.id) || 0)) + 1;

      if (board.sourceType === "live" || board.liveUrl) {
        const restoredUrl =
          board.liveOrigin && board.livePath
            ? new URL(board.livePath, `${board.liveOrigin}/`).href
            : board.liveUrl!;
        const url = new URL(restoredUrl);
        set({
          boardId,
          boardTitle: board.title || "Live UI Review",
          sourceType: "live",
          imageSrc: null,
          liveUrl: url.href,
          liveOrigin: url.origin,
          livePath: pathFromUrl(url),
          liveAutoReload: Boolean(board.liveAutoReload),
          annotations,
          nextId,
        });
      } else {
        set({
          boardId,
          boardTitle: board.title || "UI Review",
          sourceType: "image",
          imageSrc: board.image,
          annotations,
          nextId,
        });
      }
      return { restored: true, boardId };
    },

    importBoard: async (payload) => {
      const record = payload as {
        images?: unknown[];
        image?: unknown;
        boardId?: string;
        storageKey?: string;
        title?: string;
      };
      const image = record?.images?.[0] ?? record?.image;
      const src =
        typeof image === "string"
          ? image
          : ((image as Record<string, string>)?.src ??
            (image as Record<string, string>)?.dataUrl ??
            (image as Record<string, string>)?.url);
      if (!src) throw new Error("importBoard requires one image.");
      if (src.length > 20 * 1024 * 1024) throw new Error("The imported image payload is too large.");
      if (!/^(data:image\/|https?:\/\/)/i.test(src)) {
        throw new Error("Only image data URLs and HTTP(S) image URLs are accepted.");
      }

      const boardId = sanitizeId(record.boardId || record.storageKey || `review-${Date.now()}`);
      const title = String(
        record.title || (image as Record<string, string>)?.title || "UI Review",
      ).slice(0, 120);
      localStorage.removeItem(annotationStorageKey(boardId));
      set({
        boardId,
        boardTitle: title,
        sourceType: "image",
        imageSrc: src,
        annotations: [],
        nextId: 1,
        liveUrl: "",
        liveOrigin: "",
        livePath: "/",
      });
      setBoardUrl(boardId);
      await writeBoard({
        id: boardId,
        title,
        sourceType: "image",
        image: src,
        liveUrl: null,
        annotations: [],
        updatedAt: new Date().toISOString(),
      });
      return { boardId, title, url: location.href, imageCount: 1 };
    },

    clearImportedBoard: async (payload = {}) => {
      const boardId = sanitizeId(payload.boardId || get().boardId);
      localStorage.removeItem(annotationStorageKey(boardId));
      await deleteBoard(boardId).catch(() => {});
      if (boardId === get().boardId) {
        set({
          boardId: "default",
          boardTitle: "UI Review",
          sourceType: "demo",
          imageSrc: null,
          annotations: [],
          nextId: 1,
          liveUrl: "",
          liveOrigin: "",
          livePath: "/",
          liveAutoReload: false,
          liveInteraction: false,
        });
        history.replaceState(null, "", location.pathname + location.search);
      }
      return { boardId, cleared: true };
    },

    getSnapshot: () => {
      const state = get();
      return {
        version: 1,
        boardId: state.boardId,
        title: state.boardTitle,
        sourceType: state.sourceType,
        image: state.sourceType === "image" ? state.imageSrc : null,
        liveUrl: state.sourceType === "live" ? state.liveUrl : null,
        liveOrigin: state.sourceType === "live" ? state.liveOrigin : null,
        livePath: state.sourceType === "live" ? state.livePath : null,
        liveAutoReload: state.sourceType === "live" ? state.liveAutoReload : false,
        annotations: structuredClone(state.annotations),
      };
    },
  };
});
