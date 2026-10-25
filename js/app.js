import { saveTrip, loadTrip, resetTrip } from './storage.js';
import { getMapsUrl } from './maps.js';
import { calculateExpenses } from './calculator.js';

// Initial State
let state = {
    tripName: '', mileage: 15, fuelPrice: 105.5,
    passengers: [], driverId: null, driverPays: true,
    stops: [], segments: [], splitMode: 'segment'
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
    btnPrint: document.getElementById('btn-print'),
    themeToggle: document.getElementById('theme-toggle')
};

function init() {
    const saved = loadTrip();
    if (saved) state = { ...state, ...saved };
    
    // Theme setup
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        ui.themeToggle.checked = true;
    }
    
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
    
    ui.themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
}

function addPassenger() {
    const name = ui.newPassengerName.value.trim();
    if (!name) return;
    const id = 'p_' + Date.now();
    state.passengers.push({ id, name });
    if (!state.driverId) state.driverId = id; 
    ui.newPassengerName.value = '';
    state.segments.forEach(seg => seg.passengers.push(id));
    render();
}

function removePassenger(id) {
    state.passengers = state.passengers.filter(p => p.id !== id);
    if (state.driverId === id) state.driverId = state.passengers.length ? state.passengers[0].id : null;
    state.segments.forEach(seg => seg.passengers = seg.passengers.filter(pId => pId !== id));
    render();
}

function setDriver(id) { state.driverId = id; render(); }

function addStop() {
    const name = ui.newStopName.value.trim();
    if (!name) return;
    state.stops.push({ id: 'stop_' + Date.now(), name });
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
        const origin = state.stops[i].name, dest = state.stops[i+1].name;
        const existing = state.segments.find(s => s.origin === origin && s.dest === dest);
        newSegments.push({
            id: `seg_${i}`, origin, dest,
            distance: existing ? existing.distance : 0,
            passengers: existing ? [...existing.passengers] : state.passengers.map(p => p.id)
        });
    }
    state.segments = newSegments;
}

function render() {
    ui.tripName.value = state.tripName;
    ui.mileage.value = state.mileage;
    ui.fuelPrice.value = state.fuelPrice;
    ui.driverPays.checked = state.driverPays;
    document.querySelector(`input[name="split-mode"][value="${state.splitMode}"]`).checked = true;

    ui.passengersList.innerHTML = state.passengers.map(p => `
        <div class="list-item">
            <div>
                <strong>${p.name}</strong> 
                ${p.id === state.driverId ? '<span class="driver-badge">Driver</span>' : ''}
            </div>
            <div style="display:flex; gap:0.5rem;">
                ${p.id !== state.driverId ? `<button class="btn btn-secondary btn-danger" style="color:var(--primary); background:var(--input-bg);" onclick="app.setDriver('${p.id}')">Make Driver</button>` : ''}
                <button class="btn btn-danger" onclick="app.removePassenger('${p.id}')">Remove</button>
            </div>
        </div>
    `).join('');

    ui.stopsList.innerHTML = state.stops.map((stop, i) => `
        <div class="list-item">
            <span style="font-weight: 500;">${i + 1}. ${stop.name}</span>
            <button class="btn btn-danger" onclick="app.removeStop(${i})">Remove</button>
        </div>
    `).join('');

    ui.segmentsList.innerHTML = state.segments.length ? state.segments.map((seg, i) => `
        <div class="segment-card">
            <div class="segment-header">
                <span>${seg.origin} ➔ ${seg.dest}</span>
                <a href="${getMapsUrl(seg.origin, seg.dest)}" target="_blank" class="maps-link">Maps ↗</a>
            </div>
            <div class="segment-actions">
                <label style="flex-grow: 1;">Distance (km)
                    <input type="number" min="0" step="0.1" value="${seg.distance}" onchange="app.updateDistance('${seg.id}', this.value)" style="margin-top: 0.25rem;">
                </label>
            </div>
            <div class="passenger-checkboxes">
                <div style="width: 100%; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase;">Passengers Travelling</div>
                ${state.passengers.map(p => `
                    <label class="checkbox-label">
                        <input type="checkbox" ${seg.passengers.includes(p.id) ? 'checked' : ''} onchange="app.toggleSegmentPassenger('${seg.id}', '${p.id}', this.checked)">
                        ${p.name}
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('') : '<p class="help-text">Add at least two stops to generate route segments.</p>';
}

window.app = {
    removePassenger, setDriver, removeStop,
    updateDistance: (segId, val) => { const seg = state.segments.find(s => s.id === segId); if (seg) seg.distance = parseFloat(val) || 0; },
    toggleSegmentPassenger: (segId, pId, isChecked) => {
        const seg = state.segments.find(s => s.id === segId);
        if (isChecked) seg.passengers.push(pId);
        else seg.passengers = seg.passengers.filter(id => id !== pId);
    }
};

function generateResults() {
    if (state.passengers.length === 0 || state.segments.length === 0) return alert("Please add passengers and route stops first.");
    
    const results = calculateExpenses(state);
    ui.resultsSection.classList.remove('hidden');
    ui.resultsSection.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('results-summary').innerHTML = `
        <div>
            <p>Total Distance <strong>${results.totalDistance.toFixed(1)} km</strong></p>
            <p>Fuel Consumed <strong>${results.totalFuel.toFixed(2)} L</strong></p>
        </div>
        <div>
            <p>Total Cost <strong>₹${results.totalCost.toFixed(2)}</strong></p>
            <p>Passengers <strong>${state.passengers.length}</strong></p>
        </div>
    `;

    document.getElementById('results-passengers').innerHTML = state.passengers.map(p => {
        const data = results.passengers[p.id];
        const pct = results.totalCost > 0 ? ((data.cost / results.totalCost) * 100).toFixed(1) : 0;
        return `
            <div class="result-row">
                <div>
                    <div style="font-weight: 600; font-size: 1.1rem;">${p.name}</div>
                    <div class="help-text" style="margin-bottom: 0; font-size: 0.85rem;">
                        ${state.splitMode === 'segment' ? `${data.distance.toFixed(1)} km (${pct}%)` : 'Equal split share'}
                    </div>
                </div>
                <div class="amount">₹${data.cost.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    document.getElementById('results-segments').innerHTML = results.segments.map((seg, i) => `
        <div class="segment-result-row">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">${seg.origin} ➔ ${seg.dest} <span style="font-weight:normal; color:var(--text-muted);">(${seg.distance} km)</span></div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="help-text" style="margin:0;">Split by ${seg.contributors.length} person(s)</div>
                <div style="font-weight:600;">₹${seg.costPerPerson.toFixed(2)} each</div>
            </div>
        </div>
    `).join('');
}

init();
