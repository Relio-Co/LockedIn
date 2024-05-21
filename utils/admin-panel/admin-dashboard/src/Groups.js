import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  useEffect(() => {
    const fetchGroups = async () => {
      const result = await axios.get('http://localhost:3001/api/groups');
      setGroups(result.data);
    };
    fetchGroups();
  }, []);

  const createGroup = async () => {
    const result = await axios.post('http://localhost:3001/api/groups', newGroup);
    setGroups([...groups, result.data]);
    setNewGroup({ name: '', description: '' });
  };

  const updateGroup = async (id, updatedGroup) => {
    await axios.put(`http://localhost:3001/api/groups/${id}`, updatedGroup);
    setGroups(groups.map(group => (group.id === id ? updatedGroup : group)));
  };

  const deleteGroup = async (id) => {
    await axios.delete(`http://localhost:3001/api/groups/${id}`);
    setGroups(groups.filter(group => group.id !== id));
  };

  return (
    <div>
      <h2>Groups</h2>
      <input
        type="text"
        value={newGroup.name}
        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
        placeholder="Group Name"
      />
      <input
        type="text"
        value={newGroup.description}
        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
        placeholder="Description"
      />
      <button onClick={createGroup}>Create Group</button>
      <ul>
        {groups.map(group => (
          <li key={group.id}>
            {group.name} ({group.description})
            <button onClick={() => deleteGroup(group.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Groups;
