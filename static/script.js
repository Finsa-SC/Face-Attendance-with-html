const webcamElement = document.getElementById('webcam');
const userImageElement = document.getElementById('userImage');
const nolep  = userImageElement.src;
const userIdElement = document.getElementById('userId');
const userNameElement = document.getElementById('userName');
const userRoleElement = document.getElementById('userRole');
const attendanceTimeElement = document.getElementById('attendanceTime');

// Configuration
const API_URL = 'http://localhost:5000';
const CAPTURE_INTERVAL = 3000;








let streaming = false;
let intervalId = null;
let notificationShown = false;
let scanActive = false;
let processingAPI = false;

// Auto-start webcam when page loads
async function initWebcam() {
    if (streaming) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 720 },
                height: { ideal: 1280 },
                facingMode: 'user',
                aspectRatio: { ideal: 9/16 }
            },
            audio: false
        });
        
        webcamElement.srcObject = stream;
        
        webcamElement.onloadedmetadata = () => {
            webcamElement.play();
            streaming = true;
            scanActive = true;
            startFaceDetection();
        };
        
    } catch (error) {
        console.error('Error accessing webcam:', error);
        showStatusOverlay('error', 'Camera Access Error', 0);
        stopWebcam();
    }
}

// Stop webcam and detection
function stopWebcam() {
    scanActive = false;
    
    if (intervalId) {
        clearTimeout(intervalId);
        intervalId = null;
    }
    
    if (streaming && webcamElement.srcObject) {
        const tracks = webcamElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        webcamElement.srcObject = null;
        streaming = false;
    }
}

// Continuous face detection with recursive setTimeout
function startFaceDetection() {
    if (intervalId) {
        clearTimeout(intervalId);
    }
    
    captureAndDetect();
}

async function captureAndDetect() {
    if (!streaming || notificationShown || processingAPI) {
        intervalId = setTimeout(captureAndDetect, CAPTURE_INTERVAL);
        return;
    }
    showStatusOverlay('waiting', 'Waiting for Face', 0);
    
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = webcamElement.videoWidth;
        canvas.height = webcamElement.videoHeight;
        
        context.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);
        
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.8);
        });
        
        if (API_URL) {
            processingAPI = true; // Set flag before API call
            await sendFrameToAPI(blob);
            processingAPI = false; // Reset flag after API call completes
        }
        
    } catch (error) {
        console.error('Error capturing frame:', error);
        processingAPI = false; // Reset flag in case of error
    }
    
    // Continue the detection loop if still active
    if (scanActive) {
        intervalId = setTimeout(captureAndDetect, CAPTURE_INTERVAL);
    }
}

let step = 0;
async function sendFrameToAPI(imageBlob) {
    try {
        // Real API call (when API_URL is not localhost)
        const formData = new FormData();
        formData.append('image', imageBlob, 'webcam.jpg');
        
        const response = await fetch(`${API_URL}/detect-face`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        handleAPIResponse(data);
        
    } catch (error) {
        console.error('Error sending frame to API:', error);
    }
}

// Modified notification function with customizable duration
// Modified notification function with customizable duration
function showStatusOverlay(type, message, reset = true, duration = 3000) {
    const existingOverlay = document.querySelector('.status-overlay');
    if (existingOverlay) {
        if (!reset) {
            return;
        }
        existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'status-overlay absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm';

    let iconHTML = '';
    let colorClasses = '';

    if (type === 'waiting') {
        iconHTML = '<span class="text-white text-5xl font-bold">?</span>';
        colorClasses = 'from-blue-500 to-blue-600 shadow-blue-500/30 border-blue-400/30';
    } else if (type === 'unknown') {
        iconHTML = '<span class="text-white text-5xl font-bold">!</span>';
        colorClasses = 'from-yellow-500 to-yellow-600 shadow-yellow-500/30 border-yellow-400/30';
    } else if (type === 'success') {
        iconHTML = '<span class="text-white text-5xl font-bold">✓</span>';
        colorClasses = 'from-green-500 to-green-600 shadow-green-500/30 border-green-400/30';
    } else if (type === 'error') {
        iconHTML = '<span class="text-white text-5xl font-bold">X</span>';
        colorClasses = 'from-red-500 to-red-600 shadow-red-500/30 border-red-400/30';
    }

    overlay.innerHTML = `
        <div class="w-24 h-24 rounded-full bg-gradient-to-r ${colorClasses} flex items-center justify-center mb-6 shadow-lg border border-opacity-30 animate-pulse">
            ${iconHTML}
        </div>
        <div class="bg-gradient-to-r ${colorClasses} text-white py-3 px-8 rounded-full text-xl font-bold shadow-lg uppercase tracking-wider">
            ${message}
        </div>
    `;

    const webcamContainer = webcamElement.parentElement;
    webcamContainer.appendChild(overlay);

    // If duration is greater than 0, automatically hide the overlay after the specified duration
    if (duration > 0) {
        notificationShown = true;
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.classList.add('opacity-0', 'transition-opacity', 'duration-500');
                setTimeout(() => {
                    if (overlay && overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 500);
            }

            notificationShown = false;
        }, duration);
    }

    return overlay;
}

function resetUserData(imageurl=false) {
    // Reset user image
    userImageElement.src = nolep;
    if (imageurl)
    userImageElement.src = imageurl;

    // Reset user ID
    const idSpan = userIdElement.querySelector('.font-mono');
    if (idSpan) idSpan.textContent = '';

    // Reset user name
    const nameSpan = userNameElement.querySelector('span:last-child');
    if (nameSpan) nameSpan.textContent = '';

    // Reset user role
    const roleSpan = userRoleElement.querySelector('span:last-child');
    if (roleSpan) roleSpan.textContent = '';

    // Reset attendance time
    const timeSpan = attendanceTimeElement.querySelector('.font-mono');
    if (timeSpan) timeSpan.textContent = '';
}

// Update user info
function updateUserInfo(user) {
    if (!user) return;
    
    // Update user image if available
    if (user.image) {
        // Check if the image already includes the data URL prefix
        if (user.image.startsWith('data:image')) {
            userImageElement.src = user.image;
        } else {
            userImageElement.src = `data:image/jpeg;base64,${user.image}`;
        }
    }
    
    // Update user ID
    const idSpan = userIdElement.querySelector('.font-mono');
    if (idSpan) idSpan.textContent = user.id || '';
    
    // Update user name
    const nameSpan = userNameElement.querySelector('span:last-child');
    if (nameSpan) nameSpan.textContent = user.name || '';
    
    // Update user role
    const roleSpan = userRoleElement.querySelector('span:last-child');
    if (roleSpan) roleSpan.textContent = user.role || '';
    
    // Update attendance time
    const timeSpan = attendanceTimeElement.querySelector('.font-mono');
    if (timeSpan) timeSpan.textContent = user.attendanceTime || '';
}

// Update handleAPIResponse to show appropriate notifications
function handleAPIResponse(data) {
    if (data.faceDetected) {
        if (data.userIdentified) {
            // Update user info with the data received
            updateUserInfo(data.user);

            // Remove any existing overlay
            const statusOverlay = document.querySelector('.status-overlay');
            if (statusOverlay) {
                statusOverlay.remove();
            }

            // Already marked
            if (data.alreadyMarked) {
                showStatusOverlay('error', 'Already Marked', 0,0);
            }
            else showStatusOverlay('success', 'Marked', 0,0);
        } else {
            // Face detected but not recognized
            showStatusOverlay('unknown', 'Face Not Recognized', 1,0);
            resetUserData("./NoUser.png");
        }
    }
    else {
        showStatusOverlay('waiting', 'Waiting for Face', 1,0);
        resetUserData();
    }
}

// Auto-start webcam when page loads
window.addEventListener('DOMContentLoaded', () => {
    // Start webcam automatically
    initWebcam();
});