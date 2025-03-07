import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ExternalLink, ShoppingBag, MessageCircle, Instagram, 
  Plus, Trash2, MoveUp, MoveDown, Edit, Check, X 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const LinktreeManager = () => {
  const { toast } = useToast();
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [logoPath, setLogoPath] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    type: 'external',
    image_url: ''
  });
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    loadLinks();
    loadCompanyConfig();
  }, []);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('linktree_links')
        .select('*')
        .order('position');

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Erro ao carregar links:', error);
      toast({
        title: "Erro ao carregar links",
        description: "Não foi possível carregar os links.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('company_config')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No company config found, create one
          const { data: newConfig, error: insertError } = await supabase
            .from('company_config')
            .insert([{ name: 'Minha Empresa' }])
            .select()
            .single();

          if (insertError) throw insertError;
          setCompanyName(newConfig?.name || 'Minha Empresa');
        } else {
          throw error;
        }
      } else if (data) {
        setCompanyName(data.name || '');
        setLogoPath(data.logo_path || '');
        
        if (data.logo_path) {
          const { data: urlData } = supabase.storage
            .from('company-assets')
            .getPublicUrl(data.logo_path);
            
          setLogoPreview(urlData.publicUrl);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração da empresa:', error);
    }
  };

  const handleSaveCompanyInfo = async () => {
    try {
      const { error } = await supabase
        .from('company_config')
        .update({ name: companyName })
        .eq('id', 1);

      if (error) throw error;
      
      toast({
        title: "Informações salvas!",
        description: "As informações da empresa foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar informações da empresa:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as informações da empresa.",
        variant: "destructive"
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tamanho do arquivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB em bytes
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 10MB.",
          variant: "destructive"
        });
        return;
      }

      // Resto do código para fazer upload permanece o mesmo
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update company config
      const { error: updateError } = await supabase
        .from('company_config')
        .update({ logo_path: filePath })
        .eq('id', 1);

      if (updateError) throw updateError;

      // Update preview
      const { data } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);
        
      setLogoPreview(data.publicUrl);
      setLogoPath(filePath);

      toast({
        title: "Logo atualizado!",
        description: "O logo da empresa foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload do logo.",
        variant: "destructive",
      });
    }
  };

  const handleLinkImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 10MB.",
          variant: "destructive"
        });
        return;
      }

      setUploadingImage(true);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `linktree-image-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);
        
      // Set preview and update newLink state
      setImagePreview(data.publicUrl);
      setNewLink({...newLink, image_url: data.publicUrl});

      toast({
        title: "Imagem enviada!",
        description: "A imagem foi enviada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddLink = async () => {
    try {
      // Validate URL
      try {
        new URL(newLink.url);
      } catch (e) {
        toast({
          title: "URL inválida",
          description: "Por favor, insira uma URL válida (incluindo http:// ou https://).",
          variant: "destructive"
        });
        return;
      }

      // Get next position
      const nextPosition = links.length > 0 
        ? Math.max(...links.map(link => link.position)) + 1 
        : 0;

      const { error } = await supabase
        .from('linktree_links')
        .insert([{
          title: newLink.title,
          url: newLink.url,
          type: newLink.type,
          position: nextPosition,
          image_url: newLink.image_url
        }]);

      if (error) throw error;

      toast({
        title: "Link adicionado!",
        description: "O link foi adicionado com sucesso.",
      });

      // Reset form
      setNewLink({
        title: '',
        url: '',
        type: 'external',
        image_url: ''
      });
      
      setImagePreview('');
      setShowAddDialog(false);
      await loadLinks();
    } catch (error) {
      console.error('Erro ao adicionar link:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o link.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('linktree_links')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Link removido!",
        description: "O link foi removido com sucesso.",
      });

      await loadLinks();
    } catch (error) {
      console.error('Erro ao remover link:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o link.",
        variant: "destructive"
      });
    }
  };

  const handleMoveLink = async (id: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = links.findIndex(link => link.id === id);
      if (currentIndex === -1) return;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Check if new index is valid
      if (newIndex < 0 || newIndex >= links.length) return;
      
      // Swap positions
      const updatedLinks = [...links];
      const currentPos = updatedLinks[currentIndex].position;
      const targetPos = updatedLinks[newIndex].position;
      
      // Update positions in database
      const { error: error1 } = await supabase
        .from('linktree_links')
        .update({ position: -1 }) // Temporary position to avoid constraint errors
        .eq('id', links[currentIndex].id);
        
      if (error1) throw error1;
      
      const { error: error2 } = await supabase
        .from('linktree_links')
        .update({ position: currentPos })
        .eq('id', links[newIndex].id);
        
      if (error2) throw error2;
      
      const { error: error3 } = await supabase
        .from('linktree_links')
        .update({ position: targetPos })
        .eq('id', links[currentIndex].id);
        
      if (error3) throw error3;
      
      await loadLinks();
    } catch (error) {
      console.error('Erro ao reordenar links:', error);
      toast({
        title: "Erro ao reordenar",
        description: "Não foi possível reordenar os links.",
        variant: "destructive"
      });
    }
  };

  const handleEditLink = (id: string, currentUrl: string) => {
    setEditingLink(id);
    setEditValue(currentUrl);
  };

  const saveEditedLink = async (id: string) => {
    try {
      // Validar URL
      try {
        new URL(editValue);
      } catch (e) {
        toast({
          title: "URL inválida",
          description: "Por favor, insira uma URL válida (incluindo http:// ou https://).",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('linktree_links')
        .update({ url: editValue })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "URL atualizada!",
        description: "A URL foi atualizada com sucesso.",
      });

      setEditingLink(null);
      await loadLinks();
    } catch (error) {
      console.error('Erro ao atualizar URL:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a URL.",
        variant: "destructive"
      });
    }
  };

  const cancelEdit = () => {
    setEditingLink(null);
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <ShoppingBag size={20} />;
      case 'whatsapp':
        return <MessageCircle size={20} />;
      case 'instagram':
        return <Instagram size={20} />;
      case 'external':
      default:
        return <ExternalLink size={20} />;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Configurações da Empresa</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa</Label>
            <Input 
              id="companyName" 
              value={companyName} 
              onChange={e => setCompanyName(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyLogo">Logo da Empresa</Label>
            {logoPreview && (
              <div className="mb-4">
                <img 
                  src={logoPreview} 
                  alt="Logo da empresa" 
                  className="w-24 h-24 object-contain rounded-lg border" 
                />
              </div>
            )}
            <Input 
              id="companyLogo" 
              type="file" 
              accept="image/*" 
              onChange={handleLogoUpload} 
            />
            <p className="text-sm text-gray-500">Tamanho máximo: 10MB</p>
          </div>
          
          <Button 
            onClick={handleSaveCompanyInfo} 
            className="mt-4"
          >
            Salvar Informações
          </Button>
        </div>
      </div>
      
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Links</h2>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-2" /> Adicionar Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="linkTitle">Título</Label>
                  <Input 
                    id="linkTitle" 
                    value={newLink.title} 
                    onChange={e => setNewLink({...newLink, title: e.target.value})} 
                    placeholder="Ex: Visite nosso produto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkUrl">URL</Label>
                  <Input 
                    id="linkUrl" 
                    value={newLink.url} 
                    onChange={e => setNewLink({...newLink, url: e.target.value})} 
                    placeholder="Ex: https://exemplo.com/produto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkType">Tipo</Label>
                  <Select 
                    value={newLink.type} 
                    onValueChange={value => setNewLink({...newLink, type: value})}
                  >
                    <SelectTrigger id="linkType">
                      <SelectValue placeholder="Selecione o tipo de link" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">Link Externo</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkImage">Imagem (opcional)</Label>
                  {imagePreview && (
                    <div className="mb-2">
                      <img 
                        src={imagePreview} 
                        alt="Imagem do link" 
                        className="w-24 h-24 object-cover rounded-lg border" 
                      />
                    </div>
                  )}
                  <Input 
                    id="linkImage" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLinkImageUpload} 
                    disabled={uploadingImage}
                  />
                  <p className="text-sm text-gray-500">Tamanho máximo: 10MB</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
                <Button onClick={handleAddLink}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {links.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum link adicionado. Clique em "Adicionar Link" para começar.
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link, index) => (
              <div key={link.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {link.image_url ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img 
                        src={link.image_url} 
                        alt={link.title} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="text-gray-600">
                      {getLinkIcon(link.type)}
                    </div>
                  )}
                  <div className="flex-grow">
                    <div className="font-medium">{link.title}</div>
                    {editingLink === link.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="text-sm"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => saveEditedLink(link.id)}
                          className="text-green-500"
                        >
                          <Check size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={cancelEdit}
                          className="text-red-500"
                        >
                          <X size={18} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-500 truncate max-w-xs">{link.url}</div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditLink(link.id, link.url)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleMoveLink(link.id, 'up')}
                    disabled={index === 0}
                  >
                    <MoveUp size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleMoveLink(link.id, 'down')}
                    disabled={index === links.length - 1}
                  >
                    <MoveDown size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-500 hover:text-red-700" 
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LinktreeManager;
