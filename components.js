(() => {
  const componentDefinitions = [
    { placeholderId: "header-placeholder", file: "header.html", selector: "header" },
    { placeholderId: "footer-placeholder", file: "footer.html", selector: "footer" }
  ];

  async function loadComponent({ placeholderId, file, selector }) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
      console.error(`Cannot load ${file}: #${placeholderId} was not found.`);
      return;
    }

    placeholder.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(new URL(file, document.baseURI));
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const componentDocument = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
      );
      const component = componentDocument.querySelector(selector);
      if (!component) {
        throw new Error(`${file} does not contain a ${selector} element.`);
      }

      placeholder.replaceChildren(document.importNode(component, true));

      if (selector === "header") {
        addHeaderOverlays(componentDocument, placeholder);
        setActiveNavigation();
      } else {
        const currentYear = placeholder.querySelector("#currentYear");
        if (currentYear) {
          currentYear.textContent = String(new Date().getFullYear());
        }
      }
    } catch (error) {
      console.error(`Unable to load ${file}.`, error);
      placeholder.textContent = `Unable to load the site ${selector}. Please refresh the page.`;
      placeholder.setAttribute("role", "alert");
    } finally {
      placeholder.removeAttribute("aria-busy");
    }
  }

  function addHeaderOverlays(componentDocument, placeholder) {
    const notificationPanel = componentDocument.querySelector("#notificationPanel");
    const membershipModal = componentDocument.querySelector("#membershipModal");

    if (notificationPanel && !document.getElementById(notificationPanel.id)) {
      placeholder.append(document.importNode(notificationPanel, true));
      bindNotificationActions();
    }

    if (membershipModal && !document.getElementById(membershipModal.id)) {
      const modal = document.importNode(membershipModal, true);
      placeholder.append(modal);
      bindMembershipForm(modal.querySelector("#membershipForm"));
    }
  }

  function bindNotificationActions() {
    const markAsReadButton = document.getElementById("markAsReadBtn");
    if (!markAsReadButton) {
      return;
    }

    markAsReadButton.addEventListener("click", () => {
      const notification = document.getElementById("notificationItem");
      const unreadCount = document.getElementById("unreadCount");
      const badge = document.getElementById("notificationBadge");

      if (notification) {
        notification.hidden = true;
      }
      if (unreadCount) {
        unreadCount.textContent = "0";
      }
      if (badge) {
        badge.hidden = true;
      }
    });
  }

  function bindMembershipForm(form) {
    if (!form) {
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    if (!button) {
      console.error("Cannot initialize the membership form: its submit button was not found.");
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Submitting...";

      try {
        const response = await fetch(
          "https://script.google.com/macros/s/AKfycbwrT0WvUq1FwHp-LsOWa7PxVe_Herzz7LFc2BV8_J1Uwzf79KM6iM8_PXORxmazSY7w/exec",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: form.querySelector("#memberFullName").value,
              studentID: form.querySelector("#memberStudentID").value,
              email: form.querySelector("#memberEmail").value,
              phone: form.querySelector("#memberPhone").value,
              yearClass: form.querySelector("#memberYearClass").value
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Membership request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          alert(`✅ ${result.message}`);
          form.reset();
        } else {
          alert(`❌ ${result.error}`);
        }
      } catch (error) {
        console.error("Membership form submission failed.", error);
        alert("⚠️ Network error. Try again.");
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  }

  function setActiveNavigation() {
    const currentLocation = new URL(window.location.href);
    if (currentLocation.pathname.endsWith("/")) {
      currentLocation.pathname += "index.html";
    }

    const navigationLinks = [...document.querySelectorAll("#top-header .nav-link")];
    const matchingSectionLink = navigationLinks.some((link) => {
      const target = new URL(link.href, window.location.href);
      return target.pathname === currentLocation.pathname
        && target.hash
        && target.hash === currentLocation.hash;
    });

    navigationLinks.forEach((link) => {
      const target = new URL(link.href, window.location.href);
      const isCurrentPage = target.pathname === currentLocation.pathname;
      const isActive = isCurrentPage
        && (target.hash ? target.hash === currentLocation.hash : !matchingSectionLink);

      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.addEventListener("hashchange", setActiveNavigation);
  Promise.all(componentDefinitions.map(loadComponent));
})();
