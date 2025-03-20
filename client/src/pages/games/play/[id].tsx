import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import MainLayout from "../../../components/layout/MainLayout";
import ProtectedRoute from "../../../components/auth/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../../components/common/Button";
import GameBoard from "../../../components/game/GameBoard";
import { getGameById } from "../../../services/game.service";
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
  sendChatMessage,
} from "../../../services/socket.service";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaUsers,
  FaPaperPlane,
  FaGamepad,
  FaComments,
  FaTimes,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useSocket } from "../../../context/SocketContext";
import QuestionGuessGame from "../../../components/games/QuestionGuessGame";
import TicTacToeGame from "../../../components/games/TicTacToe/TicTacToeGame";
import TicTacToeSetup from "../../../components/games/TicTacToe/TicTacToeSetup";
import GameChat from "../../../components/games/GameChat";

const GamePlay = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, token } = useAuth();
  const { socket, connected } = useSocket();
  const [game, setGame] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState("game"); // 'game' or 'chat'
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [players, setPlayers] = useState([]);

  const fetchGame = useCallback(async () => {
    if (!id || !token) return;

    try {
      setLoading(true);
      const response = await getGameById(id as string, token);

      if (response.success && response.data) {
        setGame(response.data.game);
        setPlayers(response.data.game.players);

        // Check if the current user is the host
        if (user && response.data.game.creator._id === user.id) {
          setIsHost(true);
        }
      } else {
        setError(response.message || "Failed to load game");
        toast(response.message || "Failed to load game");
      }
    } catch (err) {
      console.error("Error fetching game:", err);
      setError("An unexpected error occurred");
      toast("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [id, token, user]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  useEffect(() => {
    if (!socket || !id) return;

    // Check socket connection status
    console.log("[SOCKET] Current connection status:", {
      socketExists: !!socket,
      isConnected: socket.connected,
      id: socket.id,
    });

    // Track when we last joined to prevent repeated join attempts
    let lastJoinAttempt = 0;
    const joinThrottleTime = 5000; // 5 seconds

    // If socket exists but isn't connected, try to reconnect
    if (socket && !socket.connected) {
      console.log("[SOCKET] Attempting to reconnect...");
      socket.connect();
    }

    // Setup connection event listeners
    const handleConnect = () => {
      console.log("[SOCKET] Connected successfully with ID:", socket.id);

      // Join game room after successful connection
      if (id) {
        const now = Date.now();
        if (now - lastJoinAttempt >= joinThrottleTime) {
          lastJoinAttempt = now;
          console.log("[SOCKET] Joining game room after connection:", id);
          socket.emit("join-game", { gameId: id });
        }
      }
    };

    const handleDisconnect = (reason) => {
      console.log("[SOCKET] Disconnected:", reason);

      // Attempt to reconnect if disconnected
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, reconnect manually
        socket.connect();
      }
    };

    // Add connection event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // If already connected, join the game room
    if (socket.connected) {
      console.log("[SOCKET] Already connected, joining game room:", id);
      socket.emit("join-game", { gameId: id });
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, id]);

  useEffect(() => {
    if (!socket || !connected || !id) {
      console.log("[CLIENT] Socket not connected or game ID missing");
      return;
    }

    // Add throttling for socket events to prevent server overload
    let lastSyncRequest = 0;
    const syncThrottleTime = 2000; // 2 seconds

    // Override the socket.emit method to add throttling for specific events
    const originalEmit = socket.emit;
    socket.emit = function (eventName, ...args) {
      if (eventName === "tictactoe:sync-game-state") {
        const now = Date.now();
        if (now - lastSyncRequest < syncThrottleTime) {
          console.log("[CLIENT] Throttling sync request");
          return socket; // Return socket instance for chaining
        }
        lastSyncRequest = now;
      }
      return originalEmit.apply(this, [eventName, ...args]);
    };

    console.log("[CLIENT] Setting up socket events for game:", id);

    // Listen for game updates
    socket.on("game-updated", (data) => {
      console.log("[CLIENT] Game updated:", data);

      if (data.game) {
        setGame(data.game);
        setPlayers(data.game.players);
      }
    });

    // Listen for Tic Tac Toe specific events
    socket.on("tictactoe:move-made", (data) => {
      console.log("[TICTACTOE] Move made:", data);
      // The game state will be updated via the game-updated event
    });

    socket.on("tictactoe:round-ended", (data) => {
      console.log("[TICTACTOE] Round ended:", data);
      if (data.winner) {
        const winnerName =
          game?.players.find((p) => p.user._id === data.winner)?.user.name ||
          "Player";
        toast(`${winnerName} won the round!`);
      } else if (data.isDraw) {
        toast("Round ended in a draw!");
      }
    });

    socket.on("tictactoe:game-ended", (data) => {
      console.log("[TICTACTOE] Game ended:", data);
      if (data.winner) {
        const winnerName =
          game?.players.find((p) => p.user._id === data.winner)?.user.name ||
          "Player";
        toast(`${winnerName} won the game!`, { duration: 5000 });
      } else {
        toast("Game ended in a draw!", { duration: 5000 });
      }
    });

    // Listen for game started event
    socket.on("game-started", (data) => {
      console.log("[CLIENT] Game started:", data);

      if (data.game) {
        setGame(data.game);

        // Check if the game has a gameState
        if (data.game.gameState) {
          setGameState(data.game.gameState);

          // Check if it's the current user's turn
          if (user && data.game.gameState.currentTurn === user.id) {
            setIsPlayerTurn(true);
            toast("It's your turn!");
          } else {
            setIsPlayerTurn(false);
          }
        }

        toast("Game has started!");
      }
    });

    // Listen for player joined events
    socket.on("player-joined", (data) => {
      console.log("[CLIENT] Player joined:", data);
      toast(`${data.playerName} joined the game`);
    });

    // Listen for player left events
    socket.on("player-left", (data) => {
      console.log("[CLIENT] Player left:", data);
      toast(`${data.playerName} left the game`);
      fetchGame();
    });

    // Listen for chat messages
    socket.on("chat-message", (message) => {
      console.log("[CLIENT] Chat message received:", message);

      // Add the message to the chat
      setChatMessages((prev) => {
        // Check if we already have this message (by id)
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }

        // Add isCurrentUser flag to the message
        const enhancedMessage = {
          ...message,
          isCurrentUser: message.userId === user?.id,
        };

        return [...prev, enhancedMessage];
      });

      // Scroll to bottom of chat
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop =
            chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    // Listen for game completed event
    socket.on("game-completed", (data) => {
      console.log("[CLIENT] Game completed:", data);
      setGameCompleted(true);

      if (data.winners && data.winners.length > 0) {
        setWinner(data.winners.join(", "));
      }

      toast("Game completed!");
    });

    // Add error event listener
    socket.on("game-error", (error) => {
      console.error("[CLIENT] Game error received:", error);
      toast(error.message || "An error occurred");
    });

    // Update the game-state event handler to add debouncing
    socket.on("game-state", (data) => {
      // Only process if this is for our current game
      if (!data.gameId || data.gameId !== id) return;

      // Log limited information to reduce console spam
      console.log(
        `[CLIENT] Game state update at ${new Date().toLocaleTimeString()}`
      );

      if (data.gameState) {
        // Update the game with the new state from the server
        setGame((prevGame) => {
          if (!prevGame) return prevGame;

          return {
            ...prevGame,
            gameState: data.gameState,
          };
        });
      }
    });

    // Around line 329, after setting up all the socket event listeners
    // Add this code inside the existing useEffect, just before the return statement
    // for initial sync
    if (game?.gameType === "tic-tac-toe" && game?.status === "in-progress") {
      console.log("[CLIENT] Setting up initial game sync request");

      setTimeout(() => {
        if (socket.connected) {
          console.log("[CLIENT] Sending initial sync request");
          socket.emit("tictactoe:sync-game-state", { gameId: id });
        }
      }, 1000);
    }

    // Cleanup function
    return () => {
      console.log("[CLIENT] Cleaning up socket events");

      // Restore original emit function if we overrode it
      if (socket.emit !== originalEmit) {
        socket.emit = originalEmit;
      }

      // Remove all listeners
      socket.off("game-updated");
      socket.off("tictactoe:move-made");
      socket.off("tictactoe:round-ended");
      socket.off("tictactoe:game-ended");
      socket.off("game-started");
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("chat-message");
      socket.off("game-completed");
      socket.off("game-error");
      socket.off("game-state");

      // Leave the game room when component unmounts
      if (id) {
        socket.emit("leave-game", { gameId: id });
        console.log("[CLIENT] Emitted leave-game event for game:", id);
      }
    };
  }, [socket, connected, id]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !socket || !connected || !id) {
      return;
    }

    console.log("[CLIENT] Sending chat message:", messageInput);

    // Emit the message to the server
    socket.emit("chat-message", {
      gameId: id,
      message: messageInput.trim(),
    });

    // Clear the input (don't add to local state, wait for server echo)
    setMessageInput("");
  };

  const handleGameAction = (action: string, data: any) => {
    if (!id) return;

    console.log("Sending game action:", { action, data });
    sendGameAction(id as string, action, data);
  };

  const handleStartGame = () => {
    if (!socket || !connected || !id) {
      console.error("[CLIENT] Cannot start game: Socket not connected");
      toast("Cannot connect to server. Please try again.");
      return;
    }

    try {
      setIsStarting(true);
      console.log("[CLIENT] Emitting start-game event for game:", id);

      // Emit the start-game event
      socket.emit("start-game", { gameId: id });

      // Add listeners for responses
      socket.once("start-game-success", (data) => {
        console.log("[CLIENT] Game started successfully:", data);
        toast("Game started successfully!");
        setIsStarting(false);
      });

      socket.once("game-error", (error) => {
        console.error("[CLIENT] Game start error:", error);
        toast(error.message || "Failed to start game");
        setIsStarting(false);
      });

      // Add a timeout to prevent the button from being stuck in loading state
      setTimeout(() => {
        setIsStarting(false);
      }, 5000);
    } catch (error) {
      console.error("[CLIENT] Error starting game:", error);
      toast("An error occurred while starting the game");
      setIsStarting(false);
    }
  };

  const handleDirectFix = async () => {
    if (!id || !token) {
      toast("Missing game ID or authentication");
      return;
    }

    try {
      const response = await fixGame(id as string, token);

      if (response.success) {
        toast("Game fixed successfully!");
        // Refresh the game data
        fetchGame();
      } else {
        toast(response.message || "Failed to fix game");
      }
    } catch (error) {
      console.error("Error fixing game:", error);
      toast("An unexpected error occurred");
    }
  };

  const fixGame = async (gameId: string, token: string) => {
    // Since we're removing this functionality, just return a success message
    return {
      success: true,
      message: "Game fixed",
    };
  };

  const renderGameComponent = () => {
    if (!game) return null;

    switch (game.gameType) {
      case "question-guess":
        return <QuestionGuessGame game={game} user={user} />;
      case "tic-tac-toe":
        return game.status === "waiting" ? (
          <TicTacToeSetup game={game} isHost={isHost} />
        ) : (
          <TicTacToeGame
            game={game}
            socket={socket}
            connected={connected}
            user={user}
          />
        );
      default:
        return (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <p className="text-center text-gray-500">
              Game type not supported: {game.gameType}
            </p>
          </div>
        );
    }
  };

  const StartGameButton = () => {
    if (
      !isHost ||
      (game?.status !== "waiting" && game?.gameState?.phase !== "waiting") ||
      (game?.players?.length || 0) < 2
    ) {
      return null;
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Ready to Start</h3>
            <p className="text-sm text-gray-600">
              {game?.players?.length} players have joined. You can start the
              game now.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleStartGame}
            isLoading={isStarting}
            disabled={isStarting}
          >
            Start Game
          </Button>
        </div>
      </div>
    );
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
              <Link
                href="/dashboard"
                className="mt-4 inline-block text-primary-600 hover:text-primary-800"
              >
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
              <Link
                href="/dashboard"
                className="mt-4 inline-block text-primary-600 hover:text-primary-800"
              >
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
              <Link
                href={`/games/${game._id}`}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
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
                  {players.slice(0, 3).map((player: any) => (
                    <div
                      key={player.user._id}
                      className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 border-2 border-white"
                      title={player.user.name}
                    >
                      {player.user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {players.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 border-2 border-white">
                      +{players.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  {players.length} players
                </span>
              </div>
            </div>
          </div>

          {/* Game content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Game board */}
            <div
              className={`flex-1 ${showSidebar ? "hidden md:block" : "block"}`}
            >
              {/* Start game button (only for host) */}
              <StartGameButton />

              {/* Game component based on game type */}
              {renderGameComponent()}
            </div>

            {/* Sidebar (chat & players) */}
            <div
              className={`${
                showSidebar ? "block" : "hidden md:block"
              } w-full md:w-80 lg:w-96 border-l bg-white flex flex-col`}
            >
              {/* Tabs */}
              <div className="flex border-b">
                <button
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === "game"
                      ? "text-primary-600 border-b-2 border-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("game")}
                >
                  <FaGamepad className="inline mr-2" /> Game
                </button>
                <button
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === "chat"
                      ? "text-primary-600 border-b-2 border-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("chat")}
                >
                  <FaComments className="inline mr-2" /> Chat
                </button>
              </div>

              {/* Player list */}
              {activeTab === "game" && (
                <div className="p-4 overflow-y-auto">
                  <h2 className="font-medium mb-3">
                    Players ({players.length})
                  </h2>
                  <div className="space-y-3">
                    {players.map((player: any) => (
                      <div
                        key={player.user._id}
                        className="flex items-center p-2 rounded-md hover:bg-gray-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-3">
                          {player.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{player.user.name}</div>
                          <div className="text-xs text-gray-500">
                            {player.role === "host" ? "Host" : "Player"} •
                            Joined{" "}
                            {new Date(player.joinedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat */}
              {activeTab === "chat" && (
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
                        <div
                          key={msg.id}
                          className={`${
                            msg.type === "system" ? "text-center" : ""
                          }`}
                        >
                          {msg.type === "system" ? (
                            <div className="text-xs text-gray-500 py-1">
                              {msg.message}
                            </div>
                          ) : (
                            <div
                              className={`flex ${
                                msg.isCurrentUser
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                                  msg.isCurrentUser
                                    ? "bg-primary-100 text-primary-800"
                                    : "bg-gray-100"
                                }`}
                              >
                                {!msg.isCurrentUser && (
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    {msg.userName}
                                  </div>
                                )}
                                <div className="text-sm break-words">
                                  {msg.message}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(msg.timestamp).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
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
