import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ClientDashboard from "./pages/ClientDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import BusinessSetup from "./pages/BusinessSetup";
import BusinessSettings from "./pages/BusinessSettings";
import BusinessClients from "./pages/BusinessClients";
import BusinessReviews from "./pages/BusinessReviews";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import Booking from "./pages/Booking";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
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
                <BusinessDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/settings"
            element={
              <ProtectedRoute requiredUserType="business">
                <BusinessSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/clients"
            element={
              <ProtectedRoute requiredUserType="business">
                <BusinessClients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/reviews"
            element={
              <ProtectedRoute requiredUserType="business">
                <BusinessReviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/analytics"
            element={
              <ProtectedRoute requiredUserType="business">
                <BusinessAnalytics />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
