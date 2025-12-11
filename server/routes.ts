import type { Express } from "express";
import { createServer, type Server } from "http";
import { getMcpProxy } from "./mcp-proxy";
import https from "https";
import http from "http";
import { pipeline } from "stream/promises";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Image proxy endpoint to handle CORS issues with external CDN images
  app.get('/api/image-proxy', (req, res) => {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl) {
      res.status(400).send('Image URL is required');
      return;
    }

    // Validate URL - only allow TIRA CDN domains
    const allowedDomains = ['cdn.tiraz5.de', 'tirabeauty.com', 'tiraz5.de'];
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      res.status(400).send('Invalid URL');
      return;
    }
    
    if (!allowedDomains.some(domain => url.hostname.includes(domain))) {
      res.status(403).send('Domain not allowed');
      return;
    }

    const protocol = url.protocol === 'https:' ? https : http;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const proxyReq = protocol.get(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Referer': 'https://tirabeauty.com/',
      }
    }, async (proxyRes) => {
      clearTimeout(timeout);
      
      if (proxyRes.statusCode !== 200) {
        res.status(proxyRes.statusCode || 500).send('Failed to fetch image');
        return;
      }
      
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
      
      try {
        await pipeline(proxyRes, res);
      } catch (err) {
        // Pipeline error - response may already be partially sent
        if (!res.headersSent) {
          res.status(500).end();
        }
      }
    });

    proxyReq.on('error', (err) => {
      clearTimeout(timeout);
      if (!res.headersSent) {
        if (err.name === 'AbortError') {
          res.status(504).send('Image fetch timeout');
        } else {
          res.status(500).send('Failed to fetch image');
        }
      }
    });

    res.on('close', () => {
      clearTimeout(timeout);
      controller.abort();
    });
  });

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
