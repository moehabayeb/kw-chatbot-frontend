/**
 * Application Configuration
 */

const CONFIG = {
    // --- API Configuration ---
    // This now points to your LIVE backend server on Render.
    API_ENDPOINT: 'https://kw-ai-chatbot.onrender.com/search',
    
    // --- Request Headers ---
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'  // Explicitly request JSON responses
    },
    
    // --- Timeout settings (in milliseconds) ---
    // Increased timeout for a live server, which may need to "wake up".
    TIMEOUT: 20000, // 20 seconds
    
    // --- Development flags ---
    // Set to false as this configuration is for the live version.
    DEBUG_MODE: false,
};

// Simple validation to ensure the endpoint is set correctly for deployment.
if (CONFIG.DEBUG_MODE) {
    console.warn("ATTENTION: DEBUG_MODE is ON. Using development settings.");
} else if (!CONFIG.API_ENDPOINT.includes('onrender.com')) {
    // A helpful check for your production version
    console.warn("WARNING: API_ENDPOINT does not look like a production URL. Did you mean to use your onrender.com address?");
}

export default CONFIG;