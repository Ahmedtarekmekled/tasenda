import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

interface ChatBoxProps {
  gameId: string;
  socket: any;
  connected: boolean;
  user: any;
}

interface ChatMessage {
  id: string | number;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date | string;
  type?: "system" | "user";
}

const ChatBox: React.FC<ChatBoxProps> = ({
  gameId,
  socket,
  connected,
  user,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history and set up listeners when component mounts
  useEffect(() => {
    if (!socket || !connected) return;

    setIsLoading(true);

    // Load chat history
    socket.emit("get-chat-history", { gameId });

    // Handle chat history response
    const handleChatHistory = (data: {
      gameId: string;
      messages: ChatMessage[];
    }) => {
      if (data.gameId !== gameId) return;

      console.log(
        `[CHAT] Received ${data.messages.length} messages from history`
      );
      setMessages(data.messages);
      setIsLoading(false);
    };

    // Handle new messages
    const handleChatMessage = (message: ChatMessage) => {
      if (message.gameId !== gameId) return;

      setMessages((prevMessages) => [...prevMessages, message]);
    };

    // Handle errors
    const handleChatError = (error: { message: string }) => {
      toast.error(error.message || "Error with chat");
      setIsLoading(false);
    };

    // Set up event listeners
    socket.on("chat-history", handleChatHistory);
    socket.on("chat-message", handleChatMessage);
    socket.on("chat-error", handleChatError);

    // Load history right away
    socket.emit("get-chat-history", { gameId, limit: 50 });

    // Clean up event listeners
    return () => {
      socket.off("chat-history", handleChatHistory);
      socket.off("chat-message", handleChatMessage);
      socket.off("chat-error", handleChatError);
    };
  }, [socket, connected, gameId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;
    if (!socket || !connected) {
      toast.error("Not connected to server");
      return;
    }

    // Send message to server
    socket.emit("send-chat-message", {
      gameId,
      message: newMessage.trim(),
    });

    // Clear input
    setNewMessage("");
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden h-96 flex flex-col">
      <div className="p-3 bg-primary-600 text-white font-medium">Chat</div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 my-4">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-2 ${
                msg.type === "system"
                  ? "text-center text-gray-500 italic text-sm"
                  : ""
              }`}
            >
              {msg.type === "system" ? (
                <p>{msg.message}</p>
              ) : (
                <div
                  className={`p-2 rounded-lg max-w-[75%] ${
                    msg.senderId === user?.id
                      ? "ml-auto bg-primary-100 text-primary-800"
                      : "bg-gray-100"
                  }`}
                >
                  <div className="font-medium text-xs">
                    {msg.senderId === user?.id ? "You" : msg.senderName}
                  </div>
                  <p>{msg.message}</p>
                  <div className="text-right text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t p-2 flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-l-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
          disabled={!connected}
        />
        <button
          type="submit"
          className="bg-primary-600 text-white px-4 py-2 rounded-r-lg hover:bg-primary-700 disabled:bg-gray-400"
          disabled={!connected || !newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
