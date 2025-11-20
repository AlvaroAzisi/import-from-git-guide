import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, UserX, Mail } from 'lucide-react';
import type { FriendRequest } from '../../lib/friends';

interface FriendRequestsInboxProps {
  requests: FriendRequest[];
  isOpen: boolean;
  onClose: () => void;
  onRespond: (requestId: string, accept: boolean, requesterId: string) => void;
}

export const FriendRequestsInbox: React.FC<FriendRequestsInboxProps> = ({
  requests,
  isOpen,
  onClose,
  onRespond,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Inbox Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-96 bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Friend Requests</h2>
                {requests.length > 0 && (
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    {requests.length}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Requests List */}
            <div className="p-4 space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">No pending friend requests</p>
                </div>
              ) : (
                requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="backdrop-blur-md bg-card/50 rounded-2xl border border-border/20 shadow-lg p-4 space-y-3"
                  >
                    {/* User Info */}
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          request.sender?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(request.sender?.full_name || 'User')}&background=random`
                        }
                        alt={request.sender?.full_name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-border/20"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">
                          {request.sender?.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          @{request.sender?.username}
                        </p>
                      </div>
                    </div>

                    {/* Message */}
                    {request.message && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm text-foreground italic">
                          "{request.message}"
                        </p>
                      </div>
                    )}


                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onRespond(request.id, true, request.sender_id)}
                        className="flex-1 py-2 px-4 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => onRespond(request.id, false, request.sender_id)}
                        className="flex-1 py-2 px-4 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <UserX className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
