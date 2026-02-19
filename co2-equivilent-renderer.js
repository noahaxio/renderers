module.paths.push('/home/debix/.node-red/node_modules');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

module.exports = function renderCO2Equiv(co2Tons, options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            // --- CONFIGURATION ---
            // We accept width from options, but we will CALCULATE height automatically
            const logicalWidth = options.width || 520;
            const PIXEL_RATIO = 4; // 4x Resolution (Sharp Text)
            const ICON_RASTER_SIZE = 512; // Force high-res rasterization for SVGs

            const ICON_PATHS = {
                car: '/home/debix/Renderers/icons/car.svg',
                plane: '/home/debix/Renderers/icons/airplane.svg',
                fuel: '/home/debix/Renderers/icons/gas-tank.svg',
                tree: '/home/debix/Renderers/icons/pine-tree.svg'
            };

            // --- DATA PREPARATION ---
            // We define data first so we can calculate the height based on the count
            const calculations = [
                { icon: 'car',   title: "Passenger Cars Removed",      value: Math.round(co2Tons / 4.6).toLocaleString(), color: "#1976d2" },
                { icon: 'plane', title: "NY ↔ London Flights Avoided", value: Math.round(co2Tons / 1.0).toLocaleString(), color: "#1976d2" },
                { icon: 'fuel',  title: "Liters of Fuel Not Burned",   value: Math.round(co2Tons / 0.0023).toLocaleString(), color: "#1976d2" },
                { icon: 'tree',  title: "Trees Absorbing CO₂",         value: Math.round(co2Tons / 0.025).toLocaleString(), color: "#1976d2" }
            ];

            // --- LAYOUT & HEIGHT CALCULATION ---
            const padding = 20;
            const gap = 15;
            const cardHeight = 100;
            const headerHeight = 110;
            const columns = 2;

            // Calculate how many rows we need based on data length
            const rowCount = Math.ceil(calculations.length / columns);

            // Calculate the EXACT height needed to fit content
            // (Header + Cards + Gaps + Padding)
            const contentHeight = headerHeight + (rowCount * cardHeight) + ((rowCount - 1) * gap) + padding;

            // We use contentHeight as the logical height, ignoring options.height to prevent whitespace
            const logicalHeight = contentHeight;

            // --- CANVAS SETUP ---
            const canvas = createCanvas(logicalWidth * PIXEL_RATIO, logicalHeight * PIXEL_RATIO);
            const ctx = canvas.getContext('2d');
            ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // --- HELPER: Load SVG High Res ---
            const loadHighResIcon = async (filePath) => {
                try {
                    let svgStr = fs.readFileSync(filePath, 'utf8');
                    svgStr = svgStr.replace(/\s(width|height)="[^"]*"/gi, '');
                    svgStr = svgStr.replace('<svg', `<svg width="${ICON_RASTER_SIZE}" height="${ICON_RASTER_SIZE}"`);
                    return await loadImage(Buffer.from(svgStr));
                } catch (e) {
                    console.warn(`[Renderer] Failed to load icon: ${filePath}`, e);
                    return null;
                }
            };

            // --- ASSET LOADING ---
            const loadedIcons = {};
            await Promise.all(Object.keys(ICON_PATHS).map(async (key) => {
                loadedIcons[key] = await loadHighResIcon(ICON_PATHS[key]);
            }));

            // --- DRAWING HELPERS ---
            const drawRoundedRect = (x, y, w, h, r) => {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
                ctx.closePath();
            };

            const wrapText = (text, x, y, maxWidth, lineHeight) => {
                const words = text.split(' ');
                let line = '';
                let currentY = y;
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) {
                        ctx.fillText(line.trim(), x, currentY);
                        line = words[n] + ' ';
                        currentY += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line.trim(), x, currentY);
            };

            // --- RENDER LOGIC ---

            // Background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, logicalWidth, logicalHeight);

            // Title
            ctx.fillStyle = "#333333";
            ctx.font = "bold 24px Arial";
            ctx.fillText("Carbon Savings", 20, 40);

            // Main Value
            ctx.fillStyle = "#2e7d32";
            ctx.font = "bold 36px Arial";
            ctx.fillText(`${co2Tons.toFixed(1)} t CO₂`, 20, 85);

            // Grid Logic
            const cardWidth = (logicalWidth - (padding * 2) - gap) / columns;
            
            let startX = padding;
            let startY = 110;
            let x = startX;
            let y = startY;

            calculations.forEach((item, i) => {
                // Shadow
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                drawRoundedRect(x + 2, y + 2, cardWidth, cardHeight, 8);
                ctx.fill();

                // Card Face
                ctx.fillStyle = "#f5f5f5";
                drawRoundedRect(x, y, cardWidth, cardHeight, 8);
                ctx.fill();

                // Icon
                if (loadedIcons[item.icon]) {
                    ctx.drawImage(loadedIcons[item.icon], x + 15, y + 30, 40, 40);
                } else {
                    ctx.fillStyle = "#ccc";
                    ctx.beginPath();
                    ctx.arc(x + 35, y + 50, 20, 0, 2 * Math.PI);
                    ctx.fill();
                }

                // Text
                const textX = x + 70;
                const textMaxWidth = cardWidth - 80;

                ctx.fillStyle = "#555";
                ctx.font = "bold 13px Arial";
                wrapText(item.title, textX, y + 25, textMaxWidth, 16);

                ctx.fillStyle = item.color;
                ctx.font = "bold 20px Arial";
                ctx.fillText(item.value, textX, y + 80);

                // Grid iteration
                if ((i + 1) % columns === 0) {
                    x = startX;
                    y += cardHeight + gap;
                } else {
                    x += cardWidth + gap;
                }
            });

            resolve(canvas.toDataURL("image/png"));

        } catch (err) {
            console.error("[Renderer] Critical Error:", err);
            reject(err);
        }
    });
};
