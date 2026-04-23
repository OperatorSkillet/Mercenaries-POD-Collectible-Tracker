export function initCamera(container, bounds) {

    const svg = container.querySelector("svg");

    const MAP_W = bounds.maxX - bounds.minX;
    const MAP_H = bounds.maxY - bounds.minY;

    let scale = 1;
    let viewX = bounds.minX;
    let viewY = bounds.minY;
    let isPanning = false;

    function getMinScale() {
        // Scale must be large enough that the viewport never exceeds the map size
        const scaleForWidth = container.clientWidth / MAP_W;
        const scaleForHeight = container.clientHeight / MAP_H;
        // We need BOTH dimensions to fit, so take the larger constraint
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

        // Where in the world is the mouse pointing right now
        const worldX = viewX + (mouseX / container.clientWidth) * (container.clientWidth / scale);
        const worldY = viewY + (mouseY / container.clientHeight) * (container.clientHeight / scale);

        const zoomFactor = 1.2;
        if (e.deltaY < 0) scale *= zoomFactor;
        else scale /= zoomFactor;

        clampScale();

        // Reposition so the mouse stays over the same world point
        viewX = worldX - (mouseX / container.clientWidth) * (container.clientWidth / scale);
        viewY = worldY - (mouseY / container.clientHeight) * (container.clientHeight / scale);

        updateViewBox();

    }, { passive: false });

    // Handle window resize — min scale may change
    window.addEventListener("resize", () => {
        updateViewBox();
    });

    // Initial render
    updateViewBox();
}