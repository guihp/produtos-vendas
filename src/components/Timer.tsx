
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

const Timer = () => {
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(0);
  const [hasWarned, setHasWarned] = useState(false);
  const { toast } = useToast();

  const getWhatsAppLink = () => {
    const config = localStorage.getItem('siteConfig');
    if (config) {
      return JSON.parse(config).whatsappLink;
    }
    return "https://wa.me/559984858134";
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (seconds > 0) {
        setSeconds(seconds - 1);
      }
      if (seconds === 0) {
        if (minutes === 0) {
          clearInterval(interval);
          toast({
            title: "⚠️ Promoção Encerrada!",
            description: (
              <div className="mt-2 space-y-2">
                <p>Não desanime! Clique no botão abaixo e fale com um de nossos atendentes para garantir sua promoção!</p>
                <button
                  onClick={() => window.location.href = getWhatsAppLink()}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Falar com Atendente
                </button>
              </div>
            ),
            duration: 0,
          });
        } else {
          setMinutes(minutes - 1);
          setSeconds(59);
        }
      }

      if (minutes === 2 && seconds === 0 && !hasWarned) {
        setHasWarned(true);
        toast({
          title: "⏰ Corra! Promoção está acabando!",
          description: "Restam apenas 2 minutos para aproveitar essa oferta especial!",
          duration: 5000,
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds, minutes, hasWarned, toast]);

  return (
    <div className="timer-box">
      <span className="text-2xl font-bold text-primary">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

export default Timer;
