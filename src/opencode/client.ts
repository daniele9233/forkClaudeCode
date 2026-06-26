import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/client";

let _client: OpencodeClient | null = null;
let _baseUrl: string | null = null;

/**
 * Initialize the SDK client with the URL of the opencode sidecar.
 * Called once on app startup after the Tauri backend emits "opencode-ready".
 */
export function initClient(baseUrl: string): OpencodeClient {
  _baseUrl = baseUrl;
  _client = createOpencodeClient({ baseUrl });
  return _client;
}

/**
 * Returns the initialized client. Throws if initClient() was not called.
 */
export function getClient(): OpencodeClient {
  if (!_client)
    throw new Error("OpenCode client not initialized — call initClient() first");
  return _client;
}

export function getBaseUrl(): string {
  if (!_baseUrl) throw new Error("OpenCode client not initialized");
  return _baseUrl;
}

export function isClientReady(): boolean {
  return _client !== null;
}
