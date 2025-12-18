/**
 * LIFO Page Replacement Simulator
 * A complete interactive visualization of the LIFO page replacement algorithm
 */

// ==================== STATE MANAGEMENT ====================
let myChart = null; // Global variable for the chart instance
let narrationEnabled = false;
let userApiKey = localStorage.getItem('gemini_api_key') || '';
// Global operations log used for PDF reports: [ [Action, Value, Time, Note], ... ]
let operationsLog = [];
const state = {
    frames: 3,
    referenceString: [],
    stateHistory: [],
    currentStep: -1,
    isLoaded: false,
    isPlaying: false,
    playInterval: null,
    speed: 400,
    totalHits: 0,
    totalFaults: 0,
    isNarrating: false 
};

// CHART COLOR THEMES
const themeColors = {
    default: { line: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', hit: 'rgba(22, 163, 74, 0.6)', fault: 'rgba(239, 68, 68, 0.6)' },
    matrix:  { line: '#00ff41', bg: 'rgba(0, 255, 65, 0.1)', hit: 'rgba(0, 255, 65, 0.8)', fault: 'rgba(0, 59, 0, 0.8)' },
    sunset:  { line: '#facc15', bg: 'rgba(250, 204, 21, 0.1)', hit: 'rgba(234, 88, 12, 0.8)', fault: 'rgba(87, 83, 78, 0.6)' },
    neon:    { line: '#d900ff', bg: 'rgba(217, 0, 255, 0.1)', hit: 'rgba(0, 212, 255, 0.8)', fault: 'rgba(255, 0, 85, 0.8)' },
    pastel:  { line: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', hit: 'rgba(52, 211, 153, 0.8)', fault: 'rgba(248, 113, 113, 0.8)' }
};

let currentTheme = 'default';

// ==================== DOM ELEMENTS ====================
const elements = {
    framesInput: document.getElementById('framesInput'),
    refStringInput: document.getElementById('refStringInput'),
    randomBtn: document.getElementById('randomBtn'),
    exampleBtn: document.getElementById('exampleBtn'),
    loadBtn: document.getElementById('loadBtn'),
    resetBtn: document.getElementById('resetBtn'),
    startBtn: document.getElementById('startBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    playBtn: document.getElementById('playBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    speedBtns: document.querySelectorAll('.speed-btn'),
    tableWrapper: document.getElementById('tableWrapper'),
    stackContainer: document.getElementById('stackContainer'),
    logContainer: document.getElementById('logContainer'),
    totalHits: document.getElementById('totalHits'),
    totalFaults: document.getElementById('totalFaults'),
    currentStep: document.getElementById('currentStep'),
    totalSteps: document.getElementById('totalSteps'),
    hitRatio: document.getElementById('hitRatio'),
    alertContainer: document.getElementById('alertContainer'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content')
};

const botKnowledge = {
    "lifo": "LIFO stands for Last In, First Out. It's a memory management algorithm where the most recently loaded page is the first one to be removed when space is needed.",
    "stack": "LIFO uses a Stack data structure. Imagine a stack of plates: the last plate you put on top is the first one you take off.",
    "pros": "The main advantages are: 1. It's extremely simple to implement. 2. Low overhead (no complex calculations). 3. Does not suffer from Belady's Anomaly.",
    "advantage": "The main advantages are: 1. It's extremely simple to implement. 2. Low overhead (no complex calculations). 3. Does not suffer from Belady's Anomaly.",
    "cons": "The disadvantages are: 1. It often has a poor hit ratio. 2. Old pages can 'rot' in memory forever. 3. It ignores the 'locality of reference' principle.",
    "disadvantage": "The disadvantages are: 1. It often has a poor hit ratio. 2. Old pages can 'rot' in memory forever. 3. It ignores the 'locality of reference' principle.",
    "belady": "Good news! LIFO is a 'Stack Algorithm', which means it satisfies the inclusion property. Therefore, it does NOT suffer from Belady's Anomaly (unlike FIFO).",
    "real": "LIFO is rarely used in real operating systems for page replacement because its performance is generally poor compared to LRU or Clock algorithms.",
    "how": "When a page fault occurs and memory is full, LIFO looks at the Stack. It pops the top page (the newest one) and replaces it with the incoming page.",
    "default": "I'm not sure about that. Try asking about 'Pros', 'Cons', 'Stack', or 'Belady'."
};

// 1. Toggle API Panel
document.getElementById('toggleKeyBtn').addEventListener('click', () => {
    const panel = document.getElementById('apiKeyPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// 2. Save API Key
document.getElementById('saveKeyBtn').addEventListener('click', () => {
    const input = document.getElementById('apiKeyInput');
    const key = input.value.trim().replace(/^"|"$/g, ''); 
    if (key) {
        userApiKey = key;
        localStorage.setItem('gemini_api_key', key);
        document.getElementById('apiKeyPanel').style.display = 'none';
        addChatMessage("API Key saved! I am now super-smart. 🧠", 'bot');
    } else {
        // If user clears the box, remove key and go offline
        userApiKey = '';
        localStorage.removeItem('gemini_api_key');
        addChatMessage("API Key removed. Switched to Offline Mode.", 'bot');
    }
});

// Pre-fill input if exists
if(userApiKey) document.getElementById('apiKeyInput').value = userApiKey;
// 3. Fallback Knowledge (Offline Mode)
const offlineKnowledge = {
    "default": "I am currently in Offline Mode. Please add a Google Gemini API Key (click the key icon) to ask me complex questions! For now, ask me: 'What is LIFO?', 'Pros', or 'Cons'.",
    "lifo": "LIFO (Last-In, First-Out) removes the newest page first. Think of a stack of plates.",
    "pros": "Simple to implement, low overhead, no Belady's Anomaly.",
    "cons": "Poor performance, ignores locality of reference, old pages rot in memory."
};

async function askBot(question) {
    if (!question) question = document.getElementById('userChatInput').value;
    if (!question.trim()) return;

    addChatMessage(question, 'user');
    document.getElementById('userChatInput').value = '';

    const typingId = addChatMessage("Thinking...", 'bot', true);

    // STRATEGY: Try API first. If it fails, fallback to Local Knowledge immediately.
    if (userApiKey) {
        try {
            const response = await callGeminiAI(question);
            updateChatMessage(typingId, response);
            if (typeof state !== 'undefined' && state.isNarrating) speakText(response);
        } catch (error) {
            console.warn("AI Failed, switching to local:", error.message);
            // On failure, seamlessly switch to local knowledge
            const localResponse = getLocalResponse(question);
            updateChatMessage(typingId, localResponse + " (Note: AI unavailable, using offline knowledge)");
            if (typeof state !== 'undefined' && state.isNarrating) speakText(localResponse);
        }
    } else {
        // No key? Use Local immediately
        setTimeout(() => {
            const response = getLocalResponse(question);
            updateChatMessage(typingId, response);
            if (typeof state !== 'undefined' && state.isNarrating) speakText(response);
        }, 600);
    }
}

// --- 3. The API Caller (Standard 1.5 Flash) ---

async function callGeminiAI(userPrompt) {
    // We use the most standard, free-tier friendly model endpoint
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${userApiKey}`;
    
    const systemPrompt = "You are a helpful Computer Science Tutor. Explain LIFO Page Replacement simply (max 2 sentences).";

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${userPrompt}` }] }]
        })
    });

    const data = await response.json();

    // Check for specific API errors
    if (data.error) {
        // Throw specific error messages
        if (data.error.code === 400 || data.error.status === 'INVALID_ARGUMENT') {
            throw new Error("Invalid API Key");
        }
        throw new Error(data.error.message);
    }

    return data.candidates[0].content.parts[0].text;
}

// --- 4. The Advanced Local Brain (Offline Fallback) ---

function getLocalResponse(query) {
    const lowerQ = query.toLowerCase();

    // Key concept matching
    if (lowerQ.includes('lifo') && (lowerQ.includes('what') || lowerQ.includes('define'))) 
        return "LIFO (Last-In, First-Out) is a page replacement algorithm where the most recently loaded page is the first one removed when memory is full.";
    
    if (lowerQ.includes('stack')) 
        return "LIFO uses a Stack data structure. Think of a stack of plates: the last one placed on top is the first one taken off.";
    
    if (lowerQ.includes('pros') || lowerQ.includes('advantage') || lowerQ.includes('benefit')) 
        return "The main advantage of LIFO is simplicity. It requires no complex calculations or timestamps, making it very fast and easy to implement.";
    
    if (lowerQ.includes('cons') || lowerQ.includes('bad') || lowerQ.includes('disadvantage')) 
        return "The downside is performance. LIFO assumes new pages are temporary, but often we need new pages for a long time. It can also cause 'thrashing'.";
    
    if (lowerQ.includes('belady')) 
        return "LIFO is a Stack Algorithm, so it does NOT suffer from Belady's Anomaly. Increasing frames will never increase page faults.";
    
    if (lowerQ.includes('code') || lowerQ.includes('implement')) 
        return "Implementation is easy: Use an array as a stack. Push new pages. When full, Pop the last element and Push the new one.";

    if (lowerQ.includes('example')) 
        return "Try the 'Example' button in the simulator above! It loads a sequence (7, 0, 1...) to demonstrate the behavior.";

    // Default response if no keywords match
    return "I am in Offline Mode. I can explain LIFO, its Pros/Cons, Stack structure, or Belady's Anomaly. What would you like to know?";
}

// --- 5. Chat UI Helpers ---

function addChatMessage(text, sender, isTyping = false) {
    const chatWindow = document.getElementById('chatWindow');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    // CHANGE IS HERE:
    if (sender === 'bot') {
        // Parse Markdown for Bot
        msgDiv.innerHTML = formatAIResponse(text);
    } else {
        // Keep User text plain (security)
        msgDiv.textContent = text;
    }
    if(isTyping) msgDiv.id = `typing-${Date.now()}`;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return msgDiv.id;
}

function updateChatMessage(elementId, newText) {
    const el = document.getElementById(elementId);
    if (el) {
        // Parse Markdown when updating the message
        el.innerHTML = formatAIResponse(newText);
    }
}

// Event Listeners
document.getElementById('sendChatBtn').addEventListener('click', () => askBot());
document.getElementById('userChatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') askBot();
});

// 4. Call Google Gemini API
// 4. Call Google Gemini API (Robust Multi-Model Fallback)
async function callGeminiAI(userPrompt) {
    let cleanKey = userApiKey.trim();
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
        cleanKey = cleanKey.slice(1, -1);
    }
    if (!cleanKey) throw new Error("API Key is empty.");

    // List of models to try in order of preference
    const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-pro" 
    ];

    const systemPrompt = "You are a helpful Computer Science Tutor specializing in Operating Systems. Keep answers concise (max 2-3 sentences). Explain concepts simply. The topic is LIFO Page Replacement.";

    let lastError = null;

    // Loop through models until one works
    for (const model of modelsToTry) {
        try {
            console.log(`Attempting AI call with model: ${model}...`);
            
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
            
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\nUser Question: ${userPrompt}` }]
                    }]
                })
            });

            if (!response.ok) {
                // If 404, it means this specific model isn't found. Throw to catch block and try next.
                if (response.status === 404) {
                    throw new Error(`Model ${model} not found (404)`);
                }
                // For other errors (like 400 invalid key), stop trying immediately.
                const errorText = await response.text();
                throw new Error(`Critical API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                return "I couldn't generate a response. Please try asking differently.";
            }

            // Success! Return the text.
            console.log(`Success with model: ${model}`);
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            console.warn(`Failed with ${model}:`, error.message);
            lastError = error;
            
            // If it's a critical error (not a 404), stop the loop and show user
            if (error.message.includes("Critical API Error")) {
                break;
            }
        }
    }

    // If loop finishes without returning, throw the last error
    throw new Error("Could not connect to AI. Please check your API Key permissions.");
}

// 5. Chat UI Helpers
function addChatMessage(text, sender, isTyping = false) {
    const chatWindow = document.getElementById('chatWindow');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    msgDiv.textContent = text;
    if(isTyping) msgDiv.id = `typing-${Date.now()}`;
    
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return msgDiv.id;
}

function updateChatMessage(elementId, newText) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = newText;
}

// Event Listeners
document.getElementById('sendChatBtn').addEventListener('click', () => askBot());
document.getElementById('userChatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') askBot();
});
// ==================== VOICE ASSISTANT ====================

// 1. Toggle Button Listener
document.getElementById("narrateBtn").addEventListener("click", () => {
    state.isNarrating = !state.isNarrating;
    const btn = document.getElementById("narrateBtn");
    
    // Update Button UI
    if (state.isNarrating) {
        btn.innerHTML = `<i class='bx bx-volume-full'></i><span>Narration: ON</span>`;
        btn.classList.replace('btn-secondary', 'btn-primary');
        speakText("Voice assistant enabled.");
    } else {
        btn.innerHTML = `<i class='bx bx-volume-mute'></i><span>Narration: OFF</span>`;
        btn.classList.replace('btn-primary', 'btn-secondary');
        speechSynthesis.cancel(); // Stop speaking immediately
    }
});

// 2. Speech Function
function speakText(text) {
    if (!state.isNarrating) return;

    // Stop any current speech to avoid overlapping
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster for better flow
    utterance.pitch = 1;
    utterance.volume = 1;
    
    speechSynthesis.speak(utterance);
}
// ==================== INITIALIZATION ====================
function init() {
    setupEventListeners();
    setupKeyboardShortcuts();
}

function setupEventListeners() {
    // Tab switching
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Input controls
    elements.randomBtn.addEventListener('click', generateRandomString);
    elements.exampleBtn.addEventListener('click', loadExampleString);
    elements.loadBtn.addEventListener('click', loadAndValidate);
    elements.resetBtn.addEventListener('click', resetSimulator);

    // Playback controls
    elements.startBtn.addEventListener('click', startSimulation);
    elements.prevBtn.addEventListener('click', previousStep);
    elements.nextBtn.addEventListener('click', nextStep);
    elements.playBtn.addEventListener('click', startAutoPlay);
    elements.pauseBtn.addEventListener('click', pauseAutoPlay);

    // Speed selection
    elements.speedBtns.forEach(btn => {
        btn.addEventListener('click', () => setSpeed(btn));
    });

    document.getElementById('exportPDF').addEventListener('click', generatePDFReport);

    document.getElementById('themeSelect').addEventListener('change', (e) => {
    applyTheme(e.target.value);
});
}

function applyTheme(themeName) {
    currentTheme = themeName;
    
    // 1. Remove all previous theme classes
    document.body.classList.remove('theme-matrix', 'theme-sunset', 'theme-neon', 'theme-pastel');
    
    // 2. Add new class (if not default)
    if (themeName !== 'default') {
        document.body.classList.add(`theme-${themeName}`);
    }

    // 3. Update Chart Colors immediately
    if (myChart) {
        const colors = themeColors[themeName];
        myChart.data.datasets[0].borderColor = colors.line;
        myChart.data.datasets[0].backgroundColor = colors.bg;
        myChart.options.scales.y.title.color = colors.line;
        
        // Re-calculate bar colors based on history
        updateChart(); 
        
        // Force full re-render for axis color changes
        myChart.update();
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (!state.isLoaded) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                previousStep();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextStep();
                break;
            case ' ':
                e.preventDefault();
                if (state.isPlaying) {
                    pauseAutoPlay();
                } else {
                    startAutoPlay();
                }
                break;
        }
    });
}



// ==================== TAB MANAGEMENT ====================
function switchTab(tabId) {
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
}

// ==================== INPUT HANDLING ====================
function generateRandomString() {
    const length = Math.floor(Math.random() * 6) + 8; // 8-13 numbers
    const maxPage = 9;
    const randomPages = [];
    
    for (let i = 0; i < length; i++) {
        randomPages.push(Math.floor(Math.random() * maxPage));
    }
    
    elements.refStringInput.value = randomPages.join(' ');
    showAlert('Random reference string generated!', 'info');
}

function loadExampleString() {
    elements.refStringInput.value = '7 0 1 2 0 3 0 4';
    elements.framesInput.value = '3';
    showAlert('Example loaded: 7 0 1 2 0 3 0 4 with 3 frames', 'info');
}

function loadAndValidate() {
    // Get and validate frames
    const framesValue = parseInt(elements.framesInput.value);
    if (isNaN(framesValue) || framesValue < 1 || framesValue > 10) {
        showAlert('Please enter a valid number of frames (1-10)', 'error');
        return;
    }

    // Get and validate reference string
    const refString = elements.refStringInput.value.trim();
    if (!refString) {
        showAlert('Please enter a reference string', 'error');
        return;
    }

    // Parse reference string
    const pages = refString.split(/[\s,]+/).map(s => s.trim()).filter(s => s !== '');
    
    // Check for non-numeric values
    for (let i = 0; i < pages.length; i++) {
        if (!/^\d+$/.test(pages[i])) {
            showAlert(`Invalid value "${pages[i]}" in reference string. Please use numbers only.`, 'error');
            return;
        }
    }

    const numericPages = pages.map(p => parseInt(p));

    // Store validated values
    state.frames = framesValue;
    state.referenceString = numericPages;
    state.isLoaded = true;

    // Build state history
    buildStateHistory();

    // Render initial state
    renderTable();
    renderStack([]);
    renderStats();
    clearLog();
    initChart();

    // Enable controls
    elements.startBtn.disabled = false;
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;
    elements.playBtn.disabled = true;
    elements.pauseBtn.disabled = true;

    showAlert(`Loaded successfully! ${numericPages.length} pages with ${framesValue} frames. Click "Start" to begin.`, 'success');
}

function resetSimulator() {
    pauseAutoPlay();
    
    state.referenceString = [];
    state.stateHistory = [];
    state.currentStep = -1;
    state.isLoaded = false;
    state.totalHits = 0;
    state.totalFaults = 0;

    // Reset inputs
    elements.refStringInput.value = '';
    elements.framesInput.value = '3';

    // Reset displays
    elements.tableWrapper.innerHTML = `
        <div class="placeholder-message">
            <i class='bx bx-loader-alt'></i>
            <p>Load a reference string to begin simulation</p>
        </div>
    `;
    
    elements.stackContainer.innerHTML = `
        <div class="placeholder-message">
            <i class='bx bx-layer'></i>
            <p>Stack will appear here</p>
        </div>
    `;
    
    elements.logContainer.innerHTML = `
        <div class="placeholder-message">
            <i class='bx bx-message-square-detail'></i>
            <p>Actions will be logged here during simulation</p>
        </div>
    `;

    // Reset stats
    elements.totalHits.textContent = '0';
    elements.totalFaults.textContent = '0';
    elements.currentStep.textContent = '0';
    elements.totalSteps.textContent = '0';
    elements.hitRatio.textContent = '0%';

    // Disable controls
    elements.startBtn.disabled = true;
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;
    elements.playBtn.disabled = true;
    elements.pauseBtn.disabled = true;

    showAlert('Simulator reset. Enter new values to begin.', 'info');

    // NEW: Destroy chart
    if (myChart) {
        myChart.destroy();
        myChart = null;
    }
}

// ==================== LIFO ALGORITHM CORE ====================
function buildStateHistory() {
    state.stateHistory = [];
    state.totalHits = 0;
    state.totalFaults = 0;

    let frames = new Array(state.frames).fill(null);
    // NEW: Track age of pages in frames
    let frameAges = new Array(state.frames).fill(0); 
    let stack = []; 

    for (let i = 0; i < state.referenceString.length; i++) {
        const page = state.referenceString[i];
        
        // NEW: Increment age for all occupied frames at the start of the step
        frameAges = frameAges.map((age, index) => frames[index] !== null ? age + 1 : 0);

        let stepData = {
            step: i + 1,
            page: page,
            frames: [...frames],
            frameAges: [...frameAges], // Save snapshot of ages
            stack: JSON.parse(JSON.stringify(stack)), 
            isHit: false,
            isFault: false,
            replacedPage: null,
            replacedIndex: -1,
            newPageIndex: -1
        };

        const pageIndex = frames.indexOf(page);
        
        if (pageIndex !== -1) {
            // HIT
            stepData.isHit = true;
            state.totalHits++;
            // LIFO typically does NOT reset age on hit (unlike LRU)
        } else {
            // FAULT
            stepData.isFault = true;
            state.totalFaults++;

            const emptyIndex = frames.indexOf(null);
            
            if (emptyIndex !== -1) {
                // Fill empty frame
                frames[emptyIndex] = page;
                stack.push(page);
                stepData.newPageIndex = emptyIndex;
                // NEW: Reset age for new page
                frameAges[emptyIndex] = 0;
            } else {
                // Replacement
                const pageToReplace = stack.pop();
                const replaceIndex = frames.indexOf(pageToReplace);
                
                stepData.replacedPage = pageToReplace;
                stepData.replacedIndex = replaceIndex;
                
                frames[replaceIndex] = page;
                stack.push(page);
                stepData.newPageIndex = replaceIndex;
                // NEW: Reset age for new page
                frameAges[replaceIndex] = 0;
            }

            stepData.frames = [...frames];
            stepData.stack = [...stack];
            // NEW: Update stepData with the modified ages after changes
            stepData.frameAges = [...frameAges];
        }

        state.stateHistory.push(stepData);
    }
}

// ==================== SIMULATION CONTROL ====================
function startSimulation() {
    if (!state.isLoaded) {
        showAlert('Please load a reference string first', 'error');
        return;
    }

    state.currentStep = 0;
    
    // Enable navigation
    elements.startBtn.disabled = true;
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = state.stateHistory.length <= 1;
    elements.playBtn.disabled = false;
    elements.pauseBtn.disabled = true;

    // Render first step
    renderCurrentStep();
    clearLog();
    addLogEntry(state.stateHistory[0]);
}

function nextStep() {
    if (state.currentStep >= state.stateHistory.length - 1) return;
    
    state.currentStep++;
    renderCurrentStep();
    addLogEntry(state.stateHistory[state.currentStep]);
    updateNavigationButtons();
}

function previousStep() {
    if (state.currentStep <= 0) return;
    
    state.currentStep--;
    renderCurrentStep();
    updateLogHighlight();
    updateNavigationButtons();
}

function startAutoPlay() {
    if (state.currentStep >= state.stateHistory.length - 1) {
        // Reset to beginning if at end
        state.currentStep = -1;
        clearLog();
    }

    state.isPlaying = true;
    elements.playBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;

    state.playInterval = setInterval(() => {
        if (state.currentStep >= state.stateHistory.length - 1) {
            pauseAutoPlay();
            return;
        }
        
        state.currentStep++;
        renderCurrentStep();
        addLogEntry(state.stateHistory[state.currentStep]);
    }, state.speed);
}

function pauseAutoPlay() {
    state.isPlaying = false;
    
    if (state.playInterval) {
        clearInterval(state.playInterval);
        state.playInterval = null;
    }

    elements.playBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    updateNavigationButtons();
}

function setSpeed(btn) {
    elements.speedBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.speed = parseInt(btn.dataset.speed);

    // If playing, restart with new speed
    if (state.isPlaying) {
        clearInterval(state.playInterval);
        state.playInterval = setInterval(() => {
            if (state.currentStep >= state.stateHistory.length - 1) {
                pauseAutoPlay();
                return;
            }
            
            state.currentStep++;
            renderCurrentStep();
            addLogEntry(state.stateHistory[state.currentStep]);
        }, state.speed);
    }
}

function updateNavigationButtons() {
    elements.prevBtn.disabled = state.currentStep <= 0;
    elements.nextBtn.disabled = state.currentStep >= state.stateHistory.length - 1;
}

// ==================== RENDERING FUNCTIONS ====================
function renderTable() {
    const numSteps = state.referenceString.length;
    const numFrames = state.frames;

    let html = '<table class="frames-table">';
    
    // Header row with reference string
    html += '<thead><tr class="ref-row"><th>Page</th>';
    for (let i = 0; i < numSteps; i++) {
        html += `<th data-step="${i}">${state.referenceString[i]}</th>`;
    }
    html += '</tr></thead>';

    // Frame rows
    html += '<tbody>';
    for (let f = 0; f < numFrames; f++) {
        html += `<tr><th>Frame ${f + 1}</th>`;
        for (let s = 0; s < numSteps; s++) {
            html += `<td data-step="${s}" data-frame="${f}">-</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';

    elements.tableWrapper.innerHTML = html;
}

function renderCurrentStep() {
    if (state.currentStep < 0 || state.currentStep >= state.stateHistory.length) return;

    const currentData = state.stateHistory[state.currentStep];
    
    // Update table
    updateTableDisplay();
    
    // Update stack
    renderStack(currentData.stack);
    
    // Update stats
    renderStats();
    updateChart(); 
    // ==================== NEW: NARRATION LOGIC ====================
    if (state.isNarrating) {
        const page = currentData.page;
        
        if (currentData.isHit) {
            // HIT Logic
            speakText(`Page ${page} is already in memory. It is a Hit.`);
        } else {
            // FAULT Logic
            if (currentData.replacedPage !== null) {
                // Replacement occurred (LIFO)
                speakText(`Page ${page} requested. Memory full. Replacing page ${currentData.replacedPage} at the top of the stack.`);
            } else {
                // Empty frame available
                speakText(`Page ${page} requested. Fault. Loaded into an empty frame.`);
            }
        }
    }
}

function updateTableDisplay() {
    const table = elements.tableWrapper.querySelector('.frames-table');
    if (!table) return;

    // Reset all cells first
    const cells = table.querySelectorAll('td, th[data-step]');
    cells.forEach(cell => {
        cell.classList.remove('current-step', 'cell-hit', 'cell-fault', 'cell-replaced', 'cell-new');
        cell.style.backgroundColor = ''; 
        cell.style.color = '';
        cell.removeAttribute('title');
    });

    // Loop through ALL steps up to the current one to paint the history
    for (let s = 0; s <= state.currentStep; s++) {
        const stepData = state.stateHistory[s];
        
        // Highlight current step column header
        if (s === state.currentStep) {
            const currentStepCells = table.querySelectorAll(`[data-step="${s}"]`);
            currentStepCells.forEach(cell => cell.classList.add('current-step'));
        }

        // Process each frame for step 's'
        for (let f = 0; f < state.frames; f++) {
            const cell = table.querySelector(`td[data-step="${s}"][data-frame="${f}"]`);
            
            if (cell) {
                const frameValue = stepData.frames[f];
                cell.textContent = frameValue !== null ? frameValue : '-';

                // --- STALENESS VISUALIZATION LOGIC ---
                if (frameValue !== null) {
                    const age = stepData.frameAges ? stepData.frameAges[f] : 0;
                    
                    // Determine if this cell is part of an active event (Hit/Fault) at this specific step
                    const isHit = stepData.isHit && stepData.frames[f] === stepData.page;
                    const isNew = stepData.isFault && f === stepData.newPageIndex;
                    const isReplaced = stepData.isFault && f === stepData.replacedIndex && stepData.replacedPage !== null;

                    // Add Tooltip
                    cell.setAttribute('title', `Page ${frameValue} (Age: ${age} steps)`);

                    if (isHit || isNew || isReplaced) {
                        // ACTIVE EVENT: Use Standard Classes (Bright Colors)
                        if (isHit) cell.classList.add('cell-hit');
                        if (isNew) cell.classList.add('cell-fault', 'cell-new');
                        if (isReplaced) cell.classList.add('cell-replaced');
                    } else {
                        // IDLE STATE: Apply Staleness Color (Darkening Effect)
                        // Calculate darkness: 0 (new) to 1 (very old, capped at 10 steps)
                        const staleness = Math.min(age, 10) / 10; 
                        
                        // Background: Starts transparent, fades to dark slate
                        // r,g,b = 30, 41, 59 (This is the dark slate color)
                        // opacity = 0.2 base + up to 0.6 more based on staleness
                        cell.style.backgroundColor = `rgba(30, 41, 59, ${0.1 + (staleness * 0.7)})`;
                        
                        // Text: Fades slightly if very old
                        if (age > 5) {
                            cell.style.color = `rgba(241, 245, 249, ${1 - (staleness * 0.5)})`;
                        }
                    }
                }
            }
    }
}
}

// ==================== PDF EXPORT LOGIC ====================
function generatePDFReport() {
    // 1. Validation: Check if there is data to export
    if (!state.isLoaded || state.stateHistory.length === 0) {
        showAlert("No simulation data to export. Please run a simulation first.", "error");
        return;
    }

    // 2. Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // 3. Document Constants
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let finalY = 0; // Tracks vertical position

    // 4. Header Section
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text("LIFO Page Replacement Report", pageWidth / 2, 20, { align: "center" });

    // Timestamp
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, pageWidth / 2, 27, { align: "center" });

    // Divider Line
    doc.setDrawColor(200);
    doc.line(margin, 32, pageWidth - margin, 32);

    // 5. Configuration & Statistics Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Simulation Configuration", margin, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Reference String: ${state.referenceString.join(', ')}`, margin, 50);
    doc.text(`Total Frames: ${state.frames}`, margin, 56);

    // Stats Box
    const statsY = 62;
    doc.setFillColor(245, 247, 250); // Light gray box
    doc.roundedRect(margin, statsY, pageWidth - (margin * 2), 25, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Statistics Summary", margin + 5, statsY + 8);
    
    doc.setFont("helvetica", "normal");
    const total = state.totalHits + state.totalFaults;
    const ratio = total > 0 ? ((state.totalHits / total) * 100).toFixed(1) : 0;

    // Grid layout for stats inside the box
    doc.text(`Total Hits: ${state.totalHits}`, margin + 5, statsY + 18);
    doc.text(`Total Faults: ${state.totalFaults}`, margin + 60, statsY + 18);
    doc.text(`Hit Ratio: ${ratio}%`, margin + 120, statsY + 18);

    // 6. Detailed Table Generation
    const tableData = state.stateHistory.map(step => {
        // Format Frames: Replace nulls with dashes
        const frameStr = step.frames.map(f => f === null ? '-' : f).join(' | ');
        
        // Format Stack: Top element first
        const stackStr = [...step.stack].reverse().join(' -> ');
        
        // Format Status string
        let status = "FAULT";
        if (step.isHit) status = "HIT";
        else if (step.replacedPage !== null) status = `REPLACED ${step.replacedPage}`;

        return [
            step.step,
            step.page,
            frameStr,
            stackStr,
            status
        ];
    });

    // Generate AutoTable
    doc.autoTable({
        startY: statsY + 35,
        head: [['Step', 'Request', 'Frames State', 'Stack (Top -> Bottom)', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [124, 58, 237], // Matches your --accent-purple
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle',
            halign: 'center'
        },
        // Color coding rows based on Hit/Fault
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 4) {
                const status = data.cell.raw;
                if (status === 'HIT') {
                    data.cell.styles.textColor = [22, 163, 74]; // Green
                    data.cell.styles.fontStyle = 'bold';
                } else {
                    data.cell.styles.textColor = [239, 68, 68]; // Red
                }
            }
        },
        // Row background striping for readability
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        }
    });

    // 7. Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
        doc.text("LIFO Simulator Generated Report", margin, pageHeight - 10);
    }

    // 8. Save
    doc.save(`LIFO_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    
    // Optional: Show success alert
    showAlert("PDF Report generated successfully!", "success");
}
function renderStack(stack) {
    if (!stack || stack.length === 0) {
        elements.stackContainer.innerHTML = `
            <div class="placeholder-message">
                <i class='bx bx-layer'></i>
                <p>Stack is empty</p>
            </div>
        `;
        return;
    }

    // Display stack with top element first
    const reversedStack = [...stack].reverse();
    
    let html = '';
    reversedStack.forEach((item, index) => {
        const isTop = index === 0;
        html += `<div class="stack-item ${isTop ? 'top' : ''}">${item}</div>`;
    });

    elements.stackContainer.innerHTML = html;
}

function renderStats() {
    let hits = 0;
    let faults = 0;

    for (let i = 0; i <= state.currentStep && i < state.stateHistory.length; i++) {
        if (state.stateHistory[i].isHit) hits++;
        if (state.stateHistory[i].isFault) faults++;
    }

    elements.totalHits.textContent = hits;
    elements.totalFaults.textContent = faults;
    elements.currentStep.textContent = state.currentStep + 1;
    elements.totalSteps.textContent = state.stateHistory.length;

    const total = hits + faults;
    const ratio = total > 0 ? ((hits / total) * 100).toFixed(1) : 0;
    elements.hitRatio.textContent = `${ratio}%`;
}

function clearLog() {
    elements.logContainer.innerHTML = '';
}

function addLogEntry(stepData) {
    // Remove current highlight from all entries
    const allEntries = elements.logContainer.querySelectorAll('.log-entry');
    allEntries.forEach(entry => entry.classList.remove('current'));

    let message = `Page <strong>${stepData.page}</strong> requested. `;
    
    if (stepData.isHit) {
        message += `<span class="hit-text">HIT!</span> Page already in memory.`;
    } else {
        message += `<span class="fault-text">FAULT!</span> `;
        if (stepData.replacedPage !== null) {
            message += `Replaced page <strong>${stepData.replacedPage}</strong> (top of stack) in Frame ${stepData.newPageIndex + 1}.`;
        } else {
            message += `Loaded into empty Frame ${stepData.newPageIndex + 1}.`;
        }
    }

    const stackDisplay = stepData.stack.length > 0 
        ? `Stack: [${[...stepData.stack].reverse().join(' → ')}] (top → bottom)`
        : 'Stack: empty';

    const entry = document.createElement('div');
    entry.className = `log-entry ${stepData.isHit ? 'hit' : 'fault'} current`;
    entry.innerHTML = `
        <span class="log-step">${stepData.step}</span>
        <div class="log-content">
            <div class="log-message">${message}</div>
            <div class="log-stack">${stackDisplay}</div>
        </div>
    `;

    elements.logContainer.appendChild(entry);
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

function updateLogHighlight() {
    const allEntries = elements.logContainer.querySelectorAll('.log-entry');
    allEntries.forEach((entry, index) => {
        entry.classList.toggle('current', index === state.currentStep);
    });

    // Scroll to current entry
    const currentEntry = allEntries[state.currentStep];
    if (currentEntry) {
        currentEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ==================== ALERT SYSTEM ====================
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    
    let icon = 'bx-info-circle';
    if (type === 'error') icon = 'bx-error-circle';
    if (type === 'success') icon = 'bx-check-circle';

    alert.innerHTML = `
        <i class='bx ${icon}'></i>
        <div class="alert-content">${message}</div>
        <button class="alert-close"><i class='bx bx-x'></i></button>
    `;

    elements.alertContainer.appendChild(alert);

    // Close button handler
    alert.querySelector('.alert-close').addEventListener('click', () => {
        removeAlert(alert);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
        removeAlert(alert);
    }, 5000);
}

function removeAlert(alert) {
    alert.style.animation = 'alertSlideOut 0.3s ease forwards';
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 300);
}

function initChart() {
    const ctx = document.getElementById('hitRatioChart').getContext('2d');
    
    // Destroy existing chart if it exists (to prevent overlaps on reset)
    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Hit Ratio (%)',
                    data: [],
                    borderColor: '#06b6d4', // var(--accent-cyan)
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    borderWidth: 3,
                    tension: 0.3, // Smooth curves
                    yAxisID: 'y',
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    type: 'bar',
                    label: 'Event Type (1=Hit, -1=Fault)',
                    data: [],
                    backgroundColor: [], // Dynamic colors will be set in update
                    barPercentage: 0.5,
                    yAxisID: 'y1',
                    order: 2 // Render behind line
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8' } // var(--text-secondary)
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.type === 'bar') {
                                return context.raw === 1 ? 'Event: HIT' : 'Event: FAULT';
                            }
                            return `Hit Ratio: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#94a3b8' },
                    title: { display: true, text: 'Step', color: '#64748b' }
                },
                y: { // Left Axis (Percentage)
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#94a3b8', callback: (val) => val + '%' },
                    title: { display: true, text: 'Hit Ratio', color: '#06b6d4' }
                },
                y1: { // Right Axis (Hit/Fault Indicators)
                    display: false, // Hide the axis numbers, just show bars
                    min: -1.5,
                    max: 1.5
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function updateChart() {
    if (!myChart) return;

    const labels = [];
    const ratioData = [];
    const eventData = []; // 1 for Hit, -1 for Fault
    const eventColors = [];

    const colors = themeColors[currentTheme];

    let currentHits = 0;

    // Loop through history UP TO the current step
    for (let i = 0; i <= state.currentStep; i++) {
        const step = state.stateHistory[i];
        
        // Calculate dynamic Hit Ratio
        if (step.isHit) currentHits++;
        const ratio = ((currentHits / (i + 1)) * 100).toFixed(1);

        labels.push(step.step);
        ratioData.push(ratio);

        // Visualizing Hits vs Faults on the chart
        if (step.isHit) {
            eventData.push(1); // Positive bar for Hit
            // eventColors.push('rgba(22, 163, 74, 0.6)'); // Green
            eventColors.push(colors.hit); // Dynamic Color
        } else {
            eventData.push(-1); // Negative bar for Fault
            // eventColors.push('rgba(239, 68, 68, 0.6)'); // Red
             eventColors.push(colors.fault); // Dynamic Color
        }
    }

    // Update Chart Data
    myChart.data.labels = labels;
    myChart.data.datasets[0].data = ratioData; // Line
    myChart.data.datasets[1].data = eventData; // Bars
    myChart.data.datasets[1].backgroundColor = eventColors;
    
    // Update Point Colors for the Line to match Hit/Fault
    myChart.data.datasets[0].pointBackgroundColor = eventColors.map(c => c.replace('0.6', '1'));

    myChart.update('none'); // 'none' mode prevents animation lag during autoplay
}

function formatAIResponse(text) {
    if (!text) return "";

    // 1. Sanitize (Basic security to prevent HTML injection)
    let formatted = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 2. Format Code Blocks (Triple backticks ```cpp ... ```)
    formatted = formatted.replace(/```(\w*)([\s\S]*?)```/g, function(match, lang, code) {
        return `<div class="code-block">${code.trim()}</div>`;
    });

    // 3. Format Inline Code (Single backticks `code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');

    // 4. Format Bold (**text**)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    return formatted;
}

// ==================== DEMO STACK (Explanation Tab) ====================
let demoStackValue = 3;

window.demoPush = function() {
    const demoStack = document.getElementById('demoStack');
    if (!demoStack) return;
    
    demoStackValue++;
    
    // Remove 'top' class from current top
    const currentTop = demoStack.querySelector('.top');
    if (currentTop) currentTop.classList.remove('top');
    
    // Create new item
    const newItem = document.createElement('div');
    newItem.className = 'demo-stack-item top';
    newItem.textContent = demoStackValue;
    
    // Insert at beginning (top)
    demoStack.insertBefore(newItem, demoStack.firstChild);
};

window.demoPop = function() {
    const demoStack = document.getElementById('demoStack');
    if (!demoStack) return;
    
    const items = demoStack.querySelectorAll('.demo-stack-item');
    if (items.length <= 1) {
        showAlert('Cannot pop - stack must have at least one item!', 'error');
        return;
    }
    
    // Animate and remove top item
    const topItem = items[0];
    topItem.style.animation = 'slideOut 0.3s ease forwards';
    
    setTimeout(() => {
        topItem.remove();
        // Mark new top
        const newItems = demoStack.querySelectorAll('.demo-stack-item');
        if (newItems.length > 0) {
            newItems[0].classList.add('top');
        }
    }, 300);
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', init);
