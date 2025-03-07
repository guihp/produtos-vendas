
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import LinktreeCard from '../components/LinktreeCard';
import { Instagram, MessageCircle, ShoppingBag, Mail, Phone, Facebook, Linkedin, Twitter } from 'lucide-react';

const Index = () => {
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [links, setLinks] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLinktreeConfig();
    loadProducts();
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

      // Load linktree links (only social media)
      const { data: linksData, error: linksError } = await supabase
        .from('linktree_links')
        .select('*')
        .not('type', 'eq', 'product')
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

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  // Function to get the appropriate icon component based on link type
  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'instagram':
        return <Instagram size={20} />;
      case 'whatsapp':
        return <MessageCircle size={20} />;
      case 'facebook':
        return <Facebook size={20} />;
      case 'linkedin':
        return <Linkedin size={20} />;
      case 'twitter':
        return <Twitter size={20} />;
      case 'email':
        return <Mail size={20} />;
      case 'phone':
        return <Phone size={20} />;
      default:
        return <Instagram size={20} />;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 to-blue-400 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-4">
            <img 
              src={logoUrl} 
              alt={`${companyName} Logo`} 
              className="w-24 h-24 object-contain rounded-full bg-white p-2 shadow-md"
            />
          </div>
        )}
        
        {/* Company Name */}
        <h1 className="text-2xl font-bold mb-8 text-white drop-shadow-sm">{companyName}</h1>
        
        {/* Products */}
        {products.length > 0 && (
          <div className="w-full space-y-3 mb-8">
            {products.map((product) => (
              <LinktreeCard
                key={product.id}
                title={product.title}
                link={`/${product.slug}`}
                imageUrl={product.thumbnail_url || "public/lovable-uploads/9511595f-db20-4444-be57-f3e086196086.png"}
              />
            ))}
          </div>
        )}
        
        {/* Social Links as Icons */}
        {links.length > 0 && (
          <div className="mt-6 p-4 bg-white/20 backdrop-blur-sm rounded-full flex justify-center gap-6">
            {links.map((link) => (
              <a 
                key={`icon-${link.id}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-200 transition-colors"
                title={link.title}
              >
                {getLinkIcon(link.type)}
              </a>
            ))}
          </div>
        )}
        
        {/* Removido os cards de links adicionais que apareciam duplicados */}
      </div>
    </div>
  );
};

export default Index;
