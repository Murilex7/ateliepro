import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-rose-600"
      >
        <rect x="2" y="10" width="16" height="10" rx="2" fill="currentColor" />
        <path d="M18 10V6a2 2 0 0 0-2-2H6" stroke="currentColor" strokeWidth="2" />
        <path d="M6 4v6" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="4" r="2" fill="currentColor" />
        <path d="M6 14v4" stroke="#FFF" strokeWidth="1.5" />
        <path d="M16 6c1 2 4 2 4 6v8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" fill="none" />
      </svg>
      {showText && (
        <span className="text-xl font-bold tracking-tight">
          <span className="text-rose-700">Ateliê</span>
          <span className="text-rose-400">Pro</span>
        </span>
      )}
    </div>
  );
}
