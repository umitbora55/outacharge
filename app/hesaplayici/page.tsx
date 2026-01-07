"use client";

import { useState, useMemo } from "react";
import { Zap, Calculator, Car, Battery, TrendingDown, ChevronDown, Info } from "lucide-react";
import HeaderWhite from "../components/HeaderWhite";
import { operators, compareAllOperators, calculateHomeChargingCost, getOperatorStats, ChargeType } from "@/data/operators";
import { vehiclesByBrand, brands, Vehicle } from "@/data/vehicles";

export default function HesaplayiciPage() {
  // Vehicle selection
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Charge parameters
  const [currentCharge, setCurrentCharge] = useState(20);
  const [targetCharge, setTargetCharge] = useState(80);
  const [chargeType, setChargeType] = useState<ChargeType>("dcMid");
  const [isTeslaOwner, setIsTeslaOwner] = useState(false);

  // Calculate kWh needed
  const kWhNeeded = useMemo(() => {
    if (!selectedVehicle) return 0;
    const chargePercent = (targetCharge - currentCharge) / 100;
    return selectedVehicle.batteryCapacity * chargePercent;
  }, [selectedVehicle, currentCharge, targetCharge]);

  // Get comparison results
  const comparisonResults = useMemo(() => {
    if (kWhNeeded <= 0) return [];
    return compareAllOperators(chargeType, kWhNeeded, isTeslaOwner);
  }, [chargeType, kWhNeeded, isTeslaOwner]);

  // Home charging cost
  const homeChargingCost = useMemo(() => {
    return calculateHomeChargingCost(kWhNeeded);
  }, [kWhNeeded]);

  // Stats
  const stats = getOperatorStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWhite />

      <main className="pt-8 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Şarj Ücreti Hesaplayıcı</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
              Şarj Maliyetinizi Hesaplayın
            </h1>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Aracınızı seçin, şarj seviyesini belirleyin ve tüm operatörlerin fiyatlarını karşılaştırın.
              En uygun şarj noktasını bulun, tasarruf edin.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.totalOperators}</div>
              <div className="text-gray-500 text-sm">Operatör</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{(stats.totalStations / 1000).toFixed(1)}K+</div>
              <div className="text-gray-500 text-sm">İstasyon</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.cheapestAcPrice} ₺</div>
              <div className="text-gray-500 text-sm">En Ucuz AC</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.cheapestDcPrice} ₺</div>
              <div className="text-gray-500 text-sm">En Ucuz DC</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Input Form */}
            <div className="lg:col-span-1 space-y-6">
              {/* Vehicle Selection */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-zinc-900 font-semibold mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-400" />
                  Araç Seçimi
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-500 text-sm mb-2">Marka</label>
                    <div className="relative">
                      <select
                        value={selectedBrand}
                        onChange={(e) => {
                          setSelectedBrand(e.target.value);
                          setSelectedVehicle(null);
                        }}
                        className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        <option value="">Marka seçin</option>
                        {brands.map((brand) => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {selectedBrand && (
                    <div>
                      <label className="block text-gray-500 text-sm mb-2">Model</label>
                      <div className="relative">
                        <select
                          value={selectedVehicle?.id || ""}
                          onChange={(e) => {
                            const vehicle = vehiclesByBrand[selectedBrand]?.find(v => v.id === e.target.value);
                            setSelectedVehicle(vehicle || null);
                            if (vehicle?.brand === "Tesla") {
                              setIsTeslaOwner(true);
                            }
                          }}
                          className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          <option value="">Model seçin</option>
                          {vehiclesByBrand[selectedBrand]?.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.model} ({vehicle.batteryCapacity} kWh)
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {selectedVehicle && (
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="text-zinc-900 font-medium mb-2">{selectedVehicle.brand} {selectedVehicle.model}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Batarya: <span className="text-zinc-900">{selectedVehicle.batteryCapacity} kWh</span></div>
                        <div className="text-gray-500">Menzil: <span className="text-zinc-900">{selectedVehicle.range} km</span></div>
                        <div className="text-gray-500">Max DC: <span className="text-zinc-900">{selectedVehicle.maxDCPower} kW</span></div>
                        <div className="text-gray-500">Max AC: <span className="text-zinc-900">{selectedVehicle.maxACPower} kW</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Charge Level */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-zinc-900 font-semibold mb-4 flex items-center gap-2">
                  <Battery className="w-5 h-5 text-emerald-400" />
                  Şarj Seviyesi
                </h3>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-gray-500 text-sm">Mevcut Şarj</label>
                      <span className="text-emerald-400 font-medium">{currentCharge}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={currentCharge}
                      onChange={(e) => setCurrentCharge(Number(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-gray-500 text-sm">Hedef Şarj</label>
                      <span className="text-emerald-400 font-medium">{targetCharge}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={targetCharge}
                      onChange={(e) => setTargetCharge(Number(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {selectedVehicle && kWhNeeded > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                      <div className="text-emerald-400 text-2xl font-bold">{kWhNeeded.toFixed(1)} kWh</div>
                      <div className="text-gray-500 text-sm">Şarj edilecek enerji</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Charge Type */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-zinc-900 font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Şarj Tipi
                </h3>

                <div className="space-y-2">
                  {[
                    { value: "ac", label: "AC (≤22 kW)", desc: "Yavaş şarj, ev/iş yeri" },
                    { value: "dcLow", label: "DC (<100 kW)", desc: "Hızlı şarj" },
                    { value: "dcMid", label: "DC (100-180 kW)", desc: "Çok hızlı şarj" },
                    { value: "dcHigh", label: "DC (>180 kW)", desc: "Ultra hızlı şarj" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setChargeType(type.value as ChargeType)}
                      className={`w-full p-3 rounded-lg text-left transition ${chargeType === type.value
                        ? "bg-emerald-500 text-zinc-900"
                        : "bg-gray-100 text-zinc-900 hover:bg-slate-600"
                        }`}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className={`text-sm ${chargeType === type.value ? "text-emerald-100" : "text-gray-500"}`}>
                        {type.desc}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedBrand === "Tesla" && (
                  <label className="flex items-center gap-3 mt-4 p-3 bg-gray-100 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTeslaOwner}
                      onChange={(e) => setIsTeslaOwner(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-400"
                    />
                    <div>
                      <div className="text-zinc-900 text-sm font-medium">Tesla sahibiyim</div>
                      <div className="text-gray-500 text-xs">Supercharger&apos;da indirimli fiyat</div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Price Comparison */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-zinc-900 font-semibold mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                  Fiyat Karşılaştırması
                  {comparisonResults.length > 0 && (
                    <span className="text-gray-500 text-sm font-normal ml-2">
                      ({kWhNeeded.toFixed(1)} kWh için)
                    </span>
                  )}
                </h3>

                {!selectedVehicle ? (
                  <div className="text-center py-12 text-gray-500">
                    <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Fiyatları görmek için araç seçin</p>
                  </div>
                ) : kWhNeeded <= 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Battery className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Şarj seviyesini ayarlayın</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comparisonResults.map((result, index) => (
                      <div
                        key={result.operator.id}
                        className={`flex items-center justify-between p-4 rounded-xl transition ${index === 0
                          ? "bg-emerald-500/20 border border-emerald-500/30"
                          : "bg-gray-100 hover:bg-gray-100"
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 font-bold text-sm"
                            style={{ backgroundColor: result.operator.color }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-zinc-900 font-medium flex items-center gap-2">
                              {result.operator.name}
                              {index === 0 && (
                                <span className="text-xs bg-emerald-500 text-zinc-900 px-2 py-0.5 rounded-full">
                                  En Ucuz
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 text-sm">
                              {result.pricePerKwh.toFixed(2)} ₺/kWh
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${index === 0 ? "text-emerald-400" : "text-zinc-900"}`}>
                            {result.cost.toFixed(2)} ₺
                          </div>
                          {index > 0 && comparisonResults[0] && (
                            <div className="text-red-400 text-sm">
                              +{(result.cost - comparisonResults[0].cost).toFixed(2)} ₺
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Home Charging */}
              {selectedVehicle && kWhNeeded > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-zinc-900 font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    Evde Şarj Maliyeti
                    <span className="text-gray-500 text-sm font-normal ml-2">
                      (Konut elektrik tarifesi)
                    </span>
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                      <div className="text-blue-400 text-sm mb-1">Gece (22:00-06:00)</div>
                      <div className="text-zinc-900 text-xl font-bold">{homeChargingCost.nightCost.toFixed(2)} ₺</div>
                      <div className="text-gray-500 text-xs">2.10 ₺/kWh</div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                      <div className="text-yellow-400 text-sm mb-1">Gündüz (06:00-17:00)</div>
                      <div className="text-zinc-900 text-xl font-bold">{homeChargingCost.daytimeCost.toFixed(2)} ₺</div>
                      <div className="text-gray-500 text-xs">4.20 ₺/kWh</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                      <div className="text-red-400 text-sm mb-1">Puant (17:00-22:00)</div>
                      <div className="text-zinc-900 text-xl font-bold">{homeChargingCost.peakCost.toFixed(2)} ₺</div>
                      <div className="text-gray-500 text-xs">6.50 ₺/kWh</div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <Info className="w-4 h-4" />
                      <span className="text-sm font-medium">Tasarruf İpucu</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Gece tarifesinde şarj ederek halka açık istasyonlara göre{" "}
                      <span className="text-emerald-400 font-medium">
                        {comparisonResults[0] ? ((comparisonResults[0].cost - homeChargingCost.nightCost).toFixed(2)) : "0"} ₺
                      </span>{" "}
                      tasarruf edebilirsiniz!
                    </p>
                  </div>
                </div>
              )}



              {/* All Operators */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-zinc-900 font-semibold mb-4">Tüm Operatörler ve Fiyatları</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-gray-500 py-3 px-2">Operatör</th>
                        <th className="text-center text-gray-500 py-3 px-2">AC</th>
                        <th className="text-center text-gray-500 py-3 px-2">DC &lt;100kW</th>
                        <th className="text-center text-gray-500 py-3 px-2">DC 100-180kW</th>
                        <th className="text-center text-gray-500 py-3 px-2">DC &gt;180kW</th>
                        <th className="text-center text-gray-500 py-3 px-2">İstasyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operators.map((op) => (
                        <tr key={op.id} className="border-b border-gray-200 hover:bg-gray-100/30">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: op.color }}
                              />
                              <span className="text-zinc-900 font-medium">{op.name}</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2 text-gray-600">
                            {op.pricing.ac ? `${op.pricing.ac} ₺` : "-"}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-600">
                            {op.pricing.dcLow ? `${op.pricing.dcLow} ₺` : "-"}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-600">
                            {op.pricing.dcMid ? `${op.pricing.dcMid} ₺` : "-"}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-600">
                            {op.pricing.dcHigh ? `${op.pricing.dcHigh} ₺` : "-"}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-500">
                            {op.stationCount}+
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-gray-400 text-xs mt-4">
                  * Fiyatlar Aralık 2025 itibarıyla günceldir. Operatörler fiyatları değiştirebilir.
                  Güncel fiyatlar için operatör uygulamalarını kontrol edin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="container mx-auto text-center text-gray-400 text-sm">
          © 2025 OutaCharge. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}