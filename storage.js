const STORAGE_KEY = 'tripFuelCalculatorState';

export function saveTrip(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        alert('Trip saved successfully!');
    } catch (e) {
        console.error("Local storage error:", e);
        alert('Failed to save trip. LocalStorage might be full or disabled.');
    }
}

export function loadTrip() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch (e) {
        console.error("Local storage error:", e);
    }
    return null;
}

export function resetTrip() {
    localStorage.removeItem(STORAGE_KEY);
}
