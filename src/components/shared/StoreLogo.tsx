import { STORE_COLORS } from "@/lib/constants";

interface StoreLogoProps {
  slug: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

export function StoreLogo({ slug, name, size = "md" }: StoreLogoProps) {
  const color = STORE_COLORS[slug] || "#666";
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px] rounded-md",
    md: "h-8 w-8 text-xs rounded-lg",
    lg: "h-12 w-12 text-sm rounded-xl",
  };

  return (
    <div
      className={`flex items-center justify-center font-bold text-white shadow-sm transition-transform hover:scale-105 ${sizeClasses[size]}`}
      style={{
        backgroundColor: color,
        boxShadow: `0 2px 8px ${color}25`,
      }}
      title={name}
    >
      {name?.[0] ?? "?"}
    </div>
  );
}
