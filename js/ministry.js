(() => {
  const progressBar = document.getElementById("progressBar");
  const registrationForm = document.getElementById("group-registration");
  const messageBox = document.getElementById("registration-message");
  const submitButton = document.getElementById("submitBtn");

  if (!registrationForm || !messageBox || !submitButton) {
    console.error("Ministry registration form could not be initialized: required elements are missing.");
    return;
  }

  if (typeof AOS !== "undefined") {
    AOS.init({ duration: 800, once: true, offset: 100 });
  } else {
    console.error("AOS could not be initialized because its script did not load.");
  }

  window.addEventListener("scroll", () => {
    if (!progressBar) return;
    const scrollableHeight = document.documentElement.scrollHeight
      - document.documentElement.clientHeight;
    const scrolled = scrollableHeight > 0
      ? (window.scrollY / scrollableHeight) * 100
      : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
  }, { passive: true });

  const counters = document.querySelectorAll(".counter");
  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const counter = entry.target;
        const target = Number(counter.dataset.target);
        if (!Number.isFinite(target)) {
          console.error("Unable to animate a ministry counter with an invalid target.", counter);
          observer.unobserve(counter);
          return;
        }

        const duration = 1000;
        const startedAt = performance.now();
        const animate = (now) => {
          const progress = Math.min((now - startedAt) / duration, 1);
          counter.textContent = `${Math.ceil(target * progress)}${progress === 1 ? "+" : ""}`;
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
        observer.unobserve(counter);
      });
    }, { threshold: 0.5 });
    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach((counter) => {
      counter.textContent = `${counter.dataset.target}+`;
    });
  }

  const ministryEmails = {
    "praise-worship": null,
    "bible-study": null,
    evangelism: null,
    ushering: null,
    intercessory: null,
    hospitality: null,
    discipleship: null,
    "revival-wave": null,
    media: null,
    "hope-restoration": null,
    "piano-class": null,
    "christ-dancers": null
  };

  function escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
  }

  function showRegistrationError(message) {
    const error = document.createElement("p");
    error.className = "error";
    error.textContent = message;
    messageBox.replaceChildren(error);
  }

  function normalizeMinistryName(value) {
    return String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function applyPublishedMinistries(records) {
    const cards = [...document.querySelectorAll(".ministry-card, .group-card")];
    const targetRow = document.querySelector(".ministry-card")?.closest(".row");
    if (!targetRow) return;
    Object.entries(records || {}).forEach(([key, record]) => {
      const name = String(record?.name || "").trim();
      if (!name) return;
      let card = cards.find((candidate) => candidate.dataset.firebaseMinistryKey === key)
        || cards.find((candidate) => normalizeMinistryName(candidate.querySelector("h3, h4")?.textContent) === normalizeMinistryName(name));
      if (!card) {
        console.warn(`Published ministry record ${key} did not match an existing ministry name; added as a separate card. Existing hard-coded content was preserved.`);
        const wrapper = document.createElement("div");
        wrapper.className = "col-md-6 col-lg-4";
        card = document.createElement("article");
        card.className = "ministry-card";
        const signup = document.createElement("a");
        signup.href = "#contact-form";
        signup.className = "btn btn-outline-primary w-100 btn-sm";
        signup.textContent = "Sign Up";
        card.append(signup);
        wrapper.append(card);
        targetRow.append(wrapper);
        cards.push(card);
      }
      card.dataset.firebaseMinistryKey = key;
      let heading = card.querySelector("h3, h4");
      if (!heading) { heading = document.createElement("h3"); heading.className = "h4 fw-bold text-primary-green mb-3"; card.prepend(heading); }
      heading.textContent = name;
      let description = card.querySelector("p");
      if (!description) { description = document.createElement("p"); description.className = "text-muted mb-4 flex-grow-1"; heading.after(description); }
      description.textContent = String(record.description || "");
      const leaderValue = String(record.leader || "").trim();
      let leader = [...card.querySelectorAll("p")].find((paragraph) => /^\s*Leader:/i.test(paragraph.textContent));
      if (leaderValue) {
        if (!leader) { leader = document.createElement("p"); leader.className = "mb-2 small"; card.append(leader); }
        leader.textContent = `Leader: ${leaderValue}`;
      }
      const contact = String(record.contact || "").trim();
      let contactNode = card.querySelector("[data-firebase-contact]");
      if (contact) {
        if (!contactNode) { contactNode = document.createElement("p"); contactNode.className = "small"; contactNode.dataset.firebaseContact = "true"; card.append(contactNode); }
        contactNode.textContent = `Contact: ${contact}`;
      }
    });
  }

  async function loadPublishedMinistries() {
    try {
      const [{ database }, { get, query, ref, orderByChild, equalTo }] = await Promise.all([
        import("./firebase-config.js"),
        import("https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js")
      ]);
      const snapshot = await get(query(ref(database, "adminData/ministries"), orderByChild("published"), equalTo(true)));
      applyPublishedMinistries(snapshot.val());
    } catch (error) {
      console.error("Unable to load published ministries.", error);
    }
  }

  loadPublishedMinistries();

  registrationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("name").value.trim();
    const regNumber = document.getElementById("reg-number").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const groupSelect = document.getElementById("group");
    const selectedGroupValue = groupSelect.value;
    const selectedGroupText = groupSelect.options[groupSelect.selectedIndex].text;
    const targetEmail = ministryEmails[selectedGroupValue];
    let submitted = false;

    messageBox.replaceChildren();
    submitButton.classList.add("btn-loading");
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="opacity-0">Submitting...</span>';

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, regNumber, phone, group: selectedGroupValue })
      });
      const result = await response.json();

      if (response.ok && result.success === true) {
        messageBox.innerHTML = `
          <div class="success-message p-4 text-center">
            <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
            <h4 class="fw-bold text-success mb-3">Successfully Enrolled!</h4>
            <p><strong>Thank you, ${escapeHtml(name)}!</strong></p>
            <p>Your enrollment was confirmed for the <strong>${escapeHtml(selectedGroupText)}</strong> ministry.</p>
            ${targetEmail ? `<p class="text-muted small mb-0"><i class="fas fa-envelope me-2"></i>Contact: <strong>${escapeHtml(targetEmail)}</strong></p>` : ""}
          </div>`;
        submitted = true;
      } else {
        showRegistrationError(result.message
          || "Enrollment could not be confirmed. Please try again.");
      }
    } catch (error) {
      console.error("Ministry registration failed.", error);
      showRegistrationError("Network error. Check your connection and try again.");
    } finally {
      submitButton.classList.remove("btn-loading");
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-check-circle me-2"></i> Submit Enrollment';
    }

    messageBox.classList.remove("d-none");
    messageBox.scrollIntoView({ behavior: "smooth", block: "center" });
    if (submitted) {
      registrationForm.reset();
      window.setTimeout(() => messageBox.classList.add("d-none"), 15000);
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const targetId = anchor.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

})();
