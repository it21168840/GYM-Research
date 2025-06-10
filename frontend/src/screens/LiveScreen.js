import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import { StressProgressRing } from '../components/StressProgressRing';
import { API_BASE_URL } from '../config/api';

export default function LiveScreen() {
  // State variables
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [detectionFinished, setDetectionFinished] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stressResults, setStressResults] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [resultsFetched, setResultsFetched] = useState(false);

  // Voice-related state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Animation state
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Refs
  const statusInterval = useRef(null);
  const isMounted = useRef(true);
  const webViewRef = useRef(null);

  // Animate results appearance
  useEffect(() => {
    if (detectionFinished && stressResults) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [detectionFinished, stressResults]);

  // Voice functions
  const speakText = async (text) => {
    try {
      if (Platform.OS === 'web') {
        // Web Speech API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.8;
          utterance.pitch = 1;
          utterance.volume = 0.8;

          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          window.speechSynthesis.speak(utterance);
        } else {
          Alert.alert(
            'Voice not supported',
            'Speech synthesis is not supported in this browser'
          );
        }
      } else {
        // React Native Expo Speech
        setIsSpeaking(true);
        await Speech.speak(text, {
          language: 'en-US',
          pitch: 1,
          rate: 0.8,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      Alert.alert('Voice Error', 'Unable to speak text');
    }
  };

  const stopSpeaking = () => {
    try {
      if (Platform.OS === 'web') {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } else {
        Speech.stop();
      }
      setIsSpeaking(false);
    } catch (error) {
      console.error('Stop speech error:', error);
    }
  };

  const speakResults = () => {
    if (!stressResults) return;

    const fullText = `Your stress detection results are ready. Average stress level: ${stressResults.average_stress?.toFixed(
      1
    )} percent. Dominant emotion: ${
      stressResults.dominant_emotion
    }. Stress level: ${stressResults.stress_level?.replace(
      '_',
      ' '
    )}. Recommendation: ${stressResults.recommendation}`;

    speakText(fullText);
  };

  // Auto-speak results when they're available (if voice is enabled)
  useEffect(() => {
    if (detectionFinished && stressResults && voiceEnabled && !isSpeaking) {
      // Wait a moment for UI to settle, then speak
      setTimeout(() => {
        speakResults();
      }, 1000);
    }
  }, [detectionFinished, stressResults, voiceEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
      }
      if (pollingActive && !resultsFetched) {
        fetch(`${API_BASE_URL}/api/stop-stress-detection`).catch((e) =>
          console.error('Cleanup stop error:', e)
        );
      }
      // Stop any ongoing speech
      stopSpeaking();
    };
  }, [pollingActive, resultsFetched]);

  // Combined status and results checker
  const checkForCompletion = async () => {
    try {
      const [statusRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/stress-detection-status`),
        fetch(`${API_BASE_URL}/api/get-stress-results`),
      ]);

      const statusData = await statusRes.json();
      const resultsData = await resultsRes.json();

      if (resultsData.status === 'success') {
        return { success: true, data: resultsData };
      }

      return {
        success: false,
        running: statusData.running,
        complete: statusData.complete,
      };
    } catch (error) {
      console.error('Completion check error:', error);
      return { error: true };
    }
  };

  const startDetection = async () => {
    if (!isMounted.current) return;

    try {
      // Reset all states
      setDetectionRunning(true);
      setDetectionFinished(false);
      setStressResults(null);
      setResultsFetched(false);
      setLoadingCamera(true);
      setShowCamera(true);
      setErrorMessage(null);
      setRefreshKey(Date.now());
      stopSpeaking(); // Stop any ongoing speech

      // Start detection
      const response = await fetch(
        `${API_BASE_URL}/api/start-stress-detection`
      );
      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      if (data.status !== 'Stress detection started') {
        throw new Error(data.status || 'Start detection failed');
      }

      // Announce start if voice is enabled
      if (voiceEnabled) {
        speakText('Stress detection started. Please look at the camera.');
      }

      // Start polling after camera warmup
      setTimeout(() => {
        if (isMounted.current) {
          setLoadingCamera(false);
          pollStatus();
        }
      }, 2000);
    } catch (error) {
      console.error('Start detection error:', error);
      if (isMounted.current) {
        setDetectionRunning(false);
        setShowCamera(false);
        setLoadingCamera(false);
        setErrorMessage(`Could not start detection: ${error.message}`);
        if (voiceEnabled) {
          speakText('Detection failed to start. Please try again.');
        }
      }
    }
  };

  const stopDetection = async () => {
    if (!isMounted.current || resultsFetched) return;

    try {
      setLoading(true);
      setPollingActive(true);
      setErrorMessage(null);
      stopSpeaking(); // Stop any ongoing speech

      // Clear existing polling
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
        statusInterval.current = null;
      }

      // Announce stopping if voice is enabled
      if (voiceEnabled) {
        speakText('Processing your results. Please wait.');
      }

      // Request stop
      const stopResponse = await fetch(
        `${API_BASE_URL}/api/stop-stress-detection`
      );
      const stopData = await stopResponse.json();

      if (stopData.status === 'stop_initiated') {
        const maxAttempts = 10; // 5 seconds at 500ms intervals
        let attempts = 0;

        const checkInterval = setInterval(async () => {
          if (attempts >= maxAttempts || !isMounted.current || resultsFetched) {
            clearInterval(checkInterval);
            setPollingActive(false);
            return;
          }

          attempts++;
          const { success, data, error } = await checkForCompletion();

          if (success) {
            clearInterval(checkInterval);
            setPollingActive(false);
            setResultsFetched(true);
            if (isMounted.current) {
              setStressResults({
                average_stress: data.average_stress,
                dominant_emotion: data.dominant_emotion,
                stress_level: data.stress_level,
                recommendation: data.recommendation,
              });
              setDetectionFinished(true);
              setLoading(false);
              setShowCamera(false);
            }
          } else if (error) {
            clearInterval(checkInterval);
            setPollingActive(false);
            setErrorMessage('Error getting results');
            setLoading(false);
            if (voiceEnabled) {
              speakText('Error getting results. Please try again.');
            }
          }
        }, 1000);

        statusInterval.current = checkInterval;
      }
    } catch (error) {
      console.error('Stop detection error:', error);
      if (isMounted.current) {
        setErrorMessage(error.message);
        setLoading(false);
        setPollingActive(false);
        if (voiceEnabled) {
          speakText('An error occurred. Please try again.');
        }
      }
    }
  };

  const pollStatus = () => {
    if (statusInterval.current) clearInterval(statusInterval.current);

    statusInterval.current = setInterval(async () => {
      if (!isMounted.current || !detectionRunning) {
        clearInterval(statusInterval.current);
        return;
      }

      try {
        const { success, data } = await checkForCompletion();

        if (success) {
          clearInterval(statusInterval.current);
          if (isMounted.current) {
            setStressResults({
              average_stress: data.average_stress,
              dominant_emotion: data.dominant_emotion,
              stress_level: data.stress_level,
              recommendation: data.recommendation,
            });
            setDetectionFinished(true);
            setShowCamera(false);
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
        if (isMounted.current) {
          clearInterval(statusInterval.current);
        }
      }
    }, 3000);
  };

  const renderVideoFeed = () => {
    if (Platform.OS === 'web') {
      return (
        <div style={{ position: 'relative', width: '100%', height: 400 }}>
          {loadingCamera && (
            <div style={styles.loadingOverlay}>
              <div className="loader"></div>
              <p>Initializing camera...</p>
            </div>
          )}
          <img
            src={`${API_BASE_URL}/stress-video-feed?${refreshKey}`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            alt="Live video feed"
            onError={() => setErrorMessage('Failed to load video feed')}
          />
        </div>
      );
    } else {
      return (
        <View style={styles.videoContainer}>
          <View style={{ flex: 1, width: '100%', height: '100%' }}>
            <WebView
              key={refreshKey}
              ref={webViewRef}
              source={{ uri: `${API_BASE_URL}/stress-video-feed` }}
              style={styles.videoFeed}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0000ff" />
                  <Text>Loading camera...</Text>
                </View>
              )}
              onError={(error) => {
                console.error('WebView error:', error);
                if (isMounted.current) {
                  setErrorMessage('Failed to load camera feed');
                }
              }}
            />
            {loadingCamera && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={{ color: 'white' }}>Initializing camera...</Text>
              </View>
            )}
          </View>
        </View>
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Finalizing results...</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>Stress Detection System</Text>

        {/* Voice Control Toggle */}
        <TouchableOpacity
          style={[
            styles.voiceToggle,
            { backgroundColor: voiceEnabled ? '#4caf50' : '#ccc' },
          ]}
          onPress={() => {
            setVoiceEnabled(!voiceEnabled);
            if (!voiceEnabled) {
              speakText('Voice announcements enabled');
            } else {
              stopSpeaking();
            }
          }}
        >
          <Ionicons
            name={voiceEnabled ? 'volume-high' : 'volume-mute'}
            size={20}
            color="white"
          />
          <Text style={styles.voiceToggleText}>
            {voiceEnabled ? 'Voice On' : 'Voice Off'}
          </Text>
        </TouchableOpacity>
      </View>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setErrorMessage(null)}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showCamera ? (
        <View style={styles.buttonContainer}>
          <Button
            title={
              detectionRunning
                ? 'Detection Running...'
                : 'Start Stress Detection'
            }
            onPress={startDetection}
            disabled={detectionRunning}
            color="#2196F3"
          />
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <Text style={styles.cameraTitle}>Live Stress Detection</Text>

          {renderVideoFeed()}

          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setRefreshKey(Date.now())}
            >
              <Text style={styles.retryButtonText}>Refresh Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={() => {
                stopDetection();
                setShowCamera(false);
              }}
            >
              <Text style={styles.stopButtonText}>Stop Detection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {detectionFinished && stressResults && (
        <Animated.View
          style={[
            styles.resultsContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.resultsTitle}>Detection Results</Text>

          {isSpeaking && (
            <View style={styles.speakingIndicator}>
              <Ionicons name="volume-high" size={16} color="#2196F3" />
              <Text style={styles.speakingText}>Reading results...</Text>
            </View>
          )}

          {/* Main Progress Ring */}
          <View style={styles.progressRingContainer}>
            <StressProgressRing
              stressLevel={stressResults.average_stress}
              emotion={stressResults.dominant_emotion}
              size={220}
              duration={2500}
            />
          </View>

          {/* Detailed Results */}
          <View style={styles.detailsContainer}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Average Stress:</Text>
              <Text style={styles.resultValue}>
                {stressResults.average_stress?.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Dominant Emotion:</Text>
              <Text style={styles.resultValue}>
                {stressResults.dominant_emotion}
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Stress Level:</Text>
              <Text style={styles.resultValue}>
                {stressResults.stress_level?.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.recommendationContainer}>
            <Text style={styles.recommendationTitle}>Recommendation:</Text>
            <Text style={styles.recommendationText}>
              {stressResults.recommendation}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.speakButton}
              onPress={speakResults}
              disabled={isSpeaking}
            >
              <Ionicons
                name={isSpeaking ? 'volume-high' : 'volume-medium'}
                size={20}
                color="white"
              />
              <Text style={styles.speakButtonText}>
                {isSpeaking ? 'Speaking...' : 'Read Results'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setDetectionFinished(false);
                setStressResults(null);
                stopSpeaking();
              }}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.resetButtonText}>New Test</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  voiceToggleText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  cameraContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  videoContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
  },
  videoFeed: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  retryButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  stopButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultsContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
  },
  speakingText: {
    color: '#2196F3',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  progressRingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  multiRingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  ringTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  detailsContainer: {
    marginVertical: 20,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 5,
  },
  resultLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    borderLeft: 4,
    borderLeftColor: '#4caf50',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#388e3c',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  speakButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 0.45,
    justifyContent: 'center',
  },
  speakButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 0.45,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});
