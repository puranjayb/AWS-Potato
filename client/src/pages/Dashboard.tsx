import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserData, useUpdateUser } from '../hooks/useApiData';

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { data: userData, isLoading, error } = useUserData();
  const updateUserMutation = useUpdateUser();

  const handleUpdateUser = () => {
    updateUserMutation.mutate({
      name: 'Updated Name',
    });
  };

  if (isLoading) return <div>Loading user data...</div>;
  if (error) return <div>Error loading user data</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.username}!</p>
      {userData && (
        <div>
          <h2>User Data from API:</h2>
          <p>Name: {userData.name}</p>
          <p>Email: {userData.email}</p>
        </div>
      )}
      <button onClick={handleUpdateUser}>Update User</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};

export default Dashboard;