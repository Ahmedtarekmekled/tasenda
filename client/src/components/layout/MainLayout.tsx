import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { FaGamepad, FaBars, FaTimes, FaHome, FaSignOutAlt, FaUser } from 'react-icons/fa';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title = 'Tasenda - Play Games with Friends' 
}) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.pathname]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    router.push('/');
  };

  const ActiveLink = ({ href, children, className = '' }) => {
    const isActive = router.pathname === href;
    return (
      <Link 
        href={href} 
        className={`${className} ${isActive ? 'text-primary-200 font-medium' : 'hover:text-primary-200'} transition`}
      >
        {children}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Tasenda - Online multiplayer game platform" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <header className="bg-primary-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center text-2xl font-heading font-bold">
              <FaGamepad className="mr-2 h-6 w-6" />
              Tasenda
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <ActiveLink href="/games">
                Games
              </ActiveLink>
              
              {isAuthenticated ? (
                <>
                  <ActiveLink href="/dashboard">
                    Dashboard
                  </ActiveLink>
                  <button 
                    onClick={handleLogout}
                    className="hover:text-primary-200 transition"
                  >
                    Logout
                  </button>
                  <Link 
                    href="/profile" 
                    className="bg-white text-primary-700 px-4 py-2 rounded-md hover:bg-primary-100 transition flex items-center"
                  >
                    <div className="h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-2">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span>{user?.name || 'User'}</span>
                  </Link>
                </>
              ) : (
                <>
                  <ActiveLink href="/auth/login">
                    Login
                  </ActiveLink>
                  <Link 
                    href="/auth/register" 
                    className="bg-white text-primary-700 px-4 py-2 rounded-md hover:bg-primary-100 transition font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              {isAuthenticated && (
                <Link 
                  href="/profile" 
                  className="mr-4 flex items-center justify-center h-8 w-8 rounded-full bg-white text-primary-700"
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Link>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 focus:outline-none focus:ring-2 focus:ring-white rounded-md"
              >
                {mobileMenuOpen ? (
                  <FaTimes className="h-6 w-6" />
                ) : (
                  <FaBars className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-2 space-y-2 border-t border-primary-600 pt-2">
              <Link 
                href="/games" 
                className="block py-2 px-3 hover:bg-primary-600 rounded-md transition flex items-center"
              >
                <FaGamepad className="mr-3 h-5 w-5" />
                Games
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="block py-2 px-3 hover:bg-primary-600 rounded-md transition flex items-center"
                  >
                    <FaHome className="mr-3 h-5 w-5" />
                    Dashboard
                  </Link>
                  <Link 
                    href="/profile" 
                    className="block py-2 px-3 hover:bg-primary-600 rounded-md transition flex items-center"
                  >
                    <FaUser className="mr-3 h-5 w-5" />
                    Profile
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left block py-2 px-3 hover:bg-primary-600 rounded-md transition flex items-center"
                  >
                    <FaSignOutAlt className="mr-3 h-5 w-5" />
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link 
                    href="/auth/login" 
                    className="block py-2 px-3 text-center border border-white rounded-md hover:bg-primary-600"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="block py-2 px-3 text-center bg-white text-primary-700 rounded-md hover:bg-primary-100"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-gray-100 border-t">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Tasenda. All rights reserved.</p>
          <div className="mt-2 text-sm space-x-4">
            <Link href="/privacy" className="hover:text-primary-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary-600">Terms of Service</Link>
            <Link href="/contact" className="hover:text-primary-600">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;