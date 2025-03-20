import React, { useState } from 'react';
import { useSocket } from '../../../context/SocketContext';
import Button from '../../common/Button';
import { toast } from 'react-hot-toast';
import { FaGamepad } from 'react-icons/fa';

interface TicTacToeSetupProps {
  game: any;
  isHost: boolean;
}

const TicTacToeSetup: React.FC<TicTacToeSetupProps> = ({ game, isHost }) => {
  const { socket, connected } = useSocket();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartGame = () => {
    if (!socket || !connected || !game) {
      toast.error('Cannot connect to server. Please try again.');
      return;
    }
    
    // Check if there are exactly 2 players
    if (game.players.length !== 2) {
      toast.error('Tic Tac Toe requires exactly 2 players');
      return;
    }
    
    try {
      setIsStarting(true);
      console.log('[TICTACTOE] Emitting start-game event for game:', game._id);
      
      // Emit the start-game event
      socket.emit('tictactoe:start-game', { gameId: game._id });
      
      // Add listeners for responses
      socket.once('tictactoe:start-game-success', (data) => {
        console.log('[TICTACTOE] Game started successfully:', data);
        toast.success('Game started successfully!');
        setIsStarting(false);
      });
      
      socket.once('game-error', (error) => {
        console.error('[TICTACTOE] Game start error:', error);
        toast.error(error.message || 'Failed to start game');
        setIsStarting(false);
      });
      
      // Add a timeout to prevent the button from being stuck in loading state
      setTimeout(() => {
        setIsStarting(false);
      }, 5000);
    } catch (error) {
      console.error('[TICTACTOE] Error starting game:', error);
      toast.error('An error occurred while starting the game');
      setIsStarting(false);
    }
  };

  // Only show the setup if the game is in waiting status
  if (game.status !== 'waiting') {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-bold mb-4 text-center">Tic Tac Toe</h2>
      
      <div className="mb-6">
        <h3 className="font-medium mb-2">Game Rules:</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>Players take turns marking X and O on a 3×3 grid</li>
          <li>The first player to get 3 of their marks in a row (horizontally, vertically, or diagonally) wins the round</li>
          <li>If all 9 squares are filled and no player has 3 marks in a row, the round ends in a draw</li>
          <li>The game consists of multiple rounds (default: 5)</li>
          <li>The player with the most round wins at the end is the overall winner</li>
        </ul>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium mb-2">Players ({game.players.length}/2):</h3>
        {game.players.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No players have joined yet</p>
        ) : (
          <ul className="space-y-2">
            {game.players.map((player: any) => (
              <li key={player.user._id} className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span>{player.user.name}</span>
                {player.user._id === game.creator._id && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Host</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {isHost ? (
        <div>
          <Button
            variant="primary"
            onClick={handleStartGame}
            isLoading={isStarting}
            disabled={isStarting || game.players.length !== 2}
            className="w-full"
          >
            <FaGamepad className="mr-2" />
            {game.players.length === 2 ? 'Start Game' : 'Waiting for Players...'}
          </Button>
          
          {game.players.length !== 2 && (
            <p className="text-sm text-center mt-2 text-amber-600">
              Need exactly 2 players to start (currently {game.players.length})
            </p>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 p-4 rounded text-center">
          <p className="text-blue-800">
            Waiting for the host to start the game...
          </p>
        </div>
      )}
    </div>
  );
};

export default TicTacToeSetup; 