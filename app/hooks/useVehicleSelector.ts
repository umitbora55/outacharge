// app/hooks/useVehicleSelector.ts

import { useState, useMemo } from 'react';
import { vehicles, brands } from '@/data/vehicles';

export function useVehicleSelector() {
    const [selectedBrand, setSelectedBrand] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    // YENİ: Dil ve Sıralama state'leri eklendi
    const [selectedLang, setSelectedLang] = useState<string>('tr');
    const [selectedSort, setSelectedSort] = useState<string>('relevance');

    const handleBrandChange = (brand: string) => {
        setSelectedBrand(brand);
        setSelectedYear('');
        setSelectedModel('');
    };

    const handleModelChange = (model: string) => {
        setSelectedModel(model);
        setSelectedYear('');
    };

    const handleYearChange = (year: string) => {
        setSelectedYear(year);
    };

    const availableYears = useMemo(() => {
        if (!selectedBrand) return [];
        let filtered = vehicles.filter(v => v.brand === selectedBrand);
        if (selectedModel) {
            filtered = filtered.filter(v => v.model === selectedModel);
        }
        const years = new Set(filtered.map(v => v.year).filter((y): y is string => !!y));
        if (years.size === 0) return ['2025', '2024', '2023', '2022', '2021'];
        return Array.from(years).sort().reverse();
    }, [selectedBrand, selectedModel]);

    const availableModels = useMemo(() => {
        if (!selectedBrand) return [];
        const filtered = vehicles.filter(v => v.brand === selectedBrand);
        // Model listesi marka seçilince açılmalı, yıla göre kısıtlanmamalı (akış gereği)
        const uniqueModels = new Set(filtered.map(v => v.model).filter((m): m is string => !!m));
        return Array.from(uniqueModels).sort();
    }, [selectedBrand]);

    return {
        brands,
        years: availableYears,
        models: availableModels,
        selections: {
            brand: selectedBrand,
            year: selectedYear,
            model: selectedModel,
            lang: selectedLang,
            sort: selectedSort
        },
        setters: {
            setBrand: handleBrandChange,
            setYear: handleYearChange,
            setModel: handleModelChange,
            setLang: setSelectedLang,
            setSort: setSelectedSort
        }
    };
}