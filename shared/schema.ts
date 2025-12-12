import { z } from "zod";

export const productSchema = z.object({
  id: z.string().optional(),
  uid: z.number().optional(),
  slug: z.string(),
  name: z.string(),
  brand: z.object({
    name: z.string(),
  }).optional(),
  brandName: z.string().optional(),
  images: z.array(z.object({
    url: z.string(),
    alt: z.string().optional(),
  })).optional(),
  medias: z.array(z.object({
    url: z.string(),
    type: z.string().optional(),
  })).optional(),
  price: z.object({
    effective: z.object({
      min: z.number(),
      max: z.number().optional(),
    }).optional(),
    marked: z.object({
      min: z.number(),
      max: z.number().optional(),
    }).optional(),
  }).optional(),
  effectivePrice: z.number().optional(),
  markedPrice: z.number().optional(),
  discount: z.string().optional(),
  discountPercent: z.number().optional(),
  rating: z.number().optional(),
  ratingCount: z.number().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  itemId: z.number().optional(),
  articleId: z.string().optional(),
});

export type Product = z.infer<typeof productSchema>;

export const priceBidSchema = z.object({
  id: z.string(),
  bidId: z.string().optional(),
  monitorId: z.string().optional(),
  product: z.object({
    name: z.string(),
    brand: z.string().optional(),
    image: z.string().optional(),
    slug: z.string(),
  }),
  bidPrice: z.number(),
  currentPrice: z.number(),
  status: z.enum(['monitoring', 'active', 'completed', 'expired', 'cancelled', 'payment_pending']),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  orderId: z.string().optional(),
  paymentId: z.string().optional(),
});

export type PriceBid = z.infer<typeof priceBidSchema>;

export const addressSchema = z.object({
  id: z.string(),
  uid: z.number().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string(),
  area: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  isDefault: z.boolean().optional(),
  addressType: z.string().optional(),
});

export type Address = z.infer<typeof addressSchema>;

export const orderSchema = z.object({
  id: z.string(),
  product: z.object({
    name: z.string(),
    brand: z.string().optional(),
    image: z.string().optional(),
    slug: z.string().optional(),
  }),
  paidPrice: z.number(),
  originalPrice: z.number().optional(),
  savings: z.number().optional(),
  status: z.string(),
  placedAt: z.string(),
  type: z.enum(['price_bid', 'direct']),
});

export type Order = z.infer<typeof orderSchema>;

export const userSchema = z.object({
  phone: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;

export const mandateTokenSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  status: z.string(),
  max_amount: z.number().optional(),
  amount_blocked: z.number().optional(),
  amount_debited: z.number().optional(),
  created_at: z.string().optional(),
  expired_at: z.string().optional(),
});

export type MandateToken = z.infer<typeof mandateTokenSchema>;

export const cartItemSchema = z.object({
  itemId: z.number(),
  articleId: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  image: z.string().optional(),
  price: z.number(),
  quantity: z.number(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
