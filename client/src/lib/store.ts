import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, PriceBid, Order, CartItem, Address, MandateToken } from '@shared/schema';

interface AppState {
  session: string | null;
  otpRequestId: string | null;
  phone: string | null;
  user: User | null;
  bids: PriceBid[];
  orders: Order[];
  cart: CartItem[];
  addresses: Address[];
  mandate: MandateToken | null;
  
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
  
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      otpRequestId: null,
      phone: null,
      user: null,
      bids: [],
      orders: [],
      cart: [],
      addresses: [],
      mandate: null,
      
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
      
      logout: () => set({
        session: null,
        otpRequestId: null,
        phone: null,
        user: null,
        bids: [],
        orders: [],
        cart: [],
        addresses: [],
        mandate: null,
      }),
    }),
    {
      name: 'tira-storage',
    }
  )
);
