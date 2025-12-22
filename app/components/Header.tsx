"use client";

import { useState } from "react";
import { Zap, Menu, X } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="container mx-auto px-6 py-6">
      <nav className="flex items-center justify-between">
        <div className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-8 h-8 text-emerald-400" />
          Outa<span className="text-emerald-400">Charge</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-slate-300 hover:text-white transition">Özellikler</a>
          <a href="#how-it-works" className="text-slate-300 hover:text-white transition">Nasıl Çalışır</a>
          <a href="#contact" className="text-slate-300 hover:text-white transition">İletişim</a>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden sm:block bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-full font-medium transition">
            Yakında
          </button>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-slate-700">
          <div className="flex flex-col gap-4 pt-4">
            <a href="#features" className="text-slate-300 hover:text-white transition" onClick={() => setIsMenuOpen(false)}>Özellikler</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white transition" onClick={() => setIsMenuOpen(false)}>Nasıl Çalışır</a>
            <a href="#contact" className="text-slate-300 hover:text-white transition" onClick={() => setIsMenuOpen(false)}>İletişim</a>
            <button className="sm:hidden bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-full font-medium transition w-full">Yakında</button>
          </div>
        </div>
      )}
    </header>
  );
}