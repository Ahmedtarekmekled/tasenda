import React from 'react';
import { motion } from 'framer-motion';

interface GameBoardProps {
  gameType: string;
  gameState: any;
  onAction: (action: string, data: any) => void;
  isPlayerTurn: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameType,
  gameState,
  onAction,
  isPlayerTurn
}) => {
  // Render different game boards based on game type
  const renderGameBoard = () => {
    switch (gameType) {
      case 'word-guess':
        return <WordGuessBoard gameState={gameState} onAction={onAction} isPlayerTurn={isPlayerTurn} />;
      case 'trivia':
        return <TriviaBoard gameState={gameState} onAction={onAction} isPlayerTurn={isPlayerTurn} />;
      case 'tic-tac-toe':
        return <TicTacToeBoard gameState={gameState} onAction={onAction} isPlayerTurn={isPlayerTurn} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              Game type not supported or game not started yet.
            </p>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full"
    >
      {renderGameBoard()}
    </motion.div>
  );
};

// Word Guess Game Board
const WordGuessBoard: React.FC<{
  gameState: any;
  onAction: (action: string, data: any) => void;
  isPlayerTurn: boolean;
}> = ({ gameState, onAction, isPlayerTurn }) => {
  const [guess, setGuess] = React.useState('');

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim() && isPlayerTurn) {
      onAction('submit-guess', { guess: guess.trim() });
      setGuess('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-medium mb-2">Current Word</h3>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {gameState?.currentWord?.split('').map((char: string, index: number) => (
              <div 
                key={index} 
                className="w-8 h-10 md:w-10 md:h-12 flex items-center justify-center border-2 border-gray-300 rounded-md text-xl font-bold"
              >
                {char === '_' ? '' : char}
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Hints</h3>
            <ul className="list-disc list-inside text-gray-700">
              {gameState?.hints?.map((hint: string, index: number) => (
                <li key={index}>{hint}</li>
              ))}
            </ul>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Previous Guesses</h3>
            <div className="flex flex-wrap gap-2">
              {gameState?.previousGuesses?.map((guess: string, index: number) => (
                <span 
                  key={index} 
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    gameState.correctGuesses?.includes(guess) 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {guess}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t">
        <form onSubmit={handleSubmitGuess} className="flex gap-2">
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder={isPlayerTurn ? "Enter your guess..." : "Waiting for your turn..."}
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            disabled={!isPlayerTurn}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-md font-medium ${
              isPlayerTurn 
                ? 'bg-primary-600 text-white hover:bg-primary-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!isPlayerTurn || !guess.trim()}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

// Trivia Game Board
const TriviaBoard: React.FC<{
  gameState: any;
  onAction: (action: string, data: any) => void;
  isPlayerTurn: boolean;
}> = ({ gameState, onAction, isPlayerTurn }) => {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h3 className="text-lg font-medium mb-4">Question</h3>
        <p className="text-gray-800 mb-6">{gameState?.currentQuestion?.question}</p>
        
        <div className="space-y-3">
          {gameState?.currentQuestion?.options.map((option: string, index: number) => (
            <button
              key={index}
              className={`w-full text-left p-3 rounded-md border ${
                gameState?.selectedAnswer === index
                  ? 'bg-primary-100 border-primary-500'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => isPlayerTurn && onAction('select-answer', { answerIndex: index })}
              disabled={!isPlayerTurn}
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          ))}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            className={`px-4 py-2 rounded-md font-medium ${
              isPlayerTurn && gameState?.selectedAnswer !== undefined
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={() => isPlayerTurn && gameState?.selectedAnswer !== undefined && 
              onAction('submit-answer', { answerIndex: gameState.selectedAnswer })}
            disabled={!isPlayerTurn || gameState?.selectedAnswer === undefined}
          >
            Submit Answer
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-medium mb-2">Score</h3>
        <div className="grid grid-cols-2 gap-4">
          {gameState?.players?.map((player: any) => (
            <div key={player.id} className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-2">
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium">{player.name}</div>
                <div className="text-xs text-gray-500">{player.score} points</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Tic-Tac-Toe Game Board
const TicTacToeBoard: React.FC<{
  gameState: any;
  onAction: (action: string, data: any) => void;
  isPlayerTurn: boolean;
}> = ({ gameState, onAction, isPlayerTurn }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-medium">
          {isPlayerTurn ? "Your Turn" : "Opponent's Turn"}
        </h3>
        <p className="text-sm text-gray-500">
          You are playing as {gameState?.playerSymbol || 'X'}
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <button
            key={index}
            className={`w-20 h-20 md:w-24 md:h-24 flex items-center justify-center text-3xl md:text-4xl font-bold border-2 border-gray-300 rounded-md ${
              isPlayerTurn && !gameState?.board[index] ? 'hover:bg-gray-100' : ''
            }`}
            onClick={() => isPlayerTurn && !gameState?.board[index] && onAction('make-move', { position: index })}
            disabled={!isPlayerTurn || !!gameState?.board[index]}
          >
            {gameState?.board[index]}
          </button>
        ))}
      </div>
      
      {gameState?.winner && (
        <div className="text-center p-4 bg-primary-100 rounded-md">
          <h3 className="text-lg font-medium text-primary-800">
            {gameState.winner === 'draw' 
              ? "It's a draw!" 
              : gameState.winner === gameState?.playerSymbol 
                ? "You won!" 
                : "You lost!"}
          </h3>
        </div>
      )}
    </div>
  );
};

export default GameBoard; 