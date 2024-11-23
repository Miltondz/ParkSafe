import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { AlertTriangle, Send, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

interface UserLocation {
  id: string;
  email: string;
  full_name: string | null;
  location: {
    lat: number;
    lng: number;
    timestamp: number;
  };
}

const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const TestDashboard: React.FC = () => {
  const [message, setMessage] = useState('');
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUserStore();

  useEffect(() => {
    fetchUserLocations();
    const interval = setInterval(fetchUserLocations, 10000);

    // Subscribe to location updates
    const subscription = supabase
      .channel('location-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=neq.${user?.id}`
      }, () => {
        fetchUserLocations();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchUserLocations = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, location, last_active')
        .neq('id', user?.id)
        .not('location', 'is', null)
        .gte('last_active', new Date(Date.now() - 3600000).toISOString()); // Only active in last hour

      if (error) throw error;

      const activeUsers = profiles
        .filter(profile => profile.location)
        .map(profile => ({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          location: profile.location
        }));

      setUserLocations(activeUsers);
    } catch (error: any) {
      console.error('Error fetching user locations:', error);
    }
  };

  const broadcastEmergencyMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      // Send emergency message
      const { error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user?.id,
            content: message,
            type: 'emergency'
          }
        ]);

      if (messageError) throw messageError;

      // Create emergency alert
      const { error: alertError } = await supabase
        .from('emergency_alerts')
        .insert([
          {
            user_id: user?.id,
            type: 'broadcast',
            message: message,
            status: 'active'
          }
        ]);

      if (alertError) throw alertError;

      toast.success('Emergency broadcast sent successfully');
      setMessage('');
    } catch (error: any) {
      toast.error('Failed to send broadcast');
      console.error('Broadcast error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
          Emergency Broadcast Test
        </h2>
        
        <div className="space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter emergency broadcast message..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={4}
          />
          
          <button
            onClick={broadcastEmergencyMessage}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Emergency Broadcast
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Users className="w-6 h-6 text-indigo-500 mr-2" />
          Active Users Map ({userLocations.length} users)
        </h2>
        
        <div className="h-[500px] rounded-lg overflow-hidden">
          <MapContainer
            center={[35.6532, -83.5070]}
            zoom={11}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {userLocations.map((userLoc) => (
              <Marker
                key={userLoc.id}
                position={[userLoc.location.lat, userLoc.location.lng]}
                icon={customIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{userLoc.full_name || userLoc.email}</p>
                    <p className="text-gray-500">
                      Last updated: {new Date(userLoc.location.timestamp * 1000).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;