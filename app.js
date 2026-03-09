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

// ===== 9B. IMPROVED AI CHATBOT SYSTEM (Phase 1-4) =====

/**
 * Enhanced Chatbot Knowledge Base (Phases 1-3)
 * Includes synonyms, expanded Q&A, and category organization
 */
const chatbotKnowledge = {
    schedules: {
        keywords: ['schedule', 'meeting', 'time', 'when', 'timing', 'timetable'],
        synonyms: ['activity', 'program', 'agenda', 'when do we', 'what time'],
        answer: `📅 **Our Weekly Schedule:**
        
🔵 **Monday** - 5-6 PM | Prayer, Choir, Praise (Block C: C1)
🟣 **Tuesday** - 5-6 PM | Bible Study (Block C: C18)
🟠 **Wednesday** - 5-6 PM | Discipleship + 7-9 PM | Mid-week Service (Block C: C18)
🟡 **Thursday** - 5-6 PM | Ushering, Piano, Prayer (Mountain)
🔴 **Friday** - 5-6 PM | Intercession, Dancers, Hospitality + 7-9 PM | Service
🟢 **Saturday** - 10 AM-6 PM | Classes (Media, Piano, Choir, Dancing)
⚪ **Sunday** - 7:30-11 AM | Worship + 4-6 PM | Prayer (Main Hall, Mountain)`
    },
    
    events: {
        keywords: ['event', 'happening', 'upcoming', 'what', 'when is'],
        synonyms: ['activity', 'program', 'occasion', 'gathering', 'event'],
        answer: `🎉 **Upcoming Events:**

🎊 **MEGA KESHA** 
📅 Jan 30, 2026 | 9 PM - 5 AM
📍 Main Hall
👤 Guest: Apostle Joseph Murimi
📞 Contact: 0702970150 (Prayer Coordinator)

🙏 **PRAYER RETREAT**
📅 Feb 7, 2026 | 7 AM - 4 PM
📍 Mount Olivet
💰 Cost: Ksh 350
✨ Life-changing spiritual encounter!

✝️ **MISSION**
📅 April 2026 (Sun-Mon)
📍 Venue TBD
🎯 Student leadership excellence & maturity`
    },
    
    joining: {
        keywords: ['join', 'member', 'register', 'how', 'apply', 'become'],
        synonyms: ['signup', 'enroll', 'participate', 'membership', 'join us'],
        answer: `👥 **How to Join NNP Christian Union:**

1️⃣ Click "Become a Member" button on the website
2️⃣ Fill out the membership form with:
   • Your name, ID, email, phone
   • Year/Class
   • Ministry interests (Praise, Outreach, Media, etc)
   • Short testimony

3️⃣ Submit the form
4️⃣ Receive your welcome pack
5️⃣ Attend this week's meeting!

**Requirements:** None! Everyone is welcome 💚`
    },
    
    contact: {
        keywords: ['contact', 'call', 'phone', 'email', 'reach'],
        synonyms: ['communication', 'message', 'connect', 'address', 'get in touch'],
        answer: `📞 **Contact NNP Christian Union:**

🏢 **Location:** Block B, Main Campus

👨‍💼 **Chairperson:** +254 115979617
💬 **WhatsApp:** +254 742 812 494
✉️ **Email:** infonnpcu@gmail.com
☎️ **Office:** 0759 411 053 (confirmation)

💰 **Giving/Tithe (M-Pesa):** 0769 550 208 (Happy Chengo)`
    },
    
    groups: {
        keywords: ['group', 'ministry', 'team', 'choir', 'dance', 'media', 'outreach'],
        synonyms: ['department', 'team', 'committee', 'service', 'volunteer'],
        answer: `🎯 **Ministry Groups & Teams:**

🎤 **Praise & Worship** - Music, singing, worship leading
💃 **Christ Dancers** - Dance ministry during services
📸 **Media & Tech** - Video, photos, livestreaming, graphics
📖 **Discipleship/Bible Study** - Growing in faith & knowledge
🌍 **Outreach/Missions** - Evangelism, community service
🏥 **Hope & Restoration** - Prayer, healing, pastoral care
🎹 **Piano/Musicians** - Musical instruments, accompaniment

✨ **Join any group during membership form signup!**`
    },
    
    about: {
        keywords: ['about', 'who', 'mission', 'vision', 'values', 'purpose'],
        synonyms: ['organization', 'what is', 'our purpose', 'story', 'background'],
        answer: `ℹ️ **About NNP Christian Union:**

🎯 **Vision:** Enlighten individuals about Jesus Christ, break denominational barriers

📋 **Mission:** Train & perfect members for ministry so the body of Christ is built up

💚 **Core Values:**
• **Faith** - Trusting God completely
• **Fellowship** - Community & unity
• **Integrity** - Honesty & authenticity
• **Service** - Serving others & God

📖 **Bible:** "Possessing our possession" - Numbers 33:53

🌟 **Tagline:** Where Everybody Is Somebody, And Jesus Christ Is Lord`
    },
    
    faq: {
        keywords: ['question', 'can i', 'requirements', 'fee', 'cost', 'do i need'],
        synonyms: ['help', 'how does it', 'what if', 'is there', 'can you'],
        answer: `❓ **Frequently Asked Questions:**

**Can non-Christians join?** ✅ Yes! All welcome
**Is there a membership fee?** ✅ No, it's free!
**Do I need to be religious?** ✅ No, just willing to grow
**Can I bring friends?** ✅ Absolutely, please do!
**What if I'm busy?** ✅ Join what you can - no pressure
**First time - where do I sit?** Tell an usher, they'll help!
**Can I change my ministry interest later?** ✅ Of course!`
    }
};

/**
 * Phase 1: Sanitize user input (prevent XSS, spam)
 */
function sanitizeInput(text) {
    const maxLength = 500;
    
    // Trim whitespace
    text = text.trim();
    
    if (!text) {
        throw new Error('Empty message not allowed');
    }
    
    // Truncate very long inputs
    if (text.length > maxLength) {
        text = text.substring(0, maxLength);
    }
    
    // Escape HTML to prevent XSS
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Phase 1-2: Get bot response with improved matching
 */
function getBotResponse(userText) {
    const query = userText.toLowerCase();
    
    // Check each category for keyword/synonym matches
    for (const [category, data] of Object.entries(chatbotKnowledge)) {
        const allKeywords = [...data.keywords, ...(data.synonyms || [])];
        const matched = allKeywords.some(keyword => query.includes(keyword));
        
        if (matched) {
            logChatAnalytics(userText, data.answer, true);
            return data.answer;
        }
    }
    
    // No match found - return smart fallback
    const fallback = getSmartFallback(userText);
    logChatAnalytics(userText, fallback, false);
    return fallback;
}

/**
 * Phase 2: Smart fallback response with suggestions
 */
function getSmartFallback(userText) {
    return `I'm still learning! 🤖

**Try asking me about:**
• 📅 Weekly schedule
• 🎉 Upcoming events (Mega Kesha, Prayer Retreat, Mission)
• 👥 How to join CU
• 🎯 Our ministry groups
• ℹ️ About NNP CU
• ❓ Frequently asked questions
• 📞 Contact information

**Need immediate help?** 
💬 WhatsApp: +254 742 812 494`;
}

/**
 * Phase 1-2: Add message to chat display
 */
function addMessage(container, sender, text) {
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    div.textContent = text;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

/**
 * Phase 1-2: Show typing indicator while bot thinks
 */
function showTypingIndicator(container) {
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    div.id = 'typing-indicator';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

/**
 * Phase 1-2: Remove typing indicator
 */
function removeTypingIndicator(container) {
    if (!container) return;
    const indicator = container.querySelector('#typing-indicator');
    if (indicator) indicator.remove();
}

/**
 * Phase 2: Show quick reply suggestion buttons
 */
function showQuickReplies(container) {
    if (!container) return;
    
    const quickReplies = [
        'View Schedule',
        'Upcoming Events',
        'Join CU',
        'Contact Us'
    ];
    
    const div = document.createElement('div');
    div.className = 'quick-reply-buttons';
    
    quickReplies.forEach(reply => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.textContent = reply;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.value = reply;
                chatInput.focus();
            }
        });
        div.appendChild(btn);
    });
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

/**
 * Phase 2: Save chat message to localStorage
 */
function saveChatMessage(sender, text) {
    try {
        const history = JSON.parse(localStorage.getItem('nnp-chat-history') || '[]');
        
        history.push({
            sender: sender,
            text: text,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 messages to avoid storage issues
        if (history.length > 50) {
            history.shift();
        }
        
        localStorage.setItem('nnp-chat-history', JSON.stringify(history));
    } catch (err) {
        console.warn('Could not save chat message to localStorage:', err);
    }
}

/**
 * Phase 2: Load chat history from localStorage
 */
function loadChatHistory(container) {
    if (!container) return;
    
    try {
        const history = JSON.parse(localStorage.getItem('nnp-chat-history') || '[]');
        history.forEach(msg => {
            addMessage(container, msg.sender, msg.text);
        });
    } catch (err) {
        console.warn('Could not load chat history:', err);
    }
}

/**
 * Phase 3-4: Log analytics for bot improvements
 */
function logChatAnalytics(userText, botResponse, isSuccess) {
    try {
        const event = {
            timestamp: new Date().toISOString(),
            userMessage: userText,
            botResponse: botResponse,
            success: isSuccess,
            userAgent: navigator.userAgent,
            pageUrl: window.location.href
        };
        
        // Save to localStorage for admin dashboard (Phase 4)
        const analytics = JSON.parse(localStorage.getItem('nnp-chat-analytics') || '[]');
        analytics.push(event);
        
        // Keep only last 100 analytics events
        if (analytics.length > 100) {
            analytics.shift();
        }
        
        localStorage.setItem('nnp-chat-analytics', JSON.stringify(analytics));
        
        // In production (Phase 4), send to backend:
        // await fetch('/api/chatbot-analytics', { method: 'POST', body: JSON.stringify(event) });
        
    } catch (err) {
        console.warn('Could not log chat analytics:', err);
    }
}

/**
 * Phase 1-4: Initialize improved AI chatbot
 */
function initImprovedChatbot() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatForm || !chatInput || !chatMessages) {
        console.warn('Chat elements not properly initialized');
        return;
    }

    // Load previous chat history (Phase 2)
    loadChatHistory(chatMessages);

    // Add event listener for form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userText = chatInput.value.trim();
        if (!userText) return;

        try {
            // Step 1: Sanitize input (Phase 1)
            const sanitized = sanitizeInput(userText);
            
            // Step 2: Display user message
            addMessage(chatMessages, 'user', sanitized);
            
            // Step 3: Save to history (Phase 2)
            saveChatMessage('user', sanitized);
            
            // Step 4: Clear input
            chatInput.value = '';
            chatInput.focus();
            
            // Step 5: Show typing indicator (Phase 1-2)
            showTypingIndicator(chatMessages);

            // Step 6: Simulate bot thinking (~800ms) then respond
            setTimeout(() => {
                removeTypingIndicator(chatMessages);
                
                // Step 7: Get bot response (Phase 2-3)
                const reply = getBotResponse(userText);
                addMessage(chatMessages, 'bot', reply);
                
                // Step 8: Save bot response (Phase 2)
                saveChatMessage('bot', reply);
                
                // Step 9: Show quick replies (first message only, Phase 2)
                if (chatMessages.children.length === 4) { // Only user msg + bot response + quick replies
                    showQuickReplies(chatMessages);
                }
                
            }, 800);

        } catch (err) {
            console.error('Chat error:', err);
            removeTypingIndicator(chatMessages);
            addMessage(chatMessages, 'bot', '⚠️ Something went wrong. Please try again or contact us on WhatsApp: +254 742 812 494');
        }
    });
    
    console.log('✅ Improved AI Chatbot initialized');
}

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
        initImprovedChatbot(); // Phase 1-4: Initialize improved AI chatbot
        
        console.log('✅ NNP CU App initialized successfully');
        console.log('📄 Page:', window.location.pathname);
        
    } catch (err) {
        console.error('❌ App initialization error:', err);
        showToast('App encountered an error. Please refresh the page.', 'danger');
    }
});
