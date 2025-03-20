import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import {
  FaGamepad,
  FaUser,
  FaSignOutAlt,
  FaPlus,
  FaTrophy,
  FaBars,
  FaTimes,
  FaHome,
  FaGripHorizontal,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [router.pathname]);

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navElement = document.getElementById("main-navigation");
      if (navElement && !navElement.contains(event.target)) {
        setIsMenuOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
    setIsProfileOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isProfileOpen) setIsProfileOpen(false);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  const navItemClass = (path) =>
    router.pathname === path
      ? "text-primary-600 bg-primary-50 font-medium"
      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50";

  return (
    <nav
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-50 bg-white ${
        scrolled ? "shadow-md" : ""
      } transition-all duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <FaGamepad className="h-7 w-7 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Tasenda
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${navItemClass(
                    "/dashboard"
                  )}`}
                >
                  <FaHome className="mr-1 h-4 w-4" /> Dashboard
                </Link>
                <Link
                  href="/games"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${navItemClass(
                    "/games"
                  )}`}
                >
                  <FaGripHorizontal className="mr-1 h-4 w-4" /> Games
                </Link>
                <Link
                  href="/games/create"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${navItemClass(
                    "/games/create"
                  )}`}
                >
                  <FaPlus className="mr-1 h-4 w-4" /> Create Game
                </Link>
                <div className="relative ml-3">
                  <div>
                    <button
                      onClick={toggleProfile}
                      className="flex items-center max-w-xs text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      id="user-menu"
                      aria-expanded={isProfileOpen}
                      aria-haspopup="true"
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    </button>
                  </div>
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="user-menu"
                      >
                        <div className="px-4 py-2 border-b">
                          <p className="text-sm font-medium text-gray-900">
                            {user?.name || "User"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email || "email@example.com"}
                          </p>
                        </div>
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            <FaUser className="mr-2 h-4 w-4" /> Profile
                          </div>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            <FaSignOutAlt className="mr-2 h-4 w-4" /> Sign out
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${navItemClass(
                    "/auth/login"
                  )}`}
                >
                  Log In
                </Link>
                <Link
                  href="/auth/register"
                  className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            {isAuthenticated && (
              <button
                onClick={toggleProfile}
                className="p-1 rounded-full text-gray-700 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <span className="sr-only">View profile</span>
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              </button>
            )}
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <FaTimes className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FaBars className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden bg-white"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg rounded-b-lg">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`block px-3 py-2 rounded-md text-base ${navItemClass(
                      "/dashboard"
                    )}`}
                  >
                    <div className="flex items-center">
                      <FaHome className="mr-3 h-5 w-5" />
                      Dashboard
                    </div>
                  </Link>
                  <Link
                    href="/games"
                    className={`block px-3 py-2 rounded-md text-base ${navItemClass(
                      "/games"
                    )}`}
                  >
                    <div className="flex items-center">
                      <FaGripHorizontal className="mr-3 h-5 w-5" />
                      Games
                    </div>
                  </Link>
                  <Link
                    href="/games/create"
                    className={`block px-3 py-2 rounded-md text-base ${navItemClass(
                      "/games/create"
                    )}`}
                  >
                    <div className="flex items-center">
                      <FaPlus className="mr-3 h-5 w-5" />
                      Create Game
                    </div>
                  </Link>
                  <Link
                    href="/profile"
                    className={`block px-3 py-2 rounded-md text-base ${navItemClass(
                      "/profile"
                    )}`}
                  >
                    <div className="flex items-center">
                      <FaUser className="mr-3 h-5 w-5" />
                      Profile
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-3 py-2 rounded-md text-base text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <FaSignOutAlt className="mr-3 h-5 w-5" />
                      Sign out
                    </div>
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 p-2">
                  <Link
                    href="/auth/login"
                    className={`block px-3 py-2 rounded-md text-base text-center ${navItemClass(
                      "/auth/login"
                    )}`}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block px-3 py-2 rounded-md text-base font-medium text-center text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile profile dropdown */}
      <AnimatePresence>
        {isProfileOpen && isAuthenticated && (
          <motion.div
            className="md:hidden absolute right-4 mt-1 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || "email@example.com"}
              </p>
            </div>
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center">
                <FaUser className="mr-2 h-4 w-4" /> Profile
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center">
                <FaSignOutAlt className="mr-2 h-4 w-4" /> Sign out
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
