(() => {
  const gallery = document.getElementById("gallery");
  const loading = document.getElementById("loading");
  const emptyState = document.getElementById("empty-state");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const downloadLink = document.getElementById("download-link");
  const videoGrid = document.getElementById("video-grid");

  if (!gallery || !loading || !emptyState || !lightbox || !lightboxImage
      || !lightboxCaption || !downloadLink || !videoGrid) {
    console.error("Unable to initialize the gallery: required elements are missing.");
    return;
  }

  const githubUsername = "muregavictor-dev";
  const repositoryName = "NNP-C-U";
  const imageBasePath = "images/gallary";
  const videoData = [
    { id: "0eNXQHAthpQ", title: "Makutano Mission", description: "Day 1 Highlights" },
    { id: "dQw4w9WgXcQ", title: "Sunday Service", description: "Worship and Word" }
  ];

  let allImages = [];
  let filteredImages = [];
  let currentIndex = -1;
  let galleryLoadFailed = false;
  let activeCategory = "all";

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function getCategory(filename) {
    const name = filename.toLowerCase();
    if (name.includes("worship")) return "worship";
    if (name.includes("outreach")) return "outreach";
    if (name.includes("fellowship")) return "fellowship";
    if (name.includes("prayer retreat")) return "prayer retreat";
    if (name.includes("event")) return "events";
    if (name.includes("mission")) return "mission";
    return "other";
  }

  function renderGallery() {
    filteredImages = activeCategory === "all"
      ? allImages
      : allImages.filter((image) => image.category === activeCategory);

    if (!filteredImages.length) {
      gallery.replaceChildren();
      emptyState.querySelector("p").textContent = galleryLoadFailed
        ? "Gallery photos could not be loaded. Please try again later."
        : "No photos found in this category.";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    gallery.innerHTML = filteredImages.map((image, index) => `
      <div class="gallery-item" role="button" tabindex="0" data-gallery-index="${index}"
           aria-label="View ${escapeHtml(image.title)}">
        <img src="${escapeHtml(image.url)}"
             alt="${escapeHtml(image.alt)}" width="800" height="600" loading="lazy">
        <span class="gallery-overlay">
          <span class="badge bg-warning text-dark mb-2">${escapeHtml(image.category)}</span>
          <span class="h5 d-block">${escapeHtml(image.title)}</span>
        </span>
      </div>
    `).join("");
  }

  function openLightbox(index) {
    if (!Number.isInteger(index) || index < 0 || index >= filteredImages.length) {
      return;
    }

    currentIndex = index;
    const image = filteredImages[currentIndex];
    lightboxImage.src = image.url;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = image.title;
    downloadLink.href = image.url;
    lightbox.classList.add("active");
    lightbox.querySelector(".lightbox-close").focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("active");
    currentIndex = -1;
  }

  function showAdjacentImage(direction) {
    if (!filteredImages.length || currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + filteredImages.length) % filteredImages.length;
    openLightbox(nextIndex);
  }

  function renderVideos() {
    videoGrid.innerHTML = videoData.map((video) => `
      <div class="col-md-6 col-lg-4">
        <div class="video-card">
          <div class="video-thumbnail">
            <iframe src="https://www.youtube.com/embed/${video.id}"
                    title="${escapeHtml(video.title)}" loading="lazy"
                    allowfullscreen></iframe>
          </div>
          <div class="p-3">
            <h6 class="fw-bold mb-1">${escapeHtml(video.title)}</h6>
            <small class="text-muted">${escapeHtml(video.description)}</small>
          </div>
        </div>
      </div>
    `).join("");
  }

  gallery.addEventListener("click", (event) => {
    const item = event.target.closest("[data-gallery-index]");
    if (item && gallery.contains(item)) {
      openLightbox(Number(item.dataset.galleryIndex));
    }
  });
  gallery.addEventListener("keydown", (event) => {
    const item = event.target.closest("[data-gallery-index]");
    if (item && gallery.contains(item) && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openLightbox(Number(item.dataset.galleryIndex));
    }
  });

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(".filter-btn.active")?.classList.remove("active");
      button.classList.add("active");
      activeCategory = (button.dataset.category || "all").toLowerCase();
      renderGallery();
    });
  });

  lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lightbox.querySelector(".lightbox-next").addEventListener("click", () => showAdjacentImage(1));
  lightbox.querySelector(".lightbox-prev").addEventListener("click", () => showAdjacentImage(-1));
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight") showAdjacentImage(1);
    if (event.key === "ArrowLeft") showAdjacentImage(-1);
  });

  document.querySelectorAll(".reveal").forEach((element) => {
    if (!("IntersectionObserver" in window)) {
      element.classList.add("show");
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(element);
  });

  async function loadImages() {
    try {
      const url = `https://api.github.com/repos/${githubUsername}/${repositoryName}/contents/${imageBasePath}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Gallery image request failed with status ${response.status}`);
      }

      const files = await response.json();
      if (!Array.isArray(files)) {
        throw new Error("Gallery image service returned an invalid response.");
      }

      allImages = files
        .filter((file) => file && typeof file.name === "string"
          && /\.(jpg|jpeg|png|webp)$/i.test(file.name)
          && typeof file.download_url === "string")
        .map((file) => {
          const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
          const category = getCategory(file.name);
          return {
            url: file.download_url,
            category,
            title,
            alt: `NNP CU gallery photo - ${category}: ${title}`
          };
        });

      renderGallery();
    } catch (error) {
      console.error("Unable to load gallery images.", error);
      galleryLoadFailed = true;
      emptyState.querySelector("p").textContent =
        "Gallery photos could not be loaded. Please try again later.";
      emptyState.style.display = "block";
    } finally {
      loading.style.display = "none";
    }
  }

  renderVideos();
  loadImages();
})();
