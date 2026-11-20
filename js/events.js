(() => {
  // Upcoming events are read directly from published dashboard records.
  // Past events are never shown. When nothing is upcoming, the
  // "New events will be announced soon." message appears instead.
  const EVENTS_PATH = "adminData/events";
  const DEFAULT_BADGE = "bg-gold text-rich-black";
  const DEFAULT_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 533"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#185A35"/><stop offset="1" stop-color="#2F8A4B"/></linearGradient></defs><rect width="800" height="533" fill="url(#g)"/></svg>'
  );

  // Filled from Firebase (upcoming only). Kept as one array so window.NNP_EVENTS stays valid.
  const events = [];

  function isEventPast(event, now = new Date()) {
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (event.dateISO.length === 7) return event.dateISO < currentMonth;
    const eventDate = new Date(`${event.dateISO}T00:00:00`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return eventDate < today;
  }

  function renderEvent(event, mobile, index) {
    const isPast = isEventPast(event);
    const eventLabel = isPast ? `Past event | ${event.dateLabel}` : event.dateLabel;
    const details = event.details.map(([label, value]) =>
      `<li><strong class="text-deep-green">${label}:</strong> ${value}</li>`
    ).join("");
    const contact = event.contact
      ? `<p${mobile ? ' class="small mt-2"' : ""}><strong>${event.contact}</strong></p>`
      : "";

    return mobile
      ? `<div class="carousel-item ${index === 0 ? "active" : ""}">
          <div class="card event-card shadow-sm border-0 rounded-3 overflow-hidden">
            <img src="${event.image}" class="card-img-top event-image-short" alt="${event.imageAlt}" width="${event.imageWidth}" height="${event.imageHeight}" loading="lazy">
            <div class="card-body p-3">
              <span class="badge ${event.badgeClass} fw-bold mb-2">${eventLabel}</span>
              <h5 class="card-title fw-bold text-primary-green">${event.title}</h5>
              <p class="card-text text-soft-gray small mb-3">${event.description}</p>
              <ul class="list-unstyled small text-soft-gray mb-3">${details}</ul>
              <button class="btn btn-outline-primary-green btn-sm rsvp-btn w-100" data-event-id="${event.id}" aria-label="${isPast ? "Past event" : `RSVP for ${event.title}`}" ${isPast ? "disabled" : ""}>${isPast ? "Past event" : "RSVP"}</button>
              ${contact}
            </div>
          </div>
        </div>`
      : `<div class="col-lg-4">
          <div class="card event-card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
            <img src="${event.image}" class="card-img-top event-image-tall" alt="${event.imageAlt}" width="${event.imageWidth}" height="${event.imageHeight}" loading="lazy">
            <div class="card-body p-4">
              <span class="badge ${event.badgeClass} fw-bold mb-2">${eventLabel}</span>
              <h5 class="card-title fw-bold text-primary-green">${event.title}</h5>
              <p class="card-text text-soft-gray small mb-3">${event.description}</p>
              <ul class="list-unstyled small text-soft-gray">${details}</ul>
              <button class="badge ${event.badgeClass} fw-bold mb-2 btn btn-sm rsvp-btn" data-event-id="${event.id}" aria-label="${isPast ? "Past event" : `RSVP for ${event.title}`}" ${isPast ? "disabled" : ""}>${isPast ? "Past event" : "RSVP"}</button>
              ${contact}
            </div>
          </div>
        </div>`;
  }

  /* ---------- Firebase data -> safe event objects ---------- */

  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/;

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function makeDateLabel(iso) {
    const [year, month, day] = iso.split("-");
    return day
      ? `${ordinal(Number(day))} ${MONTHS_SHORT[Number(month) - 1]} ${year}`
      : `${MONTHS_LONG[Number(month) - 1]} ${year}`;
  }

  // details may be {Time: "7 PM"}, [["Time", "7 PM"]] or [{label, value}]
  function normalizeDetails(raw) {
    if (!raw || typeof raw !== "object") return [];
    const items = Array.isArray(raw) ? raw : Object.entries(raw);
    return items.map((item) => {
      if (Array.isArray(item)) {
        const [a, b] = item;
        return b && typeof b === "object" ? [b.label ?? a, b.value] : [a, b];
      }
      return item && typeof item === "object" ? [item.label, item.value] : null;
    })
      .filter((pair) => pair && pair[0] && pair[1] !== undefined && pair[1] !== null && pair[1] !== "")
      .map(([label, value]) => [String(label), String(value)]);
  }

  function safeImage(src) {
    const value = String(src ?? "").trim();
    if (!value) return DEFAULT_IMAGE;
    if (/^https?:\/\//i.test(value)) return value;
    // block javascript:, data:, protocol-relative and any other scheme
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) return DEFAULT_IMAGE;
    return value;
  }

  function normalizeEvent(key, raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = String(raw.title ?? "").trim();
    const dateISO = String(raw.dateISO ?? "").trim();
    if (!title || !ISO_DATE.test(dateISO)) return null;
    const badge = String(raw.badgeClass ?? "").trim();
    return {
      id: String(key),
      title,
      dateISO,
      dateLabel: String(raw.dateLabel ?? "").trim() || makeDateLabel(dateISO),
      image: safeImage(raw.image),
      imageAlt: String(raw.imageAlt ?? "").trim() || title,
      imageWidth: Number(raw.imageWidth) || 800,
      imageHeight: Number(raw.imageHeight) || 533,
      description: String(raw.description ?? "").trim(),
      details: normalizeDetails(raw.details),
      contact: String(raw.contact ?? "").trim(),
      badgeClass: badge && /^[\w\s-]+$/.test(badge) ? badge : DEFAULT_BADGE
    };
  }

  // Data comes from a database, so escape it before it goes into innerHTML.
  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
  const toSafe = (event) => ({
    ...event,
    id: esc(event.id),
    title: esc(event.title),
    dateLabel: esc(event.dateLabel),
    image: esc(event.image),
    imageAlt: esc(event.imageAlt),
    description: esc(event.description),
    details: event.details.map(([label, value]) => [esc(label), esc(value)]),
    contact: esc(event.contact),
    badgeClass: esc(event.badgeClass)
  });

  /* ---------- Firebase connection ---------- */

  async function fetchPublicEvents() {
    const [{ database }, { get, query, ref, orderByChild, equalTo }] = await Promise.all([
      import("./firebase-config.js"),
      import("https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js")
    ]);
    const publishedEvents = query(ref(database, EVENTS_PATH), orderByChild("published"), equalTo(true));
    const snapshot = await get(publishedEvents);
    return snapshot.val() || {};
  }

  /* ---------- Page wiring ---------- */

  const desktopEvents = document.getElementById("eventsDesktop");
  const mobileEvents = document.getElementById("eventsMobile");
  const eventAnnouncement = document.getElementById("eventsAnnouncement");
  if (!desktopEvents || !mobileEvents || !eventAnnouncement) {
    console.error("Unable to initialize events: required event containers are missing.");
    return;
  }
  const mobileCarousel = document.getElementById("eventsMobileCarousel");
  // Keep the (empty) carousel out of the way until events arrive.
  if (mobileCarousel) mobileCarousel.hidden = true;

  window.NNP_EVENTS = events;
  window.isNNPEventPast = isEventPast;
  window.getNNPEventsSummary = () => {
    const upcoming = events.filter((event) => !isEventPast(event));
    return upcoming.length
      ? `Upcoming events: ${upcoming.map((event) => `${event.title} (${event.dateLabel})`).join("; ")}.`
      : "No upcoming events are currently listed. New events will be announced soon.";
  };

  function render() {
    desktopEvents.innerHTML = events.map((event) => renderEvent(toSafe(event), false, 0)).join("");
    mobileEvents.innerHTML = events.map((event, index) => renderEvent(toSafe(event), true, index)).join("");
    desktopEvents.classList.add("justify-content-center");
    if (mobileCarousel) {
      mobileCarousel.hidden = events.length === 0;
      mobileCarousel.querySelectorAll(".carousel-control-prev, .carousel-control-next")
        .forEach((control) => { control.hidden = events.length < 2; });
    }
    eventAnnouncement.hidden = events.some((event) => !isEventPast(event));
  }

  // Resolves when events have loaded (or failed), e.g. for other scripts that need them.
  window.nnpEventsReady = fetchPublicEvents()
    .then((data) => {
      const entries = Object.entries(data || {});
      const upcoming = entries
        .map(([key, value]) => normalizeEvent(key, {
          ...value,
          dateISO: value?.date,
          details: [
            ...(value?.time ? [["Time", value.time]] : []),
            ...(value?.location ? [["Location", value.location]] : [])
          ]
        }))
        .filter((event) => event && !isEventPast(event))
        .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
      events.splice(0, events.length, ...upcoming);
    })
    .catch((error) => {
      console.error("Unable to load events from Firebase:", error);
      events.length = 0;
    })
    .finally(render);
})();
