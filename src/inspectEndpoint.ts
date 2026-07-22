import { lookup } from "node:dns/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import ipaddr from "ipaddr.js";
import type { MCPToolSpec } from "./launchLens";

type ListedTool = {
  name: string;
  description?: string;
  inputSchema?: { type?: string; properties?: Record<string, object>; required?: string[]; [key: string]: unknown };
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
};

export type EndpointInspection = {
  endpoint: string;
  serverName: string;
  serverVersion?: string;
  inspectedAt: string;
  tools: MCPToolSpec[];
};

export function isPublicIpAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

export async function assertPublicMcpUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("MCP endpoint must be a valid HTTPS URL.");
  }
  if (url.protocol !== "https:") throw new Error("MCP endpoint must use HTTPS.");
  if (url.username || url.password) throw new Error("Credentials are not allowed in the MCP endpoint URL.");
  if (url.search) throw new Error("MCP endpoint query parameters are not allowed; use standard authorization headers instead.");
  if (!url.hostname || url.hostname.endsWith(".local") || url.hostname === "localhost") throw new Error("Local MCP endpoints are not allowed.");

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Error("MCP endpoint must resolve only to public internet addresses.");
  }
  return url;
}

export function mapMcpTool(tool: ListedTool): MCPToolSpec {
  const annotations = tool.annotations ?? {};
  const sideEffect = annotations.destructiveHint ? "destructive" : annotations.readOnlyHint ? "read" : "write";
  const inputSchema = tool.inputSchema;
  const hasInputSchema = inputSchema?.type === "object" && Boolean(inputSchema.properties || inputSchema.required);
  const hasExamples = inputSchema && ("examples" in inputSchema || Object.values(inputSchema.properties ?? {}).some((property) => "examples" in property || "example" in property)) ? true : undefined;
  return {
    name: tool.name,
    description: tool.description?.trim() || "No tool description supplied.",
    sideEffect,
    externalNetwork: annotations.openWorldHint,
    hasInputSchema,
    hasExamples,
  };
}

function timeoutSignal(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const deadline = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, deadline]) : deadline;
}

export async function inspectMcpEndpoint(endpoint: string, timeoutMs = 10_000): Promise<EndpointInspection> {
  const url = await assertPublicMcpUrl(endpoint);
  const guardedFetch: typeof fetch = async (input, init) => {
    const requestUrl = input instanceof Request ? input.url : input.toString();
    await assertPublicMcpUrl(requestUrl);
    const response = await fetch(input, { ...init, redirect: "manual", signal: timeoutSignal(init?.signal, timeoutMs) });
    if (response.status >= 300 && response.status < 400) throw new Error("MCP endpoint redirects are not followed.");
    return response;
  };

  const transport = new StreamableHTTPClientTransport(url, {
    fetch: guardedFetch,
    reconnectionOptions: { initialReconnectionDelay: 250, maxReconnectionDelay: 1_000, reconnectionDelayGrowFactor: 1.5, maxRetries: 0 },
  });
  const client = new Client({ name: "mcp-launch-lens-inspector", version: "1.1.0" }, { capabilities: {} });
  const tools: MCPToolSpec[] = [];

  try {
    await client.connect(transport, { timeout: timeoutMs });
    let cursor: string | undefined;
    for (let page = 0; page < 10; page += 1) {
      const result = await client.listTools(cursor ? { cursor } : undefined, { timeout: timeoutMs });
      tools.push(...result.tools.map(mapMcpTool));
      cursor = result.nextCursor;
      if (!cursor) break;
      if (page === 9) throw new Error("MCP tool list exceeded the 10-page inspection limit.");
    }
    const server = client.getServerVersion();
    return {
      endpoint: url.toString(),
      serverName: server?.name || url.hostname,
      serverVersion: server?.version,
      inspectedAt: new Date().toISOString(),
      tools,
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}
