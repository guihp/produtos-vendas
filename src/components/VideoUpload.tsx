
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface VideoUploadProps {
  onUploadComplete: (videoId: string, videoUrl: string) => void;
}

const VideoUpload = ({ onUploadComplete }: VideoUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Erro no upload",
        description: "Por favor, selecione um arquivo de vídeo válido.",
        variant: "destructive"
      });
      return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O vídeo deve ter no máximo 500MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert({
          title: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Obter URL do vídeo
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      toast({
        title: "Upload concluído!",
        description: "Seu vídeo foi enviado com sucesso.",
      });

      if (videoData) {
        onUploadComplete(videoData.id, publicUrl);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao fazer upload do vídeo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      const input = document.getElementById('video-upload') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-4">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
          id="video-upload"
          capture="environment"
        />
        <label
          htmlFor="video-upload"
          className="w-full cursor-pointer"
        >
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary transition-colors">
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-gray-400" />
              <div className="flex flex-col gap-1">
                <span className="font-medium">
                  {isUploading ? "Enviando vídeo..." : "Clique para selecionar um vídeo"}
                </span>
                <span className="text-sm text-gray-500">
                  ou arraste e solte aqui
                </span>
              </div>
            </div>
          </div>
        </label>

        {isUploading && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Enviando...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;
