from __main__ import app
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from gridfs import GridFS
from bson import ObjectId
from Database.db import db

fs = GridFS(db)

@app.route('/challenges', methods=['GET'])
def get_challenges():
    user_id = request.args.get('user_id')
    challenge_type = request.args.get('type')

    friend_user_ids = []
    if challenge_type == 'friends':
        user = db.Users.find_one({'_id': ObjectId(user_id)})
        if user:
            friend_user_ids = user.get('friends_list', [])
        challenges = db.Challenges.find({'$or': [{'createdBy': {'$in': friend_user_ids}}, {'subscribers': user_id}]})
    elif challenge_type == 'forYou':
        challenges = db.Challenges.find()
    else:
        challenges = []

    challenge_list = []
    for challenge in challenges:
        subscribed_friends = [friend for friend in challenge.get('subscribers', []) if friend in friend_user_ids]
        image_ids = challenge.get('images', [])[:6]  # Limit to top 6 images
        challenge_list.append({
            '_id': str(challenge['_id']),
            'title': challenge['title'],
            'subscribed': user_id in challenge.get('subscribers', []),
            'subscribedFriends': subscribed_friends,
            'images': image_ids,
        })

    return jsonify({'challenges': challenge_list}), 200

@app.route('/subscribe_challenge', methods=['POST'])
def subscribe_challenge():
    user_id = request.json['user_id']
    challenge_id = request.json['challengeId']

    db.Challenges.update_one(
        {'_id': ObjectId(challenge_id)},
        {'$addToSet': {'subscribers': user_id}}
    )

    return jsonify({'message': 'Subscribed to challenge'}), 200

@app.route('/toggle_subscribe_challenge', methods=['POST'])
def toggle_subscribe_challenge():
    user_id = request.json['user_id']
    challenge_id = request.json['challengeId']

    challenge = db.Challenges.find_one({'_id': ObjectId(challenge_id)})
    if challenge:
        if user_id in challenge.get('subscribers', []):
            db.Challenges.update_one(
                {'_id': ObjectId(challenge_id)},
                {'$pull': {'subscribers': user_id}}
            )
            message = 'Unsubscribed from challenge'
        else:
            db.Challenges.update_one(
                {'_id': ObjectId(challenge_id)},
                {'$addToSet': {'subscribers': user_id}}
            )
            message = 'Subscribed to challenge'
    else:
        message = 'Challenge not found'

    return jsonify({'message': message}), 200

@app.route('/create_challenge', methods=['POST'])
def create_challenge():
    title = request.form['title']
    user_id = request.form['user_id']
    image = request.files.get('image')

    if not title or not user_id:
        return jsonify({'error': 'Title and user_id are required'}), 400

    existing_challenge = db.Challenges.find_one({'title': title})

    if existing_challenge:
        if image:
            filename = secure_filename(image.filename)
            image_id = fs.put(image, filename=filename)
            db.Challenges.update_one(
                {'_id': existing_challenge['_id']},
                {'$push': {'images': str(image_id)}}
            )
        return jsonify({
            'message': 'Image added to existing challenge',
            'challengeId': str(existing_challenge['_id']),
            'imageId': str(image_id) if image else None
        }), 200
    else:
        challenge = {
            'title': title,
            'createdBy': user_id,
            'subscribers': [user_id],
            'images': []
        }
        challenge_id = db.Challenges.insert_one(challenge).inserted_id

        if image:
            filename = secure_filename(image.filename)
            image_id = fs.put(image, filename=filename)
            db.Challenges.update_one(
                {'_id': challenge_id},
                {'$push': {'images': str(image_id)}}
            )

        return jsonify({
            'message': 'New challenge created',
            'challengeId': str(challenge_id),
            'imageId': str(image_id) if image else None
        }), 201
