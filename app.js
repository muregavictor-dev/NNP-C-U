/**
 * NNP Christian Union Landing Page - app.js
 * Interactive functionality for index.html only
 * DO NOT use for other pages - contains index-specific handlers
 * 
 * Features:
 * - Smooth scrolling navigation
 * - Contact form submission with success notifications
 * - Membership form handling
 * - RSVP button functionality
 * - Gallery lightbox viewer
 * - Live Q&A chat opener
 * - Notification management
 * - Toast notifications
 */

// ===== DOM ELEMENTS CACHE =====
const DOM = {
    contactForm: null,
    membershipForm: null,
    scrollLinks: [],
    rsvpButtons: [],
    lightboxButtons: [],
    toastContainer: null
};

/**
 * Cache frequently accessed DOM elements for better performance
 */
function cacheDOM() {
    DOM.contactForm = document.getElementById('contactForm');
    DOM.membershipForm = document.getElementById('membershipForm');
    DOM.scrollLinks = document.querySelectorAll('.scroll-link, .nav-link');
    DOM.rsvpButtons = document.querySelectorAll('.rsvp-btn');
    DOM.lightboxButtons = document.querySelectorAll('.lightbox-btn');
    DOM.toastContainer = document.querySelector('.toast-container');
    
    if (!DOM.toastContainer) {
        console.warn('Toast container not found - creating fallback');
        DOM.toastContainer = document.createElement('div');
        DOM.toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        DOM.toastContainer.style.zIndex = '1055';
        document.body.appendChild(DOM.toastContainer);
    }
}

// ===== 1. SMOOTH SCROLLING NAVIGATION =====
function initSmoothScroll() {
    DOM.scrollLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    
                    // Close mobile menu if open
                    const offcanvasNav = document.getElementById('offcanvasNav');
                    if (offcanvasNav) {
                        const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasNav);
                        if (bsOffcanvas) bsOffcanvas.hide();
                    }
                } else {
                    console.warn('Target not found:', href);
                }
            }
        });
    });
}

// ===== 2. RSVP BUTTON HANDLERS =====
function initRsvpButtons() {
    const eventNames = {
        'e1': 'Mega Kesha (Jan 30, 2026)',
        'e2': 'Prayer Retreat (Feb 7, 2026)',
        'e3': 'Mission (April 2026)'
    };

    DOM.rsvpButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const eventId = btn.getAttribute('data-event-id');
            const eventName = eventNames[eventId] || 'the event';
            
            // Visual feedback
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.innerHTML = '✓ RSVP\'d';
            
            // Show success notification
            showToast(`✅ You've RSVP'd for ${eventName}! We'll see you there.`, 'success');
            
            // Save to localStorage
            try {
                const rsvpList = JSON.parse(localStorage.getItem('nnp-rsvp-list') || '[]');
                if (!rsvpList.includes(eventId)) {
                    rsvpList.push(eventId);
                    localStorage.setItem('nnp-rsvp-list', JSON.stringify(rsvpList));
                }
            } catch (err) {
                console.warn('Could not save RSVP to localStorage:', err);
            }

            // Reset button after delay to allow multiple RSVPs (optional)
            // Uncomment if you want users to be able to change their RSVP
            /*
            setTimeout(() => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.textContent = originalText;
            }, 3000);
            */
        });
    });
}

// ===== 3. GALLERY LIGHTBOX HANDLERS =====
function initGalleryLightbox() {
    const imageLightboxModal = new bootstrap.Modal(
        document.getElementById('imageLightboxModal'),
        { keyboard: true, focus: true }
    );

    DOM.lightboxButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            try {
                const galleryCard = btn.closest('.gallery-card');
                if (!galleryCard) {
                    console.error('Gallery card not found for lightbox button');
                    return;
                }
                
                const img = galleryCard.querySelector('img');
                const captionElement = galleryCard.querySelector('.caption-overlay h4, .caption-overlay h5');
                
                if (!img) {
                    console.error('Image not found in gallery card');
                    return;
                }
                
                // Set lightbox content
                const lightboxImage = document.getElementById('lightboxImage');
                const lightboxCaption = document.getElementById('lightboxCaption');
                
                lightboxImage.src = img.src;
                lightboxImage.alt = img.alt || 'Gallery Image';
                lightboxCaption.textContent = captionElement ? captionElement.textContent : 'Gallery Image';
                
                // Show modal with animation
                imageLightboxModal.show();
                
                // Analytics logging
                console.log('Gallery image opened:', { alt: img.alt, src: img.src });
                
            } catch (err) {
                console.error('Error opening lightbox:', err);
                showToast('Error opening gallery. Please try again.', 'danger');
            }
        });
    });

    // Keyboard navigation support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            imageLightboxModal.hide();
        }
    });
}

// ===== 4. LIVE Q&A CHAT BUTTON =====
function initLiveQaChat() {
    const openLiveChat = document.getElementById('openLiveChat');
    
    if (!openLiveChat) return;
    
    openLiveChat.addEventListener('click', (e) => {
        e.preventDefault();
        
        try {
            const aiChatbox = document.getElementById('aiChatbox');
            if (!aiChatbox) {
                console.error('AI Chatbox element not found');
                showToast('Chat is unavailable. Please try again later.', 'warning');
                return;
            }
            
            const offcanvas = bootstrap.Offcanvas.getInstance(aiChatbox) || 
                            new bootstrap.Offcanvas(aiChatbox, { scroll: true, backdrop: true });
            offcanvas.show();
            
            // Focus chat input for better accessibility and UX
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                setTimeout(() => chatInput.focus(), 300);
            }
            
            console.log('Live Q&A chat opened');
            
        } catch (err) {
            console.error('Error opening live chat:', err);
            showToast('Chat is temporarily unavailable. Please try again.', 'danger');
        }
    });
}

// ===== 5. CONTACT FORM HANDLER =====
function initContactForm() {
    if (!DOM.contactForm) {
        console.warn('Contact form not found');
        return;
    }
    
    DOM.contactForm.addEventListener('submit', handleContactSubmit);
}

async function handleContactSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!DOM.contactForm.checkValidity()) {
        DOM.contactForm.classList.add('was-validated');
        return;
    }

    const formData = new FormData(DOM.contactForm);
    const successMsg = document.getElementById('contactSuccessMessage');
    
    try {
        const res = await fetch(DOM.contactForm.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        // Success - show notification
        showToast('✅ Message sent successfully! We\'ll get back to you soon.', 'success');
        DOM.contactForm.reset();
        DOM.contactForm.classList.remove('was-validated');
        
        // Show success message element
        if (successMsg) {
            successMsg.classList.remove('d-none');
            setTimeout(() => {
                successMsg.classList.add('d-none');
            }, 5000);
        }
        
        console.log('Contact form submitted successfully');

    } catch (err) {
        console.error('Contact form submission error:', err);
        showToast('⚠️ Network error. Please check your connection and try again.', 'warning');
    }
}

// ===== 6. MEMBERSHIP FORM HANDLER =====
function initMembershipForm() {
    if (!DOM.membershipForm) {
        console.warn('Membership form not found');
        return;
    }
    
    DOM.membershipForm.addEventListener('submit', handleMembershipSubmit);
}

async function handleMembershipSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!DOM.membershipForm.checkValidity()) {
        DOM.membershipForm.classList.add('was-validated');
        return;
    }

    const formData = new FormData(DOM.membershipForm);
    const submitBtn = DOM.membershipForm.querySelector("button[type='submit']");
    const successMsg = document.getElementById('successMessage');
    
    // Show loading state
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Submitting...`;

    try {
        const response = await fetch(DOM.membershipForm.action, {
            method: DOM.membershipForm.method,
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Success
        showToast('🎉 Welcome to NNP Christian Union!', 'success');
        
        if (successMsg) {
            successMsg.classList.remove('d-none');
            successMsg.scrollIntoView({ behavior: 'smooth' });
        }
        
        DOM.membershipForm.reset();
        DOM.membershipForm.classList.remove('was-validated');
        
        // Close modal after 2 seconds
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('membershipModal'));
            if (modal) modal.hide();
        }, 2000);
        
        console.log('Membership form submitted successfully');

    } catch (err) {
        console.error('Membership form error:', err);
        showToast('❌ Submission failed. Please check your connection and try again.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// ===== 7. NOTIFICATION MANAGEMENT =====
function initNotifications() {
    const markAsReadBtn = document.getElementById('markAsReadBtn');
    const unreadCount = document.getElementById('unreadCount');
    const notificationItem = document.getElementById('notificationItem');
    
    if (!markAsReadBtn) {
        console.warn('Notification elements not found');
        return;
    }
    
    markAsReadBtn.addEventListener('click', () => {
        notificationItem.classList.add('d-none');
        unreadCount.textContent = '0';
        
        try {
            localStorage.setItem('nnp-notifications-read', 'true');
        } catch (err) {
            console.warn('Could not save notification state:', err);
        }
        
        showToast('✅ Notification marked as read', 'info');
    });
    
    // Restore notification state on page load
    try {
        const isRead = localStorage.getItem('nnp-notifications-read');
        if (isRead === 'true') {
            notificationItem.classList.add('d-none');
        }
    } catch (err) {
        console.warn('Could not retrieve notification state:', err);
    }
}

// ===== 8. TOAST NOTIFICATION SYSTEM =====
/**
 * Display a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'danger', 'warning', or 'info'
 */
function showToast(message, type = 'info') {
    const bgColors = {
        'success': 'bg-success text-white',
        'danger': 'bg-danger text-white',
        'warning': 'bg-warning text-dark',
        'info': 'bg-info text-dark'
    };

    try {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center border-0 show ${bgColors[type] || 'bg-secondary text-white'}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.style.minWidth = '280px';
        toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body fw-semibold">${escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        DOM.toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 5000);
        
    } catch (err) {
        console.error('Error showing toast:', err);
        // Fallback to alert
        alert(message);
    }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== 9. GLOBAL ERROR HANDLING =====
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    // Don't show toasts for all errors - just log them
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show toasts for all errors - just log them
});

// ===== 10. INITIALIZATION =====
/**
 * Initialize all interactive features when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('🚀 Initializing NNP CU App...');
        
        // Cache DOM elements first
        cacheDOM();
        
        // Initialize all features
        initSmoothScroll();
        initContactForm();
        initMembershipForm();
        initRsvpButtons();
        initGalleryLightbox();
        initLiveQaChat();
        initNotifications();
        
        console.log('✅ NNP CU App initialized successfully');
        console.log('📄 Page:', window.location.pathname);
        
    } catch (err) {
        console.error('❌ App initialization error:', err);
        showToast('App encountered an error. Please refresh the page.', 'danger');
    }
});
