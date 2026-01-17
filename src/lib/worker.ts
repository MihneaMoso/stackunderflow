// src/lib/worker.ts
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Lazy initialization of the handler
let handler: WebWorkerMLCEngineHandler;

self.onmessage = (msg: MessageEvent) => {
  if (!handler) {
    handler = new WebWorkerMLCEngineHandler();
    console.log("Web Worker: WebLLM Engine Handler Activated");
  }
  handler.onmessage(msg);
};