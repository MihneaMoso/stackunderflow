// src/lib/db.ts
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";

const DB_NAME = "webllm-chat-db";
const STORE_NAME = "history";
const DB_VERSION = 1;

// export interface ChatCompletionMessageParam {
//   role: "system" | "user" | "assistant";
//   content: string;
// }

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMessages(messages: ChatCompletionMessageParam[]) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  
  // For simplicity, we just overwrite the single session "latest"
  // In a real app, you might store multiple conversations by ID
  await new Promise<void>((resolve, reject) => {
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
        // We only store the array as one blob for this basic demo
        store.put({ id: "latest_session", messages });
        resolve();
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

export async function loadMessages(): Promise<ChatCompletionMessageParam[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("latest_session");
    
    request.onsuccess = () => resolve(request.result?.messages || null);
    request.onerror = () => reject(request.error);
  });
}