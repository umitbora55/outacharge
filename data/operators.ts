// Türkiye EV Şarj Operatörleri ve Fiyatları (Aralık 2025 Güncel)

export interface ChargingOperator {
  id: string;
  name: string;
  logo?: string;
  color: string;
  website: string;
  app?: {
    ios?: string;
    android?: string;
  };
  pricing: {
    ac?: number; // TL/kWh for AC charging (≤22 kW)
    dcLow?: number; // TL/kWh for DC <100 kW
    dcMid?: number; // TL/kWh for DC 100-180 kW
    dcHigh?: number; // TL/kWh for DC >180 kW
    dcTeslaOwner?: number; // Special Tesla owner pricing
  };
  features: string[];
  stationCount: number; // Approximate station count in Turkey
  coverage: string; // Geographic coverage description
  paymentMethods: string[];
  membershipFee: number; // Monthly membership fee (0 = free)
  sessionFee: number; // Per-session fee
  idleFee?: number; // TL/minute for overstaying after charge complete
  idleFeeStartMinutes?: number; // Minutes after charge complete before idle fee starts
  lastUpdated: string; // ISO date string
}

export const operators: ChargingOperator[] = [
  {
    id: "zes",
    name: "ZES",
    color: "#00a651",
    website: "https://zes.net",
    app: {
      ios: "https://apps.apple.com/tr/app/zes/id1440158334",
      android: "https://play.google.com/store/apps/details?id=net.zes.app"
    },
    pricing: {
      ac: 8.99,
      dcLow: 10.99,
      dcMid: 12.99,
      dcHigh: 12.99
    },
    features: ["81 ilde kapsama", "CarPlay/Android Auto desteği", "Rezervasyon", "7/24 destek"],
    stationCount: 1800,
    coverage: "Türkiye geneli, 81 il",
    paymentMethods: ["Kredi Kartı", "Uygulama içi bakiye", "QR kod"],
    membershipFee: 0,
    sessionFee: 0,
    idleFee: 2,
    idleFeeStartMinutes: 10,
    lastUpdated: "2025-02-21"
  },
  {
    id: "esarj",
    name: "Eşarj",
    color: "#e31e24",
    website: "https://esarj.com",
    app: {
      ios: "https://apps.apple.com/tr/app/esarj/id1439764447",
      android: "https://play.google.com/store/apps/details?id=com.esarj.app"
    },
    pricing: {
      ac: 9.40,
      dcLow: 11.50,
      dcMid: 13.70,
      dcHigh: 13.70
    },
    features: ["Türkiye'nin ilk şarj operatörü", "Shell/Aytemiz ortaklığı", "Deşarj dinlenme noktaları", "YEK-G sertifikalı yeşil enerji"],
    stationCount: 1200,
    coverage: "Türkiye geneli, ana arterlerde yoğun",
    paymentMethods: ["Kredi Kartı", "Uygulama", "QR kod", "RFID kart"],
    membershipFee: 0,
    sessionFee: 0,
    idleFee: 1.5,
    idleFeeStartMinutes: 15,
    lastUpdated: "2025-12-01"
  },
  {
    id: "trugo",
    name: "Trugo",
    color: "#1a1a2e",
    website: "https://trugo.com.tr",
    app: {
      ios: "https://apps.apple.com/tr/app/trugo/id1631247372",
      android: "https://play.google.com/store/apps/details?id=com.trugo.app"
    },
    pricing: {
      ac: 8.49,
      dcLow: 10.60,
      dcMid: 11.82,
      dcHigh: 11.82
    },
    features: ["TOGG'un şarj ağı", "180 kW+ ultra hızlı şarj", "Modern istasyonlar", "Shell istasyonlarında mevcut"],
    stationCount: 800,
    coverage: "Türkiye geneli, hızla büyüyen ağ",
    paymentMethods: ["Kredi Kartı", "Uygulama", "QR kod"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "tesla",
    name: "Tesla Supercharger",
    color: "#cc0000",
    website: "https://tesla.com/tr_tr/charging",
    pricing: {
      dcLow: 11.10, // Non-Tesla price
      dcMid: 11.10,
      dcHigh: 11.10,
      dcTeslaOwner: 8.90 // Tesla owner price
    },
    features: ["250 kW ultra hızlı şarj", "Tesla araçlarla entegre", "Diğer markalara da açık", "Premium lokasyonlar"],
    stationCount: 150,
    coverage: "Büyük şehirler ve ana yollar",
    paymentMethods: ["Tesla hesabı", "Kredi kartı (diğer markalar)"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "voltrun",
    name: "Voltrun",
    color: "#6366f1",
    website: "https://voltrun.com",
    app: {
      ios: "https://apps.apple.com/tr/app/voltrun/id1530986854",
      android: "https://play.google.com/store/apps/details?id=com.voltrun.app"
    },
    pricing: {
      ac: 8.29,
      dcLow: 10.49,
      dcMid: 12.49,
      dcHigh: 12.49
    },
    features: ["Evim+İşyerim %20 indirim", "EPDK lisanslı", "Geniş iş birliği ağı", "Konut ve ticari çözümler"],
    stationCount: 600,
    coverage: "Türkiye geneli",
    paymentMethods: ["Kredi Kartı", "Uygulama", "QR kod"],
    membershipFee: 0,
    sessionFee: 0,
    idleFee: 1,
    idleFeeStartMinutes: 10,
    lastUpdated: "2025-02-01"
  },
  {
    id: "epower",
    name: "Petrol Ofisi e-POwer",
    color: "#ff6b00",
    website: "https://petrolofisi.com.tr/e-power",
    pricing: {
      ac: 8.49,
      dcLow: 9.99,
      dcMid: 10.99,
      dcHigh: 11.99
    },
    features: ["Petrol Ofisi istasyonlarında", "Market ve cafe imkanı", "Geniş otopark alanları"],
    stationCount: 400,
    coverage: "Petrol Ofisi istasyonları",
    paymentMethods: ["Kredi Kartı", "Uygulama", "PO Cüzdan"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "beefull",
    name: "Beefull",
    color: "#fbbf24",
    website: "https://beefull.com",
    pricing: {
      ac: 8.50,
      dcLow: 10.50,
      dcMid: 12.00,
      dcHigh: 12.50
    },
    features: ["Paylaşımlı enerji platformu", "Telefon/tablet şarj da mevcut", "Genç ve dinamik marka"],
    stationCount: 300,
    coverage: "Büyük şehirler",
    paymentMethods: ["Kredi Kartı", "Uygulama"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "aksasarj",
    name: "Aksa Şarj",
    color: "#1e40af",
    website: "https://aksasarj.com",
    pricing: {
      ac: 8.99,
      dcLow: 9.99,
      dcMid: 11.49,
      dcHigh: 12.49
    },
    features: ["Aksa Enerji güvencesi", "Uygun DC fiyatları", "Kurumsal çözümler"],
    stationCount: 250,
    coverage: "Türkiye geneli",
    paymentMethods: ["Kredi Kartı", "Uygulama"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-11-01"
  },
  {
    id: "sharz",
    name: "Sharz.net",
    color: "#10b981",
    website: "https://sharz.net",
    pricing: {
      ac: 8.99,
      dcLow: 10.99,
      dcMid: 12.49
    },
    features: ["Yerli girişim", "Farklı şehirlerde iş birlikleri", "Kullanıcı dostu uygulama"],
    stationCount: 350,
    coverage: "Seçili şehirler",
    paymentMethods: ["Kredi Kartı", "Uygulama", "QR kod"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "astor",
    name: "Astor Enerji",
    color: "#7c3aed",
    website: "https://astor.com.tr",
    pricing: {
      ac: 9.00,
      dcLow: 11.00,
      dcMid: 12.50,
      dcHigh: 13.00
    },
    features: ["Yerli üretim şarj üniteleri", "B2B çözümler", "Teknik destek"],
    stationCount: 200,
    coverage: "Türkiye geneli",
    paymentMethods: ["Kredi Kartı", "Uygulama"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "enyakit",
    name: "En Yakıt",
    color: "#ef4444",
    website: "https://enyakit.com.tr",
    pricing: {
      dcLow: 10.50,
      dcMid: 11.50,
      dcHigh: 12.50
    },
    features: ["Türkiye'nin ilk lisanslı şarj firması", "Tak ve Şarj Et (Enix) teknolojisi", "Sadece DC hızlı şarj"],
    stationCount: 180,
    coverage: "Ana yollar ve şehir merkezleri",
    paymentMethods: ["Kredi Kartı", "QR kod", "Uygulama gerektirmez"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "gcharge",
    name: "G-Charge (Gersan)",
    color: "#475569",
    website: "https://gcharge.com.tr",
    pricing: {
      ac: 9.20,
      dcLow: 11.20,
      dcMid: 12.80,
      dcHigh: 13.20
    },
    features: ["Yerli şarj ünitesi üreticisi", "Teknik uzmanlık", "Özel kurulum çözümleri"],
    stationCount: 150,
    coverage: "Seçili lokasyonlar",
    paymentMethods: ["Kredi Kartı", "Uygulama"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "oncharge",
    name: "OnCharge",
    color: "#0ea5e9",
    website: "https://oncharge.com.tr",
    pricing: {
      ac: 8.80,
      dcLow: 10.80,
      dcMid: 12.30
    },
    features: ["Kullanıcı dostu arayüz", "Hızlı büyüyen ağ"],
    stationCount: 120,
    coverage: "Büyük şehirler",
    paymentMethods: ["Kredi Kartı", "Uygulama"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  },
  {
    id: "wat",
    name: "Wat Mobilite",
    color: "#f59e0b",
    website: "https://wat.com.tr",
    pricing: {
      ac: 9.50,
      dcLow: 11.50,
      dcMid: 13.00
    },
    features: ["Premium lokasyonlar", "AVM ve otellerde yaygın"],
    stationCount: 200,
    coverage: "AVM'ler ve oteller",
    paymentMethods: ["Kredi Kartı", "Uygulama", "QR kod"],
    membershipFee: 0,
    sessionFee: 0,
    lastUpdated: "2025-12-01"
  }
];

// Helper function to get operator by ID
export const getOperatorById = (id: string): ChargingOperator | undefined => {
  return operators.find(op => op.id === id);
};

// Helper function to get cheapest operator for a given charge type
export type ChargeType = "ac" | "dcLow" | "dcMid" | "dcHigh";

export const getCheapestOperator = (chargeType: ChargeType): ChargingOperator | undefined => {
  const filtered = operators.filter(op => op.pricing[chargeType] !== undefined);
  return filtered.sort((a, b) => (a.pricing[chargeType] || 999) - (b.pricing[chargeType] || 999))[0];
};

// Helper function to calculate charging cost
export interface ChargingCostParams {
  operatorId: string;
  chargeType: ChargeType;
  kWhNeeded: number;
  isTeslaOwner?: boolean;
}

export const calculateChargingCost = (params: ChargingCostParams): number | null => {
  const operator = getOperatorById(params.operatorId);
  if (!operator) return null;

  let pricePerKwh: number | undefined;

  if (params.operatorId === "tesla" && params.isTeslaOwner) {
    pricePerKwh = operator.pricing.dcTeslaOwner;
  } else {
    pricePerKwh = operator.pricing[params.chargeType];
  }

  if (pricePerKwh === undefined) return null;

  return params.kWhNeeded * pricePerKwh;
};

// Compare all operators for a given charging scenario
export interface ComparisonResult {
  operator: ChargingOperator;
  cost: number;
  pricePerKwh: number;
}

export const compareAllOperators = (
  chargeType: ChargeType,
  kWhNeeded: number,
  isTeslaOwner: boolean = false
): ComparisonResult[] => {
  const results: ComparisonResult[] = [];

  operators.forEach(op => {
    let pricePerKwh: number | undefined;

    if (op.id === "tesla" && isTeslaOwner) {
      pricePerKwh = op.pricing.dcTeslaOwner;
    } else {
      pricePerKwh = op.pricing[chargeType];
    }

    if (pricePerKwh !== undefined) {
      results.push({
        operator: op,
        cost: kWhNeeded * pricePerKwh,
        pricePerKwh
      });
    }
  });

  return results.sort((a, b) => a.cost - b.cost);
};

// Home charging cost calculator (based on Turkish residential electricity tariffs)
export interface HomeChargingCost {
  daytimeCost: number; // 06:00-17:00
  peakCost: number; // 17:00-22:00
  nightCost: number; // 22:00-06:00
  averageCost: number;
}

// Turkish residential electricity prices (approximate, December 2025)
const HOME_ELECTRICITY_PRICES = {
  daytime: 4.20, // TL/kWh (06:00-17:00)
  peak: 6.50, // TL/kWh (17:00-22:00)
  night: 2.10, // TL/kWh (22:00-06:00)
  singleRate: 4.50 // TL/kWh (for non-multi-rate meters)
};

export const calculateHomeChargingCost = (kWhNeeded: number): HomeChargingCost => {
  return {
    daytimeCost: kWhNeeded * HOME_ELECTRICITY_PRICES.daytime,
    peakCost: kWhNeeded * HOME_ELECTRICITY_PRICES.peak,
    nightCost: kWhNeeded * HOME_ELECTRICITY_PRICES.night,
    averageCost: kWhNeeded * HOME_ELECTRICITY_PRICES.singleRate
  };
};

// Fuel comparison (petrol vs electric)
export interface FuelComparison {
  electricCost: number;
  petrolCost: number;
  savings: number;
  savingsPercent: number;
  co2SavedKg: number;
}

// Current petrol prices and consumption assumptions
const PETROL_PRICE_PER_LITER = 48.50; // TL/L (December 2025 approximate)
const AVG_PETROL_CONSUMPTION = 7.5; // L/100km for average car
const CO2_PER_LITER_PETROL = 2.31; // kg CO2 per liter of petrol

export const compareFuelCosts = (
  distanceKm: number,
  evConsumptionKwhPer100km: number,
  chargingCostPerKwh: number
): FuelComparison => {
  const kWhNeeded = (distanceKm / 100) * evConsumptionKwhPer100km;
  const electricCost = kWhNeeded * chargingCostPerKwh;

  const litersNeeded = (distanceKm / 100) * AVG_PETROL_CONSUMPTION;
  const petrolCost = litersNeeded * PETROL_PRICE_PER_LITER;

  const savings = petrolCost - electricCost;
  const savingsPercent = (savings / petrolCost) * 100;
  const co2SavedKg = litersNeeded * CO2_PER_LITER_PETROL;

  return {
    electricCost,
    petrolCost,
    savings,
    savingsPercent,
    co2SavedKg
  };
};

// Get operator statistics
export const getOperatorStats = () => {
  const totalStations = operators.reduce((sum, op) => sum + op.stationCount, 0);
  const avgAcPrice = operators.filter(op => op.pricing.ac).reduce((sum, op) => sum + (op.pricing.ac || 0), 0) / operators.filter(op => op.pricing.ac).length;
  const avgDcPrice = operators.filter(op => op.pricing.dcMid).reduce((sum, op) => sum + (op.pricing.dcMid || 0), 0) / operators.filter(op => op.pricing.dcMid).length;

  const cheapestAc = getCheapestOperator("ac");
  const cheapestDc = getCheapestOperator("dcMid");

  return {
    totalOperators: operators.length,
    totalStations,
    avgAcPrice: avgAcPrice.toFixed(2),
    avgDcPrice: avgDcPrice.toFixed(2),
    cheapestAcOperator: cheapestAc?.name,
    cheapestAcPrice: cheapestAc?.pricing.ac,
    cheapestDcOperator: cheapestDc?.name,
    cheapestDcPrice: cheapestDc?.pricing.dcMid
  };
};