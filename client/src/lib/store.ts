import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, PriceBid, Order, CartItem, Address, MandateToken } from '@shared/schema';

interface AppState {
  session: string | null;
  otpRequestId: string | null;
  phone: string | null;
  user: User | null;
  bids: PriceBid[];
  orders: Order[];
  cart: CartItem[];
  cartId: string | null;
  addresses: Address[];
  mandate: MandateToken | null;
  customerId: string | null;
  isHydrated: boolean;
  
  setSession: (session: string | null) => void;
  setOtpRequestId: (id: string | null) => void;
  setPhone: (phone: string | null) => void;
  setUser: (user: User | null) => void;
  
  addBid: (bid: PriceBid) => void;
  updateBid: (id: string, updates: Partial<PriceBid>) => void;
  removeBid: (id: string) => void;
  setBids: (bids: PriceBid[]) => void;
  
  addOrder: (order: Order) => void;
  setOrders: (orders: Order[]) => void;
  
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: number) => void;
  updateCartQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  setCart: (cart: CartItem[]) => void;
  
  setAddresses: (addresses: Address[]) => void;
  addAddress: (address: Address) => void;
  
  setMandate: (mandate: MandateToken | null) => void;
  setCartId: (cartId: string | null) => void;
  setCustomerId: (customerId: string | null) => void;
  setHydrated: (hydrated: boolean) => void;
  
  logout: () => void;
  isLoggedIn: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      session: null,
      otpRequestId: null,
      phone: null,
      user: null,
      bids: [],
      orders: [],
      cart: [],
      cartId: null,
      addresses: [],
      mandate: null,
      customerId: null,
      isHydrated: false,
      
      setSession: (session) => set({ session }),
      setOtpRequestId: (otpRequestId) => set({ otpRequestId }),
      setPhone: (phone) => set({ phone }),
      setUser: (user) => set({ user }),
      
      addBid: (bid) => set((state) => ({ bids: [...state.bids, bid] })),
      updateBid: (id, updates) => set((state) => ({
        bids: state.bids.map((b) => b.id === id ? { ...b, ...updates } : b),
      })),
      removeBid: (id) => set((state) => ({
        bids: state.bids.filter((b) => b.id !== id),
      })),
      setBids: (bids) => set({ bids }),
      
      addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
      setOrders: (orders) => set({ orders }),
      
      addToCart: (item) => set((state) => {
        const existing = state.cart.find((c) => c.itemId === item.itemId);
        if (existing) {
          return {
            cart: state.cart.map((c) =>
              c.itemId === item.itemId ? { ...c, quantity: c.quantity + 1 } : c
            ),
          };
        }
        return { cart: [...state.cart, item] };
      }),
      removeFromCart: (itemId) => set((state) => ({
        cart: state.cart.filter((c) => c.itemId !== itemId),
      })),
      updateCartQuantity: (itemId, quantity) => set((state) => ({
        cart: state.cart.map((c) =>
          c.itemId === itemId ? { ...c, quantity } : c
        ),
      })),
      clearCart: () => set({ cart: [] }),
      setCart: (cart) => set({ cart }),
      
      setAddresses: (addresses) => set({ addresses }),
      addAddress: (address) => set((state) => ({
        addresses: [...state.addresses, address],
      })),
      
      setMandate: (mandate) => set({ mandate }),
      setCartId: (cartId) => set({ cartId }),
      setCustomerId: (customerId) => set({ customerId }),
      setHydrated: (isHydrated) => set({ isHydrated }),
      
      logout: () => set({
        session: null,
        otpRequestId: null,
        phone: null,
        user: null,
        bids: [],
        orders: [],
        cart: [],
        cartId: null,
        addresses: [],
        mandate: null,
        customerId: null,
      }),
      
      isLoggedIn: () => {
        const state = get();
        return !!(state.session && state.user);
      },
    }),
    {
      name: 'tira-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        phone: state.phone,
        user: state.user,
        bids: state.bids,
        orders: state.orders,
        cart: state.cart,
        cartId: state.cartId,
        addresses: state.addresses,
        mandate: state.mandate,
        customerId: state.customerId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
