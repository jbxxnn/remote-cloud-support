import Image from "next/image";

interface RCELogoProps {
  className?: string;
  variant?: "black" | "white" | "auto";
  showText?: boolean;
}

export function RCELogo({ 
  className = "", 
  variant = "auto",
  showText = true 
}: RCELogoProps) {
  // Cache busting - update this version when logo files change
  const logoVersion = "v2";
  
  // Use CSS-based approach to avoid hydration mismatches
  // Render both logos and show/hide based on theme using Tailwind classes
  if (variant === "auto") {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="relative h-full w-full">
          {/* Black logo - visible in light mode */}
          <Image
            src={`/RCE LOGO SVG BLACK.svg?v=${logoVersion}`}
            alt="RCE Logo"
            width={240}
            height={80}
            className="h-16 w-48 object-contain dark:hidden"
            priority
          />
          {/* White logo - visible in dark mode */}
          <Image
            src={`/RCE LOGO SVG WHITE.svg?v=${logoVersion}`}
            alt="RCE Logo"
            width={240}
            height={80}
            className="h-16 w-48 object-contain hidden dark:block"
            priority
          />
        </div>
        {showText && (
          <span className="text-sm font-medium text-muted-foreground">SupportSense</span>
        )}
      </div>
    );
  }

  // Explicit variant - use the specified logo
  const logoSrc = variant === "white" 
    ? `/RCE LOGO SVG WHITE.svg?v=${logoVersion}` 
    : `/RCE LOGO SVG BLACK.svg?v=${logoVersion}`;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Image
        src={logoSrc}
        alt="RCE Logo"
        width={120}
        height={40}
        className="h-8 w-auto object-contain"
        priority
      />
      {showText && (
        <span className="text-sm font-medium text-muted-foreground">SupportSense</span>
      )}
    </div>
  );
}

