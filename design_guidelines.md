# TIRA Agentic Shopping App - Design Guidelines

## Design Approach

**Reference-Based**: Premium beauty e-commerce aesthetic inspired by modern mobile shopping apps, with TIRA's signature pink/magenta brand identity. Mobile-first responsive design that feels native while showcasing the innovative "Buy at My Own Price" agentic commerce feature.

## Brand Colors

```
Primary: #E91E63 (TIRA Pink/Magenta)
Secondary: #FCE4EC (Light Pink)
Accent: #AD1457 (Dark Magenta)
Background: #FFFFFF
Text Primary: #212121
Text Secondary: #757575
Success: #4CAF50
Warning: #FF9800
Error: #F44336
```

## Typography

- **Headings**: Bold, clean sans-serif (Inter or Poppins preferred)
- **Body**: Regular weight, highly readable
- **Minimum touch targets**: 44px for mobile usability

## Layout System

**Spacing Units**: Tailwind primitives - primarily p-4, p-6, p-8, gap-4, gap-6
- Mobile padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card spacing: p-4 to p-6
- Bottom nav height: h-16

**Container Structure**:
- Max-width for content: max-w-7xl
- Mobile-first approach with responsive breakpoints
- Full-width product grids with 2 columns mobile, 3-4 desktop

## Component Library

### Navigation
- **Bottom Navigation** (Mobile): Fixed bottom bar with 4-5 icons (Home, Search, Bids, Cart, Profile) - always visible, z-50
- **Top Bar**: Logo centered or left-aligned, search icon, cart icon with badge count
- **Back Buttons**: Simple arrow left with "Back" text

### Cards & Product Tiles
- Rounded corners: rounded-xl (12px) to rounded-2xl (16px)
- Subtle shadows: shadow-sm to shadow-md
- Product cards: Image ratio 3:4, white background, hover lift effect
- Price display: Original price struck through, sale price in TIRA pink
- "Set Target Price" badge on eligible products

### Forms & Inputs
- Border radius: rounded-lg
- Height: h-12 to h-14 for comfortable touch
- OTP inputs: Individual digit boxes with border focus states
- Phone input: Country code prefix (+91) in gray background
- Address forms: Multi-line with proper spacing

### Buttons
- Primary CTA: bg-[#E91E63] text-white, rounded-lg, py-3, font-semibold
- Secondary: border-2 border-[#E91E63] text-[#E91E63]
- Disabled state: opacity-50
- Loading state: Show spinner or "Processing..." text
- Touch-friendly: Minimum h-12

### Price Bid Components
- Bid card: White background, shadow-md, rounded-xl
- Target price display: Large, prominent, in accent color
- Savings indicator: Green badge with "₹ saved"
- Status badges: Color-coded (Active: pink, Completed: green, Expired: gray)
- Auto-purchase toggle: iOS-style switch

### Shopping Cart
- Item rows: Product image (64x64), name, price, quantity controls
- Quantity controls: Outlined circle buttons with +/- 
- Remove item: Small text link in red
- Price breakdown: Subtotal, shipping, total in bold

## Mobile-First Patterns

### Screen Structure
```
┌─────────────────────────┐
│ Top Bar (optional)      │
├─────────────────────────┤
│                         │
│  Scrollable Content     │
│  (with padding)         │
│                         │
│                         │
├─────────────────────────┤
│ Bottom Navigation       │ (fixed)
└─────────────────────────┘
```

### Gesture Patterns
- Pull to refresh on product listings
- Swipe for image galleries (product details)
- Tap for expand/collapse (bid details, filters)
- Bottom sheet modals for filters, address selection

### Loading States
- Skeleton loaders for product grids (shimmer effect)
- Inline spinners for button actions
- Full-screen loading for OTP/authentication

## Images & Visual Assets

### Hero Sections
No traditional hero - app opens to Splash screen (TIRA logo centered with subtle gradient), then immediately functional screens.

### Product Images
- **Product Tiles**: Square or 3:4 ratio, high-quality beauty product shots
- **Detail Pages**: Multi-image carousel (swipeable), zoom capability
- **Placeholder**: Light pink gradient (#FCE4EC to white) with TIRA watermark

### Icons
- Use Heroicons (outline style) for navigation and UI elements
- Consistent stroke width throughout
- Pink color (#E91E63) for active state, gray (#757575) for inactive

### Illustrations (Optional)
- Empty states: Minimal line art in pink/gray
- Success states: Checkmark with subtle confetti animation
- Bid success: Trophy or target icon with celebratory colors

### Background Treatments
- Splash screen: Gradient from pink-50 to white
- Main screens: Pure white (#FFFFFF)
- Bid cards: Very light pink (#FCE4EC) for active bids

## Special Features

### "Buy at My Own Price" UI
- Prominent badge on product tiles: "Set Target Price" in accent color
- Slider or input for price selection on product detail
- Visual indicator showing current price vs. target price
- Dashboard showing active bids with countdown/status
- Auto-purchase confirmation modal with savings highlight

### Payment Integration Visual
- UPI Reserve Pay branding: "Powered by Razorpay Reserve Pay"
- Pre-authorization indicator: Shield icon with "Secure Auto-Pay"
- Mandate status: Active/Inactive toggle with visual feedback

## Responsive Breakpoints
- Mobile: < 768px (primary focus)
- Tablet: 768px - 1024px
- Desktop: > 1024px (product grid expands to 3-4 columns)