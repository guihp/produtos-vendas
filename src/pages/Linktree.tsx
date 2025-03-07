
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import LinktreeCard from '../components/LinktreeCard';
import { Link } from 'react-router-dom';
import { ExternalLink, ShoppingCart, MessageCircle } from 'lucide-react';

const Linktree = () => {
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLinktreeConfig();
  }, []);

  const loadLinktreeConfig = async () => {
    try {
      // Load company configuration
      const { data: company, error: companyError } = await supabase
        .from('company_config')
        .select('*')
        .single();

      if (companyError) {
        console.error('Erro ao carregar configuração da empresa:', companyError);
      } else if (company) {
        setCompanyName(company.name || '');
        
        if (company.logo_path) {
          const { data } = supabase.storage
            .from('company-assets')
            .getPublicUrl(company.logo_path);
            
          setLogoUrl(data.publicUrl);
        }
      }

      // Load linktree links
      const { data: linksData, error: linksError } = await supabase
        .from('linktree_links')
        .select('*')
        .order('position');

      if (linksError) {
        console.error('Erro ao carregar links:', linksError);
      } else {
        setLinks(linksData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get the appropriate icon component based on link type
  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <ShoppingCart size={20} />;
      case 'whatsapp':
        return <MessageCircle size={20} />;
      case 'external':
      default:
        return <ExternalLink size={20} />;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-4">
            <img 
              src={logoUrl} 
              alt={`${companyName} Logo`} 
              className="w-24 h-24 object-contain rounded-full shadow-md"
            />
          </div>
        )}
        
        {/* Company Name */}
        <h1 className="text-2xl font-bold mb-8 text-center">{companyName}</h1>
        
        {/* Links */}
        <div className="w-full space-y-4">
          {links.map((link) => (
            <LinktreeCard
              key={link.id}
              title={link.title}
              link={link.url}
              icon={getLinkIcon(link.type)}
              className={link.custom_color ? `bg-[${link.custom_color}]` : ''}
            />
          ))}
        </div>
        
        {/* Admin Link - Hidden in production */}
        <div className="mt-12 opacity-30 hover:opacity-100 transition-opacity">
          <Link to="/login" className="text-xs text-gray-500 hover:underline">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Linktree;
