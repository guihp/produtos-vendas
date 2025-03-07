import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductsList from '../components/ProductsList';
import LinktreeManager from '../components/LinktreeManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AUTH_CONFIG } from '@/config/auth';

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("products");
  const { toast } = useToast();

  useEffect(() => {
    checkAuthentication();
    // Verificar autenticação a cada 5 minutos
    const interval = setInterval(checkAuthentication, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const checkAuthentication = () => {
    const authToken = localStorage.getItem('adminAuth');
    const authExpires = localStorage.getItem('adminAuthExpires');

    if (!authToken || !authExpires) {
      handleLogout("Sessão inválida");
      return;
    }

    const expirationTime = new Date(authExpires);
    if (expirationTime < new Date()) {
      handleLogout("Sessão expirada");
      return;
    }

    // Renovar token se estiver próximo de expirar
    if (expirationTime.getTime() - Date.now() < AUTH_CONFIG.TOKEN_RENEWAL_THRESHOLD) {
      renewSession();
    }
  };

  const renewSession = () => {
    const newExpiration = new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION);
    localStorage.setItem('adminAuthExpires', newExpiration.toISOString());
  };

  const handleLogout = (reason?: string) => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminAuthExpires');
    localStorage.removeItem('loginBlockedUntil');
    
    if (reason) {
      toast({
        title: "Sessão encerrada",
        description: reason,
        variant: "destructive"
      });
    }
    
    navigate('/login');
  };

  // Proteger contra XSS
  const sanitizeInput = (input: string) => {
    return input.replace(/[<>'"]/g, '');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Administração</h1>
          <button 
            onClick={() => handleLogout()}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Sair
          </button>
        </div>
        
        <Tabs value={activeTab} onValueChange={value => setActiveTab(sanitizeInput(value))}>
          <TabsList className="mb-6">
            <TabsTrigger value="linktree">Linktree</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="linktree">
            <LinktreeManager />
          </TabsContent>
          
          <TabsContent value="products">
            <ProductsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
