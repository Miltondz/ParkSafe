import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

interface Alert {
  id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
  metadata?: {
    severity?: 'low' | 'medium' | 'high';
    location?: {
      lat: number;
      lng: number;
    };
  };
}

const EmergencyAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('emergency_alerts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'emergency_alerts' 
      }, handleNewAlert)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAlert = (payload: any) => {
    const newAlert = payload.new as Alert;
    
    setAlerts(prev => {
      const updated = [newAlert, ...prev].slice(0, 5);
      return Array.from(new Map(updated.map(alert => [alert.id, alert])).values());
    });
    
    toast((t) => (
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <div>
          <p className="font-semibold">Emergency Alert</p>
          <p className="text-sm">{newAlert.message || `New ${newAlert.type} alert`}</p>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-center',
    });
  };

  if (loading || !alerts.length) return null;

  return (
    <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 pt-4">
      <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-red-500">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-red-500">Emergency Alert</h3>
        </div>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-2 bg-red-50 rounded-md"
            >
              <p className="text-sm font-medium text-red-800">
                {alert.message || `${alert.type.replace('_', ' ')} alert`}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {new Date(alert.created_at).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencyAlerts;