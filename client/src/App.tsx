import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMe } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
// Páginas do site da secretaria
import Home from "@/pages/secretaria/Home";
import EmitirRecibo from "@/pages/secretaria/EmitirRecibo";
import AlunoNovo from "@/pages/secretaria/AlunoNovo";
import Recibos from "@/pages/secretaria/Recibos";
import ReciboDetalhe from "@/pages/secretaria/ReciboDetalhe";
import Definicoes from "@/pages/secretaria/Definicoes";
import Perfil from "@/pages/secretaria/Perfil";
import Seguranca from "@/pages/secretaria/Seguranca";
// Páginas de autenticação
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminTurmas from "@/pages/admin/Turmas";
import AdminCadastro from "@/pages/admin/Cadastro";
import AlunoDetalhe from "@/pages/admin/AlunoDetalhe";
import AdminRecibos from "@/pages/admin/Recibos";
import AdminUtilizadores from "@/pages/admin/Utilizadores";
import UtilizadorDetalhe from "@/pages/admin/UtilizadorDetalhe";
import AdminExtratos from "@/pages/admin/Extratos";
import AdminAuditLog from "@/pages/admin/AuditLog";

function AuthSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080d1a]">
      <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [isLoading, user, navigate]);

  if (isLoading) return <AuthSpinner />;
  if (!user) return null;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (!user) navigate("/login");
    else if (user.role !== "admin") navigate("/emitir");
  }, [isLoading, user, navigate]);

  if (isLoading) return <AuthSpinner />;
  if (!user || user.role !== "admin") return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/emitir">
        {() => <ProtectedRoute component={EmitirRecibo} />}
      </Route>
      <Route path="/alunos/novo">
        {() => <ProtectedRoute component={AlunoNovo} />}
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
      <Route path="/perfil">
        {() => <ProtectedRoute component={Perfil} />}
      </Route>
      <Route path="/seguranca">
        {() => <ProtectedRoute component={Seguranca} />}
      </Route>
      <Route path="/admin">
        {() => <AdminRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin/turmas">
        {() => <AdminRoute component={AdminTurmas} />}
      </Route>
      <Route path="/admin/cadastro">
        {() => <AdminRoute component={AdminCadastro} />}
      </Route>
      <Route path="/admin/alunos/:id">
        {(params) => <AdminRoute component={() => <AlunoDetalhe id={params.id} />} />}
      </Route>
      <Route path="/admin/recibos">
        {() => <AdminRoute component={AdminRecibos} />}
      </Route>
      <Route path="/admin/utilizadores">
        {() => <AdminRoute component={AdminUtilizadores} />}
      </Route>
      <Route path="/admin/utilizadores/:id">
        {(params) => <AdminRoute component={() => <UtilizadorDetalhe id={params.id} />} />}
      </Route>
      <Route path="/admin/extratos">
        {() => <AdminRoute component={AdminExtratos} />}
      </Route>
      <Route path="/admin/audit">
        {() => <AdminRoute component={AdminAuditLog} />}
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
