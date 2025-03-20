import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../../components/layout/MainLayout';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';
import Button from '../../../components/common/Button';
import { getGameByInviteCode, joinGameByInviteCode } from '../../../services/game.service';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaGamepad, FaUsers, FaCalendarAlt, FaArrowLeft } from 'react-icons/fa';

const JoinGame = () => {
  const router = useRouter();
  const { inviteCode } = router.query;
  const { token, isAuthenticated } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!inviteCode) return;

    const fetchGame = async () => {
      try {
        setLoading(true);
        const response = await getGameByInviteCode(inviteCode as string);
        
        if (response.success && response.data) {
          setGame(response.data.game);
        } else {
          setError(response.message || 'Invalid invite code');
        }
      } catch (err) {
        console.error('Error fetching game:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [inviteCode]);

  const handleJoinGame = async () => {
    if (!token || !isAuthenticated) {
      router.push(`/auth/login?returnUrl=${encodeURIComponent(router.asPath)}`);
      return;
    }
    
    try {
      setJoining(true);
      const response = await joinGameByInviteCode(inviteCode as string, token);
      
      if (response.success) {
        toast.success('Successfully joined the game!');
        router.push(`/games/${response.data.game._id}`);
      } else {
        toast.error(response.message || 'Failed to join the game');
      }
    } catch (err) {
      console.error('Error joining game:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Join Game - Tasenda">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !game) {
    return (
      <MainLayout title="Error - Tasenda">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Invite Code</h1>
          <p className="text-gray-600 mb-6">{error || 'The game you are trying to join does not exist or has expired.'}</p>
          <Link href="/">
            <Button variant="primary">Back to Home</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const getGameTypeIcon = (type: string) => {
    switch (type) {
      case 'guess-the-word':
        return <FaGamepad className="text-yellow-500" />;
      default:
        return <FaGamepad className="text-gray-500" />;
    }
  };

  const getGameTypeName = (type: string) => {
    switch (type) {
      case 'guess-the-word':
        return 'Guess the Word';
      default:
        return type;
    }
  };

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

  return (
    <MainLayout title={`Join ${game.title} - Tasenda`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-800 mb-6">
          <FaArrowLeft className="mr-2" /> Back to Home
        </Link>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">{game.title}</h1>
            
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(game.status)}`}>
                {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
              </span>
              
              <div className="flex items-center text-gray-500 text-sm">
                <FaUsers className="mr-1" />
                <span>{game.playerCount}/{game.maxPlayers} Players</span>
              </div>
              
              <div className="flex items-center text-gray-500 text-sm">
                <FaCalendarAlt className="mr-1" />
                <span>Created {new Date(game.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                  {getGameTypeIcon(game.gameType)}
                </div>
                <div>
                  <h2 className="font-medium">Game Type</h2>
                  <p className="text-gray-600">{getGameTypeName(game.gameType)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-3">
                  {game.creator.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-medium">Host</h2>
                  <p className="text-gray-600">{game.creator}</p>
                </div>
              </div>
            </div>
            
            {game.status === 'waiting' ? (
              <Button
                variant="primary"
                className="w-full"
                onClick={handleJoinGame}
                isLoading={joining}
                disabled={joining}
              >
                Join Game
              </Button>
            ) : (
              <div className="bg-gray-100 p-4 rounded-md text-center">
                <p className="text-gray-700">
                  This game is no longer accepting new players.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default JoinGame; 