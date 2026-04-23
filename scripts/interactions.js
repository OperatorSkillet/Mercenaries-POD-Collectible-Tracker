export function initInteractions(data) {

    const tooltip = document.getElementById("tooltip");
    const sidebar = document.getElementById("sidebar");
    const sidebarClose = document.getElementById("sidebar-close");
    const sidebarName = document.getElementById("sidebar-name");
    const sidebarCategory = document.getElementById("sidebar-category");
    const sidebarStatus = document.getElementById("sidebar-status");
    const sidebarDescription = document.getElementById("sidebar-description");
    const sidebarImage = document.getElementById("sidebar-image");

    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightbox-image");

    // Detect touch device — hide tooltip on mobile since there's no hover
    const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

    // Open lightbox when clicking/tapping sidebar image
    sidebarImage.addEventListener("click", () => {
        lightboxImage.src = sidebarImage.src;
        lightboxImage.alt = sidebarImage.alt;
        lightbox.classList.add("open");
    });

    // Close lightbox when clicking/tapping anywhere on it
    lightbox.addEventListener("click", () => {
        lightbox.classList.remove("open");
    });

    function getNextStatus(current) {
        if (current === "not_collected") return "unsure";
        if (current === "unsure") return "collected";
        return "not_collected";
    }

    function getStatusLabel(status) {
        if (status === "collected") return "✔️ Collected";
        if (status === "unsure") return "⚠️ Unsure";
        return "❌ Not Collected";
    }

    function getStatusDisplay(status) {
        if (status === "collected") return '<span style="color:#4caf50">✔️ Collected</span>';
        if (status === "unsure") return '<span style="color:#ffd900">⚠️ Unsure</span>';
        return '<span style="color:#f44336">❌ Not Collected</span>';
    }

    function openSidebar(item, categoryDisplayName) {
        sidebarName.textContent = item.name;
        sidebarCategory.textContent = categoryDisplayName;
        sidebarStatus.textContent = getStatusLabel(item.status);
        sidebarStatus.dataset.status = item.status;
        sidebarDescription.textContent = item.description;
        sidebarImage.src = item.image;
        sidebarImage.alt = item.name;
        sidebarImage.style.cursor = "zoom-in";
        sidebar.classList.add("open");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
    }

    function cycleStatus(item, circle) {
        item.status = getNextStatus(item.status);

        circle.classList.remove("collected", "unsure");

        const existingMarker = document.querySelector(`[data-marker="${circle.id}"]`);
        if (existingMarker) existingMarker.remove();

        if (item.status === "collected") {
            circle.classList.add("collected");
        } else if (item.status === "unsure") {
            const svgNS = "http://www.w3.org/2000/svg";
            const marker = document.createElementNS(svgNS, "text");
            marker.textContent = "?";
            const bbox = circle.getBBox();
            marker.setAttribute("x", bbox.x + bbox.width / 2);
            marker.setAttribute("y", bbox.y + bbox.height / 2);
            marker.setAttribute("text-anchor", "middle");
            marker.setAttribute("dominant-baseline", "middle");
            marker.setAttribute("class", "unsure");
            marker.setAttribute("data-marker", circle.id);
            circle.closest('g').appendChild(marker);
        }

        // Update sidebar if open and showing this item
        if (sidebar.classList.contains("open") && sidebarName.textContent === item.name) {
            sidebarStatus.textContent = getStatusLabel(item.status);
            sidebarStatus.dataset.status = item.status;
        }

        if (window.updateTracker) window.updateTracker();
        saveState();
    }

    sidebarClose.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            lightbox.classList.remove("open");
            closeSidebar();
        }
    });

    document.querySelectorAll(".map").forEach(map => {
        map.addEventListener("click", () => {
            closeSidebar();
        });
    });

    // ── Per-circle event setup ───────────────────────────────────────────────

    Object.keys(data).forEach(category => {

        const categoryData = data[category];
        const items = categoryData.items;
        const displayName = categoryData.displayName;
        const circles = document.querySelectorAll(`#${category} circle`);

        circles.forEach(circle => {

            const item = items.find(i => i.id === circle.id);
            if (!item) return;

            if (item.status === "collected") circle.classList.add("collected");
            if (item.status === "unsure") {
                const svgNS = "http://www.w3.org/2000/svg";
                const marker = document.createElementNS(svgNS, "text");
                marker.textContent = "?";
                const bbox = circle.getBBox();
                marker.setAttribute("x", bbox.x + bbox.width / 2);
                marker.setAttribute("y", bbox.y + bbox.height / 2);
                marker.setAttribute("text-anchor", "middle");
                marker.setAttribute("dominant-baseline", "middle");
                marker.setAttribute("class", "unsure");
                marker.setAttribute("data-marker", circle.id);
                circle.closest('g').appendChild(marker);
            }

            circle.style.cursor = "pointer";

            // ── Mouse: left click → sidebar ──────────────────────────────────
            circle.addEventListener("click", (e) => {
                e.stopPropagation();
                if (sidebar.classList.contains("open") && sidebarName.textContent === item.name) {
                    closeSidebar();
                } else {
                    openSidebar(item, displayName);
                }
            });

            // ── Mouse: right click → cycle status ───────────────────────────
            circle.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();

                cycleStatus(item, circle);

                if (!isTouchDevice()) {
                    tooltip.innerHTML = `
                        <strong>${item.name}</strong><br>
                        ${getStatusDisplay(item.status)}<br>
                        ${item.description}`;
                }
            });

            // ── Mouse: hover tooltip ─────────────────────────────────────────
            circle.addEventListener("mouseenter", () => {
                if (isTouchDevice()) return;
                tooltip.style.display = "block";
                tooltip.innerHTML = `
                    <strong>${item.name}</strong><br>
                    ${getStatusDisplay(item.status)}<br>
                    ${item.description}`;
            });

            circle.addEventListener("mousemove", (e) => {
                if (isTouchDevice()) return;
                tooltip.style.left = e.pageX + 12 + "px";
                tooltip.style.top = e.pageY + 12 + "px";
            });

            circle.addEventListener("mouseleave", () => {
                tooltip.style.display = "none";
            });

            // ── Touch: tap → sidebar, long press → cycle status ─────────────
            let longPressTimer = null;
            let touchMoved = false;
            let touchStartX = 0;
            let touchStartY = 0;

            circle.addEventListener("touchstart", (e) => {
                touchMoved = false;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;

                longPressTimer = setTimeout(() => {
                    if (!touchMoved) {
                        cycleStatus(item, circle);

                        // Brief visual flash so user knows it registered
                        circle.style.opacity = "0.4";
                        setTimeout(() => { circle.style.opacity = ""; }, 180);
                    }
                }, 500); // 500ms hold = long press

            }, { passive: true });

            circle.addEventListener("touchmove", (e) => {
                const dx = Math.abs(e.touches[0].clientX - touchStartX);
                const dy = Math.abs(e.touches[0].clientY - touchStartY);
                if (dx > 8 || dy > 8) {
                    touchMoved = true;
                    clearTimeout(longPressTimer);
                }
            }, { passive: true });

            circle.addEventListener("touchend", (e) => {
                clearTimeout(longPressTimer);

                if (!touchMoved) {
                    // Short tap → open/close sidebar
                    e.preventDefault(); // prevent ghost mouse click
                    e.stopPropagation();
                    if (sidebar.classList.contains("open") && sidebarName.textContent === item.name) {
                        closeSidebar();
                    } else {
                        openSidebar(item, displayName);
                    }
                }
            }, { passive: false });

        });
    });

    // ── Tracker ──────────────────────────────────────────────────────────────

    const trackerBtns = document.querySelectorAll(".tracker-btn");

    function getActiveMap() {
        const south = document.getElementById("map-container-south");
        return south.classList.contains("active") ? "south" : "north";
    }

    function updateTracker() {
        const activeMap = getActiveMap();

        trackerBtns.forEach(btn => {
            const category = btn.dataset.category;
            const categoryData = data[category];
            if (!categoryData) return;

            const mapItems = categoryData.items.filter(i => i.map === activeMap);
            const total = mapItems.length;
            const collected = mapItems.filter(i => i.status === "collected").length;

            btn.querySelector(".count").textContent = `${collected} / ${total}`;
        });

        ["south", "north"].forEach(map => {
            let total = 0;
            let collected = 0;
            Object.values(data).forEach(category => {
                const mapItems = category.items.filter(i => i.map === map);
                total += mapItems.length;
                collected += mapItems.filter(i => i.status === "collected").length;
            });
            document.getElementById(`${map}-total`).textContent = `${collected} / ${total}`;
        });
    }

    function saveState() {
        const state = {};
        Object.keys(data).forEach(category => {
            state[category] = data[category].items.map(item => ({
                id: item.id,
                status: item.status
            }));
        });
        localStorage.setItem("mercs-tracker", JSON.stringify(state));
    }

    trackerBtns.forEach(btn => {
        const category = btn.dataset.category;

        btn.addEventListener("click", () => {
            const isHidden = btn.classList.toggle("hidden-category");
            document.querySelectorAll(`#${category}`).forEach(group => {
                group.style.visibility = isHidden ? "hidden" : "visible";
            });
        });
    });

    updateTracker();
    window.updateTracker = updateTracker;

    // ── Reset ────────────────────────────────────────────────────────────────

    const resetBtn = document.getElementById("reset-btn");
    const resetModal = document.getElementById("reset-modal");
    const resetCancel = document.getElementById("reset-cancel");
    const resetConfirm = document.getElementById("reset-confirm");

    resetBtn.addEventListener("click", () => {
        resetModal.classList.add("open");
    });

    resetCancel.addEventListener("click", () => {
        resetModal.classList.remove("open");
    });

    resetModal.addEventListener("click", (e) => {
        if (e.target === resetModal) resetModal.classList.remove("open");
    });

    resetConfirm.addEventListener("click", () => {
        const activeMap = getActiveMap();

        Object.keys(data).forEach(category => {
            data[category].items
                .filter(item => item.map === activeMap)
                .forEach(item => {
                    item.status = "not_collected";
                    const circle = document.getElementById(item.id);
                    if (circle) {
                        circle.classList.remove("collected", "unsure");
                        const marker = document.querySelector(`[data-marker="${item.id}"]`);
                        if (marker) marker.remove();
                    }
                });
        });

        closeSidebar();
        saveState();
        if (window.updateTracker) window.updateTracker();
        resetModal.classList.remove("open");
    });
}
