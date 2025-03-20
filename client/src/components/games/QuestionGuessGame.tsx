import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import Button from '../common/Button';
import { FaCheck, FaTimes, FaQuestion, FaLightbulb, FaTrophy, FaHistory } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const QuestionGuessGame = ({ game, user }) => {
  const { socket } = useSocket();
  const [secretWord, setSecretWord] = useState('');
  const [hints, setHints] = useState(['', '']);
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isGuesser, setIsGuesser] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Log the game state whenever it changes
    console.log('[GAME] Game state updated:', game.gameState);
    console.log('[GAME] Current phase:', game.gameState?.phase);
    console.log('[GAME] Word selector:', game.gameState?.wordSelector);
    console.log('[GAME] Guesser:', game.gameState?.guesser);
    console.log('[GAME] Current turn:', game.gameState?.currentTurn);
    
    // Check if the game state is valid
    if (!game.gameState || !game.gameState.phase) {
      console.error('[GAME] Invalid game state:', game.gameState);
      return;
    }
    
    // Update local state based on game state
    setSecretWord(game.gameState.secretWord || '');
    setHints(game.gameState.hints || ['', '']);
    
    // Check if it's the current user's turn
    const isMyTurn = game.gameState.currentTurn === user.id;
    const isGuesser = game.gameState.guesser === user.id;
    console.log('[GAME] Is my turn:', isMyTurn, 'Is guesser:', isGuesser);
    
    // If the game is in word-selection phase and I'm the word selector, show the word selection form
    if (game.gameState.phase === 'word-selection' && game.gameState.wordSelector === user.id) {
      console.log('[GAME] I am the word selector, showing word selection form');
    }
    
    // If the game is in questioning phase and I'm the guesser, show the question form
    if (game.gameState.phase === 'questioning' && game.gameState.guesser === user.id) {
      console.log('[GAME] I am the guesser, showing question form');
    }
  }, [game.gameState, user.id]);

  useEffect(() => {
    if (!socket || !game || !user) {
      console.log('[GAME] Socket, game, or user missing for event setup');
      return;
    }

    console.log('[GAME] Setting up question-guess socket events for game:', game._id);

    // Listen for game updates
    socket.on('game-updated', (data) => {
      console.log('[GAME] Game updated in QuestionGuessGame:', data);
      // The game state will be updated by the parent component
    });

    // Set up socket listeners with better logging
    socket.on('question-guess:word-submitted', (data) => {
      console.log('[GAME] Word submitted:', data);
      if (data.success) {
        toast.success('Word submitted successfully!');
        // Clear inputs after successful submission
        setSecretWord('');
        setHints(['', '']);
      } else {
        toast.error(data.message);
      }
    });

    socket.on('question-guess:question-submitted', (data) => {
      console.log('[GAME] Question submitted:', data);
      if (data.success) {
        toast.success('Question submitted!');
        // Clear question input after successful submission
        setQuestion('');
      } else {
        toast.error(data.message);
      }
    });

    socket.on('question-guess:question-answered', (data) => {
      console.log('[GAME] Question answered:', data);
      if (data.success) {
        toast.success('Question answered!');
      } else {
        toast.error(data.message);
      }
    });

    socket.on('question-guess:guess-submitted', (data) => {
      console.log('[GAME] Guess submitted:', data);
      if (data.success) {
        toast.success(data.isCorrect ? 'Correct guess!' : 'Incorrect guess!');
        // Clear guess input after successful submission
        setGuess('');
      } else {
        toast.error(data.message);
      }
    });

    return () => {
      console.log('[GAME] Cleaning up question-guess socket events');
      socket.off('game-updated');
      socket.off('question-guess:word-submitted');
      socket.off('question-guess:question-submitted');
      socket.off('question-guess:question-answered');
      socket.off('question-guess:guess-submitted');
    };
  }, [socket, game, user]);

  const handleSubmitWord = () => {
    if (!socket) {
      toast.error('Socket connection not available');
      return;
    }

    if (!secretWord.trim()) {
      toast.error('Please enter a secret word');
      return;
    }

    if (!hints[0].trim() || !hints[1].trim()) {
      toast.error('Please provide both hints');
      return;
    }

    console.log('[GAME] Submitting word:', { gameId: game._id, word: secretWord, hints });
    socket.emit('question-guess:submit-word', {
      gameId: game._id,
      word: secretWord,
      hints
    });
    
    // Don't clear inputs here, wait for server confirmation
  };

  const handleSubmitQuestion = () => {
    if (!socket) {
      toast.error('Socket connection not available');
      return;
    }

    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    console.log('[GAME] Submitting question:', { gameId: game._id, question });
    socket.emit('question-guess:submit-question', {
      gameId: game._id,
      question: question.trim()
    });
    
    // Don't clear input here, wait for server confirmation
  };

  const handleAnswerQuestion = (questionId, answer) => {
    if (!socket) {
      toast.error('Socket connection not available');
      return;
    }

    console.log('[GAME] Answering question:', { gameId: game._id, questionId, answer });
    socket.emit('question-guess:answer-question', {
      gameId: game._id,
      questionId,
      answer
    });
  };

  const handleSubmitGuess = () => {
    if (!socket) {
      toast.error('Socket connection not available');
      return;
    }

    if (!guess.trim()) {
      toast.error('Please enter a guess');
      return;
    }

    console.log('[GAME] Submitting guess:', { gameId: game._id, guess });
    socket.emit('question-guess:submit-guess', {
      gameId: game._id,
      guess: guess.trim()
    });
    
    // Don't clear input here, wait for server confirmation
  };

  const handleWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socket || !secretWord || !hints[0] || !hints[1]) {
      return;
    }
    
    console.log('[GAME] Submitting word:', secretWord, 'with hints:', hints);
    
    // Emit the word submission event
    socket.emit('question-guess:submit-word', {
      gameId: game._id,
      word: secretWord,
      hints: hints
    });
    
    toast.success('Word submitted successfully!');
  };

  const renderGameInfo = () => {
    const wordSelectorPlayer = game.players.find(p => p.user._id === game.gameState.wordSelector);
    const guesserPlayer = game.players.find(p => p.user._id === game.gameState.guesser);
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <h3 className="font-medium mb-3">Game Info</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Round:</p>
            <p className="font-medium">{game.gameState.currentRound} of {game.gameState.rounds}</p>
          </div>
          
          <div>
            <p className="text-gray-600">Phase:</p>
            <p className="font-medium capitalize">{game.gameState.phase.replace('-', ' ')}</p>
          </div>
          
          <div>
            <p className="text-gray-600">Word Selector:</p>
            <p className="font-medium">{wordSelectorPlayer ? wordSelectorPlayer.user.name : 'Not assigned'}</p>
          </div>
          
          <div>
            <p className="text-gray-600">Guesser:</p>
            <p className="font-medium">{guesserPlayer ? guesserPlayer.user.name : 'Not assigned'}</p>
          </div>
        </div>
        
        {/* Show scores if available */}
        {game.gameState.scores && Object.keys(game.gameState.scores).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Scores:</h4>
            <div className="space-y-1">
              {Object.entries(game.gameState.scores).map(([playerId, score]) => {
                const player = game.players.find(p => p.user._id === playerId);
                return (
                  <div key={playerId} className="flex justify-between">
                    <span>{player ? player.user.name : 'Unknown'}</span>
                    <span className="font-medium">{score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGameContent = () => {
    if (game.gameState.phase === 'results') {
      return renderResultsPhase();
    }
    
    if (game.gameState.phase === 'word-selection') {
      return renderWordSelectionPhase();
    }
    
    if (game.gameState.phase === 'questioning' || game.gameState.phase === 'guessing') {
      return renderQuestioningPhase();
    }
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-medium mb-4">Waiting for Game to Start</h3>
        <p className="text-gray-600">
          The game is being set up. Please wait a moment...
        </p>
      </div>
    );
  };

  const renderResultsPhase = () => {
    if (game.gameState.phase !== 'results') return null;
    
    // Calculate winner
    const scores = game.gameState.scores;
    const highestScore = Math.max(...Object.values(scores));
    const winners = Object.entries(scores)
      .filter(([_, score]) => score === highestScore)
      .map(([playerId, _]) => {
        const player = game.players.find(p => p.user._id === playerId);
        return player ? player.user.name : 'Unknown';
      });
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <h3 className="font-medium mb-3">Game Results</h3>
        
        <div className="p-4 bg-green-50 rounded-md mb-4">
          <h4 className="font-medium text-green-800 mb-2">
            {winners.length > 1
              ? `It's a tie between ${winners.join(' and ')}!`
              : `${winners[0]} wins!`}
          </h4>
          <p className="text-sm text-green-700">
            Final score: {highestScore} points
          </p>
        </div>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Final Scores:</h4>
          <div className="space-y-2">
            {Object.entries(scores)
              .sort(([_, scoreA], [__, scoreB]) => scoreB - scoreA)
              .map(([playerId, score]) => {
                const player = game.players.find(p => p.user._id === playerId);
                return (
                  <div key={playerId} className="flex justify-between p-2 bg-gray-50 rounded-md">
                    <span>{player ? player.user.name : 'Unknown'}</span>
                    <span className="font-medium">{score}</span>
                  </div>
                );
              })}
          </div>
        </div>
        
        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full"
          >
            {showHistory ? 'Hide Game History' : 'Show Game History'}
          </Button>
        </div>
        
        {showHistory && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Game History:</h4>
            <div className="space-y-4">
              {game.gameState.roundHistory.map((round, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md">
                  <h5 className="font-medium mb-2">Round {round.round}</h5>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Secret Word:</span> {round.secretWord}</div>
                    <div><span className="font-medium">Hints:</span> {round.hints.join(', ')}</div>
                    <div><span className="font-medium">Questions:</span> {round.questions.length}</div>
                    <div><span className="font-medium">Guesses:</span> {round.guesses.length}</div>
                    <div><span className="font-medium">Points:</span> {round.points}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWordSelectionPhase = () => {
    if (game.gameState.phase !== 'word-selection') return null;
    
    // Check if the current user is the word selector
    const isWordSelector = user?.id === game.gameState.wordSelector;
    
    if (isWordSelector) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <h3 className="font-medium mb-3">Select a Secret Word</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose a word for the other player to guess. Also provide two hints that will help them.
          </p>
          
          <form onSubmit={handleWordSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secret Word
              </label>
              <input
                type="text"
                value={secretWord}
                onChange={(e) => setSecretWord(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter a word"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hint #1
              </label>
              <input
                type="text"
                value={hints[0]}
                onChange={(e) => {
                  const newHints = [...hints];
                  newHints[0] = e.target.value;
                  setHints(newHints);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="First hint"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hint #2
              </label>
              <input
                type="text"
                value={hints[1]}
                onChange={(e) => {
                  const newHints = [...hints];
                  newHints[1] = e.target.value;
                  setHints(newHints);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Second hint"
                required
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={!secretWord || !hints[0] || !hints[1]}
              >
                Submit Word
              </Button>
            </div>
          </form>
        </div>
      );
    } else {
      // For the guesser or other players
      return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <h3 className="font-medium mb-2">Word Selection Phase</h3>
          <p className="text-sm text-gray-600">
            Waiting for {game.players.find(p => p.user._id === game.gameState.wordSelector)?.user.name} to select a word...
          </p>
          <div className="mt-3 flex items-center justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="h-3 w-3 bg-primary-400 rounded-full"></div>
              <div className="h-3 w-3 bg-primary-400 rounded-full"></div>
              <div className="h-3 w-3 bg-primary-400 rounded-full"></div>
            </div>
          </div>
        </div>
      );
    }
  };

  const renderQuestioningPhase = () => {
    if (game.gameState.phase !== 'questioning') return null;
    
    const questions = game.gameState.questions || [];
    const questionsLeft = 5 - questions.length;
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <h3 className="font-medium mb-3">Questioning Phase</h3>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Secret Word Hints:</h4>
          <div className="space-y-2">
            {game.gameState.hints.map((hint, index) => (
              <div key={index} className="flex items-start p-2 bg-yellow-50 rounded-md">
                <FaLightbulb className="text-yellow-500 mt-1 mr-2" />
                <p className="text-sm text-yellow-800">{hint}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Questions list */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Questions ({questionsLeft} remaining):</h4>
          <div className="space-y-2">
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No questions asked yet.</p>
            ) : (
              questions.map((q, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded-md">
                  <div className="flex items-start">
                    <FaQuestion className="text-blue-500 mt-1 mr-2" />
                    <div className="flex-1">
                      <p className="text-sm">{q.text}</p>
                      {q.answer !== null ? (
                        <p className={`text-sm mt-1 ${q.answer ? 'text-green-600' : 'text-red-600'}`}>
                          Answer: {q.answer ? 'Yes' : 'No'}
                        </p>
                      ) : (
                        isMyTurn && !isGuesser && (
                          <div className="mt-2 flex space-x-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleAnswerQuestion(q.id, true)}
                              className="text-xs px-2 py-1"
                            >
                              Yes
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleAnswerQuestion(q.id, false)}
                              className="text-xs px-2 py-1"
                            >
                              No
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Ask question form (only for guesser) */}
        {isMyTurn && isGuesser && questionsLeft > 0 && (
          <div className="mt-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
              Ask a Question (Yes/No only)
            </label>
            <div className="flex">
              <input
                type="text"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Type your question..."
              />
              <Button
                variant="primary"
                onClick={handleSubmitQuestion}
                disabled={!question.trim()}
                className="rounded-l-none"
              >
                Ask
              </Button>
            </div>
          </div>
        )}
        
        {/* Make a guess button (only for guesser) */}
        {isMyTurn && isGuesser && (
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => socket.emit('question-guess:ready-to-guess', { gameId: game._id })}
              className="w-full"
            >
              Ready to Guess
            </Button>
          </div>
        )}
        
        {/* Waiting message for word selector */}
        {!isMyTurn && !isGuesser && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              Waiting for the guesser to ask questions...
            </p>
          </div>
        )}
        
        {/* Waiting message for guesser when it's not their turn */}
        {!isMyTurn && isGuesser && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              Waiting for the word selector to answer your question...
            </p>
          </div>
        )}
      </div>
    );
  };

  // Add this function to check if roles are properly assigned
  const areRolesAssigned = () => {
    return (
      game.gameState &&
      game.gameState.wordSelector &&
      game.gameState.guesser &&
      game.gameState.currentTurn &&
      game.gameState.phase !== 'waiting'
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {!areRolesAssigned() ? (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <h3 className="font-medium mb-3">Game Not Started</h3>
          <div className="p-3 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-800">
              Waiting for more players or for the server to assign roles...
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              {game.players.length < 2 
                ? `Need at least 2 players to start (currently ${game.players.length})`
                : "The host needs to start the game"}
            </p>
          </div>
          
          {/* Add debugging info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-500">
            <p>Debug Info:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>Game Status: {game.status}</li>
              <li>Phase: {game.gameState?.phase}</li>
              <li>Word Selector: {game.gameState?.wordSelector || 'Not assigned'}</li>
              <li>Guesser: {game.gameState?.guesser || 'Not assigned'}</li>
              <li>Current Turn: {game.gameState?.currentTurn || 'Not assigned'}</li>
              <li>Your ID: {user?.id}</li>
              <li>Players: {game.players.length}</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          {renderGameInfo()}
          {renderWordSelectionPhase()}
          {renderQuestioningPhase()}
          {renderResultsPhase()}
        </>
      )}
    </div>
  );
};

export default QuestionGuessGame; 