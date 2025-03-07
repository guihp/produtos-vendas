import { useState, useEffect, useRef } from 'react';
import Timer from '../components/Timer';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle } from 'lucide-react';

const ProductPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseLink, setPurchaseLink] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [sideImages, setSideImages] = useState<any[]>([]);
  const [showEndPopup, setShowEndPopup] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadProductConfig();
  }, []);

  // Função para forçar o autoplay do vídeo com som quando ele estiver pronto
  useEffect(() => {
    if (videoRef.current && uploadedVideoUrl) {
      const video = videoRef.current;
      
      const playVideo = async () => {
        try {
          // Começa sempre mudo para garantir o autoplay
          video.muted = true;
          await video.play();
          
          // Adiciona um overlay visível para indicar que precisa tocar para ativar o som
          const container = video.parentElement;
          if (container) {
            const overlay = document.createElement('div');
            overlay.className = 'tap-for-sound';
            overlay.innerHTML = '🔇 Toque para ativar o som';
            container.appendChild(overlay);
            
            // Função para habilitar o áudio com interação do usuário
            const enableAudio = () => {
              video.muted = false;
              overlay.remove();
              // Remove os listeners após habilitar o áudio
              document.removeEventListener('touchstart', enableAudio);
              document.removeEventListener('click', enableAudio);
            };
            
            document.addEventListener('touchstart', enableAudio, { once: true });
            document.addEventListener('click', enableAudio, { once: true });
          }
        } catch (err) {
          console.error("Falha ao reproduzir vídeo:", err);
        }
      };

      // Configura eventos para garantir a reprodução
      video.addEventListener('loadedmetadata', playVideo);
      video.addEventListener('canplay', playVideo);
      
      // Adiciona evento para quando o vídeo terminar
      const handleVideoEnd = () => {
        console.log("Vídeo terminou!");
        setShowEndPopup(true);
        // Pausa o vídeo quando terminar
        video.pause();
      };
      
      video.addEventListener('ended', handleVideoEnd);
      
      // Tenta iniciar imediatamente também
      if (video.readyState >= 2) {
        playVideo();
      }

      // Evento de clique para alternar play/pause
      const handleVideoClick = () => {
        if (video.paused) {
          video.play();
          setShowEndPopup(false); // Esconde o popup se o vídeo for reproduzido novamente
        } else {
          video.pause();
        }
      };
      video.addEventListener('click', handleVideoClick);

      // Cleanup
      return () => {
        video.removeEventListener('loadedmetadata', playVideo);
        video.removeEventListener('canplay', playVideo);
        video.removeEventListener('click', handleVideoClick);
        video.removeEventListener('ended', handleVideoEnd);
        // Remove o overlay se existir
        const overlay = document.querySelector('.tap-for-sound');
        if (overlay) overlay.remove();
      };
    }
  }, [videoRef.current, uploadedVideoUrl]);

  const loadProductConfig = async () => {
    try {
      const slug = window.location.pathname.split('/').pop() || '';

      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq(slug ? 'slug' : 'is_base_template', slug || true)
        .single();

      if (error) {
        console.error('Erro ao carregar produto:', error);
        return;
      }

      if (product) {
        setPurchaseLink(product.purchase_link);
        setWhatsappLink(product.whatsapp_link);
        setProductDescription(product.product_description);
        document.documentElement.style.setProperty('--primary', product.primary_color);

        const { data: images } = await supabase
          .from('product_side_images')
          .select('*')
          .eq('product_id', product.id)
          .order('created_at');

        setSideImages(images || []);

        if (product.video_id) {
          const { data: video } = await supabase
            .from('videos')
            .select('file_path')
            .eq('id', product.video_id)
            .single();

          if (video) {
            const { data } = supabase.storage
              .from('videos')
              .getPublicUrl(video.file_path);
              
            setUploadedVideoUrl(data.publicUrl);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handlePurchase = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = purchaseLink;
    }, 500);
  };

  // Função para prevenir pulos no vídeo
  const preventSeeking = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.paused) {
      video.play();
    }
  };

  // Função para lidar com atalhos de teclado no vídeo
  const handleVideoKeyDown = (e: React.KeyboardEvent) => {
    // Impedir atalhos de teclado para navegação no vídeo
    if ([' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      if (e.key === ' ') {
        // Permitir apenas play/pause com barra de espaço
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      }
      e.preventDefault();
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 p-0">
      {/* Promotional Banner */}
      <div className="promo-banner text-center w-full">
        <div className="mx-auto">
          <p className="text-xl md:text-2xl font-bold animate-pulse">
            🔥 PROMOÇÃO ESPECIAL - ÚLTIMA CHANCE 🔥
          </p>
        </div>
      </div>

      <div className="w-full px-4 py-8 space-y-8">
        {/* Timer Section */}
        <div className="flex flex-col items-center space-y-3 fade-in">
          <p className="text-xl font-bold text-red-600">
            ⚠️ ATENÇÃO: Oferta por tempo limitado!
          </p>
          <div className="flex items-center gap-3">
            <p className="text-lg font-medium">Promoção termina em:</p>
            <Timer />
          </div>
        </div>

        {/* Header Section */}
        <div className="text-center space-y-6 fade-in">
          <h1 className="text-5xl md:text-6xl font-black text-primary shine">
            PAGUE SÓ NA ENTREGA
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 bounce">
            Receba amanhã mesmo! 📦
          </h2>
        </div>

        {/* Layout Grid with Side Images */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 max-w-7xl mx-auto">
          {/* Left Side Images */}
          <div className="md:col-span-2 space-y-4">
            {sideImages
              .filter(img => img.position === 'left')
              .map(image => (
                image.link_url ? (
                  <a
                    key={image.id}
                    href={image.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={`${supabase.storage.from('product-images').getPublicUrl(image.image_path).data.publicUrl}`}
                      alt="Imagem lateral"
                      className="w-full rounded-lg shadow-lg hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <img
                    key={image.id}
                    src={`${supabase.storage.from('product-images').getPublicUrl(image.image_path).data.publicUrl}`}
                    alt="Imagem lateral"
                    className="w-full rounded-lg shadow-lg"
                  />
                )
              ))}
          </div>

          {/* Main Content */}
          <div className="md:col-span-8 space-y-10">
            {/* Video Section */}
            {uploadedVideoUrl && (
              <div className="fade-in">
                <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden shadow-lg">
                  <video
                    ref={videoRef}
                    className="absolute top-0 left-0 w-full h-full video-player"
                    controls
                    autoPlay
                    playsInline
                    controlsList="nodownload noplaybackrate noseek nofullscreen noremoteplayback"
                    disablePictureInPicture
                    src={uploadedVideoUrl}
                    onSeeking={preventSeeking}
                    onKeyDown={handleVideoKeyDown}
                    preload="auto"
                  >
                    Seu navegador não suporta a tag de vídeo.
                  </video>
                </div>
              </div>
            )}

            {/* First CTA Button */}
            <div className="text-center fade-in">
              <button
                onClick={handlePurchase}
                disabled={isLoading}
                className="cta-button bg-[#ea384c]"
                style={{ backgroundColor: '#ea384c' }}
              >
                {isLoading ? "Processando..." : "QUERO COMPRAR AGORA"}
              </button>
              <p className="mt-2 text-sm text-gray-600">
                🔒 Compra 100% Segura e Discreta
              </p>
            </div>

            {/* Product Description */}
            <div className="highlight-box fade-in max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-12">
              <div className="space-y-4 text-gray-700 whitespace-pre-wrap text-left">
                {productDescription}
              </div>
            </div>

            {/* Final CTA Button */}
            <div className="text-center pb-8 fade-in mt-8">
              <button
                onClick={handlePurchase}
                disabled={isLoading}
                className="cta-button bg-[#ea384c]"
                style={{ backgroundColor: '#ea384c' }}
              >
                {isLoading ? "Processando..." : "APROVEITAR OFERTA AGORA"}
              </button>
              <p className="mt-2 text-sm text-gray-600">
                ⚡ Envio Imediato - Entrega Expressa
              </p>
            </div>
          </div>

          {/* Right Side Images */}
          <div className="md:col-span-2 space-y-4">
            {sideImages
              .filter(img => img.position === 'right')
              .map(image => (
                image.link_url ? (
                  <a
                    key={image.id}
                    href={image.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={`${supabase.storage.from('product-images').getPublicUrl(image.image_path).data.publicUrl}`}
                      alt="Imagem lateral"
                      className="w-full rounded-lg shadow-lg hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <img
                    key={image.id}
                    src={`${supabase.storage.from('product-images').getPublicUrl(image.image_path).data.publicUrl}`}
                    alt="Imagem lateral"
                    className="w-full rounded-lg shadow-lg"
                  />
                )
              ))}
          </div>
        </div>
      </div>

      {/* Popup Modal */}
      {showEndPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowEndPopup(false)}></div>
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 relative z-10 transform scale-100 animate-popup">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-red-600">
                🎉 APROVEITE AGORA!
              </h3>
              <p className="text-gray-700">
                Não perca esta oportunidade única! A promoção é por tempo limitado.
              </p>
              <button
                onClick={() => {
                  setShowEndPopup(false);
                  handlePurchase();
                }}
                className="cta-button w-full bg-[#ea384c] text-lg"
              >
                QUERO APROVEITAR AGORA!
              </button>
              <button
                onClick={() => setShowEndPopup(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Continuar assistindo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante do WhatsApp */}
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] rounded-full p-4 shadow-lg hover:scale-110 transition-transform duration-200 z-50 flex items-center gap-2 group"
        title="Falar no WhatsApp"
      >
        <span className="hidden md:block text-white whitespace-nowrap max-w-0 group-hover:max-w-xs transition-all duration-500 ease-in-out overflow-hidden">
          Quero saber mais sobre a escova de limpeza 3 em 1
        </span>
        <MessageCircle className="w-6 h-6 text-white flex-shrink-0" />
      </a>

      {/* CSS personalizado para esconder os controles indesejados em todos os dispositivos */}
      <style>
        {`
          /* Ocultar controles indesejados em todos os navegadores */
          .video-player::-webkit-media-controls-overflow-button,
          .video-player::-webkit-media-controls-mute-button,
          .video-player::-webkit-media-controls-fullscreen-button,
          .video-player::-webkit-media-controls-timeline,
          .video-player::-webkit-media-controls-volume-slider,
          .video-player::-webkit-media-controls-settings-button,
          .video-player::-webkit-media-controls-picture-in-picture-button,
          .video-player::-webkit-media-controls-playback-button {
            display: none !important;
          }
          
          /* Esconder todo o painel de controle em celulares */
          @media (max-width: 768px) {
            .video-player::-webkit-media-controls {
              display: none !important;
            }
            
            /* Manter apenas o botão de play/pause */
            .video-player::-webkit-media-controls-play-button {
              display: inline-block !important;
            }
          }
          
          /* Impedir aceleração e picture-in-picture via atributos */
          video {
            -webkit-playsinline: playsinline;
            playsinline: playsinline;
          }

          /* Estilo para o overlay de ativar som */
          .tap-for-sound {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10;
            pointer-events: none;
            animation: fadeInOut 2s ease-in-out infinite;
          }

          @keyframes fadeInOut {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 0.4; }
          }

          /* Animação para o popup */
          @keyframes popupScale {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          .animate-popup {
            animation: popupScale 0.3s ease-out forwards;
          }

          /* Adicionar efeito de pulsar no botão do WhatsApp */
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(37, 211, 102, 0); }
            100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
          }

          .fixed.bottom-6.right-6 {
            animation: pulse 2s infinite;
          }
        `}
      </style>
    </div>
  );
};

export default ProductPage;
