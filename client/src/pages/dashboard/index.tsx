import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../components/layout/MainLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleCreateGame = () => {
    router.push('/games/create');
  };

  return (
    <ProtectedRoute>
      <MainLayout title="Dashboard - Tasenda">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.name}!</h1>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
            
            <p className="text-gray-600 mb-4">
              This is your personal dashboard where you can manage your games and profile.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-primary-50 p-4 rounded-md border border-primary-100">
                <h3 className="font-semibold text-primary-800 mb-2">Your Stats</h3>
                <ul className="text-gray-700">
                  <li className="flex justify-between py-1">
                    <span>Games Played:</span>
                    <span className="font-medium">0</span>
                  </li>
                  <li className="flex justify-between py-1">
                    <span>Games Won:</span>
                    <span className="font-medium">0</span>
                  </li>
                  <li className="flex justify-between py-1">
                    <span>Win Rate:</span>
                    <span className="font-medium">0%</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="primary" onClick={handleCreateGame} fullWidth>
                    Create New Game
                  </Button>
                  <Link href="/games" className="block">
                    <Button variant="outline" fullWidth>
                      Browse Games
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity to display.</p>
              <p className="mt-2">Start playing games to see your activity here!</p>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Dashboard; 