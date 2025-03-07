import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';
import { AUTH_CONFIG } from '@/config/auth';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sistema de proteção contra tentativas múltiplas
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockEndTime, setBlockEndTime] = useState<Date | null>(null);

  useEffect(() => {
    // Verificar se existe um bloqueio ativo
    const blockedUntil = localStorage.getItem('loginBlockedUntil');
    if (blockedUntil) {
      const blockTime = new Date(blockedUntil);
      if (blockTime > new Date()) {
        setIsBlocked(true);
        setBlockEndTime(blockTime);
      } else {
        localStorage.removeItem('loginBlockedUntil');
        resetLoginAttempts();
      }
    }
  }, []);

  const resetLoginAttempts = () => {
    setLoginAttempts(0);
    setIsBlocked(false);
    setBlockEndTime(null);
    localStorage.removeItem('loginBlockedUntil');
  };

  const handleBlock = () => {
    const blockDuration = Math.min(
      Math.pow(AUTH_CONFIG.BLOCK_DURATION_BASE, loginAttempts - AUTH_CONFIG.MAX_LOGIN_ATTEMPTS + 1) * 1000,
      AUTH_CONFIG.MAX_BLOCK_DURATION
    );
    const blockUntil = new Date(Date.now() + blockDuration);
    setIsBlocked(true);
    setBlockEndTime(blockUntil);
    localStorage.setItem('loginBlockedUntil', blockUntil.toISOString());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      const remainingTime = blockEndTime ? Math.ceil((blockEndTime.getTime() - Date.now()) / 1000) : 0;
      toast({
        title: "Acesso bloqueado",
        description: `Tente novamente em ${remainingTime} segundos`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Hash da senha com salt
      const hashedPassword = CryptoJS.SHA256(password + AUTH_CONFIG.SALT).toString();

      const isValid = username === AUTH_CONFIG.ADMIN_USERNAME && 
                     CryptoJS.SHA256(AUTH_CONFIG.ADMIN_PASSWORD + AUTH_CONFIG.SALT).toString() === hashedPassword;

      if (isValid) {
        // Gerar token de sessão
        const sessionToken = CryptoJS.SHA256(Date.now().toString()).toString();
        localStorage.setItem('adminAuth', sessionToken);
        localStorage.setItem('adminAuthExpires', new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION).toISOString());
        
        resetLoginAttempts();
        navigate('/admin');
        
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo ao painel administrativo",
        });
      } else {
        setLoginAttempts(prev => prev + 1);
        
        if (loginAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS - 1) {
          handleBlock();
        }
        
        toast({
          title: "Erro de autenticação",
          description: "Usuário ou senha incorretos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro no sistema",
        description: "Ocorreu um erro ao tentar fazer login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Painel Administrativo</h2>
          <p className="text-gray-600 mt-2">Faça login para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              required
              disabled={isBlocked || isLoading}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isBlocked || isLoading}
              autoComplete="new-password"
            />
          </div>

          {isBlocked && blockEndTime && (
            <p className="text-sm text-red-600 text-center">
              Acesso bloqueado. Tente novamente em {Math.ceil((blockEndTime.getTime() - Date.now()) / 1000)} segundos
            </p>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isBlocked || isLoading}
          >
            {isLoading ? "Verificando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
