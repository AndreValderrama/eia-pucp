import { Leaf } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export default function Logo({ className, iconSize = 24, textSize = "text-xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Leaf className="text-primary" size={iconSize} />
      <span className={`font-headline font-bold ${textSize} text-primary`}>
        EnviroWise EIA
      </span>
    </Link>
  );
}
