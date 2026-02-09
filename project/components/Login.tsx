import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User, token: string) => void;
}

// API base URL - should be in environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0].id.toString());
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const selectedUser = users.find(u => u.id === parseInt(selectedUserId));

    if (!selectedUser) {
      setError('User not found.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedUser.email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Store token in localStorage for subsequent API calls
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      onLogin(data.user, data.token);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Ticketing System Login
        </h1>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select User
            </label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-gray-100"
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
          <div>
             <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-gray-100"
                required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Note: For demo purposes, all users have password "password"
        </p>
      </div>
    </div>
  );
};
