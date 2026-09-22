(() => {
  "use strict";

  const TOTAL_PAGES = 47;
  const slide = document.querySelector("#slide");
  const stage = document.querySelector("#stage");
  const viewer = document.querySelector("#viewer");
  const previousButton = document.querySelector("#previousButton");
  const nextButton = document.querySelector("#nextButton");
  const pageRange = document.querySelector("#pageRange");
  const pageLabel = document.querySelector("#pageLabel");
  const zoomButton = document.querySelector("#zoomButton");
  const fullscreenButton = document.querySelector("#fullscreenButton");
  const toast = document.querySelector("#toast");

  let currentPage = pageFromHash();
  let touchStartX = 0;
  let touchStartY = 0;
  let toastTimer;
  let fitTimer;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerCurrentX = 0;
  let isDragging = false;

  function fitStage() {
    if (viewer.classList.contains("is-zoomed")) return;

    const viewerStyle = window.getComputedStyle(viewer);
    const paddingX = parseFloat(viewerStyle.paddingLeft) + parseFloat(viewerStyle.paddingRight);
    const paddingY = parseFloat(viewerStyle.paddingTop) + parseFloat(viewerStyle.paddingBottom);
    const viewerRect = viewer.getBoundingClientRect();
    const safeGap = window.innerWidth <= 640 ? 16 : 20;
    const availableWidth = Math.max(220, viewerRect.width - paddingX);
    const availableHeight = Math.max(160, viewerRect.height - paddingY - safeGap);
    const width = Math.floor(Math.min(availableWidth, availableHeight * 16 / 9));
    const height = Math.floor(width * 9 / 16);

    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
  }

  function queueFitStage() {
    clearTimeout(fitTimer);
    fitStage();
    fitTimer = setTimeout(fitStage, 120);
  }

  function resetDrag() {
    slide.style.transition = "";
    slide.style.transform = "";
    stage.classList.remove("is-dragging");
  }

  function setZoom(enabled) {
    viewer.classList.toggle("is-zoomed", enabled);
    zoomButton.setAttribute("aria-label", enabled ? "Thu nhỏ trang" : "Phóng to trang");
    zoomButton.title = enabled ? "Thu nhỏ" : "Phóng to";
    if (enabled) {
      stage.style.width = "960px";
      stage.style.height = "540px";
      requestAnimationFrame(() => {
        viewer.scrollLeft = Math.max(0, (viewer.scrollWidth - viewer.clientWidth) / 2);
        viewer.scrollTop = Math.max(0, (viewer.scrollHeight - viewer.clientHeight) / 2);
      });
    } else {
      queueFitStage();
    }
  }

  function pageFromHash() {
    const match = location.hash.match(/^#trang-(\d+)$/);
    const page = match ? Number(match[1]) : 1;
    return Math.min(TOTAL_PAGES, Math.max(1, page || 1));
  }

  function imagePath(page) {
    return `assets/slides/slide-${String(page).padStart(2, "0")}.webp`;
  }

  function preload(page) {
    if (page < 1 || page > TOTAL_PAGES) return;
    const image = new Image();
    image.src = imagePath(page);
  }

  function updateControls() {
    pageLabel.textContent = `Trang ${currentPage} / ${TOTAL_PAGES}`;
    pageRange.value = String(currentPage);
    previousButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === TOTAL_PAGES;
  }

  function showPage(page, updateHash = true) {
    const nextPage = Math.min(TOTAL_PAGES, Math.max(1, Number(page)));
    if (!Number.isFinite(nextPage)) return;

    currentPage = nextPage;
    stage.classList.add("is-loading");
    resetDrag();
    slide.alt = `Trang ${currentPage} trên ${TOTAL_PAGES}`;
    slide.src = imagePath(currentPage);
    updateControls();

    if (updateHash) history.replaceState(null, "", `#trang-${currentPage}`);
  }

  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  slide.addEventListener("load", () => {
    stage.classList.remove("is-loading");
    preload(currentPage + 1);
    preload(currentPage - 1);
  });

  slide.addEventListener("error", () => {
    stage.classList.remove("is-loading");
    notify("Không tải được trang này. Hãy kiểm tra lại kết nối.");
  });

  previousButton.addEventListener("click", () => showPage(currentPage - 1));
  nextButton.addEventListener("click", () => showPage(currentPage + 1));
  pageRange.addEventListener("input", event => showPage(event.target.value));
  zoomButton.addEventListener("click", () => setZoom(!viewer.classList.contains("is-zoomed")));
  slide.addEventListener("dblclick", () => setZoom(!viewer.classList.contains("is-zoomed")));

  document.addEventListener("keydown", event => {
    if (["ArrowRight", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      showPage(currentPage + 1);
    }
    if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      showPage(currentPage - 1);
    }
    if (event.key === "Home") showPage(1);
    if (event.key === "End") showPage(TOTAL_PAGES);
  });

  viewer.addEventListener("touchstart", event => {
    if (viewer.classList.contains("is-zoomed")) return;
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  viewer.addEventListener("touchend", event => {
    if (viewer.classList.contains("is-zoomed")) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      showPage(currentPage + (deltaX < 0 ? 1 : -1));
    }
  }, { passive: true });

  stage.addEventListener("pointerdown", event => {
    if (viewer.classList.contains("is-zoomed")) return;
    isDragging = true;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerCurrentX = event.clientX;
    stage.classList.add("is-dragging");
    slide.style.transition = "none";
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", event => {
    if (!isDragging || viewer.classList.contains("is-zoomed")) return;
    pointerCurrentX = event.clientX;
    const deltaX = pointerCurrentX - pointerStartX;
    const limitedDelta = Math.max(-120, Math.min(120, deltaX));
    slide.style.transform = `translateX(${limitedDelta}px)`;
  });

  stage.addEventListener("pointerup", event => {
    if (!isDragging) return;
    isDragging = false;
    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    slide.style.transition = "transform .18s ease, opacity .14s ease";

    if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      slide.style.transform = `translateX(${deltaX < 0 ? -180 : 180}px)`;
      setTimeout(() => showPage(currentPage + (deltaX < 0 ? 1 : -1)), 80);
    } else {
      resetDrag();
    }
  });

  stage.addEventListener("pointercancel", resetDrag);

  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        if (screen.orientation?.lock) {
          await screen.orientation.lock("landscape").catch(() => {});
        }
      } else {
        await document.exitFullscreen();
        if (screen.orientation?.unlock) screen.orientation.unlock();
      }
    } catch {
      notify("Trình duyệt không hỗ trợ toàn màn hình");
    }
  });

  window.addEventListener("hashchange", () => showPage(pageFromHash(), false));
  window.addEventListener("resize", queueFitStage);
  window.addEventListener("orientationchange", queueFitStage);
  document.addEventListener("fullscreenchange", queueFitStage);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", queueFitStage);
  }
  queueFitStage();
  showPage(currentPage, false);
})();
