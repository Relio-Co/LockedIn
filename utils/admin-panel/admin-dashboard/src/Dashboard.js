import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Users from './Users';
import Groups from './Groups';
import Posts from './Posts';

const Dashboard = () => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <nav>
        <Link to="/users">Users</Link> | <Link to="/groups">Groups</Link> | <Link to="/posts">Posts</Link>
      </nav>
      <Routes>
        <Route path="/users" element={<Users />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/posts" element={<Posts />} />
      </Routes>
    </div>
  );
};

export default Dashboard;
