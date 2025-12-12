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
        <div className="min-h-screen bg-background text-foreground">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
