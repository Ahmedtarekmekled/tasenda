import React from 'react';
import Link from 'next/link';
import { FaGamepad, FaUsers, FaLock, FaRocket } from 'react-icons/fa';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/common/Button';

const Home = () => {
  return (
    <MainLayout title="Tasenda - Play Games with Friends">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Play Games with Friends, <span className="text-yellow-300">Anywhere</span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
            Tasenda brings your favorite games online. Create a game, invite your friends, and start playing in seconds.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/register">
              <Button variant="secondary" className="text-lg py-3 px-8 bg-white text-primary-700 hover:bg-gray-100">
                Get Started
              </Button>
            </Link>
            <Link href="/games">
              <Button variant="outline" className="text-lg py-3 px-8 border-white text-white hover:bg-primary-700">
                Browse Games
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Tasenda?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="inline-block p-4 bg-primary-100 text-primary-600 rounded-full mb-4">
                <FaGamepad size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Multiple Games</h3>
              <p className="text-gray-600">
                Choose from a variety of classic and modern games to play with friends.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="inline-block p-4 bg-primary-100 text-primary-600 rounded-full mb-4">
                <FaUsers size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Invite Friends</h3>
              <p className="text-gray-600">
                Generate unique invite links to share with friends and family.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="inline-block p-4 bg-primary-100 text-primary-600 rounded-full mb-4">
                <FaLock size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Secure Platform</h3>
              <p className="text-gray-600">
                Your data is protected with industry-standard security measures.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="inline-block p-4 bg-primary-100 text-primary-600 rounded-full mb-4">
                <FaRocket size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Fast & Responsive</h3>
              <p className="text-gray-600">
                Enjoy a smooth gaming experience on any device, anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white text-2xl font-bold rounded-full mb-4">
                1
              </div>
              <h3 className="text-xl font-bold mb-2">Create an Account</h3>
              <p className="text-gray-600">
                Sign up for free and set up your profile in seconds.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white text-2xl font-bold rounded-full mb-4">
                2
              </div>
              <h3 className="text-xl font-bold mb-2">Start a Game</h3>
              <p className="text-gray-600">
                Choose a game and create a new session with custom settings.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white text-2xl font-bold rounded-full mb-4">
                3
              </div>
              <h3 className="text-xl font-bold mb-2">Invite Friends</h3>
              <p className="text-gray-600">
                Share your unique game link and start playing together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Playing?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of players already enjoying Tasenda's multiplayer games with friends and family.
          </p>
          <Link href="/auth/register">
            <Button variant="secondary" className="text-lg py-3 px-8 bg-white text-primary-700 hover:bg-gray-100">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
};

export default Home; 