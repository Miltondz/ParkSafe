import React, { useState, useEffect } from 'react';
import { MapPin, Users, MessageCircle, Settings, LogIn, User, TestTube, Home, ExternalLink, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import { useUserStore } from './stores/userStore';
import Map from './components/Map';
import PanicButton from './components/PanicButton';
import Auth from './components/Auth';
import EmergencyAlerts from './components/EmergencyAlerts';
import GroupManagement from './components/GroupManagement';
import UserProfile from './components/UserProfile';
import MessageCenter from './components/MessageCenter';
import TestDashboard from './components/TestDashboard';

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, setUser } = useUserStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to ParkSafe</h1>
              <p className="text-gray-600">Sign in to access safety features and stay connected.</p>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign In / Sign Up
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'map':
        return (
          <div className="flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex-1">
              <Map />
            </div>
            <MessageCenter />
          </div>
        );
      case 'groups':
        return <GroupManagement />;
      case 'profile':
        return <UserProfile />;
      case 'test':
        return <TestDashboard />;
      default:
        return <Map />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {user && (
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-screen-xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">ParkSafe</h1>
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
                <span>{user.email}</span>
              </button>
              
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsUserMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 relative">
        {renderContent()}
        {user && activeTab === 'map' && <PanicButton />}
        <EmergencyAlerts />
      </main>

      {/* Bottom Navigation */}
      {user && (
        <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-screen-xl mx-auto px-4">
            <div className="flex justify-around h-16">
              <button
                onClick={() => setActiveTab('map')}
                className={`flex flex-col items-center justify-center w-full ${
                  activeTab === 'map'
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Home className="w-6 h-6" />
                <span className="text-xs mt-1">Home</span>
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex flex-col items-center justify-center w-full ${
                  activeTab === 'groups'
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="text-xs mt-1">Groups</span>
              </button>
              <button
                onClick={() => setActiveTab('test')}
                className={`flex flex-col items-center justify-center w-full ${
                  activeTab === 'test'
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TestTube className="w-6 h-6" />
                <span className="text-xs mt-1">Test</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      <Auth isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <Toaster position="top-right" />
    </div>
  );
}

export default App;