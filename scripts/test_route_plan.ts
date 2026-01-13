async function testRoutePlan() {
    console.log('Testing Route Planning API (Istanbul → Antalya - Togg T10X V2 Uzun Menzil)...\n');

    try {
        const response = await fetch('http://localhost:3000/api/route-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vehicleId: 'ea202b6a-4ef0-4751-8f1a-fb8bb9a3ccf8',
                from: [41.0082, 28.9784], // Istanbul
                to: [36.8969, 30.7133], // Antalya
                startSoc: 80,
                minSoc: 20
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error (${response.status}):`, errorText);
            return;
        }

        const data = await response.json();
        console.log('API Result:');
        console.log(JSON.stringify(data, null, 2));

        if (data.needsCharging) {
            console.log('\n✅ Route planning successful with charging stops.');
        } else {
            console.log('\n✅ Route planning successful - no charging needed.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testRoutePlan();
