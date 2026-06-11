import { useCallback, useEffect, useRef, useState } from "react";
import type { Annotation } from "../state/types";
import { useReviewStore } from "./reviewStore";
import { showToast } from "../ui/toast";

interface DrawingState {
  kind: "rect" | "arrow" | "color";
  startX: number;
  startY: number;
  x: number;
  y: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
  color: string;
}

function AnnotationShapes({
  annotations,
  drawing,
}: {
  annotations: Annotation[];
  drawing: DrawingState | null;
}) {
  const renderOne = (a: Annotation, index: number, isDrawing: boolean) => {
    const key = isDrawing ? "drawing" : String(a.id);

    if (a.kind === "arrow") {
      const endX = a.endX ?? a.x;
      const endY = a.endY ?? a.y;
      const angle = Math.atan2(endY - a.y, endX - a.x);
      const headLength = 3.2;
      return (
        <g key={key}>
          <line
            x1={a.x}
            y1={a.y}
            x2={endX}
            y2={endY}
            stroke="#ff5a36"
            strokeWidth={0.55}
            strokeDasharray={isDrawing ? "1.4 0.9" : undefined}
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 3 }}
          />
          <polygon
            points={`${endX},${endY} ${endX - headLength * Math.cos(angle - Math.PI / 6)},${endY - headLength * Math.sin(angle - Math.PI / 6)} ${endX - headLength * Math.cos(angle + Math.PI / 6)},${endY - headLength * Math.sin(angle + Math.PI / 6)}`}
            fill="#ff5a36"
          />
          {!isDrawing && <NumberBadge x={a.x} y={a.y} label={String(index + 1)} />}
        </g>
      );
    }

    if (a.kind === "text") {
      const label = `${isDrawing ? "" : `${index + 1} · `}${a.text || "テキスト"}`;
      const labelWidth = Math.min(42, Math.max(12, label.length * 1.45 + 3));
      return (
        <g key={key}>
          <rect x={a.x} y={a.y} width={labelWidth} height={5} rx={1} fill="#ff5a36" />
          <text
            x={a.x + 1.5}
            y={a.y + 3.4}
            fill="#ffffff"
            style={{ fontSize: "2.4px", fontWeight: 800 }}
          >
            {label}
          </text>
        </g>
      );
    }

    if (a.kind === "color") {
      const color = a.color || "#2563eb";
      return (
        <g key={key}>
          <rect
            x={a.x}
            y={a.y}
            width={a.width ?? 0}
            height={a.height ?? 0}
            rx={0.7}
            fill={color}
            fillOpacity={0.42}
            stroke={color}
            style={{ strokeWidth: 2 }}
            vectorEffect="non-scaling-stroke"
          />
          {!isDrawing && (
            <>
              <rect x={a.x} y={a.y} width={13} height={4.6} rx={1} fill={color} />
              <text
                x={a.x + 1.2}
                y={a.y + 3.1}
                fill="#ffffff"
                style={{ fontSize: "2.2px", fontWeight: 800 }}
              >
                {`${index + 1} · ${color.toUpperCase()}`}
              </text>
            </>
          )}
        </g>
      );
    }

    if (a.kind === "pin") {
      return (
        <g key={key}>
          <circle
            cx={a.x}
            cy={a.y}
            r={2.2}
            fill="rgba(255,90,54,0.12)"
            stroke="#ff5a36"
            style={{ strokeWidth: 3 }}
            vectorEffect="non-scaling-stroke"
          />
          {!isDrawing && <NumberBadge x={a.x} y={a.y} label={String(index + 1)} />}
        </g>
      );
    }

    return (
      <g key={key}>
        <rect
          x={a.x}
          y={a.y}
          width={a.width ?? 0}
          height={a.height ?? 0}
          rx={0.7}
          fill="rgba(255,90,54,0.10)"
          stroke="#ff5a36"
          strokeDasharray={isDrawing ? "1.4 0.9" : undefined}
          style={{ strokeWidth: 3 }}
          vectorEffect="non-scaling-stroke"
        />
        {!isDrawing && <NumberBadge x={a.x} y={a.y} label={String(index + 1)} />}
      </g>
    );
  };

  return (
    <>
      {annotations.map((annotation, index) => renderOne(annotation, index, false))}
      {drawing && renderOne({ ...drawing, id: -1, type: "layout", text: "" }, 0, true)}
    </>
  );
}

function NumberBadge({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <>
      <circle cx={x} cy={y} r={2.05} fill="#ff5a36" />
      <text
        x={x}
        y={y + 0.15}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: "2.1px", fontWeight: 800 }}
      >
        {label}
      </text>
    </>
  );
}

export function Stage({ onAnnotationAdded }: { onAnnotationAdded: () => void }) {
  const sourceType = useReviewStore((state) => state.sourceType);
  const imageSrc = useReviewStore((state) => state.imageSrc);
  const annotations = useReviewStore((state) => state.annotations);
  const activeTool = useReviewStore((state) => state.activeTool);
  const selectedColor = useReviewStore((state) => state.selectedColor);
  const addAnnotation = useReviewStore((state) => state.addAnnotation);
  const liveUrl = useReviewStore((state) => state.liveUrl);
  const liveOrigin = useReviewStore((state) => state.liveOrigin);
  const livePath = useReviewStore((state) => state.livePath);
  const liveInteraction = useReviewStore((state) => state.liveInteraction);
  const liveAutoReload = useReviewStore((state) => state.liveAutoReload);
  const liveReloadNonce = useReviewStore((state) => state.liveReloadNonce);
  const setLiveInteraction = useReviewStore((state) => state.setLiveInteraction);
  const setLiveAutoReload = useReviewStore((state) => state.setLiveAutoReload);
  const applyLivePath = useReviewStore((state) => state.applyLivePath);
  const reloadLive = useReviewStore((state) => state.reloadLive);
  const syncLiveUrl = useReviewStore((state) => state.syncLiveUrl);

  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [pathDraft, setPathDraft] = useState(livePath);

  useEffect(() => setPathDraft(livePath), [livePath]);

  // Auto reload timer.
  useEffect(() => {
    if (sourceType !== "live" || !liveAutoReload) return;
    const timer = window.setInterval(() => reloadLive(), 10000);
    return () => window.clearInterval(timer);
  }, [sourceType, liveAutoReload, reloadLive]);

  // Navigate the iframe only on explicit open / path change / reload (nonce),
  // never when the URL state is merely synced from in-frame navigation.
  useEffect(() => {
    if (sourceType !== "live" || !frameRef.current) return;
    const url = useReviewStore.getState().liveUrl;
    if (url) frameRef.current.src = url;
  }, [liveReloadNonce, sourceType]);

  const pointFromEvent = useCallback((event: React.PointerEvent) => {
    const bounds = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)),
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest?.(".live-mode-bar")) return;
    if (sourceType === "live" && liveInteraction) return;
    const point = pointFromEvent(event);
    if (activeTool === "pin") {
      addAnnotation({ kind: "pin", x: point.x, y: point.y, type: "style", text: "" });
      onAnnotationAdded();
      return;
    }
    if (activeTool === "text") {
      addAnnotation({ kind: "text", x: point.x, y: point.y, type: "copy", text: "" });
      onAnnotationAdded();
      return;
    }
    setDrawing({
      kind: activeTool === "arrow" ? "arrow" : activeTool === "color" ? "color" : "rect",
      startX: point.x,
      startY: point.y,
      x: point.x,
      y: point.y,
      endX: point.x,
      endY: point.y,
      width: 0,
      height: 0,
      color: selectedColor,
    });
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drawing) return;
    const point = pointFromEvent(event);
    if (drawing.kind === "arrow") {
      setDrawing({ ...drawing, endX: point.x, endY: point.y });
      return;
    }
    setDrawing({
      ...drawing,
      x: Math.min(drawing.startX, point.x),
      y: Math.min(drawing.startY, point.y),
      width: Math.abs(point.x - drawing.startX),
      height: Math.abs(point.y - drawing.startY),
    });
  };

  const onPointerUp = () => {
    if (!drawing) return;
    if (drawing.kind === "arrow" && Math.hypot(drawing.endX - drawing.x, drawing.endY - drawing.y) > 2) {
      addAnnotation({
        kind: "arrow",
        x: drawing.x,
        y: drawing.y,
        endX: drawing.endX,
        endY: drawing.endY,
        type: "layout",
        text: "",
      });
      onAnnotationAdded();
    } else if (
      ["rect", "color"].includes(drawing.kind) &&
      drawing.width > 1 &&
      drawing.height > 1
    ) {
      addAnnotation({
        kind: drawing.kind as "rect" | "color",
        x: drawing.x,
        y: drawing.y,
        width: drawing.width,
        height: drawing.height,
        type: drawing.kind === "color" ? "style" : "layout",
        text:
          drawing.kind === "color"
            ? `この範囲の色を${drawing.color.toUpperCase()}に変更する`
            : "",
        ...(drawing.kind === "color" ? { color: drawing.color } : {}),
      });
      onAnnotationAdded();
    }
    setDrawing(null);
  };

  const onFrameLoad = () => {
    if (sourceType !== "live") return;
    try {
      const frameUrl = frameRef.current?.contentWindow?.location.href;
      if (frameUrl && frameUrl !== "about:blank") syncLiveUrl(frameUrl);
    } catch {
      // Cross-origin navigation cannot be inspected.
    }
  };

  return (
    <div
      ref={stageRef}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {sourceType === "image" && imageSrc && (
        <img
          src={imageSrc}
          alt="注釈対象のUIスクリーンショット"
          className="h-full w-full object-contain"
          draggable={false}
        />
      )}

      {sourceType === "live" && (
        <iframe
          ref={frameRef}
          title="注釈対象のWebアプリ"
          allow="clipboard-read; clipboard-write"
          className="h-full w-full border-0"
          style={{ pointerEvents: liveInteraction ? "auto" : "none" }}
          onLoad={onFrameLoad}
        />
      )}

      {sourceType === "demo" && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-gradient-to-b from-slate-50 to-slate-100 px-8 select-none">
          <div className="text-center">
            <p className="text-[11px] font-bold tracking-widest text-orange-500 uppercase">
              Markup quick guide
            </p>
            <h2 className="mt-1 text-2xl leading-snug font-bold text-slate-800">
              スクリーンショットに、
              <br />
              見たまま指示する。
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">
              この画面へ直接、範囲や矢印を描いて試せます。
            </p>
          </div>
          <div className="flex items-center gap-3">
            {[
              ["01", "＋", "画面を開く", "画像かWebアプリのURLを指定"],
              ["02", "↗", "修正箇所を示す", "範囲・ピン・矢印・文字・色"],
              ["03", "AI", "エージェントへ渡す", "注釈付き画像とプロンプト"],
            ].map(([step, icon, title, body], index) => (
              <div key={step} className="flex items-center gap-3">
                {index > 0 && <span className="text-slate-300">→</span>}
                <div className="w-40 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400">{step}</span>
                  <div className="my-1 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-600">
                    {icon}
                  </div>
                  <p className="text-xs font-bold text-slate-700">{title}</p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <AnnotationShapes annotations={annotations} drawing={drawing} />
      </svg>

      {sourceType === "live" && (
        <div className="live-mode-bar absolute top-2 left-1/2 z-10 flex -translate-x-1/2 flex-col gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">
              {liveInteraction ? "操作モード" : "注釈モード"}
            </span>
            <div className="flex overflow-hidden rounded-lg border border-slate-200 text-[11px]">
              <button
                className={`px-2.5 py-1 ${liveInteraction ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                onClick={() => setLiveInteraction(true)}
              >
                Webアプリを操作
              </button>
              <button
                className={`px-2.5 py-1 ${!liveInteraction ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                onClick={() => setLiveInteraction(false)}
              >
                注釈を描く
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Path</span>
            <input
              className="w-44 rounded-md border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] focus:border-blue-400 focus:outline-none"
              value={pathDraft}
              spellCheck={false}
              onChange={(event) => setPathDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                try {
                  applyLivePath(pathDraft);
                  showToast(`画面を移動しました · ${useReviewStore.getState().livePath}`);
                } catch (error) {
                  showToast((error as Error).message, 3500);
                }
              }}
            />
            <button
              className="rounded-md bg-slate-800 px-2 py-0.5 text-white"
              onClick={() => {
                try {
                  applyLivePath(pathDraft);
                  showToast(`画面を移動しました · ${useReviewStore.getState().livePath}`);
                } catch (error) {
                  showToast((error as Error).message, 3500);
                }
              }}
            >
              移動
            </button>
            <button
              className="rounded-md border border-slate-200 px-1.5 py-0.5 text-slate-600 hover:bg-slate-50"
              title="画面を再読み込み"
              onClick={() => {
                reloadLive();
                showToast(`画面を再読み込みしました · ${livePath}`);
              }}
            >
              ↻
            </button>
            <label className="flex items-center gap-1 text-slate-500">
              <input
                type="checkbox"
                checked={liveAutoReload}
                onChange={(event) => {
                  setLiveAutoReload(event.target.checked);
                  showToast(
                    event.target.checked
                      ? "10秒ごとの自動更新を開始しました"
                      : "自動更新を停止しました",
                  );
                }}
              />
              10秒ごと
            </label>
          </div>
          {liveOrigin && (
            <p className="max-w-72 truncate text-[10px] text-slate-400">{liveUrl}</p>
          )}
        </div>
      )}
    </div>
  );
}
