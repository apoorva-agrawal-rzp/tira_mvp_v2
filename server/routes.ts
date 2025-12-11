import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Demo mode session storage
const demoSessions: Map<string, { phone: string; otp: string; requestId: string }> = new Map();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // MCP proxy endpoint - Demo mode with simulated responses
  app.post('/api/mcp/invoke', async (req, res) => {
    try {
      const { tool, params } = req.body;
      
      if (!tool) {
        return res.status(400).json({ success: false, error: 'Tool name is required' });
      }

      console.log(`[MCP Demo] Tool: ${tool}`);
      console.log(`[MCP Demo] Params:`, JSON.stringify(params, null, 2));

      const response = getDemoResponse(tool, params);
      console.log(`[MCP Demo] Response:`, JSON.stringify(response, null, 2));
      
      return res.json({ success: true, data: response, demo: true });
    } catch (error) {
      console.error('[MCP Demo] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  return httpServer;
}

function getDemoResponse(tool: string, params?: Record<string, unknown>): unknown {
  const timestamp = Date.now();
  
  switch (tool) {
    case 'tira_send_otp': {
      // Generate a demo OTP (1234 for easy demo)
      const requestId = `demo_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      const phone = params?.mobile as string || '';
      
      // Store demo session
      demoSessions.set(requestId, {
        phone,
        otp: '1234', // Demo OTP is always 1234
        requestId,
      });
      
      return {
        success: true,
        request_id: requestId,
        message: 'Demo OTP sent! Use code: 1234',
        resend_timer: 60,
        demo_otp: '1234', // Include OTP in response for demo
      };
    }

    case 'tira_verify_otp': {
      const requestId = params?.request_id as string;
      const otp = params?.otp as string;
      
      // For demo, accept 1234 as valid OTP
      if (otp === '1234') {
        return {
          success: true,
          session_cookie: `f.session=demo_session_${timestamp}`,
          user: {
            name: 'Demo User',
            email: 'demo@tira.com',
            phone: demoSessions.get(requestId)?.phone || params?.mobile || '',
          },
        };
      } else {
        return {
          success: false,
          error: 'Invalid OTP. For demo, use: 1234',
        };
      }
    }

    case 'get_products': {
      return {
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
          {
            uid: 1006,
            slug: 'sugar-matte-as-hell-crayon-lipstick-scarlett-ohara',
            name: 'SUGAR Matte As Hell Crayon Lipstick - Scarlett O Hara',
            brand: { name: 'SUGAR' },
            images: [{ url: 'https://images.unsplash.com/photo-1583241475880-083f84372725?w=400' }],
            price: { effective: { min: 799 }, marked: { min: 999 } },
            discount: '20% OFF',
            rating: 4.6,
            ratingCount: 3421,
            item_id: 1006,
            article_id: '39_1006',
          },
        ],
      };
    }

    case 'tira_get_product_by_slug': {
      const slug = params?.slug as string || '';
      
      // Return product based on slug
      const products: Record<string, unknown> = {
        'lakme-9to5-primer-matte-lipstick-mb1-coral-date-36g': {
          uid: 1001,
          slug: 'lakme-9to5-primer-matte-lipstick-mb1-coral-date-36g',
          name: 'Lakme 9to5 Primer Matte Lipstick - MB1 Coral Date',
          brand: { name: 'Lakme' },
          images: [
            { url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400' },
            { url: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400' },
            { url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400' },
          ],
          price: { effective: { min: 499 }, marked: { min: 599 } },
          discount: '17% OFF',
          rating: 4.3,
          ratingCount: 1245,
          description: 'A creamy matte lipstick that provides intense color payoff with a comfortable, long-lasting finish. Enriched with primer technology for smooth application. The 9to5 range is designed for the modern working woman who needs a lipstick that lasts through her busy day.',
          item_id: 1001,
          article_id: '39_1001',
          highlights: ['Long-lasting formula', 'Primer-infused', 'Creamy matte finish', 'Comfortable wear'],
        },
        'mac-retro-matte-lipstick-ruby-woo': {
          uid: 1004,
          slug: 'mac-retro-matte-lipstick-ruby-woo',
          name: 'MAC Retro Matte Lipstick - Ruby Woo',
          brand: { name: 'MAC' },
          images: [
            { url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400' },
            { url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400' },
          ],
          price: { effective: { min: 1750 }, marked: { min: 1950 } },
          discount: '10% OFF',
          rating: 4.7,
          ratingCount: 4521,
          description: 'The iconic Ruby Woo - a vivid blue-red with a retro matte finish. This cult-favorite lipstick delivers intense color and stays put all day. A must-have for any makeup collection.',
          item_id: 1004,
          article_id: '39_1004',
          highlights: ['Iconic shade', 'Retro matte finish', 'Long-wearing', 'High pigment'],
        },
      };

      const product = products[slug] || {
        uid: 1001,
        slug: slug,
        name: 'Premium Beauty Product',
        brand: { name: 'TIRA' },
        images: [{ url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400' }],
        price: { effective: { min: 599 }, marked: { min: 799 } },
        discount: '25% OFF',
        rating: 4.5,
        ratingCount: 500,
        description: 'A premium beauty product from TIRA. High quality ingredients for beautiful results.',
        item_id: 1001,
        article_id: '39_1001',
      };

      return { product };
    }

    case 'check_user_session':
      return {
        isAuthenticated: true,
        user: { name: 'Demo User', email: 'demo@tira.com' },
      };

    case 'add_to_cart':
      return {
        success: true,
        cart_details: {
          cart: { id: `cart_${timestamp}`, cart_id: timestamp },
        },
      };

    case 'get_address':
      return { addresses: [] };

    case 'add_address':
      return { success: true, address_id: `addr_${timestamp}` };

    case 'get_token_masked_data':
      return { customer_id: `cust_demo_${timestamp}`, items: [] };

    case 'create_order_with_masked_data':
      return {
        id: `order_${timestamp}`,
        amount: params?.amount || 10000,
        currency: params?.currency || 'INR',
      };

    case 'initiate_payment_with_masked_data':
      return {
        id: `pay_${timestamp}`,
        upi_link: 'upi://pay?pa=demo@upi&pn=TIRA&am=100',
        short_url: 'https://rzp.io/demo-payment',
      };

    case 'tira_price_bidding':
      return {
        bidId: `bid_${timestamp}`,
        monitorId: `mon_${timestamp}`,
        orderId: `order_${timestamp}`,
        paymentId: `pay_${timestamp}`,
        upi_link: 'upi://pay?pa=demo@upi&pn=TIRA&am=100',
        message: 'Price bid registered successfully! (Demo Mode)',
      };

    case 'tira_activate_price_bidding':
      return {
        success: true,
        monitorId: params?.bidId || `mon_${timestamp}`,
        message: 'Price monitoring activated',
      };

    case 'tira_list_price_bids':
      return { bids: [] };

    case 'tira_register_price_monitor':
      return { monitorId: `mon_${timestamp}`, message: 'Price monitor registered' };

    case 'tira_delete_price_monitor':
      return { success: true };

    case 'checkout':
      return { success: true, order_id: `order_${timestamp}` };

    case 'mark_order_success':
      return { success: true, message: 'Order marked as successful' };

    default:
      return { success: true, message: `Tool ${tool} executed (Demo Mode)` };
  }
}
