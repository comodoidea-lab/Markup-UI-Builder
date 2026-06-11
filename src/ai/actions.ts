import { callAI, extractJson } from "./client";
import { editNodePrompt, generateFramePrompt } from "./prompts";
import type { DesignNode } from "../state/types";
import { findFrameOf, findNode, genId, normalizeTree } from "../state/nodeUtils";
import { useDesignStore } from "../state/designStore";

function stripForPrompt(node: DesignNode): unknown {
  return {
    type: node.type,
    name: node.name,
    text: node.text,
    src: node.src && node.src.startsWith("data:") ? undefined : node.src,
    placeholder: node.placeholder,
    style: node.style,
    children: node.children?.map(stripForPrompt),
  };
}

export async function generateScreen(
  prompt: string,
  width: number,
  height: number,
  imageDataUrl?: string,
): Promise<string> {
  const store = useDesignStore.getState();
  store.setAiBusy(true);
  store.pushChat({ id: genId("msg"), role: "user", content: prompt, kind: "generate" });
  try {
    const { system, user } = generateFramePrompt(prompt, width, height, Boolean(imageDataUrl));
    const raw = await callAI({ system, user, imageDataUrl });
    const tree = normalizeTree(extractJson<DesignNode>(raw));
    tree.type = "frame";
    tree.name = tree.name || prompt.slice(0, 32);
    tree.style = { ...tree.style, width, height };
    const frameId = useDesignStore.getState().insertGeneratedFrame(tree, null);
    useDesignStore.getState().pushChat({
      id: genId("msg"),
      role: "assistant",
      content: `画面「${tree.name}」を生成しました`,
      kind: "generate",
      frameId,
    });
    return frameId;
  } catch (error) {
    useDesignStore.getState().pushChat({
      id: genId("msg"),
      role: "assistant",
      content: error instanceof Error ? error.message : "生成に失敗しました",
      kind: "error",
    });
    throw error;
  } finally {
    useDesignStore.getState().setAiBusy(false);
  }
}

export async function editNodeWithAI(nodeId: string, instruction: string): Promise<void> {
  const store = useDesignStore.getState();
  const frame = findFrameOf(store.doc.frames, nodeId);
  const node = findNode(store.doc.frames, nodeId);
  if (!node) throw new Error("ノードが見つかりません");

  store.setAiBusy(true);
  store.pushChat({ id: genId("msg"), role: "user", content: instruction, kind: "edit" });
  try {
    const isFrame = node.type === "frame";
    const { system, user } = editNodePrompt(
      JSON.stringify(stripForPrompt(node), null, 2),
      instruction,
      isFrame,
    );
    const raw = await callAI({ system, user });
    const tree = normalizeTree(extractJson<DesignNode>(raw));
    if (isFrame) tree.type = "frame";
    else if (tree.type === "frame") tree.type = node.type;
    useDesignStore.getState().replaceNode(nodeId, tree);
    useDesignStore.getState().pushChat({
      id: genId("msg"),
      role: "assistant",
      content: "修正を適用しました",
      kind: "edit",
      frameId: frame?.id,
    });
  } catch (error) {
    useDesignStore.getState().pushChat({
      id: genId("msg"),
      role: "assistant",
      content: error instanceof Error ? error.message : "修正に失敗しました",
      kind: "error",
    });
    throw error;
  } finally {
    useDesignStore.getState().setAiBusy(false);
  }
}
