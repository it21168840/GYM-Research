import os
import pickle
import datetime
import cv2 as cv
import numpy as np
import pandas as pd
import tensorflow as tf
from deepface import DeepFace
import matplotlib.pyplot as plt
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'


CORS(app)  # Enable CORS for all routes



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

with open('artifacts/encoder_workout.pkl', 'rb') as f:
    encoder_workout = pickle.load(f)

with open('artifacts/model_workout.pkl', 'rb') as f:
    model_workout = pickle.load(f)

with open('artifacts/encoder_meal.pkl', 'rb') as f:
    encoder_meal = pickle.load(f)

with open('artifacts/model_meal.pkl', 'rb') as f:
    model_meal = pickle.load(f)

with open('artifacts/model_stress.pkl', 'rb') as f:
    model_stress = pickle.load(f)

def inference_stress(
                    sample_json,
                    plan_path = "data/plans.xlsx"
                    ):
    sample_df = pd.DataFrame([sample_json])
    sample_df = sample_df.astype(float)
    sample_X = sample_df.values
    sample_Y = model_stress.predict(sample_X)
    total_score = np.sum(sample_Y).squeeze()

    df_plans = pd.read_excel(plan_path)
    if total_score <= 10:
        score_range = "0-10"
    elif total_score <= 20:
        score_range = "11-20"
    elif total_score <= 30:
        score_range = "21-30"
    elif total_score <= 40:
        score_range = "31-40"
    elif total_score <= 50:
        score_range = "41-50"
    elif total_score <= 60:
        score_range = "51-60"
    elif total_score <= 70:
        score_range = "61-70"
    recovery_plan = df_plans[df_plans["Score Range"] == score_range]["Recovery Plan"].values[0]
    return total_score, recovery_plan

def inference_emotion(img_path):
    objs = DeepFace.analyze(
                            img_path = img_path, 
                            actions = ['emotion'],
                            enforce_detection=False
                            )
    if len(objs) > 0:
        emotion_dict = objs[0]['emotion']
        emotion = max(emotion_dict, key=emotion_dict.get)
        return emotion
    else:
        return None
    
def inference_workout(
                    sample_json,
                    workout_path = 'data/Work out ID dataset.csv',
                    ):
    sample_df = pd.DataFrame([sample_json])
    sample_df["Workout_ID"] = "W014"
    del sample_df['Injuries'], sample_df['Health_Conditions']
    for col in encoder_workout.keys():
        sample_df[col] = encoder_workout[col].transform(sample_df[col])
    del sample_df["Workout_ID"]
    sample_df = sample_df.astype(float)
    sample_X = sample_df.values
    sample_Y = model_workout.predict(sample_X)
    workout = str(encoder_workout['Workout_ID'].inverse_transform(sample_Y).squeeze())

    df_workout = pd.read_csv(workout_path)
    workout_details = df_workout[df_workout['Workout_ID'] == workout]
    del workout_details['Workout_ID']
    
    workout_details = workout_details.to_dict(orient='records')
    return workout_details

def inference_meal(
                sample_json, 
                comments = None,
                meal_path = 'data/Plans_ID50.xlsx'
                ):
    df = pd.DataFrame([sample_json])
    del df['ID'], df['Allergies'], df['Health Condition']

    cat_columns = [col for col in df.columns if df[col].dtype == 'object']
    for col in cat_columns:
        df[col] = encoder_meal[col].transform(df[col])

    X = df.values
    Y = model_meal.predict(X)
    P = encoder_meal['MP'].inverse_transform(Y)
    P = str(P[0])

    df_meal = pd.read_excel(meal_path)
    df_meal = df_meal[df_meal['ID'].str.contains(P)]
    df_meal = df_meal.to_dict(orient='records')
    return df_meal

@app.route('/api/stress', methods=['POST'])
def stress():
    sample_json = request.json
    total_score, recovery_plan = inference_stress(sample_json)
    return jsonify({
                    "total_score": f"{total_score} / 70",
                    "recovery_plan": recovery_plan
                    })

@app.route('/api/emotion', methods=['POST'])
def emotion():
    img = request.files['img']
    img_path = os.path.join(app.config['UPLOAD_FOLDER'], img.filename)
    img.save(img_path)
    emotion = inference_emotion(img_path)
    return jsonify({'emotion': emotion})

@app.route('/api/workout', methods=['POST'])
def workout():
    sample_json = request.json
    workout_details = inference_workout(sample_json)
    return jsonify(workout_details)

@app.route('/api/meal', methods=['POST'])
def meal():
    try:
        print("Received meal request")
        if not request.json:
            print("No JSON data received")
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Log the request data for debugging
        print("Request data:", request.json)
        
        # Make a copy to avoid modifying the original
        sample_json = request.json.copy()
        comments = sample_json.pop('comments', None)
        
        # Call the inference function with proper error handling
        meal_details = inference_meal(
            sample_json,
            comments=comments
        )
        
        # Ensure the response is JSON serializable
        print("Successfully generated meal plan")
        response = jsonify(meal_details)
        response.headers.add('Content-Type', 'application/json')
        return response
        
    except Exception as e:
        print(f"Error in meal endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        error_response = jsonify({"error": str(e)})
        error_response.headers.add('Content-Type', 'application/json')
        return error_response, 500

@app.route('/hello', methods=['GET'])
def hello_world():
    return jsonify({
        "message": "Hello, World!",
        "status": "success"
    }), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)