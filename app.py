from flask import Flask, request, jsonify, Response, send_file
import os
from deepface import DeepFace
import base64
import re
import threading
import time
import cv2
import numpy as np
import pickle
import yaml
import tensorflow as tf  # ADD THIS - you were missing this import!
from flask_cors import CORS
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core import ChatPromptTemplate
from llama_index.llms.groq import Groq
from llama_index.core import Settings
import pandas as pd
from live import stress_detector

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load secrets if available
try:
    with open('secrets.yaml') as f:
        secrets = yaml.load(f, Loader=yaml.FullLoader)
    os.environ["GROQ_API_KEY"] = secrets['GROQ_API_KEY']
except:
    print("Warning: secrets.yaml not found. Using placeholder for GROQ_API_KEY.")
    os.environ["GROQ_API_KEY"] = "your-api-key-here"

# Initialize the LLM
completion_llm = Groq(
    model="llama3-70b-8192", 
    api_key=os.environ["GROQ_API_KEY"],
    temperature=0.3
)
Settings.llm = completion_llm

# ADD THIS SECTION - Load your custom emotion model (like in your old code)
try:
    model_emotion = tf.keras.models.load_model('artifacts/emotion_model.h5')
    model_emotion.compile(
        optimizer=tf.keras.optimizers.Adam(),
        loss='categorical_crossentropy',
        metrics=[
            tf.keras.metrics.CategoricalAccuracy(),
            tf.keras.metrics.Precision(),
            tf.keras.metrics.Recall(),
            tf.keras.metrics.AUC()
        ]
    )
    print("Custom emotion model loaded successfully!")
    use_custom_emotion = True
except FileNotFoundError:
    print("Warning: emotion_model.h5 not found. Using DeepFace as fallback.")
    use_custom_emotion = False
except Exception as e:
    print(f"Error loading custom emotion model: {e}")
    use_custom_emotion = False

# Stress prompt template
STRESS_PROMPT = """
You are a professional fitness trainer with experience in mental health. You have a client who is experiencing stress.

here is the recovery plan you provided to the client:
{recoveryplan}

below are the comments of the client:
{comments}

based on the recovery plan and comments, modify the recovery plan and provide the new recovery plan to the client.
"""

stress_template = ChatPromptTemplate(
    message_templates=[
        ChatMessage(
            role=MessageRole.SYSTEM, 
            content=STRESS_PROMPT
        )
    ]
)

# Load stress model
try:
    with open('artifacts/model_stress.pkl', 'rb') as f:
        model_stress = pickle.load(f)
    print("Stress model loaded successfully!")
except:
    print("Warning: model_stress.pkl not found.")

# Global variables for detection thread
detection_thread = None

def run_detection():
    """Run the stress detection in a loop"""
    try:
        stress_detector.start_detection()
        while (stress_detector.detection_running and 
               not stress_detector.detection_stop_requested):
            try:
                stress_detector.process_frame()
            except Exception as e:
                print(f"Error in detection update: {e}")
                time.sleep(0.1)
            time.sleep(0.033)  # ~30 FPS
    finally:
        stress_detector.stop_detection()

def preprocess_emotion_image(img_path):
    """Preprocess image for your custom emotion model"""
    try:
        img = cv2.imread(img_path)
        if img is None:
            return None
        
        # Resize to (72, 72) and keep as RGB
        img_resized = cv2.resize(img, (72, 72))
        
        # Convert to float32 and preprocess using Xception preprocessing
        img_array = tf.keras.applications.xception.preprocess_input(
            img_resized.astype('float32')
        )
        
        # Reshape for model input
        img_final = img_array.reshape(1, 72, 72, 3)

        return img_final
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return None


def custom_inference_emotion(img_path):
    """Use your custom trained emotion model"""
    try:
        # Preprocess image
        processed_img = preprocess_emotion_image(img_path)
        if processed_img is None:
            return None
        
        # Get prediction from your model
        predictions = model_emotion.predict(processed_img, verbose=0)
        
        # Define emotion labels (adjust based on your training data)
        emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
        
        # Get the predicted emotion
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])
        dominant_emotion = emotion_labels[predicted_class]
        
        # Create emotion dictionary with all probabilities
        emotion_dict = {}
        for i, label in enumerate(emotion_labels):
            emotion_dict[label] = float(predictions[0][i])
        
        return {
            'dominant_emotion': dominant_emotion,
            'all_emotions': emotion_dict,
            'confidence': confidence,
            'model_used': 'custom'
        }
        
    except Exception as e:
        print(f"Error in custom emotion inference: {e}")
        return None

# def deepface_inference_emotion(img_path):
#     """Fallback to DeepFace for emotion detection"""
#     try:
#         objs = DeepFace.analyze(
#             img_path=img_path, 
#             actions=['emotion'],
#             enforce_detection=False
#         )
#         if len(objs) > 0:
#             emotions = objs[0]['emotion']
#             dominant_emotion = max(emotions, key=emotions.get)
#             return {
#                 'dominant_emotion': dominant_emotion,
#                 'all_emotions': emotions,
#                 'confidence': emotions[dominant_emotion],
#                 'model_used': 'deepface'
#             }
#         return None
#     except Exception as e:
#         print(f"Error in DeepFace emotion detection: {e}")
#         return None

def inference_emotion(img_path):
    """Main emotion detection function - tries custom model first, then DeepFace"""
    
    # Try custom model first
    if use_custom_emotion:
        print("Using custom emotion model...")
        result = custom_inference_emotion(img_path)
        if result is not None:
            return result
        else:
            print("Custom model failed, falling back to DeepFace...")
    
#     # Fallback to DeepFace
#     print("Using DeepFace for emotion detection...")
#     result = deepface_inference_emotion(img_path)
#     if result is not None:
#         return result
    
#     # If both fail
#     return {'error': 'Emotion detection failed with both models'}

import re

import traceback
from flask import jsonify, request
import pandas as pd
import numpy as np
import re

def inference_stress(sample_json, comments=None, plan_path="data/plans.xlsx", use_model=False):
    try:
        stress_features = ['Q1A', 'Q6A', 'Q8A', 'Q11A', 'Q12A', 'Q14A', 'Q18A',
                           'Q22A', 'Q27A', 'Q29A', 'Q32A', 'Q33A', 'Q35A', 'Q39A']
        
        # Ensure all features exist
        for feature in stress_features:
            if feature not in sample_json:
                sample_json[feature] = 0
        
        sample_df = pd.DataFrame([sample_json])
        sample_df = sample_df.astype(float)
        
        print(f"Input values: {[sample_json[f] for f in stress_features]}")
        
        if use_model:
            try:
                # Check if model exists
                if 'model_stress' not in globals():
                    raise NameError("model_stress is not defined")
                
                sample_X = sample_df[stress_features].values
                sample_Y = model_stress.predict(sample_X)
                
                actual_predictions = sample_Y.flatten()
                print(f"Model Predictions Array: {actual_predictions.tolist()}")
                print(f"Prediction breakdown: {' + '.join(map(str, actual_predictions))} = {np.sum(actual_predictions)}")
                
                total_score = int(np.sum(sample_Y).squeeze())
                print(f"Model-based total score: {total_score}")
                
            except Exception as model_error:
                print(f"Model prediction failed: {model_error}")
                print("Falling back to direct sum calculation")
                total_score = int(sample_df[stress_features].sum(axis=1).values[0])
                print(f"Fallback total score: {total_score}")
        else:
            # Direct sum calculation
            total_score = int(sample_df[stress_features].sum(axis=1).values[0])
            print(f"Direct sum total score: {total_score}")
        
        # Determine stress category
        if total_score <= 10:
            category_label = "0-10"
        elif total_score <= 20:
            category_label = "11-20"
        elif total_score <= 30:
            category_label = "21-30"
        elif total_score <= 40:
            category_label = "31-40"
        elif total_score <= 50:
            category_label = "41-50"
        elif total_score <= 60:
            category_label = "51-60"
        elif total_score <= 70:
            category_label = "61-70"
        else:
            category_label = "71+"
        
        # Load recovery plan
        try:
            df_plans = pd.read_excel(plan_path)
            matched_plan = None
            
            for _, row in df_plans.iterrows():
                range_str = str(row["Score Range"])
                match = re.match(r"(\d+)\s*-\s*(\d+)", range_str)
                if match:
                    low, high = map(int, match.groups())
                    if low <= total_score <= high:
                        matched_plan = row["Recovery Plan"]
                        break
                elif range_str.strip() == category_label:
                    matched_plan = row["Recovery Plan"]
                    break
            
            if not matched_plan:
                raise ValueError("No matching recovery plan found for this score.")
            
            recovery_plan = matched_plan
            
        except Exception as e:
            print(f"Error loading recovery plans: {e}")
            recovery_plan = f"Recommended stress management strategies for {category_label} stress level."
        
        # Optional LLM enhancement
        try:
            if comments and use_model:
                if 'stress_template' in globals() and 'completion_llm' in globals():
                    fmt_messages = stress_template.format(recoveryplan=recovery_plan, comments=comments)
                    chat_response = completion_llm.complete(fmt_messages)
                    recovery_plan = chat_response.text
                else:
                    print("LLM components not available, skipping enhancement")
                    recovery_plan += f"\n\nNote: You mentioned '{comments}'. Please consider this when following the recovery advice."
            elif comments:
                recovery_plan += f"\n\nNote: You mentioned '{comments}'. Please consider this when following the recovery advice."
        except Exception as llm_error:
            print(f"LLM enhancement failed: {llm_error}")
            if comments:
                recovery_plan += f"\n\nNote: You mentioned '{comments}'. Please consider this when following the recovery advice."
        
        return total_score, category_label, recovery_plan
    
    except Exception as e:
        print(f"Error in inference_stress: {e}")
        traceback.print_exc()
        # Return default values in case of error
        return 0, "0-10", "Error occurred during stress assessment. Please try again."

@app.route('/api/stress', methods=['POST'])
def stress():
    try:
        # Validate request
        if not request.json:
            return jsonify({
                "error": "No JSON data provided"
            }), 400
        
        sample_json = request.json.copy()  # Make a copy to avoid modifying original
        comments = sample_json.pop('comments', None)
        
        print(f"Received request: {sample_json}")
        
        # Call inference function with model
        stress_score, category_label, recovery_plan = inference_stress(
            sample_json, 
            comments, 
            use_model=True  # Using model as requested
        )
        
        response_data = {
            "Total Stress Score": stress_score,
            "Stress Category": category_label,
            "Recovery Plan": recovery_plan
        }
        
        print(f"Sending response: {response_data}")
        
        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error in stress API endpoint: {e}")
        traceback.print_exc()
        
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "Total Stress Score": 0,
            "Stress Category": "Error",
            "Recovery Plan": "An error occurred. Please try again."
        }), 500

# Test the function to debug
def test_stress_function():
    sample_test = {
        'Q1A': 4, 'Q6A': 4, 'Q8A': 4, 'Q11A': 4, 'Q12A': 4, 'Q14A': 4, 'Q18A': 4,
        'Q22A': 4, 'Q27A': 4, 'Q29A': 4, 'Q32A': 4, 'Q33A': 4, 'Q35A': 4, 'Q39A': 4
    }
    
    print("Testing stress function...")
    result = inference_stress(sample_test, use_model=True)
    print(f"Test result: {result}")
    
# Uncomment to test
# test_stress_function()

@app.route('/api/update-plan', methods=['POST'])
def update_plan():
    try:
        data = request.json
        fmt_messages = stress_template.format(
            recoveryplan=data.get('currentPlan'),
            comments=data.get('comments')
        )
        chat_response = completion_llm.complete(fmt_messages)
        return jsonify({
            'status': 'success',
            'updated_plan': chat_response.text
        })
    except Exception as e:
        print(f"Error in update_plan: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/emotion', methods=['POST'])
def emotion():
    try:
        img_path = None
        
        # Handle base64 encoded image
        if 'img' in request.form and request.form['img'].startswith('data:image'):
            img_data = re.sub('^data:image/.+;base64,', '', request.form['img'])
            img_path = os.path.join(app.config['UPLOAD_FOLDER'], 'temp_img.jpg')
            with open(img_path, 'wb') as f:
                f.write(base64.b64decode(img_data))
        
        # Handle file upload
        elif 'img' in request.files:
            img = request.files['img']
            img_path = os.path.join(app.config['UPLOAD_FOLDER'], img.filename)
            img.save(img_path)
        
        # Handle any file in request
        elif len(request.files) > 0:
            img = request.files[list(request.files.keys())[0]]
            img_path = os.path.join(app.config['UPLOAD_FOLDER'], img.filename)
            img.save(img_path)
        
        else:
            return jsonify({'error': 'No image found in the request'}), 400
        
        # Analyze emotion
        result = inference_emotion(img_path)
        
        # Clean up temporary file
        try:
            if img_path and os.path.exists(img_path):
                os.remove(img_path)
        except:
            pass
        
        # Return result
        if 'error' in result:
            return jsonify(result), 400
        else:
            return jsonify(result)
            
    except Exception as e:
        print(f"Unexpected error in emotion endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add model status endpoint
@app.route('/api/model-status', methods=['GET'])
def model_status():
    return jsonify({
        'custom_emotion_model': use_custom_emotion,
        'models_available': {
            'emotion': 'custom' if use_custom_emotion else 'deepface',
            'stress': 'loaded' if 'model_stress' in globals() else 'not_loaded'
        }
    })

@app.route('/api/start-stress-detection', methods=['GET'])
def start_stress_detection():
    global detection_thread
    if stress_detector.detection_running:
        return jsonify({"status": "Detection already running"})
    
    detection_thread = threading.Thread(target=run_detection)
    detection_thread.start()
    return jsonify({"status": "Stress detection started"})

@app.route('/api/stop-stress-detection', methods=['GET'])
def stop_stress_detection():
    try:
        if stress_detector.detection_running and not stress_detector.detection_stop_requested:
            stress_detector.detection_stop_requested = True
            
            def finalize():
                time.sleep(0.5)
                stress_detector.stop_detection()
                
            threading.Thread(target=finalize).start()
            
            return jsonify({
                "status": "stop_initiated",
                "message": "Detection stopping - results will be available shortly"
            })
        return jsonify({
            "status": "not_running",
            "message": "Detection not running"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/stress-detection-status', methods=['GET'])
def stress_detection_status():
    return jsonify({
        "running": stress_detector.detection_running,
        "complete": stress_detector.results.get('analysis_complete', False)
    })

@app.route('/api/get-stress-results', methods=['GET'])
def get_stress_results():
    if not stress_detector.results['analysis_complete']:
        return jsonify({
            "status": "processing",
            "message": "Results being calculated"
        }), 202
    
    results = stress_detector.get_results()
    if results is None:
        return jsonify({
            "status": "error",
            "message": "No results available"
        }), 400
    
    # Clear results after sending
    stress_detector.results['analysis_complete'] = False
    stress_detector.results['stress_scores'] = []
    stress_detector.results['stress_levels'] = []
    stress_detector.results['emotions'] = []
        
    return jsonify(results)

@app.route('/stress-video-feed')
def stress_video_feed():
    try:
        return Response(stress_detector.generate_frames(),
                      mimetype='multipart/x-mixed-replace; boundary=frame')
    except Exception as e:
        print(f"Error in video feed: {e}")
        return str(e), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)