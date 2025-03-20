import React, { useState } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import { createGame } from '../../services/game.service';
import toast from 'react-hot-toast';
import { FaGamepad, FaChess, FaRegLightbulb, FaDice } from 'react-icons/fa';

const CreateGame = () => {
  const { user, token } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [gameType, setGameType] = useState('word-guess');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a game title');
      return;
    }
    
    if (!gameType) {
      toast.error('Please select a game type');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Log the data being sent
      console.log('Submitting game data:', {
        title,
        description,
        gameType,
        maxPlayers
      });
      
      const response = await createGame({
        title,
        description,
        gameType,
        maxPlayers
      }, token as string);
      
      if (response.success && response.data) {
        toast.success('Game created successfully!');
        router.push(`/games/${response.data.game._id}`);
      } else {
        toast.error(response.message || 'Failed to create game');
      }
    } catch (err) {
      console.error('Error creating game:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const gameTypes = [
    {
      id: 'word-guess',
      name: 'Word Guess',
      icon: <FaRegLightbulb className="text-yellow-500" />,
      description: 'Players try to guess a word based on hints provided by the host.'
    },
    {
      id: 'tic-tac-toe',
      name: 'Tic Tac Toe',
      icon: <FaChess className="text-blue-500" />,
      description: 'Classic game of X and O on a 3x3 grid.'
    },
    {
      id: 'trivia',
      name: 'Trivia',
      icon: <FaGamepad className="text-green-500" />,
      description: 'Test your knowledge with fun trivia questions.'
    }
  ];

  return (
    <ProtectedRoute>
      <MainLayout title="Create New Game - Tasenda">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Create New Game</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Game Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Game Title*
                  </label>
                  <InputField
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for your game"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your game (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Players
                  </label>
                  <select
                    id="maxPlayers"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>{num} players</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Game Type</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameTypes.map(type => (
                  <div 
                    key={type.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      type.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : gameType === type.id
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'hover:border-primary-300 hover:bg-gray-50'
                    }`}
                    onClick={() => !type.disabled && setGameType(type.id)}
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                        {type.icon}
                      </div>
                      <h3 className="font-medium">{type.name}</h3>
                      {type.disabled && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                className="px-8"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Create Game
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default CreateGame; 