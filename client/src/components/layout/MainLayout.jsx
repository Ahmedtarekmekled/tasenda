import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const MainLayout = ({ children, title = 'Tasenda - Play Games with Friends' }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Tasenda - Online multiplayer game platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-primary-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-heading font-bold">
            Tasenda
          </Link>
          <nav className="space-x-4">
            <Link href="/games" className="hover:text-primary-200 transition">
              Games
            </Link>
            <Link href="/auth/login" className="hover:text-primary-200 transition">
              Login
            </Link>
            <Link 
              href="/auth/register" 
              className="bg-white text-primary-700 px-4 py-2 rounded-md hover:bg-primary-100 transition"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-gray-100 border-t">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Tasenda. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout; 