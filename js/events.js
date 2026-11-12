(() => {
  const events = [
    {
      id: "e1",
      title: "Mega Kesha",
      dateISO: "2026-01-30",
      dateLabel: "30th Jan 2026",
      image: "kesha 2026.jpeg",
      imageAlt: "Mega Kesha",
      imageWidth: 1080,
      imageHeight: 1350,
      description: "Join the Nyeri National Polytechnic Christian Union for a transformative Mega Kesha on January 30th, featuring Guest Minister Apostle Joseph Murimi, for a dedicated night of prayer, worship, and the Word.",
      details: [["Time", "9:00 PM - 5:00 AM"], ["Location", "Main Hall"]],
      contact: "0702970150 - Prayer Coordinator",
      badgeClass: "bg-gold text-rich-black"
    },
    {
      id: "e2",
      title: "Prayer Retreat",
      dateISO: "2026-02-07",
      dateLabel: "7th Feb 2026",
      image: "prayer retreat .jpeg",
      imageAlt: "Prayer Retreat",
      imageWidth: 904,
      imageHeight: 1280,
      description: "Register now for Ksh 350 to join us at Mt. Olivet on February 7th for a life-changing encounter with God.",
      details: [["Time", "7:00 AM - 4:00 PM"], ["Location", "Mount Olivet"]],
      contact: "",
      badgeClass: "bg-primary-green text-white"
    },
    {
      id: "e3",
      title: "Mission",
      dateISO: "2026-04",
      dateLabel: "April 2026",
      image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800",
      imageAlt: "Mission event",
      imageWidth: 800,
      imageHeight: 533,
      description: "Equipping our student leaders for ministry excellence and spiritual maturity.",
      details: [["Day", "Sunday - Monday"], ["Venue", "To be communicated"]],
      contact: "0707029995 - Mission Coordinator",
      badgeClass: "bg-gold text-rich-black"
    }
  ];

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

  const desktopEvents = document.getElementById("eventsDesktop");
  const mobileEvents = document.getElementById("eventsMobile");
  const eventAnnouncement = document.getElementById("eventsAnnouncement");
  if (!desktopEvents || !mobileEvents || !eventAnnouncement) {
    console.error("Unable to initialize events: required event containers are missing.");
    return;
  }

  window.NNP_EVENTS = events;
  window.isNNPEventPast = isEventPast;
  window.getNNPEventsSummary = () => {
    const upcoming = events.filter((event) => !isEventPast(event));
    return upcoming.length
      ? `Upcoming events: ${upcoming.map((event) => `${event.title} (${event.dateLabel})`).join("; ")}.`
      : "No upcoming events are currently listed. New events will be announced soon.";
  };

  desktopEvents.innerHTML = events.map((event) => renderEvent(event, false, 0)).join("");
  mobileEvents.innerHTML = events.map((event, index) => renderEvent(event, true, index)).join("");
  eventAnnouncement.hidden = events.some((event) => !isEventPast(event));
})();
