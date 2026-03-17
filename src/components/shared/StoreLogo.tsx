import { STORE_COLORS } from "@/lib/constants";

interface StoreLogoProps {
  slug: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

export function StoreLogo({ slug, name, size = "md" }: StoreLogoProps) {
  const color = STORE_COLORS[slug] || "#666";
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  return (
    <div
      className={`flex items-center justify-center rounded-lg font-bold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {name.charAt(0)}
    </div>
  );
}
