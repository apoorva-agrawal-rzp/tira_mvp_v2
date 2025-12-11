# TIRA Agentic Shopping App

## Overview

TIRA is a mobile-first beauty e-commerce application with an agentic shopping experience. The app features a price bidding system where users can set target prices for products and get notified when prices drop. It integrates with external TIRA APIs through an MCP (Model Context Protocol) layer for product data, authentication, cart management, and payment processing.

The application follows a React frontend with Express backend architecture, using PostgreSQL for data persistence and Zustand for client-side state management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: Zustand with persistence middleware for client-side state
- **Data Fetching**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for TIRA brand colors (pink/magenta theme)
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Server**: Node.js HTTP server
- **API Pattern**: REST endpoints with MCP tool invocation proxy at `/api/mcp/invoke`
- **Development**: Vite dev server middleware for HMR during development

### MCP Integration Layer
The backend acts as a proxy to external MCP tools. Tool names are mapped from friendly names to full MCP connection identifiers:
- Product operations: `get_products`, `tira_get_product_by_slug`
- Authentication: `tira_send_otp`, `tira_verify_otp`, `check_user_session`
- Cart/Orders: `add_to_cart`, `checkout`, `create_order_with_masked_data`
- Price Bidding: `tira_price_bidding`, `tira_list_price_bids`, `tira_register_price_monitor`
- Payment: `initiate_payment_with_masked_data`, `get_payment_masked_data`

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains Zod schemas for products, price bids, orders, users, addresses, cart items
- **Client Storage**: Zustand persist middleware stores session, user data, bids, and cart in localStorage

### Key Design Patterns
- **Shared Types**: Zod schemas in `shared/` directory used by both frontend and backend
- **Component Composition**: UI components use shadcn/ui patterns with Radix primitives
- **Mobile-First**: Bottom navigation, safe area handling, touch-optimized UI
- **Path Aliases**: `@/` for client src, `@shared/` for shared code, `@assets/` for attached assets

## External Dependencies

### Third-Party Services
- **TIRA API**: External e-commerce API accessed via MCP tools for:
  - Product catalog and search
  - OTP-based phone authentication
  - Shopping cart management
  - Address management
  - UPI mandate/recurring payments
  - Order creation and payment processing
  - Price monitoring and bidding system

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database toolkit with push migrations via `db:push` script
- **connect-pg-simple**: Session storage for Express (available but in-memory storage currently used)

### UI/Design Dependencies
- **Radix UI**: Full suite of accessible primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Product image carousels
- **Vaul**: Drawer component
- **class-variance-authority**: Component variant management
- **Tailwind CSS**: Utility-first styling with custom TIRA brand configuration

### Build/Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **TSX**: TypeScript execution for development server

## Recent Changes (December 2024)

### Image Loading System
- **Image Proxy Endpoint** (`/api/image-proxy`): Backend proxy using Node.js stream `pipeline` with `AbortController` to handle CORS issues with TIRA CDN images (`cdn.tiraz5.de`). Includes proper timeout handling and prevents ERR_HTTP_HEADERS_SENT crashes.
- **ProductImage Component** (`client/src/components/product-image.tsx`): Reusable component with fallback strategies, error states, and proxy-based loading for external images.

### UI/UX Improvements
- **Bottom Navigation**: Changed "Bids" label to "Wishlist" for better user understanding
- **Search Optimization**: Fetches 50 products max per request, displays 12 initially with infinite scroll
- **Product Detail Page**: Enhanced with image carousel, navigation dots, product features icons (Free Delivery, Genuine Product, COD Available), and improved layout
- **Homepage Redesign**: Added "Buy at Your Own Price" hero section, category tiles, trending products carousel, and "How it Works" section
- **Bid Card Updates**: Uses ProductImage component with proper overflow handling
- **Reserve Pay UI**: Mandates now displayed in bottom sheet drawer for cleaner UI, added cancel setup button, QR placeholder with intent link
- **Cart Page**: Added `/account/cart` route for viewing and managing cart items
- **Address Fetching**: Auto-fetches saved addresses when address page opens using get_address MCP tool
- **Account Details**: Auto-fetches user name, email, phone from session on account page load

### Key Files
- `server/routes.ts` - Backend API routes including image proxy and MCP tool invocation
- `client/src/components/product-image.tsx` - Reusable image component with fallbacks
- `client/src/components/product-card.tsx` - Product card for search results
- `client/src/pages/product-detail.tsx` - Product detail page with image carousel
- `client/src/pages/search.tsx` - Search page with infinite scroll
- `client/src/pages/home.tsx` - Redesigned homepage with categories and trending products
- `client/src/pages/payment-methods.tsx` - Reserve Pay mandate management with drawer for active mandates
- `client/src/pages/cart.tsx` - Cart page for viewing and removing items
- `client/src/pages/addresses.tsx` - Address management with API fetching
- `client/src/lib/mcp-parser.ts` - Parser for MCP markdown responses