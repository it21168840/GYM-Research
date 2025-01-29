import pickle
import yaml, os
import cv2 as cv
import numpy as np
import pandas as pd
import tensorflow as tf
from deepface import DeepFace
import matplotlib.pyplot as plt
from flask import Flask, request, jsonify

from llama_index.core.llms import (
                                ChatMessage,
                                MessageRole
                                )
from llama_index.core import ChatPromptTemplate
from llama_index.llms.groq import Groq
from llama_index.core import Settings
from flask_cors import CORS

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
CORS(app)

with open('secrets.yaml') as f:
    secrets = yaml.load(f, Loader=yaml.FullLoader)

os.environ["GROQ_API_KEY"] = secrets['GROQ_API_KEY']
completion_llm = Groq(
                    model="llama3-70b-8192", 
                    api_key=os.environ["GROQ_API_KEY"],
                    temperature=0.3
                    )
Settings.llm = completion_llm

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



EX_PROMPT = """
You are a professional fitness trainer and you have been assigned a new client.

here is the workout plan of the client:
{workoutplan}

below are the comments of the client:
{comments}

based on the workout plan and comments, modify the workout plan and provide the new workout plan to the client.

it should only return as a `List of JSON` object. DO NOT return any other string
"""

STRESS_PROMPT = """
You are a professional fitness trainer with experience in mental health. You have a client who is experiencing stress.

here is the recovery plan you provided to the client:
{recoveryplan}

below are the comments of the client:
{comments}

based on the recovery plan and comments, modify the recovery plan and provide the new recovery plan to the client.
"""

MEAL_PROMPT = """
You are a professional fitness trainer with experience in creating meal plans for clients. You have a client who is looking to consult with you for a meal plan. 

here is the meal plan of the Your:
{mealplan}

below are the comments of the client:
{comments}

based on the meal plan and comments, modify the meal plan and provide the new meal plan to the client.

it should only return as a `List of JSON` object. DO NOT return any other string
"""
ex_template = ChatPromptTemplate(
                                message_templates=[
                                                ChatMessage(
                                                            role=MessageRole.SYSTEM, 
                                                            content=EX_PROMPT
                                                            )
                                                ]
                                )

stress_template = ChatPromptTemplate(
                                message_templates=[
                                                ChatMessage(
                                                            role=MessageRole.SYSTEM, 
                                                            content=STRESS_PROMPT
                                                            )
                                                ]
                                )

meal_template = ChatPromptTemplate(
                                message_templates=[
                                                ChatMessage(
                                                            role=MessageRole.SYSTEM, 
                                                            content=MEAL_PROMPT
                                                            )
                                                ]
                                )

def inference_stress(
                    sample_json,
                    comments = None,
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
    if comments is None:
        return total_score, recovery_plan
    
    fmt_messages = stress_template.format(
                                    recoveryplan=recovery_plan,
                                    comments=comments
                                    )
    chat_response = completion_llm.complete(fmt_messages)
    recovery_plan_updated = chat_response.text
    return total_score, recovery_plan_updated

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
                    comments = None,
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
    if comments is None:
        return workout_details
    
    fmt_messages = ex_template.format(
                                    workoutplan=workout_details,
                                    comments=comments
                                    )
    chat_response = completion_llm.complete(fmt_messages)
    workout_details_updated = chat_response.text
    return workout_details_updated

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
    if comments is None:
        return df_meal
    
    fmt_messages = meal_template.format(
                                    mealplan=df_meal,
                                    comments=comments
                                    )
    chat_response = completion_llm.complete(fmt_messages)
    meal_plan_updated = chat_response.text
    return meal_plan_updated

@app.route('/api/stress', methods=['POST'])
def stress():
    sample_json = request.json
    comments = sample_json.pop('comments', None)
    total_score, recovery_plan = inference_stress(
                                                sample_json,
                                                comments=comments
                                                )
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
    comments = sample_json.pop('comments', None)
    workout_details = inference_workout(
                                        sample_json,
                                        comments=comments
                                        )
    return jsonify(workout_details)

@app.route('/api/meal', methods=['POST'])
def meal():
    sample_json = request.json
    comments = sample_json.pop('comments', None)
    meal_details = inference_meal(
                                sample_json,
                                comments=comments
                                )
    return jsonify(meal_details)

if __name__ == '__main__':
    app.run(debug=True)