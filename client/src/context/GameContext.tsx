import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import { getGameById } from '../services/game.service';
import { 
  initializeSocket, 
  joinGameRoom, 
  leaveGameRoom, 
  sendGameAction 
} from '../services/socket.service';
import toast from 'react-hot-toast';

interface GameContextProps {
  gameData: any;
  gameState: any;
  isLoading: boolean;
  error: string | null;
  isHost: boolean;
  currentPlayerId: string | null;
  submitGuess: (guess: string) => void;
  submitHint: (hint: string) => void;
  startRound: () => void;
  endRound: () => void;
  refreshGameData: () => Promise<void>;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
  gameId: string;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children, gameId }) => {
  const { user, token } = useAuth();
  const router = useRouter();
  const [gameData, setGameData] = useState<any>(null);
  const [gameState, setGameState] = useState<any>({
    currentRound: 0,
    rounds: [],
    currentTurn: null,
    scores: {},
    status: 'waiting',
    word: '',
    hints: [],
    guesses: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if current user is the host
  const isHost = gameData?.creator?._id === user?.id;
  const currentPlayerId = user?.id || null;

  // Fetch initial game data
  useEffect(() => {
    if (!gameId || !token) return;
    
    const fetchGameData = async () => {
      try {
        setIsLoading(true);
        const response = await getGameById(gameId, token);
        
        if (response.success && response.data) {
          setGameData(response.data.game);
          
          // Initialize game state from gameData if it exists
          if (response.data.game.gameData) {
            setGameState(response.data.game.gameData);
          }
        } else {
          setError(response.message || 'Failed to load game');
          toast.error(response.message || 'Failed to load game');
        }
      } catch (err) {
        console.error('Error fetching game:', err);
        setError('An unexpected error occurred');
        toast.error('Failed to load game details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();
  }, [gameId, token]);

  // Set up socket connection
  useEffect(() => {
    if (!gameId || !token || !gameData) return;

    const socket = initializeSocket(token);
    
    // Join the game room
    joinGameRoom(gameId);

    // Listen for game updates
    socket.on('game-update', (data) => {
      if (data.action === 'game-state-updated') {
        setGameState(data.data.gameState);
        toast.success('Game state updated');
      } else if (data.action === 'new-round') {
        setGameState(prev => ({
          ...prev,
          currentRound: data.data.roundNumber,
          currentTurn: data.data.currentTurn,
          word: isHost || data.data.currentTurn === user?.id ? data.data.word : '',
          hints: [],
          guesses: []
        }));
        toast.success(`Round ${data.data.roundNumber} started!`);
      } else if (data.action === 'new-hint') {
        setGameState(prev => ({
          ...prev,
          hints: [...prev.hints, data.data.hint]
        }));
        toast.info('New hint received!');
      } else if (data.action === 'new-guess') {
        setGameState(prev => ({
          ...prev,
          guesses: [...prev.guesses, data.data.guess]
        }));
      } else if (data.action === 'correct-guess') {
        setGameState(prev => ({
          ...prev,
          scores: data.data.scores,
          status: 'round-end'
        }));
        toast.success(`${data.data.playerName} guessed correctly!`);
      } else if (data.action === 'round-end') {
        setGameState(prev => ({
          ...prev,
          status: 'round-end',
          scores: data.data.scores
        }));
        toast.info('Round ended!');
      } else if (data.action === 'game-end') {
        setGameState(prev => ({
          ...prev,
          status: 'game-end',
          scores: data.data.scores,
          winner: data.data.winner
        }));
        toast.success('Game ended!');
      }
    });

    // Cleanup function
    return () => {
      leaveGameRoom(gameId);
    };
  }, [gameId, token, gameData, user?.id, isHost]);

  // Refresh game data
  const refreshGameData = async () => {
    if (!gameId || !token) return;
    
    try {
      const response = await getGameById(gameId, token);
      if (response.success && response.data) {
        setGameData(response.data.game);
        
        // Update game state if it exists in the response
        if (response.data.game.gameData) {
          setGameState(response.data.game.gameData);
        }
      }
    } catch (err) {
      console.error('Error refreshing game data:', err);
    }
  };

  // Game actions
  const submitGuess = (guess: string) => {
    if (!gameId || gameState.status !== 'in-progress') return;
    
    sendGameAction(gameId, 'submit-guess', {
      playerId: user?.id,
      playerName: user?.name,
      guess,
      timestamp: new Date().toISOString()
    });
  };

  const submitHint = (hint: string) => {
    if (!gameId || gameState.status !== 'in-progress' || !isHost) return;
    
    sendGameAction(gameId, 'submit-hint', {
      hint,
      timestamp: new Date().toISOString()
    });
  };

  const startRound = () => {
    if (!gameId || !isHost) return;
    
    sendGameAction(gameId, 'start-round', {
      roundNumber: gameState.currentRound + 1
    });
  };

  const endRound = () => {
    if (!gameId || !isHost) return;
    
    sendGameAction(gameId, 'end-round', {
      roundNumber: gameState.currentRound
    });
  };

  const value = {
    gameData,
    gameState,
    isLoading,
    error,
    isHost,
    currentPlayerId,
    submitGuess,
    submitHint,
    startRound,
    endRound,
    refreshGameData
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}; 