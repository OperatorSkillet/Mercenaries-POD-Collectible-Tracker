export function initCamera(container, bounds) {

    const svg = container.querySelector("svg");

    const MAP_W = bounds.maxX - bounds.minX;
    const MAP_H = bounds.maxY - bounds.minY;

    let scale = 1;
    let viewX = bounds.minX;
    let viewY = bounds.minY;
    let isPanning = false;

    // Touch state
    let lastTouchX = 0;
    let lastTouchY = 0;
    let lastPinchDist = null;

    function getMinScale() {
        const scaleForWidth = container.clientWidth / MAP_W;
        const scaleForHeight = container.clientHeight / MAP_H;
        return Math.max(scaleForWidth, scaleForHeight);
    }

    function clampScale() {
        scale = Math.max(getMinScale(), Math.min(scale, 10));
    }

    function clampView() {
        const viewW = container.clientWidth / scale;
        const viewH = container.clientHeight / scale;

        if (viewW >= MAP_W) {
            viewX = bounds.minX;
        } else {
            viewX = Math.max(bounds.minX, Math.min(viewX, bounds.maxX - viewW));
        }

        if (viewH >= MAP_H) {
            viewY = bounds.minY;
        } else {
            viewY = Math.max(bounds.minY, Math.min(viewY, bounds.maxY - viewH));
        }
    }

    function updateViewBox() {
        clampScale();
        clampView();
        const viewW = container.clientWidth / scale;
        const viewH = container.clientHeight / scale;
        svg.setAttribute("viewBox", `${viewX} ${viewY} ${viewW} ${viewH}`);
    }

    // ── Mouse controls (unchanged) ──────────────────────────────────────────

    container.addEventListener("mousedown", () => { isPanning = true; });
    container.addEventListener("mouseup", () => { isPanning = false; });
    container.addEventListener("mouseleave", () => { isPanning = false; });

    container.addEventListener("mousemove", (e) => {
        if (!isPanning) return;
        const viewW = container.clientWidth / scale;
        const viewH = container.clientHeight / scale;
        viewX -= e.movementX * viewW / container.clientWidth;
        viewY -= e.movementY * viewH / container.clientHeight;
        updateViewBox();
    });

    container.addEventListener("wheel", (e) => {
        e.preventDefault();

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = viewX + (mouseX / container.clientWidth) * (container.clientWidth / scale);
        const worldY = viewY + (mouseY / container.clientHeight) * (container.clientHeight / scale);

        const zoomFactor = 1.2;
        if (e.deltaY < 0) scale *= zoomFactor;
        else scale /= zoomFactor;

        clampScale();

        viewX = worldX - (mouseX / container.clientWidth) * (container.clientWidth / scale);
        viewY = worldY - (mouseY / container.clientHeight) * (container.clientHeight / scale);

        updateViewBox();

    }, { passive: false });

    // ── Touch controls ──────────────────────────────────────────────────────

    function getTouchMidpoint(t1, t2) {
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    }

    function getTouchDist(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    container.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
            // Single finger — start panning
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
            lastPinchDist = null;
        } else if (e.touches.length === 2) {
            // Two fingers — start pinch
            lastPinchDist = getTouchDist(e.touches[0], e.touches[1]);
            const mid = getTouchMidpoint(e.touches[0], e.touches[1]);
            lastTouchX = mid.x;
            lastTouchY = mid.y;
        }
    }, { passive: true });

    container.addEventListener("touchmove", (e) => {
        e.preventDefault();

        if (e.touches.length === 1 && lastPinchDist === null) {
            // Single finger pan
            const dx = e.touches[0].clientX - lastTouchX;
            const dy = e.touches[0].clientY - lastTouchY;

            const viewW = container.clientWidth / scale;
            const viewH = container.clientHeight / scale;

            viewX -= dx * viewW / container.clientWidth;
            viewY -= dy * viewH / container.clientHeight;

            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;

            updateViewBox();

        } else if (e.touches.length === 2) {
            // Pinch zoom + pan simultaneously
            const newDist = getTouchDist(e.touches[0], e.touches[1]);
            const mid = getTouchMidpoint(e.touches[0], e.touches[1]);

            const rect = container.getBoundingClientRect();
            const midX = mid.x - rect.left;
            const midY = mid.y - rect.top;

            // Pan from midpoint movement
            const dx = mid.x - lastTouchX;
            const dy = mid.y - lastTouchY;
            const viewW = container.clientWidth / scale;
            const viewH = container.clientHeight / scale;
            viewX -= dx * viewW / container.clientWidth;
            viewY -= dy * viewH / container.clientHeight;

            // Zoom from pinch
            if (lastPinchDist && lastPinchDist > 0) {
                const worldX = viewX + (midX / container.clientWidth) * (container.clientWidth / scale);
                const worldY = viewY + (midY / container.clientHeight) * (container.clientHeight / scale);

                scale *= newDist / lastPinchDist;
                clampScale();

                viewX = worldX - (midX / container.clientWidth) * (container.clientWidth / scale);
                viewY = worldY - (midY / container.clientHeight) * (container.clientHeight / scale);
            }

            lastPinchDist = newDist;
            lastTouchX = mid.x;
            lastTouchY = mid.y;

            updateViewBox();
        }

    }, { passive: false });

    container.addEventListener("touchend", (e) => {
        if (e.touches.length < 2) {
            lastPinchDist = null;
        }
        if (e.touches.length === 1) {
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    }, { passive: true });

    // ── Resize ──────────────────────────────────────────────────────────────

    window.addEventListener("resize", () => {
        updateViewBox();
    });

    // Initial render
    updateViewBox();
}
