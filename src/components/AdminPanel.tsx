import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from 'react-router-dom';
import VideoUpload from './VideoUpload';
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

const AdminPanel = () => {
  const { productId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sideImages, setSideImages] = useState<any[]>([]);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadSideImages();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      const { data: product, error } = await supabase.from('products').select('*').eq('id', productId).single();
      if (error) throw error;
      if (product) {
        setProduct(product);
        updateCssVariables(product);
        
        // If the product has a video_id, fetch and load the video
        if (product.video_id) {
          const { data: video, error: videoError } = await supabase
            .from('videos')
            .select('file_path')
            .eq('id', product.video_id)
            .single();
            
          if (videoError) throw videoError;
          
          if (video) {
            const { data: { publicUrl } } = supabase.storage
              .from('videos')
              .getPublicUrl(video.file_path);
              
            setPreviewVideoUrl(publicUrl);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      toast({
        title: "Erro ao carregar produto",
        description: "Não foi possível carregar as informações do produto.",
        variant: "destructive"
      });
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSideImages = async () => {
    try {
      const { data, error } = await supabase.from('product_side_images').select('*').eq('product_id', productId).order('created_at');
      if (error) throw error;
      setSideImages(data || []);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
    }
  };

  const handleImageUpload = async (position: 'left' | 'right', file: File) => {
    try {
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

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Fazer upload direto para o storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw uploadError;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Falha ao obter URL pública');
      }

      // Inserir registro no banco
      const { error: dbError } = await supabase
        .from('product_side_images')
        .insert({
          product_id: productId,
          image_path: fileName,
          position: position,
          link_url: null
        });

      if (dbError) {
        console.error('Erro ao salvar no banco:', dbError);
        // Se falhar ao salvar no banco, remove a imagem do storage
        await supabase.storage
          .from('product-images')
          .remove([fileName]);
        throw dbError;
      }

      toast({
        title: "Imagem adicionada!",
        description: "A imagem foi adicionada com sucesso.",
      });

      await loadSideImages();
    } catch (error) {
      console.error('Erro detalhado:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível fazer upload da imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const updateImageLink = async (imageId: string, linkUrl: string) => {
    try {
      const { error } = await supabase.from('product_side_images').update({
        link_url: linkUrl
      }).eq('id', imageId);
      if (error) throw error;
      toast({
        title: "Link atualizado!",
        description: "O link da imagem foi atualizado com sucesso."
      });
      await loadSideImages();
    } catch (error) {
      console.error('Erro ao atualizar link:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o link da imagem.",
        variant: "destructive"
      });
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase.from('product_side_images').delete().eq('id', imageId);
      if (error) throw error;
      toast({
        title: "Imagem removida!",
        description: "A imagem foi removida com sucesso."
      });
      await loadSideImages();
    } catch (error) {
      console.error('Erro ao excluir imagem:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a imagem.",
        variant: "destructive"
      });
    }
  };

  const updateCssVariables = (product: Product) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', product.primary_color);
  };

  const handleSave = async () => {
    if (!product) return;

    try {
      const { error } = await supabase.from('products').update({
        title: product.title,
        purchase_link: product.purchase_link,
        whatsapp_link: product.whatsapp_link,
        primary_color: product.primary_color,
        product_description: product.product_description,
      }).eq('id', product.id);

      if (error) throw error;

      updateCssVariables(product);
      setHasUnsavedChanges(false);
      
      toast({
        title: "Alterações salvas!",
        description: "As alterações foram aplicadas com sucesso.",
      });

      navigate('/admin');
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    }
  };

  const handleUploadComplete = async (videoId: string, videoUrl: string) => {
    if (!product) return;
    setPreviewVideoUrl(videoUrl);
    setHasUnsavedChanges(true);
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ video_id: videoId })
        .eq('id', product.id);
        
      if (error) throw error;
      
      toast({
        title: "Vídeo atualizado!",
        description: "Clique em 'Salvar Alterações' para confirmar as mudanças.",
      });
      
      await loadProduct();
    } catch (error) {
      console.error('Erro ao atualizar vídeo:', error);
      toast({
        title: "Erro ao atualizar vídeo",
        description: "Não foi possível vincular o vídeo ao produto.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/login');
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!product) {
    return <div className="text-center py-8">Produto não encontrado</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Editar Produto</h2>
          <p className="text-sm text-gray-500">/{product.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (hasUnsavedChanges) {
                if (window.confirm('Existem alterações não salvas. Deseja sair mesmo assim?')) {
                  navigate('/admin');
                }
              } else {
                navigate('/admin');
              }
            }}
          >
            Voltar
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Título do Produto</Label>
          <Input 
            id="title" 
            value={product.title} 
            onChange={e => {
              setProduct({ ...product, title: e.target.value });
              setHasUnsavedChanges(true);
            }} 
          />
        </div>

        <div className="space-y-2">
          <Label>Upload de Vídeo</Label>
          <VideoUpload onUploadComplete={handleUploadComplete} />
          
          {previewVideoUrl && (
            <div className="mt-4">
              <Label>Pré-visualização do vídeo</Label>
              <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden shadow-lg">
                <video
                  className="absolute top-0 left-0 w-full h-full video-player"
                  src={previewVideoUrl}
                  controls
                  autoPlay
                  muted
                  controlsList="nodownload noplaybackrate noseek"
                  disablePictureInPicture
                  playsInline
                >
                  Seu navegador não suporta a tag de vídeo.
                </video>
              </div>
              <style>
                {`
                  .video-player::-webkit-media-controls-overflow-button,
                  .video-player::-webkit-media-controls-mute-button,
                  .video-player::-webkit-media-controls-fullscreen-button,
                  .video-player::-webkit-media-controls-timeline,
                  .video-player::-webkit-media-controls-volume-slider,
                  .video-player::-webkit-media-controls-settings-button {
                    display: none !important;
                  }
                `}
              </style>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchaseLink">Link de Compra</Label>
          <Input id="purchaseLink" value={product.purchase_link} onChange={e => {
            setProduct({ ...product, purchase_link: e.target.value });
            setHasUnsavedChanges(true);
          }} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappLink">Link do WhatsApp</Label>
          <Input id="whatsappLink" value={product.whatsapp_link} onChange={e => {
            setProduct({ ...product, whatsapp_link: e.target.value });
            setHasUnsavedChanges(true);
          }} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryColor">Cor Principal</Label>
          <Input id="primaryColor" type="color" value={product.primary_color} onChange={e => {
            setProduct({ ...product, primary_color: e.target.value });
            setHasUnsavedChanges(true);
          }} className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productDescription">Descrição Completa do Produto</Label>
          <Textarea id="productDescription" value={product.product_description} onChange={e => {
            setProduct({ ...product, product_description: e.target.value });
            setHasUnsavedChanges(true);
          }} rows={20} className="font-mono" placeholder="Insira a descrição completa do produto, incluindo modo de uso, precauções, conteúdo e avisos..." />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Imagem Lateral Esquerda</Label>
            <p className="text-sm text-gray-500 mb-2">
              Tamanho máximo: 10MB
              <br />
              Dimensões máximas: 800x1200 pixels
            </p>
            {sideImages.filter(img => img.position === 'left').map(image => (
              <div key={image.id} className="space-y-2 border p-4 rounded-lg">
                <img src={`${supabase.storage.from('product-images').getPublicUrl(image.image_path).data.publicUrl}`} alt="Imagem lateral" className="w-full h-40 object-cover rounded" />
                <Input placeholder="URL do link (opcional)" value={image.link_url || ''} onChange={e => updateImageLink(image.id, e.target.value)} />
                <Button variant="destructive" size="sm" onClick={() => deleteImage(image.id)}>
                  Remover Imagem
                </Button>
              </div>
            ))}
            <Input type="file" accept="image/*" onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload('left', file);
            }} />
          </div>

          <div className="space-y-4">
            <Label>Imagem Lateral Direita</Label>
            <p className="text-sm text-gray-500 mb-2">
              Tamanho máximo: 10MB
              <br />
              Dimensões máximas: 800x1200 pixels
            </p>
            {sideImages.filter(img => img.position === 'right').map(image => (
              <div key={image.id} className="space-y-2 border p-4 rounded-lg">
                <img src={`${supabase.storage.from('product-images').getPublicUrl(image.image_path).data.publicUrl}`} alt="Imagem lateral" className="w-full h-40 object-cover rounded" />
                <Input placeholder="URL do link (opcional)" value={image.link_url || ''} onChange={e => updateImageLink(image.id, e.target.value)} />
                <Button variant="destructive" size="sm" onClick={() => deleteImage(image.id)}>
                  Remover Imagem
                </Button>
              </div>
            ))}
            <Input type="file" accept="image/*" onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload('right', file);
            }} />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          className="w-full bg-red-600 hover:bg-red-500"
          disabled={!hasUnsavedChanges}
        >
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
};

export default AdminPanel;
