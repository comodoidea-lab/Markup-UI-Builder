import type { DesignNode } from "../state/types";
import { styleToCss } from "../state/nodeUtils";

function indent(level: number): string {
  return "  ".repeat(level);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cssClassName(node: DesignNode, index: Map<string, number>): string {
  const base = (node.name || node.type)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || node.type;
  const count = index.get(base) ?? 0;
  index.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

interface HtmlResult {
  html: string;
  css: string;
}

/** Serializes a frame to plain HTML + CSS. */
export function frameToHtml(frame: DesignNode): HtmlResult {
  const cssRules: string[] = [];
  const nameIndex = new Map<string, number>();

  function walk(node: DesignNode, parentDirection: "row" | "column", level: number): string {
    const className = cssClassName(node, nameIndex);
    const css = styleToCss(node, parentDirection);
    if (node.type === "frame") {
      css["min-height"] = "100vh";
      css["max-width"] = `${node.style.width ?? 1280}px`;
      css.margin = "0 auto";
    }
    const rule = Object.entries(css)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join("\n");
    cssRules.push(`.${className} {\n${rule}\n}`);

    const direction = node.style.direction ?? "column";
    const pad = indent(level);

    switch (node.type) {
      case "text": {
        return `${pad}<p class="${className}">${escapeHtml(node.text ?? "")}</p>`;
      }
      case "button": {
        return `${pad}<button class="${className}">${escapeHtml(node.text ?? "")}</button>`;
      }
      case "input": {
        return `${pad}<input class="${className}" type="text" placeholder="${escapeHtml(node.placeholder ?? "")}" />`;
      }
      case "image": {
        if (node.src) {
          return `${pad}<img class="${className}" src="${escapeHtml(node.src)}" alt="${escapeHtml(node.name ?? "")}" />`;
        }
        return `${pad}<div class="${className}" role="img" aria-label="${escapeHtml(node.name ?? "image")}"></div>`;
      }
      default: {
        const children = (node.children ?? [])
          .map((child) => walk(child, direction, level + 1))
          .join("\n");
        const tag = node.type === "frame" ? "main" : "div";
        return children
          ? `${pad}<${tag} class="${className}">\n${children}\n${pad}</${tag}>`
          : `${pad}<${tag} class="${className}"></${tag}>`;
      }
    }
  }

  const body = walk(frame, "column", 2);
  const css = [
    `* { box-sizing: border-box; }`,
    `body { margin: 0; font-family: "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif; }`,
    ...cssRules,
  ].join("\n\n");
  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(frame.name ?? "Screen")}</title>
    <style>
${css
  .split("\n")
  .map((line) => (line ? `      ${line}` : ""))
  .join("\n")}
    </style>
  </head>
  <body>
${body}
  </body>
</html>`;
  return { html, css };
}

/** Serializes a frame to a self-contained React component with inline styles. */
export function frameToReact(frame: DesignNode): string {
  function styleLiteral(node: DesignNode, parentDirection: "row" | "column", level: number): string {
    const css = styleToCss(node, parentDirection);
    if (node.type === "frame") {
      css["min-height"] = "100vh";
      css["max-width"] = `${node.style.width ?? 1280}px`;
      css.margin = "0 auto";
    }
    const pad = indent(level);
    const entries = Object.entries(css).map(([key, value]) => {
      const camel = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return `${pad}  ${camel}: ${JSON.stringify(value)},`;
    });
    return `{\n${entries.join("\n")}\n${pad}}`;
  }

  function walk(node: DesignNode, parentDirection: "row" | "column", level: number): string {
    const pad = indent(level);
    const direction = node.style.direction ?? "column";
    const style = styleLiteral(node, parentDirection, level);

    switch (node.type) {
      case "text":
        return `${pad}<p style={${style}}>${escapeHtml(node.text ?? "")}</p>`;
      case "button":
        return `${pad}<button style={${style}}>${escapeHtml(node.text ?? "")}</button>`;
      case "input":
        return `${pad}<input style={${style}} type="text" placeholder=${JSON.stringify(node.placeholder ?? "")} />`;
      case "image":
        if (node.src) {
          return `${pad}<img style={${style}} src=${JSON.stringify(node.src)} alt=${JSON.stringify(node.name ?? "")} />`;
        }
        return `${pad}<div style={${style}} role="img" aria-label=${JSON.stringify(node.name ?? "image")} />`;
      default: {
        const children = (node.children ?? [])
          .map((child) => walk(child, direction, level + 1))
          .join("\n");
        return children
          ? `${pad}<div style={${style}}>\n${children}\n${pad}</div>`
          : `${pad}<div style={${style}} />`;
      }
    }
  }

  const componentName =
    (frame.name ?? "Screen")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join("") || "Screen";

  return `export default function ${componentName}() {
  return (
${walk(frame, "column", 2)}
  );
}
`;
}
