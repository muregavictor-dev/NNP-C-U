(() => {
  const LIBRARY_BORROW_ENDPOINT = null;
  const BOOK_SUGGESTION_ENDPOINT = null;
  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  function scrollToField(cardId, inputId) {
    const card = document.getElementById(cardId);
    const input = document.getElementById(inputId);
    card?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => input?.focus(), 500);
  }

  const scrollTargets = {
    bible: ["bible-search-card", "bible-search-input"],
    suggestion: ["suggest-card", "suggestion-input"],
    dictionary: ["dict-card", "christian-dict-input"]
  };
  document.querySelectorAll(".interactive-card[role='button'][data-scroll-target]").forEach((card) => {
    const targetIds = scrollTargets[card.dataset.scrollTarget];
    if (!targetIds) return;
    const activate = () => scrollToField(...targetIds);
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });

  function showMessage(target, text, className = "") {
    const message = document.createElement("p");
    message.textContent = text;
    if (className) message.className = className;
    target.replaceChildren(message);
  }

  function renderBibleVerses(target, verses) {
    const fragment = document.createDocumentFragment();
    verses.forEach((verse) => {
      const card = document.createElement("div");
      card.className = "mini-card";
      const heading = document.createElement("h5");
      heading.textContent = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
      const text = document.createElement("p");
      text.textContent = verse.text;
      card.append(heading, text);
      fragment.append(card);
    });
    target.replaceChildren(fragment);
  }

  async function fetchBibleVerse(query, target) {
    showMessage(target, "Searching scripture...");
    try {
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Bible lookup failed with status ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data.verses) || !data.verses.length) {
        showMessage(target, `No results for "${query}". Try a format like "John 3:16".`, "error");
        return;
      }
      renderBibleVerses(target, data.verses);
    } catch (error) {
      console.error("Bible lookup failed.", error);
      showMessage(target, "Failed to fetch the verse. Check the format (e.g., Romans 8:28).", "error");
    }
  }

  const globalSearchForm = document.getElementById("global-search-form");
  globalSearchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = document.getElementById("global-search-input").value.trim();
    const results = document.getElementById("global-search-results");
    if (!query) return;

    showMessage(results, `Searching for "${query}"...`);
    if (/[a-z]+\s*\d+:\d+/i.test(query)) {
      await fetchBibleVerse(query, results);
      return;
    }

    const match = [...document.querySelectorAll(".book-list li p")]
      .find((book) => book.textContent.toLowerCase().includes(query.toLowerCase()));
    if (!match) {
      showMessage(results, "No match found in the catalogue. Try the Bible or Dictionary tools below.");
      return;
    }

    const card = document.createElement("div");
    card.className = "mini-card";
    card.style.borderLeft = "3px solid var(--secondary-color)";
    const heading = document.createElement("h5");
    heading.textContent = "Found in catalogue";
    const title = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = match.textContent;
    title.append(strong);
    card.append(heading, title);
    results.replaceChildren(card);
    document.getElementById("hardcopy-books-section")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("bible-search-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = document.getElementById("bible-search-input").value.trim();
    if (query) {
      await fetchBibleVerse(query, document.getElementById("bible-results"));
    }
  });

  const christianTerms = {
    grace: "Unmerited favor from God, received through faith in Christ.",
    faith: "Complete trust and confidence in God and His promises.",
    salvation: "Deliverance from sin and reconciliation with God through Jesus.",
    repentance: "Turning away from sin and toward God with a sincere heart.",
    baptism: "Symbol of spiritual cleansing and public declaration of faith.",
    covenant: "A sacred agreement between God and His people.",
    redemption: "Being bought back or freed from sin through Christ's sacrifice.",
    sanctification: "The process of becoming more holy and Christ-like.",
    justification: "Being declared righteous before God through faith in Jesus.",
    atonement: "The reconciliation of God and humanity through Christ's sacrifice.",
    trinity: "The belief in one God existing in three persons: Father, Son, and Holy Spirit."
  };

  const christianInsights = {
    grace: "Grace empowers believers to live righteously through God's enabling power.",
    faith: "Faith is a confident trust based on God's character and promises revealed in Scripture.",
    salvation: "Salvation is a gift received through faith in Jesus Christ, not earned through good works.",
    repentance: "True repentance involves a change of mind and direction, turning from sin to God.",
    baptism: "Baptism represents the believer's identification with Christ's death, burial, and resurrection.",
    covenant: "God's covenants show His faithfulness and commitment to His promises throughout history.",
    redemption: "Redemption illustrates the price Jesus paid to set humanity free.",
    sanctification: "Sanctification is both an act at salvation and a lifelong process of spiritual growth.",
    justification: "Justification means God declares believers righteous because of Christ.",
    atonement: "Atonement shows God's justice and mercy meeting at the cross.",
    trinity: "The Trinity shows the relational nature of God and unity within the Godhead."
  };

  document.getElementById("christian-dict-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("christian-dict-input");
    const term = input.value.trim().toLowerCase();
    const results = document.getElementById("christian-dict-results");
    if (!term) return;

    const card = document.createElement("div");
    card.className = "mini-card";
    const heading = document.createElement("h5");
    heading.textContent = term.charAt(0).toUpperCase() + term.slice(1);
    const definition = document.createElement("p");
    definition.textContent = christianTerms[term]
      || "No local definition found. Check external resources.";
    card.append(heading, definition);

    if (christianInsights[term]) {
      const insight = document.createElement("div");
      insight.className = "ai-result";
      const insightHeading = document.createElement("h4");
      insightHeading.textContent = "Spiritual Insight:";
      const insightText = document.createElement("p");
      insightText.textContent = christianInsights[term];
      insight.append(insightHeading, insightText);
      card.append(insight);
    }

    results.replaceChildren(card);
    input.value = "";
  });

  document.getElementById("suggestion-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("suggestion-input");
    const suggestion = input.value.trim();
    const results = document.getElementById("suggestion-results");
    if (!suggestion) {
      showMessage(results, "Please type a suggestion.");
      return;
    }

    if (!BOOK_SUGGESTION_ENDPOINT) {
      showMessage(results, "No suggestion was sent. Please contact the library.");
      return;
    }

    try {
      const response = await fetch(BOOK_SUGGESTION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion })
      });
      if (!response.ok) {
        throw new Error(`Suggestion request failed with status ${response.status}`);
      }
      showMessage(results, "Thank you. Your suggestion was sent to the library.");
      input.value = "";
    } catch (error) {
      console.error("Book suggestion submission failed.", error);
      showMessage(results, "Your suggestion could not be sent. Please try again.");
    }
  });

  const modal = document.getElementById("booking-modal");
  const bookingForm = document.getElementById("booking-form");
  const bookTitleInput = document.getElementById("book-title-modal");
  const admissionInput = document.getElementById("admission-number");
  const closeButton = document.querySelector(".close-modal");
  let modalTrigger = null;

  function closeBookingModal() {
    if (!modal || !bookingForm) return;
    modal.style.display = "none";
    bookingForm.reset();
    modalTrigger?.focus();
  }

  document.querySelectorAll(".borrow-btn:not(.disabled):not([disabled])").forEach((button) => {
    button.addEventListener("click", () => {
      if (!modal || !bookTitleInput || !admissionInput) return;
      modalTrigger = button;
      bookTitleInput.value = button.dataset.book || "";
      modal.style.display = "block";
      admissionInput.focus();
    });
  });

  closeButton?.addEventListener("click", closeBookingModal);
  window.addEventListener("click", (event) => {
    if (event.target === modal) closeBookingModal();
  });

  modal?.addEventListener("keydown", (event) => {
    if (modal.style.display !== "block") return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeBookingModal();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [...modal.querySelectorAll(
      "button:not([disabled]), input:not([disabled]), [role='button'][tabindex='0']"
    )].filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });

  bookingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!LIBRARY_BORROW_ENDPOINT) {
      window.alert("No request was sent. Please contact the library.");
      return;
    }

    const formData = {
      book: bookTitleInput.value,
      admission: admissionInput.value,
      mobile: document.getElementById("mobile-number").value,
      returnDate: document.getElementById("return-date").value
    };

    try {
      const response = await fetch(LIBRARY_BORROW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error(`Borrow request failed with status ${response.status}`);
      }
      window.alert("Your request was sent to the library.");
      closeBookingModal();
    } catch (error) {
      console.error("Book borrowing request failed.", error);
      window.alert("Your request could not be sent. Please try again.");
    }
  });

  document.getElementById("return-date")?.setAttribute("min", localToday);
})();
