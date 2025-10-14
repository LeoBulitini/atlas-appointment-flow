import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InstallPWA } from "./components/InstallPWA";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CompleteProfile from "./pages/CompleteProfile";
import ClientDashboard from "./pages/ClientDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import BusinessSetup from "./pages/BusinessSetup";
import BusinessSettings from "./pages/BusinessSettings";
import BusinessClients from "./pages/BusinessClients";
import BusinessReviews from "./pages/BusinessReviews";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import BusinessMarketing from "./pages/BusinessMarketing";
import BusinessCalendar from "./pages/BusinessCalendar";
import BusinessFinancial from "./pages/BusinessFinancial";
import BusinessStock from "./pages/BusinessStock";
import BusinessLoyalty from "./pages/BusinessLoyalty";
import BusinessSubscription from "./pages/BusinessSubscription";
import Booking from "./pages/Booking";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import SubscriptionGuard from "./components/SubscriptionGuard";
import BusinessLayout from "./components/BusinessLayout";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPWA />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/booking/:businessId" element={<Booking />} />
          <Route
            path="/business/setup"
            element={
              <ProtectedRoute requiredUserType="business">
                <BusinessSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/client"
            element={
              <ProtectedRoute requiredUserType="client">
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/business"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard>
                  <BusinessLayout>
                    <BusinessDashboard />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
  <Route
    path="/business/subscription"
    element={
      <ProtectedRoute requiredUserType="business">
        <BusinessLayout>
          <BusinessSubscription />
        </BusinessLayout>
      </ProtectedRoute>
    }
  />
          <Route
            path="/business/settings"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard>
                  <BusinessLayout>
                    <BusinessSettings />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/clients"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard>
                  <BusinessLayout>
                    <BusinessClients />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/reviews"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard>
                  <BusinessLayout>
                    <BusinessReviews />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/analytics"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard>
                  <BusinessLayout>
                    <BusinessAnalytics />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/marketing"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard requiredPlan="professional">
                  <BusinessLayout>
                    <BusinessMarketing />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/calendar"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard>
                  <BusinessLayout>
                    <BusinessCalendar />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/financial"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard requiredPlan="professional">
                  <BusinessLayout>
                    <BusinessFinancial />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/stock"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard requiredPlan="professional">
                  <BusinessLayout>
                    <BusinessStock />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/loyalty"
            element={
              <ProtectedRoute requiredUserType="business">
                <SubscriptionGuard requiredPlan="professional">
                  <BusinessLayout>
                    <BusinessLoyalty />
                  </BusinessLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;