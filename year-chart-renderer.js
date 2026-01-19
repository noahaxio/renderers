const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// --- 1. GLOBAL COLOUR SYSTEM ---
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
    GREEN:  { bg: 'rgba(40,159,64,0.6)', border: 'rgba(40,159,64,1)' } 
};

// --- Color Mapping Logic ---
function getStyleForSensor(sensor) {
    const label = sensor.trim();

    if (label === "Total Load Energy" || label === "Total load") {
        return STYLES.TEAL;
    }
    if (label === "Total Grid Energy" || label === "Grid import") {
        return STYLES.RED;
    }
    if (label === "Total PV Energy" || label === "Solar generated" || label === "Total PV Charge") {
        return STYLES.GREEN;
    }
    if (label === "Total Generator Energy" || label === "DG generated") {
        return STYLES.PURPLE;
    }

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

// --- 2. Chart Configuration ---
const width = 1200; 
const height = 600;
const backgroundColour = 'white'; 

const chartCallback = (ChartJS) => {
    ChartJS.defaults.font.family = 'Arial';
    ChartJS.defaults.font.size = 14;
    
    // 1. SET GLOBAL TEXT COLOR TO SOLID BLACK
    ChartJS.defaults.color = '#000000'; // <--- CHANGED: Forces all text (legend, ticks) to be black
};

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour, chartCallback });

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Generates a Base64 image string of the Yearly Summary Chart
 */
async function renderYearlyChart(data) {
    
    const sortedData = data.sort((a, b) => (a.month > b.month) ? 1 : -1);

    const labels = sortedData.map(d => {
        if (!d.month) return "";
        const parts = d.month.split('-'); 
        if (parts.length === 2) {
            const monthIndex = parseInt(parts[1], 10) - 1; 
            return MONTH_NAMES[monthIndex] || d.month;
        }
        return d.month;
    });

    const gridImportData = sortedData.map(d => d.Total_Grid_Energy || 0);
    const totalLoadData = sortedData.map(d => d.Total_Load_Energy || 0);
    const solarGeneratedData = sortedData.map(d => d.Total_PV_Charge || 0);
    const dgGeneratedData = sortedData.map(d => d.Total_Generator_Energy || 0);

    const createDataset = (label, data) => ({
        label: label,
        backgroundColor: getColorForSensor(label),
        borderColor: getBorderForSensor(label),
        borderWidth: 1,
        data: data,
        barPercentage: 0.7,
        categoryPercentage: 0.8
    });

    const configuration = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                createDataset('Total Generator Energy', dgGeneratedData), 
                createDataset('Total PV Energy', solarGeneratedData),     
                createDataset('Total Grid Energy', gridImportData),       
                createDataset('Total Load Energy', totalLoadData),        
            ]
        },
        options: {
            layout: { padding: 10 },
            plugins: {
                title: {
                    display: true,
                    text: `Yearly Energy Summary`,
                    font: { size: 24, weight: 'bold' },
                    padding: { bottom: 10 },
                    color: '#000000' // <--- CHANGED: Was #333, now solid black
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        font: { size: 12 },
                        color: '#000000' // <--- ADDED: Explicitly black
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'kWh',
                        font: { weight: 'bold' },
                        color: '#000000' // <--- ADDED: Explicitly black
                    },
                    grid: { color: '#e5e5e5' },
                    ticks: {
                        color: '#000000' // <--- ADDED: Explicitly black for numbers
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#000000' // <--- ADDED: Explicitly black for month names
                    }
                }
            }
        }
    };

    return await chartJSNodeCanvas.renderToDataURL(configuration);
}

module.exports = renderYearlyChart;