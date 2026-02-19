// chart-renderer.js
module.paths.push('/home/debix/.node-red/node_modules');
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');

// --- 1. GLOBAL COLOUR SYSTEM (Unified) ---
global.sensorColorMap = global.sensorColorMap || {};
global.colorIndex = global.colorIndex || 0;

const COLOR_PALETTE = [
    'rgba(255, 99, 132, 0.6)',   // 0: Red
    'rgba(54, 162, 235, 0.6)',   // 1: Blue
    'rgba(75, 192, 192, 0.6)',   // 2: Teal
    'rgba(153, 102, 255, 0.6)',  // 3: Purple
    'rgba(255, 159, 64, 0.6)',   // 4: Orange
    'rgba(199, 199, 199, 0.6)',  // 5: Grey
    'rgba(83,102,255,0.6)',      // 6: Indigo
    'rgba(40,159,64,0.6)',       // 7: Dark Green
    'rgba(210,99,132,0.6)'       // 8: Pink
];

const COLOR_PALETTE_BORDER = COLOR_PALETTE.map(c => c.replace('0.6', '1'));

// --- Specific Color Definitions ---
const STYLES = {
    RED:    { bg: COLOR_PALETTE[0], border: COLOR_PALETTE_BORDER[0] },
    TEAL:   { bg: COLOR_PALETTE[2], border: COLOR_PALETTE_BORDER[2] },
    PURPLE: { bg: COLOR_PALETTE[3], border: COLOR_PALETTE_BORDER[3] },
    GREEN:  { bg: 'rgba(40,159,64,0.6)', border: 'rgba(40,159,64,1)' } // Custom Green
};

// --- Color Mapping Logic ---
function getStyleForSensor(sensor) {
    // Normalize string for safer matching
    const label = (sensor || '').trim();

    // 1. Total Load -> Teal
    if (label === "Total Load Energy" || label === "Total load") {
        return STYLES.TEAL;
    }

    // 2. Grid Energy -> Red
    if (label === "Total Grid Energy" || label === "Grid import") {
        return STYLES.RED;
    }

    // 3. PV Energy -> Green
    if (label === "Total PV Energy" || label === "Solar generated" || label === "Total PV Charge") {
        return STYLES.GREEN;
    }

    // 4. Generator Energy -> Purple
    if (label === "Total Generator Energy" || label === "DG generated") {
        return STYLES.PURPLE;
    }

    // Fallback for unknown sensors
    if (!global.sensorColorMap[label]) {
        global.sensorColorMap[label] = {
            bg: COLOR_PALETTE[global.colorIndex % COLOR_PALETTE.length],
            border: COLOR_PALETTE_BORDER[global.colorIndex % COLOR_PALETTE.length]
        };
        global.colorIndex++;
    }
    return global.sensorColorMap[label];
}

function getColorForSensor(sensor) {
    return getStyleForSensor(sensor).bg;
}

function getBorderForSensor(sensor) {
    return getStyleForSensor(sensor).border;
}

// --- BAR CHART RENDERER ---
module.exports = function renderBarChart(sensorArray, yAxisLabel = "kWh") {
    return new Promise((resolve, reject) => {
        try {
            const width = 800;
            const height = 400;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");

            // --- CHANGED: Apply Global Black Text Settings ---
            Chart.defaults.color = '#000000';
            Chart.defaults.font.family = 'Arial';
            Chart.defaults.font.size = 14;

            const labels = [];
            const values = [];
            const backgroundColor = [];
            const borderColor = [];

            sensorArray.forEach(point => {
                const sensor = point.sensor || "Unknown";
                const value = Number(point._value);

                labels.push(sensor);
                values.push(value);

                // Apply Unified Color Logic
                backgroundColor.push(getColorForSensor(sensor));
                borderColor.push(getBorderForSensor(sensor));
            });

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: "Sensor Values",
                        data: values,
                        backgroundColor,
                        borderColor,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: false,
                    animation: false,
                    scales: {
                        x: { 
                            title: { display: true, text: "" },
                            ticks: { color: '#000000' } // --- CHANGED: Explicitly Black ---
                        },
                        y: {
                            beginAtZero: true,
                            title: { 
                                display: true, 
                                text: yAxisLabel,
                                color: '#000000', // --- CHANGED: Explicitly Black ---
                                font: { weight: 'bold' } 
                            },
                            ticks: { color: '#000000' } // --- CHANGED: Explicitly Black ---
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });

            resolve(canvas.toDataURL("image/png"));
        } catch (err) {
            reject(err);
        }
    });
};