import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomeRedirect from "@/pages/HomeRedirect";
import EmitirRecibo from "@/pages/EmitirRecibo";
import Recibos from "@/pages/Recibos";
import ReciboDetalhe from "@/pages/ReciboDetalhe";
import Definicoes from "@/pages/Definicoes";
import Login from "@/pages/Login";

function isAuthenticated() {
  return localStorage.getItem("auth") === "true";
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  if (!isAuthenticated()) {
    // redirect to login on next tick to avoid render issues
    setTimeout(() => navigate("/login"), 0);
    return null;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={HomeRedirect} />
      <Route path="/emitir">
        {() => <ProtectedRoute component={EmitirRecibo} />}
      </Route>
      <Route path="/recibos">
        {() => <ProtectedRoute component={Recibos} />}
      </Route>
      <Route path="/recibos/:id">
        {() => <ProtectedRoute component={ReciboDetalhe} />}
      </Route>
      <Route path="/definicoes">
        {() => <ProtectedRoute component={Definicoes} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;