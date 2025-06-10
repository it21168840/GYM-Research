
import cv2
import dlib
import numpy as np
from imutils import face_utils
import time
from collections import Counter
from deepface import DeepFace
import os
import tempfile
import threading
from queue import Queue

class StressDetector:
    def __init__(self):
        self.detector = dlib.get_frontal_face_detector()
        self.predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")
        
        # Calibration variables
        self.baseline_established = False
        self.calibration_frames = 0
        self.min_calibration_frames = 60  # ~2 seconds at 30fps
        self.baseline_eyebrow = None
        self.baseline_eye = None
        self.baseline_mouth = None
        
        # Detection state
        self.detection_running = False
        self.detection_stop_requested = False
        self.frame = None
        self.vs = None
        self.results = {
            'stress_scores': [],
            'stress_levels': [],
            'emotions': [],
            'analysis_complete': False
        }
        
        # Enhanced emotion detection
        self.emotion_frame_counter = 0
        self.emotion_detection_interval = 6  # Detect emotion every 6 frames for better performance
        self.current_emotion = 'neutral'
        self.emotion_confidence_threshold = 0.5  # Lower threshold for better detection
        self.emotion_history = []  # Track recent emotions for stability
        self.emotion_history_size = 7
        
        # Async emotion processing
        self.emotion_queue = Queue(maxsize=3)  # Limit queue size
        self.emotion_thread = None
        self.emotion_processing = False
        
        # DeepFace version compatibility
        self.deepface_version = self._check_deepface_version()

    def _check_deepface_version(self):
        """Check DeepFace version for compatibility"""
        try:
            import deepface
            version = getattr(deepface, '__version__', '0.0.0')
            return version
        except:
            return '0.0.0'

    def start_detection(self):
        print("Starting detection - calibration phase")
        self.vs = cv2.VideoCapture(0)    # Initialize camera (device 0)

        # Improve camera quality
        self.vs.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.vs.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.vs.set(cv2.CAP_PROP_FPS, 30)
        
        time.sleep(1.0)  # Camera warmup
        self.detection_running = True
        self.detection_stop_requested = False
        self.calibration_frames = 0
        self.baseline_established = False
        self.emotion_frame_counter = 0
        self.current_emotion = 'neutral'
        self.emotion_history = []
        self.results = {
            'stress_scores': [],
            'stress_levels': [],
            'emotions': [],
            'analysis_complete': False
        }
        
        # Start emotion processing thread
        self.start_emotion_processing()

    def start_emotion_processing(self):
        """Start background thread for emotion processing"""
        self.emotion_processing = True
        self.emotion_thread = threading.Thread(target=self.process_emotion_queue, daemon=True)
        self.emotion_thread.start()

    def process_emotion_queue(self):
        """Background thread to process emotion detection"""
        while self.emotion_processing:
            try:
                if not self.emotion_queue.empty():  # Check if queue has frames
                    frame_data = self.emotion_queue.get(timeout=1)
                    if frame_data is not None:
                        emotion = self.detect_emotion_sync(frame_data) # Process with DeepFace
                        if emotion and emotion != 'neutral':
                            self.update_current_emotion(emotion)   # Update emotion state
                time.sleep(0.1)  # Prevent busy waiting
            except Exception as e:
                print(f"Emotion processing thread error: {e}")
                time.sleep(0.5)

    def detect_emotion_improved(self, frame):
        """Improved emotion detection with better preprocessing"""
        try:
            # Only process if we have faces detected
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.detector(gray, 0)  # Detect faces using dlib
            
            if len(faces) == 0:
                return 'neutral'
            
            # Get the largest face
            largest_face = max(faces, key=lambda rect: rect.width() * rect.height())
            
            # Extract face region with some padding
            x, y, w, h = largest_face.left(), largest_face.top(), largest_face.width(), largest_face.height()
            padding = int(min(w, h) * 0.3)  # Increased padding for better context
            
            x_start = max(0, x - padding)
            y_start = max(0, y - padding)
            x_end = min(frame.shape[1], x + w + padding)
            y_end = min(frame.shape[0], y + h + padding)
            
            face_region = frame[y_start:y_end, x_start:x_end]
            
            # Ensure face region is large enough
            if face_region.shape[0] < 64 or face_region.shape[1] < 64:
                return 'neutral'
            
            # Enhance image quality for better emotion detection
            face_region = cv2.resize(face_region, (224, 224))  # Standard size for DeepFace
            
            # Improve image quality
            face_region = self._enhance_image_quality(face_region)
            
            # Add to processing queue (non-blocking)
            if not self.emotion_queue.full():
                try:
                    self.emotion_queue.put_nowait(face_region.copy())
                except:
                    pass  # Queue is full, skip this frame
            
            return self.current_emotion
            
        except Exception as e:
            print(f"Emotion detection error: {e}")
            return 'neutral'

    def _enhance_image_quality(self, image):
        """Enhance image quality for better emotion detection"""
        try:
            # Convert to LAB color space for (better for lighting)
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            l = clahe.apply(l)  # Enhance contrast in lighting channel
            
            # Merge back
            enhanced = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
            
            # Slight gaussian blur to reduce noise
            enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)
            
            return enhanced
        except:
            return image

    def detect_emotion_sync(self, face_region):
        """Synchronous emotion detection for background processing"""
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_path = temp_file.name
                # Save with high quality
                cv2.imwrite(temp_path, face_region, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
            # Prepare DeepFace analyze parameters based on version
            analyze_params = {
                'img_path': temp_path,
                'actions': ['emotion'],
                'enforce_detection': False,  # Don't enforce face detection
                'detector_backend': 'opencv',  # Use OpenCV backend for consistency
            }
            
            
            try:
               
                result = DeepFace.analyze(
                    img_path=temp_path,
                    actions=['emotion'],
                    enforce_detection=False,
                    detector_backend='opencv',
                    prog_bar=False
                )
            except TypeError as e:
                if 'prog_bar' in str(e):
                    # Remove prog_bar parameter for older versions
                    result = DeepFace.analyze(
                        img_path=temp_path,
                        actions=['emotion'],
                        enforce_detection=False,
                        detector_backend='opencv'
                    )
                else:
                    raise e
            
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass
            
            # Parse results - handle both old and new DeepFace formats
            emotions = None
            if isinstance(result, list) and len(result) > 0:
                if 'emotion' in result[0]:
                    emotions = result[0]['emotion']
                elif 'dominant_emotion' in result[0]:  # Newer format
                    # Get all emotion scores if available
                    emotions = {}
                    for key, value in result[0].items():
                        if key.endswith('_emotion') and not key.startswith('dominant'):
                            emotion_name = key.replace('_emotion', '')
                            emotions[emotion_name] = value
                    if not emotions and 'dominant_emotion' in result[0]:
                        # Fallback to dominant emotion only
                        dominant = result[0]['dominant_emotion']
                        emotions = {dominant: 100.0}
            elif isinstance(result, dict):
                if 'emotion' in result:
                    emotions = result['emotion']
                elif 'dominant_emotion' in result:
                    dominant = result['dominant_emotion']
                    emotions = {dominant: 100.0}
            
            if not emotions:
                return 'neutral'
            
            # Get dominant emotion with confidence check
            dominant_emotion = max(emotions, key=emotions.get)
            confidence = emotions[dominant_emotion] / 100.0 if emotions[dominant_emotion] > 1 else emotions[dominant_emotion]
            
            # Only return non-neutral emotions if confidence is high enough
            if dominant_emotion != 'neutral' and confidence < self.emotion_confidence_threshold:
                return 'neutral'
            
            # Map DeepFace emotions to meaningful categories
            emotion_mapping = {
                'angry': 'angry',
                'disgust': 'angry',  # Group disgust with angry
                'fear': 'fear',
                'happy': 'happy',
                'sad': 'sad',
                'surprise': 'surprise',  
                'neutral': 'neutral'
            }
            
            mapped_emotion = emotion_mapping.get(dominant_emotion.lower(), 'neutral')
            
            # Debug output for successful detections
            if mapped_emotion != 'neutral':
                print(f"Emotion detected: {dominant_emotion} -> {mapped_emotion} (confidence: {confidence:.2f})")
            
            return mapped_emotion
            
        except Exception as e:
            print(f"Sync emotion detection error: {e}")
            return 'neutral'

    def update_current_emotion(self, new_emotion):
        """Update current emotion with smoothing"""
        self.emotion_history.append(new_emotion)  # Add to history
        if len(self.emotion_history) > self.emotion_history_size:
            self.emotion_history.pop(0)
        
        # Use weighted voting from recent history
        if len(self.emotion_history) >= 3:
            # Give more weight to recent emotions
            weighted_emotions = []
            for i, emotion in enumerate(self.emotion_history):
                weight = i + 1  # More recent = higher weight
                weighted_emotions.extend([emotion] * weight)
            
            emotion_counts = Counter(weighted_emotions)
            most_common = emotion_counts.most_common(1)[0][0]
            
            # Only update if we have strong evidence or it's been consistent
            if most_common != 'neutral' or emotion_counts[most_common] >= 3:
                self.current_emotion = most_common

    def process_frame(self):
        """Process a single frame for stress detection"""
        if not self.detection_running or not self.vs or not self.vs.isOpened():
            return False   # Exit if detection stopped or camera unavailable

        ret, self.frame = self.vs.read()  # Read frame from camera
        if not ret:
            return False

        self.frame = cv2.flip(self.frame, 1)
        gray = cv2.cvtColor(self.frame, cv2.COLOR_BGR2GRAY)
        detections = self.detector(gray, 0)

        # Process emotion detection at intervals
        if self.emotion_frame_counter % self.emotion_detection_interval == 0:
            current_emotion = self.detect_emotion_improved(self.frame)
        else:
            current_emotion = self.current_emotion
        
        self.emotion_frame_counter += 1

        for detection in detections:
            try:
                 # Get facial landmarks
                shape = self.predictor(gray, detection)
                shape = face_utils.shape_to_np(shape)  # Convert to numpy array

                # Draw facial landmarks
                for (x, y) in shape:
                    cv2.circle(self.frame, (x, y), 1, (0, 255, 0), -1)

                # Analyze facial features
                eyebrow, eye, mouth = self.analyze_face(shape)

                if not self.baseline_established:
                    # Calibration phase
                    if self.calibration_frames < self.min_calibration_frames:
                        self.calibration_frames += 1
                        cv2.putText(self.frame, f"Calibrating... {self.calibration_frames}/{self.min_calibration_frames}", 
                                  (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                        return True
                    
                    # Establish baseline after calibration
                    self.baseline_eyebrow = eyebrow
                    self.baseline_eye = eye
                    self.baseline_mouth = mouth
                    self.baseline_established = True
                    print("\nBaseline established successfully!")
                    print(f"- Eyebrow distance: {eyebrow:.1f}")
                    print(f"- Eye ratio: {eye:.3f}")
                    print(f"- Mouth ratio: {mouth:.3f}")
                    print("\n✓ Calibration complete! Starting stress analysis...")
                    return True

                # Stress analysis phase
                stress_score = self.calculate_stress(eyebrow, eye, mouth)
                stress_level = "high_stress" if stress_score > 60 else "moderate_stress" if stress_score > 30 else "low_stress"
                
                self.results['stress_scores'].append(stress_score)
                self.results['stress_levels'].append(stress_level)
                self.results['emotions'].append(current_emotion)

                # Enhanced visual feedback
                cv2.putText(self.frame, f"Emotion: {current_emotion}", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                cv2.putText(self.frame, f"Stress: {stress_score:.1f}%", (10, 60),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                # Show emotion history for debugging
                if len(self.emotion_history) > 0:
                    recent_emotions = ', '.join(self.emotion_history[-3:])
                    cv2.putText(self.frame, f"Recent: {recent_emotions}", (10, 90),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

            except Exception as e:
                print(f"Detection error: {e}")

        return True

    def stop_detection(self):
        """Stop detection and finalize results"""
        try:
            # Stop emotion processing
            self.emotion_processing = False
            if self.emotion_thread and self.emotion_thread.is_alive():
                self.emotion_thread.join(timeout=2)
            
            # Clear emotion queue
            while not self.emotion_queue.empty():
                try:
                    self.emotion_queue.get_nowait()
                except:
                    break
            
            if self.vs and self.vs.isOpened():
                self.vs.release()
            
            if len(self.results['stress_scores']) > 0:
                self.results['analysis_complete'] = True
            else:
                self.results = {
                    'stress_scores': [0],
                    'stress_levels': ['low_stress'],
                    'emotions': ['neutral'],
                    'analysis_complete': True
                }
                
            self.detection_running = False
            print("Detection fully stopped")
        except Exception as e:
            print(f"Error during stop: {e}")
        finally:
            self.detection_running = False
            self.detection_stop_requested = False

    def analyze_face(self, shape):
        """Extract facial features for analysis"""
        # Eyebrow distance (between inner eyebrows)
        eyebrow_dist = np.linalg.norm(shape[21] - shape[22])
        
        # Eye aspect ratio (average of both eyes)
        left_eye = shape[36:42]
        right_eye = shape[42:48]
        eye_ratio = (self.eye_aspect_ratio(left_eye) + self.eye_aspect_ratio(right_eye)) / 2
        
        # Mouth aspect ratio
        mouth_width = np.linalg.norm(shape[48] - shape[54])# Corner to corner
        mouth_height = np.linalg.norm(shape[51] - shape[57])# Top to bottom
        mouth_ratio = mouth_height / mouth_width if mouth_width > 0 else 0
        
        return eyebrow_dist, eye_ratio, mouth_ratio

    def eye_aspect_ratio(self, eye):
        """Calculate eye aspect ratio (blink detection)"""
        A = np.linalg.norm(eye[1] - eye[5])  # Vertical distance 1
        B = np.linalg.norm(eye[2] - eye[4])  # Vertical distance 2
        C = np.linalg.norm(eye[0] - eye[3])  # Horizontal distance
        return (A + B) / (2.0 * C) if C != 0 else 0.3   # EAR (Eye Aspect Ratio) formula

    def calculate_stress(self, eyebrow, eye, mouth):
        """Calculate stress score based on deviations from baseline"""
        if not self.baseline_established:
            return 0
             # Calculate relative changes from baseline
        eyebrow_diff = abs(eyebrow - self.baseline_eyebrow) / self.baseline_eyebrow
        eye_diff = abs(eye - self.baseline_eye) / self.baseline_eye
        mouth_diff = abs(mouth - self.baseline_mouth) / self.baseline_mouth
        
        # Weighted average of deviations(eyebrows most important)
        stress_score = min((eyebrow_diff * 0.6 + eye_diff * 0.2 + mouth_diff * 0.2) * 100, 100)
        return stress_score

    def get_results(self):
        if not self.results['analysis_complete'] or len(self.results['stress_scores']) == 0:
            return None

        avg_stress = np.mean(self.results['stress_scores'])
        emotion_counts = Counter(self.results['emotions'])
        dominant_emotion = emotion_counts.most_common(1)[0][0]
        stress_level = Counter(self.results['stress_levels']).most_common(1)[0][0]

        # Enhanced recommendations based on both stress level and emotion
        recommendations = {
            ('high_stress', 'angry'): "Take immediate action: Step away, breathe deeply (4-7-8 technique), and count to 10. Try clenching and releasing your fists.",
            ('high_stress', 'fear'): "Ground yourself: Name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste. This helps reconnect with the present.",
            ('high_stress', 'sad'): "Practice self-compassion: Take slow, deep breaths and remind yourself this feeling will pass. Consider gentle self-soothing activities.",
            ('high_stress', 'happy'): "Great energy but high tension detected! Channel this positive energy mindfully with some deep breaths to stay balanced.",
            ('high_stress', 'surprise'): "High alertness detected! You seem very engaged or startled. Take 3 deep breaths to center yourself and process what's happening.",
            ('moderate_stress', 'angry'): "Try progressive muscle relaxation: Tense and release each muscle group for 5 seconds, starting from your toes.",
            ('moderate_stress', 'fear'): "Use box breathing: Inhale 4s, hold 4s, exhale 4s, hold 4s - repeat 4 times. Focus on the counting.",
            ('moderate_stress', 'sad'): "Engage in gentle movement: Take a short walk or do light stretching. Movement can help shift your emotional state.",
            ('moderate_stress', 'happy'): "Good balance! You seem energetic but slightly tense. Try some gentle stretching or take a brief walk to maintain this positive energy.",
            ('moderate_stress', 'surprise'): "You seem alert and engaged. This could be excitement or focus. Take a moment to breathe and stay present.",
            ('low_stress', 'happy'): "Excellent! Maintain this positive state with mindful awareness. Take a moment to appreciate what's going well.",
            ('low_stress', 'surprise'): "Pleasant alertness! You seem engaged and interested. Enjoy this state of active awareness.",
            ('low_stress', 'neutral'): "You're in a balanced state. Continue with your current activities while maintaining awareness of your wellbeing.",
        }
        
        # Get specific recommendation or fall back to general ones
        rec_key = (stress_level, dominant_emotion)
        if rec_key in recommendations:
            recommendation = recommendations[rec_key]
        else:
            # Fallback recommendations
            general_recommendations = {
                'high_stress': "Take 5 deep breaths now - 4 seconds in, hold 4, out 6 seconds. Focus on slowing your heart rate.",
                'moderate_stress': "Try the 4-7-8 breathing technique: inhale 4s, hold 7s, exhale 8s. This activates your calm response.",
                'low_stress': "You're doing well. Continue with your current activities while maintaining awareness of your wellbeing."
            }
            recommendation = general_recommendations.get(stress_level, "Focus on deep, slow breathing to maintain balance.")

        print("\n" + "=" * 50)
        print("FINAL ANALYSIS RESULTS")
        print("=" * 50)
        print(f"✓ Average Stress: {avg_stress:.1f}%")
        print(f"✓ Dominant Emotion: {dominant_emotion}")
        print(f"✓ Emotion Distribution: {dict(emotion_counts.most_common())}")
        print(f"✓ Stress Level: {stress_level}")
        print(f"✓ Recommendation: {recommendation}")
        print("=" * 50)

        return {
            'average_stress': avg_stress,
            'dominant_emotion': dominant_emotion,
            'stress_level': stress_level,
            'recommendation': recommendation,
            'emotion_distribution': dict(emotion_counts.most_common()),
            'status': 'success'
        }

    def generate_frames(self):
        """Generate video frames for streaming"""
        while True:
            if self.frame is not None:
                ret, buffer = cv2.imencode('.jpg', self.frame)
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            else:
                # Create a placeholder frame when no detection is running
                placeholder = np.ones((480, 640, 3), dtype=np.uint8) * 255
                cv2.putText(placeholder, "Waiting for detection...", (50, 240),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
                ret, buffer = cv2.imencode('.jpg', placeholder)
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.033)  # ~30 FPS

stress_detector = StressDetector()