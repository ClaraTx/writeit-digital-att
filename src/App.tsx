import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Professor from "./pages/Professor";
import RequirementsAdmin from "./pages/RequirementsAdmin";
import NotFound from "./pages/NotFound";

import Admin from "./pages/Admin";
import AdminRequirements from "./pages/admin/RequirementsAdmin";
import AdminEquipes from "./pages/admin/EquipesAdmin";
import AdminIndividual from "./pages/admin/IndividualAdmin";
import AdminGameConfig from "./pages/admin/GameConfiguration";
import ScenariosPage from "./components/professor/ScenariosPage";
import EquipesAdmin from "./pages/EquipesAdmin";
import IndividualAdmin from "./pages/IndividualAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/professor" element={<Professor />} />
          <Route path="/professor/cenarios" element={<ScenariosPage />} />

          <Route path="/admin" element={<Admin />} />

          <Route path="/admin/requisitos" element={<AdminRequirements />} />
          <Route path="/admin/configuracoes" element={<AdminGameConfig />} />
          <Route path="/admin/equipes" element={<AdminEquipes />} />
          <Route path="/admin/individual" element={<AdminIndividual />} />

          <Route path="/requisitos" element={<RequirementsAdmin />} />
          <Route path="/equipes" element={<EquipesAdmin />} />
          <Route path="/individual" element={<IndividualAdmin />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;