import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/protected-route";

import SplashPage from "@/pages/splash";
import LoginPage from "@/pages/login";
import VerifyOTPPage from "@/pages/verify-otp";
import HomePage from "@/pages/home";
import SearchPage from "@/pages/search";
import ProductDetailPage from "@/pages/product-detail";
import WishlistPage from "@/pages/wishlist";
import OrdersPage from "@/pages/orders";
import AccountPage from "@/pages/account";
import PaymentMethodsPage from "@/pages/payment-methods";
import AddressesPage from "@/pages/addresses";
import AdminPage from "@/pages/admin";
import BagPage from "@/pages/cart";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/verify-otp" component={VerifyOTPPage} />
      <Route path="/home">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      <Route path="/search">
        <ProtectedRoute>
          <SearchPage />
        </ProtectedRoute>
      </Route>
      <Route path="/product/:slug">
        <ProtectedRoute>
          <ProductDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/wishlist">
        <ProtectedRoute>
          <WishlistPage />
        </ProtectedRoute>
      </Route>
      <Route path="/orders">
        <ProtectedRoute>
          <OrdersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/account">
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      </Route>
      <Route path="/account/payment-methods">
        <ProtectedRoute>
          <PaymentMethodsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/account/addresses">
        <ProtectedRoute>
          <AddressesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/account/bag">
        <ProtectedRoute>
          <BagPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="w-full max-w-[375px] h-[760px] max-h-[760px] bg-background text-foreground rounded-[2.5rem] shadow-2xl overflow-hidden relative border-8 border-gray-900 dark:border-gray-800">
            {/* Phone notch simulation */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 dark:bg-gray-800 rounded-b-2xl z-50"></div>
            <div className="h-full overflow-y-auto scrollbar-hide">
              <Router />
            </div>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
