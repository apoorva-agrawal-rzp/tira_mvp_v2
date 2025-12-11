/**
 * MCP Proxy Utility for Remote TIRA MCP Server Communication
 */

interface McpRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: string;
  id: number;
  result?: {
    tools?: unknown[];
    content?: Array<{ type: string; text: string }>;
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
  };
}

interface RazorpayProxyConfig {
  mcpUrl: string;
  authHeader: string;
}

export class McpProxy {
  private config: RazorpayProxyConfig;
  private sessionId?: string;

  constructor(config: RazorpayProxyConfig) {
    this.config = config;
  }

  /**
   * Initialize session with remote MCP server
   */
  async initializeSession(): Promise<string> {
    const initRequest: McpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'tira-agentic-shopping',
          version: '1.0.0'
        }
      }
    };

    console.log('[MCP Proxy] Initializing session...');

    const response = await fetch(this.config.mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': this.config.authHeader
      },
      body: JSON.stringify(initRequest)
    });

    // Extract session ID from headers
    const sessionId = response.headers.get('mcp-session-id');
    if (sessionId) {
      this.sessionId = sessionId;
      console.log('[MCP Proxy] Session ID:', sessionId);
    }

    const data = await response.json() as McpResponse;
    
    if (!response.ok || data.error) {
      throw new Error(`MCP initialization failed: ${data.error?.message || response.statusText}`);
    }

    console.log('[MCP Proxy] Session initialized successfully');
    return sessionId || 'no-session-id';
  }

  /**
   * Call a tool on the remote MCP server
   */
  async callTool(toolName: string, arguments_: Record<string, unknown> = {}, retryCount = 0): Promise<unknown> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    const toolRequest: McpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: arguments_
      }
    };

    console.log(`[MCP Proxy] Calling tool: ${toolName}`);
    console.log(`[MCP Proxy] Arguments:`, JSON.stringify(arguments_, null, 2));

    const response = await fetch(this.config.mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': this.config.authHeader,
        'Mcp-Session-Id': this.sessionId || ''
      },
      body: JSON.stringify(toolRequest)
    });

    const data = await response.json() as McpResponse;

    if (!response.ok || data.error) {
      console.error(`[MCP Proxy] Tool call failed:`, data.error);
      
      // Handle session expiration - retry once with a new session
      const errorMessage = data.error?.message || response.statusText;
      if ((errorMessage.includes('No valid session ID') || errorMessage.includes('Bad Gateway')) && retryCount < 1) {
        console.log('[MCP Proxy] Session expired, re-initializing...');
        this.sessionId = undefined;
        await this.initializeSession();
        return this.callTool(toolName, arguments_, retryCount + 1);
      }
      
      throw new Error(`Tool call failed: ${errorMessage}`);
    }

    // Parse the result - MCP returns content as an array with text
    let result: unknown = data.result;
    
    if (data.result?.content && Array.isArray(data.result.content)) {
      const textContent = data.result.content.find((c: { type: string; text: string }) => c.type === 'text');
      if (textContent?.text) {
        try {
          result = JSON.parse(textContent.text);
        } catch {
          result = textContent.text;
        }
      }
    }

    console.log(`[MCP Proxy] Tool result:`, JSON.stringify(result, null, 2).slice(0, 500));
    return result;
  }

  /**
   * List available tools on the remote MCP server
   */
  async listTools(): Promise<unknown[]> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    const listRequest: McpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list'
    };

    const response = await fetch(this.config.mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': this.config.authHeader,
        'Mcp-Session-Id': this.sessionId || ''
      },
      body: JSON.stringify(listRequest)
    });

    const data = await response.json() as McpResponse;

    if (!response.ok || data.error) {
      throw new Error(`List tools failed: ${data.error?.message || response.statusText}`);
    }

    return data.result?.tools || [];
  }
}

// Singleton instance
let mcpProxyInstance: McpProxy | null = null;

export function getMcpProxy(): McpProxy {
  if (!mcpProxyInstance) {
    mcpProxyInstance = new McpProxy({
      mcpUrl: 'https://shopping-mcp-production.up.railway.app/mcp',
      authHeader: 'Bearer tira-mcp-token'
    });
  }
  return mcpProxyInstance;
}
