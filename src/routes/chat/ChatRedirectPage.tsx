import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../integrations/supabase/client';
import { findOrCreateDirectChat } from '../../lib/friends';

/**
 * ChatRedirectPage - Resolves @username to chatId and redirects
 * Route: /chat/@:username
 */
export const ChatRedirectPage = () => {
  const { username } = useParams<{ username: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveUsernameToChat = async () => {
      if (!username || !user) return;

      try {
        // Find user by username
        const { data: targetUser, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.replace('@', ''))
          .single();

        if (userError || !targetUser) {
          setError('User not found');
          return;
        }

        // Find or create direct chat
        await findOrCreateDirectChat(targetUser.id);

        // Redirect to chat page
        navigate(`/chat/${targetUser.id}`, { replace: true });
      } catch (err: any) {
        console.error('Error resolving username to chat:', err);
        setError(err.message || 'Failed to load chat');
      } finally {
        setResolving(false);
      }
    };

    if (!loading && user) {
      resolveUsernameToChat();
    }
  }, [username, user, loading, navigate]);

  if (loading || resolving) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="backdrop-blur-md bg-card/50 rounded-3xl border border-border/20 shadow-lg p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground mt-4">Resolving chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center px-4">
        <div className="backdrop-blur-md bg-card/50 rounded-3xl border border-border/20 shadow-lg p-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => navigate('/chat')}
            className="px-6 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-medium transition-all"
          >
            Back to Chats
          </button>
        </div>
      </div>
    );
  }

  return null;
};
