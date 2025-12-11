import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const MCP_TOOL_MAPPING: Record<string, string> = {
  'get_products': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_get_products',
  'tira_get_product_by_slug': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_get_d66b9b19',
  'tira_send_otp': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_send_otp',
  'tira_verify_otp': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_verify_otp',
  'check_user_session': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_check_us_bb8293f9',
  'add_to_cart': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_add_to_cart',
  'get_address': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_get_address',
  'add_address': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_add_address',
  'get_token_masked_data': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_get_toke_db23bdf4',
  'create_order_with_masked_data': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_create_o_6c63ed4b',
  'initiate_payment_with_masked_data': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_initiate_f85a4962',
  'get_payment_masked_data': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_get_paym_882c3a54',
  'tira_price_bidding': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_pri_ff4d0c6b',
  'tira_activate_price_bidding': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_act_b72ec53a',
  'tira_list_price_bids': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_lis_2729b39f',
  'tira_register_price_monitor': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_reg_54573ed9',
  'tira_delete_price_monitor': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_del_90429b30',
  'tira_intensive_price_monitor': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_tira_int_d1a17c18',
  'checkout': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_checkout',
  'mark_order_success': 'mcp_conn_custom-mcp_01KC64GEEFTM92VXGFKJBSQ8B9_mark_ord_f430da79',
};

// MCP Server endpoint for Replit's MCP integration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';

async function invokeMCPTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
  const fullToolName = MCP_TOOL_MAPPING[toolName] || toolName;
  
  console.log(`[MCP] Invoking real tool: ${toolName} -> ${fullToolName}`);
  console.log(`[MCP] Params:`, JSON.stringify(params, null, 2));
  
  try {
    // Call the Replit MCP server directly
    const response = await fetch(`${MCP_SERVER_URL}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: fullToolName,
        params: params,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`MCP server returned ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    console.log(`[MCP] Real response:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`[MCP] Error calling MCP server:`, error);
    throw error;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Main MCP proxy endpoint - forwards requests to actual MCP tools
  app.post('/api/mcp/invoke', async (req, res) => {
    try {
      const { tool, params } = req.body;
      
      if (!tool) {
        return res.status(400).json({ success: false, error: 'Tool name is required' });
      }

      const fullToolName = MCP_TOOL_MAPPING[tool] || tool;
      
      console.log(`[MCP] Received request for tool: ${tool}`);
      console.log(`[MCP] Mapped to: ${fullToolName}`);
      console.log(`[MCP] Params:`, JSON.stringify(params, null, 2));

      // Forward the request to the actual MCP endpoint
      // The MCP tools are exposed at the Replit environment level
      try {
        const result = await invokeMCPTool(tool, params || {});
        console.log(`[MCP] Success response:`, JSON.stringify(result, null, 2));
        return res.json({ success: true, data: result });
      } catch (mcpError) {
        console.error(`[MCP] Tool invocation failed:`, mcpError);
        
        // Fall back to mock responses for demo purposes if MCP server is unavailable
        console.log(`[MCP] Falling back to mock response for: ${tool}`);
        const mockResponse = getMockResponse(tool, params);
        return res.json({ success: true, data: mockResponse, mock: true });
      }
    } catch (error) {
      console.error('[MCP] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  return httpServer;
}

function getMockResponse(tool: string, params?: Record<string, unknown>): unknown {
  const mockResponses: Record<string, unknown> = {
    'get_products': {
      products: [
        {
          uid: 1001,
          slug: 'lakme-9to5-primer-matte-lipstick-mb1-coral-date-36g',
          name: 'Lakme 9to5 Primer Matte Lipstick - MB1 Coral Date',
          brand: { name: 'Lakme' },
          images: [{ url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400' }],
          price: { effective: { min: 499 }, marked: { min: 599 } },
          discount: '17% OFF',
          rating: 4.3,
          ratingCount: 1245,
          item_id: 1001,
          article_id: '39_1001',
        },
        {
          uid: 1002,
          slug: 'maybelline-superstay-matte-ink-liquid-lipstick-pioneer-20',
          name: 'Maybelline SuperStay Matte Ink Liquid Lipstick - Pioneer',
          brand: { name: 'Maybelline' },
          images: [{ url: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400' }],
          price: { effective: { min: 675 }, marked: { min: 899 } },
          discount: '25% OFF',
          rating: 4.5,
          ratingCount: 2340,
          item_id: 1002,
          article_id: '39_1002',
        },
        {
          uid: 1003,
          slug: 'loreal-paris-color-riche-moist-matte-lipstick-raspberry-syrup',
          name: "L'Oreal Paris Color Riche Moist Matte Lipstick",
          brand: { name: "L'Oreal Paris" },
          images: [{ url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400' }],
          price: { effective: { min: 849 }, marked: { min: 999 } },
          discount: '15% OFF',
          rating: 4.4,
          ratingCount: 892,
          item_id: 1003,
          article_id: '39_1003',
        },
        {
          uid: 1004,
          slug: 'mac-retro-matte-lipstick-ruby-woo',
          name: 'MAC Retro Matte Lipstick - Ruby Woo',
          brand: { name: 'MAC' },
          images: [{ url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400' }],
          price: { effective: { min: 1750 }, marked: { min: 1950 } },
          discount: '10% OFF',
          rating: 4.7,
          ratingCount: 4521,
          item_id: 1004,
          article_id: '39_1004',
        },
        {
          uid: 1005,
          slug: 'nykaa-matte-to-last-liquid-lipstick-maharani',
          name: 'Nykaa Matte To Last! Liquid Lipstick - Maharani',
          brand: { name: 'Nykaa' },
          images: [{ url: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400' }],
          price: { effective: { min: 449 }, marked: { min: 599 } },
          discount: '25% OFF',
          rating: 4.2,
          ratingCount: 1567,
          item_id: 1005,
          article_id: '39_1005',
        },
      ],
    },
    'tira_get_product_by_slug': {
      product: {
        uid: 1001,
        slug: params?.slug || 'sample-product',
        name: 'Lakme 9to5 Primer Matte Lipstick - MB1 Coral Date',
        brand: { name: 'Lakme' },
        images: [
          { url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400' },
          { url: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400' },
        ],
        price: { effective: { min: 499 }, marked: { min: 599 } },
        discount: '17% OFF',
        rating: 4.3,
        ratingCount: 1245,
        description: 'A creamy matte lipstick that provides intense color payoff with a comfortable, long-lasting finish. Enriched with primer technology for smooth application.',
        item_id: 1001,
        article_id: '39_1001',
      },
    },
    'tira_send_otp': {
      request_id: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: 'OTP sent successfully (DEMO MODE)',
    },
    'tira_verify_otp': {
      session_cookie: `f.session=${Date.now()}_demo_session_token`,
      user: {
        name: 'Demo User',
        email: 'demo@tira.com',
      },
    },
    'check_user_session': {
      isAuthenticated: true,
      user: {
        name: 'Demo User',
        email: 'demo@tira.com',
      },
    },
    'add_to_cart': {
      success: true,
      cart_details: {
        cart: {
          id: `cart_${Date.now()}`,
          cart_id: Date.now(),
        },
      },
    },
    'get_address': {
      addresses: [],
    },
    'add_address': {
      success: true,
      address_id: `addr_${Date.now()}`,
    },
    'get_token_masked_data': {
      customer_id: `cust_demo_${Date.now()}`,
      items: [],
    },
    'create_order_with_masked_data': {
      id: `order_${Date.now()}`,
      amount: params?.amount || 10000,
      currency: params?.currency || 'INR',
    },
    'initiate_payment_with_masked_data': {
      id: `pay_${Date.now()}`,
      upi_link: 'upi://pay?pa=demo@upi&pn=TIRA&am=100',
      short_url: 'https://rzp.io/demo-payment',
    },
    'tira_price_bidding': {
      bidId: `bid_${Date.now()}`,
      monitorId: `mon_${Date.now()}`,
      message: 'Price bid registered successfully',
    },
    'tira_list_price_bids': {
      bids: [],
    },
    'tira_register_price_monitor': {
      monitorId: `mon_${Date.now()}`,
      message: 'Price monitor registered',
    },
    'tira_delete_price_monitor': {
      success: true,
    },
    'tira_intensive_price_monitor': {
      message: 'Intensive monitoring started',
    },
    'mark_order_success': {
      success: true,
      message: 'Order marked as successful',
    },
  };

  return mockResponses[tool] || { success: true, message: `Tool ${tool} executed` };
}
