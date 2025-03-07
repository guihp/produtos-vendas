import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Instagram } from 'lucide-react';
type LinktreeCardProps = {
  title: string;
  link: string;
  icon?: ReactNode;
  imageUrl?: string;
  className?: string;
  type?: string;
};
const LinktreeCard = ({
  title,
  link,
  icon,
  imageUrl,
  className,
  type
}: LinktreeCardProps) => {
  return <a href={link} target="_blank" rel="noopener noreferrer" className={cn("flex items-center justify-between w-full p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100", className)}>
      <div className="flex items-center gap-3">
        {imageUrl && <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>}
        {icon && !imageUrl && <div className="text-gray-600">{icon}</div>}
        <span className="font-medium">{title}</span>
      </div>
      
    </a>;
};
export default LinktreeCard;