// src/lib/worker.ts
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// A handler that bridges the worker and the main thread
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};