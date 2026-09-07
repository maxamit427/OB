import { useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import LoadingScreen from "@/components/LoadingScreen";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { PublicAuthProvider } from "@/contexts/PublicAuthContext";

// Admin pages
import AdminLogin   from "@/pages/admin/Login";
import AdminSignup  from "@/pages/admin/Signup";
import AdminForgotPassword from "@/pages/admin/ForgotPassword";
import Dashboard    from "@/pages/admin/Dashboard";
import Messages     from "@/pages/admin/Messages";
import Portfolio    from "@/pages/admin/Portfolio";
import Team         from "@/pages/admin/Team";
import Users        from "@/pages/admin/Users";
import Security     from "@/pages/admin/Security";
import Settings     from "@/pages/admin/Settings";
import Categories   from "@/pages/admin/Categories";
import PendingUsers from "@/pages/admin/PendingUsers";
import PublicUsers  from "@/pages/admin/PublicUsers";

// Marketplace pages
import ServicesPage   from "@/pages/Services";
import ServiceDetail  from "@/pages/ServiceDetail";
import Checkout       from "@/pages/Checkout";
import UserDashboard  from "@/pages/UserDashboard";

// Admin marketplace pages
import AdminServices  from "@/pages/admin/AdminServices";
import Orders         from "@/pages/admin/Orders";
import OtpLogs        from "@/pages/admin/OtpLogs";

// Public Auth pages
import Login          from "@/pages/auth/Login";
import Signup         from "@/pages/auth/Signup";
import VerifyEmail    from "@/pages/auth/VerifyEmail";
import ForgotPassword from "@/pages/auth/ForgotPassword";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* Marketplace routes */}
      <Route path="/services"          component={ServicesPage}  />
      <Route path="/services/:id"      component={ServiceDetail} />
      <Route path="/checkout/:id"      component={Checkout}      />
      <Route path="/dashboard"         component={UserDashboard} />

      {/* Public auth routes */}
      <Route path="/auth/login"          component={Login}          />
      <Route path="/auth/signup"         component={Signup}         />
      <Route path="/auth/verify-email"   component={VerifyEmail}    />
      <Route path="/auth/forgot-password" component={ForgotPassword} />

      {/* Admin routes */}
      <Route path="/admin/login"         component={AdminLogin}    />
      <Route path="/admin/signup"        component={AdminSignup}   />
      <Route path="/admin/forgot-password" component={AdminForgotPassword} />
      <Route path="/admin/dashboard"     component={Dashboard}     />
      <Route path="/admin/messages"      component={Messages}      />
      <Route path="/admin/portfolio"     component={Portfolio}     />
      <Route path="/admin/team"          component={Team}          />
      <Route path="/admin/categories"    component={Categories}    />
      <Route path="/admin/users"         component={Users}         />
      <Route path="/admin/security"      component={Security}      />
      <Route path="/admin/settings"      component={Settings}      />
      <Route path="/admin/pending-users" component={PendingUsers}  />
      <Route path="/admin/public-users"  component={PublicUsers}   />
      <Route path="/admin/services"      component={AdminServices} />
      <Route path="/admin/orders"        component={Orders}        />
      <Route path="/admin/otp-logs"      component={OtpLogs}       />
      <Route path="/admin">
        <Redirect to="/admin/login" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <PublicAuthProvider>
        <AdminAuthProvider>
          <TooltipProvider>
            <Toaster />
            {!isLoadingComplete ? (
              <LoadingScreen onLoadingComplete={() => setIsLoadingComplete(true)} />
            ) : (
              <Router />
            )}
          </TooltipProvider>
        </AdminAuthProvider>
      </PublicAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
