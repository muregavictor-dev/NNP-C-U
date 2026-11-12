(() => {
  const form = document.getElementById("contact-form");
  const messageBox = document.getElementById("contact-message-box");

  if (!form || !messageBox) {
    console.error("Unable to initialize the contact form: required elements are missing.");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    messageBox.className = "mt-4 p-3 text-center rounded-3 fw-semibold alert alert-info";
    messageBox.textContent = "Sending your message...";

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Contact form request failed with status ${response.status}`);
      }

      messageBox.className = "mt-4 p-3 text-center rounded-3 fw-semibold alert alert-success";
      messageBox.textContent = "Message sent successfully! We’ll get back to you soon.";
      form.reset();
    } catch (error) {
      console.error("Contact form submission failed.", error);
      messageBox.className = "mt-4 p-3 text-center rounded-3 fw-semibold alert alert-danger";
      messageBox.textContent = "Your message could not be sent. Please try again later.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
      messageBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
})();
