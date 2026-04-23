import { initCamera } from "./camera.js";
import { initInteractions } from "./interactions.js";

document.addEventListener("DOMContentLoaded", async () => {

    const response = await fetch("data/collectibles.json");
    const data = await response.json();

    // Load saved state from localStorage
    const saved = localStorage.getItem("mercs-tracker");
    if (saved) {
        const savedData = JSON.parse(saved);
        Object.keys(savedData).forEach(category => {
            if (!data[category]) return;
            savedData[category].forEach(savedItem => {
                const item = data[category].items.find(i => i.id === savedItem.id);
                if (item) item.status = savedItem.status;
            });
        });
    }

    const mapBounds = {
        minX: -159.50143,
        minY: -68.193756,
        maxX: 369.66526,
        maxY: 365.193754
    };

    const southContainer = document.getElementById("map-container-south");
    if (southContainer) initCamera(southContainer, mapBounds);

    const northContainer = document.getElementById("map-container-north");
    if (northContainer) initCamera(northContainer, mapBounds);

    initInteractions(data);
});