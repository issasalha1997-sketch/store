import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface PriceBadgeProps {
  price: number;
  originalPrice?: number | null;
  isOnSale?: boolean;
  isCheapest?: boolean;
}

export function PriceBadge({ price, originalPrice, isOnSale, isCheapest }: PriceBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg font-bold ${isCheapest ? "text-green-600" : ""}`}>
        {formatPrice(price)}
      </span>
      {isOnSale && originalPrice && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(originalPrice)}
          </span>
          <Badge variant="success" className="text-[10px]">
            SALE
          </Badge>
        </>
      )}
      {isCheapest && (
        <Badge variant="success" className="text-[10px]">
          CHEAPEST
        </Badge>
      )}
    </div>
  );
}
