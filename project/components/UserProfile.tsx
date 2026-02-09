import React, { useState } from 'react';
import { User, NotificationPreferences } from '../types';

interface UserProfileProps {
    currentUser: User;
    onUpdateProfile: (updatedUser: User) => void;
    onBack: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ currentUser, onUpdateProfile, onBack }) => {
    const [name, setName] = useState(currentUser.name);
    const [email, setEmail] = useState(currentUser.email);
    const [preferences, setPreferences] = useState<NotificationPreferences>(currentUser.preferences);

    const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setPreferences(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateProfile({ ...currentUser, name, email, preferences });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Personal Information</h2>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Notification Preferences */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Email Notifications</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose which events you want to be notified about.</p>
                    <div className="mt-4 space-y-4">
                        <label className="flex items-center">
                            <input type="checkbox" name="onStatusChange" checked={preferences.onStatusChange} onChange={handlePreferenceChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">When a ticket's status changes</span>
                        </label>
                         <label className="flex items-center">
                            <input type="checkbox" name="onNewComment" checked={preferences.onNewComment} onChange={handlePreferenceChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">When a new comment is added</span>
                        </label>
                         <label className="flex items-center">
                            <input type="checkbox" name="onAssignment" checked={preferences.onAssignment} onChange={handlePreferenceChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">When a ticket is assigned to me</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                     <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};
