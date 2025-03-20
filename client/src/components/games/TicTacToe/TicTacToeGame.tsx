import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { FaTrophy, FaRedo } from "react-icons/fa";

interface TicTacToeGameProps {
  game: any;
  socket: any;
  connected: boolean;
  user: any;
}

const TicTacToeGame: React.FC<TicTacToeGameProps> = ({
  game,
  socket,
  connected,
  user,
}) => {
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [mySymbol, setMySymbol] = useState("");
  const [localGameState, setLocalGameState] = useState(
    game?.gameState || {
      board: Array(9).fill(""),
      phase: "waiting",
      currentPlayerIndex: 0,
      winner: null,
      isDraw: false,
      scores: {},
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Use refs to track update reasons
  const updateReasonRef = useRef<string>("");
  const myPlayerIndexRef = useRef<number>(-1);

  // Force re-render function for debugging
  const forceUpdate = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  // Initialize local game state from props
  useEffect(() => {
    if (game?.gameState) {
      updateReasonRef.current = "Initial game props";
      setLocalGameState(game.gameState);

      // Check if game is already completed
      if (game.gameState.phase === "completed") {
        setGameEnded(true);
      }
    }
  }, [game]);

  // Determine player role and index - store in ref for reliable access
  useEffect(() => {
    if (!game || !user?.id) return;

    // Find my player index
    const playerIndex = game.players.findIndex(
      (p) =>
        p.user._id === user.id || p.user._id.toString() === user.id.toString()
    );

    if (playerIndex === -1) return;

    // Store in ref for reliable access elsewhere
    myPlayerIndexRef.current = playerIndex;

    // Set my symbol based on player index
    const symbol = playerIndex === 0 ? "X" : "O";
    setMySymbol(symbol);
  }, [game, user?.id]);

  // Update turn status whenever localGameState changes
  useEffect(() => {
    if (!game || myPlayerIndexRef.current === -1 || !localGameState) return;

    // Extract current player index from game state
    const { currentPlayerIndex } = localGameState;

    // Determine if it's my turn
    const isMyTurnNow = currentPlayerIndex === myPlayerIndexRef.current;

    // Update turn status
    setIsMyTurn(isMyTurnNow);

    // Set game phase flags
    if (localGameState.phase === "completed") {
      setGameEnded(true);
    } else if (localGameState.phase === "playing") {
      setGameStarted(true);
      setIsWaiting(false);
    }
  }, [localGameState, game]);

  // Socket connection and event handlers
  useEffect(() => {
    if (!socket || !connected || !game) {
      return;
    }

    // Game state update handler
    const handleGameState = (data) => {
      if (!data.gameState || data.gameId !== game._id) return;

      console.log("[TICTACTOE] Game state update received:", data.gameState);

      // Store previous state for comparison
      const prevState = localGameState;
      const prevScores = prevState?.scores || {};
      const prevPhase = prevState?.phase;
      const newPhase = data.gameState.phase;

      // Create a completely new state object to ensure React detects changes
      const newState = { ...data.gameState };

      // CRITICAL FIX: Make sure scores are preserved across rounds
      // If we're transitioning from completed to playing (new round), ensure scores are kept
      if (prevPhase === "completed" && newPhase === "playing") {
        console.log("[TICTACTOE] New round detected, preserving scores");

        // If the new state has no scores or empty scores, use the previous scores
        if (!newState.scores || Object.keys(newState.scores).length === 0) {
          newState.scores = prevScores;
        }
      }

      // Make sure scores object always exists
      if (!newState.scores) {
        newState.scores = prevScores;
      }

      // Update local state with received state
      setLocalGameState(newState);

      // Check if scores have changed
      const prevScoresStr = JSON.stringify(prevScores);
      const newScoresStr = JSON.stringify(newState.scores);

      if (prevScoresStr !== newScoresStr) {
        console.log(
          "[TICTACTOE] Scores updated from:",
          prevScores,
          "to:",
          newState.scores
        );

        // Force forceUpdate to trigger re-renders
        forceUpdate();
      }

      // Handle phase change from playing to completed (game just ended)
      if (prevPhase !== "completed" && newPhase === "completed") {
        setGameEnded(true);

        // Check if the current player won
        const currentUserId = user?.id?.toString();
        const didWin =
          newState.winner &&
          (newState.winner === currentUserId ||
            newState.winner.toString() === currentUserId);

        if (newState.isDraw) {
          toast.success("Game ended in a draw!");
        } else if (didWin) {
          toast.success("You won the game! 🎉");
        } else {
          // Use regular toast for losing
          toast("Your opponent won this round");
        }
      }

      // Force loading to false
      setIsLoading(false);
    };

    // Game completed handler
    const handleGameCompleted = (data) => {
      if (data.gameId === game._id) {
        setGameEnded(true);
      }
    };

    // Listen for specific score update events
    socket.on("tictactoe:score-updated", (data) => {
      console.log("[TICTACTOE] Score update received:", data);

      if (data.gameId === game._id) {
        const myId = user?.id?.toString();
        const isWinner =
          data.winner === myId || data.winner.toString() === myId;

        // Update scores in local state
        setLocalGameState((prev) => ({
          ...prev,
          scores: data.scores,
          phase: "completed",
          winner: data.winner,
        }));

        // Set game ended
        setGameEnded(true);

        // Show appropriate toast
        if (isWinner) {
          toast.success("You won! Your score has been updated 🏆");
        } else {
          toast("Your opponent won this round");
        }
      }
    });

    console.log("[TICTACTOE] Setting up socket listeners");

    // Set up event listeners
    socket.on("game-state", handleGameState);
    socket.on("game-completed", handleGameCompleted);

    // Request initial game state when component mounts
    console.log("[TICTACTOE] Requesting initial game state");
    socket.emit("tictactoe:sync-game-state", { gameId: game._id });

    // Periodically check for updates (helpful for debugging)
    const intervalId = setInterval(() => {
      if (connected && !gameEnded) {
        console.log("[TICTACTOE] Polling for game state updates");
        socket.emit("tictactoe:sync-game-state", { gameId: game._id });
      }
    }, 10000); // Check every 10 seconds

    // Cleanup function
    return () => {
      console.log("[TICTACTOE] Cleaning up socket listeners");
      socket.off("game-state", handleGameState);
      socket.off("game-completed", handleGameCompleted);
      socket.off("tictactoe:move-result");
      socket.off("tictactoe:score-updated");
      clearInterval(intervalId);
    };
  }, [socket, connected, game, user?.id, gameEnded, forceUpdate]);

  // Socket connection check
  const checkSocketConnection = useCallback(() => {
    return !!(socket && connected);
  }, [socket, connected]);

  // Handle cell click
  const handleCellClick = (index: number) => {
    // Don't allow moves if game has ended
    if (gameEnded || localGameState?.phase === "completed") {
      toast.error("Game has ended, no more moves allowed");
      return;
    }

    if (!checkSocketConnection()) {
      toast.error("Not connected to server. Please refresh the page.");
      return;
    }

    if (!isMyTurn) {
      toast.error("It's not your turn");
      return;
    }

    const currentGameState = localGameState;
    if (!currentGameState) {
      toast.error("Game state is not available");
      return;
    }

    if (
      currentGameState.board[index] !== "" &&
      currentGameState.board[index] !== null
    ) {
      toast.error("This cell is already taken");
      return;
    }

    setIsLoading(true);

    console.log("[TICTACTOE] Making move:", {
      index,
      symbol: mySymbol,
      gameId: game._id,
    });

    // Create a deep copy of the game state for optimistic updates
    const updatedGameState = JSON.parse(JSON.stringify(currentGameState));
    updatedGameState.board[index] = mySymbol;

    // For optimistic UI, also update the currentPlayerIndex to the other player
    const otherPlayerIndex = (updatedGameState.currentPlayerIndex + 1) % 2;
    updatedGameState.currentPlayerIndex = otherPlayerIndex;

    // Update local state with optimistic changes
    updateReasonRef.current = "Optimistic update from move";
    setLocalGameState(updatedGameState);

    // Immediately update turn status to provide instant feedback
    setIsMyTurn(false);

    // Send the move to the server
    socket.emit("tictactoe:make-move", {
      gameId: game._id,
      index,
      symbol: mySymbol,
    });

    // Add a timeout to revert if no server response - increase timeout
    const moveTimeout = setTimeout(() => {
      console.log(
        "[TICTACTOE] Server response timeout - forcing game state sync"
      );

      // Instead of showing error, try to sync game state
      socket.emit("tictactoe:sync-game-state", { gameId: game._id });

      // Add a brief delay before resetting loading
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          toast.error("Server did not respond. Please try again.");

          // Revert optimistic changes if no response
          updateReasonRef.current = "Reverting failed move";
          setLocalGameState(currentGameState);
          setIsMyTurn(true);
        }
      }, 1000);
    }, 8000); // Increase timeout to 8 seconds

    // Listen for move result
    socket.once("tictactoe:move-result", (data) => {
      clearTimeout(moveTimeout);

      console.log("[TICTACTOE] Move result received:", data);

      if (!data.success) {
        setIsLoading(false);
        toast.error(data.message || "Failed to make move");

        // Revert optimistic changes if move failed
        updateReasonRef.current = "Reverting failed move";
        setLocalGameState(currentGameState);
        setIsMyTurn(true);
      } else {
        console.log("[TICTACTOE] Move successful");

        // Don't set loading to false here - wait for the game-state update
        // Only set a backup timeout to catch missed game-state events
        const gameStateTimeout = setTimeout(() => {
          if (isLoading) {
            console.log(
              "[TICTACTOE] No game state update received, requesting sync"
            );
            setIsLoading(false);
            socket.emit("tictactoe:sync-game-state", { gameId: game._id });
          }
        }, 3000);

        // Clean up this timeout if component unmounts
        return () => {
          clearTimeout(gameStateTimeout);
        };
      }
    });
  };

  // Handle next round - start a new game
  const handleNextRound = () => {
    if (!checkSocketConnection()) {
      toast.error("Not connected to server");
      return;
    }

    setIsLoading(true);
    toast.success("Starting next round...");

    // Store the current scores before starting next round
    const currentScores = localGameState?.scores || {};
    console.log("[TICTACTOE] Preserving scores for next round:", currentScores);

    // Save scores both locally and to server
    saveScoresToLocalStorage();

    console.log("[TICTACTOE] Requesting next round");
    socket.emit("tictactoe:next-round", {
      gameId: game._id,
      preserveScores: true,
      scores: currentScores,
    });

    // Request the updated game state after a short delay
    setTimeout(() => {
      socket.emit("tictactoe:sync-game-state", { gameId: game._id });
    }, 1000);

    socket.once("tictactoe:next-round-result", (data) => {
      setIsLoading(false);
      if (data.success) {
        setGameEnded(false);
        console.log("[TICTACTOE] Next round started successfully");

        // If we get updated game state with the result, update local state
        if (data.gameState) {
          // Make sure we preserve the scores in the new game state
          const newState = { ...data.gameState };
          if (!newState.scores || Object.keys(newState.scores).length === 0) {
            newState.scores = currentScores;
          }
          setLocalGameState(newState);
        }
      } else {
        toast.error(data.message || "Failed to start next round");
      }
    });
  };

  // Render the game board
  const renderBoard = () => {
    // Get the current board state to render
    const currentBoard =
      localGameState?.board || game?.gameState?.board || Array(9).fill("");

    return (
      <div className="grid grid-cols-3 gap-2 w-full max-w-md mx-auto">
        {currentBoard.map((cell, index) => (
          <div
            key={`cell-${index}-${cell || "empty"}-${
              lastUpdate?.getTime() || 0
            }`}
            className={`
              h-24 w-full flex items-center justify-center text-4xl font-bold
              bg-gray-100 rounded-lg cursor-pointer shadow hover:bg-gray-200
              ${
                isMyTurn && !gameEnded && cell === ""
                  ? "hover:bg-primary-100"
                  : ""
              }
              ${isLoading || gameEnded ? "pointer-events-none" : ""}
              ${cell !== "" || gameEnded ? "cursor-not-allowed" : ""}
            `}
            onClick={() => handleCellClick(index)}
          >
            {cell === "X" && <span className="text-blue-600">X</span>}
            {cell === "O" && <span className="text-red-600">O</span>}
          </div>
        ))}
      </div>
    );
  };

  // Render game status
  const renderGameStatus = () => {
    if (isWaiting) {
      return (
        <div className="text-center text-lg font-medium mb-4">
          Waiting for game to start...
        </div>
      );
    }

    const currentGameState = localGameState;

    // For completed games, properly check winner and draw status
    if (currentGameState?.phase === "completed" || gameEnded) {
      if (currentGameState?.isDraw) {
        return (
          <div className="text-center text-lg font-bold mb-4 text-blue-600">
            Game Ended in a Draw!
          </div>
        );
      }

      const isWinner =
        currentGameState?.winner &&
        (currentGameState.winner === user?.id ||
          currentGameState.winner.toString() === user?.id.toString());

      return (
        <div
          className={`text-center text-lg font-bold mb-4 ${
            isWinner ? "text-green-600" : "text-red-600"
          }`}
        >
          {isWinner ? "You Won! 🎉" : "You Lost! 😢"}
        </div>
      );
    }

    // Regular turn display for active games
    return (
      <div
        className="text-center text-lg font-medium mb-4"
        key={`turn-status-${isMyTurn}-${lastUpdate?.getTime() || 0}`}
      >
        {isMyTurn ? (
          <span className="text-green-600">
            Your turn - Place your {mySymbol}
          </span>
        ) : (
          <span className="text-amber-600">Opponent's turn - Please wait</span>
        )}
      </div>
    );
  };

  // Render scoreboard
  const renderScoreboard = () => {
    if (!game || !game.players) return null;

    // IMPORTANT: Use localGameState first, then fall back to game.gameState
    const currentGameState = localGameState || game.gameState;

    if (!currentGameState) return null;

    // Make sure scores exist, even if empty
    const scores = currentGameState.scores || {};

    // Log scores for debugging
    console.log("[TICTACTOE] Rendering scoreboard with scores:", scores);

    // Generate a unique key based on the current scores to force re-render
    const scoresKey = Object.entries(scores)
      .map(([id, score]) => `${id}:${score}`)
      .join("|");

    return (
      <div
        className="bg-white p-4 rounded-md shadow-sm mb-6"
        key={`scoreboard-${scoresKey}`}
      >
        <h3 className="text-lg font-medium mb-2 text-center">Scoreboard</h3>
        <div className="flex justify-center space-x-8">
          {game.players.map((player: any) => {
            // Convert player ID to string to ensure it works as an object key
            const playerId = player.user._id.toString();
            const isCurrentUser = playerId === user?.id?.toString();

            // Convert score to number to ensure proper rendering
            const playerScore = Number(scores[playerId] || 0);

            return (
              <div key={`player-${playerId}`} className="text-center">
                <p className="font-medium">
                  {player.user.name} {isCurrentUser ? "(You)" : ""}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isCurrentUser ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  {playerScore}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Connection status indicator
  const renderConnectionStatus = () => {
    return (
      <div
        className={`p-1 rounded-full w-3 h-3 absolute top-2 right-2 ${
          connected ? "bg-green-500" : "bg-red-500"
        }`}
        title={connected ? "Connected to server" : "Not connected to server"}
      ></div>
    );
  };

  // Add a debugging function after your component's useState declarations:
  const logScores = useCallback(() => {
    console.log("[TICTACTOE] CURRENT SCORES:", {
      localGameState: localGameState?.scores,
      gameProps: game?.gameState?.scores,
      players: game?.players?.map((p) => ({
        id: p.user._id.toString(),
        name: p.user.name,
      })),
    });
  }, [localGameState?.scores, game?.gameState?.scores, game?.players]);

  // Call this in your useEffect for localGameState changes:
  useEffect(() => {
    if (localGameState?.scores) {
      logScores();
    }
  }, [localGameState?.scores, logScores]);

  // Add this useEffect to handle score updates specifically
  useEffect(() => {
    if (!localGameState?.scores || !game || !user?.id) return;

    const scores = localGameState.scores;
    const myId = user.id.toString();

    // Check if I have a score
    if (scores[myId] !== undefined) {
      const myScore = scores[myId];
      console.log(`[TICTACTOE] Your current score is: ${myScore}`);

      // Force re-render of the scoreboard
      forceUpdate();
    }
  }, [localGameState?.scores, game, user?.id, forceUpdate]);

  // Add this useEffect after your existing useEffects
  useEffect(() => {
    // Only run when phase changes to "playing" from "completed" (new round started)
    if (localGameState?.phase === "playing" && gameEnded) {
      console.log(
        "[TICTACTOE] New round started, ensuring scores are preserved"
      );
      setGameEnded(false);

      // Make sure scores are preserved from previous state
      const previousScores = localGameState.scores || {};

      // If there are no scores in the new state but we had scores before,
      // update the local state to include the previous scores
      if (Object.keys(previousScores).length > 0) {
        setLocalGameState((prevState) => ({
          ...prevState,
          scores: previousScores,
        }));
      }
    }
  }, [localGameState?.phase, gameEnded]);

  // Add this function to your TicTacToeGame component around line 306
  const saveScoresToLocalStorage = useCallback(() => {
    if (!game || !localGameState?.scores || !user?.id) return;

    try {
      const scores = localGameState.scores;
      const players = game.players.map((p) => p.user._id.toString());

      // Create a unique key for this player pair (sorted to ensure same key regardless of order)
      const playerKey = [...players].sort().join("-");
      const scoreData = {
        timestamp: new Date().toISOString(),
        scores,
        players: game.players.map((p) => ({
          id: p.user._id.toString(),
          name: p.user.name,
        })),
      };

      // Save to localStorage
      localStorage.setItem(
        `tictactoe_scores_${playerKey}`,
        JSON.stringify(scoreData)
      );
      console.log("[TICTACTOE] Scores saved to localStorage:", scoreData);

      // Also send to server
      if (socket && connected) {
        socket.emit("tictactoe:save-scores", {
          gameId: game._id,
          scores,
        });
      }
    } catch (error) {
      console.error("[TICTACTOE] Error saving scores to localStorage:", error);
    }
  }, [game, localGameState?.scores, user?.id, socket, connected]);

  // Add this useEffect after your other useEffects
  useEffect(() => {
    if (!localGameState?.scores) return;

    // Save scores whenever they change
    saveScoresToLocalStorage();

    // Also set up a cleanup to save scores when component unmounts
    return () => {
      saveScoresToLocalStorage();
    };
  }, [localGameState?.scores, saveScoresToLocalStorage]);

  // Add this to your other useEffects, after the initial game state setup
  useEffect(() => {
    if (!game || !game.players || !user?.id || localGameState?.scores) return;

    // Only load from localStorage if we don't have scores yet
    try {
      const players = game.players.map((p) => p.user._id.toString());
      const playerKey = [...players].sort().join("-");

      const savedScoreData = localStorage.getItem(
        `tictactoe_scores_${playerKey}`
      );

      if (savedScoreData) {
        const { scores, timestamp } = JSON.parse(savedScoreData);

        // Check if scores were saved recently (within last 24 hours)
        const savedTime = new Date(timestamp).getTime();
        const currentTime = new Date().getTime();
        const hoursSinceSaved = (currentTime - savedTime) / (1000 * 60 * 60);

        if (hoursSinceSaved < 24 && scores && Object.keys(scores).length > 0) {
          console.log("[TICTACTOE] Loaded scores from localStorage:", scores);

          // Update local state with the saved scores
          setLocalGameState((prevState) => ({
            ...prevState,
            scores,
          }));

          // Also update server
          if (socket && connected) {
            socket.emit("tictactoe:save-scores", {
              gameId: game._id,
              scores,
            });
          }
        }
      }
    } catch (error) {
      console.error(
        "[TICTACTOE] Error loading scores from localStorage:",
        error
      );
    }
  }, [game, user?.id, socket, connected, localGameState?.scores]);

  return (
    <div className="max-w-md mx-auto relative">
      {renderConnectionStatus()}
      <h2 className="text-2xl font-bold mb-4 text-center">Tic Tac Toe</h2>

      {!connected && (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-center">
          Not connected to server. Some features may be unavailable.
        </div>
      )}

      {/* Game status and board */}
      {renderGameStatus()}
      {renderScoreboard()}
      {renderBoard()}

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          You are playing as{" "}
          <span className="font-bold">{mySymbol || "?"}</span>
        </p>
      </div>

      {/* Show only Next Round button if game has ended */}
      {gameEnded && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleNextRound}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center"
            disabled={isLoading}
          >
            <FaRedo className="mr-2" /> Next Round
          </button>
        </div>
      )}
    </div>
  );
};

export default TicTacToeGame;
