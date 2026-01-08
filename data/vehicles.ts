export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year?: string;
  batteryCapacity: number; // kWh (usable)
  maxDCPower: number; // kW
  maxACPower: number; // kW
  connectors: string[]; // desteklenen soket tipleri
  range: number; // km (WLTP)
  image?: string;

  // ===== FİZİK PARAMETRELERİ =====
  massKg: number;               // Boş kütle (kg)
  dragCoefficient: number;      // Cd (hava direnci katsayısı)
  frontalArea: number;          // A (m²) - ön kesit alanı
  rollingResistance: number;    // Crr (yuvarlanma direnci)
  drivetrainEfficiency: number; // Motor+inverter verimliliği (0.85-0.95)
  regenEfficiency: number;      // Rejeneratif frenleme verimliliği (0.60-0.75)

  // ===== TERMAL PARAMETRELERİ =====
  hvacPowerKw: number;          // Klima/ısıtma ortalama güç çekişi (kW)
  batteryHeatingKw: number;     // Batarya ısıtma gücü (kW) - soğuk havada
  optimalBatteryTempC: number;  // Optimal batarya sıcaklığı (°C)
  tempEfficiencyLoss: number;   // Her 10°C düşüşte kapasite kaybı (%)
}

// ===== ARAÇ VERİTABANI =====
// Kaynaklar: EV-Database, InsideEVs, OEM spesifikasyonları, araç test raporları

export const vehicles: Vehicle[] = [
  // ==================== TOGG ====================
  {
    id: "togg-t10x",
    brand: "TOGG",
    model: "T10X",
    batteryCapacity: 88.5,
    maxDCPower: 150,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 523,
    // Fizik
    massKg: 2130,
    dragCoefficient: 0.30,
    frontalArea: 2.65,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.68,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 5.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
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
    // Fizik
    massKg: 2250,
    dragCoefficient: 0.32,
    frontalArea: 2.70,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.89,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 3.5,
    batteryHeatingKw: 5.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
  },

  // ==================== TESLA ====================
  {
    id: "tesla-model-3",
    brand: "Tesla",
    model: "Model 3",
    batteryCapacity: 60,
    maxDCPower: 170,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2", "Tesla"],
    range: 491,
    // Fizik - Model 3 çok aerodinamik
    massKg: 1752,
    dragCoefficient: 0.23,
    frontalArea: 2.22,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.94,
    regenEfficiency: 0.72,
    // Termal - Tesla ısı pompası
    hvacPowerKw: 2.0,
    batteryHeatingKw: 6.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 6,
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
    // Fizik
    massKg: 1979,
    dragCoefficient: 0.23,
    frontalArea: 2.51,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.93,
    regenEfficiency: 0.72,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 6.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 6,
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
    // Fizik
    massKg: 2162,
    dragCoefficient: 0.208,
    frontalArea: 2.34,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.94,
    regenEfficiency: 0.73,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 7.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 5,
  },

  // ==================== BMW ====================
  {
    id: "bmw-ix",
    brand: "BMW",
    model: "iX xDrive50",
    batteryCapacity: 111.5,
    maxDCPower: 200,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 630,
    // Fizik - büyük SUV
    massKg: 2510,
    dragCoefficient: 0.25,
    frontalArea: 2.82,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.91,
    regenEfficiency: 0.68,
    // Termal
    hvacPowerKw: 3.5,
    batteryHeatingKw: 5.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 7,
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
    // Fizik - sedan
    massKg: 2050,
    dragCoefficient: 0.24,
    frontalArea: 2.41,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.92,
    regenEfficiency: 0.70,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 5.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 7,
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
    // Fizik
    massKg: 2185,
    dragCoefficient: 0.29,
    frontalArea: 2.58,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.67,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 4.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
  },

  // ==================== MERCEDES ====================
  {
    id: "mercedes-eqe",
    brand: "Mercedes",
    model: "EQE 350",
    batteryCapacity: 90,
    maxDCPower: 170,
    maxACPower: 22,
    connectors: ["CCS Type 2", "Type 2"],
    range: 654,
    // Fizik - çok aerodinamik sedan
    massKg: 2175,
    dragCoefficient: 0.22,
    frontalArea: 2.42,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.92,
    regenEfficiency: 0.70,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 5.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 7,
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
    // Fizik - dünyanın en aerodinamik seri üretim arabası
    massKg: 2480,
    dragCoefficient: 0.20,
    frontalArea: 2.51,
    rollingResistance: 0.008,
    drivetrainEfficiency: 0.93,
    regenEfficiency: 0.72,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 6.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 6,
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
    // Fizik - kompakt SUV
    massKg: 2040,
    dragCoefficient: 0.28,
    frontalArea: 2.47,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.89,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 4.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
  },

  // ==================== VOLKSWAGEN ====================
  {
    id: "vw-id4",
    brand: "Volkswagen",
    model: "ID.4",
    batteryCapacity: 77,
    maxDCPower: 135,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 520,
    // Fizik
    massKg: 2124,
    dragCoefficient: 0.28,
    frontalArea: 2.60,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 4.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
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
    // Fizik - kompakt hatchback
    massKg: 1805,
    dragCoefficient: 0.267,
    frontalArea: 2.36,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 4.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
  },

  // ==================== AUDI ====================
  {
    id: "audi-q4-etron",
    brand: "Audi",
    model: "Q4 e-tron",
    batteryCapacity: 76.6,
    maxDCPower: 135,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 520,
    // Fizik - MEB platformu
    massKg: 2135,
    dragCoefficient: 0.28,
    frontalArea: 2.56,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 4.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
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
    // Fizik - performans sedan, Taycan kardeşi
    massKg: 2347,
    dragCoefficient: 0.24,
    frontalArea: 2.35,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.91,
    regenEfficiency: 0.70,
    // Termal - 800V mimari
    hvacPowerKw: 2.5,
    batteryHeatingKw: 6.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 6,
  },

  // ==================== PORSCHE ====================
  {
    id: "porsche-taycan",
    brand: "Porsche",
    model: "Taycan",
    batteryCapacity: 93.4,
    maxDCPower: 270,
    maxACPower: 22,
    connectors: ["CCS Type 2", "Type 2"],
    range: 484,
    // Fizik - performans odaklı, 800V
    massKg: 2295,
    dragCoefficient: 0.22,
    frontalArea: 2.33,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.91,
    regenEfficiency: 0.70,
    // Termal - mükemmel termal yönetim
    hvacPowerKw: 2.5,
    batteryHeatingKw: 6.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 5,
  },

  // ==================== HYUNDAI ====================
  {
    id: "hyundai-ioniq5",
    brand: "Hyundai",
    model: "IONIQ 5",
    batteryCapacity: 77.4,
    maxDCPower: 220,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 507,
    // Fizik - E-GMP platformu, 800V
    massKg: 1985,
    dragCoefficient: 0.288,
    frontalArea: 2.64,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.92,
    regenEfficiency: 0.70,
    // Termal - ısı pompası standart
    hvacPowerKw: 2.5,
    batteryHeatingKw: 5.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 6,
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
    // Fizik - ultra aerodinamik sedan
    massKg: 1985,
    dragCoefficient: 0.21,
    frontalArea: 2.32,
    rollingResistance: 0.008,
    drivetrainEfficiency: 0.93,
    regenEfficiency: 0.72,
    // Termal
    hvacPowerKw: 2.0,
    batteryHeatingKw: 5.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 6,
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
    // Fizik - küçük SUV
    massKg: 1685,
    dragCoefficient: 0.29,
    frontalArea: 2.35,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 4.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
  },

  // ==================== KIA ====================
  {
    id: "kia-ev6",
    brand: "Kia",
    model: "EV6",
    batteryCapacity: 77.4,
    maxDCPower: 240,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 528,
    // Fizik - E-GMP, 800V
    massKg: 2055,
    dragCoefficient: 0.28,
    frontalArea: 2.58,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.92,
    regenEfficiency: 0.70,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 5.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 6,
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
    // Fizik - kompakt crossover
    massKg: 1791,
    dragCoefficient: 0.29,
    frontalArea: 2.42,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.89,
    regenEfficiency: 0.63,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 4.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
  },

  // ==================== RENAULT ====================
  {
    id: "renault-zoe",
    brand: "Renault",
    model: "Zoe",
    batteryCapacity: 52,
    maxDCPower: 50,
    maxACPower: 22,
    connectors: ["Type 2"],
    range: 395,
    // Fizik - şehir içi, hafif
    massKg: 1502,
    dragCoefficient: 0.29,
    frontalArea: 2.19,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.88,
    regenEfficiency: 0.60,
    // Termal
    hvacPowerKw: 2.0,
    batteryHeatingKw: 3.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 10,
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
    // Fizik - yeni platform
    massKg: 1624,
    dragCoefficient: 0.29,
    frontalArea: 2.38,
    rollingResistance: 0.009,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.67,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 4.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
  },

  // ==================== FIAT ====================
  {
    id: "fiat-500e",
    brand: "Fiat",
    model: "500e",
    batteryCapacity: 42,
    maxDCPower: 85,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 320,
    // Fizik - mini şehir arabası
    massKg: 1365,
    dragCoefficient: 0.31,
    frontalArea: 2.04,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.88,
    regenEfficiency: 0.60,
    // Termal
    hvacPowerKw: 2.0,
    batteryHeatingKw: 3.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 10,
  },

  // ==================== VOLVO ====================
  {
    id: "volvo-xc40",
    brand: "Volvo",
    model: "XC40 Recharge",
    batteryCapacity: 78,
    maxDCPower: 150,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 425,
    // Fizik - kompakt SUV
    massKg: 2188,
    dragCoefficient: 0.32,
    frontalArea: 2.56,
    rollingResistance: 0.011,
    drivetrainEfficiency: 0.89,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 4.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
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
    // Fizik - coupe SUV, biraz daha aerodinamik
    massKg: 2185,
    dragCoefficient: 0.30,
    frontalArea: 2.50,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.89,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 4.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
  },

  // ==================== PEUGEOT ====================
  {
    id: "peugeot-e208",
    brand: "Peugeot",
    model: "e-208",
    batteryCapacity: 50,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 362,
    // Fizik - e-CMP platformu
    massKg: 1530,
    dragCoefficient: 0.29,
    frontalArea: 2.18,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.88,
    regenEfficiency: 0.62,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 3.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
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
    // Fizik
    massKg: 1612,
    dragCoefficient: 0.31,
    frontalArea: 2.41,
    rollingResistance: 0.011,
    drivetrainEfficiency: 0.88,
    regenEfficiency: 0.62,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 3.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
  },

  // ==================== NISSAN ====================
  {
    id: "nissan-leaf",
    brand: "Nissan",
    model: "Leaf",
    batteryCapacity: 62,
    maxDCPower: 100,
    maxACPower: 6.6,
    connectors: ["CHAdeMO", "Type 2"],
    range: 385,
    // Fizik - pasif soğutma (!), eski platform
    massKg: 1670,
    dragCoefficient: 0.28,
    frontalArea: 2.42,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.88,
    regenEfficiency: 0.60,
    // Termal - ZEV AKTİF SOĞUTMA YOK
    hvacPowerKw: 3.0,
    batteryHeatingKw: 2.0, // çok zayıf
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 12, // Leaf soğukta çok kötü
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
    // Fizik - yeni platform
    massKg: 2200,
    dragCoefficient: 0.297,
    frontalArea: 2.60,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 5.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 8,
  },

  // ==================== MG ====================
  {
    id: "mg-zs-ev",
    brand: "MG",
    model: "ZS EV",
    batteryCapacity: 72.6,
    maxDCPower: 92,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 440,
    // Fizik
    massKg: 1745,
    dragCoefficient: 0.33,
    frontalArea: 2.55,
    rollingResistance: 0.011,
    drivetrainEfficiency: 0.87,
    regenEfficiency: 0.60,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 3.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 10,
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
    // Fizik - yeni platform, iyi verimlilik
    massKg: 1655,
    dragCoefficient: 0.287,
    frontalArea: 2.36,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 4.0,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
  },

  // ==================== BYD ====================
  {
    id: "byd-atto3",
    brand: "BYD",
    model: "Atto 3",
    batteryCapacity: 60.5,
    maxDCPower: 88,
    maxACPower: 7,
    connectors: ["CCS Type 2", "Type 2"],
    range: 420,
    // Fizik - Blade batarya, kompakt SUV
    massKg: 1750,
    dragCoefficient: 0.29,
    frontalArea: 2.45,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.89,
    regenEfficiency: 0.63,
    // Termal - LFP batarya (farklı karakteristik)
    hvacPowerKw: 2.5,
    batteryHeatingKw: 4.0,
    optimalBatteryTempC: 30, // LFP biraz daha yüksek optimal
    tempEfficiencyLoss: 7, // LFP soğukta NMC'den daha kötü
  },

  // ==================== SKODA ====================
  {
    id: "skoda-enyaq",
    brand: "Skoda",
    model: "Enyaq iV",
    batteryCapacity: 77,
    maxDCPower: 135,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 510,
    // Fizik - MEB platformu
    massKg: 2104,
    dragCoefficient: 0.266,
    frontalArea: 2.62,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.90,
    regenEfficiency: 0.65,
    // Termal
    hvacPowerKw: 3.0,
    batteryHeatingKw: 4.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
  },

  // ==================== OPEL ====================
  {
    id: "opel-corsa-e",
    brand: "Opel",
    model: "Corsa-e",
    batteryCapacity: 50,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 359,
    // Fizik - e-CMP
    massKg: 1530,
    dragCoefficient: 0.29,
    frontalArea: 2.13,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.88,
    regenEfficiency: 0.62,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 3.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
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
    // Fizik
    massKg: 1598,
    dragCoefficient: 0.32,
    frontalArea: 2.41,
    rollingResistance: 0.011,
    drivetrainEfficiency: 0.87,
    regenEfficiency: 0.60,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 3.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 10,
  },

  // ==================== CITROEN ====================
  {
    id: "citroen-ec4",
    brand: "Citroen",
    model: "ë-C4",
    batteryCapacity: 50,
    maxDCPower: 100,
    maxACPower: 11,
    connectors: ["CCS Type 2", "Type 2"],
    range: 354,
    // Fizik - e-CMP
    massKg: 1611,
    dragCoefficient: 0.30,
    frontalArea: 2.38,
    rollingResistance: 0.010,
    drivetrainEfficiency: 0.88,
    regenEfficiency: 0.62,
    // Termal
    hvacPowerKw: 2.5,
    batteryHeatingKw: 3.5,
    optimalBatteryTempC: 25,
    tempEfficiencyLoss: 9,
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