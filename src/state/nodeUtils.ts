import type { DesignNode, NodeStyle } from "./types";

let counter = 0;

export function genId(prefix = "n"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export const CONTAINER_TYPES = new Set(["frame", "box", "button"]);

export function isContainer(node: DesignNode): boolean {
  return node.type === "frame" || node.type === "box";
}

export function findNode(nodes: DesignNode[], id: string): DesignNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(nodes: DesignNode[], id: string): DesignNode | null {
  for (const node of nodes) {
    if (node.children?.some((child) => child.id === id)) return node;
    if (node.children) {
      const found = findParent(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findFrameOf(frames: DesignNode[], id: string): DesignNode | null {
  for (const frame of frames) {
    if (frame.id === id || (frame.children && findNode(frame.children, id))) return frame;
  }
  return null;
}

/** Returns a deep clone with fresh ids on every node. */
export function cloneWithNewIds(node: DesignNode): DesignNode {
  return {
    ...structuredClone(node),
    id: genId(node.type),
    children: node.children?.map(cloneWithNewIds),
  };
}

/** Ensure every node in an (AI-generated) tree has a unique id and valid shape. */
export function normalizeTree(node: DesignNode, depth = 0): DesignNode {
  const type = ["frame", "box", "text", "image", "button", "input"].includes(node.type)
    ? node.type
    : "box";
  const normalized: DesignNode = {
    id: genId(type),
    type: depth === 0 ? node.type : type === "frame" ? "box" : type,
    name: typeof node.name === "string" ? node.name.slice(0, 60) : undefined,
    text: typeof node.text === "string" ? node.text : undefined,
    src: typeof node.src === "string" ? node.src : undefined,
    placeholder: typeof node.placeholder === "string" ? node.placeholder : undefined,
    style: typeof node.style === "object" && node.style ? { ...node.style } : {},
  };
  if (Array.isArray(node.children) && (isContainer(normalized) || normalized.type === "button")) {
    normalized.children = node.children
      .filter((child) => child && typeof child === "object")
      .map((child) => normalizeTree(child, depth + 1));
  }
  return normalized;
}

export function nodeLabel(node: DesignNode): string {
  if (node.name) return node.name;
  switch (node.type) {
    case "frame":
      return "Frame";
    case "box":
      return "Box";
    case "text":
      return node.text ? node.text.slice(0, 18) : "Text";
    case "image":
      return "Image";
    case "button":
      return node.text ? `Button: ${node.text.slice(0, 14)}` : "Button";
    case "input":
      return "Input";
  }
}

export function createDefaultNode(type: DesignNode["type"]): DesignNode {
  switch (type) {
    case "text":
      return {
        id: genId("text"),
        type: "text",
        text: "テキスト",
        style: { fontSize: 15, color: "#1f2937" },
      };
    case "button":
      return {
        id: genId("button"),
        type: "button",
        text: "ボタン",
        style: {
          background: "#2563eb",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 600,
          paddingX: 18,
          paddingY: 10,
          radius: 8,
        },
      };
    case "input":
      return {
        id: genId("input"),
        type: "input",
        placeholder: "入力してください",
        style: {
          background: "#ffffff",
          borderColor: "#d1d5db",
          borderWidth: 1,
          radius: 8,
          paddingX: 12,
          paddingY: 9,
          fontSize: 14,
          color: "#1f2937",
          width: "fill",
        },
      };
    case "image":
      return {
        id: genId("image"),
        type: "image",
        style: { width: "fill", height: 160, radius: 8, background: "#e5e7eb" },
      };
    case "box":
    default:
      return {
        id: genId("box"),
        type: "box",
        style: {
          direction: "column",
          gap: 12,
          paddingX: 16,
          paddingY: 16,
          background: "#ffffff",
          radius: 12,
          width: "fill",
        },
        children: [],
      };
  }
}

export const DEVICE_PRESETS = [
  { id: "mobile", label: "Mobile", width: 390, height: 844 },
  { id: "tablet", label: "Tablet", width: 834, height: 1112 },
  { id: "desktop", label: "Desktop", width: 1280, height: 800 },
] as const;

export function createFrame(name: string, width: number, height: number, x = 0, y = 0): DesignNode {
  return {
    id: genId("frame"),
    type: "frame",
    name,
    x,
    y,
    style: {
      width,
      height,
      background: "#f8fafc",
      direction: "column",
      gap: 0,
      paddingX: 0,
      paddingY: 0,
    },
    children: [],
  };
}

const SHADOWS: Record<string, string> = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.08)",
  md: "0 4px 12px rgba(15, 23, 42, 0.10)",
  lg: "0 12px 32px rgba(15, 23, 42, 0.16)",
};

/**
 * Maps a node to CSS properties. `parentDirection` decides how "fill" expands.
 */
export function styleToCss(
  node: DesignNode,
  parentDirection: "row" | "column",
): Record<string, string> {
  const s: NodeStyle = node.style || {};
  const css: Record<string, string> = {};
  const isFrame = node.type === "frame";

  if (isContainer(node) || node.type === "button") {
    css.display = "flex";
    css["flex-direction"] = s.direction ?? (node.type === "button" ? "row" : "column");
    if (s.gap != null) css.gap = `${s.gap}px`;
    if (s.wrap) css["flex-wrap"] = "wrap";
    const alignMap = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
    const justifyMap = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      between: "space-between",
    };
    css["align-items"] = alignMap[s.align ?? (node.type === "button" ? "center" : "stretch")];
    if (s.justify) css["justify-content"] = justifyMap[s.justify];
    else if (node.type === "button") css["justify-content"] = "center";
  }
  if (s.paddingX != null || s.paddingY != null) {
    css.padding = `${s.paddingY ?? 0}px ${s.paddingX ?? 0}px`;
  }

  if (!isFrame) {
    if (typeof s.width === "number") css.width = `${s.width}px`;
    else if (s.width === "fill") {
      if (parentDirection === "row") {
        css["flex-grow"] = "1";
        css["flex-basis"] = "0";
        css["min-width"] = "0";
      } else css.width = "100%";
    } else if (s.width === "hug") css.width = "fit-content";
    if (typeof s.height === "number") css.height = `${s.height}px`;
    else if (s.height === "fill") {
      if (parentDirection === "column") {
        css["flex-grow"] = "1";
        css["flex-basis"] = "0";
        css["min-height"] = "0";
      } else css.height = "100%";
    }
    if (typeof s.width === "number" || typeof s.height === "number") css["flex-shrink"] = "0";
  }

  if (s.background) css.background = s.background;
  if (s.borderWidth) css.border = `${s.borderWidth}px solid ${s.borderColor ?? "#e2e8f0"}`;
  if (s.radius != null) css["border-radius"] = `${s.radius}px`;
  if (s.shadow && s.shadow !== "none") css["box-shadow"] = SHADOWS[s.shadow];
  if (s.opacity != null && s.opacity < 1) css.opacity = String(s.opacity);

  if (s.fontSize != null) css["font-size"] = `${s.fontSize}px`;
  if (s.fontWeight != null) css["font-weight"] = String(s.fontWeight);
  if (s.color) css.color = s.color;
  if (s.textAlign) css["text-align"] = s.textAlign;
  if (s.lineHeight != null) css["line-height"] = String(s.lineHeight);
  if (s.letterSpacing != null) css["letter-spacing"] = `${s.letterSpacing}px`;

  if (node.type === "image") {
    css["object-fit"] = "cover";
    if (!s.background) css.background = "#e5e7eb";
  }
  if (node.type === "button") {
    css.border = css.border ?? "none";
    css.cursor = "pointer";
    css["white-space"] = "nowrap";
  }
  if (node.type === "input") {
    css.outline = "none";
    css["font-family"] = "inherit";
  }
  if (node.type === "text") {
    css.margin = "0";
    css["overflow-wrap"] = "anywhere";
  }
  return css;
}

export function cssToReactStyle(css: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(css)) {
    const camel = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}
