export function calculateExpenses(state) {
    let totalDistance = 0;
    let totalCost = 0;
    let totalFuel = 0;
    
    const passengerData = {};
    state.passengers.forEach(p => {
        passengerData[p.id] = { name: p.name, distance: 0, cost: 0, segments: [] };
    });

    const segmentsResult = [];

    state.segments.forEach(seg => {
        const dist = parseFloat(seg.distance) || 0;
        totalDistance += dist;

        const fuelUsed = dist / state.mileage;
        const segCost = fuelUsed * state.fuelPrice;
        
        totalFuel += fuelUsed;
        totalCost += segCost;

        // Determine eligible contributors
        let eligible = seg.passengers.filter(pId => {
            if (pId === state.driverId && !state.driverPays) return false;
            return true;
        });

        // Fallback if driver is excluded but no one else is in the car
        if (eligible.length === 0 && seg.passengers.length > 0) {
            eligible = seg.passengers; 
        }

        const costPerPerson = eligible.length > 0 ? segCost / eligible.length : 0;

        segmentsResult.push({
            id: seg.id,
            origin: seg.origin,
            dest: seg.dest,
            distance: dist,
            fuelUsed,
            cost: segCost,
            contributors: eligible,
            costPerPerson
        });

        if (state.splitMode === 'segment') {
            eligible.forEach(pId => {
                if(passengerData[pId]) {
                    passengerData[pId].distance += dist;
                    passengerData[pId].cost += costPerPerson;
                    passengerData[pId].segments.push({
                        origin: seg.origin, dest: seg.dest, amount: costPerPerson
                    });
                }
            });
        }
    });

    // Handle Equal Split Mode
    if (state.splitMode === 'equal') {
        const eligibleCount = state.passengers.filter(p => p.id !== state.driverId || state.driverPays).length;
        const equalCost = eligibleCount > 0 ? totalCost / eligibleCount : 0;
        
        state.passengers.forEach(p => {
            const isEligible = p.id !== state.driverId || state.driverPays;
            passengerData[p.id].cost = isEligible ? equalCost : 0;
        });
    }

    return {
        totalDistance,
        totalFuel,
        totalCost,
        passengers: passengerData,
        segments: segmentsResult
    };
}
