import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <SocketProvider>
        <Component {...pageProps} />
        <Toaster position="top-right" />
      </SocketProvider>
    </AuthProvider>
  );
}

export default MyApp; 