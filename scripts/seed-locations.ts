/**
 * Seed real Dublin-area store locations into the database.
 * Run with: npx tsx scripts/seed-locations.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface LocationData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  openingHours?: Record<string, string>;
}

// ─── TESCO DUBLIN LOCATIONS ────────────────────────────

const tescoLocations: LocationData[] = [
  { name: "Tesco Jervis Street", address: "Jervis Shopping Centre, 125 Abbey St Upper, Dublin 1", latitude: 53.3484, longitude: -6.2654, phone: "+353 1 878 6244" },
  { name: "Tesco Baggot Street", address: "1 Baggot St Lower, Dublin 2", latitude: 53.3382, longitude: -6.2468, phone: "+353 1 631 3660" },
  { name: "Tesco Clearwater", address: "Clearwater Shopping Centre, Finglas Rd, Dublin 11", latitude: 53.3878, longitude: -6.2998, phone: "+353 1 882 7100" },
  { name: "Tesco Bloomfields", address: "Bloomfield Shopping Centre, Lower George's St, Dún Laoghaire", latitude: 53.2937, longitude: -6.1356, phone: "+353 1 230 1630" },
  { name: "Tesco Liffey Valley", address: "Liffey Valley Shopping Centre, Quarryvale, Dublin 22", latitude: 53.3449, longitude: -6.3919, phone: "+353 1 626 0200" },
  { name: "Tesco Dundrum", address: "Dundrum Town Centre, Sandyford Rd, Dundrum, Dublin 16", latitude: 53.2886, longitude: -6.2449, phone: "+353 1 299 1700" },
  { name: "Tesco Nutgrove", address: "Nutgrove Shopping Centre, Nutgrove Ave, Rathfarnham, Dublin 14", latitude: 53.2885, longitude: -6.2690, phone: "+353 1 493 1855" },
  { name: "Tesco Stillorgan", address: "Stillorgan Shopping Centre, Stillorgan, Co. Dublin", latitude: 53.2890, longitude: -6.2070, phone: "+353 1 278 2230" },
  { name: "Tesco Artane", address: "Artane Castle Shopping Centre, Kilmore Rd, Artane, Dublin 5", latitude: 53.3780, longitude: -6.2056, phone: "+353 1 848 1166" },
  { name: "Tesco Clarehall", address: "Clarehall Shopping Centre, Malahide Rd, Dublin 17", latitude: 53.3981, longitude: -6.1750, phone: "+353 1 848 0800" },
  { name: "Tesco Phibsborough", address: "Phibsborough Shopping Centre, Phibsborough, Dublin 7", latitude: 53.3598, longitude: -6.2724, phone: "+353 1 830 7433" },
  { name: "Tesco Merrion Centre", address: "Merrion Shopping Centre, Merrion Rd, Dublin 4", latitude: 53.3189, longitude: -6.2175, phone: "+353 1 219 3640" },
  { name: "Tesco Tallaght", address: "The Square Town Centre, Tallaght, Dublin 24", latitude: 53.2876, longitude: -6.3741, phone: "+353 1 459 7400" },
  { name: "Tesco Swords", address: "Swords Pavilions Shopping Centre, Swords, Co. Dublin", latitude: 53.4575, longitude: -6.2186, phone: "+353 1 895 0200" },
  { name: "Tesco Cabinteely", address: "Dublin Rd, Cabinteely, Dublin 18", latitude: 53.2556, longitude: -6.1620, phone: "+353 1 235 0160" },
  { name: "Tesco Ballybrack", address: "Old Bray Rd, Ballybrack, Co. Dublin", latitude: 53.2417, longitude: -6.1273, phone: "+353 1 282 6066" },
  { name: "Tesco Belgard Road", address: "Belgard Rd, Tallaght, Dublin 24", latitude: 53.2932, longitude: -6.3611, phone: "+353 1 452 7600" },
  { name: "Tesco Lucan", address: "Ballyowen Shopping Centre, Lucan, Co. Dublin", latitude: 53.3535, longitude: -6.4305, phone: "+353 1 610 4680" },
  { name: "Tesco Maynooth", address: "Manor Mills Shopping Centre, Maynooth, Co. Kildare", latitude: 53.3819, longitude: -6.5928, phone: "+353 1 629 1604" },
  { name: "Tesco Bray", address: "Southern Cross Rd, Bray, Co. Wicklow", latitude: 53.2018, longitude: -6.1130, phone: "+353 1 286 7066" },
];

// ─── DUNNES STORES DUBLIN LOCATIONS ────────────────────

const dunnesLocations: LocationData[] = [
  { name: "Dunnes St Stephen's Green", address: "St Stephen's Green Shopping Centre, Dublin 2", latitude: 53.3389, longitude: -6.2612, phone: "+353 1 478 0188" },
  { name: "Dunnes Cornelscourt", address: "Cornelscourt Shopping Centre, Bray Rd, Dublin 18", latitude: 53.2655, longitude: -6.1841, phone: "+353 1 289 5550" },
  { name: "Dunnes Ilac Centre", address: "Ilac Shopping Centre, Henry St, Dublin 1", latitude: 53.3509, longitude: -6.2653, phone: "+353 1 873 3455" },
  { name: "Dunnes Northside Shopping Centre", address: "Northside Shopping Centre, Coolock, Dublin 5", latitude: 53.3836, longitude: -6.1886, phone: "+353 1 848 1577" },
  { name: "Dunnes Blanchardstown", address: "Blanchardstown Centre, Dublin 15", latitude: 53.3882, longitude: -6.3811, phone: "+353 1 822 1300" },
  { name: "Dunnes Dundrum Town Centre", address: "Dundrum Town Centre, Sandyford Rd, Dublin 16", latitude: 53.2886, longitude: -6.2449, phone: "+353 1 299 1150" },
  { name: "Dunnes Liffey Valley", address: "Liffey Valley Shopping Centre, Dublin 22", latitude: 53.3449, longitude: -6.3919, phone: "+353 1 626 0100" },
  { name: "Dunnes Pavilions Swords", address: "Pavilions Shopping Centre, Swords, Co. Dublin", latitude: 53.4575, longitude: -6.2186, phone: "+353 1 890 3800" },
  { name: "Dunnes George's Street", address: "George's Street Arcade, South Great George's St, Dublin 2", latitude: 53.3416, longitude: -6.2642, phone: "+353 1 679 7511" },
  { name: "Dunnes The Square Tallaght", address: "The Square, Tallaght, Dublin 24", latitude: 53.2876, longitude: -6.3741, phone: "+353 1 459 1100" },
  { name: "Dunnes Rathmines", address: "Swan Centre, Rathmines, Dublin 6", latitude: 53.3258, longitude: -6.2639, phone: "+353 1 497 3822" },
  { name: "Dunnes Ashleaf", address: "Ashleaf Shopping Centre, Crumlin, Dublin 12", latitude: 53.3196, longitude: -6.3183, phone: "+353 1 455 5644" },
  { name: "Dunnes Donaghmede", address: "Donaghmede Shopping Centre, Dublin 13", latitude: 53.3924, longitude: -6.1517, phone: "+353 1 848 4133" },
  { name: "Dunnes Lucan", address: "Hillcrest Shopping Centre, Lucan, Co. Dublin", latitude: 53.3539, longitude: -6.4295, phone: "+353 1 621 3100" },
  { name: "Dunnes Jetland", address: "Jetland Shopping Centre, Irishtown, Dublin 4", latitude: 53.3370, longitude: -6.2255, phone: "+353 1 660 0866" },
  { name: "Dunnes Ballinteer", address: "Ballinteer Ave, Ballinteer, Dublin 16", latitude: 53.2760, longitude: -6.2596, phone: "+353 1 296 2033" },
  { name: "Dunnes Stillorgan", address: "Stillorgan Village Centre, Stillorgan, Co. Dublin", latitude: 53.2890, longitude: -6.2070, phone: "+353 1 283 2766" },
  { name: "Dunnes Swords Main Street", address: "Main St, Swords, Co. Dublin", latitude: 53.4597, longitude: -6.2181, phone: "+353 1 840 5811" },
];

// ─── LIDL DUBLIN LOCATIONS ─────────────────────────────

const lidlLocations: LocationData[] = [
  { name: "Lidl Phibsborough", address: "Phibsborough Rd, Phibsborough, Dublin 7", latitude: 53.3582, longitude: -6.2710, phone: "+353 1 800 7474" },
  { name: "Lidl Rathmines", address: "Rathmines Rd Lower, Rathmines, Dublin 6", latitude: 53.3256, longitude: -6.2636, phone: "+353 1 800 7474" },
  { name: "Lidl Ballyfermot", address: "Le Fanu Rd, Ballyfermot, Dublin 10", latitude: 53.3396, longitude: -6.3540, phone: "+353 1 800 7474" },
  { name: "Lidl Tallaght", address: "Belgard Rd, Tallaght, Dublin 24", latitude: 53.2940, longitude: -6.3580, phone: "+353 1 800 7474" },
  { name: "Lidl Finglas", address: "Jamestown Rd, Finglas, Dublin 11", latitude: 53.3900, longitude: -6.2975, phone: "+353 1 800 7474" },
  { name: "Lidl Swords", address: "North St, Swords, Co. Dublin", latitude: 53.4612, longitude: -6.2193, phone: "+353 1 800 7474" },
  { name: "Lidl North Strand", address: "North Strand Rd, Dublin 3", latitude: 53.3572, longitude: -6.2412, phone: "+353 1 800 7474" },
  { name: "Lidl Crumlin", address: "Crumlin Rd, Crumlin, Dublin 12", latitude: 53.3238, longitude: -6.3057, phone: "+353 1 800 7474" },
  { name: "Lidl Coolock", address: "Malahide Rd, Coolock, Dublin 5", latitude: 53.3830, longitude: -6.1834, phone: "+353 1 800 7474" },
  { name: "Lidl Fortunestown", address: "Fortunestown Lane, Tallaght, Dublin 24", latitude: 53.2757, longitude: -6.3885, phone: "+353 1 800 7474" },
  { name: "Lidl Ballybrack", address: "Dublin Rd, Ballybrack, Co. Dublin", latitude: 53.2410, longitude: -6.1283, phone: "+353 1 800 7474" },
  { name: "Lidl Lucan", address: "Newcastle Rd, Lucan, Co. Dublin", latitude: 53.3540, longitude: -6.4410, phone: "+353 1 800 7474" },
  { name: "Lidl Cabra", address: "Fassaugh Rd, Cabra, Dublin 7", latitude: 53.3632, longitude: -6.2900, phone: "+353 1 800 7474" },
  { name: "Lidl Clondalkin", address: "Monastery Rd, Clondalkin, Dublin 22", latitude: 53.3186, longitude: -6.3910, phone: "+353 1 800 7474" },
  { name: "Lidl Donaghmede", address: "Grange Rd, Donaghmede, Dublin 13", latitude: 53.3920, longitude: -6.1500, phone: "+353 1 800 7474" },
  { name: "Lidl Sandyford", address: "Blackthorn Rd, Sandyford, Dublin 18", latitude: 53.2710, longitude: -6.2070, phone: "+353 1 800 7474" },
  { name: "Lidl Walkinstown", address: "Walkinstown Ave, Walkinstown, Dublin 12", latitude: 53.3150, longitude: -6.3240, phone: "+353 1 800 7474" },
  { name: "Lidl Artane", address: "Kilmore Rd, Artane, Dublin 5", latitude: 53.3765, longitude: -6.2100, phone: "+353 1 800 7474" },
  { name: "Lidl Bray", address: "Main St, Bray, Co. Wicklow", latitude: 53.2040, longitude: -6.0990, phone: "+353 1 800 7474" },
  { name: "Lidl Blanchardstown", address: "Snugborough Rd, Blanchardstown, Dublin 15", latitude: 53.3900, longitude: -6.3825, phone: "+353 1 800 7474" },
];

// ─── ALDI DUBLIN LOCATIONS ─────────────────────────────

const aldiLocations: LocationData[] = [
  { name: "Aldi Parnell Street", address: "40 Parnell St, Dublin 1", latitude: 53.3527, longitude: -6.2622, phone: "+353 1 873 6070" },
  { name: "Aldi Cork Street", address: "Cork St, The Liberties, Dublin 8", latitude: 53.3379, longitude: -6.2808, phone: "+353 1 453 0870" },
  { name: "Aldi Crumlin", address: "Sundrive Rd, Crumlin, Dublin 12", latitude: 53.3193, longitude: -6.3036, phone: "+353 1 455 0760" },
  { name: "Aldi Finglas", address: "Clearwater Shopping Centre, Finglas Rd, Dublin 11", latitude: 53.3882, longitude: -6.2965, phone: "+353 1 864 3700" },
  { name: "Aldi North Strand", address: "North Strand Rd, Dublin 3", latitude: 53.3558, longitude: -6.2410, phone: "+353 1 836 1970" },
  { name: "Aldi Swords", address: "R132, Swords, Co. Dublin", latitude: 53.4548, longitude: -6.2210, phone: "+353 1 840 8330" },
  { name: "Aldi Tallaght", address: "Main Rd, Tallaght, Dublin 24", latitude: 53.2888, longitude: -6.3575, phone: "+353 1 451 8990" },
  { name: "Aldi Ballymun", address: "Ballymun Rd, Ballymun, Dublin 9", latitude: 53.3930, longitude: -6.2650, phone: "+353 1 842 0890" },
  { name: "Aldi Artane", address: "Kilmore Rd, Artane, Dublin 5", latitude: 53.3770, longitude: -6.2075, phone: "+353 1 831 3710" },
  { name: "Aldi Clondalkin", address: "Ninth Lock Rd, Clondalkin, Dublin 22", latitude: 53.3220, longitude: -6.3835, phone: "+353 1 457 5900" },
  { name: "Aldi Lucan", address: "R120, Lucan, Co. Dublin", latitude: 53.3560, longitude: -6.4480, phone: "+353 1 621 0740" },
  { name: "Aldi Rathmines", address: "Richmond Hill, Rathmines, Dublin 6", latitude: 53.3270, longitude: -6.2655, phone: "+353 1 496 4820" },
  { name: "Aldi Coolock", address: "Oscar Traynor Rd, Coolock, Dublin 5", latitude: 53.3842, longitude: -6.1870, phone: "+353 1 847 5600" },
  { name: "Aldi Blanchardstown", address: "Blanchardstown Rd North, Dublin 15", latitude: 53.3895, longitude: -6.3780, phone: "+353 1 820 9130" },
  { name: "Aldi Stillorgan", address: "Stillorgan Rd, Stillorgan, Co. Dublin", latitude: 53.2925, longitude: -6.2140, phone: "+353 1 278 8960" },
  { name: "Aldi Glasnevin", address: "Ballygall Rd East, Glasnevin, Dublin 11", latitude: 53.3720, longitude: -6.2760, phone: "+353 1 834 8110" },
  { name: "Aldi Bray", address: "Vevay Rd, Bray, Co. Wicklow", latitude: 53.2012, longitude: -6.1085, phone: "+353 1 286 4220" },
  { name: "Aldi Dún Laoghaire", address: "Georges Place, Dún Laoghaire, Co. Dublin", latitude: 53.2944, longitude: -6.1338, phone: "+353 1 230 1590" },
  { name: "Aldi Nutgrove", address: "Nutgrove Ave, Rathfarnham, Dublin 14", latitude: 53.2878, longitude: -6.2650, phone: "+353 1 493 2870" },
  { name: "Aldi Donaghmede", address: "Donaghmede Shopping Centre, Dublin 13", latitude: 53.3920, longitude: -6.1530, phone: "+353 1 848 4900" },
];

// ─── DEFAULT OPENING HOURS ─────────────────────────────

const defaultOpeningHours = {
  monday: "08:00-22:00",
  tuesday: "08:00-22:00",
  wednesday: "08:00-22:00",
  thursday: "08:00-22:00",
  friday: "08:00-22:00",
  saturday: "08:00-21:00",
  sunday: "10:00-19:00",
};

const lidlOpeningHours = {
  monday: "08:00-21:00",
  tuesday: "08:00-21:00",
  wednesday: "08:00-21:00",
  thursday: "08:00-21:00",
  friday: "08:00-21:00",
  saturday: "08:00-21:00",
  sunday: "09:00-21:00",
};

const aldiOpeningHours = {
  monday: "09:00-21:00",
  tuesday: "09:00-21:00",
  wednesday: "09:00-21:00",
  thursday: "09:00-21:00",
  friday: "09:00-21:00",
  saturday: "09:00-21:00",
  sunday: "09:00-21:00",
};

// ─── SUPERVALU API FETCHER ─────────────────────────────

interface SuperValuApiStore {
  name: string;
  address: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    county?: string;
  };
  geoPoint: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  openingHours?: Array<{
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
  }>;
}

async function fetchSuperValuLocations(): Promise<LocationData[]> {
  console.log("Fetching SuperValu store locations from API...");

  try {
    const response = await fetch(
      "https://storefrontgateway.supervalu.ie/api/stores/"
    );
    if (!response.ok) {
      throw new Error(`SuperValu API returned ${response.status}`);
    }

    const stores: SuperValuApiStore[] = await response.json();

    // Filter for Dublin-area stores (lat ~53.2-53.5, lng ~-6.5 to -6.0)
    const dublinStores = stores.filter((store) => {
      const lat = store.geoPoint?.latitude;
      const lng = store.geoPoint?.longitude;
      return lat >= 53.2 && lat <= 53.5 && lng >= -6.5 && lng <= -6.0;
    });

    console.log(
      `Found ${dublinStores.length} SuperValu stores in Dublin area (from ${stores.length} total)`
    );

    return dublinStores.map((store) => {
      const addressParts = [
        store.address?.addressLine1,
        store.address?.addressLine2,
        store.address?.city,
        store.address?.county,
      ].filter(Boolean);

      const openingHours: Record<string, string> = {};
      if (store.openingHours) {
        for (const oh of store.openingHours) {
          openingHours[oh.dayOfWeek.toLowerCase()] =
            `${oh.openTime}-${oh.closeTime}`;
        }
      }

      return {
        name: `SuperValu ${store.name}`,
        address: addressParts.join(", ") || store.name,
        latitude: store.geoPoint.latitude,
        longitude: store.geoPoint.longitude,
        phone: store.phone || undefined,
        openingHours:
          Object.keys(openingHours).length > 0 ? openingHours : undefined,
      };
    });
  } catch (error) {
    console.warn(
      "Failed to fetch SuperValu locations from API, using fallback data:",
      error
    );
    return superValuFallback;
  }
}

// Fallback SuperValu locations in case the API is unavailable
const superValuFallback: LocationData[] = [
  { name: "SuperValu Knocklyon", address: "Knocklyon Shopping Centre, Knocklyon, Dublin 16", latitude: 53.2795, longitude: -6.3180, phone: "+353 1 494 1044" },
  { name: "SuperValu Templeogue", address: "Cypress Rd, Templeogue, Dublin 6W", latitude: 53.3030, longitude: -6.3090, phone: "+353 1 490 8333" },
  { name: "SuperValu Rathgar", address: "Rathgar Rd, Rathgar, Dublin 6", latitude: 53.3175, longitude: -6.2722, phone: "+353 1 492 0066" },
  { name: "SuperValu Dalkey", address: "Castle St, Dalkey, Co. Dublin", latitude: 53.2770, longitude: -6.1003, phone: "+353 1 285 9766" },
  { name: "SuperValu Ranelagh", address: "Ranelagh Village, Dublin 6", latitude: 53.3274, longitude: -6.2568, phone: "+353 1 497 8177" },
  { name: "SuperValu Blackrock", address: "Blackrock Shopping Centre, Blackrock, Co. Dublin", latitude: 53.3010, longitude: -6.1780, phone: "+353 1 278 8099" },
  { name: "SuperValu Raheny", address: "Main St, Raheny, Dublin 5", latitude: 53.3813, longitude: -6.1760, phone: "+353 1 831 0855" },
  { name: "SuperValu Sutton", address: "Sutton Cross, Sutton, Dublin 13", latitude: 53.3889, longitude: -6.1107, phone: "+353 1 832 5133" },
  { name: "SuperValu Killester", address: "Killester Ave, Killester, Dublin 5", latitude: 53.3693, longitude: -6.1970, phone: "+353 1 833 7966" },
  { name: "SuperValu Lucan", address: "Main St, Lucan, Co. Dublin", latitude: 53.3564, longitude: -6.4440, phone: "+353 1 628 0155" },
  { name: "SuperValu Churchtown", address: "Braemor Rd, Churchtown, Dublin 14", latitude: 53.3010, longitude: -6.2615, phone: "+353 1 298 5066" },
  { name: "SuperValu Terenure", address: "Terenure Rd North, Terenure, Dublin 6W", latitude: 53.3132, longitude: -6.2849, phone: "+353 1 490 2433" },
  { name: "SuperValu Clontarf", address: "Vernon Ave, Clontarf, Dublin 3", latitude: 53.3647, longitude: -6.1960, phone: "+353 1 833 2299" },
  { name: "SuperValu Ballinteer", address: "Ballinteer Ave, Ballinteer, Dublin 16", latitude: 53.2760, longitude: -6.2596, phone: "+353 1 296 2766" },
  { name: "SuperValu Skerries", address: "Dublin Rd, Skerries, Co. Dublin", latitude: 53.5793, longitude: -6.1073, phone: "+353 1 849 1133" },
  { name: "SuperValu Malahide", address: "Main St, Malahide, Co. Dublin", latitude: 53.4510, longitude: -6.1543, phone: "+353 1 845 0077" },
  { name: "SuperValu Swords", address: "Main St, Swords, Co. Dublin", latitude: 53.4592, longitude: -6.2175, phone: "+353 1 840 2200" },
  { name: "SuperValu Sandymount", address: "Sandymount Green, Dublin 4", latitude: 53.3327, longitude: -6.2185, phone: "+353 1 269 1288" },
];

// ─── MAIN SEEDING FUNCTION ─────────────────────────────

async function main() {
  console.log("Starting store location seeding...\n");

  // Look up store IDs by slug
  const storeSlugs = ["tesco", "dunnes", "lidl", "aldi", "supervalu"];
  const stores = await prisma.store.findMany({
    where: { slug: { in: storeSlugs } },
    select: { id: true, slug: true, name: true },
  });

  const storeMap = new Map(stores.map((s) => [s.slug, s]));

  for (const slug of storeSlugs) {
    if (!storeMap.has(slug)) {
      console.error(`Store with slug "${slug}" not found in database!`);
      process.exit(1);
    }
  }

  console.log(
    `Found ${stores.length} stores: ${stores.map((s) => s.name).join(", ")}\n`
  );

  // Delete existing store locations
  console.log("Deleting existing store locations...");
  const deleted = await prisma.storeLocation.deleteMany({});
  console.log(`Deleted ${deleted.count} existing locations.\n`);

  // Prepare locations per store
  const locationsBySlug: Record<string, LocationData[]> = {
    tesco: tescoLocations,
    dunnes: dunnesLocations,
    lidl: lidlLocations,
    aldi: aldiLocations,
  };

  // Fetch SuperValu locations from API (with fallback)
  const superValuLocations = await fetchSuperValuLocations();
  locationsBySlug.supervalu = superValuLocations;

  // Assign default opening hours where not specified
  const openingHoursBySlug: Record<string, Record<string, string>> = {
    tesco: defaultOpeningHours,
    dunnes: defaultOpeningHours,
    lidl: lidlOpeningHours,
    aldi: aldiOpeningHours,
    supervalu: defaultOpeningHours,
  };

  let totalCreated = 0;

  for (const slug of storeSlugs) {
    const store = storeMap.get(slug)!;
    const locations = locationsBySlug[slug];

    console.log(`Seeding ${locations.length} locations for ${store.name}...`);

    const created = await prisma.storeLocation.createMany({
      data: locations.map((loc) => ({
        storeId: store.id,
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        phone: loc.phone || null,
        openingHours: loc.openingHours || openingHoursBySlug[slug],
      })),
    });

    console.log(`  Created ${created.count} locations for ${store.name}`);
    totalCreated += created.count;
  }

  console.log(`\nDone! Seeded ${totalCreated} store locations total.`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
