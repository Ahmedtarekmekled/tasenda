import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../components/layout/MainLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import { getUserGames } from '../../services/game.service';
import { FaPlus, FaGamepad, FaUsers, FaClock, FaCheck, FaHourglass, FaPlay, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

const GamesPage = () => {
  const router = useRouter();
  const { user, token } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGames = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await getUserGames(token);
        
        console.log('Games response:', response);
        
        if (response.success) {
          if (response.data && Array.isArray(response.data.games)) {
            setGames(response.data.games);
          } else {
            console.warn('Games data is not in expected format, using empty array');
            setGames([]);
          }
        } else {
          console.error('Failed to load games:', response);
          setError(response.message || 'Failed to load games');
          toast.error(response.message || 'Failed to load games');
          setGames([]);
        }
      } catch (err) {
        console.error('Error fetching games:', err);
        setError('An unexpected error occurred');
        toast.error('An unexpected error occurred');
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [token]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FaHourglass className="mr-1" /> Waiting
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <FaPlay className="mr-1" /> In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FaCheck className="mr-1" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FaTimes className="mr-1" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType) {
      case 'tic-tac-toe':
        return <span className="text-blue-600">#</span>;
      case 'word-guess':
        return <span className="text-green-600">Aa</span>;
      case 'trivia':
        return <span className="text-purple-600">?</span>;
      default:
        return <FaGamepad />;
    }
  };

  const getGameTypeName = (gameType: string) => {
    switch (gameType) {
      case 'tic-tac-toe':
        return 'Tic-Tac-Toe';
      case 'word-guess':
        return 'Word Guess';
      case 'trivia':
        return 'Trivia';
      default:
        return gameType;
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Games</h1>
            <Link href="/games/create">
              <Button variant="primary" className="flex items-center gap-2">
                <FaPlus /> Create Game
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FaGamepad className="mx-auto text-gray-400 text-5xl mb-4" />
              <h2 className="text-xl font-medium text-gray-600 mb-2">No Games Found</h2>
              <p className="text-gray-500 mb-6">You haven't created or joined any games yet.</p>
              <Link href="/games/create">
                <Button variant="primary">Create Your First Game</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <div key={game._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold">{game.title}</h3>
                    <div className="flex items-center mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(game.status)}`}>
                        {game.status}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">{game.gameType}</span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <FaUsers className="mr-1" />
                        <span>{game.players.length}/{game.maxPlayers} Players</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <FaClock className="inline mr-1" />
                        <span>{new Date(game.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {game.status === 'in-progress' ? (
                      <Link href={`/games/play/${game._id}`}>
                        <Button 
                          variant="primary" 
                          fullWidth 
                          className="mt-2"
                        >
                          Play Now
                        </Button>
                      </Link>
                    ) : game.status === 'waiting' ? (
                      <Link href={`/games/${game._id}`}>
                        <Button 
                          variant="outline" 
                          fullWidth 
                          className="mt-2"
                        >
                          View Game
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/games/${game._id}`}>
                        <Button 
                          variant="secondary" 
                          fullWidth 
                          className="mt-2"
                        >
                          View Results
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default GamesPage; 