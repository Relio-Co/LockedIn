from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from gridfs import GridFS
import shutil
import io

app = FastAPI()

origins = [
    "http://localhost:8080",
    "*",
    "http://localhost:8081",
    "https://expo.saipriya.org"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient('mongodb://localhost:27017')
db = client.mydatabase
fs = GridFS(db)


class User(BaseModel):
    email: str
    password: str
    firstName: str
    lastName: str


class Login(BaseModel):
    email: str
    password: str


class ChallengeSubscription(BaseModel):
    email: str
    challengeId: str


class FriendRequest(BaseModel):
    current_user_email: str
    friend_email: str


class FriendAction(BaseModel):
    current_user_email: str
    friend_email: str
    action: str


@app.post("/register")
async def register(user: User):
    existing_user = await db.Users.find_one({'email': user.email})
    if existing_user:
        raise HTTPException(status_code=409, detail="User already exists")
    hashed_password = generate_password_hash(user.password, method='pbkdf2:sha256')
    new_user = {
        'email': user.email,
        'password': hashed_password,
        'name': user.firstName + " " + user.lastName,
    }
    await db.Users.insert_one(new_user)
    return {"message": "registered"}


@app.post("/login")
async def login(login: Login):
    user = await db.Users.find_one({'email': login.email})
    if user and check_password_hash(user['password'], login.password):
        return {"message": "successful", "username": user['name']}
    else:
        raise HTTPException(status_code=400, detail="Invalid login credentials")


@app.get("/challenges")
async def get_challenges(email: str, type: str):
    friend_emails = []
    if type == 'friends':
        user = await db.Users.find_one({'email': email})
        if user:
            friend_emails = user.get('friends_list', [])
        challenges = db.Challenges.find({'$or': [{'createdBy': {'$in': friend_emails}}, {'subscribers': email}]})
    elif type == 'forYou':
        challenges = db.Challenges.find()
    else:
        challenges = []

    challenge_list = []
    async for challenge in challenges:
        subscribed_friends = [friend for friend in challenge.get('subscribers', []) if friend in friend_emails]
        image_ids = challenge.get('images', [])[:6]  # Limit to top 6 images
        challenge_list.append({
            '_id': str(challenge['_id']),
            'title': challenge['title'],
            'subscribed': email in challenge.get('subscribers', []),
            'subscribedFriends': subscribed_friends,
            'images': image_ids,
        })

    return {'challenges': challenge_list}


@app.post("/subscribe_challenge")
async def subscribe_challenge(subscription: ChallengeSubscription):
    await db.Challenges.update_one(
        {'_id': ObjectId(subscription.challengeId)},
        {'$addToSet': {'subscribers': subscription.email}}
    )
    return {'message': 'Subscribed to challenge'}


@app.post("/toggle_subscribe_challenge")
async def toggle_subscribe_challenge(subscription: ChallengeSubscription):
    challenge = await db.Challenges.find_one({'_id': ObjectId(subscription.challengeId)})
    if challenge:
        if subscription.email in challenge.get('subscribers', []):
            await db.Challenges.update_one(
                {'_id': ObjectId(subscription.challengeId)},
                {'$pull': {'subscribers': subscription.email}}
            )
            message = 'Unsubscribed from challenge'
        else:
            await db.Challenges.update_one(
                {'_id': ObjectId(subscription.challengeId)},
                {'$addToSet': {'subscribers': subscription.email}}
            )
            message = 'Subscribed to challenge'
    else:
        message = 'Challenge not found'
    return {'message': message}


class CreateChallenge(BaseModel):
    title: str
    email: str


@app.post("/create_challenge")
async def create_challenge(challenge: CreateChallenge, image: UploadFile = File(...)):
    if not challenge.title or not challenge.email:
        raise HTTPException(status_code=400, detail="Title and email are required")

    existing_challenge = await db.Challenges.find_one({'title': challenge.title})

    if existing_challenge:
        if image:
            image_id = await save_image(image)
            await db.Challenges.update_one(
                {'_id': existing_challenge['_id']},
                {'$push': {'images': str(image_id)}}
            )
        return {
            'message': 'Image added to existing challenge',
            'challengeId': str(existing_challenge['_id']),
            'imageId': str(image_id) if image else None
        }
    else:
        new_challenge = {
            'title': challenge.title,
            'createdBy': challenge.email,
            'subscribers': [challenge.email],
            'images': []
        }
        challenge_id = await db.Challenges.insert_one(new_challenge).inserted_id

        if image:
            image_id = await save_image(image)
            await db.Challenges.update_one(
                {'_id': challenge_id},
                {'$push': {'images': str(image_id)}}
            )

        return {
            'message': 'New challenge created',
            'challengeId': str(challenge_id),
            'imageId': str(image_id) if image else None
        }


async def save_image(image: UploadFile):
    filename = image.filename
    new_file = await fs.new_file(filename=filename)
    content = await image.read()
    await new_file.write(content)
    await new_file.close()
    return new_file._id


@app.post("/upload/image")
async def upload_image(challenge_id: str = Form(...), image: UploadFile = File(...)):
    if not challenge_id or not image:
        raise HTTPException(status_code=400, detail="Challenge ID and image are required")

    image_id = await save_image(image)
    await db.Challenges.update_one(
        {'_id': ObjectId(challenge_id)},
        {'$push': {'images': str(image_id)}}
    )
    return {'message': 'Image uploaded successfully', 'image_id': str(image_id)}


@app.post("/upload/video")
async def upload_video(challenge_id: str = Form(...), video: UploadFile = File(...)):
    if not challenge_id or not video:
        raise HTTPException(status_code=400, detail="Challenge ID and video are required")

    video_id = await save_video(video)
    await db.Challenges.update_one(
        {'_id': ObjectId(challenge_id)},
        {'$push': {'videos': str(video_id)}}
    )
    return {'message': 'Video uploaded successfully', 'video_id': str(video_id)}


async def save_video(video: UploadFile):
    filename = video.filename
    new_file = await fs.new_file(filename=filename)
    content = await video.read()
    await new_file.write(content)
    await new_file.close()
    return new_file._id


@app.get("/images/{challenge_id}")
async def get_images_by_challenge_id(challenge_id: str):
    challenge = await db.Challenges.find_one({'_id': ObjectId(challenge_id)})
    if challenge:
        images = challenge.get('images', [])
        if images:
            image_data = []
            for image_id in images:
                image_object = await fs.get(ObjectId(image_id))
                if image_object:
                    image_data.append(image_object.read())
            if image_data:
                return StreamingResponse(io.BytesIO(b"".join(image_data)), media_type="image/jpeg")
            else:
                raise HTTPException(status_code=404, detail="No images found for this challenge")
        else:
            raise HTTPException(status_code=404, detail="No images found for this challenge")
    else:
        raise HTTPException(status_code=404, detail="Challenge not found")


@app.get("/videos/{challenge_id}")
async def get_videos_by_challenge_id(challenge_id: str):
    challenge = await db.Challenges.find_one({'_id': ObjectId(challenge_id)})
    if challenge:
        videos = challenge.get('videos', [])
        if videos:
            video_id = videos[0]  # Assuming you want to send the first video
            video_object = await fs.get(ObjectId(video_id))
            return StreamingResponse(io.BytesIO(video_object.read()), media_type="video/mp4")
        else:
            raise HTTPException(status_code=404, detail="No videos found for this challenge")
    else:
        raise HTTPException(status_code=404, detail="Challenge not found")


@app.get("/image/{image_id}")
async def get_image_by_id(image_id: str):
    image_object = await fs.get(ObjectId(image_id))
    if image_object:
        return StreamingResponse(io.BytesIO(image_object.read()), media_type="image/jpeg")
    else:
        raise HTTPException(status_code=404, detail="Image not found")


@app.get("/get_friends")
async def get_friends(current_user_email: str):
    current_user = await db.Users.find_one({'email': current_user_email})
    if current_user:
        friends = current_user.get('friends_list', [])
        return {"friends": friends}
    else:
        raise HTTPException(status_code=404, detail="User not found")


@app.post("/make_friend_request")
async def make_friend_request(friend_request: FriendRequest):
    current_user = await db.Users.find_one({'email': friend_request.current_user_email})
    friend = await db.Users.find_one({'email': friend_request.friend_email})

    if current_user and friend:
        if friend_request.friend_email in current_user.get('pending_friend_requests', []):
            raise HTTPException(status_code=400, detail="Friend request already sent")

        await db.Users.update_one(
            {'email': friend_request.current_user_email},
            {'$addToSet': {'pending_friend_requests': friend_request.friend_email}}
        )
        await db.Users.update_one(
            {'email': friend_request.friend_email},
            {'$addToSet': {'incoming_friend_requests': friend_request.current_user_email}}
        )
        return {"message": "Friend request sent successfully"}
    else:
        raise HTTPException(status_code=404, detail="User not found")


@app.post("/add_friend")
async def add_friend(friend_action: FriendAction):
    current_user = await db.Users.find_one({'email': friend_action.current_user_email})
    friend = await db.Users.find_one({'email': friend_action.friend_email})

    if current_user and friend:
        if friend_action.action == 'accept':
            await db.Users.update_one(
                {'email': friend_action.current_user_email},
                {
                    '$addToSet': {'friends_list': friend_action.friend_email},
                    '$pull': {'incoming_friend_requests': friend_action.friend_email}
                }
            )
            await db.Users.update_one(
                {'email': friend_action.friend_email},
                {
                    '$addToSet': {'friends_list': friend_action.current_user_email},
                    '$pull': {'pending_friend_requests': friend_action.current_user_email}
                }
            )
            return {"message": "Friend added successfully"}
        elif friend_action.action == 'decline':
            await db.Users.update_one(
                {'email': friend_action.current_user_email},
                {'$pull': {'incoming_friend_requests': friend_action.friend_email}}
            )
            await db.Users.update_one(
                {'email': friend_action.friend_email},
                {'$pull': {'pending_friend_requests': friend_action.current_user_email}}
            )
            return {"message": "Friend request declined"}
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
    else:
        raise HTTPException(status_code=404, detail="User not found")


@app.get("/get_pending_friend_requests")
async def get_pending_friend_requests(current_user_email: str):
    current_user = await db.Users.find_one({'email': current_user_email})
    if current_user:
        pending_requests = current_user.get('pending_friend_requests', [])
        return {"pending_requests": pending_requests}
    else:
        raise HTTPException(status_code=404, detail="User not found")


@app.get("/get_incoming_friend_requests")
async def get_incoming_friend_requests(current_user_email: str):
    current_user = await db.Users.find_one({'email': current_user_email})
    if current_user:
        incoming_requests = current_user.get('incoming_friend_requests', [])
        return {"incoming_requests": incoming_requests}
    else:
        raise HTTPException(status_code=404, detail="User not found")
