import type { Express } from "express";
import { createServer, type Server } from "http";
import { getMcpProxy } from "./mcp-proxy";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // MCP proxy endpoint - connects to real TIRA MCP server
  app.post('/api/mcp/invoke', async (req, res) => {
    try {
      const { tool, params } = req.body;
      
      if (!tool) {
        return res.status(400).json({ success: false, error: 'Tool name is required' });
      }

      console.log(`[API] MCP Tool: ${tool}`);
      console.log(`[API] Params:`, JSON.stringify(params, null, 2));

      const mcpProxy = getMcpProxy();
      const result = await mcpProxy.callTool(tool, params || {});
      
      console.log(`[API] Result received`);
      
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('[API] MCP Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mcp: 'https://shopping-mcp-production.up.railway.app/mcp' });
  });

  // List available MCP tools
  app.get('/api/mcp/tools', async (req, res) => {
    try {
      const mcpProxy = getMcpProxy();
      const tools = await mcpProxy.listTools();
      return res.json({ success: true, tools });
    } catch (error) {
      console.error('[API] List tools error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  return httpServer;
}
