import React, { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import Button from '../../common/Button';
import InputField from '../../common/InputField';
import { motion } from 'framer-motion';
import { FaLightbulb, FaQuestion, FaCheck, FaTimes } from 'react-icons/fa';

const GameBoard = () => {
  const { 
    gameState, 
    isHost, 
    submitGuess, 
    submitHint, 
    startRound, 
    endRound 
  } = useGame();
  
  const [guess, setGuess] = useState('');
  const [hint, setHint] = useState('');

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      submitGuess(guess.trim());
      setGuess('');
    }
  };

  const handleHintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hint.trim()) {
      submitHint(hint.trim());
      setHint('');
    }
  };

  // Waiting to start
  if (gameState.status === 'waiting') {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-6">Waiting to Start</h2>
        {isHost && (
          <Button 
            onClick={startRound} 
            variant="primary"
            className="px-8"
          >
            Start Game
          </Button>
        )}
        {!isHost && (
          <p className="text-gray-600">Waiting for the host to start the game...</p>
        )}
      </div>
    );
  }

  // Round ended
  if (gameState.status === 'round-end') {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Round {gameState.currentRound} Ended!</h2>
        <p className="text-lg mb-6">
          The word was: <span className="font-bold text-primary-600">{gameState.word}</span>
        </p>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6 max-w-md mx-auto">
          <h3 className="font-bold text-lg mb-3">Current Scores</h3>
          <div className="space-y-2">
            {Object.entries(gameState.scores).map(([playerId, score]: [string, any]) => (
              <div key={playerId} className="flex justify-between items-center">
                <span>{score.name}</span>
                <span className="font-bold">{score.points} points</span>
              </div>
            ))}
          </div>
        </div>
        
        {isHost && (
          <Button 
            onClick={startRound} 
            variant="primary"
            className="px-8"
          >
            Start Next Round
          </Button>
        )}
        {!isHost && (
          <p className="text-gray-600">Waiting for the host to start the next round...</p>
        )}
      </div>
    );
  }

  // Game ended
  if (gameState.status === 'game-end') {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
        
        <div className="bg-primary-50 rounded-lg p-6 mb-6 max-w-md mx-auto">
          <h3 className="font-bold text-lg mb-3">Final Scores</h3>
          <div className="space-y-2">
            {Object.entries(gameState.scores)
              .sort(([, a]: [string, any], [, b]: [string, any]) => b.points - a.points)
              .map(([playerId, score]: [string, any], index) => (
                <div 
                  key={playerId} 
                  className={`flex justify-between items-center p-2 rounded ${index === 0 ? 'bg-yellow-100' : ''}`}
                >
                  <span>{index === 0 ? '🏆 ' : ''}{score.name}</span>
                  <span className="font-bold">{score.points} points</span>
                </div>
              ))
            }
          </div>
        </div>
        
        <Button 
          onClick={() => window.location.href = '/dashboard'} 
          variant="primary"
          className="px-8"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // In progress - Host view
  if (isHost) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Round {gameState.currentRound}</h2>
            <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full">
              You are the Host
            </span>
          </div>
          <p className="text-lg mb-2">
            The word is: <span className="font-bold text-primary-600">{gameState.word}</span>
          </p>
          <p className="text-sm text-gray-600">
            Provide hints to help players guess the word!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center">
              <FaLightbulb className="text-yellow-500 mr-2" /> Hints
            </h3>
            {gameState.hints.length === 0 ? (
              <p className="text-gray-500 italic">No hints provided yet</p>
            ) : (
              <ul className="space-y-2">
                {gameState.hints.map((hint: string, index: number) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 bg-yellow-50 rounded"
                  >
                    {hint}
                  </motion.li>
                ))}
              </ul>
            )}
            
            <form onSubmit={handleHintSubmit} className="mt-4">
              <div className="flex gap-2">
                <InputField
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="Enter a hint..."
                  className="flex-grow"
                />
                <Button type="submit" variant="primary" disabled={!hint.trim()}>
                  Send
                </Button>
              </div>
            </form>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center">
              <FaQuestion className="text-blue-500 mr-2" /> Guesses
            </h3>
            {gameState.guesses.length === 0 ? (
              <p className="text-gray-500 italic">No guesses yet</p>
            ) : (
              <ul className="space-y-2">
                {gameState.guesses.map((guessData: any, index: number) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-2 rounded flex justify-between items-center ${
                      guessData.guess.toLowerCase() === gameState.word.toLowerCase() 
                        ? 'bg-green-100' 
                        : 'bg-gray-100'
                    }`}
                  >
                    <span>
                      <span className="font-medium">{guessData.playerName}:</span> {guessData.guess}
                    </span>
                    {guessData.guess.toLowerCase() === gameState.word.toLowerCase() ? (
                      <FaCheck className="text-green-500" />
                    ) : (
                      <FaTimes className="text-red-500" />
                    )}
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="text-center mt-8">
          <Button 
            onClick={endRound} 
            variant="outline"
            className="px-8"
          >
            End Round
          </Button>
        </div>
      </div>
    );
  }

  // In progress - Player view
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-primary-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Round {gameState.currentRound}</h2>
          <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full">
            Your turn to guess!
          </span>
        </div>
        <p className="text-lg">
          Try to guess the word based on the hints!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center">
            <FaLightbulb className="text-yellow-500 mr-2" /> Hints
          </h3>
          {gameState.hints.length === 0 ? (
            <p className="text-gray-500 italic">Waiting for hints from the host...</p>
          ) : (
            <ul className="space-y-2">
              {gameState.hints.map((hint: string, index: number) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2 bg-yellow-50 rounded"
                >
                  {hint}
                </motion.li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center">
            <FaQuestion className="text-blue-500 mr-2" /> Your Guesses
          </h3>
          {gameState.guesses.filter((g: any) => g.playerId === gameState.currentPlayerId).length === 0 ? (
            <p className="text-gray-500 italic">You haven't made any guesses yet</p>
          ) : (
            <ul className="space-y-2">
              {gameState.guesses
                .filter((g: any) => g.playerId === gameState.currentPlayerId)
                .map((guessData: any, index: number) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 bg-gray-100 rounded"
                  >
                    {guessData.guess}
                  </motion.li>
                ))}
            </ul>
          )}
          
          <form onSubmit={handleGuessSubmit} className="mt-4">
            <div className="flex gap-2">
              <InputField
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Enter your guess..."
                className="flex-grow"
              />
              <Button type="submit" variant="primary" disabled={!guess.trim()}>
                Guess
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 mt-6">
        <h3 className="font-bold text-lg mb-3">All Guesses</h3>
        {gameState.guesses.length === 0 ? (
          <p className="text-gray-500 italic">No guesses yet</p>
        ) : (
          <ul className="space-y-2">
            {gameState.guesses.map((guessData: any, index: number) => (
              <motion.li 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2 bg-gray-100 rounded"
              >
                <span className="font-medium">{guessData.playerName}:</span> {guessData.guess}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default GameBoard; 