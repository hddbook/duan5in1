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
  const shareButton = document.querySelector("#shareButton");
  const fullscreenButton = document.querySelector("#fullscreenButton");
  const toast = document.querySelector("#toast");

  let currentPage = pageFromHash();
  let touchStartX = 0;
  let touchStartY = 0;
  let toastTimer;

  function setZoom(enabled) {
    viewer.classList.toggle("is-zoomed", enabled);
    zoomButton.setAttribute("aria-label", enabled ? "Thu nhỏ trang" : "Phóng to trang");
    zoomButton.title = enabled ? "Thu nhỏ" : "Phóng to";
    if (enabled) {
      requestAnimationFrame(() => {
        viewer.scrollLeft = Math.max(0, (viewer.scrollWidth - viewer.clientWidth) / 2);
        viewer.scrollTop = Math.max(0, (viewer.scrollHeight - viewer.clientHeight) / 2);
      });
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
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  viewer.addEventListener("touchend", event => {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      showPage(currentPage + (deltaX < 0 ? 1 : -1));
    }
  }, { passive: true });

  shareButton.addEventListener("click", async () => {
    const shareData = {
      title: document.title,
      text: "Xem tài liệu trực tuyến",
      url: location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(location.href);
        notify("Đã sao chép liên kết");
      }
    } catch (error) {
      if (error.name !== "AbortError") notify("Không thể chia sẻ liên kết");
    }
  });

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
  showPage(currentPage, false);
})();
