import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../components/layout/MainLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import { getGameById, updateGameStatus, joinGameByInviteCode } from '../../services/game.service';
import { 
  initializeSocket, 
  joinGameRoom, 
  leaveGameRoom, 
  onPlayerJoined, 
  onPlayerLeft, 
  onGameUpdated,
  removeGameListeners 
} from '../../services/socket.service';
import toast from 'react-hot-toast';
import { FaUsers, FaCopy, FaPlay, FaStop, FaArrowLeft, FaShare, FaUserFriends, FaGamepad, FaClock, FaCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';

const GameDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, token } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const inviteLinkRef = useRef<HTMLInputElement>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const fetchGame = useCallback(async () => {
    if (!id || !token) return;
    
    try {
      setLoading(true);
      const response = await getGameById(id as string, token);
      
      if (response.success && response.data) {
        setGame(response.data.game);
        setCanJoin(response.data.game.canJoin || false);
      } else {
        setError(response.message || 'Failed to load game');
        toast.error(response.message || 'Failed to load game');
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!id || !token) return;

    // Set up socket connection
    const socket = initializeSocket(token);
    
    if (socket) {
      joinGameRoom(id as string);
      
      // Listen for player joined event
      onPlayerJoined((data) => {
        console.log('Player joined:', data);
        if (data.gameId === id) {
          toast.success(`${data.playerName} joined the game!`);
          fetchGame(); // Refresh game data
        }
      });
      
      // Listen for player left event
      onPlayerLeft((data) => {
        console.log('Player left:', data);
        if (data.gameId === id) {
          toast.info(`${data.playerName} left the game`);
          fetchGame(); // Refresh game data
        }
      });
      
      // Listen for game updated event
      onGameUpdated((data) => {
        console.log('Game updated:', data);
        if (data.gameId === id) {
          fetchGame(); // Refresh game data
        }
      });
      
      // Clean up socket connection and listeners
      return () => {
        leaveGameRoom(id as string);
        removeGameListeners();
      };
    }
  }, [id, token, fetchGame]);

  const handleCopyInviteLink = () => {
    if (inviteLinkRef.current) {
      inviteLinkRef.current.select();
      document.execCommand('copy');
      setCopySuccess(true);
      toast.success('Invite link copied to clipboard!');
      
      // Reset copy success after 3 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
    }
  };

  const handleUpdateGameStatus = async (status: string) => {
    if (!game || !token) return;
    
    try {
      setIsUpdatingStatus(true);
      
      // Log the user ID and game creator ID to debug
      console.log('User ID:', user?.id);
      console.log('Game Creator ID:', game.creator._id);
      
      const response = await updateGameStatus(game._id, status, token);
      
      if (response.success) {
        toast.success(`Game status updated to ${status}`);
        fetchGame(); // Refresh game data
      } else {
        toast.error(response.message || 'Failed to update game status');
      }
    } catch (error) {
      console.error('Error updating game status:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleJoinGame = async () => {
    if (!game || !token) return;
    
    try {
      setIsJoining(true);
      const response = await joinGameByInviteCode(game.inviteCode, token);
      
      if (response.success) {
        toast.success('Successfully joined the game!');
        fetchGame(); // Refresh game data after joining
      } else {
        toast.error(response.message || 'Failed to join the game');
      }
    } catch (err) {
      console.error('Error joining game:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsJoining(false);
    }
  };

  const isHost = game && user && game.creator._id === user.id;
  const isPlayerInGame = game && user && game.players.some((player: any) => 
    player.user && player.user._id === user.id
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout title="Loading Game - Tasenda">
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error || !game) {
    return (
      <ProtectedRoute>
        <MainLayout title="Error - Tasenda">
          <div className="min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Game</h1>
            <p className="text-gray-600 mb-6">{error || 'Game not found'}</p>
            <Link href="/dashboard">
              <Button variant="primary">Back to Dashboard</Button>
            </Link>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const getStatusBadgeClass = (status: string) => {
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

  const getGameTypeIcon = (type: string) => {
    switch (type) {
      case 'guess-the-word':
        return <FaGamepad className="text-yellow-500" />;
      case 'tic-tac-toe':
        return <FaGamepad className="text-blue-500" />;
      case 'hangman':
        return <FaGamepad className="text-green-500" />;
      case 'memory-match':
        return <FaGamepad className="text-purple-500" />;
      default:
        return <FaGamepad className="text-gray-500" />;
    }
  };

  const getGameTypeName = (type: string) => {
    switch (type) {
      case 'guess-the-word':
        return 'Guess the Word';
      case 'tic-tac-toe':
        return 'Tic Tac Toe';
      case 'hangman':
        return 'Hangman';
      case 'memory-match':
        return 'Memory Match';
      default:
        return type;
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout title={game ? `${game.title} - Tasenda` : 'Loading Game - Tasenda'}>
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            {/* Back button */}
            <Link href="/dashboard" className="inline-flex items-center text-primary-600 hover:text-primary-800 mb-4">
              <FaArrowLeft className="mr-2" /> Back to Dashboard
            </Link>
            
            {/* Game not found or error */}
            {error && (
              <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>{error}</p>
              </div>
            )}
            
            {/* Loading state */}
            {loading && (
              <div className="w-full flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            )}
            
            {/* Game details */}
            {game && !loading && !error && (
              <div className="w-full bg-white shadow-md rounded-lg overflow-hidden">
                {/* Game header */}
                <div className="p-6 border-b">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-bold">{game.title}</h1>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(game.status)}`}>
                          {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                        </span>
                        <span className="text-gray-500 text-sm flex items-center">
                          <FaUsers className="mr-1" /> {game.players.length}/{game.maxPlayers} Players
                        </span>
                        <span className="text-gray-500 text-sm flex items-center">
                          <FaClock className="mr-1" /> Created {new Date(game.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Invite link (only for waiting games) */}
                    {game.status === 'waiting' && (
                      <div className="w-full md:w-auto">
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <div className="relative w-full sm:w-auto">
                            <input
                              ref={inviteLinkRef}
                              type="text"
                              value={`${window.location.origin}/games/join/${game.inviteCode}`}
                              readOnly
                              className="w-full sm:w-64 px-3 py-2 border rounded-md text-sm"
                            />
                          </div>
                          <Button
                            variant="secondary"
                            onClick={handleCopyInviteLink}
                            className="w-full sm:w-auto flex items-center justify-center gap-2"
                          >
                            {copySuccess ? <FaCheck /> : <FaCopy />}
                            {copySuccess ? 'Copied!' : 'Copy Invite Link'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Tabs */}
                <div className="border-b">
                  <div className="flex overflow-x-auto">
                    <button
                      className={`px-4 py-3 text-sm font-medium ${activeTab === 'info' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('info')}
                    >
                      Game Info
                    </button>
                    <button
                      className={`px-4 py-3 text-sm font-medium ${activeTab === 'players' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('players')}
                    >
                      Players
                    </button>
                    {isHost && (
                      <button
                        className={`px-4 py-3 text-sm font-medium ${activeTab === 'host' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('host')}
                      >
                        Host Controls
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Tab content */}
                <div className="p-6">
                  {activeTab === 'info' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div>
                        <h2 className="text-lg font-medium">Game Type</h2>
                        <div className="mt-2 flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                            {getGameTypeIcon(game.gameType)}
                          </div>
                          <span>{getGameTypeName(game.gameType)}</span>
                        </div>
                      </div>
                      
                      {game.description && (
                        <div>
                          <h2 className="text-lg font-medium">Description</h2>
                          <p className="mt-2 text-gray-600">{game.description}</p>
                        </div>
                      )}
                      
                      <div>
                        <h2 className="text-lg font-medium">Host</h2>
                        <div className="mt-2 flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-3">
                            {game.creator.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{game.creator.name}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {activeTab === 'players' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-lg font-medium mb-4">Players ({game.players.length}/{game.maxPlayers})</h2>
                      <div className="space-y-3">
                        {game.players.map((player: any, index: number) => (
                          <div key={`${player.user._id}-${index}`} className="flex items-center p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-4">
                              {player.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{player.user.name}</div>
                              <div className="text-sm text-gray-500">
                                {player.role === 'host' ? 'Host' : 'Player'} • Joined {new Date(player.joinedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  {activeTab === 'host' && isHost && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-lg font-medium mb-4">Host Controls</h2>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h3 className="font-medium mb-2">Game Status</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            {game.status === 'waiting' 
                              ? 'The game is currently waiting for players to join. You can start the game when ready.'
                              : game.status === 'in-progress'
                                ? 'The game is currently in progress.'
                                : 'The game has ended.'}
                          </p>
                          
                          {game.status === 'waiting' && (
                            <Button
                              variant="primary"
                              onClick={() => handleUpdateGameStatus('in-progress')}
                              className="flex items-center gap-2"
                              isLoading={isUpdatingStatus}
                              disabled={isUpdatingStatus || game.players.length < 2}
                            >
                              <FaPlay /> Start Game
                            </Button>
                          )}
                          
                          {game.status === 'in-progress' && (
                            <Button
                              variant="danger"
                              onClick={() => handleUpdateGameStatus('cancelled')}
                              className="flex items-center gap-2"
                              isLoading={isUpdatingStatus}
                              disabled={isUpdatingStatus}
                            >
                              <FaStop /> Cancel Game
                            </Button>
                          )}
                        </div>
                        
                        {game.status === 'waiting' && game.players.length < 2 && (
                          <p className="mt-3 text-sm text-gray-600">
                            You need at least 2 players to start the game.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {game.status === 'in-progress' && (
                    <Link href={`/games/play/${game._id}`}>
                      <Button
                        variant="primary"
                        className="flex items-center gap-2 mt-6 w-full sm:w-auto"
                      >
                        <FaGamepad /> Play Game
                      </Button>
                    </Link>
                  )}

                  {/* Show join button for users who aren't already in the game */}
                  {canJoin && (
                    <div className="mt-6">
                      <Button
                        variant="primary"
                        onClick={handleJoinGame}
                        className="w-full"
                        isLoading={isJoining}
                        disabled={isJoining}
                      >
                        Join This Game
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default GameDetail; 