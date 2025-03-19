import MainLayout from '../components/layout/MainLayout';
import Link from 'next/link';

export default function Home() {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-5xl font-bold text-center font-heading text-primary-800 mb-6">
          Welcome to Tasenda
        </h1>
        <p className="text-xl text-gray-600 text-center max-w-2xl mb-8">
          Play fun multiplayer games with friends and family. Challenge others, compete, and have a great time!
        </p>
        <div className="flex gap-4">
          <Link 
            href="/auth/register" 
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium transition"
          >
            Get Started
          </Link>
          <Link 
            href="/games" 
            className="bg-white border border-primary-600 text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-md font-medium transition"
          >
            Browse Games
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h3 className="text-xl font-bold text-primary-700 mb-3">Create Account</h3>
            <p className="text-gray-600">Sign up for free and create your personal profile.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h3 className="text-xl font-bold text-primary-700 mb-3">Invite Friends</h3>
            <p className="text-gray-600">Invite your friends to join you for multiplayer fun.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h3 className="text-xl font-bold text-primary-700 mb-3">Play Games</h3>
            <p className="text-gray-600">Enjoy our collection of fun multiplayer games.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 