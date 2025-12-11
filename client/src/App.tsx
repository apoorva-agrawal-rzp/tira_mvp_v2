import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/verify-otp" component={VerifyOTPPage} />
      <Route path="/home" component={HomePage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/product/:slug" component={ProductDetailPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/account/payment-methods" component={PaymentMethodsPage} />
      <Route path="/account/addresses" component={AddressesPage} />
      <Route path="/admin" component={AdminPage} />
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
