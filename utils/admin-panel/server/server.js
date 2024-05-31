const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

admin.initializeApp({
  credential: admin.credential.cert(require('../../cloudfunctions/servicefile.json')),
});

const db = admin.firestore();
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// CRUD operations for users
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    const newUserRef = await db.collection('users').add(user);
    res.json({ id: newUserRef.id, ...user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = req.body;
    await db.collection('users').doc(userId).update(user);
    res.send('User updated');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await db.collection('users').doc(userId).delete();
    res.send('User deleted');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send('Internal Server Error');
  }
});

// CRUD operations for groups
app.get('/api/groups', async (req, res) => {
  try {
    const groupsSnapshot = await db.collection('groups').get();
    const groups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const group = req.body;
    const newGroupRef = await db.collection('groups').add(group);
    res.json({ id: newGroupRef.id, ...group });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.put('/api/groups/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = req.body;
    await db.collection('groups').doc(groupId).update(group);
    res.send('Group updated');
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    await db.collection('groups').doc(groupId).delete();
    res.send('Group deleted');
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).send('Internal Server Error');
  }
});

// CRUD operations for posts
app.get('/api/posts', async (req, res) => {
  try {
    const postsSnapshot = await db.collection('posts').get();
    const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const post = req.body;
    const newPostRef = await db.collection('posts').add(post);
    res.json({ id: newPostRef.id, ...post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const post = req.body;
    await db.collection('posts').doc(postId).update(post);
    res.send('Post updated');
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    await db.collection('posts').doc(postId).delete();
    res.send('Post deleted');
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});