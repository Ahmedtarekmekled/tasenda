# Tasenda: Multiplayer Game Platform

![Tasenda Logo](https://your-image-url-here.com/logo.png)

Tasenda is a modern, real-time multiplayer game platform featuring classic games like Tic Tac Toe with integrated chat functionality. Built with Next.js, TypeScript, and Socket.IO.

## 🎮 Features

- **Real-time Multiplayer Games**
  - Tic Tac Toe with persistent scoreboard
  - More games coming soon!
- **Integrated Chat System**

  - Real-time messaging between players
  - Chat history persistence
  - System notifications for game events

- **User Authentication**
  - Secure login system
  - Profile management
- **Game Management**
  - Create custom game rooms
  - Invite players with shareable links
  - Track game history and scores

## 🚀 Technologies

- **Frontend**

  - Next.js
  - TypeScript
  - React
  - Tailwind CSS
  - Framer Motion

- **Backend**

  - Node.js
  - Express
  - Socket.IO
  - MongoDB

- **Authentication**
  - JWT (JSON Web Tokens)

## 🛠️ Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Ahmedtarekmekled/tasenda.git
cd tasenda
```

2. **Install dependencies for both client and server**

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Set up environment variables**

Create a `.env` file in the server directory with the following variables:

PORT=5000
MONGODB_URI=mongodb://localhost:27017
