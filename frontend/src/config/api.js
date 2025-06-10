// config/api.js

// Base URL for the API
export const API_BASE_URL = 'http://192.168.191.236:5000'; // Update with your server's IP address

// Define API endpoints
export const ENDPOINTS = {
  // Stress questionnaire endpoints
  stress: '/api/stress',
  update_plan: '/api/update-plan',

  // Emotion detection endpoint
  emotion: '/api/emotion',

  // Live stress detection endpoints
  start_stress_detection: '/api/start-stress-detection',
  stop_stress_detection: '/api/stop-stress-detection',
  stress_detection_status: '/api/stress-detection-status',
  get_stress_results: '/api/get-stress-results',

  // Video feed endpoints
  stress_video_feed: '/stress-video-feed',
  video_feed: '/video-feed', // Original video feed if needed
};
