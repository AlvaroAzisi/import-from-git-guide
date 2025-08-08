import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';

interface RequestToJoinButtonProps {
  roomId: string;
  disabled?: boolean;
}

export const RequestToJoinButton: React.FC<RequestToJoinButtonProps> = ({ roomId, disabled }) => {
  const { toast } = useToast();
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check existing request
    const check = async () => {
      const { data } = await supabase
        .from('room_requests')
        .select('id, status')
        .eq('room_id', roomId)
        .maybeSingle();
      if (data && (data.status === 'pending' || data.status === 'accepted')) setRequested(true);
    };
    check();
  }, [roomId]);

  const handleRequest = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.from('room_requests').insert({ room_id: roomId });
      if (error) throw error;
      setRequested(true);
      toast({ title: 'Request sent', description: 'The admin will review your request shortly.' });
    } catch (e: any) {
      toast({ title: 'Unable to request', description: e.message || 'Please try again later.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className={`px-8 py-3 rounded-xl text-white ${requested ? 'bg-primary/60 cursor-default' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg'} transition-all`}
        onClick={handleRequest}
        disabled={disabled || requested || loading}
      >
        {requested ? (
          <span className="inline-flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Requested</span>
        ) : (
          <span className="inline-flex items-center gap-2"><Users className="w-4 h-4" /> Request to Join</span>
        )}
      </motion.button>
    </AnimatePresence>
  );
};
