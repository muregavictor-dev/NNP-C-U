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
  const dynamicVideos = [];
  const resourceCardsByKey = new Map();
  const resourceUrls = new Set();
  let resourceGrid = null;

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
    videoGrid.innerHTML = [...videoData.map((video) => ({ ...video, embedUrl: video.embedUrl || `https://www.youtube.com/embed/${video.id}` })), ...dynamicVideos].map((video) => `
      <div class="col-md-6 col-lg-4">
        <div class="video-card">
          <div class="video-thumbnail">
            <iframe src="${escapeHtml(video.embedUrl)}"
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

  function safeResourceUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url : null;
    } catch { return null; }
  }

  function normalizeName(value) {
    return String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function youtubeEmbed(url) {
    const host = url.hostname.toLowerCase();
    let id = "";
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") || "" : url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1] || "";
    } else if (["youtu.be", "www.youtu.be"].includes(host)) {
      id = url.pathname.slice(1).match(/^[\w-]{11}$/)?.[0] || "";
    }
    return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : "";
  }

  async function loadResources() {
    try {
      const [{ database }, { get, query, ref, orderByChild, equalTo }] = await Promise.all([
        import("./firebase-config.js"),
        import("https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js")
      ]);
      const snapshot = await get(query(ref(database, "adminData/resources"), orderByChild("published"), equalTo(true)));
      if (!resourceGrid) {
        resourceGrid = document.createElement("div");
        resourceGrid.className = "row g-3 mt-2";
        resourceGrid.setAttribute("aria-label", "Published media and resources");
      }

      Object.entries(snapshot.val() || {}).forEach(([key, item]) => {
        const title = String(item?.title || "").trim();
        const url = safeResourceUrl(item?.url);
        const type = String(item?.type || "Link").toLowerCase();
        if (!title || !url) {
          console.warn(`Published resource ${key} has a missing title or an invalid/non-HTTPS URL; it was skipped.`);
          return;
        }
        if (type === "photo") {
          if (!/\.(?:jpe?g|png|webp|gif)(?:$|\?)/i.test(url.href)) {
            console.warn(`Published photo ${key} has an unsupported image URL; it was skipped.`);
            return;
          }
          const match = allImages.find((image) => {
            try {
              return new URL(image.url, location.href).href === url.href
                || normalizeName(image.title) === normalizeName(title);
            } catch { return false; }
          });
          const photo = { url: url.href, category: match?.category || "resources", title, alt: String(item.description || title) };
          if (match) Object.assign(match, photo);
          else {
            console.warn(`Published photo ${key} did not match an existing gallery photo by title or URL; added as a separate photo. Existing GitHub content was preserved.`);
            allImages.push(photo);
          }
        } else if (type === "video") {
          let embedUrl = youtubeEmbed(url);
          if (!embedUrl && url.hostname.toLowerCase() === "player.vimeo.com" && /^\/video\/\d+$/.test(url.pathname)) embedUrl = url.href;
          if (!embedUrl) {
            console.warn(`Published video ${key} does not use a supported YouTube or Vimeo URL; it was skipped.`);
            return;
          }
          const match = dynamicVideos.find((video) => video.key === key || video.embedUrl === embedUrl || normalizeName(video.title) === normalizeName(title))
            || videoData.find((video) => normalizeName(video.title) === normalizeName(title)
              || `https://www.youtube.com/embed/${video.id}` === embedUrl
              || `https://www.youtube-nocookie.com/embed/${video.id}` === embedUrl);
          if (match) Object.assign(match, { key, title, description: String(item.description || ""), embedUrl });
          else {
            console.warn(`Published video ${key} did not match an existing video by title or provider URL; added as a separate video.`);
            dynamicVideos.push({ key, title, description: String(item.description || ""), embedUrl });
          }
        } else {
          let existing = resourceCardsByKey.get(key);
          if (!existing && resourceUrls.has(url.href)) return;
          if (!existing) {
            console.warn(`Published resource ${key} has no matching existing gallery item by URL; added as a separate link.`);
            const card = document.createElement("div");
            card.className = "col-md-6 col-lg-4";
            const link = document.createElement("a");
            link.className = "card h-100 p-3 text-decoration-none";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            const heading = document.createElement("h3");
            heading.className = "h5";
            const description = document.createElement("p");
            description.className = "mb-0 text-muted";
            link.append(heading, description);
            card.append(link);
            resourceGrid.append(card);
            existing = { card, link, heading, description };
            resourceCardsByKey.set(key, existing);
          }
          existing.link.href = url.href;
          existing.heading.textContent = title;
          existing.description.textContent = String(item.description || type);
          resourceUrls.add(url.href);
        }
      });
      if (resourceGrid.childElementCount && !resourceGrid.isConnected) videoGrid.after(resourceGrid);
      renderGallery();
      renderVideos();
    } catch (error) {
      console.error("Unable to load published gallery resources.", error);
    }
  }

  renderVideos();
  loadImages().then(loadResources);
})();
