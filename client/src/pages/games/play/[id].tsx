import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../../components/layout/MainLayout';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/common/Button';
import GameBoard from '../../../components/game/GameBoard';
import { getGameById } from '../../../services/game.service';
import { 
  initializeSocket, 
  joinGameRoom, 
  leaveGameRoom, 
  onPlayerJoined, 
  onPlayerLeft, 
  onGameUpdated,
  onGameStateUpdate,
  onGameCompleted,
  onGameError,
  onChatMessage,
  removeGameListeners,
  sendGameAction,
  sendChatMessage
} from '../../../services/socket.service';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaUsers, FaPaperPlane, FaGamepad, FaComments, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';

const GamePlay = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, token } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'players'
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    if (!id || !token) return;
    
    try {
      setLoading(true);
      const response = await getGameById(id as string, token);
      
      if (response.success && response.data) {
        setGame(response.data.game);
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
    if (!id || !token || !user) return;

    // Set up socket connection
    const socket = initializeSocket(token);
    
    if (socket) {
      joinGameRoom(id as string);
      
      // Listen for player joined event
      onPlayerJoined((data) => {
        if (data.gameId === id) {
          toast.success(`${data.playerName} joined the game!`);
          fetchGame(); // Refresh game data
          
          // Add system message to chat
          setChatMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              type: 'system',
              message: `${data.playerName} joined the game`,
              timestamp: new Date()
            }
          ]);
        }
      });
      
      // Listen for player left event
      onPlayerLeft((data) => {
        if (data.gameId === id) {
          toast.info(`${data.playerName} left the game`);
          fetchGame(); // Refresh game data
          
          // Add system message to chat
          setChatMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              type: 'system',
              message: `${data.playerName} left the game`,
              timestamp: new Date()
            }
          ]);
        }
      });
      
      // Listen for game updated event
      onGameUpdated((data) => {
        if (data.gameId === id) {
          fetchGame(); // Refresh game data
        }
      });
      
      // Listen for game state updates
      onGameStateUpdate((data) => {
        if (data.gameId === id) {
          console.log('Game state update:', data);
          setGameState(data.gameState);
          
          // Check if it's the current user's turn
          if (data.currentTurn) {
            setIsPlayerTurn(data.currentTurn === user.id);
          }
        }
      });
      
      // Listen for game completed event
      onGameCompleted((data) => {
        if (data.gameId === id) {
          console.log('Game completed:', data);
          setGameCompleted(true);
          setWinner(data.winner);
          
          // Add system message to chat
          let winnerMessage = 'The game ended in a draw';
          
          if (data.winner && data.winner !== 'draw') {
            const winnerName = game?.players.find(
              (p: any) => p.user._id === data.winner
            )?.user.name || 'Someone';
            
            winnerMessage = `${winnerName} won the game!`;
          }
          
          setChatMessages(prev => [
            ...prev,
            {
              id: Date.now(),
              type: 'system',
              message: winnerMessage,
              timestamp: new Date()
            }
          ]);
          
          toast.success(winnerMessage);
        }
      });
      
      // Listen for game errors
      onGameError((data) => {
        toast.error(data.message);
      });
      
      // Listen for chat messages
      onChatMessage((data) => {
        setChatMessages(prev => [
          ...prev,
          {
            ...data,
            isCurrentUser: data.userId === user.id
          }
        ]);
      });
      
      // Clean up socket connection and listeners
      return () => {
        leaveGameRoom(id as string);
        removeGameListeners();
      };
    }
  }, [id, token, user, game]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !id) return;
    
    sendChatMessage(id as string, messageInput.trim());
    setMessageInput('');
  };

  const handleGameAction = (action: string, data: any) => {
    if (!id) return;
    
    console.log('Sending game action:', { action, data });
    sendGameAction(id as string, action, data);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout title="Loading Game - Tasenda">
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <MainLayout title="Error - Tasenda">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
              <Link href="/dashboard" className="mt-4 inline-block text-primary-600 hover:text-primary-800">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!game) {
    return (
      <ProtectedRoute>
        <MainLayout title="Game Not Found - Tasenda">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p>Game not found or has been deleted.</p>
              <Link href="/dashboard" className="mt-4 inline-block text-primary-600 hover:text-primary-800">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout title={`${game.title} - Tasenda`}>
        <div className="flex flex-col h-screen">
          {/* Game header */}
          <div className="bg-white border-b p-4 flex justify-between items-center">
            <div className="flex items-center">
              <Link href={`/games/${game._id}`} className="mr-4 text-gray-600 hover:text-gray-900">
                <FaArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold">{game.title}</h1>
                <p className="text-sm text-gray-500">{game.gameType}</p>
              </div>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100"
              >
                {showSidebar ? <FaTimes /> : <FaComments />}
              </button>
              <div className="hidden md:flex items-center">
                <div className="flex -space-x-2 mr-2">
                  {game.players.slice(0, 3).map((player: any) => (
                    <div 
                      key={player.user._id} 
                      className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 border-2 border-white"
                      title={player.user.name}
                    >
                      {player.user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {game.players.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 border-2 border-white">
                      +{game.players.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-600">{game.players.length} players</span>
              </div>
            </div>
          </div>
          
          {/* Game content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Game board */}
            <div className={`flex-1 ${showSidebar ? 'hidden md:block' : 'block'}`}>
              {game.status === 'in-progress' && gameState ? (
                <GameBoard 
                  gameType={game.gameType}
                  gameState={gameState}
                  onAction={handleGameAction}
                  isPlayerTurn={isPlayerTurn}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <div className="text-center max-w-md">
                    <h2 className="text-xl font-bold mb-2">Waiting for Game to Start</h2>
                    <p className="text-gray-600 mb-4">
                      The game is being set up. Please wait a moment...
                    </p>
                    {game.status === 'completed' && (
                      <div className="bg-primary-100 p-4 rounded-lg">
                        <p className="font-medium text-primary-800">
                          This game has ended. You can view the final results or return to the game details.
                        </p>
                        <Link href={`/games/${game._id}`}>
                          <Button
                            variant="primary"
                            className="mt-4"
                          >
                            Return to Game Details
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Sidebar (chat & players) */}
            <div 
              className={`${
                showSidebar ? 'block' : 'hidden md:block'
              } w-full md:w-80 lg:w-96 border-l bg-white flex flex-col`}
            >
              {/* Tabs */}
              <div className="flex border-b">
                <button
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === 'chat' 
                      ? 'text-primary-600 border-b-2 border-primary-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('chat')}
                >
                  <FaComments className="inline mr-2" /> Chat
                </button>
                <button
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === 'players' 
                      ? 'text-primary-600 border-b-2 border-primary-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('players')}
                >
                  <FaUsers className="inline mr-2" /> Players
                </button>
              </div>
              
              {/* Player list */}
              {activeTab === 'players' && (
                <div className="p-4 overflow-y-auto">
                  <h2 className="font-medium mb-3">Players ({game.players.length})</h2>
                  <div className="space-y-3">
                    {game.players.map((player: any) => (
                      <div key={player.user._id} className="flex items-center p-2 rounded-md hover:bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-3">
                          {player.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{player.user.name}</div>
                          <div className="text-xs text-gray-500">
                            {player.role === 'host' ? 'Host' : 'Player'} • Joined {new Date(player.joinedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Chat */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col">
                  {/* Chat messages */}
                  <div 
                    ref={chatContainerRef}
                    className="flex-1 p-4 overflow-y-auto space-y-3"
                  >
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className={`${msg.type === 'system' ? 'text-center' : ''}`}>
                          {msg.type === 'system' ? (
                            <div className="text-xs text-gray-500 py-1">
                              {msg.message}
                            </div>
                          ) : (
                            <div className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] rounded-lg px-3 py-2 ${msg.isCurrentUser ? 'bg-primary-100 text-primary-800' : 'bg-gray-100'}`}>
                                {!msg.isCurrentUser && (
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    {msg.userName}
                                  </div>
                                )}
                                <div className="text-sm break-words">
                                  {msg.message}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Chat input */}
                  <div className="p-3 border-t">
                    <form onSubmit={handleSendMessage} className="flex">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="submit"
                        className="bg-primary-600 text-white px-3 py-2 rounded-r-md hover:bg-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        disabled={!messageInput.trim()}
                      >
                        <FaPaperPlane />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default GamePlay; 