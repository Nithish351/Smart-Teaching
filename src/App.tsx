import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />, 
    errorElement: <NotFound />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

// Define v7 future flags for React Router to silence deprecation warnings in dev.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const futureFlags: any = {
  v7_fetcherPersist: true,
  v7_relativeSplatPath: true,
  v7_partialHydration: true,
  v7_normalizeFormMethod: true,
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} future={futureFlags} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
