import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await axios.get('http://localhost:3001/api/users');
      setUsers(result.data);
    };
    fetchUsers();
  }, []);

  const createUser = async () => {
    const result = await axios.post('http://localhost:3001/api/users', newUser);
    setUsers([...users, result.data]);
    setNewUser({ username: '', email: '' });
  };

  const updateUser = async (id, updatedUser) => {
    await axios.put(`http://localhost:3001/api/users/${id}`, updatedUser);
    setUsers(users.map(user => (user.id === id ? updatedUser : user)));
  };

  const deleteUser = async (id) => {
    await axios.delete(`http://localhost:3001/api/users/${id}`);
    setUsers(users.filter(user => user.id !== id));
  };

  return (
    <div>
      <h2>Users</h2>
      <input
        type="text"
        value={newUser.username}
        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
        placeholder="Username"
      />
      <input
        type="text"
        value={newUser.email}
        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
        placeholder="Email"
      />
      <button onClick={createUser}>Create User</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.username} ({user.email})
            <button onClick={() => deleteUser(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Users;
