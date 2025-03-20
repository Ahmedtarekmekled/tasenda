import axios from 'axios';
import { API_URL } from '../config';

export interface GameData {
  gameType: string;
  title: string;
  maxPlayers?: number;
  settings?: Record<string, any>;
}

export interface GameResponse {
  success: boolean;
  message: string;
  data?: {
    game: {
      _id: string;
      creator: {
        _id: string;
        name: string;
        email: string;
      };
      gameType: string;
      title: string;
      players: Array<{
        user: {
          _id: string;
          name: string;
          email: string;
        };
        role: string;
        joinedAt: string;
      }>;
      maxPlayers: number;
      status: string;
      inviteCode: string;
      settings: Record<string, any>;
      createdAt: string;
      updatedAt: string;
      canJoin?: boolean;
      isCreator?: boolean;
      isPlayer?: boolean;
    };
  };
  errors?: string[];
}

export interface GamesListResponse {
  success: boolean;
  count: number;
  data?: {
    games: Array<GameResponse['data']['game']>;
  };
  message?: string;
  errors?: string[];
}

export interface PublicGameResponse {
  success: boolean;
  data?: {
    game: {
      id: string;
      title: string;
      gameType: string;
      status: string;
      playerCount: number;
      maxPlayers: number;
      creator: string;
      createdAt: string;
    };
  };
  message?: string;
  errors?: string[];
}

interface CreateGameData {
  title: string;
  description?: string;
  maxPlayers: number;
  gameType: 'word-guess' | 'trivia' | 'tic-tac-toe';
  settings?: Record<string, any>;
}

// Create a new game
export const createGame = async (gameData: CreateGameData, token: string) => {
  try {
    // Validate game type before sending request
    const validGameTypes = ['word-guess', 'trivia', 'tic-tac-toe'];
    if (!validGameTypes.includes(gameData.gameType)) {
      console.error('Invalid game type:', gameData.gameType);
      return {
        success: false,
        data: null,
        message: `Invalid game type: ${gameData.gameType}. Valid types are: ${validGameTypes.join(', ')}`
      };
    }
    
    console.log('Creating game with data:', gameData);
    
    const response = await axios.post(`${API_URL}/games`, gameData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Game creation response:', response.data);
    
    return {
      success: true,
      data: response.data,
      message: 'Game created successfully'
    };
  } catch (error: any) {
    console.error('Error creating game:', error);
    console.error('Error details:', error.response?.data);
    
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || 'Failed to create game'
    };
  }
};

// Get all games for the current user
export const getUserGames = async (token: string): Promise<GamesListResponse> => {
  try {
    const response = await axios.get(`${API_URL}/games`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Log the full response for debugging
    console.log('API Response:', response.data);
    
    // Check if the response has the expected structure
    if (response.data && Array.isArray(response.data.games)) {
      return {
        success: true,
        count: response.data.games.length,
        data: response.data,
        message: 'Games retrieved successfully'
      };
    } else {
      console.error('Unexpected API response structure:', response.data);
      
      // Special handling for the "Games API" message
      if (response.data && response.data.message === 'Games API') {
        console.log('Received "Games API" message, returning empty games array');
        return {
          success: true,
          count: 0,
          data: { games: [] },
          message: 'No games found'
        };
      }
      
      // If the response is just a message without games, return an empty array
      if (response.data && response.data.message) {
        return {
          success: true,
          count: 0,
          data: { games: [] },
          message: response.data.message
        };
      }
      
      return {
        success: false,
        count: 0,
        message: 'Invalid response format from server'
      };
    }
  } catch (error: any) {
    console.error('Error fetching user games:', error.response?.data || error);
    
    return {
      success: false,
      count: 0,
      message: error.response?.data?.message || 'Failed to fetch games'
    };
  }
};

// Get game by ID
export const getGameById = async (gameId: string, token: string) => {
  try {
    const response = await axios.get(`${API_URL}/games/${gameId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      data: response.data,
      message: 'Game retrieved successfully'
    };
  } catch (error: any) {
    console.error('Error fetching game:', error.response?.data || error);
    
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || 'Failed to fetch game'
    };
  }
};

// Join a game using invite code
export const joinGameByInviteCode = async (inviteCode: string, token: string) => {
  try {
    const response = await axios.post(
      `${API_URL}/games/join/${inviteCode}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: true,
      data: response.data,
      message: 'Joined game successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || 'Failed to join game'
    };
  }
};

// Get game by invite code (public)
export const getGameByInviteCode = async (inviteCode: string): Promise<PublicGameResponse> => {
  try {
    const response = await axios.get(`${API_URL}/games/invite/${inviteCode}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as PublicGameResponse;
    }
    return {
      success: false,
      message: 'Network error. Please try again later.',
    };
  }
};

// Update game status
export const updateGameStatus = async (gameId: string, status: string, token: string) => {
  try {
    console.log('Updating game status:', { gameId, status });
    
    const response = await axios.patch(
      `${API_URL}/games/${gameId}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Game status update response:', response.data);
    
    return {
      success: true,
      data: response.data,
      message: 'Game status updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating game status:', error.response?.data || error);
    
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || 'Failed to update game status'
    };
  }
};