const today = new Date().toISOString().split('T')[0];
document.getElementById('currentDate').innerText = new Date().toDateString();

// Data & ID Logic (5-digit IDs starting at 10001)
let habitConfig = JSON.parse(localStorage.getItem('habitConfig')) || [];
let moodConfig = JSON.parse(localStorage.getItem('moodNames')) || ["Terrible", "Bad", "Neutral", "Good", "Wonderful"];
let dailyData = JSON.parse(localStorage.getItem('trackerData')) || {};
let nextToggleId = parseInt(localStorage.getItem('nextToggleId')) || 10001;
let editingNoteIndex = null;
let currentDiaryPage = 0;

// Mood quotes
const moodQuotes = [
    "When the day is dark and the future is gloomy...",
    "Struggles weigh heavy, but hope flickers...",
    "A routine day, steady and predictable...",
    "Good vibes flow, things are looking up...",
    "Pure joy, everything feels possible..."
];

if (!dailyData[today]) {
    dailyData[today] = { habits: {}, habitTimestamps: {}, notes: [], noteTimestamps: [], mood: null, isLocked: false };
}

// Global UI State
let tempStateConfig = [
    { name: "Off", color: "#000000" },
    { name: "On", color: "#ffffff" }
];
let currentSelectedEmoji = "🔹";
let currentSelectedType = "states";
let rangeMin = 0;
let rangeMax = 100;

// Counter gradient + default behavior
const COUNTER_COLOR_OPTIONS = [
    { name: 'red', value: '#ff0000' },
    { name: 'orange', value: '#ff7a00' },
    { name: 'yellow', value: '#ffd400' },
    { name: 'green', value: '#00c853' },
    { name: 'blue', value: '#2979ff' },
    { name: 'indigo', value: '#3f51b5' },
    { name: 'purple', value: '#9c27b0' },
    { name: 'violet', value: '#7f00ff' },
    { name: 'pink', value: '#ff3d8d' },
    { name: 'brown', value: '#8d6e63' },
    { name: 'turquoise', value: '#00bcd4' },
    { name: 'black', value: '#000000' },
    { name: 'grey', value: '#808080' },
    { name: 'white', value: '#ffffff' }
];

let counterMinColor = '#000000';
let counterMaxColor = '#ffffff';
let counterDefaultToMin = true;

// Custom value toggle state
let customCardColor = '#2a2a2a';
let customInputType = 'number'; // 'number' | 'text' | 'both'

// const moodStyles = [
//     { bg: "#000000", color: "#dc3545" },
//     { bg: "#722f37", color: "#000000" },
//     { bg: "#006400", color: "#ffffff" },
//     { bg: "#008080", color: "#ffffff" },
//     { bg: "#FFD700", color: "#4B0082" }
// ];

// Mood slider colors (changes based on selected mood)
const moodSliderColors = [
    "#dc2626", // Red for Terrible
    "#f97316", // Orange for Bad
    "#506e99", // Gray for Neutral
    "#10b981", // Green for Good
    "#fbbf24"  // Golden for Wonderful
];

function init() {
    renderHabits();
    renderMoodBar();
    renderEmojiPicker();
    renderStateInputs();
    renderMoodSettings();
    renderDiarySection();
    updateUI();
    initRangeSlider();
    initCounterColorBars();
    renderYesterdayMessage();
    setupCharCounter();
    initClock();
    // Default: tray hidden; bookmark shown
    closeControlTray(true);
}

// --- Control Tray ---
function toggleControlTray(forceState) {
    const tray = document.getElementById('controlTray');
    if (!tray) return;
    if (typeof forceState === 'boolean') {
        tray.classList.toggle('open', forceState);
        return;
    }
    tray.classList.toggle('open');
}

function setTrayBookmarkVisible(isVisible){
    const bm = document.getElementById('trayBookmark');
    if (!bm) return;
    bm.classList.toggle('hidden', !isVisible);
}

function openControlTray(){
    toggleControlTray(true);
    setTrayBookmarkVisible(false);
}

function closeControlTray(silent){
    toggleControlTray(false);
    setTrayBookmarkVisible(true);
    if (!silent) closeAllPanels();
}

// --- Clock Logic ---
class BouncyBlockClock {
    constructor(qs) {
        this.el = document.querySelector(qs);
        this.time = { a: [], b: [] };
        this.rollClass = "clock__block--bounce";
        this.digitsTimeout = null;
        this.rollTimeout = null;
        this.mod = 0 * 60 * 1000;
        this.loop();
    }
    
    animateDigits() {
        const groups = this.el.querySelectorAll("[data-time-group]");
        Array.from(groups).forEach((group, i) => {
            const { a, b } = this.time;
            if (a[i] !== b[i]) group.classList.add(this.rollClass);
        });
        clearTimeout(this.rollTimeout);
        this.rollTimeout = setTimeout(this.removeAnimations.bind(this), 900);
    }
    
    displayTime() {
        const timeDigits = [...this.time.b];
        const ap = timeDigits.pop();
        this.el.ariaLabel = `${timeDigits.join(":")} ${ap}`;
        
        Object.keys(this.time).forEach(letter => {
            const letterEls = this.el.querySelectorAll(`[data-time="${letter}"]`);
            Array.from(letterEls).forEach((el, i) => {
                el.textContent = this.time[letter][i];
            });
        });
    }
    
    loop() {
        this.updateTime();
        this.displayTime();
        this.animateDigits();
        this.tick();
    }
    
    removeAnimations() {
        const groups = this.el.querySelectorAll("[data-time-group]");
        Array.from(groups).forEach(group => {
            group.classList.remove(this.rollClass);
        });
    }
    
    tick() {
        clearTimeout(this.digitsTimeout);
        this.digitsTimeout = setTimeout(this.loop.bind(this), 1e3);	
    }
    
    updateTime() {
        const rawDate = new Date();
        const date = new Date(Math.ceil(rawDate.getTime() / 1e3) * 1e3 + this.mod);
        let h = date.getHours();
        const m = date.getMinutes();
        const s = date.getSeconds();
        const ap = h < 12 ? "AM" : "PM";
        if (h === 0) h = 12;
        if (h > 12) h -= 12;
        this.time.a = [...this.time.b];
        this.time.b = [
            (h < 10 ? `0${h}` : `${h}`),
            (m < 10 ? `0${m}` : `${m}`),
            (s < 10 ? `0${s}` : `${s}`),
            ap
        ];
        if (!this.time.a.length) this.time.a = [...this.time.b];
    }
}

function initClock() {
    const clock = new BouncyBlockClock(".clock");
}

// --- Timestamp Helper ---
function getCurrentTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// --- Character Counter ---
function setupCharCounter() {
    const textarea = document.getElementById('dailyNoteInput');
    const counter = document.getElementById('charCount');
    
    textarea.addEventListener('input', () => {
        counter.innerText = textarea.value.length;
    });
}

// --- ID Management ---
function generateId() {
    const id = nextToggleId++;
    localStorage.setItem('nextToggleId', nextToggleId);
    return id;
}

// --- Yesterday Message ---
let lastInteractedToggle = null;

function showLastToggleValue(toggleId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    const msg = document.getElementById('yesterdayMessage');
    
    if (!dailyData[yesterdayKey] || !dailyData[yesterdayKey].habits) {
        msg.innerHTML = 'No data from yesterday';
        return;
    }
    
    const config = habitConfig.find(h => h.id === toggleId);
    if (!config) {
        msg.innerHTML = 'No data from yesterday';
        return;
    }
    
    const yesterdayValue = dailyData[yesterdayKey].habits[toggleId];
    
    if (yesterdayValue === undefined || yesterdayValue === null) {
        msg.innerHTML = `<span style="font-style: italic;">${config.name} not set yesterday</span>`;
        return;
    }
    
    if (config.type === 'states') {
        const stateName = config.states[yesterdayValue].name;
        msg.innerHTML = `Was set to <span class="highlight">${stateName}</span> yesterday`;
    } else if (config.type === 'counter') {
        msg.innerHTML = `Was set to <span class="highlight">${yesterdayValue}</span> yesterday`;
    } else if (config.type === 'custom') {
        msg.innerHTML = `Was set to <span class="highlight">${yesterdayValue}</span> yesterday`;
    }
}

function renderYesterdayMessage() {
    const msg = document.getElementById('yesterdayMessage');
    msg.innerHTML = 'Click a toggle to see yesterday\'s value';
}

function showYesterdayMood() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    const msg = document.getElementById('yesterdayMessage');

    if (!dailyData[yesterdayKey] || dailyData[yesterdayKey].mood === null || dailyData[yesterdayKey].mood === undefined) {
        msg.innerHTML = '<span style="font-style: italic;">No mood set yesterday</span>';
        return;
    }

    const moodName = moodConfig[dailyData[yesterdayKey].mood];
    msg.innerHTML = `Yesterday's mood: <span class="highlight">${moodName}</span>`;
}


function closeAllPanels(){
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('open'));
    document.body.classList.remove('panel-open');
}

// --- Panel & Tab Logic ---
function toggleSidebar(id) {
    const panel = document.getElementById(id);
    const wasOpen = panel.classList.contains('open');
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('open'));
document.body.classList.remove('panel-open');

    if (!wasOpen) {
        panel.classList.add('open');
        document.body.classList.add('panel-open');
        if (id === 'sidePanelNotes') {
            document.getElementById('charCount').innerText = document.getElementById('dailyNoteInput').value.length;
        }
    }
}

function switchTab(tab) {
    const isToggles = tab === 'toggles';
    document.getElementById('contentToggles').style.display = isToggles ? 'block' : 'none';
    document.getElementById('contentMoods').style.display = isToggles ? 'none' : 'block';
    document.getElementById('tabToggles').classList.toggle('active', isToggles);
    document.getElementById('tabMoods').classList.toggle('active', !isToggles);
    document.getElementById('sliderIndicator').style.left = isToggles ? '4px' : 'calc(50%)';
}

// --- Mood Logic ---
function renderMoodBar() {
    const container = document.getElementById('moodOptions');
    const isLocked = dailyData[today].isLocked;
    container.innerHTML = '';
    moodConfig.forEach((name, i) => {
        const btn = document.createElement('button');
        btn.className = `mood-btn ${dailyData[today].mood === i ? 'active' : ''} ${isLocked ? 'disabled' : ''}`;
        btn.innerText = name;
        // Removed inline background/color styles - let the slider provide the visual indication
        btn.onclick = () => {
            if (isLocked) return;
            // Once a mood is set, can't go back to null (only change to another mood)
            if (dailyData[today].mood !== i) {
                dailyData[today].mood = i;
                renderMoodBar(); 
                autoSave();
            }
            // Always update yesterday badge when a mood button is clicked
            showYesterdayMood();
        };
        container.appendChild(btn);
    });

    // Move mood slider (defaults to "Daily Mood" title if mood is null)
    requestAnimationFrame(() => positionMoodSlider());
}

function positionMoodSlider() {
    const slider = document.getElementById('moodSlider');
    const bar = document.querySelector('.mood-bar');
    if (!slider || !bar) return;

    const active = bar.querySelector('.mood-btn.active');
    const fallback = document.getElementById('moodTitle');
    const target = active || fallback;
    if (!target) return;

    const barRect = bar.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const left = tRect.left - barRect.left;
    const top = tRect.top - barRect.top;

    slider.style.width = `${tRect.width}px`;
    slider.style.height = `${tRect.height}px`;
    slider.style.transform = `translate(${left}px, ${top}px)`;
    
    // Change slider color based on selected mood
    if (dailyData[today].mood !== null) {
        slider.style.backgroundColor = moodSliderColors[dailyData[today].mood];
    } else {
        // Default teal when on title
        slider.style.backgroundColor = 'var(--accent-primary)';
    }
}

function renderMoodSettings() {
    const container = document.getElementById('moodNameInputs');
    container.innerHTML = '';
    moodConfig.forEach((name, i) => {
        container.innerHTML += `
            <div class="panel-section">
                <div class="mood-quote">${moodQuotes[i]}</div>
                <input type="text" class="black-input center-text" value="${name}" onchange="updateMoodName(${i}, this.value)">
            </div>`;
    });
}

function updateMoodName(i, val) { 
    moodConfig[i] = val; 
}

function saveMoodNames() {
    localStorage.setItem('moodNames', JSON.stringify(moodConfig));
    renderMoodBar();
    toggleSidebar('sidePanelAdd');
}

function cancelMoodEdit() {
    moodConfig = JSON.parse(localStorage.getItem('moodNames')) || ["Terrible", "Bad", "Neutral", "Good", "Wonderful"];
    renderMoodSettings();
    toggleSidebar('sidePanelAdd');
}

// --- Helper: Calculate counter gradient color ---
function getCounterGradient(value, min, max, minColor = '#000000', maxColor = '#ffffff') {
    if (value === null || value === undefined) return 'rgb(42, 42, 42)'; // N/A
    if (max === min) return lerpColorHex(minColor, maxColor, 1);
    const percentage = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return lerpColorHex(minColor, maxColor, percentage);
}

// Calculate brightness of a color and return contrasting text color
function getContrastingTextColor(color) {
    let r, g, b;
    
    // Handle hex format
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
    }
    // Handle rgb/rgba format
    else if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        r = parseInt(matches[0]);
        g = parseInt(matches[1]);
        b = parseInt(matches[2]);
    }
    else {
        return '#ffffff'; // default
    }
    
    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for bright backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// --- Toggle Logic ---
function renderHabits() {
    const container = document.getElementById('habitContainer');
    const isLocked = dailyData[today].isLocked;
    container.innerHTML = '';
    
    habitConfig.forEach(config => {
        let val = dailyData[today].habits[config.id];
        if (val === undefined) {
            if (config.type === 'counter') {
                val = config.defaultToMin ? config.min : null;
            } else {
                val = 0;
            }
        }
        const card = document.createElement('div');
        card.className = `habit-card ${config.type} ${isLocked ? 'disabled' : ''}`;
        card.dataset.habitId = config.id;
        
        const box = document.createElement('div');
        box.className = 'habit-card-box';
        box.style.position = 'relative';
        box.appendChild(card);
        
        /* BINARY TOGGLES REMOVED - Use states with 2 options instead
        if (config.type === 'binary') {
            card.classList.add(val === 1 ? 'on' : 'off');
            card.innerHTML = `
                <div class="flip-front">
                    <span class="emoji">${config.emoji}</span>
                    <span class="name">${config.name}</span>
                </div>
                <div class="flip-back">
                    <span class="emoji">${config.emoji}</span>
                    <span class="name">${config.name}</span>
                </div>
            `;
        } else */ if (config.type === 'states') {
            const currentState = config.states[val];
            const nextState = config.states[(val + 1) % config.states.length];

            // Calculate contrasting text colors
            const currentTextColor = getContrastingTextColor(currentState.color);
            const nextTextColor = getContrastingTextColor(nextState.color);

            // Border lives on the card (prevents thin mid-line seams)
            card.style.borderColor = currentState.color;
            
            card.innerHTML = `
                <div class="flip-front" style="background-color: ${currentState.color}; color: ${currentTextColor};">
                    <span class="emoji">${config.emoji}</span>
                    <span class="state-label">${currentState.name}</span>
                    <span class="name">${config.name}</span>
                </div>
                <div class="flip-back" style="background-color: ${nextState.color}; color: ${nextTextColor};">
                    <span class="emoji">${config.emoji}</span>
                    <span class="state-label">${nextState.name}</span>
                    <span class="name">${config.name}</span>
                </div>
            `;
        } else if (config.type === 'counter') {
            const bgColor = getCounterGradient(val, config.min, config.max, config.minColor || '#000000', config.maxColor || '#ffffff');
            const textColor = getContrastingTextColor(bgColor);
            
            card.style.backgroundColor = bgColor;
            // no borders (requested)
            card.style.color = textColor;
            
            card.innerHTML = `
                <div class="counter-ui">
                    <button class="counter-btn" onclick="event.stopPropagation(); changeCount(${config.id}, -1)">−</button>
                    <div class="counter-center">
                        <span class="emoji">${config.emoji}</span>
                        <span class="counter-value">${val === null ? 'N/A' : val}</span>
                        <span class="counter-name">${config.name}</span>
                    </div>
                    <button class="counter-btn" onclick="event.stopPropagation(); changeCount(${config.id}, 1)">+</button>
                </div>
            `;
        } else if (config.type === 'custom') {
            const cardColor = config.customColor || '#2a2a2a';
            const textColor = getContrastingTextColor(cardColor);
            const currentVal = (dailyData[today].habits[config.id] === undefined || dailyData[today].habits[config.id] === null)
                ? null : dailyData[today].habits[config.id];

            card.style.backgroundColor = cardColor;
            card.style.color = textColor;
            card.style.borderRadius = 'var(--ui-radius)';

            const ui = document.createElement('div');
            ui.className = 'custom-ui';

            const emojiEl = document.createElement('span');
            emojiEl.className = 'emoji custom-emoji';
            emojiEl.textContent = config.emoji;

            const inputEl = document.createElement('input');
            inputEl.className = 'custom-value-input';
            inputEl.maxLength = 12;
            inputEl.value = currentVal !== null ? String(currentVal) : '';
            inputEl.placeholder = currentVal !== null ? '' : (config.customOffLabel || '—');
            inputEl.style.color = textColor;
            inputEl.style.caretColor = textColor;
            inputEl.disabled = isLocked;

            // Keyboard restriction based on inputType
            inputEl.addEventListener('keypress', (e) => {
                if (config.customInputType === 'number') {
                    // Allow digits, decimal point, minus sign
                    if (!/[\d.\-]/.test(e.key) && e.key !== 'Backspace') e.preventDefault();
                } else if (config.customInputType === 'text') {
                    // Block digits
                    if (/\d/.test(e.key)) e.preventDefault();
                }
                // 'both' → no restriction beyond maxlength
            });

            inputEl.addEventListener('click', (e) => { e.stopPropagation(); });

            inputEl.addEventListener('change', (e) => {
                e.stopPropagation();
                if (isLocked) return;
                const newVal = inputEl.value.trim();
                dailyData[today].habits[config.id] = newVal === '' ? null : newVal;
                if (!dailyData[today].habitTimestamps) dailyData[today].habitTimestamps = {};
                dailyData[today].habitTimestamps[config.id] = getCurrentTimestamp();
                showLastToggleValue(config.id);
                autoSave();
                // Update placeholder state without full re-render
                if (newVal === '') {
                    inputEl.placeholder = config.customOffLabel || '—';
                    inputEl.value = '';
                } else {
                    inputEl.placeholder = '';
                }
            });

            // Clicking the card background (not the input) when a value is set → clears to off
            card.addEventListener('click', (e) => {
                if (e.target === inputEl || isLocked) return;
                if (currentVal !== null) {
                    showLastToggleValue(config.id);
                    dailyData[today].habits[config.id] = null;
                    if (!dailyData[today].habitTimestamps) dailyData[today].habitTimestamps = {};
                    dailyData[today].habitTimestamps[config.id] = getCurrentTimestamp();
                    autoSave();
                    renderHabits();
                } else {
                    inputEl.focus();
                }
            });

            const nameEl = document.createElement('span');
            nameEl.className = 'counter-name custom-name';
            nameEl.textContent = config.name;

            ui.appendChild(emojiEl);
            ui.appendChild(inputEl);
            ui.appendChild(nameEl);
            card.appendChild(ui);
        }

        // Click-to-flip (no hover flips). States only: animate then commit.
        if (!isLocked && config.type !== 'counter' && config.type !== 'custom') {
            card.addEventListener('click', () => {
                showLastToggleValue(config.id);
                animateAndCommitToggle(card, config);
            });
        } else if (!isLocked && config.type === 'counter') {
            // For counters, trigger on button clicks
            const counterBtns = card.querySelectorAll('.counter-btn');
            counterBtns.forEach(btn => {
                const originalHandler = btn.onclick;
                btn.onclick = (e) => {
                    showLastToggleValue(config.id);
                    if (originalHandler) originalHandler.call(btn, e);
                };
            });
        }
        
        // Add hover options button (edit/delete)
        const optionsBtn = document.createElement('button');
        optionsBtn.className = 'toggle-options-btn';
        optionsBtn.innerHTML = '⋮';
        optionsBtn.onclick = (e) => {
            e.stopPropagation();
            openToggleOptionsPopup(config, box, card);
        };
        box.appendChild(optionsBtn);
        
        card.oncontextmenu = (e) => { 
            e.preventDefault(); 
            openToggleOptionsPopup(config, box, card);
        };
        
        container.appendChild(box);
    });
    
    // Add invisible spacer at the bottom for better scrolling
    const spacer = document.createElement('div');
    spacer.className = 'habit-grid-spacer';
    spacer.style.width = '100%';
    spacer.style.height = '1px';
    spacer.style.gridColumn = '1 / -1';
    container.appendChild(spacer);
}

function animateAndCommitToggle(card, config) {
    if (dailyData[today].isLocked) return;

    // Prevent double clicks while animating
    if (card.classList.contains('is-animating')) return;
    card.classList.add('is-animating');

    // Flip now for visual feedback
    card.classList.add('flipped-temp');

    // Commit data near the end of the flip, then re-render
    const commitDelay = 220;
    setTimeout(() => {
        commitToggleNoRender(config);
    }, commitDelay);

    // After flip ends, re-render to reflect committed state
    setTimeout(() => {
        renderHabits();
    }, 460);

    // Clean temp class if card still exists (re-render may remove it)
    setTimeout(() => {
        try { card.classList.remove('is-animating', 'flipped-temp'); } catch (e) {}
    }, 480);
}

function commitToggleNoRender(config) {
    if (dailyData[today].isLocked) return;

    let current = dailyData[today].habits[config.id];
    if (current === undefined) {
        current = config.type === 'counter' ? (config.defaultToMin ? config.min : null) : 0;
    }

    /* BINARY TOGGLES REMOVED
    if (config.type === 'binary') {
        dailyData[today].habits[config.id] = (current === 0 ? 1 : 0);
    } else */ if (config.type === 'states') {
        dailyData[today].habits[config.id] = (current + 1) % config.states.length;
    }

    if (!dailyData[today].habitTimestamps) dailyData[today].habitTimestamps = {};
    dailyData[today].habitTimestamps[config.id] = getCurrentTimestamp();

    autoSave();
}

function handleCardClick(config) {
    if (dailyData[today].isLocked) return;
    let current = dailyData[today].habits[config.id];
    if (current === undefined) {
        current = config.type === 'counter' ? config.min : 0;
    }
    
    /* BINARY TOGGLES REMOVED
    if (config.type === 'binary') {
        dailyData[today].habits[config.id] = (current === 0 ? 1 : 0);
    } else */ if (config.type === 'states') {
        dailyData[today].habits[config.id] = (current + 1) % config.states.length;
    }
    
    // Record timestamp
    if (!dailyData[today].habitTimestamps) {
        dailyData[today].habitTimestamps = {};
    }
    dailyData[today].habitTimestamps[config.id] = getCurrentTimestamp();
    
    autoSave(); 
    renderHabits();
}

function changeCount(id, delta) {
    if (dailyData[today].isLocked) return;
    const config = habitConfig.find(h => h.id === id);
    let cur = dailyData[today].habits[id];

    // If counter starts as N/A, first increment sets to min; first decrement keeps N/A
    if (cur === null || cur === undefined) {
        if (delta > 0) {
            cur = config.min;
        } else {
            // allow decrement to keep N/A
            dailyData[today].habits[id] = null;
            autoSave();
            renderHabits();
            return;
        }
    }

    let next = cur + delta;

    // If not default-to-min, allow going back to N/A by decrementing below min
    if (!config.defaultToMin && next < config.min) {
        dailyData[today].habits[id] = null;
    } else {
        if (next < config.min) next = config.min;
        if (next > config.max) next = config.max;
        dailyData[today].habits[id] = next;
    }

    if (!dailyData[today].habitTimestamps) dailyData[today].habitTimestamps = {};
    dailyData[today].habitTimestamps[id] = getCurrentTimestamp();

    autoSave();
    renderHabits();
}

// --- Toggle Creation UI ---
function renderStateInputs() {
    const container = document.getElementById('stateInputsContainer');
    container.innerHTML = '';
    tempStateConfig.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = 'state-input-row';
        row.style.position = 'relative';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'black-input center-text';
        input.style.padding = '6px';
        input.value = s.name;
        input.onchange = () => { tempStateConfig[i].name = input.value; };
        
        const colorBtn = document.createElement('button');
        colorBtn.className = 'state-color-picker';
        colorBtn.style.backgroundColor = s.color;
        colorBtn.type = 'button';
        colorBtn.onclick = (e) => {
            e.stopPropagation();
            openStateColorPopup(i, colorBtn);
        };
        
        row.appendChild(input);
        row.appendChild(colorBtn);
        container.appendChild(row);
    });
}

function openStateColorPopup(stateIndex, buttonElement) {
    // Close any existing popups
    document.querySelectorAll('.state-color-popup').forEach(p => p.remove());
    
    const popup = document.createElement('div');
    popup.className = 'state-color-popup active';
    
    const grid = document.createElement('div');
    grid.className = 'state-color-popup-grid';
    
    COUNTER_COLOR_OPTIONS.forEach(colorOption => {
        const swatch = document.createElement('button');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = colorOption.value;
        swatch.type = 'button';
        if (tempStateConfig[stateIndex].color.toLowerCase() === colorOption.value.toLowerCase()) {
            swatch.classList.add('selected');
        }
        swatch.onclick = () => {
            tempStateConfig[stateIndex].color = colorOption.value;
            buttonElement.style.backgroundColor = colorOption.value;
            popup.remove();
        };
        grid.appendChild(swatch);
    });
    
    popup.appendChild(grid);
    buttonElement.parentElement.appendChild(popup);
    
    // Close popup when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && e.target !== buttonElement) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 10);
}

function adjustStateCount(delta) {
    const size = tempStateConfig.length + delta;
    if (size >= 2 && size <= 6) {
        if (delta > 0) tempStateConfig.push({ name: `State ${size}`, color: "#ffffff" });
        else tempStateConfig.pop();
        renderStateInputs();
    }
}

function updateTypeUI(btn, type) {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSelectedType = type;
    document.getElementById('statesSettings').style.display  = type === 'states'  ? 'block' : 'none';
    document.getElementById('counterSettings').style.display = type === 'counter' ? 'block' : 'none';
    document.getElementById('customSettings').style.display  = type === 'custom'  ? 'block' : 'none';
    if (type === 'custom') initCustomColorBar();
}

function addNewHabit() {
    const name = document.getElementById('newHabitName').value.trim();
    if (!name) return;
    
    const config = {
        id: generateId(),
        name, 
        emoji: currentSelectedEmoji, 
        type: currentSelectedType,
        states: currentSelectedType === 'states' ? [...tempStateConfig] : null,
        min: rangeMin,
        max: rangeMax,
        minColor: currentSelectedType === 'counter' ? counterMinColor : null,
        maxColor: currentSelectedType === 'counter' ? counterMaxColor : null,
        defaultToMin: currentSelectedType === 'counter' ? !!counterDefaultToMin : true,
        customColor: currentSelectedType === 'custom' ? customCardColor : null,
        customInputType: currentSelectedType === 'custom' ? customInputType : null,
        customOffLabel: currentSelectedType === 'custom'
            ? (document.getElementById('customOffLabel').value.trim() || '—') : null
    };
    
    habitConfig.push(config);
    localStorage.setItem('habitConfig', JSON.stringify(habitConfig));
    
    if (currentSelectedType === 'counter') {
        dailyData[today].habits[config.id] = config.defaultToMin ? rangeMin : null;
    }
    
    document.getElementById('newHabitName').value = '';
    if (currentSelectedType === 'custom') {
        document.getElementById('customOffLabel').value = '';
    }
    autoSave();
    renderHabits(); 
    toggleSidebar('sidePanelAdd');
}

function removeHabit(id) { 
    habitConfig = habitConfig.filter(h => h.id !== id); 
    localStorage.setItem('habitConfig', JSON.stringify(habitConfig)); 
    renderHabits(); 
}

function openToggleOptionsPopup(config, boxElement, cardElement) {
    document.querySelectorAll('.toggle-options-popup').forEach(p => p.remove());
    
    const popup = document.createElement('div');
    // popup.className = 'toggle-options-popup active';
        popup.className = 'toggle-options-popup';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'edit';
    editBtn.innerHTML = '✏️'; //belongs to the toggle edit tdelete 
    editBtn.onclick = () => {
        popup.remove();
        editToggle(config);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = () => {
        popup.remove();
        removeHabit(config.id);
    };
    
    popup.appendChild(editBtn);
    popup.appendChild(deleteBtn);
    boxElement.appendChild(popup);

    // Trigger the animation in the next frame
    requestAnimationFrame(() => {
        popup.classList.add('active');
    });
    
    
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !boxElement.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 10);
}

let editingToggleId = null;

function editToggle(config) {
    editingToggleId = config.id;
    
    toggleSidebar('sidePanelAdd');
    
    document.getElementById('newHabitName').value = config.name;
    currentSelectedEmoji = config.emoji;
    currentSelectedType = config.type;
    
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    const typeBtn = Array.from(document.querySelectorAll('.type-btn')).find(btn => 
        btn.getAttribute('onclick').includes(config.type)
    );
    if (typeBtn) {
        typeBtn.classList.add('active');
        updateTypeUI(typeBtn, config.type);
    }
    
    if (config.type === 'states') {
        tempStateConfig = JSON.parse(JSON.stringify(config.states));
        renderStateInputs();
    } else if (config.type === 'counter') {
        rangeMin = config.min;
        rangeMax = config.max;
        counterMinColor = config.minColor || '#000000';
        counterMaxColor = config.maxColor || '#ffffff';
        counterDefaultToMin = config.defaultToMin;
        initRangeSlider();
        initCounterColorBars();
        document.getElementById('counterDefaultToMin').checked = counterDefaultToMin;
    } else if (config.type === 'custom') {
        customCardColor = config.customColor || '#2a2a2a';
        customInputType = config.customInputType || 'number';
        document.getElementById('customOffLabel').value = config.customOffLabel || '—';
        initCustomColorBar();
        // Sync input type buttons
        document.querySelectorAll('.custom-type-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('onclick').includes(`'${customInputType}'`));
        });
    }
    
    renderEmojiPicker();
    
    const createBtn = document.querySelector('.btn-confirm[onclick="addNewHabit()"]');
    if (createBtn) {
        createBtn.textContent = 'Update';
        createBtn.onclick = updateToggle;
    }
}

function updateToggle() {
    const name = document.getElementById('newHabitName').value.trim();
    if (!name || !editingToggleId) return;
    
    const configIndex = habitConfig.findIndex(h => h.id === editingToggleId);
    if (configIndex === -1) return;
    
    habitConfig[configIndex] = {
        ...habitConfig[configIndex],
        name,
        emoji: currentSelectedEmoji,
        states: currentSelectedType === 'states' ? [...tempStateConfig] : habitConfig[configIndex].states,
        min: currentSelectedType === 'counter' ? rangeMin : habitConfig[configIndex].min,
        max: currentSelectedType === 'counter' ? rangeMax : habitConfig[configIndex].max,
        minColor: currentSelectedType === 'counter' ? counterMinColor : habitConfig[configIndex].minColor,
        maxColor: currentSelectedType === 'counter' ? counterMaxColor : habitConfig[configIndex].maxColor,
        defaultToMin: currentSelectedType === 'counter' ? !!counterDefaultToMin : habitConfig[configIndex].defaultToMin,
        customColor: currentSelectedType === 'custom' ? customCardColor : habitConfig[configIndex].customColor,
        customInputType: currentSelectedType === 'custom' ? customInputType : habitConfig[configIndex].customInputType,
        customOffLabel: currentSelectedType === 'custom'
            ? (document.getElementById('customOffLabel').value.trim() || '—')
            : habitConfig[configIndex].customOffLabel
    };
    
    localStorage.setItem('habitConfig', JSON.stringify(habitConfig));
    
    document.getElementById('newHabitName').value = '';
    editingToggleId = null;
    
    const updateBtn = document.querySelector('.btn-confirm');
    if (updateBtn) {
        updateBtn.textContent = 'Create';
        updateBtn.onclick = addNewHabit;
    }
    
    autoSave();
    renderHabits();
    toggleSidebar('sidePanelAdd');
}

// --- Range Slider Logic ---
let isDragging = null;

function initRangeSlider() {
    const minThumb = document.getElementById('minThumb');
    const maxThumb = document.getElementById('maxThumb');
    const container = document.querySelector('.range-slider-container');
    
    const startDrag = (e, thumb) => {
        isDragging = thumb;
        e.preventDefault();
    };
    
    const drag = (e) => {
        if (!isDragging) return;
        
        const rect = container.getBoundingClientRect();
        const x = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const value = Math.round(percent);
        
        if (isDragging === 'min') {
            rangeMin = Math.min(value, rangeMax);
        } else {
            rangeMax = Math.max(value, rangeMin);
        }
        
        updateRangeSlider();
    };
    
    const stopDrag = () => {
        isDragging = null;
    };
    
    minThumb.addEventListener('mousedown', (e) => startDrag(e, 'min'));
    maxThumb.addEventListener('mousedown', (e) => startDrag(e, 'max'));
    minThumb.addEventListener('touchstart', (e) => startDrag(e, 'min'));
    maxThumb.addEventListener('touchstart', (e) => startDrag(e, 'max'));
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    
    updateRangeSlider();
}

function updateRangeSlider() {
    const minThumb = document.getElementById('minThumb');
    const maxThumb = document.getElementById('maxThumb');
    const fill = document.getElementById('rangeFill');
    const minLabel = document.getElementById('minLabel');
    const maxLabel = document.getElementById('maxLabel');
    
    minThumb.style.left = `${rangeMin}%`;
    maxThumb.style.left = `${rangeMax}%`;
    fill.style.left = `${rangeMin}%`;
    fill.style.width = `${rangeMax - rangeMin}%`;
    minLabel.innerText = rangeMin;
    maxLabel.innerText = rangeMax;
}


// --- Counter Gradient UI ---
function initCounterColorBars() {
    const minBar = document.getElementById('counterMinColorBar');
    const maxBar = document.getElementById('counterMaxColorBar');
    const chk = document.getElementById('counterDefaultToMin');

    if (!minBar || !maxBar || !chk) return;

    chk.checked = !!counterDefaultToMin;
    chk.addEventListener('change', () => {
        counterDefaultToMin = chk.checked;
    });

    const build = (barEl, target) => {
        barEl.innerHTML = '';
        COUNTER_COLOR_OPTIONS.forEach(opt => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'color-swatch';
            b.title = opt.name;
            b.style.background = opt.value;
            b.dataset.color = opt.value;
            b.dataset.target = target;

            const isSelected = (target === 'min') ? (opt.value.toLowerCase() === counterMinColor.toLowerCase())
                                                 : (opt.value.toLowerCase() === counterMaxColor.toLowerCase());
            if (isSelected) b.classList.add('selected');

            b.addEventListener('click', () => {
                // clear selection in this bar
                barEl.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
                b.classList.add('selected');

                if (target === 'min') counterMinColor = opt.value;
                else counterMaxColor = opt.value;
            });

            barEl.appendChild(b);
        });
    };

    build(minBar, 'min');
    build(maxBar, 'max');
}

// --- Color helper ---
function hexToRgb(hex) {
    const h = hex.replace('#', '').trim();
    const full = (h.length === 3) ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function lerpColorHex(minHex, maxHex, t) {
    const a = hexToRgb(minHex);
    const b = hexToRgb(maxHex);
    return `rgb(${lerp(a.r,b.r,t)}, ${lerp(a.g,b.g,t)}, ${lerp(a.b,b.b,t)})`;
}

// --- Custom Value Toggle Helpers ---
function initCustomColorBar() {
    const bar = document.getElementById('customColorBar');
    if (!bar) return;
    bar.innerHTML = '';
    COUNTER_COLOR_OPTIONS.forEach(opt => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'color-swatch';
        b.title = opt.name;
        b.style.background = opt.value;
        if (opt.value.toLowerCase() === customCardColor.toLowerCase()) b.classList.add('selected');
        b.addEventListener('click', () => {
            bar.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
            customCardColor = opt.value;
        });
        bar.appendChild(b);
    });
}

function setCustomInputType(btn, type) {
    customInputType = type;
    document.querySelectorAll('.custom-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// --- Notes Logic ---

 function cancelNote(){
     const input = document.getElementById('dailyNoteInput');
     input.value = '';
     document.getElementById('charCount').innerText = '0';
     editingNoteIndex = null;
     closeAllPanels();
 }

 function saveNote() {
     const input = document.getElementById('dailyNoteInput');
     let text = input.value.trim();
     if (!text) return;
   
     const timestamp = getCurrentTimestamp();
    
     if (editingNoteIndex !== null) {
         dailyData[today].notes[editingNoteIndex] = text;
         if (!dailyData[today].noteTimestamps) {
             dailyData[today].noteTimestamps = [];
         }
         dailyData[today].noteTimestamps[editingNoteIndex] = timestamp;
         editingNoteIndex = null;
     } else {
         dailyData[today].notes.push(text);
         if (!dailyData[today].noteTimestamps) {
             dailyData[today].noteTimestamps = [];
         }
         dailyData[today].noteTimestamps.push(timestamp);
     }
    
     input.value = '';
     document.getElementById('charCount').innerText = '0';
     autoSave();
     renderDiarySection();
     closeAllPanels();
 }

 function openNoteActionsPopup(noteIndex, noteContent, parentElement) {
    // Close any existing popups
    document.querySelectorAll('.note-actions-popup, .note-reveal-popup').forEach(p => p.remove());
    
    const popup = document.createElement('div');
    popup.className = 'note-actions-popup'; // Remove 'active' from here initially
    
    // ... (Your button creation logic remains exactly the same) ...
    const editBtn = document.createElement('button');
    editBtn.className = 'edit';
    // editBtn.innerHTML = '✏️ Edit';
        editBtn.innerHTML = '✏️';
    editBtn.onclick = () => { popup.remove(); editNote(noteIndex); };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    // deleteBtn.innerHTML = '🗑️ Delete';
        deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = () => {
        popup.remove();
        deleteNote(noteIndex);
    };
    
    const revealBtn = document.createElement('button');
    revealBtn.className = 'reveal';
    // revealBtn.innerHTML = '👁️ Reveal';
        revealBtn.innerHTML = '👁️';
    revealBtn.onclick = () => { openNoteRevealPopup(noteContent, parentElement); };
    
    popup.appendChild(editBtn);
    popup.appendChild(deleteBtn);
    popup.appendChild(revealBtn);
    parentElement.appendChild(popup);
    
    // TRIGGER ANIMATION
    requestAnimationFrame(() => {
        popup.classList.add('active');
    });
    
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !parentElement.contains(e.target)) {
                popup.classList.remove('active'); // Animate out
                setTimeout(() => popup.remove(), 250); // Remove after animation
                document.removeEventListener('click', closePopup);
            }
        });
    }, 10);
}

function openNoteRevealPopup(noteContent, parentElement) {
    document.querySelectorAll('.note-reveal-popup').forEach(p => p.remove());
    
    const revealPopup = document.createElement('div');
    revealPopup.className = 'note-reveal-popup note-reveal-popup--floating';
    
    const content = document.createElement('div');
    content.className = 'note-content';
    content.textContent = noteContent;
    
    revealPopup.appendChild(content);
    
    // Append to body so it escapes diary section's overflow:hidden
    document.body.appendChild(revealPopup);
    
    // Position just above the parent note oval using getBoundingClientRect
    const rect = parentElement.getBoundingClientRect();
    revealPopup.style.position = 'fixed';
    revealPopup.style.right = (window.innerWidth - rect.right) + 'px';
    revealPopup.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    revealPopup.style.zIndex = '9999';
    
    // TRIGGER ANIMATION
    requestAnimationFrame(() => {
        revealPopup.classList.add('active');
    });
    
    setTimeout(() => {
        document.addEventListener('click', function closeReveal(e) {
            if (!revealPopup.contains(e.target) && !parentElement.contains(e.target)) {
                revealPopup.classList.remove('active');
                setTimeout(() => revealPopup.remove(), 250);
                document.removeEventListener('click', closeReveal);
            }
        });
    }, 10);
}

 function editNote(index) {
     if (dailyData[today].isLocked) return;
    
     toggleSidebar('sidePanelNotes');
     const input = document.getElementById('dailyNoteInput');
     input.value = dailyData[today].notes[index];
     document.getElementById('charCount').innerText = input.value.length;
     editingNoteIndex = index;
     input.focus();
 }

 function deleteNote(index) {
     if (dailyData[today].isLocked) return;
    
     dailyData[today].notes.splice(index, 1);
     if (dailyData[today].noteTimestamps) {
         dailyData[today].noteTimestamps.splice(index, 1);
     }
    
     const notesPerPage = 3;
     const totalPages = Math.ceil(dailyData[today].notes.length / notesPerPage);
     if (currentDiaryPage >= totalPages && currentDiaryPage > 0) {
         currentDiaryPage = totalPages - 1;
     }
    
     autoSave();
     renderDiarySection();
 }

 function renderDiarySection() {
     const container = document.getElementById('diarySection');
     const isLocked = dailyData[today].isLocked;
     container.innerHTML = '';
  
     // Always show diary section, display message if empty
     if (!dailyData[today].notes || dailyData[today].notes.length === 0) {
         const emptyMsg = document.createElement('div');
         emptyMsg.className = 'diary-empty-message';
         emptyMsg.textContent = 'No notes yet';
         container.appendChild(emptyMsg);
         return;
     }
    
     const wrapper = document.createElement('div');
     wrapper.className = 'diary-wrapper';
    
     const notesPerPage = 3;
     const pages = [];
     for (let i = 0; i < dailyData[today].notes.length; i += notesPerPage) {
         pages.push(dailyData[today].notes.slice(i, i + notesPerPage));
     }
    
     const diaryContainer = document.createElement('div');
     diaryContainer.className = 'diary-container';
     diaryContainer.id = 'diaryContainer';
    
     pages.forEach((pageNotes, pageIndex) => {
         const page = document.createElement('div');
         page.className = 'diary-page';
        
         pageNotes.forEach((note, noteIndex) => {
             const globalIndex = pageIndex * notesPerPage + noteIndex;
             const oval = document.createElement('div');
             oval.className = 'note-oval';
             oval.style.position = 'relative';
             
             const noteText = document.createElement('span');
             noteText.textContent = note;
             
             const actionsBtn = document.createElement('button');
             actionsBtn.className = 'note-actions-btn';
             actionsBtn.innerHTML = '⋮';
             actionsBtn.disabled = isLocked;
             actionsBtn.onclick = (e) => {
                 e.stopPropagation();
                 if (!isLocked) openNoteActionsPopup(globalIndex, note, oval);
             };
             
             oval.appendChild(noteText);
             oval.appendChild(actionsBtn);
             page.appendChild(oval);
         });
        
         diaryContainer.appendChild(page);
     });
    
     wrapper.appendChild(diaryContainer);
     container.appendChild(wrapper);
    
     if (pages.length > 1) {
         const leftArrow = document.createElement('div');
         leftArrow.className = 'diary-nav left';
         leftArrow.innerHTML ='&larr;'; /*'◀';*/
         leftArrow.onclick = () => navigateDiary(-1);
        
         const rightArrow = document.createElement('div');
         rightArrow.className = 'diary-nav right';
         rightArrow.innerHTML = '&rarr;';/*'&raquo'; /*'▶';*/
         rightArrow.onclick = () => navigateDiary(1);
        
         container.appendChild(leftArrow);
         container.appendChild(rightArrow);
     }
    
     if (currentDiaryPage >= pages.length) {
         currentDiaryPage = Math.max(0, pages.length - 1);
     }
     updateDiaryNavigation();
}

 function navigateDiary(direction) {
     const notes = dailyData[today].notes || [];
     const notesPerPage = 3;
     const totalPages = Math.ceil(notes.length / notesPerPage);
    
     currentDiaryPage += direction;
     if (currentDiaryPage < 0) currentDiaryPage = 0;
     if (currentDiaryPage >= totalPages) currentDiaryPage = totalPages - 1;
    
     const container = document.getElementById('diaryContainer');
     const offset = currentDiaryPage * -100;
     container.style.transform = `translateX(${offset}%)`;
    
     updateDiaryNavigation();
 }

 function updateDiaryNavigation() {
     const notes = dailyData[today].notes || [];
     const notesPerPage = 3;
     const totalPages = Math.ceil(notes.length / notesPerPage);
    
     const leftArrow = document.querySelector('.diary-nav.left');
     const rightArrow = document.querySelector('.diary-nav.right');
    
     if (leftArrow) {
         leftArrow.classList.toggle('hidden', currentDiaryPage === 0);
     }
     if (rightArrow) {
         rightArrow.classList.toggle('hidden', currentDiaryPage >= totalPages - 1);
     }
    
     const container = document.getElementById('diaryContainer');
     if (container) {
         const offset = currentDiaryPage * -100;
         container.style.transform = `translateX(${offset}%)`;
     }
}

// --- UI Helpers ---
function handleLockToggle() {
    dailyData[today].isLocked = !dailyData[today].isLocked;
    autoSave(); 
    updateUI();
    renderHabits();
    renderMoodBar();
    renderDiarySection();
    
    const notesInput = document.getElementById('dailyNoteInput');
    notesInput.disabled = dailyData[today].isLocked;
}

function updateUI() {
    const status = document.getElementById('lockStatus');
    const isLocked = dailyData[today].isLocked;
    status.innerText = isLocked ? "Status: Saved" : "Status: Editing";
    status.classList.toggle('saved', isLocked);
    status.classList.toggle('editing', !isLocked);
    document.getElementById('lockBtn').innerText = isLocked ? "🔒" : "✔️";
}

function renderEmojiPicker() {
    const p = document.getElementById('emojiPicker');
    const ems = ["💧","🏋️","📚","😴","🎯","🚬","☕","💊","💸","💻","🛠️","🧘","🏃","🎨","🤝","🔥","🌙","⭐"];
    ems.forEach(e => {
        const s = document.createElement('span');
        s.innerText = e;
        s.onclick = () => { 
            currentSelectedEmoji = e;
            document.querySelectorAll('.emoji-picker span').forEach(el => el.style.background = '');
            s.style.background = '#333';
        };
        p.appendChild(s);
    });
}

function autoSave() { 
    localStorage.setItem('trackerData', JSON.stringify(dailyData)); 
}

// --- Reset Today (Memory only) ---
function resetTodayMemory() {
    // Preserve history (other days) and config; reset only today's record
    dailyData[today] = {
        habits: {},
        habitTimestamps: {},
        notes: [],
        noteTimestamps: [],
        mood: null,
        isLocked: false
    };

    editingNoteIndex = null;
    currentDiaryPage = 0;

    autoSave();
    updateUI();
    renderHabits();
    renderMoodBar();
    renderDiarySection();
    renderYesterdayMessage();

    // Clear input UI
    const input = document.getElementById('dailyNoteInput');
    if (input) input.value = '';
    const cc = document.getElementById('charCount');
    if (cc) cc.innerText = '0';
}


// --- Export Functions ---
function copyTodayData() {
    const row = generateCSVRow(today);
    const header = generateCSVHeader();
    const csv = header + '\n' + row;
    
    const textarea = document.getElementById('clipboardArea');
    textarea.value = csv;
    textarea.select();
    document.execCommand('copy');
    
    alert('Today\'s data copied to clipboard!');
}

function exportFullHistory() {
    const header = generateCSVHeader();
    const rows = [];
    
    const dates = Object.keys(dailyData).sort();
    dates.forEach(date => {
        rows.push(generateCSVRow(date));
    });
    
    const csv = header + '\n' + rows.join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LifeOS_History_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function generateCSVHeader() {
    const headers = ['Date', 'Mood'];
    
    // const binary  = habitConfig.filter(h => h.type === 'binary');
    const states  = habitConfig.filter(h => h.type === 'states');
    const counter = habitConfig.filter(h => h.type === 'counter');
    const custom  = habitConfig.filter(h => h.type === 'custom');
    
    //binary.forEach(h => {
    //    headers.push(`${h.name} (${h.id})`);
    //    headers.push(`${h.name} Time`);
    //});
    states.forEach(h => {
        headers.push(`${h.name} (${h.id})`);
        headers.push(`${h.name} Time`);
    });
    counter.forEach(h => {
        headers.push(`${h.name} (${h.id})`);
        headers.push(`${h.name} Time`);
    });
    custom.forEach(h => {
        headers.push(`${h.name} (${h.id})`);
        headers.push(`${h.name} Time`);
    });
    
    headers.push('Notes', 'Note Times');
    
    return headers.join(',');
}

function generateCSVRow(date) {
    const data = dailyData[date];
    if (!data) return '';
    
    const row = [date];
    
    row.push(data.mood !== null ? moodConfig[data.mood] : '');
    
    //const binary  = habitConfig.filter(h => h.type === 'binary');
    const states  = habitConfig.filter(h => h.type === 'states');
    const counter = habitConfig.filter(h => h.type === 'counter');
    const custom  = habitConfig.filter(h => h.type === 'custom');
    
    const timestamps = data.habitTimestamps || {};
    
    //binary.forEach(h => {
    //    const val = data.habits[h.id];
    //    row.push(val === 1 ? 'On' : val === 0 ? 'Off' : '');
    //    row.push(timestamps[h.id] || '');
    //});
    
    states.forEach(h => {
        const val = data.habits[h.id];
        row.push(val !== undefined ? h.states[val].name : '');
        row.push(timestamps[h.id] || '');
    });
    
    counter.forEach(h => {
        const val = data.habits[h.id];
        row.push(val !== undefined ? val : '');
        row.push(timestamps[h.id] || '');
    });

    custom.forEach(h => {
        const val = data.habits[h.id];
        row.push(val !== null && val !== undefined ? val : '');
        row.push(timestamps[h.id] || '');
    });
    
    const notes = data.notes ? data.notes.join(';') : '';
    const noteTimes = (data.noteTimestamps || []).join(';');
    row.push(`"${notes}"`);
    row.push(`"${noteTimes}"`);
    
    return row.join(',');
}

init();