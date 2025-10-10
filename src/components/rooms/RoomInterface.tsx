import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../integrations/supabase/client';
import { subscribeToRoomMessages } from '../../lib/supabaseRealtime';
import { getRoomMessages, sendMessage } from '../../lib/messages';
import type { Message } from '../../lib/messages';
import type { Room } from '../../types/room';
import { 
  Mic, MicOff, Video, VideoOff, Phone, Users, 
  MessageSquare, Settings, Send, Grid, LayoutGrid
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface RoomInterfaceProps {
  room: Room;
  onLeave?: () => void;
}

interface Member {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export const RoomInterface: React.FC<RoomInterfaceProps> = ({ room, onLeave }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchMembers();
    fetchMessages();
    const unsubscribe = subscribeToRoomMessages(room.id, handleNewMessage);
    return () => unsubscribe();
  }, [room.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('room_members')
      .select('profiles(id, username, full_name, avatar_url)')
      .eq('room_id', room.id);

    if (!error && data) {
      const memberProfiles = data.map(m => m.profiles).filter(Boolean) as Member[];
      setMembers(memberProfiles);
    }
  };

  const fetchMessages = async () => {
    const msgs = await getRoomMessages(room.id);
    setMessages(msgs);
  };

  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const success = await sendMessage(room.id, newMessage.trim());
    if (success) {
      setNewMessage('');
      chatInputRef.current?.focus();
    } else {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-background via-background/95 to-primary/5 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-16 border-b border-border/40 bg-background/60 backdrop-blur-xl px-6 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">{room.name}</h1>
              <p className="text-xs text-muted-foreground">{members.length} participants</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'speaker' : 'grid')}
            className="gap-2"
          >
            {viewMode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            <span className="hidden md:inline">{viewMode === 'grid' ? 'Grid' : 'Speaker'}</span>
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className={cn(
            "grid gap-4 h-full auto-rows-fr",
            viewMode === 'grid' 
              ? members.length === 1 ? "grid-cols-1" 
                : members.length === 2 ? "grid-cols-2"
                : members.length <= 4 ? "grid-cols-2"
                : members.length <= 6 ? "grid-cols-3"
                : "grid-cols-4"
              : "grid-cols-1"
          )}>
            {members.map((member, index) => (
              <div
                key={member.id}
                className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Video placeholder with glassmorphism */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
                
                {/* Avatar */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                    <img
                      src={member.avatar_url || `https://i.pravatar.cc/150?u=${member.id}`}
                      alt={member.username}
                      className="relative w-24 h-24 rounded-full object-cover border-4 border-primary/30 shadow-2xl"
                    />
                  </div>
                </div>

                {/* Name tag */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="bg-background/80 backdrop-blur-md rounded-lg px-3 py-2 border border-border/50 shadow-lg">
                    <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">@{member.username}</p>
                  </div>
                  {!isMicOn && (
                    <div className="bg-destructive/80 backdrop-blur-md rounded-full p-2">
                      <MicOff className="w-4 h-4 text-destructive-foreground" />
                    </div>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 lg:w-96 border-l border-border/40 bg-background/60 backdrop-blur-xl flex flex-col animate-slide-in-right">
            <div className="h-14 border-b border-border/40 px-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Chat</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                ✕
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 animate-fade-in",
                    msg.sender_id === user?.id ? "flex-row-reverse" : ""
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <img
                    src={msg.sender?.avatar_url || `https://i.pravatar.cc/40?u=${msg.sender_id}`}
                    alt={msg.sender?.username || 'User'}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className={cn(
                    "flex flex-col gap-1 max-w-[70%]",
                    msg.sender_id === user?.id ? "items-end" : ""
                  )}>
                    <p className="text-xs text-muted-foreground">
                      {msg.sender?.full_name || 'Unknown'}
                    </p>
                    <div className={cn(
                      "rounded-2xl px-4 py-2 backdrop-blur-md border shadow-sm",
                      msg.sender_id === user?.id
                        ? "bg-primary/90 text-primary-foreground border-primary/50"
                        : "bg-card/80 text-card-foreground border-border/50"
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border/40">
              <div className="relative">
                <textarea
                  ref={chatInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full bg-card/60 backdrop-blur-md border border-border/50 rounded-xl px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  rows={2}
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="absolute bottom-2 right-2 rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Participants Sidebar */}
        {showParticipants && !showChat && (
          <div className="w-80 border-l border-border/40 bg-background/60 backdrop-blur-xl animate-slide-in-right">
            <div className="h-14 border-b border-border/40 px-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Participants ({members.length})</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowParticipants(false)}>
                ✕
              </Button>
            </div>
            <div className="p-4 space-y-2">
              {members.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/40 backdrop-blur-md border border-border/30 hover:bg-card/60 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <img
                    src={member.avatar_url || `https://i.pravatar.cc/40?u=${member.id}`}
                    alt={member.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 border-t border-border/40 bg-background/80 backdrop-blur-xl px-6 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          <Button
            variant={isMicOn ? "default" : "destructive"}
            size="lg"
            onClick={() => setIsMicOn(!isMicOn)}
            className="rounded-full w-12 h-12 p-0 shadow-lg hover:scale-110 transition-transform"
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          <Button
            variant={isVideoOn ? "default" : "destructive"}
            size="lg"
            onClick={() => setIsVideoOn(!isVideoOn)}
            className="rounded-full w-12 h-12 p-0 shadow-lg hover:scale-110 transition-transform"
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showParticipants ? "default" : "outline"}
            size="lg"
            onClick={() => {
              setShowParticipants(!showParticipants);
              setShowChat(false);
            }}
            className="gap-2 rounded-xl shadow-lg hover:scale-105 transition-transform"
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">{members.length}</span>
          </Button>
          <Button
            variant={showChat ? "default" : "outline"}
            size="lg"
            onClick={() => {
              setShowChat(!showChat);
              setShowParticipants(false);
            }}
            className="gap-2 rounded-xl shadow-lg hover:scale-105 transition-transform"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="hidden sm:inline">Chat</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="lg"
            onClick={onLeave}
            className="gap-2 rounded-xl shadow-lg hover:scale-105 transition-transform"
          >
            <Phone className="w-5 h-5 rotate-135" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
