import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import InvoiceNew from "@/pages/invoice-new";
import InvoiceDetail from "@/pages/invoice-detail";
import Bols from "@/pages/bols";
import BolNew from "@/pages/bol-new";
import Exceptions from "@/pages/exceptions";
import Clients from "@/pages/clients";
import Transporters from "@/pages/transporters";
import RateCards from "@/pages/rate-cards";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import { AppLayout } from "@/components/layout/app-layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      {(params) => (
        <AppLayout>
          <Component params={params} />
        </AppLayout>
      )}
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/invoices/new" component={InvoiceNew} />
      <ProtectedRoute path="/invoices/:id" component={InvoiceDetail} />
      <ProtectedRoute path="/invoices" component={Invoices} />
      <ProtectedRoute path="/bols/new" component={BolNew} />
      <ProtectedRoute path="/bols" component={Bols} />
      <ProtectedRoute path="/exceptions" component={Exceptions} />
      <ProtectedRoute path="/clients" component={Clients} />
      <ProtectedRoute path="/transporters" component={Transporters} />
      <ProtectedRoute path="/rate-cards" component={RateCards} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
