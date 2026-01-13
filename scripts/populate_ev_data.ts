import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const vehicles = [
    // TOGG
    {
        make: 'Togg', model: 'T10X', variant: 'V1 RWD (Standart Menzil)',
        year_start: 2024, year_end: null, battery_kwh: 52.4, power_hp: 218,
        torque_nm: 350, range_wltp_km: 314, consumption_kwh_100km: 16.7,
        connector_type: 'CCS', charge_ac_kw: 11, charge_dc_kw: 150,
        drive_type: 'RWD', market: 'TR', notes: '2024 teslimata başlandı'
    },
    {
        make: 'Togg', model: 'T10X', variant: 'V2 RWD (Uzun Menzil)',
        year_start: 2023, year_end: null, battery_kwh: 88.5, power_hp: 218,
        torque_nm: 350, range_wltp_km: 523, consumption_kwh_100km: 16.9,
        connector_type: 'CCS', charge_ac_kw: 11, charge_dc_kw: 150,
        drive_type: 'RWD', market: 'TR'
    },

    // TESLA
    {
        make: 'Tesla', model: 'Model Y', variant: 'RWD (Berlin)',
        year_start: 2023, year_end: null, battery_kwh: 60, battery_type: 'LFP',
        power_hp: 299, range_wltp_km: 455, consumption_kwh_100km: 13.2,
        connector_type: 'CCS', charge_dc_kw: 170, weight_kg: 1909,
        drive_type: 'RWD', market: 'TR', notes: 'HW4 otonom sürüş 2024+'
    },
    {
        make: 'Tesla', model: 'Model Y', variant: 'Long Range AWD',
        year_start: 2023, year_end: null, battery_kwh: 75, battery_type: 'NMC',
        power_hp: 514, range_wltp_km: 533, connector_type: 'CCS',
        charge_dc_kw: 250, drive_type: 'AWD', market: 'TR'
    },
    {
        make: 'Tesla', model: 'Model 3', variant: 'Highland RWD',
        year_start: 2024, year_end: null, battery_kwh: 60, range_wltp_km: 513,
        consumption_kwh_100km: 11.7, connector_type: 'CCS', charge_dc_kw: 170,
        drive_type: 'RWD', market: 'TR', notes: '0.219 Cd aerodinamik'
    },

    // BMW
    {
        make: 'BMW', model: 'i4', variant: 'eDrive30',
        year_start: 2023, year_end: null, battery_kwh: 80.7, power_hp: 218,
        range_wltp_km: 480, consumption_kwh_100km: 16.8, connector_type: 'CCS',
        charge_ac_kw: 11, charge_dc_kw: 180, weight_kg: 2125,
        drive_type: 'RWD', market: 'TR', notes: 'TR özel vergi avantajlı'
    },
    {
        make: 'BMW', model: 'iX1', variant: 'eDrive20',
        year_start: 2024, year_end: null, battery_kwh: 64.7, power_hp: 204,
        range_wltp_km: 475, connector_type: 'CCS', charge_dc_kw: 130,
        drive_type: 'RWD', market: 'TR'
    },
    {
        make: 'BMW', model: 'iX3', variant: 'LCI (Makyajlı)',
        year_start: 2022, year_end: null, battery_kwh: 74, power_hp: 286,
        range_wltp_km: 460, consumption_kwh_100km: 18.5, connector_type: 'CCS',
        drive_type: 'RWD', market: 'TR'
    },

    // MERCEDES
    {
        make: 'Mercedes-Benz', model: 'EQA', variant: '250+ (Makyajlı)',
        year_start: 2024, year_end: null, battery_kwh: 70.5, power_hp: 190,
        range_wltp_km: 560, connector_type: 'CCS', drive_type: 'FWD',
        market: 'TR', notes: 'Menzil ciddi arttı'
    },

    // RENAULT
    {
        make: 'Renault', model: 'Megane E-Tech', variant: 'Standard',
        year_start: 2023, year_end: null, battery_kwh: 60, power_hp: 220,
        range_wltp_km: 450, connector_type: 'CCS', charge_ac_kw: 22,
        charge_dc_kw: 130, drive_type: 'FWD', market: 'TR'
    },
    {
        make: 'Renault', model: 'Zoe', variant: 'R135',
        year_start: 2020, year_end: 2024, battery_kwh: 52, power_hp: 135,
        range_wltp_km: 395, connector_type: 'Type 2', charge_ac_kw: 22,
        drive_type: 'FWD', market: 'TR', notes: 'AC şarj lideri, 2024 veda'
    },

    // HYUNDAI
    {
        make: 'Hyundai', model: 'Kona Electric', variant: 'Yeni Kasa',
        year_start: 2024, year_end: null, battery_kwh: 65.4, power_hp: 218,
        range_wltp_km: 480, connector_type: 'CCS', charge_dc_kw: 102,
        drive_type: 'FWD', market: 'TR'
    },
    {
        make: 'Hyundai', model: 'Ioniq 5', variant: '72.6 kWh',
        year_start: 2022, year_end: null, battery_kwh: 72.6, power_hp: 229,
        range_wltp_km: 481, connector_type: 'CCS', charge_dc_kw: 220,
        drive_type: 'RWD', market: 'TR', notes: '800V ultra hızlı şarj'
    },

    // KIA
    {
        make: 'Kia', model: 'EV6', variant: 'Long Range RWD',
        year_start: 2022, year_end: null, battery_kwh: 77.4, power_hp: 229,
        range_wltp_km: 528, connector_type: 'CCS', charge_dc_kw: 240,
        drive_type: 'RWD', market: 'TR', notes: '800V, 18dk %10-80 şarj'
    },

    // VOLVO
    {
        make: 'Volvo', model: 'XC40 Recharge', variant: 'Single Motor (RWD)',
        year_start: 2023, year_end: null, battery_kwh: 82, power_hp: 252,
        range_wltp_km: 570, connector_type: 'CCS', charge_dc_kw: 150,
        drive_type: 'RWD', market: 'TR', notes: 'FWD→RWD, menzil 570km'
    },

    // MG
    {
        make: 'MG', model: 'ZS EV', variant: 'Makyajlı (72 kWh)',
        year_start: 2022, year_end: null, battery_kwh: 72, power_hp: 177,
        range_wltp_km: 440, connector_type: 'CCS', drive_type: 'FWD', market: 'TR'
    },
    {
        make: 'MG', model: 'MG4', variant: 'Standard Range',
        year_start: 2023, year_end: null, battery_kwh: 51, power_hp: 170,
        range_wltp_km: 350, connector_type: 'CCS', charge_dc_kw: 88,
        drive_type: 'RWD', market: 'TR', notes: '2023 Yılın Otomobili'
    },

    // BYD
    {
        make: 'BYD', model: 'Atto 3', variant: 'Standard',
        year_start: 2023, year_end: null, battery_kwh: 60.5, battery_type: 'LFP',
        power_hp: 204, range_wltp_km: 420, connector_type: 'CCS',
        drive_type: 'FWD', market: 'TR', notes: 'Patlamayan Blade Battery'
    },

    // PEUGEOT
    {
        make: 'Peugeot', model: 'e-2008', variant: '2. Nesil (2024+)',
        year_start: 2024, year_end: null, battery_kwh: 54, power_hp: 156,
        range_wltp_km: 406, connector_type: 'CCS', charge_dc_kw: 100,
        drive_type: 'FWD', market: 'TR', notes: 'Menzil iyileşti'
    },

    // OPEL
    {
        make: 'Opel', model: 'Corsa-e', variant: '2. Nesil (2024+)',
        year_start: 2024, year_end: null, battery_kwh: 54, power_hp: 156,
        range_wltp_km: 402, connector_type: 'CCS', charge_dc_kw: 100,
        drive_type: 'FWD', market: 'TR'
    },

    // CITROEN
    {
        make: 'Citroen', model: 'e-C4', variant: '2. Nesil (2024+)',
        year_start: 2024, year_end: null, battery_kwh: 54, power_hp: 156,
        range_wltp_km: 420, connector_type: 'CCS', charge_dc_kw: 100,
        drive_type: 'FWD', market: 'TR'
    },

    // FIAT
    {
        make: 'Fiat', model: '500e', variant: 'Standard',
        year_start: 2021, year_end: null, battery_kwh: 42, power_hp: 118,
        range_wltp_km: 320, connector_type: 'CCS', charge_dc_kw: 85,
        drive_type: 'FWD', market: 'TR'
    },

    // VOLKSWAGEN
    {
        make: 'Volkswagen', model: 'ID.4', variant: 'Pro',
        year_start: 2022, year_end: null, battery_kwh: 77, power_hp: 204,
        range_wltp_km: 520, connector_type: 'CCS', charge_dc_kw: 125,
        drive_type: 'RWD', market: 'TR'
    },
];

async function populateData() {
    console.log('🚗 Populating EV vehicle data...\n');

    let success = 0;
    let errors = 0;

    for (const vehicle of vehicles) {
        try {
            const { error } = await supabase
                .from('ev_vehicles')
                .insert(vehicle);

            if (error) {
                console.error(`❌ ${vehicle.make} ${vehicle.model} - ${error.message}`);
                errors++;
            } else {
                console.log(`✅ ${vehicle.make} ${vehicle.model} ${vehicle.variant || ''}`);
                success++;
            }
        } catch (err) {
            console.error(`❌ Failed: ${vehicle.make} ${vehicle.model}`);
            errors++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Success: ${success}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${vehicles.length}`);
}

populateData();
