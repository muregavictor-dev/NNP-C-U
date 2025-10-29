<!-- === JS DEPENDENCIES === -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>

<!-- === MAIN SCRIPT === -->

/**
 * NNP Christian Union Landing Page - Interactive Logic
 * Handles smooth scrolling, forms, modals, widgets, and animations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // === 1. Smooth Scrolling ===
    const scrollLinks = document.querySelectorAll('.scroll-link, .nav-link');
    scrollLinks.forEach(link => {
        link.addEventListener('click', e => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                const section = document.querySelector(targetId);
                if (section) section.scrollIntoView({ behavior: 'smooth' });

                // Close offcanvas menu (mobile)
                const offcanvasNav = document.getElementById('offcanvasNav');
                if (offcanvasNav?.classList.contains('show')) {
                    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasNav);
                    bsOffcanvas?.hide();
                }
            }
        });
    });

    // === 2. Membership Form Submission ===
    const membershipForm = document.getElementById('membershipForm');
    const formMessage = document.getElementById('formMessage');

    membershipForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!membershipForm.checkValidity()) {
            membershipForm.classList.add('was-validated');
            return;
        }

        const data = {
            fullName: document.getElementById('memberFullName').value,
            studentID: document.getElementById('memberStudentID').value,
            email: document.getElementById('memberEmail').value,
            phone: document.getElementById('memberPhone').value,
            yearClass: document.getElementById('memberYearClass').value,
            groups: Array.from(document.querySelectorAll("input[name='groups[]']:checked")).map(cb => cb.value),
            testimony: document.getElementById('memberTestimony').value,
            consent: document.getElementById('consentCheck').checked
        };

        const submitBtn = membershipForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Submitting...`;

        try {
            const res = await fetch("https://script.google.com/macros/s/AKfycbwrT0WvUq1FwHp-LsOWa7PxVe_Herzz7LFc2BV8_J1Uwzf79KM6iM8_PXORxmazSY7w/exec", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await res.json();
            if (result.success) {
                formMessage.innerHTML = `
                    <div class="alert alert-success border-start border-5 border-deep-green mt-3">
                        <h5 class="alert-heading fw-bold">✅ Success! Welcome to the family!</h5>
                        <p>${result.message || 'Your membership has been submitted successfully.'}</p>
                    </div>
                `;
                formMessage.style.display = 'block';
                membershipForm.reset();
                setTimeout(() => formMessage.style.display = 'none', 7000);

                if (result.whatsappUrl) window.open(result.whatsappUrl, "_blank");
            } else {
                alert("❌ Error: " + (result.error || "Unknown error occurred."));
            }
        } catch (err) {
            console.error(err);
            alert("⚠️ Failed to connect. Please check your internet or contact admin.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit & Receive Welcome Pack";
        }
    });

    // === 3. Initialize AOS ===
    AOS.init({
        duration: 800,
        once: true,
        easing: 'ease-in-out',
        offset: 50
    });

    // === 4. Footer Year ===
    document.getElementById('currentYear').textContent = new Date().getFullYear();
});

