import { Switch, Route } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/emitir" component={EmitirRecibo} />
      <Route path="/recibos" component={Recibos} />
      <Route path="/recibos/:id" component={ReciboDetalhe} />
      <Route path="/definicoes" component={Definicoes} />
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
