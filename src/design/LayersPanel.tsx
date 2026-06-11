import { useState } from "react";
import type { DesignNode } from "../state/types";
import { useDesignStore } from "../state/designStore";
import { createDefaultNode, createFrame, DEVICE_PRESETS, isContainer, nodeLabel } from "../state/nodeUtils";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Frame as FrameIcon,
  Image as ImageIcon,
  LayoutGrid,
  MousePointerClick,
  Plus,
  Square,
  TextCursorInput,
  Trash2,
  Type,
} from "lucide-react";

const TYPE_ICONS = {
  frame: FrameIcon,
  box: Square,
  text: Type,
  image: ImageIcon,
  button: MousePointerClick,
  input: TextCursorInput,
} as const;

function LayerRow({ node, depth }: { node: DesignNode; depth: number }) {
  const selected = useDesignStore((state) => state.selectedId === node.id);
  const select = useDesignStore((state) => state.select);
  const setHover = useDesignStore((state) => state.setHover);
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = Boolean(node.children?.length);
  const Icon = TYPE_ICONS[node.type];

  return (
    <div>
      <button
        className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[12.5px] ${
          selected ? "bg-blue-100 text-blue-800" : "text-slate-700 hover:bg-slate-100"
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => select(node.id)}
        onMouseEnter={() => setHover(node.id)}
        onMouseLeave={() => setHover(null)}
      >
        {hasChildren ? (
          <span
            className="shrink-0 text-slate-400"
            onClick={(event) => {
              event.stopPropagation();
              setCollapsed(!collapsed);
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </span>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon size={13} className="shrink-0 opacity-60" />
        <span className="truncate">{nodeLabel(node)}</span>
      </button>
      {!collapsed &&
        node.children?.map((child) => <LayerRow key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

export function LayersPanel() {
  const frames = useDesignStore((state) => state.doc.frames);
  const selectedId = useDesignStore((state) => state.selectedId);
  const addFrame = useDesignStore((state) => state.addFrame);
  const addChild = useDesignStore((state) => state.addChild);
  const deleteNode = useDesignStore((state) => state.deleteNode);
  const duplicateNode = useDesignStore((state) => state.duplicateNode);
  const mutate = useDesignStore((state) => state.mutate);
  const [showFrameMenu, setShowFrameMenu] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  const insertTarget = (() => {
    if (!selectedId) return null;
    const { doc } = useDesignStore.getState();
    const stack: DesignNode[] = [...doc.frames];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.id === selectedId) return isContainer(node) ? node : null;
      if (node.children) stack.push(...node.children);
    }
    return null;
  })();

  const insertNode = (type: DesignNode["type"]) => {
    setShowInsertMenu(false);
    const node = createDefaultNode(type);
    if (insertTarget) {
      addChild(insertTarget.id, node);
      return;
    }
    // No container selected: drop into the first frame.
    const frame = frames[0];
    if (frame) addChild(frame.id, node);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Layers
        </span>
        <div className="flex items-center gap-0.5">
          <div className="relative">
            <button
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              title="要素を挿入"
              onClick={() => {
                setShowInsertMenu(!showInsertMenu);
                setShowFrameMenu(false);
              }}
            >
              <Plus size={15} />
            </button>
            {showInsertMenu && (
              <div className="absolute right-0 z-30 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                {(
                  [
                    ["box", "Box (コンテナ)", Square],
                    ["text", "テキスト", Type],
                    ["button", "ボタン", MousePointerClick],
                    ["input", "入力欄", TextCursorInput],
                    ["image", "画像", ImageIcon],
                  ] as const
                ).map(([type, label, Icon]) => (
                  <button
                    key={type}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                    onClick={() => insertNode(type)}
                  >
                    <Icon size={13} className="opacity-60" /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              title="フレームを追加"
              onClick={() => {
                setShowFrameMenu(!showFrameMenu);
                setShowInsertMenu(false);
              }}
            >
              <LayoutGrid size={15} />
            </button>
            {showFrameMenu && (
              <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                {DEVICE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setShowFrameMenu(false);
                      addFrame(preset.width, preset.height, `${preset.label} screen`);
                    }}
                  >
                    <span>{preset.label}</span>
                    <span className="text-slate-400">
                      {preset.width}×{preset.height}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {frames.length === 0 && (
          <button
            className="mt-2 flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-5 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600"
            onClick={() => {
              const frame = createFrame("Screen 1", 390, 844, 80, 60);
              mutate((draft) => {
                draft.push(frame);
              });
            }}
          >
            <Plus size={16} />
            最初のフレームを追加
          </button>
        )}
        {frames.map((frame) => (
          <LayerRow key={frame.id} node={frame} depth={0} />
        ))}
      </div>

      {selectedId && (
        <div className="flex items-center gap-1 border-t border-slate-200 px-2 py-1.5">
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
            onClick={() => duplicateNode(selectedId)}
          >
            <Copy size={12} /> 複製
          </button>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
            onClick={() => deleteNode(selectedId)}
          >
            <Trash2 size={12} /> 削除
          </button>
        </div>
      )}
    </div>
  );
}
