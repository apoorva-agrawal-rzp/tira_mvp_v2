# TIRA Agentic Shopping MCP Documentation

> Complete API reference for the TIRA (Reliance Retail) MCP integration with Claude

---

## Table of Contents

1. [Authentication](#authentication)
2. [Product Discovery](#product-discovery)
3. [Cart Management](#cart-management)
4. [Address Management](#address-management)
5. [Checkout & Orders](#checkout--orders)
6. [Payment Processing](#payment-processing)
7. [Price Monitoring & Bidding](#price-monitoring--bidding)
8. [Utility Tools](#utility-tools)

---

## Authentication

### `tira_send_otp`
Send OTP to user's mobile number for authentication.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `mobile` | string | ✅ | - | 10-digit mobile number |
| `country_code` | string | ❌ | "91" | Country code |
| `city` | string | ❌ | "MUMBAI" | City name |
| `pincode` | string | ❌ | "400013" | Delivery area pincode |

**Returns:** `request_id` needed for OTP verification

---

### `tira_verify_otp`
Verify OTP and get authentication tokens.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `otp` | string | ✅ | - | OTP received on mobile |
| `request_id` | string | ✅ | - | Request ID from `tira_send_otp` |
| `city` | string | ❌ | "MUMBAI" | City name |
| `pincode` | string | ❌ | "400013" | Delivery area pincode |

**Returns:** Session cookie (`f.session`) and user details

---

### `check_user_session`
Check if user is authenticated.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cookies` | string | ❌ | - | Session cookie from authentication |
| `city` | string | ❌ | "MUMBAI" | City name |
| `pincode` | string | ❌ | "400013" | Delivery area pincode |

**Returns:** `false` if not authenticated, or user details if authenticated

---

## Product Discovery

### `get_products`
Search and return relevant products.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✅ | - | Search term (e.g., "lipstick", "foundation") |
| `limit` | number | ❌ | 12 | Max products to return |
| `pageId` | number | ❌ | 0 | Page ID for pagination |
| `bearerToken` | string | ❌ | - | Optional auth token |

**Returns:** Product list with:
- Product Name & Brand
- **Product Slug** (critical for price bidding)
- Price & Discount
- Rating & Images
- `item_id` and `article_id` (for cart operations)

---

### `tira_get_product_by_slug`
Get detailed product information using slug.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `slug` | string | ✅ | - | Product slug from search results |
| `bearerToken` | string | ❌ | - | Optional auth token |

**Returns:** Comprehensive product details including description, specifications, images, pricing, and availability

---

## Cart Management

### `add_to_cart`
Add products to cart. Handles authentication automatically.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `items` | array | ✅ | - | Array of items to add |
| `items[].item_id` | number | ✅ | - | Product item ID |
| `items[].article_id` | string | ✅ | - | Format: `store_id_item_code` |
| `items[].quantity` | number | ❌ | 1 | Quantity to add |
| `items[].item_size` | string | ❌ | "OS" | Item size |
| `sessionCookie` | string | ❌ | - | Session cookie for auth |
| `area_code` | string | ❌ | "400013" | Delivery pincode |

**Returns:** 
- `cart_details.cart.id` (UUID) - **Use this for checkout**
- `cart_details.cart.cart_id` (numeric) - Do NOT use for checkout

**Important:** After adding items, offer:
1. Proceed to checkout
2. Add more products
3. Set up price bidding

---

### `tira_set_delivery_mode`
Set delivery mode (express/non-express) before checkout.

**Parameters:** None required

**Important:** Always call with `express=false` before checkout to avoid errors.

---

## Address Management

### `get_address`
Get saved addresses for authenticated user.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cookies` | string | ❌ | - | Session cookie |
| `city` | string | ❌ | "MUMBAI" | City name |
| `pincode` | string | ❌ | "400013" | Delivery pincode |

**Returns:** List of addresses with:
- `id` (UUID) - **Use this for checkout**
- `uid` (numeric) - Do NOT use for checkout

**Critical:** Always ask user to confirm address before proceeding!

---

### `add_address`
Add new delivery address.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `address` | string | ✅ | - | Street address |
| `area` | string | ✅ | - | Area name |
| `area_code` | string | ✅ | - | Area/pincode code |
| `state` | string | ✅ | - | State name |
| `cookies` | string | ❌ | - | Session cookie |
| `city` | string | ❌ | "MUMBAI" | City name |
| `pincode` | string | ❌ | "400013" | Delivery pincode |
| `name` | string | ❌ | - | Recipient name (auto-fetched if not provided) |
| `phone` | string | ❌ | - | Phone number (auto-fetched if not provided) |
| `address_type` | string | ❌ | "home" | Type: home/work/other |
| `is_default_address` | boolean | ❌ | false | Set as default |

---

## Checkout & Orders

### ⚠️ Mandatory Checkout Flow

```
1. get_address → Fetch user addresses
2. User confirms address choice
3. checkout → Create order on TIRA
4. get_token_masked_data → Check existing tokens
5. create_order_with_masked_data → Create Razorpay order
6. initiate_payment_with_masked_data → Process payment
```

---

### `checkout`
Create order on TIRA platform. **Does NOT complete the order!**

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `addressId` | string | ✅ | - | Address UUID (from `get_address` `id` field) |
| `cartId` | string | ✅ | - | Cart UUID (from `add_to_cart` `cart.id` field) |
| `sessionCookie` | string | ✅ | - | Full cookie string |
| `paymentMode` | string | ❌ | "NB" | NB/UPI/Card/Wallet/COD |
| `city` | string | ❌ | "DELHI" | City name |
| `pincode` | string | ❌ | "110009" | Delivery pincode |

**Payment Modes:**
- `NB` - Net Banking (requires Razorpay flow)
- `UPI` - UPI (requires Razorpay flow)
- `Card` - Card (requires Razorpay flow)
- `Wallet` - Wallet (requires Razorpay flow)
- `COD` - Cash on Delivery (completes immediately)

**COD Confirmation:** If online payment fails, set `codConfirmed=true` after user confirmation.

---

### `create_order`
Alternative order creation tool.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `addressId` | string | ✅ | - | Address ID |
| `cartId` | string | ✅ | - | Cart UUID |
| `sessionCookie` | string | ✅ | - | Session cookie |
| `paymentMode` | string | ❌ | "NB" | Payment mode |

---

### `mark_order_success`
Mark order as successful in mock payment system.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `totalAmount` | string | ✅ | - | Total amount (e.g., "200.00") |
| `transactionRefNumber` | string | ✅ | - | Order ID or reference |
| `transactionDateTime` | string | ❌ | now | ISO timestamp |

---

## Payment Processing

### `get_token_masked_data`
Check for existing UPI Reserve Pay tokens.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `contact` | string | ✅ | - | 10-digit phone number |

**Returns:**
- `customer_id` (use for other tools)
- Existing tokens with status
- `amount_blocked` and `amount_debited`

**Logic:**
- `available_amount = amount_blocked - amount_debited`
- If token exists with `available_amount > order_amount` → Use existing token
- If no valid token → Set up new UPI Reserve Pay

---

### `create_order_with_masked_data`
Create Razorpay order for payment.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `amount` | number | ✅ | - | Amount in smallest unit (₹295 = 29500) |
| `currency` | string | ✅ | - | ISO code (e.g., "INR") |
| `customer_id` | string | ❌ | - | Customer ID (starts with `cust_`) |
| `session_cookie` | string | ❌ | - | Session cookie |
| `method` | string | ❌ | - | Payment method for mandate |
| `token` | object | ❌ | - | Token object for mandate orders |

**Token Object (for new UPI Reserve Pay):**
```json
{
  "max_amount": 29500,  // Should equal order amount
  "frequency": "as_presented",
  "type": "single_block_multiple_debit"
}
```

---

### `initiate_payment_with_masked_data`
Process payment (final step).

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `amount` | number | ✅ | - | Amount in smallest unit |
| `order_id` | string | ✅ | - | Order ID (starts with `order_`) |
| `currency` | string | ❌ | "INR" | Currency code |
| `customer_id` | string | ❌ | - | Customer ID |
| `contact` | string | ❌ | - | Phone number |
| `token` | string | ❌ | - | Token ID for repeat payment |
| `upi_intent` | boolean | ❌ | - | Enable UPI intent flow |
| `recurring` | boolean | ❌ | - | For SBMD payments |
| `force_terminal_id` | string | ❌ | - | Use `term_RMD93ugGbBOhTp` for mandate |

**First Payment:** Use `upi_intent=true`, `recurring=true`, `force_terminal_id`  
**Repeat Payment:** Use `token` from existing confirmed token

---

### `get_payment_masked_data`
Check payment status.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `payment_id` | string | ✅ | - | Payment ID (starts with `pay_`) |

---

## Price Monitoring & Bidding

### `tira_price_bidding`
**Buy + Track Price Drops** - Complete agentic shopping flow.

**How It Works:**
1. User sets target bid price (lower than current)
2. Pre-authorize target amount via UPI Reserve Pay
3. System monitors price every 10 seconds
4. When price drops to target → Order auto-created
5. Payment auto-debited

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `bidPrice` | number | ✅ | - | Target price |
| `purchasePrice` | number | ✅ | - | Current price |
| `productSlug` | string | ✅ | - | Product slug |
| `productName` | string | ✅ | - | Product name |
| `productItemId` | number | ✅ | - | Product item ID |
| `productArticleId` | string | ✅ | - | Article ID |
| `sessionCookie` | string | ✅ | - | Session cookie |
| `userId` | string | ✅ | - | User identifier |
| `userPhone` | string | ✅ | - | 10-digit phone |
| `notificationMethod` | string | ❌ | "whatsapp" | Notification method |
| `notificationDestination` | string | ❌ | - | Phone for WhatsApp |

**Returns:** `bidId` and `paymentId` for activation

---

### `tira_activate_price_bidding`
Activate monitoring after payment confirmation.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `bidId` | string | ✅ | - | Bid ID from price_bidding |
| `paymentId` | string | ✅ | - | Payment ID from price_bidding |

---

### `tira_register_price_monitor`
**Free Price Tracking** - No purchase required.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `productSlug` | string | ✅ | - | Product slug |
| `userId` | string | ❌ | - | User identifier |
| `sessionCookie` | string | ❌ | - | Session cookie |
| `targetPrice` | number | ❌ | - | Alert threshold |
| `notificationMethod` | string | ❌ | "whatsapp" | log/email/webhook/whatsapp |
| `notificationDestination` | string | ❌ | - | Notification target |

---

### `tira_list_price_monitors`
List all price monitors for a user.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userId` | string | ✅ | - | User identifier |
| `includeInactive` | boolean | ❌ | false | Include inactive monitors |

---

### `tira_list_price_bids`
List all price bids with savings info.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userId` | string | ✅ | - | User identifier |
| `includeCompleted` | boolean | ❌ | true | Include completed bids |

---

### `tira_update_price_monitor`
Update existing monitor settings.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `monitorId` | string | ✅ | - | Monitor ID |
| `targetPrice` | number | ❌ | - | New target price |
| `notificationMethod` | string | ❌ | - | New notification method |
| `notificationDestination` | string | ❌ | - | New destination |
| `isActive` | boolean | ❌ | - | Activate/deactivate |

---

### `tira_delete_price_monitor`
Delete a price monitor.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `monitorId` | string | ✅ | - | Monitor ID to delete |

---

### `tira_get_price_history`
Get price change history for a monitor.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `monitorId` | string | ✅ | - | Monitor ID |
| `limit` | number | ❌ | 100 | Max entries to return |

---

### `tira_intensive_price_monitor`
Real-time price monitoring with custom interval.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `slug` | string | ✅ | - | Product slug |
| `interval` | number | ❌ | 2 | Check interval (min: 2 seconds) |
| `duration` | number | ❌ | 300 | Duration (max: 600 seconds) |

⚠️ **Warning:** Use sparingly to avoid rate limiting.

---

### `tira_get_monitor_stats`
Get overall price monitoring system statistics.

**Parameters:** None

---

## Quick Reference

### Key ID Fields

| Context | Use This | Not This |
|---------|----------|----------|
| Checkout Address | `address.id` (UUID) | `address.uid` (numeric) |
| Checkout Cart | `cart.id` (UUID) | `cart.cart_id` (numeric) |
| Payment Customer | `cust_xxxxx` | - |
| Payment Order | `order_xxxxx` | - |
| Payment Token | `token_xxxxx` | - |
| Payment ID | `pay_xxxxx` | - |

### Amount Conversion

Always use smallest currency unit:
- ₹295 → `29500`
- ₹1.50 → `150`
- ₹1000 → `100000`

### Terminal ID

For UPI SBMD mandate orders: `term_RMD93ugGbBOhTp`

---

## Example Flows

### Complete Purchase Flow

```
1. get_products("lipstick") → Get product details
2. tira_send_otp("9876543210") → Send OTP
3. tira_verify_otp(otp, request_id) → Get session
4. add_to_cart(items, sessionCookie) → Add to cart
5. get_address(sessionCookie) → Get addresses
6. [User confirms address]
7. checkout(addressId, cartId, sessionCookie) → Create order
8. get_token_masked_data(phone) → Check tokens
9. create_order_with_masked_data(amount, currency) → Razorpay order
10. initiate_payment_with_masked_data(amount, order_id) → Process payment
```

### Price Bidding Flow

```
1. get_products("serum") → Get product with slug
2. tira_send_otp + tira_verify_otp → Authenticate
3. tira_price_bidding(bidPrice, purchasePrice, ...) → Create bid
4. [User completes UPI payment]
5. tira_activate_price_bidding(bidId, paymentId) → Activate monitoring
6. [System auto-orders when price hits target]
```

### Free Price Monitoring

```
1. get_products("moisturizer") → Get product slug
2. tira_register_price_monitor(slug, targetPrice) → Start monitoring
3. [Receive WhatsApp alerts when price drops]
```

---

*Documentation generated for TIRA Agentic Shopping MCP Integration*