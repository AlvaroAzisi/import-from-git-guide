import { 
  Home, 
  Users, 
  BookOpen, 
  User, 
  Settings,
  LogOut,
  MessageCircle
} from 'lucide-react';

export const sidebarMenuItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: BookOpen, label: 'Study Rooms', path: '/rooms' },
  { icon: MessageCircle, label: 'Messages', path: '/chat' },
  { icon: Users, label: 'Find Friends', path: '/temanku' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: LogOut, label: 'Sign Out', path: '/signout', variant: 'danger' as const },
];