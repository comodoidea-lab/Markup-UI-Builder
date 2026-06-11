import type { BoardRecord, DesignDocument } from "./types";

const REVIEW_DB = "markup-agent-boards";
const REVIEW_DB_VERSION = 1;
const STUDIO_DB = "markup-studio";
const STUDIO_DB_VERSION = 1;

function openDb(name: string, version: number, store: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(store)) {
        request.result.createObjectStore(store, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function dbGet<T>(name: string, version: number, store: string, id: string): Promise<T | null> {
  const db = await openDb(name, version, store);
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).get(id);
    request.addEventListener("success", () => resolve((request.result as T) || null));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function dbGetAll<T>(name: string, version: number, store: string): Promise<T[]> {
  const db = await openDb(name, version, store);
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).getAll();
    request.addEventListener("success", () => resolve((request.result as T[]) || []));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function dbPut(name: string, version: number, store: string, value: unknown): Promise<void> {
  const db = await openDb(name, version, store);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).put(value);
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

async function dbDelete(name: string, version: number, store: string, id: string): Promise<void> {
  const db = await openDb(name, version, store);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).delete(id);
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

// Review boards — same DB/store as the legacy app for Agent Bridge compatibility.
export const readBoard = (id: string) =>
  dbGet<BoardRecord>(REVIEW_DB, REVIEW_DB_VERSION, "boards", id);
export const writeBoard = (board: BoardRecord) =>
  dbPut(REVIEW_DB, REVIEW_DB_VERSION, "boards", board);
export const deleteBoard = (id: string) => dbDelete(REVIEW_DB, REVIEW_DB_VERSION, "boards", id);

// Design documents.
export const readDesign = (id: string) =>
  dbGet<DesignDocument>(STUDIO_DB, STUDIO_DB_VERSION, "designs", id);
export const listDesigns = () => dbGetAll<DesignDocument>(STUDIO_DB, STUDIO_DB_VERSION, "designs");
export const writeDesign = (doc: DesignDocument) =>
  dbPut(STUDIO_DB, STUDIO_DB_VERSION, "designs", doc);
export const deleteDesign = (id: string) => dbDelete(STUDIO_DB, STUDIO_DB_VERSION, "designs", id);
