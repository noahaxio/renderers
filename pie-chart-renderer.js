// pie-chart-renderer.js
module.paths.push('/home/debix/.node-red/node_modules');
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');

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

// --- PIE CHART RENDERER ---
module.exports = async function renderPieChart(sensorArray = [], opts = {}) {
  const width = opts.width || 800;
  const height = opts.height || 400;
  const title = 'Energy Sources';

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // --- CHANGED: Apply Global Black Text Settings ---
  Chart.defaults.color = '#000000'; 
  Chart.defaults.font.family = 'Arial';
  Chart.defaults.font.size = 14;

  const labels = [];
  const values = [];

  (Array.isArray(sensorArray) ? sensorArray : []).forEach(item => {
    const name = item?.sensor || item?.name || 'Unknown';
    const val = Number(item?._value ?? item?.value);

    // Only add positive values to the pie chart
    if (name && !Number.isNaN(val) && val > 0) {
      labels.push(name);
      values.push(val);
    }
  });

  if (labels.length === 0) return null;

  // Use the updated helper functions
  const backgroundColor = labels.map(getColorForSensor);
  const borderColor = labels.map(getBorderForSensor);

  const chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Sensor Values',
        data: values,
        backgroundColor,
        borderColor,
        borderWidth: 2
      }]
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            color: '#000000', // --- CHANGED: Explicitly Black ---
            boxWidth: 12,
            padding: 15,
            generateLabels: chart => {
              const dataset = chart.data.datasets[0];
              const total = dataset.data.reduce((a, b) => a + b, 0);

              return chart.data.labels.map((label, i) => {
                const value = dataset.data[i];
                const pct = total ? ((value / total) * 100).toFixed(1) : 0;
                return {
                  text: `${label} (${pct}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor[i],
                  lineWidth: 2,
                  hidden: !chart.getDataVisibility(i),
                  index: i
                };
              });
            }
          }
        },
        title: {
          display: false,
          text: title,
          color: '#000000' // --- CHANGED: Added color (in case display is toggled to true) ---
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const label = ctx.label;
              const value = ctx.raw;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? Math.round((value / total) * 100) : 0;
              return `${label}: ${value} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  const dataUrl = canvas.toDataURL('image/png');

  try { chart.destroy(); } catch {}

  return dataUrl;
};