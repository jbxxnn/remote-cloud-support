import Image from "next/image";

interface RCELogoProps {
  className?: string;
  variant?: "black" | "white";
}

export function RCELogo({ className = "", variant = "black" }: RCELogoProps) {
  const logoSrc = variant === "white" 
    ? "/RCE LOGO SVG WHITE.svg" 
    : "/RCE LOGO SVG BLACK.svg";

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center">
        <span className="text-2xl font-bold text-[var(--rce-green)]">RC</span>
        <span className="text-2xl font-bold text-foreground">E</span>
      </div>
      <span className="text-sm font-medium text-muted-foreground">SupportSense</span>
    </div>
  );
}

