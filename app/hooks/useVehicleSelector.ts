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

    const handleYearChange = (year: string) => {
        setSelectedYear(year);
        setSelectedModel('');
    };

    const availableYears = useMemo(() => {
        if (!selectedBrand) return [];
        const brandVehicles = vehicles.filter(v => v.brand === selectedBrand);
        const years = new Set(brandVehicles.map(v => v.year).filter((y): y is string => !!y));
        if (years.size === 0) return ['2025', '2024', '2023', '2022', '2021'];
        return Array.from(years).sort().reverse();
    }, [selectedBrand]);

    const availableModels = useMemo(() => {
        if (!selectedBrand) return [];
        let filtered = vehicles.filter(v => v.brand === selectedBrand);
        if (selectedYear) {
            const yearMatch = filtered.filter(v => v.year === selectedYear);
            if (yearMatch.length > 0) filtered = yearMatch;
        }
        return filtered.map(v => v.model).filter((m): m is string => !!m);
    }, [selectedBrand, selectedYear]);

    return {
        brands,
        years: availableYears,
        models: availableModels,
        selections: {
            brand: selectedBrand,
            year: selectedYear,
            model: selectedModel,
            lang: selectedLang,  // YENİ
            sort: selectedSort   // YENİ
        },
        setters: {
            setBrand: handleBrandChange,
            setYear: handleYearChange,
            setModel: setSelectedModel,
            setLang: setSelectedLang,  // YENİ
            setSort: setSelectedSort   // YENİ
        }
    };
}