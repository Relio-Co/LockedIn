from __main__ import app
from flask import request, jsonify
import json
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from Database.db import db
from utils import get_user
    
@app.route('/get_friends', methods=['GET'])
def get_friends():
    current_user_username = request.args.get('current_user_username')

    current_user = get_user(current_user_username)

    if current_user:
        friends = current_user.get('friends_list', [])
        return jsonify({"friends": friends}), 200
    else:
        print("User not found")
        return jsonify({"error": "User not found"}), 404
        

@app.route('/make_friend_request', methods=['POST'])
def friend_request():
    current_user_username = request.json['current_user_username']
    friend_username = request.json['friend_username']

    current_user = get_user(current_user_username)
    friend = get_user(friend_username)

    if current_user and friend:
        if friend_username in current_user.get('pending_friend_requests', []):
            return jsonify({"error": "Friend request already sent"}), 400

        current_user_pending_requests = current_user.get('pending_friend_requests', [])
        current_user_pending_requests.append(friend_username)
        current_user['pending_friend_requests'] = current_user_pending_requests
        db.Users.update_one({'username': current_user_username}, {'$set': {'pending_friend_requests': current_user_pending_requests}})

        friend_incoming_requests = friend.get('incoming_friend_requests', [])
        friend_incoming_requests.append(current_user_username)
        friend['incoming_friend_requests'] = friend_incoming_requests
        db.Users.update_one({'username': friend_username}, {'$set': {'incoming_friend_requests': friend_incoming_requests}})
        
        return jsonify({"message": "Friend request sent successfully"}), 200
    else:
        return jsonify({"error": "User not found"}), 404

@app.route('/add_friend', methods=['POST'])
def add_friend():
    current_user_username = request.json['current_user_username']
    friend_username = request.json['friend_username']
    action = request.json['action']  # 'accept' or 'decline'

    current_user = get_user(current_user_username)
    friend = get_user(friend_username)

    if current_user and friend:
        if action == 'accept':
            # Add friend to current user's friends list
            current_user_friends = current_user.get('friends_list', [])
            if friend_username not in current_user_friends:
                current_user_friends.append(friend_username)
                current_user['friends_list'] = current_user_friends
                db.Users.update_one({'username': current_user_username}, {'$set': {'friends_list': current_user_friends}})
                
                # Remove friend request from current user's incoming requests
                current_user_incoming_requests = current_user.get('incoming_friend_requests', [])
                if friend_username in current_user_incoming_requests:
                    current_user_incoming_requests.remove(friend_username)
                    current_user['incoming_friend_requests'] = current_user_incoming_requests
                    db.Users.update_one({'username': current_user_username}, {'$set': {'incoming_friend_requests': current_user_incoming_requests}})
                
                # Add current user to friend's friends list
                friend_friends = friend.get('friends_list', [])
                if current_user_username not in friend_friends:
                    friend_friends.append(current_user_username)
                    friend['friends_list'] = friend_friends
                    db.Users.update_one({'username': friend_username}, {'$set': {'friends_list': friend_friends}})
                    
                # Remove friend request from friend's pending requests
                friend_pending_requests = friend.get('pending_friend_requests', [])
                if current_user_username in friend_pending_requests:
                    friend_pending_requests.remove(current_user_username)
                    friend['pending_friend_requests'] = friend_pending_requests
                    db.Users.update_one({'username': friend_username}, {'$set': {'pending_friend_requests': friend_pending_requests}})
                    
                return jsonify({"message": "Friend added successfully"}), 200
            else:
                return jsonify({"error": "Friend already exists"}), 400
        elif action == 'decline':
            # Remove friend request from current user's incoming requests
            current_user_incoming_requests = current_user.get('incoming_friend_requests', [])
            if friend_username in current_user_incoming_requests:
                current_user_incoming_requests.remove(friend_username)
                current_user['incoming_friend_requests'] = current_user_incoming_requests
                db.Users.update_one({'username': current_user_username}, {'$set': {'incoming_friend_requests': current_user_incoming_requests}})
                
                # Remove friend request from friend's pending requests
                friend_pending_requests = friend.get('pending_friend_requests', [])
                if current_user_username in friend_pending_requests:
                    friend_pending_requests.remove(current_user_username)
                    friend['pending_friend_requests'] = friend_pending_requests
                    db.Users.update_one({'username': friend_username}, {'$set': {'pending_friend_requests': friend_pending_requests}})
                    
                return jsonify({"message": "Friend request declined"}), 200
            else:
                return jsonify({"error": "Friend request not found"}), 404
        else:
            return jsonify({"error": "Invalid action"}), 400
    else:
        return jsonify({"error": "User not found"}), 404

@app.route('/get_pending_friend_requests', methods=['GET'])
def get_pending_friend_requests():
    current_user_username = request.args.get('current_user_username')

    current_user = get_user(current_user_username)

    if current_user:
        pending_requests = current_user.get('pending_friend_requests', [])
        return jsonify({"pending_requests": pending_requests}), 200
    else:
        return jsonify({"error": "User not found"}), 404

@app.route('/get_incoming_friend_requests', methods=['GET'])
def get_incoming_friend_requests():
    current_user_username = request.args.get('current_user_username')

    current_user = get_user(current_user_username)

    if current_user:
        incoming_requests = current_user.get('incoming_friend_requests', [])
        return jsonify({"incoming_requests": incoming_requests}), 200
    else:
        return jsonify({"error": "User not found"}), 404
