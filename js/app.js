import { saveTrip, loadTrip, resetTrip } from './storage.js';
import { getMapsUrl } from './maps.js';
import { calculateExpenses } from './calculator.js';

let state = {
    tripName: '', mileage: 15, fuelPrice: 105.5,
    passengers: [], driverId: null, driverPays: true,
    stops: [], segments: [], splitMode: 'segment'
};

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
    themeToggle: document.getElementById('theme-toggle')
};

function init() {
    const saved = loadTrip();
    if (saved) state = { ...state, ...saved };
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');
    else if (savedTheme === 'light') document.body.classList.add('light-mode');
    
    bindEvents();
    render();
}

function bindEvents() {
    ui.tripName.addEventListener('input', (e) => state.tripName = e.target.value);
    ui.mileage.addEventListener('input', (e) => state.mileage = parseFloat(e.target.value) || 1);
    ui.fuelPrice.addEventListener('input', (e) => state.fuelPrice = parseFloat(e.target.value) || 0);
    ui.driverPays.addEventListener('change', (e) => state.driverPays = e.target.checked);
    
    ui.splitModeRadios.forEach(radio => radio.addEventListener('change', (e) => state.splitMode = e.target.value));
    ui.btnAddPassenger.addEventListener('click', addPassenger);
    ui.btnAddStop.addEventListener('click', addStop);
    ui.btnCalculate.addEventListener('click', generateResults);
    
    ui.btnSave.addEventListener('click', () => saveTrip(state));
    ui.btnReset.addEventListener('click', () => {
        if (confirm('Clear all trip data? This cannot be undone.')) { resetTrip(); location.reload(); }
    });

    ui.themeToggle.addEventListener('click', () => {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentDark = document.body.classList.contains('dark-mode') || (isDark && !document.body.classList.contains('light-mode'));
        
        if (currentDark) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
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
        <div class="bar" style="margin-bottom: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--code);">
            <strong style="flex-grow:1;">${p.name} ${p.id === state.driverId ? '<span class="tag" style="margin-left:6px; color:var(--accent);">DRIVER</span>' : ''}</strong>
            ${p.id !== state.driverId ? `<button type="button" style="min-height:30px; font-size:12px; padding:0 8px;" onclick="app.setDriver('${p.id}')">Make Driver</button>` : ''}
            <button type="button" style="min-height:30px; font-size:12px; padding:0 8px; color:var(--note); border-color:var(--note);" onclick="app.removePassenger('${p.id}')">X</button>
        </div>
    `).join('');

    ui.stopsList.innerHTML = state.stops.map((stop, i) => `
        <div class="bar" style="margin-bottom: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--code);">
            <span style="flex-grow:1;"><strong>${i + 1}.</strong> ${stop.name}</span>
            <button type="button" style="min-height:30px; font-size:12px; padding:0 8px; color:var(--note); border-color:var(--note);" onclick="app.removeStop(${i})">X</button>
        </div>
    `).join('');

    ui.segmentsList.innerHTML = state.segments.length ? state.segments.map((seg, i) => `
        <div style="border: 1px solid var(--line); border-radius: 6px; padding: 12px; margin-bottom: 12px; background: var(--code);">
            <div class="bar" style="margin-bottom: 8px;">
                <h4 style="flex-grow:1; margin:0; color:var(--ink);">SEGMENT ${i+1}: ${seg.origin} ➔ ${seg.dest}</h4>
                <a href="${getMapsUrl(seg.origin, seg.dest)}" target="_blank" style="font-size:13px; font-weight:bold;">Maps ↗</a>
            </div>
            <div style="margin-bottom: 12px;">
                <label class="hint" style="display:block; margin-bottom:4px;">Distance (km)</label>
                <input type="number" min="0" step="0.1" value="${seg.distance}" onchange="app.updateDistance('${seg.id}', this.value)" style="width: 100px;">
            </div>
            <div>
                <span class="tag">Travelling:</span>
                <div class="bar" style="gap: 12px; margin-top: 6px;">
                    ${state.passengers.map(p => `
                        <label style="font-size: 14px; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                            <input type="checkbox" ${seg.passengers.includes(p.id) ? 'checked' : ''} onchange="app.toggleSegmentPassenger('${seg.id}', '${p.id}', this.checked)">
                            ${p.name}
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('') : '<p class="hint">Add at least two stops to generate route segments.</p>';
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
    
    ui.resultsSection.style.display = 'flex';
    ui.resultsSection.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('results-summary').innerHTML = `
        <div class="note">
            <h4>TRIP SUMMARY</h4>
            <div class="grid-2" style="margin-top: 8px;">
                <div><span class="hint">Total Distance:</span> <strong>${results.totalDistance.toFixed(1)} km</strong></div>
                <div><span class="hint">Fuel Consumed:</span> <strong>${results.totalFuel.toFixed(2)} L</strong></div>
                <div><span class="hint">Total Cost:</span> <strong>₹${results.totalCost.toFixed(2)}</strong></div>
                <div><span class="hint">Passengers:</span> <strong>${state.passengers.length}</strong></div>
            </div>
        </div>
    `;

    document.getElementById('results-passengers').innerHTML = state.passengers.map(p => {
        const data = results.passengers[p.id];
        const pct = results.totalCost > 0 ? ((data.cost / results.totalCost) * 100).toFixed(1) : 0;
        return `
            <div class="bar" style="border-bottom: 1px solid var(--line); padding: 12px 0;">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600; font-size: 18px;">${p.name}</div>
                    <div class="hint">${state.splitMode === 'segment' ? `Travelled ${data.distance.toFixed(1)} km (${pct}%)` : 'Equal split'}</div>
                </div>
                <div style="font-size: 20px; font-weight: bold; color: var(--accent);">₹${data.cost.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    document.getElementById('results-segments').innerHTML = results.segments.map((seg, i) => `
        <div style="padding: 10px 0; border-bottom: 1px solid var(--line);">
            <div style="font-weight: 600; margin-bottom: 4px;">Seg ${i+1}: ${seg.origin} ➔ ${seg.dest} <span class="hint" style="font-weight:normal;">(${seg.distance} km)</span></div>
            <div style="font-size: 14px;">Cost: <strong>₹${seg.cost.toFixed(2)}</strong></div>
            <div class="hint">Split between ${seg.contributors.length} person(s): ₹${seg.costPerPerson.toFixed(2)} each</div>
        </div>
    `).join('');
}

init();
