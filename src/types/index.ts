export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  color: string | null;
  websiteUrl: string | null;
}

export interface ProductWithPrices {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  imageUrl: string | null;
  weight: number | null;
  weightUnit: string | null;
  category: { id: string; name: string; slug: string } | null;
  prices: PriceWithStore[];
  averageRating: number | null;
  reviewCount: number;
}

export interface PriceWithStore {
  id: string;
  price: number;
  originalPrice: number | null;
  isOnSale: boolean;
  unitPrice: number | null;
  unitPriceUnit: string | null;
  scrapedAt: Date | string;
  store: StoreInfo;
}

export interface BasketItemWithProduct {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    imageUrl: string | null;
    weight: number | null;
    weightUnit: string | null;
  };
  prices: PriceWithStore[];
}

export interface OptimizationResult {
  singleStoreBest: {
    store: StoreInfo;
    total: number;
    items: { productId: string; productName: string; price: number; quantity: number }[];
    missingItems: string[];
  };
  multiStoreBest: {
    stores: {
      store: StoreInfo;
      items: { productId: string; productName: string; price: number; quantity: number }[];
      subtotal: number;
    }[];
    total: number;
  };
  savings: number;
  savingsPercentage: number;
}

export interface TripPlan {
  route: TripStop[];
  totalDistance: number;
  totalDuration: number;
  fuelCost: number;
  totalSavings: number;
  netBenefit: number;
  verdict: "WORTH_IT" | "MARGINAL" | "NOT_WORTH_IT";
  directionsUrl: string;
}

export interface TripStop {
  store: StoreInfo;
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  items: { productName: string; quantity: number; price: number }[];
  subtotal: number;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  store?: string;
  minPrice?: number;
  maxPrice?: number;
  onSaleOnly?: boolean;
  sortBy?: "price_asc" | "price_desc" | "name" | "relevance";
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
