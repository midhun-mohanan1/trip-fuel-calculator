import { saveTrip, loadTrip, resetTrip } from './storage.js';
import { getMapsUrl } from './maps.js';
import { calculateExpenses } from './calculator.js';

// Initial State
let state = {
    tripName: '',
    mileage: 15,
    fuelPrice: 105.5,
    passengers: [],
    driverId: null,
    driverPays: true,
    stops: [],
    segments: [],
    splitMode: 'segment'
};

// DOM Elements
const ui = {
    tripName: document.getElementById('trip-name'),
    mileage: document.getElementById('mileage'),
    fuelPrice: document.getElementById('fuel-price'),
    passengersList: document.getElementById('passengers-list'),
    newPassengerName: document.getElementById('new-passenger-name'),
    btnAddPassenger: document.getElementById('btn-add-passenger'),
    driverPays: document.getElementById('driver-pays'),
    stopsList: document.getElementById('stops-list'),
    newStopName: document.getElementById('new-stop-name'),
    btnAddStop: document.getElementById('btn-add-stop'),
    segmentsList: document.getElementById('segments-list'),
    btnCalculate: document.getElementById('btn-calculate'),
    resultsSection: document.getElementById('results-section'),
    splitModeRadios: document.getElementsByName('split-mode'),
    btnSave: document.getElementById('btn-save'),
    btnReset: document.getElementById('btn-reset'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnPrint: document.getElementById('btn-print')
};

// Initialization
function init() {
    const saved = loadTrip();
    if (saved) state = { ...state, ...saved };
    bindEvents();
    render();
}

function bindEvents() {
    ui.tripName.addEventListener('input', (e) => state.tripName = e.target.value);
    ui.mileage.addEventListener('input', (e) => state.mileage = parseFloat(e.target.value) || 1);
    ui.fuelPrice.addEventListener('input', (e) => state.fuelPrice = parseFloat(e.target.value) || 0);
    ui.driverPays.addEventListener('change', (e) => state.driverPays = e.target.checked);
    
    ui.splitModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => state.splitMode = e.target.value);
    });

    ui.btnAddPassenger.addEventListener('click', addPassenger);
    ui.btnAddStop.addEventListener('click', addStop);
    ui.btnCalculate.addEventListener('click', generateResults);
    
    ui.btnSave.addEventListener('click', () => saveTrip(state));
    ui.btnReset.addEventListener('click', () => {
        if (confirm('Clear all trip data? This cannot be undone.')) {
            resetTrip();
            location.reload();
        }
    });

    ui.btnPrint.addEventListener('click', () => window.print());
    ui.btnExportCsv.addEventListener('click', exportCSV);
}

// Passengers
function addPassenger() {
    const name = ui.newPassengerName.value.trim();
    if (!name) return;
    const id = 'p_' + Date.now();
    state.passengers.push({ id, name });
    if (!state.driverId) state.driverId = id; // First passenger defaults to driver
    ui.newPassengerName.value = '';
    
    // Add passenger to all existing segments by default
    state.segments.forEach(seg => seg.passengers.push(id));
    render();
}

function removePassenger(id) {
    state.passengers = state.passengers.filter(p => p.id !== id);
    if (state.driverId === id) state.driverId = state.passengers.length ? state.passengers[0].id : null;
    state.segments.forEach(seg => {
        seg.passengers = seg.passengers.filter(pId => pId !== id);
    });
    render();
}

function setDriver(id) {
    state.driverId = id;
    render();
}

// Stops & Segments
function addStop() {
    const name = ui.newStopName.value.trim();
    if (!name) return;
    const id = 'stop_' + Date.now();
    state.stops.push({ id, name });
    ui.newStopName.value = '';
    rebuildSegments();
    render();
}

function removeStop(index) {
    state.stops.splice(index, 1);
    rebuildSegments();
    render();
}

function rebuildSegments() {
    const newSegments = [];
    for (let i = 0; i < state.stops.length - 1; i++) {
        const origin = state.stops[i].name;
        const dest = state.stops[i+1].name;
        
        // Try to retain data from old segment with same origin/dest
        const existing = state.segments.find(s => s.origin === origin && s.dest === dest);
        
        newSegments.push({
            id: `seg_${i}`, origin, dest,
            distance: existing ? existing.distance : 0,
            passengers: existing ? [...existing.passengers] : state.passengers.map(p => p.id)
        });
    }
    state.segments = newSegments;
}

// Rendering
function render() {
    ui.tripName.value = state.tripName;
    ui.mileage.value = state.mileage;
    ui.fuelPrice.value = state.fuelPrice;
    ui.driverPays.checked = state.driverPays;
    
    document.querySelector(`input[name="split-mode"][value="${state.splitMode}"]`).checked = true;

    // Render Passengers
    ui.passengersList.innerHTML = state.passengers.map(p => `
        <div class="list-item">
            <div>
                <strong>${p.name}</strong> 
                ${p.id === state.driverId ? '<span class="driver-badge">Driver</span>' : ''}
            </div>
            <div>
                ${p.id !== state.driverId ? `<button class="btn btn-secondary btn-sm" onclick="app.setDriver('${p.id}')">Make Driver</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="app.removePassenger('${p.id}')">X</button>
            </div>
        </div>
    `).join('');

    // Render Stops
    ui.stopsList.innerHTML = state.stops.map((stop, i) => `
        <div class="list-item">
            <span>${i + 1}. ${stop.name}</span>
            <button class="btn btn-danger btn-sm" onclick="app.removeStop(${i})">X</button>
        </div>
    `).join('');

    // Render Segments
    ui.segmentsList.innerHTML = state.segments.length ? state.segments.map((seg, i) => `
        <div class="segment-card">
            <div class="segment-header">
                <span>Segment ${i+1}: ${seg.origin} ➔ ${seg.dest}</span>
                <a href="${getMapsUrl(seg.origin, seg.dest)}" target="_blank" class="maps-link">Check in Maps ↗</a>
            </div>
            <div class="segment-actions">
                <label>Distance (km): 
                    <input type="number" min="0" step="0.1" value="${seg.distance}" onchange="app.updateDistance('${seg.id}', this.value)">
                </label>
            </div>
            <div class="passenger-checkboxes">
                <strong>Travelling:</strong>
                ${state.passengers.map(p => `
                    <label>
                        <input type="checkbox" ${seg.passengers.includes(p.id) ? 'checked' : ''} onchange="app.toggleSegmentPassenger('${seg.id}', '${p.id}', this.checked)">
                        ${p.name}
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('') : '<p class="help-text">Add at least two stops to generate route segments.</p>';
}

// Global functions for inline HTML events
window.app = {
    removePassenger, setDriver, removeStop,
    updateDistance: (segId, val) => {
        const seg = state.segments.find(s => s.id === segId);
        if (seg) seg.distance = parseFloat(val) || 0;
    },
    toggleSegmentPassenger: (segId, pId, isChecked) => {
        const seg = state.segments.find(s => s.id === segId);
        if (isChecked) seg.passengers.push(pId);
        else seg.passengers = seg.passengers.filter(id => id !== pId);
    }
};

// Calculate and Results display
function generateResults() {
    if (state.passengers.length === 0 || state.segments.length === 0) {
        alert("Please add passengers and route stops first.");
        return;
    }
    
    const results = calculateExpenses(state);
    ui.resultsSection.classList.remove('hidden');
    ui.resultsSection.scrollIntoView({ behavior: 'smooth' });

    // Summary
    document.getElementById('results-summary').innerHTML = `
        <div>
            <p><strong>Total Distance:</strong> ${results.totalDistance.toFixed(1)} km</p>
            <p><strong>Fuel Consumed:</strong> ${results.totalFuel.toFixed(2)} L</p>
        </div>
        <div>
            <p><strong>Total Cost:</strong> ₹${results.totalCost.toFixed(2)}</p>
            <p><strong>Passengers:</strong> ${state.passengers.length}</p>
        </div>
    `;

    // Per Person
    document.getElementById('results-passengers').innerHTML = state.passengers.map(p => {
        const data = results.passengers[p.id];
        const pct = results.totalCost > 0 ? ((data.cost / results.totalCost) * 100).toFixed(1) : 0;
        return `
            <div class="result-row">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${p.name}</strong>
                    <span class="amount">₹${data.cost.toFixed(2)}</span>
                </div>
                <div class="help-text">
                    ${state.splitMode === 'segment' ? `Travelled ${data.distance.toFixed(1)} km (${pct}% of total)` : 'Equal split share'}
                </div>
            </div>
        `;
    }).join('');

    // Segment Breakdown
    document.getElementById('results-segments').innerHTML = results.segments.map((seg, i) => `
        <div class="result-row">
            <strong>Seg ${i+1}: ${seg.origin} ➔ ${seg.dest}</strong> (${seg.distance} km)
            <div>Segment Cost: ₹${seg.cost.toFixed(2)}</div>
            <div class="help-text">Split between ${seg.contributors.length} person(s): ₹${seg.costPerPerson.toFixed(2)} each</div>
        </div>
    `).join('');
}

// CSV Export
function exportCSV() {
    const results = calculateExpenses(state);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Passenger,Total Distance (km),Amount Owed (INR)\n";
    state.passengers.forEach(p => {
        const data = results.passengers[p.id];
        csvContent += `"${p.name}",${data.distance},${data.cost.toFixed(2)}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trip_expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Start app
init();

// Theme Toggle Logic
const themeToggle = document.getElementById('theme-toggle');

// Check for saved theme on load
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️ Light Mode';
}

// Toggle on click
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    
    themeToggle.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
