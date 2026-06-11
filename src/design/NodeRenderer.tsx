import { memo } from "react";
import type { CSSProperties } from "react";
import type { DesignNode } from "../state/types";
import { cssToReactStyle, styleToCss } from "../state/nodeUtils";
import { useDesignStore } from "../state/designStore";

interface NodeRendererProps {
  node: DesignNode;
  parentDirection: "row" | "column";
}

export const NodeRenderer = memo(function NodeRenderer({
  node,
  parentDirection,
}: NodeRendererProps) {
  const selected = useDesignStore((state) => state.selectedId === node.id);
  const hovered = useDesignStore((state) => state.hoverId === node.id);
  const select = useDesignStore((state) => state.select);
  const setHover = useDesignStore((state) => state.setHover);

  const style = cssToReactStyle(styleToCss(node, parentDirection)) as CSSProperties;
  style.position = "relative";
  if (node.type === "frame") {
    style.width = "100%";
    style.height = "100%";
    style.overflow = "auto";
  }
  if (selected) {
    style.outline = "2px solid #2563eb";
    style.outlineOffset = "-1px";
  } else if (hovered) {
    style.outline = "1px solid rgba(37, 99, 235, 0.55)";
    style.outlineOffset = "-1px";
  }

  const interactionProps = {
    onPointerDown: (event: React.PointerEvent) => {
      event.stopPropagation();
      select(node.id);
    },
    onPointerOver: (event: React.PointerEvent) => {
      event.stopPropagation();
      setHover(node.id);
    },
    onPointerOut: () => setHover(null),
  };

  const direction = node.style.direction ?? "column";

  switch (node.type) {
    case "text":
      return (
        <p style={style} {...interactionProps}>
          {node.text ?? ""}
        </p>
      );
    case "button":
      return (
        <button type="button" style={style} {...interactionProps}>
          {node.text ?? ""}
        </button>
      );
    case "input":
      return (
        <input
          style={style}
          type="text"
          readOnly
          placeholder={node.placeholder ?? ""}
          {...interactionProps}
        />
      );
    case "image":
      if (node.src) {
        return <img style={style} src={node.src} alt={node.name ?? ""} {...interactionProps} />;
      }
      return (
        <div
          style={{
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: 12,
            minHeight: 40,
          }}
          {...interactionProps}
        >
          ◇ {node.name ?? "Image"}
        </div>
      );
    default:
      return (
        <div style={style} {...interactionProps}>
          {(node.children ?? []).map((child) => (
            <NodeRenderer key={child.id} node={child} parentDirection={direction} />
          ))}
        </div>
      );
  }
});
