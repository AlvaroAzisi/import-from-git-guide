import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Lock } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Room } from '../../types/room';

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_public', true)
        .limit(20);

      if (error) {
        console.error('Error fetching rooms:', error);
      } else {
        setRooms(data as Room[]);
      }
      setLoading(false);
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="backdrop-blur-md bg-background/40 border border-border/50 rounded-2xl p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-muted/50 rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-4 bg-muted/50 rounded w-3/4 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-md bg-background/40 border border-border/50 rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-6 text-foreground">Public Rooms</h2>
      <div className="space-y-4">
        {rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Link to={`/ruangku/${room.id}`}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group backdrop-blur-sm bg-card/50 hover:bg-card/70 border border-border/50 rounded-xl p-5 transition-all duration-300 hover:shadow-xl"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {room.name}
                  </h3>
                  {!room.is_public && (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                  {room.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Study Room</span>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RoomList;
