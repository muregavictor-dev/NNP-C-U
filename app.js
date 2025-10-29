/**
 * NNP Christian Union Landing Page - Interactive Logic
 * Handles smooth scrolling, forms, modals, and interactive widgets.
 */

document.addEventListener('DOMContentLoaded', () => {
    // === 1. Smooth Scrolling for Navigation ===
    const scrollLinks = document.querySelectorAll('.scroll-link, .nav-link');

    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').startsWith('#') ? this.getAttribute('href') : null;
            if (targetId) {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                
                // Close offcanvas menu on mobile navigation
                const offcanvasNav = document.getElementById('offcanvasNav');
                if (offcanvasNav && offcanvasNav.classList.contains('show')) {
                    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasNav) || new bootstrap.Offcanvas(offcanvasNav);
                    bsOffcanvas.hide();
                }

                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // === 2. Membership Form Client-Side Validation & Submission Simulation ===
    const membershipForm = document.getElementById('membershipForm');
    const formMessage = document.getElementById('formMessage');
    const membershipModal = document.getElementById('membershipModal');
    const bsMembershipModal = new bootstrap.Modal(membershipModal);

    membershipForm.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (!membershipForm.checkValidity()) {
            membershipForm.classList.add('was-validated');
            return;
        }

        // Gather form data
        const formData = {
            fullName: document.getElementById('memberFullName').value,
            studentID: document.getElementById('memberStudentID').value,
            email: document.getElementById('memberEmail').value,
            phone: document.getElementById('memberPhone').value,
            yearClass: document.getElementById('memberYearClass').value,
            testimony: document.getElementById('memberTestimony').value,
            groups: Array.from(document.querySelectorAll('#membershipForm input[type="checkbox"]:checked')).map(cb => cb.value)
        };

        
        // === REAL GOOGLE SCRIPT API POST ===
const membershipEndpoint = "https://script.google.com/macros/s/AKfycbzjavHHkBXAvUcBgOLc1snzCkFjTkaQs36xD4a91iAJysxI_s8UQ8d8CO8Me2SosmaH/exec"; 

console.log("Submitting Membership Data:", formData);

const submitButton = membershipForm.querySelector("button[type=submit]");
submitButton.disabled = true;
submitButton.textContent = "Submitting...";

fetch(membershipEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData)
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        formMessage.innerHTML = `
            <div class="alert alert-success border-start border-5 border-deep-green" role="alert">
                <h5 class="alert-heading fw-bold">Success! Welcome to the family!</h5>
                <p>Your membership has been successfully submitted. Check your email for a welcome message.</p>
            </div>
        `;
        formMessage.style.display = 'block';
        membershipForm.reset();
        setTimeout(() => {
            formMessage.style.display = 'none';
            bsMembershipModal.hide();
        }, 6000);
    } else {
        alert("❌ Submission failed: " + (data.error || "Unknown error."));
    }
})
.catch(err => {
    console.error("Error:", err);
    alert("❌ Failed to connect. Please check your internet or contact admin.");
})
.finally(() => {
    submitButton.disabled = false;
    submitButton.textContent = "Submit & Receive Welcome Pack";
});

    // Clear message on modal close
    membershipModal.addEventListener('hidden.bs.modal', function () {
        formMessage.style.display = 'none';
        membershipForm.classList.remove('was-validated');
        membershipForm.reset();
    });

    // === 3. Event RSVP Functionality ===
    const rsvpButtons = document.querySelectorAll('.rsvp-btn');
    const notificationPanel = document.getElementById('notificationPanel');

    rsvpButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const eventId = this.getAttribute('data-event-id');
            const eventTitle = this.closest('.card-body').querySelector('.card-title').textContent;
            
            // Disable button and change text
            this.textContent = 'RSVP Confirmed!';
            this.classList.remove('btn-outline-primary-green');
            this.classList.add('btn-primary-green');
            this.disabled = true;

            // --- SIMULATE RSVP API POST ---
            console.log(`Simulating RSVP for Event ID: ${eventId} (${eventTitle})`);

            // Add notification (client-side demo)
            const offcanvasBody = notificationPanel.querySelector('.offcanvas-body');
            const newNotification = document.createElement('div');
            newNotification.className = 'alert alert-gold border-start border-4 border-deep-green p-3 mt-3';
            newNotification.role = 'alert';
            newNotification.innerHTML = `
                <h6 class="alert-heading fw-bold">RSVP Confirmed!</h6>
                <p class="mb-0 small">You've confirmed attendance for **${eventTitle}**.</p>
                <button class="btn btn-sm btn-link p-0 mt-2 text-deep-green" onclick="this.closest('.alert').remove();">Mark as Read</button>
            `;
            // Prepend new notification
            offcanvasBody.prepend(newNotification);

            // Optional: Show the notification panel
            const bsNotificationPanel = bootstrap.Offcanvas.getInstance(notificationPanel) || new bootstrap.Offcanvas(notificationPanel);
            bsNotificationPanel.show();
        });
    });

    // === 4. Video Lightbox Player ===
    const videoCards = document.querySelectorAll('.video-card');
    const videoLightboxModal = document.getElementById('videoLightboxModal');
    const videoPlayer = document.getElementById('videoPlayer');
    
    videoCards.forEach(card => {
        card.addEventListener('click', function() {
            const videoId = this.getAttribute('data-video-id');
            // Construct YouTube embed URL
            const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
            videoPlayer.src = embedUrl;

            const bsModal = new bootstrap.Modal(videoLightboxModal);
            bsModal.show();
        });
    });

    // Stop video playback when modal is closed
    videoLightboxModal.addEventListener('hidden.bs.modal', function () {
        videoPlayer.src = ''; // This stops the video
    });

    // === 5. Gallery Lightbox Player ===
    const galleryCards = document.querySelectorAll('.gallery-card');
    const imageLightboxModal = document.getElementById('imageLightboxModal');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    
    galleryCards.forEach(card => {
        card.addEventListener('click', function() {
            const imgSrc = this.getAttribute('data-img');
            const imgCaption = this.querySelector('h4, h5').textContent;
            
            lightboxImage.src = imgSrc;
            lightboxImage.alt = imgCaption;
            lightboxCaption.textContent = imgCaption;

            const bsModal = new bootstrap.Modal(imageLightboxModal);
            bsModal.show();
        });
    });
    
    // === 6. AI Chatbox Functionality (Canned Responses Demo) ===
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.querySelector('.chat-messages');
    const chatboxToggle = document.getElementById('chatboxToggle');
    const openLiveChat = document.getElementById('openLiveChat'); // Link from Live Section

    // Function to add message to chatbox
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message mb-2 p-2 rounded-3`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        // Auto-scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Canned Response Logic
    function getBotResponse(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('service') || lowerQuery.includes('time') || lowerQuery.includes('schedule')) {
            return "Our main Sunday Worship Service is at **9:00 AM - 11:00 AM**. Check the 'Weekly Ministry Schedule' section for all other activities!";
        } else if (lowerQuery.includes('join') || lowerQuery.includes('become a member')) {
            return "You can easily join by clicking the 'Become a Member' button at the top or bottom of the page! It will open a quick form.";
        } else if (lowerQuery.includes('event') || lowerQuery.includes('upcoming')) {
            return "We have exciting events! Check the 'Upcoming Events' section. This week features the Freshmen Welcome & Dinner on Friday.";
        } else if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
            return "Praise God! I'm here to help you navigate the CU. How can I assist you?";
        } else {
            return "That's a great question! For detailed support, please visit the Contact section or call the Group Leader. I can currently help with questions about the schedule, joining, or events.";
        }
    }

    // Handle Quick Reply Buttons
    document.querySelectorAll('.quick-reply-btn').forEach(button => {
        button.addEventListener('click', () => {
            const replyType = button.getAttribute('data-reply');
            let queryText = '';
            
            if (replyType === 'service-times') queryText = 'What are the service times?';
            else if (replyType === 'how-to-join') queryText = 'How do I become a member?';
            else if (replyType === 'upcoming-events') queryText = 'What upcoming events do you have?';

            if (queryText) {
                // Simulate user sending the quick reply
                addMessage(queryText, 'user');
                
                // Get and display bot response
                setTimeout(() => {
                    addMessage(getBotResponse(queryText), 'bot');
                }, 500);
            }
        });
    });

    // Handle User Submission
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userQuery = chatInput.value.trim();
        if (userQuery === '') return;

        addMessage(userQuery, 'user');
        chatInput.value = ''; // Clear input

        // Get and display bot response
        setTimeout(() => {
            addMessage(getBotResponse(userQuery), 'bot');
        }, 800);
    });

    // Link from Live Section to Chatbox
    if (openLiveChat) {
        openLiveChat.addEventListener('click', () => {
            const bsChatbox = bootstrap.Offcanvas.getInstance(document.getElementById('aiChatbox')) || new bootstrap.Offcanvas(document.getElementById('aiChatbox'));
            bsChatbox.show();
            // Optionally send an initial message to the bot
            setTimeout(() => {
                addMessage("I have a question about the live session.", 'user');
                setTimeout(() => {
                    addMessage("Of course! If you have a question for the live stream hosts, you can text it here and we'll forward it to them!", 'bot');
                }, 500);
            }, 500);
        });
    }

    // === 7. Live Stream ID Update (Dynamically set the YouTube ID) ===
    // IMPORTANT: The live ID MUST be configured here or via a config file.
    const YOUTUBE_LIVE_ID = 'REPLACE_WITH_YOUR_YOUTUBE_LIVE_ID'; // Example: 'z7y-E-g2E5s' or a live channel URL for constant stream.

    if (YOUTUBE_LIVE_ID !== 'REPLACE_WITH_YOUR_YOUTUBE_LIVE_ID') {
        const liveEmbed = document.getElementById('youtubeLiveEmbed');
        // Standard embed path: /embed/<ID>
        liveEmbed.src = `https://www.youtube-nocookie.com/embed/${YOUTUBE_LIVE_ID}?autoplay=0&mute=0&rel=0`;
    }

});
    <script>
document.getElementById("membershipForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    fullName: document.getElementById("memberFullName").value,
    studentID: document.getElementById("memberStudentID").value,
    email: document.getElementById("memberEmail").value,
    phone: document.getElementById("memberPhone").value,
    yearClass: document.getElementById("memberYearClass").value,
    groups: Array.from(document.querySelectorAll("input[name='groups[]']:checked")).map(cb => cb.value),
    testimony: document.getElementById("memberTestimony").value,
    consent: document.getElementById("consentCheck").checked
  };

  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const res = await fetch("https://script.google.com/macros/s/AKfycbwrT0WvUq1FwHp-LsOWa7PxVe_Herzz7LFc2BV8_J1Uwzf79KM6iM8_PXORxmazSY7w/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (result.success) {
      alert("✅ " + result.message);
      e.target.reset();
      window.open(result.whatsappUrl, "_blank");
    } else {
      alert("❌ Error: " + result.error);
    }
  } catch (err) {
    alert("⚠️ Failed to connect. Please check your internet or contact admin.");
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Submit & Receive Welcome Pack";
});

</script>


    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script src="app.js"></script>



   <script>



       
document.addEventListener('DOMContentLoaded', () => {
  AOS.init({
    duration: 800,
    once: true,
    easing: 'ease-in-out',
    offset: 50
  });
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});
</script>

