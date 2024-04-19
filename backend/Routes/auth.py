from __main__ import app
from flask import request, jsonify
import json
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from Database.db import db

@app.route('/register', methods=['POST'])
def register():
    email = request.json['email']
    password = request.json['password']
    firstName = request.json['firstName']
    lastName = request.json['lastName']

    user = db.Users.find_one({'email': email})
    if user:
        return jsonify({'error': 'User already exists'}), 409
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    user = {
        'email': email,
        'password': hashed_password,
        'name': firstName + " " + lastName,
    }
    db.Users.insert_one(user)
    return jsonify({"message": "registered"}), 200

@app.route('/login', methods=['POST'])
def login():
    username = request.json['username']
    password = request.json['password']
    user = db.Users.find_one({'username': username})
    if user and check_password_hash(user['password'], password):
        return jsonify({"message": "successfull", "username": user['name']}), 200
    else:
        return jsonify({'error': 'Invalid login credentials'}), 400
