import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ caption: '', createdBy: '', groupId: '' });

  useEffect(() => {
    const fetchPosts = async () => {
      const result = await axios.get('http://localhost:3001/api/posts');
      setPosts(result.data);
    };
    fetchPosts();
  }, []);

  const createPost = async () => {
    const result = await axios.post('http://localhost:3001/api/posts', newPost);
    setPosts([...posts, result.data]);
    setNewPost({ caption: '', createdBy: '', groupId: '' });
  };

  const updatePost = async (id, updatedPost) => {
    await axios.put(`http://localhost:3001/api/posts/${id}`, updatedPost);
    setPosts(posts.map(post => (post.id === id ? updatedPost : post)));
  };

  const deletePost = async (id) => {
    await axios.delete(`http://localhost:3001/api/posts/${id}`);
    setPosts(posts.filter(post => post.id !== id));
  };

  return (
    <div>
      <h2>Posts</h2>
      <input
        type="text"
        value={newPost.caption}
        onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
        placeholder="Caption"
      />
      <input
        type="text"
        value={newPost.createdBy}
        onChange={(e) => setNewPost({ ...newPost, createdBy: e.target.value })}
        placeholder="Created By"
      />
      <input
        type="text"
        value={newPost.groupId}
        onChange={(e) => setNewPost({ ...newPost, groupId: e.target.value })}
        placeholder="Group ID"
      />
      <button onClick={createPost}>Create Post</button>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            {post.caption} by {post.createdBy}
            <button onClick={() => deletePost(post.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Posts;
