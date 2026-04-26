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

    // ── Status helpers ───────────────────────────────────────────────────────

    function getNextStatus(current, isHVT) {
        if (isHVT) {
            return current === "not_captured" ? "captured" : "not_captured";
        }
        if (current === "not_collected") return "unsure";
        if (current === "unsure") return "collected";
        return "not_collected";
    }

    function getStatusLabel(status) {
        if (status === "captured")     return "✔️ Captured";
        if (status === "not_captured") return "❌ Not Captured";
        if (status === "collected")    return "✔️ Collected";
        if (status === "unsure")       return "⚠️ Unsure";
        return "❌ Not Collected";
    }

    function getStatusDisplay(status) {
        if (status === "captured")     return '<span style="color:#4caf50">✔️ Captured</span>';
        if (status === "not_captured") return '<span style="color:#f44336">❌ Not Captured</span>';
        if (status === "collected")    return '<span style="color:#4caf50">✔️ Collected</span>';
        if (status === "unsure")       return '<span style="color:#ffd900">⚠️ Unsure</span>';
        return '<span style="color:#f44336">❌ Not Collected</span>';
    }

    // ── Sidebar ──────────────────────────────────────────────────────────────

    function openSidebar(item, categoryDisplayName) {
        sidebarName.textContent = item.name;
        sidebarCategory.textContent = categoryDisplayName;
        sidebarStatus.textContent = getStatusLabel(item.status);
        sidebarStatus.dataset.status = item.status;
        sidebarDescription.textContent = item.description || "";
        sidebarImage.src = item.image || "";
        sidebarImage.alt = item.name;
        sidebarImage.style.display = item.image ? "block" : "none";
        sidebarImage.style.cursor = item.image ? "zoom-in" : "default";
        sidebar.classList.add("open");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
    }

    // ── Apply visual state to an SVG element ─────────────────────────────────

    function applyVisualState(el, item) {
        const isHVT = el.tagName === "image" || el.tagName.toLowerCase() === "image";

        if (isHVT) {
            // HVTs use <image> — toggle the "captured" class for dim effect
            el.classList.toggle("captured", item.status === "captured");
        } else {
            // Collectibles use <circle>
            el.classList.remove("collected", "unsure");
            const existingMarker = document.querySelector(`[data-marker="${el.id}"]`);
            if (existingMarker) existingMarker.remove();

            if (item.status === "collected") {
                el.classList.add("collected");
            } else if (item.status === "unsure") {
                const svgNS = "http://www.w3.org/2000/svg";
                const marker = document.createElementNS(svgNS, "text");
                marker.textContent = "?";
                const bbox = el.getBBox();
                marker.setAttribute("x", bbox.x + bbox.width / 2);
                marker.setAttribute("y", bbox.y + bbox.height / 2);
                marker.setAttribute("text-anchor", "middle");
                marker.setAttribute("dominant-baseline", "middle");
                marker.setAttribute("class", "unsure");
                marker.setAttribute("data-marker", el.id);
                el.closest('g').appendChild(marker);
            }
        }
    }

    // ── Cycle status ─────────────────────────────────────────────────────────

    function cycleStatus(item, el, isHVT) {
        item.status = getNextStatus(item.status, isHVT);
        applyVisualState(el, item);

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

    // ── Per-element event setup ──────────────────────────────────────────────

    function bindElement(el, item, displayName, isHVT) {

        // Apply saved state on load
        applyVisualState(el, item);

        el.style.cursor = "pointer";

        // ── Mouse: left click → sidebar ──────────────────────────────────
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (sidebar.classList.contains("open") && sidebarName.textContent === item.name) {
                closeSidebar();
            } else {
                openSidebar(item, displayName);
            }
        });

        // ── Mouse: right click → cycle status ───────────────────────────
        el.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();

            cycleStatus(item, el, isHVT);

            if (!isTouchDevice()) {
                tooltip.innerHTML = `
                    <strong>${item.name}</strong><br>
                    ${getStatusDisplay(item.status)}`;
            }
        });

        // ── Mouse: hover tooltip ─────────────────────────────────────────
        el.addEventListener("mouseenter", () => {
            if (isTouchDevice()) return;
            tooltip.style.display = "block";
            tooltip.innerHTML = `
                <strong>${item.name}</strong><br>
                ${getStatusDisplay(item.status)}${item.description ? `<br>${item.description}` : ""}`;
        });

        el.addEventListener("mousemove", (e) => {
            if (isTouchDevice()) return;
            tooltip.style.left = e.pageX + 12 + "px";
            tooltip.style.top = e.pageY + 12 + "px";
        });

        el.addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
        });

        // ── Touch: tap → sidebar, long press → cycle status ─────────────
        let longPressTimer = null;
        let touchMoved = false;
        let touchStartX = 0;
        let touchStartY = 0;

        el.addEventListener("touchstart", (e) => {
            touchMoved = false;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;

            longPressTimer = setTimeout(() => {
                if (!touchMoved) {
                    cycleStatus(item, el, isHVT);

                    // Brief visual flash so user knows it registered
                    el.style.opacity = "0.4";
                    setTimeout(() => { el.style.opacity = ""; }, 180);
                }
            }, 500);

        }, { passive: true });

        el.addEventListener("touchmove", (e) => {
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dx > 8 || dy > 8) {
                touchMoved = true;
                clearTimeout(longPressTimer);
            }
        }, { passive: true });

        el.addEventListener("touchend", (e) => {
            clearTimeout(longPressTimer);

            if (!touchMoved) {
                e.preventDefault();
                e.stopPropagation();
                if (sidebar.classList.contains("open") && sidebarName.textContent === item.name) {
                    closeSidebar();
                } else {
                    openSidebar(item, displayName);
                }
            }
        }, { passive: false });
    }

    Object.keys(data).forEach(category => {
        const categoryData = data[category];
        const items = categoryData.items;
        const displayName = categoryData.displayName;
        const isHVT = !!categoryData.isHVT;

        if (isHVT) {
            // HVT markers are <image> elements
            const images = document.querySelectorAll(`#${category} image`);
            images.forEach(imgEl => {
                const item = items.find(i => i.id === imgEl.id);
                if (!item) return;
                bindElement(imgEl, item, displayName, true);
            });
        } else {
            // Collectible markers are <circle> elements
            const circles = document.querySelectorAll(`#${category} circle`);
            circles.forEach(circle => {
                const item = items.find(i => i.id === circle.id);
                if (!item) return;
                bindElement(circle, item, displayName, false);
            });
        }
    });

    // ── Tracker ──────────────────────────────────────────────────────────────

    const trackerBtns = document.querySelectorAll(".tracker-btn");

    function getActiveMap() {
        const south = document.getElementById("map-container-south");
        return south.classList.contains("active") ? "south" : "north";
    }

    function isDone(item, isHVT) {
        return isHVT ? item.status === "captured" : item.status === "collected";
    }

    function updateTracker() {
        const activeMap = getActiveMap();

        trackerBtns.forEach(btn => {
            const category = btn.dataset.category;
            const categoryData = data[category];
            if (!categoryData) return;

            const isHVT = !!categoryData.isHVT;
            const mapItems = categoryData.items.filter(i => i.map === activeMap);
            const total = mapItems.length;
            const done = mapItems.filter(i => isDone(i, isHVT)).length;

            btn.querySelector(".count").textContent = `${done} / ${total}`;
        });

        ["south", "north"].forEach(map => {
            let total = 0;
            let done = 0;
            Object.values(data).forEach(category => {
                if (category.isHVT) return;
                const mapItems = category.items.filter(i => i.map === map);
                total += mapItems.length;
                done += mapItems.filter(i => isDone(i, false)).length;
            });
            document.getElementById(`${map}-total`).textContent = `${done} / ${total}`;
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
        if (!category) return;

        btn.addEventListener("click", () => {
            const isHidden = btn.classList.toggle("hidden-category");
            document.querySelectorAll(`#${category}`).forEach(group => {
                group.style.visibility = isHidden ? "hidden" : "visible";
            });
        });
    });

    updateTracker();
    window.updateTracker = updateTracker;

    // ── Act filter ───────────────────────────────────────────────────────────

    function applyActFilter() {
        const activeAct = window._activeAct || { south: 'one', north: 'three' };

        Object.keys(data).forEach(category => {
            const categoryData = data[category];
            if (!categoryData.isHVT) return; // only affects HVT layers

            categoryData.items.forEach(item => {
                const el = document.getElementById(item.id);
                if (!el) return;
                const currentAct = activeAct[item.map];
                const hvtsVisible = window._hvtsVisible !== false;
                el.style.display = (hvtsVisible && item.act === currentAct) ? '' : 'none';
            });
        });
    }

    window.applyActFilter = applyActFilter;
    applyActFilter();

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
            const categoryData = data[category];
            const isHVT = !!categoryData.isHVT;
            const defaultStatus = isHVT ? "not_captured" : "not_collected";

            categoryData.items
                .filter(item => item.map === activeMap)
                .forEach(item => {
                    item.status = defaultStatus;

                    const el = document.getElementById(item.id);
                    if (!el) return;

                    if (isHVT) {
                        el.classList.remove("captured");
                    } else {
                        el.classList.remove("collected", "unsure");
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
