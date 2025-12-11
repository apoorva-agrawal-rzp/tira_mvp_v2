interface TiraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function TiraLogo({ className = '', size = 'md' }: TiraLogoProps) {
  const sizes = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
  };

  return (
    <div className={`flex items-center ${sizes[size]} ${className}`}>
      <svg
        viewBox="0 0 100 40"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="50"
          y="32"
          textAnchor="middle"
          className="fill-foreground"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '32px',
            fontWeight: 300,
            letterSpacing: '0.15em',
          }}
        >
          tira
        </text>
      </svg>
    </div>
  );
}

export function TiraLogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox="0 0 120 50"
        className="h-16 w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="60"
          y="38"
          textAnchor="middle"
          className="fill-foreground"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '36px',
            fontWeight: 300,
            letterSpacing: '0.2em',
          }}
        >
          tira
        </text>
      </svg>
    </div>
  );
}
