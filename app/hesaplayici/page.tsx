// app/hesaplayici/page.tsx
"use client";

import { useState, useMemo } from "react";
import { Zap, Calculator, Car, Battery, TrendingDown, ChevronRight, Info, Search, Cpu } from "lucide-react";
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
    const chargePercent = Math.max(0, (targetCharge - currentCharge) / 100);
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

  const stats = getOperatorStats();

  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] transition-colors duration-1000 selection:bg-red-500/30 font-sans text-zinc-900 dark:text-white">
      <HeaderWhite />

      {/* Understated Calculator Hero - Minimalist Luxury */}
      <div className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("/images/calculator-hero.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px]" />
        </div>

        <div className="container max-w-6xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 mb-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
              <span className="text-zinc-500 text-[10px] font-bold tracking-[0.5em] uppercase">Efficiency & Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tight mb-6 leading-tight opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
              Maliyet <br />
              <span className="font-medium">Hesaplayıcı.</span>
            </h1>
            <p className="text-zinc-500 max-w-md text-lg font-light leading-relaxed mb-12 opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards]">
              Aracınızı seçin, şarj seviyesini belirleyin ve tüm Türkiye operatörleri arasında en verimli noktayı saniyeler içinde belirleyin.
            </p>

            {/* Integrated Stats - Mirroring Incelemeler layout */}
            <div className="flex items-center gap-16 opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                  {stats.totalOperators}
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  Active Entities
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                  {stats.cheapestDcPrice} <span className="text-xs opacity-30">₺</span>
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  Floor DC Rate
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                  {stats.cheapestAcPrice} <span className="text-xs opacity-30">₺</span>
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  Floor AC Rate
                </span>
              </div>
            </div>
          </div>
        </div>
      </div> {/* End of Hero section */}

      <main className="container max-w-6xl mx-auto px-6 pb-32 relative z-20">
        <div className="pt-20 pb-16">
          <div className="grid lg:grid-cols-12 gap-16">
            {/* Left: Input Directives */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-16">

              {/* Directive: Identifier */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 pl-1">
                  <Cpu className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Vehicle Identifier</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Brand</span>
                    <div className="relative border-b border-zinc-200 dark:border-zinc-800 focus-within:border-white transition-colors">
                      <select
                        value={selectedBrand}
                        onChange={(e) => {
                          setSelectedBrand(e.target.value);
                          setSelectedVehicle(null);
                        }}
                        className="w-full py-4 bg-transparent text-zinc-900 dark:text-white appearance-none focus:outline-none text-base font-medium cursor-pointer"
                      >
                        <option value="">Select Brand</option>
                        {brands.map((brand) => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 rotate-90" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Model</span>
                    <div className="relative border-b border-zinc-200 dark:border-zinc-800 focus-within:border-white transition-colors">
                      <select
                        value={selectedVehicle?.id || ""}
                        disabled={!selectedBrand}
                        onChange={(e) => {
                          const vehicle = vehiclesByBrand[selectedBrand]?.find(v => v.id === e.target.value);
                          setSelectedVehicle(vehicle || null);
                          if (vehicle?.brand === "Tesla") setIsTeslaOwner(true);
                        }}
                        className="w-full py-4 bg-transparent text-zinc-900 dark:text-white appearance-none focus:outline-none text-base font-medium cursor-pointer disabled:opacity-20"
                      >
                        <option value="">{selectedBrand ? "Select Model" : "Awaiting"}</option>
                        {vehiclesByBrand[selectedBrand]?.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>{vehicle.model}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 rotate-90" />
                    </div>
                  </div>
                </div>

                {selectedVehicle && (
                  <div className="p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-900 transition-all duration-500 animate-in fade-in slide-in-from-top-2">
                    <div className="text-[13px] font-semibold text-zinc-900 dark:text-white mb-4 uppercase tracking-wider">{selectedVehicle.brand} {selectedVehicle.model}</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div className="flex flex-col border-l border-zinc-200 dark:border-zinc-800 pl-4">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Battery</span>
                        <span className="text-[13px] text-zinc-900 dark:text-zinc-300 font-medium">{selectedVehicle.batteryCapacity} kWh</span>
                      </div>
                      <div className="flex flex-col border-l border-zinc-200 dark:border-zinc-800 pl-4">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Range</span>
                        <span className="text-[13px] text-zinc-900 dark:text-zinc-300 font-medium">{selectedVehicle.range} km</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Directive: Charge Parameters */}
              <div className="space-y-12">
                <div className="flex items-center gap-4 pl-1">
                  <Battery className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Charge Parameters</h3>
                </div>

                <div className="space-y-12">
                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Start Depth / {currentCharge}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={currentCharge}
                      onChange={(e) => setCurrentCharge(Number(e.target.value))}
                      className="w-full h-[2px] bg-zinc-100 dark:bg-zinc-900 appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Target Depth / {targetCharge}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={targetCharge}
                      onChange={(e) => setTargetCharge(Number(e.target.value))}
                      className="w-full h-[2px] bg-zinc-100 dark:bg-zinc-900 appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                    />
                  </div>

                  {selectedVehicle && kWhNeeded > 0 && (
                    <div className="flex items-center justify-between py-6 border-y border-zinc-100 dark:border-zinc-900">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Energy Payload</span>
                      <span className="text-3xl font-light text-emerald-500 tracking-tight">{kWhNeeded.toFixed(1)} <span className="text-xs uppercase font-bold tracking-widest opacity-50">kWh</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Directive: Technology Tier */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 pl-1">
                  <Zap className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Charge Technology</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: "ac", label: "AC Standard", desc: "≤22 kW" },
                    { value: "dcLow", label: "DC Legacy", desc: "<100 kW" },
                    { value: "dcMid", label: "DC Express", desc: "100-180 kW" },
                    { value: "dcHigh", label: "DC Ultra", desc: ">180 kW" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setChargeType(type.value as ChargeType)}
                      className={`p-4 rounded-xl text-left border transition-all duration-300 ${chargeType === type.value
                        ? "bg-zinc-950 dark:bg-white text-white dark:text-black border-transparent shadow-xl"
                        : "bg-transparent border-zinc-100 dark:border-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                        }`}
                    >
                      <div className="text-[12px] font-bold uppercase tracking-wider mb-1">{type.label}</div>
                      <div className={`text-[11px] ${chargeType === type.value ? "opacity-50" : "opacity-40"}`}>{type.desc}</div>
                    </button>
                  ))}
                </div>

                {selectedBrand === "Tesla" && (
                  <button
                    onClick={() => setIsTeslaOwner(!isTeslaOwner)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${isTeslaOwner
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-transparent border-zinc-100 dark:border-zinc-900 text-zinc-500"
                      }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-widest">Tesla Privileges</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors duration-500 ${isTeslaOwner ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"}`}>
                      <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all duration-500 ${isTeslaOwner ? "left-5" : "left-1"}`} />
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Results Dashboard */}
            <div className="lg:col-span-12 xl:col-span-7 space-y-12">

              {/* Price Index Heading */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <TrendingDown className="w-5 h-5 text-zinc-900 dark:text-white" />
                  <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white tracking-tight">Price Index</h3>
                </div>
                {comparisonResults.length > 0 && (
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Comparative Analysis</span>
                )}
              </div>

              {!selectedVehicle ? (
                <div className="aspect-[4/3] flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-zinc-50 dark:border-zinc-950 group">
                  <Search className="w-8 h-8 text-zinc-100 dark:text-zinc-900 mb-6 group-hover:scale-110 transition-transform duration-500" />
                  <p className="text-[13px] font-medium text-zinc-300 dark:text-zinc-800 tracking-wider">AWAITING IDENTIFIER</p>
                </div>
              ) : kWhNeeded <= 0 ? (
                <div className="aspect-[4/3] flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-zinc-50 dark:border-zinc-950 group">
                  <Battery className="w-8 h-8 text-zinc-100 dark:text-zinc-900 mb-6 group-hover:scale-110 transition-transform duration-500" />
                  <p className="text-[13px] font-medium text-zinc-300 dark:text-zinc-800 tracking-wider">AWAITING PARAMETERS</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comparisonResults.map((result, index) => (
                    <div
                      key={result.operator.id}
                      className={`group relative flex items-center justify-between p-8 rounded-[32px] transition-all duration-500 ${index === 0
                        ? "bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-900 shadow-2xl shadow-zinc-200/5 dark:shadow-none"
                        : "bg-transparent border border-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20"
                        }`}
                    >
                      <div className="flex items-center gap-8">
                        <div className="relative">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[13px] font-bold shadow-lg ring-4 ring-white dark:ring-[#000000]"
                            style={{ backgroundColor: result.operator.color }}
                          >
                            {(index + 1).toString().padStart(2, '0')}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white dark:border-[#000000]">
                              <TrendingDown className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[17px] font-semibold text-zinc-900 dark:text-white tracking-tight">{result.operator.name}</span>
                            {index === 0 && (
                              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/20">
                                Best Value
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-zinc-400">{result.pricePerKwh.toFixed(2)}</span>
                            <span className="text-[10px] uppercase font-bold text-zinc-300 dark:text-zinc-700 tracking-widest">₺/kWh</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-4xl font-light tracking-tighter ${index === 0 ? "text-emerald-500" : "text-zinc-900 dark:text-white"}`}>
                          {result.cost.toFixed(2)} <span className="text-sm font-bold opacity-30 tracking-widest">₺</span>
                        </div>
                        {index > 0 && comparisonResults[0] && (
                          <div className="text-[11px] font-bold text-zinc-300 dark:text-zinc-700 mt-1 uppercase tracking-widest flex items-center justify-end gap-1">
                            Diff <span className="text-zinc-400">+{(result.cost - comparisonResults[0].cost).toFixed(2)} ₺</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Home Charging Intelligence */}
                  <div className="mt-16 p-10 rounded-[40px] bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-900 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-blue-500" />
                      </div>
                      <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white tracking-tight">Residential Intelligence</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-4">Nocturnal (22-06)</span>
                        <div className="text-3xl font-light text-zinc-900 dark:text-white">{homeChargingCost.nightCost.toFixed(1)} <span className="text-xs opacity-30 uppercase font-bold">₺</span></div>
                        <div className="text-[11px] font-medium text-zinc-400">Tariff 2.10 ₺/kWh</div>
                      </div>
                      <div className="space-y-2 md:border-l border-zinc-200 dark:border-zinc-800 md:pl-8">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-4">Diurnal (06-17)</span>
                        <div className="text-3xl font-light text-zinc-900 dark:text-white">{homeChargingCost.daytimeCost.toFixed(1)} <span className="text-xs opacity-30 uppercase font-bold">₺</span></div>
                        <div className="text-[11px] font-medium text-zinc-400">Tariff 4.20 ₺/kWh</div>
                      </div>
                      <div className="space-y-2 md:border-l border-zinc-200 dark:border-zinc-800 md:pl-8">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-4">Peak (17-22)</span>
                        <div className="text-3xl font-light text-zinc-900 dark:text-white">{homeChargingCost.peakCost.toFixed(1)} <span className="text-xs opacity-30 uppercase font-bold">₺</span></div>
                        <div className="text-[11px] font-medium text-zinc-400">Tariff 6.50 ₺/kWh</div>
                      </div>
                    </div>

                    <div className="mt-10 pt-10 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-900 flex items-start gap-4">
                        <Info className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-600">
                          Gece tarifesinde şarj ederek ticari istasyonlara kıyasla yaklaşık
                          <span className="text-emerald-500 font-bold mx-1">
                            {comparisonResults[0] ? ((comparisonResults[0].cost - homeChargingCost.nightCost).toFixed(0)) : "0"} ₺
                          </span>
                          tasarruf sağlayabilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-48 flex flex-col items-center">
          <div className="h-px w-24 bg-zinc-100 dark:bg-zinc-950" />
          <p className="text-zinc-100 dark:text-zinc-950/20 text-[10vw] font-black leading-none select-none tracking-tighter mt-12">
            INTEL
          </p>
        </div>
      </main>

      {/* Global Price Ledger */}
      <section className="container max-w-6xl mx-auto px-6 pb-40">
        <div className="flex items-center justify-between mb-12">
          <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white tracking-tight">Technical Ledger</h3>
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Global Operator Index</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-900">
                <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-6 px-4">Operator</th>
                <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-6 px-4">AC Std</th>
                <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-6 px-4">DC Legacy</th>
                <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-6 px-4">DC Express</th>
                <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-6 px-4">DC Ultra</th>
                <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-6 px-4">Node Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900/30">
              {operators.map((op) => (
                <tr key={op.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: op.color }} />
                      <span className="text-[14px] font-medium text-zinc-900 dark:text-white tracking-tight">{op.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-6 px-4 text-[13px] font-medium text-zinc-500 dark:text-zinc-500">
                    {op.pricing.ac ? `${op.pricing.ac.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="text-right py-6 px-4 text-[13px] font-medium text-zinc-500 dark:text-zinc-500">
                    {op.pricing.dcLow ? `${op.pricing.dcLow.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="text-right py-6 px-4 text-[13px] font-medium text-zinc-500 dark:text-zinc-500">
                    {op.pricing.dcMid ? `${op.pricing.dcMid.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="text-right py-6 px-4 text-[13px] font-medium text-zinc-500 dark:text-zinc-500">
                    {op.pricing.dcHigh ? `${op.pricing.dcHigh.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="text-right py-6 px-4">
                    <span className="text-[11px] font-bold text-zinc-200 dark:text-zinc-800 uppercase tracking-tighter">{op.stationCount}+ Node</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex items-center gap-3 text-zinc-500">
          <Info className="w-3 h-3" />
          <p className="text-[11px] tracking-wide uppercase font-bold opacity-30">
            * December 2025 Ledger Data. Commercial entities may adjust pricing autonomously.
          </p>
        </div>
      </section>
    </div>
  );
}