import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { getUserGames } from '../services/game.service';
import toast from 'react-hot-toast';
import { FaPlus, FaGamepad, FaUsers, FaClock, FaArrowRight, FaDice, FaChess, FaRegLightbulb } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchGames = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await getUserGames(token);
        
        console.log('Dashboard games response:', response);
        
        // Special handling for the "Games API" message
        if (response.data && response.data.message === 'Games API') {
          console.log('Received "Games API" message, using empty array');
          setGames([]);
          setLoading(false);
          return;
        }
        
        if (response.success) {
          if (response.data && Array.isArray(response.data.games)) {
            setGames(response.data.games);
          } else {
            console.warn('Games data is not in expected format, using empty array');
            setGames([]);
          }
        } else {
          console.error('Failed to load games:', response);
          toast.error(response.message || 'Failed to load games');
          setGames([]);
        }
      } catch (err) {
        console.error('Error fetching games:', err);
        toast.error('An unexpected error occurred');
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'guess-the-word':
        return <FaRegLightbulb className="text-yellow-500" />;
      case 'tic-tac-toe':
        return <FaChess className="text-blue-500" />;
      case 'hangman':
        return <FaGamepad className="text-green-500" />;
      case 'memory-match':
        return <FaDice className="text-purple-500" />;
      default:
        return <FaGamepad className="text-primary-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredGames = games.filter(game => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return game.status === 'waiting' || game.status === 'in-progress';
    if (activeTab === 'completed') return game.status === 'completed';
    return true;
  });

  return (
    <ProtectedRoute>
      <MainLayout title="Dashboard - Tasenda">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg p-6 mb-8 shadow-lg"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}!</h1>
                <p className="text-primary-100">Manage your games and create new experiences.</p>
              </div>
              <Link href="/games/create">
                <Button variant="secondary" className="mt-4 md:mt-0 flex items-center gap-2 bg-white text-primary-700 hover:bg-primary-50">
                  <FaPlus /> Create New Game
                </Button>
              </Link>
            </div>
          </motion.div>

          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="border-b px-6 py-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-2 font-medium text-sm rounded-md ${
                    activeTab === 'all'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  All Games
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-2 font-medium text-sm rounded-md ${
                    activeTab === 'active'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Active Games
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-3 py-2 font-medium text-sm rounded-md ${
                    activeTab === 'completed'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Completed Games
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
                </div>
              ) : filteredGames.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-12"
                >
                  <div className="text-gray-400 mb-4">
                    <FaGamepad size={64} className="mx-auto" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No Games Found</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {activeTab === 'all' 
                      ? "You haven't created or joined any games yet." 
                      : activeTab === 'active' 
                        ? "You don't have any active games. Start a new game!" 
                        : "You don't have any completed games yet."}
                  </p>
                  <Link href="/games/create">
                    <Button variant="primary" className="px-6">Create Your First Game</Button>
                  </Link>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGames.map((game, index) => (
                    <motion.div
                      key={game._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Link href={`/games/${game._id}`}>
                        <div className="border rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-white">
                          <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-4 border-b">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white mr-3">
                                {getGameIcon(game.gameType)}
                              </div>
                              <h3 className="font-bold text-lg truncate">{game.title}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                                {game.gameType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(game.status)}`}>
                                {game.status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center text-gray-600 text-sm mb-2">
                              <FaUsers className="mr-2" />
                              <span>{game.players.length}/{game.maxPlayers} Players</span>
                            </div>
                            <div className="flex items-center text-gray-600 text-sm">
                              <FaClock className="mr-2" />
                              <span>Created: {formatDate(game.createdAt)}</span>
                            </div>
                            <div className="mt-4 flex justify-end">
                              <span className="text-primary-600 flex items-center text-sm font-medium">
                                View Game <FaArrowRight className="ml-1" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Dashboard; 