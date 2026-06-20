// =========================================================================
// HYDRASYNC OPERATIONAL CONTROL LOGIC - HARDWARE INTELLIGENT & FIXED LOCATION
// =========================================================================

let userData = {
    name: "",
    phone: "",
    age: 20,
    gender: "male",
    weight: 60,
    height: 170,
    calculatedBaseTarget: 2000
};

let totalPoints = 0;
let isWheelSpinning = false;
let wheelCurrentRotationAngle = 0;
let totalDispensedVolumeML = 0.0;

let sipTimestampsArray = []; 
let currentGraphViewMode = "daily"; 
let globalTelemetryChartInstance = null;

let serialPort = null;
let serialReader = null;

const analyticalGraphData = {
    daily: {
        labels: ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "Now"],
        consumed: [300, 600, 1100, 1400, 1400, 1800, 0], 
        targets: [250, 600, 1000, 1300, 1600, 1900, 2000]
    },
    weekly: {
        labels: ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Today"],
        consumed: [2100, 2400, 1950, 2200, 2600, 1800, 0], 
        targets: [2000, 2000, 2000, 2000, 2000, 2000, 2000]
    }
};

const masterFluidRecipes = [
    {
        id: "rec-1",
        title: "Fresh Citrus Mint Water",
        window: "Mid-Morning",
        desc: "Freshly squeezed lime slices mixed with fresh mint leaves. Great for beating exhaustion.",
        badge: "Rich in Electrolytes",
        badgeStyle: "",
        image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
        allergens: ["citrus", "mint"]
    },
    {
        id: "rec-2",
        title: "Crisp Cucumber Basil Cooler",
        window: "Hot Afternoons",
        desc: "Chilled cucumber ribbons paired with sweet basil leaves steeped in fresh clean water.",
        badge: "Super Refreshing",
        badgeStyle: "accent-pink-badge",
        image: "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80",
        allergens: []
    },
    {
        id: "rec-3",
        title: "Honey Ginger Morning Starter",
        window: "Early Morning",
        desc: "Warm water infused with freshly grated ginger root and a spoonful of organic honey.",
        badge: "Boosts Digestion",
        badgeStyle: "accent-orange-badge",
        image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
        allergens: ["ginger"]
    },
    {
        id: "rec-4",
        title: "Mixed Berry Antioxidant Blast",
        window: "Evening Refreshment",
        desc: "Crushed sweet blueberries and sliced strawberries left to infuse in cool alkaline water.",
        badge: "Antioxidant Loaded",
        badgeStyle: "accent-green-badge",
        image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=600&q=80",
        allergens: ["berries"]
    }
];

const masterWaterFruits = [
    {
        id: "fr-1",
        title: "Juicy Sweet Watermelon",
        yield: "92% Pure Water",
        desc: "One of the best hydrating foods available. Tastes delicious and cools you down instantly.",
        badgeStyle: "",
        image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
        allergens: []
    },
    {
        id: "fr-2",
        title: "Tangy Pineapple Slices",
        yield: "87% Pure Water",
        desc: "Fresh, golden wedges rich in fluid density and bromelain context to soothe muscles.",
        badgeStyle: "accent-purple-badge",
        image: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80",
        allergens: ["pineapple"]
    },
    {
        id: "fr-3",
        title: "Fresh Orange Segments",
        yield: "88% Pure Water",
        desc: "Packed with vitamin C and vital fruit sugars that help your body retain fluids longer.",
        badgeStyle: "accent-pink-badge",
        image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=600&q=80",
        allergens: ["citrus"]
    }
];

const marketplaceCatalog = [
    { cost: 50, title: "Canteen Hot Tea/Coffee Voucher", text: "Redeemable for 1 hot cup of coffee or chai at any college canteen counter.", icon: "fa-mug-hot" },
    { cost: 150, title: "Custom Stainless Steel Straw Kit", text: "Comes with a metallic straw and an eco-friendly cleaning brush cleaner.", icon: "fa-seedling" },
    { cost: 300, title: "Free Canteen Breakfast Pass", text: "Enjoy a complimentary morning breakfast combo plate at the central cafeteria.", icon: "fa-utensils" },
    { cost: 600, title: "Premium Insulated Travel Tote Sleeve", text: "A handy insulated carry bag with a built-in cross-body strap to securely carry your water bottle.", icon: "fa-bag-shopping" },
    { cost: 1200, title: "Official Gym Shaker Bottle Upgrade", text: "Trade tokens for a professional high-capacity shake bottle with an alloy mixing wire ball.", icon: "fa-bottle-water" },
    { cost: 2500, title: "Official College Hoodie Discount", text: "Gives you a massive 40% discount on official student athletic winter hoodies.", icon: "fa-shirt" },
    { cost: 5000, title: "Ultimate Campus Star Pass", text: "Includes a ₹1500 canteen cash card, free printing logs, and a premium insulated steel gym bottle.", icon: "fa-crown" }
];

const wheelSegments = [
    { label: "20 Pts", color: "#0284c7", value: 20 },
    { label: "50 Pts", color: "#64748b", value: 50 },
    { label: "100 Pts", color: "#0d9488", value: 100 },
    { label: "250 Pts", color: "#cbd5e1", value: 250 },
    { label: "500 Pts", color: "#7c3aed", value: 500 },
    { label: "0 Pts", color: "#ef4444", value: 0 }
];

// --- LIVE WEATHER ENGINE (FIXED TO DSCE CAMPUS) ---
async function fetchLiveLocationAndWeather() {
    const iconEl = document.getElementById('weather-status-icon');
    const tempEl = document.getElementById('current-temp');
    const condEl = document.getElementById('current-condition');
    const locEl = document.getElementById('current-location');

    // Locked Coordinates for Dayananda Sagar College of Engineering (DSCE)
    const lat = "12.91";
    const lon = "77.57";
    
    try {
        // Fetch live weather data directly using DSCE coordinates
        const response = await fetch(`https://wttr.in/${lat},${lon}?format=j1`);
        if (!response.ok) throw new Error("API Failure");
        const data = await response.json();
        
        const currentTemp = data.current_condition[0].temp_C;
        const weatherDesc = data.current_condition[0].weatherDesc[0].value;

        // Update UI elements instantly with real data
        tempEl.innerText = `${currentTemp}°C`;
        condEl.innerText = weatherDesc;
        locEl.innerHTML = `<i class="fas fa-location-dot"></i> DSCE Campus, Bengaluru`;
        
        // Dynamic icon swap based on temperature threshold values
        iconEl.className = parseInt(currentTemp) > 28 ? "fas fa-fire weather-icon" : "fas fa-cloud-sun weather-icon";
        
        // Auto-recalibrate target benchmarks dynamically if the campus is experiencing hot days
        if(parseInt(currentTemp) > 30) {
            userData.calculatedBaseTarget += 300; 
            updateVisualMetricsProgressGauges();
        }
    } catch (err) {
        fallbackStaticWeather("Data offline");
    }
}

function fallbackStaticWeather(reason) {
    document.getElementById('weather-status-icon').className = "fas fa-sun weather-icon";
    document.getElementById('current-temp').innerText = "28°C";
    document.getElementById('current-condition').innerText = `Sunny (${reason})`;
    document.getElementById('current-location').innerHTML = `<i class="fas fa-location-dot"></i> DSCE Campus, Bengaluru`;
}

function navigateToTab(targetViewId, clickedTabElement) {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active-view'));
    document.querySelectorAll('.nav-item').forEach(tab => tab.classList.remove('active'));
    
    const targetElement = document.getElementById(targetViewId);
    if (targetElement) targetElement.classList.add('active-view');
    if (clickedTabElement) clickedTabElement.classList.add('active');
    
    if (targetViewId === 'water-tracker') {
        setTimeout(renderLongitudinalIntakeGraph, 50);
    }
    if (targetViewId === 'recipes-fruits') {
        evaluateAllergyFilters();
    }
    if (targetViewId === 'rewards-ledger') {
        setTimeout(() => {
            drawCanvasWheelGraphics();
            renderMarketplaceCatalog();
        }, 50);
    }
}

function switchTab(tabName, event) {
    if (event) event.stopPropagation();
    const container = document.getElementById('recipes-fruits');
    if (!container) return;
    
    container.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-content'));
    container.querySelectorAll('.tab-selector').forEach(el => el.classList.remove('active'));
    
    if (tabName === 'recipes') {
        document.getElementById('recipes-content').classList.add('active-content');
    } else {
        document.getElementById('fruits-content').classList.add('active-content');
    }
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

function handleRegistration() {
    userData.name = document.getElementById('reg-name').value.trim();
    userData.phone = document.getElementById('reg-phone').value.trim();
    userData.age = parseInt(document.getElementById('reg-age').value) || 20;
    userData.gender = document.getElementById('reg-gender').value;
    userData.weight = parseFloat(document.getElementById('reg-weight').value) || 60;
    userData.height = parseFloat(document.getElementById('reg-height').value) || 170;

    let baseline = userData.weight * 35;
    if (userData.gender === 'male') baseline += 250;
    userData.calculatedBaseTarget = Math.round(baseline);

    document.getElementById('prof-name').innerText = userData.name;
    document.getElementById('prof-phone').innerText = userData.phone;
    document.getElementById('prof-gender').innerText = userData.gender.toUpperCase();
    document.getElementById('prof-age').innerText = userData.age;
    document.getElementById('prof-weight').innerText = userData.weight;
    document.getElementById('prof-height').innerText = userData.height;
    document.getElementById('prof-target').innerText = (userData.calculatedBaseTarget / 1000).toFixed(2);

    analyticalGraphData.daily.targets[6] = userData.calculatedBaseTarget;
    analyticalGraphData.weekly.targets[6] = userData.calculatedBaseTarget;

    document.getElementById('auth-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    
    updateVisualMetricsProgressGauges();
    generatePremiumSuggestions();
}

function generatePremiumSuggestions() {
    const exercise = document.getElementById('survey-exercise').value;
    const symptoms = document.getElementById('survey-symptoms').value;
    let runtimeTarget = userData.calculatedBaseTarget;

    if (exercise === 'light') runtimeTarget += 350;
    if (exercise === 'moderate') runtimeTarget += 500;
    if (exercise === 'intense') runtimeTarget += 750;

    if (symptoms === 'headache' || symptoms === 'dry-mouth') runtimeTarget += 400;

    document.getElementById('intake-target').innerHTML = `${(runtimeTarget / 1000).toFixed(2)} <span class="unit-lbl">Liters</span>`;
    
    const adviceField = document.getElementById('fruit-suggestion');
    if (symptoms === 'none') {
        adviceField.innerText = "Everything looks good! Keep following your usual water goals today.";
    } else if (symptoms === 'headache' || symptoms === 'dry-mouth') {
        adviceField.innerText = "Your body is showing early signs of dehydration. Please sip some water mixed with citrus slices immediately!";
    } else {
        adviceField.innerText = "Feeling fatigued? Try drinking fruit infused water to boost your energy levels.";
    }
    
    userData.calculatedBaseTarget = runtimeTarget;
    analyticalGraphData.daily.targets[6] = runtimeTarget;
    analyticalGraphData.weekly.targets[6] = runtimeTarget;
    updateVisualMetricsProgressGauges();
}

function processIncomingHardwareTelemetry(volumeML) {
    totalDispensedVolumeML += volumeML;
    
    const now = new Date();
    sipTimestampsArray.push(now);
    
    analyticalGraphData.daily.consumed[6] = totalDispensedVolumeML;
    analyticalGraphData.weekly.consumed[6] = totalDispensedVolumeML;
    
    let calculatedRewardTokens = Math.floor((volumeML / 1000) * 10);
    totalPoints += calculatedRewardTokens;
    
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const finalFormattedString = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    document.getElementById('last-consumption-timestamp').innerText = `${volumeML} mL logged at ${finalFormattedString}`;
    
    calculateDrinkingFrequencyAndStatus();
    syncPointsAcrossPanels();
    updateVisualMetricsProgressGauges();
    if (globalTelemetryChartInstance) renderLongitudinalIntakeGraph();
}

function calculateDrinkingFrequencyAndStatus() {
    if (sipTimestampsArray.length === 0) return;
    
    const firstSip = sipTimestampsArray[0];
    const lastSip = sipTimestampsArray[sipTimestampsArray.length - 1];
    const durationHours = Math.max((lastSip - firstSip) / (1000 * 60 * 60), 0.25); 
    const frequencyRate = (sipTimestampsArray.length / durationHours).toFixed(1);
    
    document.getElementById('frequency-text').innerText = `${frequencyRate} sips / hour`;
    
    const badge = document.getElementById('health-status-badge');
    const msg = document.getElementById('health-status-message');
    const progressRatio = totalDispensedVolumeML / userData.calculatedBaseTarget;
    
    if (progressRatio < 0.35) {
        badge.innerText = "Dehydrated State";
        badge.className = "analysis-header-badge status-danger";
        msg.innerText = "Warning: Your water levels are too low for this time of day. Drink a full glass of water soon.";
    } else if (progressRatio >= 0.35 && progressRatio < 0.85) {
        badge.innerText = "Steady Progress";
        badge.className = "analysis-header-badge status-warn";
        msg.innerText = "You are on the right track! Keep sipping steadily from your smart bottle to reach your goal.";
    } else {
        badge.innerText = "Perfect Hydration";
        badge.className = "analysis-header-badge status-good";
        msg.innerText = "Wonderful job! Your body is beautifully hydrated. You have achieved your targets.";
    }
}

function toggleGraphViewMode(mode) {
    currentGraphViewMode = mode;
    document.getElementById('btn-chart-daily').classList.remove('active');
    document.getElementById('btn-chart-weekly').classList.remove('active');
    
    if (mode === 'daily') {
        document.getElementById('btn-chart-daily').classList.add('active');
    } else {
        document.getElementById('btn-chart-weekly').classList.add('active');
    }
    renderLongitudinalIntakeGraph();
}

function renderLongitudinalIntakeGraph() {
    const canvasContext = document.getElementById('historicalLongitudinalChart');
    if (!canvasContext) return;

    if (globalTelemetryChartInstance) globalTelemetryChartInstance.destroy();
    
    const dataSetSource = analyticalGraphData[currentGraphViewMode];

    globalTelemetryChartInstance = new Chart(canvasContext, {
        type: 'line',
        data: {
            labels: dataSetSource.labels,
            datasets: [
                {
                    label: 'Water Consumed (mL)',
                    data: dataSetSource.consumed,
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.05)',
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3,
                    pointBackgroundColor: '#0284c7'
                },
                {
                    label: 'Your Target Boundary (mL)',
                    data: dataSetSource.targets,
                    borderColor: '#0d9488',
                    borderDash: [5, 5],
                    tension: 0,
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { weight: '600' }, color: '#1e293b' } } },
            scales: {
                x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
                y: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' }, beginAtZero: true }
            }
        }
    });
}

function evaluateAllergyFilters() {
    const checkedBoxes = document.querySelectorAll('.allergy-checkbox-grid input:checked');
    const selectedAllergens = Array.from(checkedBoxes).map(box => box.value);
    
    const recipesGrid = document.getElementById('recipes-rendering-grid');
    const fruitsGrid = document.getElementById('fruits-rendering-grid');
    
    if(!recipesGrid || !fruitsGrid) return;
    
    let filteredRecipes = masterFluidRecipes.filter(item => !item.allergens.some(a => selectedAllergens.includes(a)));
    let filteredFruits = masterWaterFruits.filter(item => !item.allergens.some(a => selectedAllergens.includes(a)));
    
    recipesGrid.innerHTML = filteredRecipes.map(item => `
        <div class="item-card-premium">
            <div class="img-frame">
                <div class="nutrient-tag-badge ${item.badgeStyle}">${item.badge}</div>
                <img src="${item.image}" alt="${item.title}">
            </div>
            <div class="item-info">
                <h3>${item.title}</h3>
                <p class="consume-method"><i class="fas fa-clock"></i> Best Time: ${item.window}</p>
                <p class="desc">${item.desc}</p>
            </div>
        </div>
    `).join('');
    
    fruitsGrid.innerHTML = filteredFruits.map(item => `
        <div class="item-card-premium">
            <div class="img-frame">
                <div class="nutrient-tag-badge ${item.badgeStyle}">${item.yield}</div>
                <img src="${item.image}" alt="${item.title}">
            </div>
            <div class="item-info">
                <h3>${item.title}</h3>
                <p class="consume-method"><i class="fas fa-heart"></i> Great Hydration Snack</p>
                <p class="desc">${item.desc}</p>
            </div>
        </div>
    `).join('');
}

function drawCanvasWheelGraphics() {
    const canvas = document.getElementById('wheel-canvas-element');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const center = width / 2;
    const numSegments = wheelSegments.length;
    const arcAngle = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, width, width);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(wheelCurrentRotationAngle);

    for (let i = 0; i < numSegments; i++) {
        const seg = wheelSegments[i];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, center - 10, i * arcAngle, (i + 1) * arcAngle);
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "right";
        ctx.rotate(i * arcAngle + arcAngle / 2);
        ctx.fillText(seg.label, center - 25, 5);
        ctx.restore();
    }
    ctx.restore();
}

function executeArcadeWheelSpin() {
    if (isWheelSpinning) return;
    isWheelSpinning = true;
    
    const msg = document.getElementById('wheel-status-msg');
    if (msg) msg.innerText = "Spinning the prize wheel items...";

    const selectedIndex = Math.floor(Math.random() * wheelSegments.length);
    const numSegments = wheelSegments.length;
    const arcSizeRad = (2 * Math.PI) / numSegments;
    
    const baseTargetRotation = (1.5 * Math.PI) - (selectedIndex * arcSizeRad) - (arcSizeRad / 2);
    const multiSpinRotation = baseTargetRotation + (8 * Math.PI); 
    
    let startTimestamp = null;
    const spinDuration = 3000; 

    function animationStep(currentTimestamp) {
        if (!startTimestamp) startTimestamp = currentTimestamp;
        const progress = currentTimestamp - startTimestamp;
        const completeRatio = Math.min(progress / spinDuration, 1);
        
        const easeOutFactor = 1 - Math.pow(1 - completeRatio, 3);
        wheelCurrentRotationAngle = easeOutFactor * multiSpinRotation;
        
        drawCanvasWheelGraphics();

        if (progress < spinDuration) {
            requestAnimationFrame(animationStep);
        } else {
            isWheelSpinning = false;
            wheelCurrentRotationAngle = (wheelCurrentRotationAngle % (2 * Math.PI));
            
            const finalPayout = wheelSegments[selectedIndex];
            totalPoints += finalPayout.value;
            syncPointsAcrossPanels();
            if (msg) {
                msg.innerText = `The wheel stopped! You won +${finalPayout.value} tokens! [Result: ${finalPayout.label}]`;
            }
        }
    }
    requestAnimationFrame(animationStep);
}

function renderMarketplaceCatalog() {
    const storeGrid = document.getElementById('marketplace-rendering-grid');
    if (!storeGrid) return;
    
    storeGrid.innerHTML = marketplaceCatalog.map(item => `
        <div class="store-item-card">
            <div class="store-icon-box"><i class="fas ${item.icon}"></i></div>
            <div class="store-details">
                <h3>${item.title}</h3>
                <p>${item.text}</p>
                <button onclick="purchaseRewardItem(${item.cost}, '${item.title}')" class="btn-purchase-reward">${item.cost} Tokens</button>
            </div>
        </div>
    `).join('');
}

function purchaseRewardItem(costAmount, rewardItemLabel) {
    if (totalPoints < costAmount) {
        alert(`Oops! You need ${costAmount} tokens in your wallet balance to purchase this asset.`);
        return;
    }
    totalPoints -= costAmount;
    syncPointsAcrossPanels();
    
    const secureRandomCouponId = "ORDER-" + Math.random().toString(36).substr(2, 7).toUpperCase();
    alert(`Success! Redeemed: "${rewardItemLabel}"\n\nYour Unique Order Reference: ${secureRandomCouponId}\nBring your smartphone dashboard here to pick up your upgrade.`);
}

function resetPoints() {
    totalPoints = 0;
    totalDispensedVolumeML = 0;
    sipTimestampsArray = [];
    analyticalGraphData.daily.consumed[6] = 0;
    analyticalGraphData.weekly.consumed[6] = 0;
    syncPointsAcrossPanels();
    updateVisualMetricsProgressGauges();
    
    document.getElementById('last-consumption-timestamp').innerText = "Waiting for first sip... ";
    document.getElementById('frequency-text').innerText = "0 times / hour";
    document.getElementById('health-status-message').innerText = "Please take your first drink through your smart bottle to evaluate your hydration curve.";
    document.getElementById('health-status-badge').className = "analysis-header-badge status-good";
    document.getElementById('health-status-badge').innerText = "Analyzing Status...";
    
    if (globalTelemetryChartInstance) renderLongitudinalIntakeGraph();
}

function syncPointsAcrossPanels() {
    if (document.getElementById('panel-points')) document.getElementById('panel-points').innerText = totalPoints;
    if (document.getElementById('arcade-points-display')) document.getElementById('arcade-points-display').innerText = totalPoints;
}

function updateVisualMetricsProgressGauges() {
    const percentage = Math.min(Math.round((totalDispensedVolumeML / userData.calculatedBaseTarget) * 100), 100);
    if (document.getElementById('gauge-consumed-text')) document.getElementById('gauge-consumed-text').innerText = Math.round(totalDispensedVolumeML);
    if (document.getElementById('gauge-target-text')) document.getElementById('gauge-target-text').innerText = userData.calculatedBaseTarget;
    if (document.getElementById('gauge-percentage-value')) document.getElementById('gauge-percentage-value').innerText = `${percentage}%`;

    const degDegrees = (percentage / 100) * 360;
    const frame = document.getElementById('radial-progress-element');
    if (frame) frame.style.background = `conic-gradient(var(--accent-blue) ${degDegrees}deg, var(--border-color) ${degDegrees}deg)`;
}

function toggleFullscreenMode() {
    const icon = document.querySelector('.action-icon-btn i');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => { if (icon) icon.className = 'fas fa-compress'; });
    } else {
        document.exitFullscreen().then(() => { if (icon) icon.className = 'fas fa-expand'; });
    }
}

async function initiateHardwareSerialConnection() {
    const badge = document.getElementById('hardware-status-badge');
    if (!("serial" in navigator)) {
        alert("Web Serial features are not supported in this browser environment.");
        return;
    }
    try {
        badge.innerText = "Connecting...";
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 115200 });
        badge.innerText = "Bottle Connected";
        badge.className = "hw-badge hw-connected";
        document.getElementById('connect-serial-btn').style.display = "none";
        
        readHardwareStreamChannel();
    } catch (e) {
        badge.innerText = "Bottle Offline";
        badge.className = "hw-badge hw-disconnected";
    }
}

async function readHardwareStreamChannel() {
    while (serialPort.readable) {
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
        serialReader = textDecoder.readable.getReader();
        try {
            while (true) {
                const { value, done } = await serialReader.read();
                if (done) break;
                if (value) {
                    let numericVolumeValue = parseInt(value.replace(/[^0-9]/g, ""));
                    if (!isNaN(numericVolumeValue) && numericVolumeValue > 0) {
                        processIncomingHardwareTelemetry(numericVolumeValue);
                    }
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            serialReader.releaseLock();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Fire weather logic instantly for DSCE context
    fetchLiveLocationAndWeather();

    document.getElementById('profile-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('profile-dropdown').classList.toggle('hidden');
    });
    window.addEventListener('click', () => {
        document.getElementById('profile-dropdown').classList.add('hidden');
    });
});


// --- FIREBASE CONFIGURATION CONFIG ---
const FIREBASE_URL = "https://smart-bottle-8b605-default-rtdb.firebaseio.com/readings.json";

// --- MEMORY TRACKING CACHE FOR SIP DETECTION ---
let baselineWeight = null;
let currentTotalConsumed = 0;
let pollingIntervalTimer = null;
let isHardwareConnected = false;

/**
 * Replaces the old Web Serial API link. 
 * Connects to the cloud database and starts a polling sync framework.
 */
function initiateHardwareSerialConnection() {
    const statusBadge = document.getElementById("hardware-status-badge");
    const connectBtn = document.getElementById("connect-serial-btn");

    if (isHardwareConnected) {
        // Toggle Connection off if clicked again
        clearInterval(pollingIntervalTimer);
        isHardwareConnected = false;
        statusBadge.textContent = "Bottle Offline";
        statusBadge.className = "hw-badge hw-disconnected";
        connectBtn.innerHTML = '<i class="fas fa-wifi"></i> Connect Smart Bottle via Cloud Sync';
        return;
    }

    // Update UI status to actively tracking
    isHardwareConnected = true;
    statusBadge.textContent = "Live Cloud Syncing";
    statusBadge.className = "hw-badge hw-connected"; // Make sure your CSS accents this green/teal
    connectBtn.innerHTML = '<i class="fas fa-pause"></i> Disconnect Cloud Link';

    // Fetch instantly on click, then poll the REST endpoint cleanly every 3 seconds
    fetchBottleTelemetry();
    pollingIntervalTimer = setInterval(fetchBottleTelemetry, 3000);
}

/**
 * Pulls the clean overwriting JSON root node from the Firebase REST endpoint
 */
async function fetchBottleTelemetry() {
    try {
        const response = await fetch(FIREBASE_URL);
        if (!response.ok) throw new Error("Database server rejected requests");
        
        const data = await response.json();
        if (!data) return; // Database is empty or booting

        processCloudData(data);
    } catch (error) {
        console.error("HydraSync Cloud Fetch Error:", error);
    }
}

/**
 * Evaluates changes in state to catch sips, log consumed water volume, and flash time changes
 */
function processCloudData(data) {
    const { currentWeight, hour, minute } = data;
    const timestampDisplay = document.getElementById("last-consumption-timestamp");

    // Initialize our calculation base if this is the first pull
    if (baselineWeight === null) {
        baselineWeight = currentWeight;
        return;
    }

    // Determine if water was consumed (Weight drop exceeds a noise floor filter of 5 grams)
    const weightDifference = baselineWeight - currentWeight;

    if (weightDifference > 5) {
        // Log individual sip metrics
        currentTotalConsumed += Math.round(weightDifference);
        
        // Format explicit timestamp layout
        const formattedHour = String(hour).padStart(2, '0');
        const formattedMinute = String(minute).padStart(2, '0');
        const finalTimeStr = `${formattedHour}:${formattedMinute}`;

        // --- UPDATE HTML NODES DYNAMICALLY ---
        timestampDisplay.textContent = `Sip of ${Math.round(weightDifference)} mL detected at ${finalTimeStr}`;
        timestampDisplay.classList.add("pulse-highlight"); // Optional visual pop look
        
        // Remove highlighting style class after text effect ends
        setTimeout(() => timestampDisplay.classList.remove("pulse-highlight"), 1000);

        // Cascade updates downstream to progress rings & charts
        updateHydrationDashboardProgress();
    } else if (weightDifference < -15) {
        // Bottle refilled: Reset calculations base to structural level cleanly without throwing an alert
        console.log(`Smart Bottle Refill Detected. New base set to: ${currentWeight}g`);
    }

    // Anchor baseline tracking to state
    baselineWeight = currentWeight;
}

/**
 * Handles cascading updates inside the remaining dashboard UI frameworks
 */
function updateHydrationDashboardProgress() {
    // Total Volume Counters text
    const consumedTextNode = document.getElementById("gauge-consumed-text");
    if (consumedTextNode) consumedTextNode.textContent = currentTotalConsumed;

    // Fetch defined user targets
    const targetTextNode = document.getElementById("gauge-target-text");
    const targetValue = targetTextNode ? parseInt(targetTextNode.textContent, 10) : 2000;

    // Calculate percent scalar bounds
    const progressPercent = Math.min(Math.round((currentTotalConsumed / targetValue) * 100), 100);
    
    const percentageValueNode = document.getElementById("gauge-percentage-value");
    if (percentageValueNode) percentageValueNode.textContent = `${progressPercent}%`;

    // Conic gradient frame updates
    const radialElement = document.getElementById("radial-progress-element");
    if (radialElement) {
        radialElement.style.background = `conic-gradient(var(--primary-blue, #0072ff) ${progressPercent * 3.6}deg, #334155 0deg)`;
    }
}
