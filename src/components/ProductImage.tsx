import { useState } from 'react';
import { Gift } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export function ProductImage({
  src,
  alt,
  className = '',
  priority = false,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#F7ECEA] via-[#F2E0DC] to-[#EAD1CC] p-6 text-center text-[#7A2E3F] ${className}`}
      >
        <Gift className="h-8 w-8 stroke-[1.5]" />
        <span className="max-w-[22ch] text-xs font-medium leading-relaxed text-[#5C3A42]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
