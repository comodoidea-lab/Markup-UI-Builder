export type NodeType = "frame" | "box" | "text" | "image" | "button" | "input";

export type SizeValue = number | "fill" | "hug";

export interface NodeStyle {
  // layout (containers)
  direction?: "row" | "column";
  gap?: number;
  paddingX?: number;
  paddingY?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  // sizing
  width?: SizeValue;
  height?: SizeValue;
  // visual
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  shadow?: "none" | "sm" | "md" | "lg";
  opacity?: number;
  // typography
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
}

export interface DesignNode {
  id: string;
  type: NodeType;
  name?: string;
  /** text / button label */
  text?: string;
  /** image source url or data url; empty = placeholder */
  src?: string;
  /** input placeholder */
  placeholder?: string;
  style: NodeStyle;
  children?: DesignNode[];
  /** canvas position; frames only */
  x?: number;
  y?: number;
}

export interface DesignDocument {
  id: string;
  name: string;
  frames: DesignNode[];
  updatedAt: string;
}

export type AnnotationKind = "rect" | "pin" | "arrow" | "text" | "color";
export type AnnotationType = "layout" | "style" | "copy" | "remove" | "behavior";

export interface Annotation {
  id: number;
  kind: AnnotationKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  color?: string;
  type: AnnotationType;
  text: string;
}

export type ReviewSourceType = "demo" | "image" | "live";

export interface BoardRecord {
  id: string;
  title: string;
  sourceType: ReviewSourceType;
  image: string | null;
  liveUrl?: string | null;
  liveOrigin?: string | null;
  livePath?: string | null;
  liveAutoReload?: boolean;
  annotations: Annotation[];
  updatedAt: string;
}

export type AIProvider = "anthropic" | "openai" | "gemini";

export interface AISettings {
  provider: AIProvider;
  keys: Record<AIProvider, string>;
  models: Record<AIProvider, string>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind?: "generate" | "edit" | "error" | "info";
  frameId?: string;
}
