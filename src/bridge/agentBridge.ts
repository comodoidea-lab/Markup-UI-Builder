import { useAppStore } from "../state/appStore";
import { useReviewStore } from "../review/reviewStore";

const MARKUP_MESSAGE_TYPES = new Set(["markup:import", "markup:clear"]);

declare global {
  interface Window {
    Markup?: {
      version: number;
      ready: () => Promise<{ version: number; ready: boolean }>;
      importBoard: (payload: unknown) => Promise<unknown>;
      clearBoard: (payload?: { boardId?: string }) => Promise<unknown>;
      getSnapshot: () => Promise<Record<string, unknown>>;
    };
  }
}

/**
 * Installs the legacy-compatible Agent Bridge (window.Markup + postMessage).
 * See public/docs/agent-bridge-api.md for the contract.
 */
export function installAgentBridge(): Promise<unknown> {
  const review = () => useReviewStore.getState();

  const markupReady = review()
    .restoreFromLocation()
    .then((result) => {
      if (result.restored) useAppStore.getState().setMode("review");
      return result;
    })
    .catch(() => ({ restored: false }));

  const importBoard = async (payload: unknown) => {
    const result = await review().importBoard(payload);
    useAppStore.getState().setMode("review");
    return result;
  };

  window.Markup = {
    version: 1,
    ready: async () => {
      await markupReady;
      return { version: 1, ready: true };
    },
    importBoard,
    clearBoard: (payload) => review().clearImportedBoard(payload),
    getSnapshot: async () => {
      await markupReady;
      return review().getSnapshot();
    },
  };

  window.addEventListener("message", async (event) => {
    const message = event.data as
      | { type?: string; token?: string; requestId?: string; payload?: unknown }
      | undefined;
    if (message?.type === "markup:route") {
      const state = review();
      if (event.origin === state.liveOrigin && state.sourceType === "live") {
        const route = message as { href?: string; path?: string };
        state.syncLiveUrl(route.href || route.path || "/");
      }
      return;
    }
    if (!message?.type || !MARKUP_MESSAGE_TYPES.has(message.type)) return;

    const expectedToken = new URL(location.href).searchParams.get("token");
    if (expectedToken ? message.token !== expectedToken : event.origin !== location.origin) return;

    const responseTarget = event.source as Window | null;
    const targetOrigin = event.origin === "null" ? "*" : event.origin;
    try {
      const result =
        message.type === "markup:import"
          ? await importBoard(message.payload)
          : await review().clearImportedBoard(message.payload as { boardId?: string });
      responseTarget?.postMessage(
        {
          type: "markup:ack",
          ok: true,
          requestId: message.requestId,
          command: message.type,
          summary: result,
        },
        targetOrigin,
      );
    } catch (error) {
      responseTarget?.postMessage(
        {
          type: "markup:error",
          ok: false,
          requestId: message.requestId,
          command: message.type,
          errorMessage: (error as Error).message,
        },
        targetOrigin,
      );
    }
  });

  return markupReady;
}
