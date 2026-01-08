export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year?: string;
  batteryCapacity: number; // kWh
  maxDCPower: number; // kW
  maxACPower: number; // kW
  connectors: string[]; // desteklenen soket tipleri
  range: number; // km
  image?: string;
  massKg?: number; // kg
  regenEfficiency?: number; // 0-1
  drivetrainEfficiency?: number; // 0-1
}

export const vehicles: Vehicle[] = [
  // TOGG
  {
    id: "togg-t10x",
    brand: "TOGG",
    model: "T10X",
    batteryCapacity: 88.5,
    maxDCPower: 150,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 523,
  },
  {
    id: "togg-t10f",
    brand: "TOGG",
    model: "T10F",
    batteryCapacity: 88.5,
    maxDCPower: 150,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 350,
  },
  // Tesla
  {
    id: "tesla-model-3",
    brand: "Tesla",
    model: "Model 3",
    batteryCapacity: 60,
    maxDCPower: 170,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2", "Tesla"],
    range: 491,
  },
  {
    id: "tesla-model-y",
    brand: "Tesla",
    model: "Model Y",
    batteryCapacity: 75,
    maxDCPower: 250,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2", "Tesla"],
    range: 533,
  },
  {
    id: "tesla-model-s",
    brand: "Tesla",
    model: "Model S",
    batteryCapacity: 100,
    maxDCPower: 250,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2", "Tesla"],
    range: 652,
  },
  // BMW
  {
    id: "bmw-ix",
    brand: "BMW",
    model: "iX xDrive50",
    batteryCapacity: 111.5,
    maxDCPower: 200,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 630,
  },
  {
    id: "bmw-i4",
    brand: "BMW",
    model: "i4 eDrive40",
    batteryCapacity: 83.9,
    maxDCPower: 200,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 590,
  },
  {
    id: "bmw-ix3",
    brand: "BMW",
    model: "iX3",
    batteryCapacity: 80,
    maxDCPower: 150,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 460,
  },
  // Mercedes
  {
    id: "mercedes-eqe",
    brand: "Mercedes",
    model: "EQE 350",
    batteryCapacity: 90,
    maxDCPower: 170,
    maxACPower: 22,
    connectors: ["CCS Type 2", "Type 2"],
    range: 654,
  },
  {
    id: "mercedes-eqs",
    brand: "Mercedes",
    model: "EQS 450+",
    batteryCapacity: 107.8,
    maxDCPower: 200,
    maxACPower: 22,
    connectors: ["CCS Type 2", "Type 2"],
    range: 782,
  },
  {
    id: "mercedes-eqa",
    brand: "Mercedes",
    model: "EQA 250",
    batteryCapacity: 66.5,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 426,
  },
  // Volkswagen
  {
    id: "vw-id4",
    brand: "Volkswagen",
    model: "ID.4",
    batteryCapacity: 77,
    maxDCPower: 135,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 520,
  },
  {
    id: "vw-id3",
    brand: "Volkswagen",
    model: "ID.3",
    batteryCapacity: 58,
    maxDCPower: 120,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 426,
  },
  // Audi
  {
    id: "audi-q4-etron",
    brand: "Audi",
    model: "Q4 e-tron",
    batteryCapacity: 76.6,
    maxDCPower: 135,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 520,
  },
  {
    id: "audi-etron-gt",
    brand: "Audi",
    model: "e-tron GT",
    batteryCapacity: 93.4,
    maxDCPower: 270,
    maxACPower: 22,
    connectors: ["CCS Type 2", "Type 2"],
    range: 488,
  },
  // Porsche
  {
    id: "porsche-taycan",
    brand: "Porsche",
    model: "Taycan",
    batteryCapacity: 93.4,
    maxDCPower: 270,
    maxACPower: 22,
    connectors: ["CCS Type 2", "Type 2"],
    range: 484,
  },
  // Hyundai
  {
    id: "hyundai-ioniq5",
    brand: "Hyundai",
    model: "IONIQ 5",
    batteryCapacity: 77.4,
    maxDCPower: 220,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 507,
  },
  {
    id: "hyundai-ioniq6",
    brand: "Hyundai",
    model: "IONIQ 6",
    batteryCapacity: 77.4,
    maxDCPower: 220,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 614,
  },
  {
    id: "hyundai-kona",
    brand: "Hyundai",
    model: "Kona Electric",
    batteryCapacity: 64,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 484,
  },
  // Kia
  {
    id: "kia-ev6",
    brand: "Kia",
    model: "EV6",
    batteryCapacity: 77.4,
    maxDCPower: 240,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 528,
  },
  {
    id: "kia-niro-ev",
    brand: "Kia",
    model: "Niro EV",
    batteryCapacity: 64.8,
    maxDCPower: 80,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 463,
  },
  // Renault
  {
    id: "renault-zoe",
    brand: "Renault",
    model: "Zoe",
    batteryCapacity: 52,
    maxDCPower: 50,
    maxACPower: 22,
    connectors: ["Type 2"],
    range: 395,
  },
  {
    id: "renault-megane-e",
    brand: "Renault",
    model: "Megane E-Tech",
    batteryCapacity: 60,
    maxDCPower: 130,
    maxACPower: 22,
    connectors: ["CCS Type 2", "Type 2"],
    range: 470,
  },
  // Fiat
  {
    id: "fiat-500e",
    brand: "Fiat",
    model: "500e",
    batteryCapacity: 42,
    maxDCPower: 85,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 320,
  },
  // Volvo
  {
    id: "volvo-xc40",
    brand: "Volvo",
    model: "XC40 Recharge",
    batteryCapacity: 78,
    maxDCPower: 150,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 425,
  },
  {
    id: "volvo-c40",
    brand: "Volvo",
    model: "C40 Recharge",
    batteryCapacity: 78,
    maxDCPower: 150,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 444,
  },
  // Peugeot
  {
    id: "peugeot-e208",
    brand: "Peugeot",
    model: "e-208",
    batteryCapacity: 50,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 362,
  },
  {
    id: "peugeot-e2008",
    brand: "Peugeot",
    model: "e-2008",
    batteryCapacity: 50,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 345,
  },
  // Nissan
  {
    id: "nissan-leaf",
    brand: "Nissan",
    model: "Leaf",
    batteryCapacity: 62,
    maxDCPower: 100,
    maxACPower: 6.6,
    connectors: ["CHAdeMO", "Type 2"],
    range: 385,
  },
  {
    id: "nissan-ariya",
    brand: "Nissan",
    model: "Ariya",
    batteryCapacity: 87,
    maxDCPower: 130,
    maxACPower: 22,
    connectors: ["CCS Type 2", "Type 2"],
    range: 533,
  },
  // MG
  {
    id: "mg-zs-ev",
    brand: "MG",
    model: "ZS EV",
    batteryCapacity: 72.6,
    maxDCPower: 92,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 440,
  },
  {
    id: "mg-4",
    brand: "MG",
    model: "MG4",
    batteryCapacity: 64,
    maxDCPower: 135,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 450,
  },
  // BYD
  {
    id: "byd-atto3",
    brand: "BYD",
    model: "Atto 3",
    batteryCapacity: 60.5,
    maxDCPower: 88,
    maxACPower: 7,
    connectors: ["CCS Type 2", "Type 2"],
    range: 420,
  },
  // Skoda
  {
    id: "skoda-enyaq",
    brand: "Skoda",
    model: "Enyaq iV",
    batteryCapacity: 77,
    maxDCPower: 135,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 510,
  },
  // Opel
  {
    id: "opel-corsa-e",
    brand: "Opel",
    model: "Corsa-e",
    batteryCapacity: 50,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 359,
  },
  {
    id: "opel-mokka-e",
    brand: "Opel",
    model: "Mokka-e",
    batteryCapacity: 50,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 338,
  },
  // Citroen
  {
    id: "citroen-ec4",
    brand: "Citroen",
    model: "ë-C4",
    batteryCapacity: 50,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 354,
  },
];

// Markalara gore grupla
export const vehiclesByBrand = vehicles.reduce((acc, vehicle) => {
  if (!acc[vehicle.brand]) {
    acc[vehicle.brand] = [];
  }
  acc[vehicle.brand].push(vehicle);
  return acc;
}, {} as Record<string, Vehicle[]>);

// Marka listesi
export const brands = Object.keys(vehiclesByBrand).sort();

// Soket tipi eslestirme
export const connectorMapping: Record<string, string[]> = {
  "CCS Type 2": ["CCS Type 2", "CCS", "Combo 2", "CCS2"],
  "Type 2": ["Type 2", "Mennekes", "IEC 62196"],
  "CHAdeMO": ["CHAdeMO"],
  "Tesla": ["Tesla", "Tesla Supercharger"],
  "Type 1": ["Type 1", "J1772", "SAE J1772"],
};

// Uyumluluk hesapla
export function calculateCompatibility(
  vehicle: Vehicle,
  stationConnectors: string[],
  stationPower: number,
  stationPowerType: string
): { score: number; reasons: string[]; warnings: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Soket uyumlulugu kontrol et
  const compatibleConnectors = vehicle.connectors.filter((vc) =>
    stationConnectors.some((sc) =>
      Object.entries(connectorMapping).some(
        ([key, aliases]) =>
          (vc.includes(key) || aliases.some((a) => vc.includes(a))) &&
          (sc.includes(key) || aliases.some((a) => sc.includes(a)))
      )
    )
  );

  if (compatibleConnectors.length > 0) {
    score += 50;
    reasons.push(`Uyumlu soket: ${compatibleConnectors.join(", ")}`);
  } else {
    warnings.push("Uyumlu soket bulunamadı");
    return { score: 0, reasons, warnings };
  }

  // Guc uyumlulugu
  const maxPower = stationPowerType === "DC" ? vehicle.maxDCPower : vehicle.maxACPower;

  if (stationPower >= maxPower) {
    score += 30;
    reasons.push(`Maksimum hızda şarj (${maxPower} kW)`);
  } else if (stationPower >= maxPower * 0.5) {
    score += 20;
    reasons.push(`İyi şarj hızı (${stationPower} kW)`);
  } else {
    score += 10;
    warnings.push(`Düşük şarj hızı (${stationPower} kW, araç max: ${maxPower} kW)`);
  }

  // DC fast charging bonusu
  if (stationPowerType === "DC" && vehicle.maxDCPower > 100) {
    score += 10;
    reasons.push("Hızlı DC şarj destekli");
  }

  // AC 22kW bonusu
  if (stationPowerType === "AC" && stationPower >= 22 && vehicle.maxACPower >= 22) {
    score += 10;
    reasons.push("22 kW AC şarj destekli");
  }

  return { score: Math.min(score, 100), reasons, warnings };
}