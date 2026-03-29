export const STORES = [
  {
    name: "Tesco Ireland",
    slug: "tesco",
    color: "#00539f",
    websiteUrl: "https://www.tesco.ie",
    logoUrl: "/icons/tesco.svg",
  },
  {
    name: "Dunnes Stores",
    slug: "dunnes",
    color: "#1a1a1a",
    websiteUrl: "https://www.dunnesstoresgrocery.com",
    logoUrl: "/icons/dunnes.svg",
  },
  {
    name: "Lidl Ireland",
    slug: "lidl",
    color: "#0050aa",
    websiteUrl: "https://www.lidl.ie",
    logoUrl: "/icons/lidl.svg",
  },
  {
    name: "Aldi Ireland",
    slug: "aldi",
    color: "#00005f",
    websiteUrl: "https://www.aldi.ie",
    logoUrl: "/icons/aldi.svg",
  },
  {
    name: "SuperValu",
    slug: "supervalu",
    color: "#e31837",
    websiteUrl: "https://www.supervalu.ie",
    logoUrl: "/icons/supervalu.svg",
  },
] as const;

export const CATEGORIES = [
  { name: "Dairy & Eggs", slug: "dairy-eggs", icon: "🥛" },
  { name: "Meat & Poultry", slug: "meat-poultry", icon: "🥩" },
  { name: "Fruits & Vegetables", slug: "fruits-vegetables", icon: "🥦" },
  { name: "Bakery", slug: "bakery", icon: "🍞" },
  { name: "Drinks", slug: "drinks", icon: "🥤" },
  { name: "Frozen", slug: "frozen", icon: "🧊" },
  { name: "Snacks & Sweets", slug: "snacks-sweets", icon: "🍫" },
  { name: "Pantry & Cupboard", slug: "pantry-cupboard", icon: "🥫" },
  { name: "Household", slug: "household", icon: "🧹" },
  { name: "Personal Care", slug: "personal-care", icon: "🧴" },
  { name: "Baby", slug: "baby", icon: "👶" },
] as const;

export const FUEL_PRICE_PER_LITRE = 1.75; // EUR
export const FUEL_CONSUMPTION_PER_100KM = 7; // litres
export const DEFAULT_HOURLY_RATE = 15; // EUR
export const WORTH_IT_THRESHOLD = 5; // EUR net benefit

export const STORE_COLORS: Record<string, string> = {
  tesco: "#00539f",
  dunnes: "#1a1a1a",
  lidl: "#0050aa",
  aldi: "#00005f",
  supervalu: "#e31837",
};
