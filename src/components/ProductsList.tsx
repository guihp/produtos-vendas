import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, Settings, Eye, Trash2, Edit, Check, X, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface Product {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  purchase_link: string;
  thumbnail_url: string | null;
}
const ProductsList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [newProductTitle, setNewProductTitle] = useState('');
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Adicionando estado para edição de URL
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editedPurchaseLink, setEditedPurchaseLink] = useState('');
  useEffect(() => {
    loadProducts();
  }, []);
  const loadProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('products').select('id, title, slug, created_at, purchase_link, thumbnail_url').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar a lista de produtos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de imagem do produto melhorado com validação e tratamento de erros
  const handleImageUpload = async (productId: string, file: File) => {
    try {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive"
        });
        return;
      }

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

      // Verificar se o bucket existe
      const { data: bucketExists } = await supabase.storage
        .getBucket('product-images');
      
      if (!bucketExists) {
        // Criar bucket se não existir
        const { error: createBucketError } = await supabase.storage
          .createBucket('product-images', {
            public: true
          });
          
        if (createBucketError) {
          console.error('Erro ao criar bucket:', createBucketError);
          throw createBucketError;
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}_thumbnail_${Date.now()}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      // Upload da imagem para o storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Substitui arquivos existentes se necessário
        });
        
      if (uploadError) throw uploadError;

      // Obter URL pública da imagem
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Falha ao obter URL pública da imagem');
      }

      // Atualizar o produto com a URL da imagem
      const { error: updateError } = await supabase
        .from('products')
        .update({
          thumbnail_url: publicUrlData.publicUrl
        })
        .eq('id', productId);
        
      if (updateError) throw updateError;
      
      toast({
        title: "Imagem adicionada com sucesso!",
        description: "A imagem foi vinculada ao produto."
      });

      // Recarregar a lista de produtos
      await loadProducts();
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da imagem. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Adicionar função para editar URL do produto
  const handleEditURL = (productId: string, currentURL: string) => {
    setEditingProductId(productId);
    setEditedPurchaseLink(currentURL);
  };
  const saveEditedURL = async (productId: string) => {
    try {
      // Validar URL
      try {
        new URL(editedPurchaseLink);
      } catch (e) {
        toast({
          title: "URL inválida",
          description: "Por favor, insira uma URL válida (incluindo http:// ou https://).",
          variant: "destructive"
        });
        return;
      }
      const {
        error
      } = await supabase.from('products').update({
        purchase_link: editedPurchaseLink
      }).eq('id', productId);
      if (error) throw error;
      toast({
        title: "URL atualizada!",
        description: "A URL do produto foi atualizada com sucesso."
      });
      setEditingProductId(null);
      await loadProducts();
    } catch (error) {
      console.error('Erro ao atualizar URL:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a URL do produto.",
        variant: "destructive"
      });
    }
  };
  const cancelEditURL = () => {
    setEditingProductId(null);
  };
  const createNewProduct = async () => {
    if (!newProductTitle.trim()) {
      toast({
        title: "Nome inválido",
        description: "Por favor, insira um nome para o produto.",
        variant: "destructive"
      });
      return;
    }
    try {
      // Buscar o template base
      const {
        data: baseTemplate
      } = await supabase.from('products').select('*').eq('is_base_template', true).single();
      if (!baseTemplate) {
        throw new Error('Template base não encontrado');
      }

      // Criar novo produto baseado no template
      const newSlug = newProductTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const {
        data: newProduct,
        error
      } = await supabase.from('products').insert({
        ...baseTemplate,
        id: undefined,
        title: newProductTitle,
        slug: newSlug,
        is_base_template: false,
        created_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      toast({
        title: "Produto criado com sucesso!",
        description: "Redirecionando para a página de edição..."
      });
      setIsDialogOpen(false);
      setNewProductTitle('');
      await loadProducts();
      navigate(`/admin/product/${newProduct.id}`);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast({
        title: "Erro ao criar produto",
        description: "Não foi possível criar o novo produto.",
        variant: "destructive"
      });
    }
  };
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const {
        error
      } = await supabase.from('products').delete().eq('id', productToDelete.id);
      if (error) throw error;
      toast({
        title: "Produto excluído com sucesso!",
        description: "O produto foi removido permanentemente."
      });
      await loadProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: "Erro ao excluir produto",
        description: "Não foi possível excluir o produto.",
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };
  const handleEditProduct = (productId: string) => {
    navigate(`/admin/product/${productId}`);
  };
  const handleViewProduct = (slug: string) => {
    // Abre em uma nova aba com o slug correto (sem barra no início)
    window.open(`/${slug}`, '_blank');
  };
  const confirmDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };
  const triggerFileInput = (productId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.productId = productId;
      fileInputRef.current.click();
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = e.target.dataset.productId;
    if (file && productId) {
      handleImageUpload(productId, file);
    }

    // Reset file input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  return <div className="bg-white shadow-lg rounded-lg p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Gerenciador de Produtos</h2>
      <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-500">
        <PlusCircle className="w-4 h-4" />
        Novo Produto
      </Button>
    </div>

    {isLoading ? <div className="text-center py-8">Carregando produtos...</div> : <div className="space-y-4">
        {products.map(product => <div key={product.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-4 mb-3 md:mb-0">
              {/* Thumbnail de imagem do produto */}
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => triggerFileInput(product.id)} title="Clique para adicionar ou alterar imagem">
                {product.thumbnail_url ? <img src={product.thumbnail_url} alt={product.title} className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-gray-400" />}
              </div>
              <div>
                <h3 className="font-semibold">{product.title}</h3>
                <p className="text-sm text-gray-500">/{product.slug}</p>
                
                {/* URL de compra editável */}
                {editingProductId === product.id ? <div className="flex items-center gap-2 mt-2">
                    <Input value={editedPurchaseLink} onChange={e => setEditedPurchaseLink(e.target.value)} className="text-sm" placeholder="https://..." />
                    <Button variant="ghost" size="icon" onClick={() => saveEditedURL(product.id)} className="text-green-500">
                      <Check size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={cancelEditURL} className="text-red-500">
                      <X size={18} />
                    </Button>
                  </div> : <div className="flex items-center gap-1 mt-1">
                    <div className="text-xs text-gray-500 truncate max-w-xs">
                      {product.purchase_link || "Sem link de compra"}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEditURL(product.id, product.purchase_link || '')} className="h-6 w-6 text-blue-500">
                      <Edit size={14} />
                    </Button>
                  </div>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => handleViewProduct(product.slug)} title="Visualizar página">
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => handleEditProduct(product.id)} className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Editar
              </Button>
              <Button variant="outline" size="icon" onClick={() => confirmDelete(product)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Excluir produto">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>)}

        {products.length === 0 && <div className="text-center py-8 text-gray-500">
            Nenhum produto encontrado
          </div>}
      </div>}

    {/* Input de arquivo oculto para upload de imagem */}
    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" data-product-id="" />

    {/* Modal de Novo Produto */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Produto</DialogTitle>
          <DialogDescription>
            Digite o nome do novo produto. Este nome será usado para gerar a URL da página.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="productTitle">Nome do Produto</Label>
            <Input id="productTitle" placeholder="Ex: Produto Premium" value={newProductTitle} onChange={e => setNewProductTitle(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={createNewProduct}>
            Criar Produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de Confirmação de Exclusão */}
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o produto "{productToDelete?.title}"? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
};
export default ProductsList;
