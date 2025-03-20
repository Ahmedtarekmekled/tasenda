// This should be the base URL of your server, not including /api
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = API_URL.replace(/\/api$/, ''); // Use this for socket connections 