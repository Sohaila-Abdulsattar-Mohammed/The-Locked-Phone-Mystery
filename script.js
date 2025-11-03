// ========== START SCREEN & VIDEO PLAYBACK ==========
// This section handles the start screen overlay and intro video playback
// User clicks a button to start, which plays scene1_video.mp4 full screen
// After video ends, overlays are hidden and phone interface becomes available

// Get references to start screen and video elements
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const videoOverlay = document.getElementById('videoOverlay');
const introVideo = document.getElementById('introVideo');
const skipIntroButton = document.getElementById('skipIntroButton');

// Initialize video: make it non-interactive (no controls, no context menu, etc.)
introVideo.controls = false;
introVideo.muted = false; // Allow sound to play
introVideo.playsInline = true; // Important for mobile devices

// Prevent all interactions with video
introVideo.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

introVideo.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

// Prevent keyboard shortcuts that might interact with video
document.addEventListener('keydown', (e) => {
    // Only prevent if video overlay is visible
    const overlayDisplay = window.getComputedStyle(videoOverlay).display;
    if (overlayDisplay === 'flex') {
        // Prevent spacebar, arrow keys, etc. from controlling video
        if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyF'].includes(e.code)) {
            e.preventDefault();
        }
    }
}, true);

// Prevent interactions with video overlay container
videoOverlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

videoOverlay.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Handle start button click
startButton.addEventListener('click', () => {
    // Hide start screen
    startScreen.style.display = 'none';
    
    // Ensure video overlay is at full opacity and fade-out class is removed
    videoOverlay.classList.remove('fade-out');
    
    // Show video overlay (opacity will be 1 from CSS)
    videoOverlay.style.display = 'flex';
    
    // Play video
    introVideo.play().catch(err => {
        console.error('Error playing video:', err);
        // If video fails to play, hide overlay and show phone interface
        hideVideoOverlay();
    });
});

// Handle video end - hide overlay and show phone interface
introVideo.addEventListener('ended', () => {
    hideVideoOverlay();
});

// Handle skip intro button click - jump to end of video
skipIntroButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Function to skip to end
    function skipToEnd() {
        if (introVideo.duration && isFinite(introVideo.duration)) {
            // Jump to slightly before the end (0.1 seconds) to ensure 'ended' event fires
            introVideo.currentTime = Math.max(0, introVideo.duration - 0.1);
        }
    }
    
    // If metadata is already loaded, skip immediately
    if (introVideo.readyState >= 1 && introVideo.duration && isFinite(introVideo.duration)) {
        skipToEnd();
    } else {
        // Wait for metadata to load, then skip
        introVideo.addEventListener('loadedmetadata', skipToEnd, { once: true });
    }
});

// Function to hide video overlay with smooth fade-out
function hideVideoOverlay() {
    // Add fade-out class to trigger CSS transition
    videoOverlay.classList.add('fade-out');
    
    // After fade-out transition completes, hide the overlay completely
    setTimeout(() => {
        videoOverlay.style.display = 'none';
        videoOverlay.classList.remove('fade-out'); // Reset for next time
        introVideo.pause();
        introVideo.currentTime = 0; // Reset video to beginning
    }, 800); // Match the CSS transition duration (0.8s)
}

// ========== EMERGENCY PANEL SLIDE FUNCTIONALITY ==========
// This section handles the slide-to-reveal emergency contacts panel
// User must click and drag the phone icon button to reveal the panel

// Get references to DOM elements for emergency panel functionality
const lockScreen = document.querySelector('.lock-screen');
const emergencyPanel = document.getElementById('emergencyPanel');
const emergencyCallButton = document.querySelector('.emergency-call-button');

// Variables to track drag/swipe interactions
let isDragging = false;        // Whether user is currently dragging
let startX = 0;                // X position where drag started
let currentX = 0;              // Current X position during drag
let startTime = 0;             // Timestamp when drag started (for velocity calculation)
let panelWidth = 0;            // Width of emergency panel (calculated dynamically)
let isPanelOpen = false;       // Whether emergency panel is currently visible

// Calculate and store the emergency panel's width
// This is needed to properly animate the panel sliding in/out
function updatePanelWidth() {
    panelWidth = emergencyPanel.offsetWidth;
}

// Initialize panel width on page load
updatePanelWidth();
// Update panel width if window is resized (for responsive behavior)
window.addEventListener('resize', updatePanelWidth);

// Helper function to get X coordinate from either touch or mouse event
// Returns the X position regardless of input type (touchscreen or mouse)
function getEventX(e) {
    if (e.touches && e.touches.length > 0) {
        return e.touches[0].clientX;  // Touch event
    }
    return e.clientX;  // Mouse event
}

// Handle the start of a drag/swipe gesture
// This function determines if the user is trying to open or close the emergency panel
function handleStart(e) {
    // Don't allow horizontal drag if PIN screen is currently open
    // This prevents conflicting interactions
    if (isPinScreenOpen) return;
    
    // If panel is already open, allow dragging from anywhere on the panel to close it
    if (isPanelOpen) {
        const x = getEventX(e);
        isDragging = true;
        startX = x;
        currentX = x;
        startTime = Date.now();
        e.preventDefault();
        // Disable CSS transitions for smooth real-time dragging
        emergencyPanel.style.transition = 'none';
        return;
    }
    
    // If panel is closed, only start drag if user clicks on the emergency call button
    // We need to check if the click/touch is within the button's boundaries
    const target = e.target;
    const buttonRect = emergencyCallButton.getBoundingClientRect();
    const x = getEventX(e);
    const y = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    
    // Check if the click/touch coordinates are within the button's bounds
    if (x >= buttonRect.left && x <= buttonRect.right && 
        y >= buttonRect.top && y <= buttonRect.bottom) {
        // User clicked on the emergency button - start drag
        isDragging = true;
        startX = x;
        currentX = x;
        startTime = Date.now();
        e.preventDefault();
        // Disable CSS transitions for smooth real-time dragging
        emergencyPanel.style.transition = 'none';
    }
}

// Handle the movement during a drag/swipe gesture
// Updates the panel's position in real-time as the user drags
function handleMove(e) {
    if (!isDragging) return;
    
    currentX = getEventX(e);
    const rect = lockScreen.getBoundingClientRect();
    const deltaX = currentX - startX;  // Calculate how far user has dragged
    
    if (isPanelOpen) {
        // Panel is open - user is dragging to close it (dragging right/positive direction)
        if (deltaX > 0) {
            // Calculate how much to translate panel (can't exceed panel width)
            const translateX = Math.min(deltaX, panelWidth);
            emergencyPanel.style.transform = `translateX(${translateX}px)`;
        }
    } else {
        // Panel is closed - user is dragging to open it (dragging left/negative direction)
        if (deltaX < 0) {
            // Calculate panel position based on drag distance
            // deltaX is negative, so we add panelWidth to get positive translation
            const translateX = Math.max(deltaX + panelWidth, 0);
            emergencyPanel.style.transform = `translateX(${translateX}px)`;
        }
    }
    
    e.preventDefault();
}

// Handle the end of a drag/swipe gesture
// Determines whether to fully open or close the panel based on drag distance and velocity
function handleEnd(e) {
    if (!isDragging) return;
    
    isDragging = false;
    const deltaX = currentX - startX;  // Total distance dragged
    const deltaTime = Date.now() - startTime;  // Time taken for drag
    const velocity = Math.abs(deltaX / deltaTime);  // Calculate drag velocity
    
    // Threshold values to determine if user intended to open/close
    const threshold = panelWidth * 0.3;  // User must drag at least 30% of panel width
    const velocityThreshold = 0.3;  // Or drag with velocity > 0.3 px/ms (fast swipe)
    
    // Re-enable CSS transitions for smooth animation
    emergencyPanel.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    if (isPanelOpen) {
        // Panel is open - check if user wants to close it
        if (deltaX > threshold || velocity > velocityThreshold) {
            // User dragged enough or fast enough - close the panel
            emergencyPanel.classList.remove('active');
            emergencyPanel.style.transform = 'translateX(100%)';
            isPanelOpen = false;
        } else {
            // User didn't drag enough - keep panel open
            emergencyPanel.style.transform = 'translateX(0)';
        }
    } else {
        // Panel is closed - check if user wants to open it
        if (Math.abs(deltaX) > threshold || velocity > velocityThreshold) {
            // User dragged enough or fast enough - open the panel
            emergencyPanel.classList.add('active');
            emergencyPanel.style.transform = 'translateX(0)';
            isPanelOpen = true;
        } else {
            // User didn't drag enough - keep panel closed
            emergencyPanel.style.transform = 'translateX(100%)';
        }
    }
    
    e.preventDefault();
}

// ========== EVENT LISTENERS FOR EMERGENCY PANEL ==========
// Attach event listeners to support both mouse and touch interactions
// The button is used to open the panel, the panel itself is used to close it

// Mouse events - for desktop/laptop users
emergencyCallButton.addEventListener('mousedown', handleStart);
emergencyPanel.addEventListener('mousedown', handleStart);
document.addEventListener('mousemove', handleMove);
document.addEventListener('mouseup', handleEnd);

// Touch events - for mobile/tablet users
// { passive: false } allows us to preventDefault() to stop scrolling during drag
emergencyCallButton.addEventListener('touchstart', handleStart, { passive: false });
emergencyPanel.addEventListener('touchstart', handleStart, { passive: false });
document.addEventListener('touchmove', handleMove, { passive: false });
document.addEventListener('touchend', handleEnd);

// Pointer events - unified API for better cross-device support
// Works for both mouse and touch devices
emergencyCallButton.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
        handleStart(e);
    }
});

emergencyPanel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
        handleStart(e);
    }
});

document.addEventListener('pointermove', (e) => {
    if (isDragging && (e.pointerType === 'mouse' || e.pointerType === 'touch')) {
        handleMove(e);
    }
});

document.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
        handleEnd(e);
    }
});

// Prevent context menu from appearing on long press (mobile)
lockScreen.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// ========== CALLING SCREEN FUNCTIONALITY ==========
// This section handles displaying the calling screen, playing scene videos with sound,
// and sliding the phone to the left

// Get references to calling screen DOM elements
const callingScreen = document.getElementById('callingScreen');
const callingAvatar = document.getElementById('callingAvatar');
const callingName = document.getElementById('callingName');
const callingNumber = document.getElementById('callingNumber');
const endCallButton = document.getElementById('endCallButton');
const phoneContainer = document.querySelector('.phone-container');
const sceneVideoOverlay = document.getElementById('sceneVideoOverlay');
const sceneVideo = document.getElementById('sceneVideo');

// Track called contacts for sequential calling enforcement
let calledContacts = [];  // Array to track which contacts have been called
let isCallActive = false; // Whether a call is currently active

// Mapping of contacts to their scene files
// Contact order: Lina (0), Maya (1), Noor (2)
const contactScenes = [
    {
        video: 'assets/video/scene2_video.mp4'
    },
    {
        video: 'assets/video/scene3_video.mp4'
    },
    {
        video: 'assets/video/scene4_video.mp4'
    }
];

// Display the calling screen with the selected contact's information
// Parameters:
//   contactIndex: Index of the contact (0 = Lina, 1 = Maya, 2 = Noor)
//   icon: The emoji/icon representing the contact
//   name: The contact's name
//   number: The contact's phone number
function showCallingScreen(contactIndex, icon, name, number) {
    // Check if this contact can be called (must be in order and not already called)
    if (calledContacts.includes(contactIndex)) {
        // Contact already called, do nothing
        return;
    }
    
    // Check if contacts are being called in order
    const expectedContactIndex = calledContacts.length;
    if (contactIndex !== expectedContactIndex) {
        // Not in order, do nothing
        return;
    }
    
    // Mark this contact as called
    calledContacts.push(contactIndex);
    isCallActive = true;
    
    // Get scene files for this contact
    const scene = contactScenes[contactIndex];
    
    // Update the calling screen with contact information
    callingAvatar.textContent = icon;
    callingName.textContent = name;
    callingNumber.textContent = number;
    
    // Close emergency panel if it's currently open
    if (isPanelOpen) {
        emergencyPanel.classList.remove('active');
        emergencyPanel.style.transform = 'translateX(100%)';
        isPanelOpen = false;
    }
    
    // Slide phone to the left
    phoneContainer.classList.add('phone-slide-left');
    
    // Setup and show scene video (non-interactive, with sound)
    sceneVideo.src = scene.video;
    sceneVideo.muted = false; // Video plays with sound
    sceneVideo.controls = false; // No controls
    sceneVideo.playsInline = true; // Important for mobile
    sceneVideo.load(); // Reload video with new source
    
    // Prevent all interactions with scene video (only add listeners once)
    // Check if listeners are already added by checking for a data attribute
    if (!sceneVideo.dataset.listenersAdded) {
        sceneVideo.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        sceneVideo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        sceneVideo.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
        
        // When video ends, hide the calling screen
        sceneVideo.addEventListener('ended', () => {
            hideCallingScreen();
        });
        
        sceneVideo.dataset.listenersAdded = 'true';
    }
    
    // Show video overlay and play video
    sceneVideoOverlay.classList.add('active');
    
    // Show the calling screen (fade in animation)
    callingScreen.classList.add('active');
    
    // Small delay to ensure overlay is displayed before playing
    setTimeout(() => {
        sceneVideo.play().catch(err => {
            console.error('Error playing scene video:', err);
            // If video fails to play, end the call after 3 seconds as fallback
            setTimeout(() => {
                hideCallingScreen();
            }, 3000);
        });
    }, 100);
}

// Hide the calling screen and stop any playing video
// This is called automatically when scene video finishes playing
function hideCallingScreen() {
    // Stop and hide scene video
    if (sceneVideo) {
        sceneVideo.pause();
        sceneVideo.currentTime = 0;
        sceneVideoOverlay.classList.remove('active');
    }
    
    // Return phone to center
    phoneContainer.classList.remove('phone-slide-left');
    
    // Hide the calling screen (fade out animation)
    callingScreen.classList.remove('active');
    
    isCallActive = false;
}

// ========== HELP ICON FUNCTIONALITY ==========
// Handle help icon for mobile devices (click to toggle instead of hover)
const helpIconContainer = document.getElementById('helpIconContainer');
const helpTooltip = document.getElementById('helpTooltip');
let helpTooltipVisible = false;

// Toggle tooltip on click (for mobile devices)
if (helpIconContainer) {
    helpIconContainer.addEventListener('click', (e) => {
        // Prevent click from propagating
        e.stopPropagation();
        
        // Check if device is likely touch-based
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (isTouchDevice) {
            // Toggle tooltip on mobile devices
            helpTooltipVisible = !helpTooltipVisible;
            
            if (helpTooltipVisible) {
                helpTooltip.style.opacity = '1';
                helpTooltip.style.visibility = 'visible';
                helpTooltip.style.transform = 'translateY(0)';
            } else {
                helpTooltip.style.opacity = '0';
                helpTooltip.style.visibility = 'hidden';
                helpTooltip.style.transform = 'translateY(10px)';
            }
        }
    });
    
    // Close tooltip when clicking outside (on mobile)
    document.addEventListener('click', (e) => {
        if (helpTooltipVisible && !helpIconContainer.contains(e.target)) {
            helpTooltipVisible = false;
            helpTooltip.style.opacity = '0';
            helpTooltip.style.visibility = 'hidden';
            helpTooltip.style.transform = 'translateY(10px)';
        }
    });
}

// ========== EMERGENCY CONTACT CLICK HANDLERS ==========
// When user clicks on an emergency contact, show the calling screen
// Contacts must be called in order (Lina -> Maya -> Noor)

// Get all emergency contact items
const emergencyItems = document.querySelectorAll('.emergency-item');
// Add click event listener to each emergency contact
emergencyItems.forEach((item, index) => {
    item.addEventListener('click', (e) => {
        // Don't process clicks if a call is already active
        if (isCallActive) {
            return;
        }
        
        // Extract contact information from the clicked item
        const icon = item.querySelector('.emergency-icon').textContent;
        const name = item.querySelector('.emergency-name').textContent;
        const number = item.querySelector('.emergency-number').textContent;
        
        // Show calling screen with contact's information and scene files
        // index: 0 = Lina (scene2), 1 = Maya (scene3), 2 = Noor (scene4)
        showCallingScreen(index, icon, name, number);
        
        // Add visual feedback: briefly shrink the item when clicked (only if call starts)
        if (!calledContacts.includes(index) && calledContacts.length === index) {
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
                item.style.transform = '';
            }, 150);
        }
    });
});

// ========== PIN ENTRY SCREEN FUNCTIONALITY ==========
// This section handles the PIN entry screen that appears when user swipes up
// Users can enter a 4-digit PIN code, and if correct (2830), the phone unlocks

// Get references to PIN screen DOM elements
const pinScreen = document.getElementById('pinScreen');
const cancelButton = document.getElementById('cancelButton');
const deleteButton = document.getElementById('deleteButton');
const pinKeys = document.querySelectorAll('.pin-key[data-number]');  // Number buttons (0-9)
const pinDots = document.querySelectorAll('.pin-dot');  // Visual indicator dots (4 dots)
const pinDotsContainer = document.getElementById('pinDotsContainer');
const pinErrorMessage = document.getElementById('pinErrorMessage');
const unlockedScreen = document.getElementById('unlockedScreen');

// PIN entry state variables
let pinCode = '';              // Current PIN digits entered by user
const maxPinLength = 4;       // PIN is 4 digits long
const correctPin = '2830';     // Correct PIN code to unlock the phone
let isPinScreenOpen = false;   // Whether PIN entry screen is currently visible
const swipeUpHint = document.querySelector('.swipe-up-hint'); // Swipe up hint element

// Variables for swipe-up gesture (to reveal PIN screen from lock screen)
let isSwipeUpActive = false;   // Whether user is currently swiping up
let isSwipeDownActive = false; // Whether user is currently swiping down (to close PIN screen)
let swipeStartY = 0;          // Y position where swipe started
let swipeCurrentY = 0;        // Current Y position during swipe
let swipeStartTime = 0;       // Timestamp when swipe started (for velocity calculation)

// Helper function to get Y coordinate from either touch or mouse event
// Returns the Y position regardless of input type (touchscreen or mouse)
function getEventY(e) {
    if (e.touches && e.touches.length > 0) {
        return e.touches[0].clientY;  // Touch event
    }
    return e.clientY;  // Mouse event
}

// Handle the start of a swipe-up gesture to reveal the PIN screen
// User must swipe up from the bottom portion of the lock screen
function handleSwipeUpStart(e) {
    // Don't allow swipe-up if emergency panel is open, user is dragging, or PIN screen is already open
    // This prevents conflicting interactions
    if (isPanelOpen || isDragging || isPinScreenOpen) return;
    
    const y = getEventY(e);
    const lockScreenRect = lockScreen.getBoundingClientRect();
    
    // Only allow swipe-up to start from the lower portion of the screen (bottom 40%)
    // This makes it feel natural - swipe up from the bottom
    const screenBottomThreshold = lockScreenRect.top + (lockScreenRect.height * 0.6);
    
    if (y >= screenBottomThreshold) {
        // User started swipe in the correct area - begin tracking
        isSwipeUpActive = true;
        swipeStartY = y;
        swipeCurrentY = y;
        swipeStartTime = Date.now();
        e.preventDefault();
        // Disable CSS transitions for smooth real-time dragging
        pinScreen.style.transition = 'none';
    }
}

// Handle the movement during a swipe-up gesture
// Updates the PIN screen's position in real-time as user swipes up
function handleSwipeUpMove(e) {
    if (!isSwipeUpActive || isSwipeDownActive) return;
    
    swipeCurrentY = getEventY(e);
    const deltaY = swipeStartY - swipeCurrentY;  // Positive value means moving up
    
    if (deltaY > 0) {
        // User is swiping up - reveal the PIN screen from bottom
        const screenHeight = pinScreen.offsetHeight;
        // Calculate how much to translate (can't exceed screen height)
        const translateY = Math.min(deltaY, screenHeight);
        // Move PIN screen up based on swipe distance
        pinScreen.style.transform = `translateY(${screenHeight - translateY}px)`;
    }
    
    e.preventDefault();
}

// Handle the end of a swipe-up gesture
// Determines whether to fully reveal or hide the PIN screen based on swipe distance and velocity
function handleSwipeUpEnd(e) {
    if (!isSwipeUpActive || isSwipeDownActive) return;
    
    isSwipeUpActive = false;
    const deltaY = swipeStartY - swipeCurrentY;  // Total distance swiped
    const deltaTime = Date.now() - swipeStartTime;  // Time taken for swipe
    const velocity = deltaY / deltaTime;  // Calculate swipe velocity
    const screenHeight = pinScreen.offsetHeight;
    
    // Threshold values to determine if user intended to open PIN screen
    const threshold = screenHeight * 0.3;  // User must swipe at least 30% of screen height
    const velocityThreshold = 0.5;  // Or swipe with velocity > 0.5 px/ms (fast swipe)
    
    // Re-enable CSS transitions for smooth animation
    pinScreen.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    
    if (deltaY > threshold || velocity > velocityThreshold) {
        // User swiped enough or fast enough - fully open the PIN screen
        pinScreen.classList.add('active');
        pinScreen.style.transform = 'translateY(0)';
        isPinScreenOpen = true;
        // Hide swipe-up hint when PIN screen opens
        if (swipeUpHint) {
            swipeUpHint.classList.add('hidden');
        }
    } else {
        // User didn't swipe enough - hide the PIN screen (return to lock screen)
        pinScreen.style.transform = 'translateY(100%)';
        pinScreen.classList.remove('active');
        isPinScreenOpen = false;
        // Show swipe-up hint when PIN screen closes
        if (swipeUpHint) {
            swipeUpHint.classList.remove('hidden');
        }
    }
    
    e.preventDefault();
}

// ========== SWIPE-DOWN TO CLOSE PIN SCREEN ==========
// User can swipe down from the top of the PIN screen to close it and return to lock screen

// Handle the start of a swipe-down gesture to close the PIN screen
function handlePinScreenSwipeDownStart(e) {
    if (!isPinScreenOpen || isSwipeUpActive) return;
    
    // Don't allow swipe-down if user is clicking on buttons (would interfere)
    if (e.target.closest('button')) return;
    
    const y = getEventY(e);
    const pinScreenRect = pinScreen.getBoundingClientRect();
    
    // Only allow swipe-down to start from the top portion of PIN screen (top 30%)
    // This makes it feel natural - swipe down from the top edge
    const topThreshold = pinScreenRect.top + (pinScreenRect.height * 0.3);
    
    if (y <= topThreshold) {
        // User started swipe in the correct area - begin tracking
        isSwipeDownActive = true;
        swipeStartY = y;
        swipeCurrentY = y;
        swipeStartTime = Date.now();
        e.preventDefault();
        // Disable CSS transitions for smooth real-time dragging
        pinScreen.style.transition = 'none';
    }
}

// Handle the movement during a swipe-down gesture
// Updates the PIN screen's position in real-time as user swipes down
function handlePinScreenSwipeDownMove(e) {
    if (!isSwipeDownActive || !isPinScreenOpen) return;
    
    swipeCurrentY = getEventY(e);
    const deltaY = swipeCurrentY - swipeStartY;  // Positive value means moving down
    
    if (deltaY > 0) {
        // User is swiping down - hide the PIN screen (slide it down)
        const screenHeight = pinScreen.offsetHeight;
        // Calculate how much to translate (can't exceed screen height)
        const translateY = Math.min(deltaY, screenHeight);
        // Move PIN screen down based on swipe distance
        pinScreen.style.transform = `translateY(${translateY}px)`;
    }
    
    e.preventDefault();
}

// Handle the end of a swipe-down gesture
// Determines whether to fully close or keep open the PIN screen based on swipe distance and velocity
function handlePinScreenSwipeDownEnd(e) {
    if (!isSwipeDownActive || !isPinScreenOpen) return;
    
    isSwipeDownActive = false;
    const deltaY = swipeCurrentY - swipeStartY;  // Total distance swiped
    const deltaTime = Date.now() - swipeStartTime;  // Time taken for swipe
    const velocity = deltaY / deltaTime;  // Calculate swipe velocity
    const screenHeight = pinScreen.offsetHeight;
    
    // Threshold values to determine if user intended to close PIN screen
    const threshold = screenHeight * 0.3;  // User must swipe at least 30% of screen height
    const velocityThreshold = 0.5;  // Or swipe with velocity > 0.5 px/ms (fast swipe)
    
    // Re-enable CSS transitions for smooth animation
    pinScreen.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    
    if (deltaY > threshold || velocity > velocityThreshold) {
        // User swiped enough or fast enough - close the PIN screen (return to lock screen)
        closePinScreen();
    } else {
        // User didn't swipe enough - keep PIN screen open
        pinScreen.style.transform = 'translateY(0)';
    }
    
    e.preventDefault();
}

// Close the PIN screen and return to lock screen
// Resets all PIN entry state and clears any error messages
function closePinScreen() {
    pinScreen.classList.remove('active');
    pinScreen.style.transform = 'translateY(100%)';  // Slide down off screen
    isPinScreenOpen = false;
    pinCode = '';  // Clear entered PIN
    updatePinDots();
    // Reset error state (clear any error messages and animations)
    pinErrorMessage.classList.remove('show');
    pinDotsContainer.parentElement.classList.remove('shake');
    pinScreen.classList.remove('error-state');
    // Show swipe-up hint when PIN screen closes
    if (swipeUpHint) {
        swipeUpHint.classList.remove('hidden');
    }
}

// Update the visual PIN dots display
// Fills dots based on how many digits the user has entered
function updatePinDots() {
    pinDots.forEach((dot, index) => {
        if (index < pinCode.length) {
            // Fill dots up to the number of digits entered
            dot.classList.add('filled');
        } else {
            // Keep remaining dots empty
            dot.classList.remove('filled');
        }
    });
}

// Display incorrect PIN error feedback
// Shows shake animation, error message, and clears the PIN after delay
// Mimics iPhone's behavior when wrong PIN is entered
function showIncorrectPin() {
    // Hide any existing error message first
    pinErrorMessage.classList.remove('show');
    
    // Disable the keypad (prevent further input during error state)
    pinScreen.classList.add('error-state');
    
    // Add shake animation to PIN dots container (iPhone-style vibration effect)
    pinDotsContainer.parentElement.classList.add('shake');
    
    // Show error message after a brief delay (for better visual flow)
    setTimeout(() => {
        pinErrorMessage.classList.add('show');
    }, 300);
    
    // Clear PIN and reset error state after delay (like iPhone)
    // iPhone clears the PIN after showing the error, allowing user to try again
    setTimeout(() => {
        pinCode = '';
        updatePinDots();
        pinErrorMessage.classList.remove('show');
        pinDotsContainer.parentElement.classList.remove('shake');
        pinScreen.classList.remove('error-state');
    }, 1500);
}

// Display the unlocked screen when correct PIN is entered
// Shows success message and congratulations
function showUnlockedScreen() {
    // Close PIN screen first
    closePinScreen();
    
    // Show unlocked screen after a brief delay (smooth transition)
    setTimeout(() => {
        unlockedScreen.classList.add('active');
        // Screen stays visible (not hidden automatically)
    }, 300);
}

// Handle when user presses a number key on the PIN keypad
// Parameters:
//   number: The digit (0-9) that was pressed
function handlePinKeyPress(number) {
    // Don't accept input if error is showing or phone is already unlocked
    // This prevents accidental input during error state or after unlock
    if (pinErrorMessage.classList.contains('show') || unlockedScreen.classList.contains('active')) {
        return;
    }
    
    // Only accept digits if PIN hasn't reached max length (4 digits)
    if (pinCode.length < maxPinLength) {
        pinCode += number;  // Add digit to PIN code
        updatePinDots();  // Update visual dots
        
        // Check if PIN is now complete (all 4 digits entered)
        if (pinCode.length === maxPinLength) {
            // Wait a moment before verifying (for better UX)
            setTimeout(() => {
                if (pinCode === correctPin) {
                    // Correct PIN entered - unlock the phone
                    showUnlockedScreen();
                } else {
                    // Incorrect PIN - show error animation and message
                    showIncorrectPin();
                }
            }, 100);
        }
    }
}

// Handle when user presses the delete/backspace button
// Removes the last entered digit from the PIN
function handleDelete() {
    // Don't allow deletion if error is showing or phone is already unlocked
    if (pinErrorMessage.classList.contains('show') || unlockedScreen.classList.contains('active')) {
        return;
    }
    
    // Only delete if there are digits to remove
    if (pinCode.length > 0) {
        pinCode = pinCode.slice(0, -1);  // Remove last digit
        updatePinDots();  // Update visual dots
    }
}

// ========== EVENT LISTENERS FOR PIN SCREEN ==========
// Attach event listeners to support both mouse and touch interactions for PIN screen

// Swipe-up gesture listeners (to reveal PIN screen from lock screen)
lockScreen.addEventListener('mousedown', handleSwipeUpStart);
lockScreen.addEventListener('touchstart', handleSwipeUpStart, { passive: false });
document.addEventListener('mousemove', handleSwipeUpMove);
document.addEventListener('touchmove', handleSwipeUpMove, { passive: false });
document.addEventListener('mouseup', handleSwipeUpEnd);
document.addEventListener('touchend', handleSwipeUpEnd);

// Pointer events for swipe-up (unified API for mouse and touch)
lockScreen.addEventListener('pointerdown', (e) => {
    // Only allow swipe-up if panel isn't open, user isn't dragging, and PIN screen isn't open
    if (!isPanelOpen && !isDragging && !isPinScreenOpen && 
        (e.pointerType === 'mouse' || e.pointerType === 'touch')) {
        handleSwipeUpStart(e);
    }
});

document.addEventListener('pointermove', (e) => {
    // Only handle movement if swipe-up is active
    if (isSwipeUpActive && (e.pointerType === 'mouse' || e.pointerType === 'touch')) {
        handleSwipeUpMove(e);
    }
});

document.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
        handleSwipeUpEnd(e);
    }
});

// Swipe-down gesture listeners (to close PIN screen)
pinScreen.addEventListener('mousedown', handlePinScreenSwipeDownStart);
pinScreen.addEventListener('touchstart', handlePinScreenSwipeDownStart, { passive: false });
document.addEventListener('mousemove', handlePinScreenSwipeDownMove);
document.addEventListener('touchmove', handlePinScreenSwipeDownMove, { passive: false });
document.addEventListener('mouseup', handlePinScreenSwipeDownEnd);
document.addEventListener('touchend', handlePinScreenSwipeDownEnd);

// PIN screen button event listeners
// Cancel button - closes PIN screen and returns to lock screen
cancelButton.addEventListener('click', closePinScreen);

// Delete button - removes the last entered digit
deleteButton.addEventListener('click', handleDelete);

// PIN keypad buttons - add click listeners to all number buttons (0-9)
pinKeys.forEach(key => {
    key.addEventListener('click', () => {
        // Get the digit from the button's data-number attribute
        const number = key.getAttribute('data-number');
        // Handle the digit press
        handlePinKeyPress(number);
    });
});

// Pointer events for swipe-down on PIN screen (unified API)
pinScreen.addEventListener('pointerdown', (e) => {
    // Only allow swipe-down if PIN screen is open
    if (isPinScreenOpen && (e.pointerType === 'mouse' || e.pointerType === 'touch')) {
        handlePinScreenSwipeDownStart(e);
    }
});

document.addEventListener('pointermove', (e) => {
    // Only handle movement if swipe-down is active and PIN screen is open
    if (isSwipeDownActive && isPinScreenOpen && (e.pointerType === 'mouse' || e.pointerType === 'touch')) {
        handlePinScreenSwipeDownMove(e);
    }
});

document.addEventListener('pointerup', (e) => {
    if (isPinScreenOpen && e.pointerType === 'mouse' || e.pointerType === 'touch') {
        handlePinScreenSwipeDownEnd(e);
    }
});

