import React, { useState } from 'react';
import Button from '../common/Button';

interface WordGuessBoardProps {
  gameState: any;
  onAction: (action: string, data: any) => void;
  isPlayerTurn: boolean;
}

const WordGuessBoard: React.FC<WordGuessBoardProps> = ({
  gameState,
  onAction,
  isPlayerTurn
}) => {
  const [letterGuess, setLetterGuess] = useState('');
  const [wordGuess, setWordGuess] = useState('');
  const [hint, setHint] = useState('');
  const [activeTab, setActiveTab] = useState('letter'); // 'letter', 'word', or 'hint'
  
  const handleLetterGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterGuess || !isPlayerTurn) return;
    
    onAction('guess-letter', { letter: letterGuess });
    setLetterGuess('');
  };
  
  const handleWordGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordGuess || !isPlayerTurn) return;
    
    onAction('guess-word', { word: wordGuess });
    setWordGuess('');
  };
  
  const handleProvideHint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hint || !isPlayerTurn) return;
    
    onAction('provide-hint', { hint });
    setHint('');
  };
  
  // Calculate remaining attempts
  const remainingAttempts = gameState ? (gameState.maxIncorrectGuesses - gameState.incorrectGuesses) : 6;
  
  // Get display word with spaces
  const displayWord = gameState ? gameState.displayWord.split('').join(' ') : '';
  
  // Get guessed letters
  const guessedLetters = gameState ? gameState.guessedLetters : [];
  
  // Get hints
  const hints = gameState ? gameState.hints : [];
  
  return (
    <div className="flex flex-col items-center justify-center p-4 max-w-3xl mx-auto">
      <div className="w-full mb-8">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold mb-1">Word Guess</h2>
          <p className="text-gray-600">
            {isPlayerTurn ? "It's your turn!" : "Waiting for other player's turn"}
          </p>
        </div>
        
        {/* Game status */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-sm font-medium text-gray-600">Attempts left:</span>
            <span className={`ml-2 font-bold ${remainingAttempts <= 2 ? 'text-red-600' : 'text-green-600'}`}>
              {remainingAttempts}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Letters guessed:</span>
            <span className="ml-2 font-medium">
              {guessedLetters.length > 0 ? guessedLetters.join(', ') : 'None'}
            </span>
          </div>
        </div>
        
        {/* Word display */}
        <div className="bg-gray-100 p-6 rounded-lg text-center mb-6">
          <p className="text-3xl font-mono tracking-widest">
            {displayWord}
          </p>
        </div>
        
        {/* Hints section */}
        {hints.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-blue-800 mb-2">Hints:</h3>
            <ul className="space-y-2">
              {hints.map((hint, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium">{hint.playerName}:</span> {hint.hint}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Game over message */}
        {gameState && gameState.gameOver && (
          <div className={`p-4 rounded-lg text-center mb-6 ${gameState.winner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <h3 className="font-bold text-lg mb-2">
              {gameState.winner ? 'Game Won!' : 'Game Over!'}
            </h3>
            <p>
              {gameState.winner 
                ? `Congratulations! The word was "${gameState.word}".` 
                : `Sorry, you've run out of attempts. The word was "${gameState.word}".`}
            </p>
          </div>
        )}
      </div>
      
      {/* Input section */}
      {!gameState?.gameOver && (
        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="flex border-b mb-4">
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${
                activeTab === 'letter' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('letter')}
            >
              Guess Letter
            </button>
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${
                activeTab === 'word' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('word')}
            >
              Guess Word
            </button>
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${
                activeTab === 'hint' 
                  ? 'text-primary-600 border-b-2 border-primary-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('hint')}
            >
              Provide Hint
            </button>
          </div>
          
          {/* Letter guess form */}
          {activeTab === 'letter' && (
            <form onSubmit={handleLetterGuess} className="mb-4">
              <div className="flex">
                <input
                  type="text"
                  value={letterGuess}
                  onChange={(e) => setLetterGuess(e.target.value.slice(0, 1))}
                  placeholder="Enter a letter"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  maxLength={1}
                  disabled={!isPlayerTurn}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="rounded-l-none"
                  disabled={!isPlayerTurn || !letterGuess}
                >
                  Guess Letter
                </Button>
              </div>
            </form>
          )}
          
          {/* Word guess form */}
          {activeTab === 'word' && (
            <form onSubmit={handleWordGuess} className="mb-4">
              <div className="flex">
                <input
                  type="text"
                  value={wordGuess}
                  onChange={(e) => setWordGuess(e.target.value)}
                  placeholder="Enter the full word"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={!isPlayerTurn}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="rounded-l-none"
                  disabled={!isPlayerTurn || !wordGuess}
                >
                  Guess Word
                </Button>
              </div>
            </form>
          )}
          
          {/* Hint form */}
          {activeTab === 'hint' && (
            <form onSubmit={handleProvideHint} className="mb-4">
              <div className="flex">
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="Provide a hint for other players"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={!isPlayerTurn}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="rounded-l-none"
                  disabled={!isPlayerTurn || !hint}
                >
                  Send Hint
                </Button>
              </div>
            </form>
          )}
          
          {!isPlayerTurn && (
            <div className="text-center text-gray-500 mt-4">
              Wait for your turn to make a guess
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordGuessBoard; 