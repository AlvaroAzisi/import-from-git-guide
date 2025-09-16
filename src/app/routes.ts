// Centralized route constants and navigation helpers
export const ROUTES = {
  HOME: '/home',
  WORK: '/rooms', // Study rooms listing
  ROOM: (id: string) => `/room/${id}`,
  RUANGKU: (id: string) => `/ruangku/${id}`, // User's own room view
  PROFILE: '/profile',
  PUBLIC_PROFILE: (username: string) => `/@${username}`,
  CHAT: '/chat',
  CHAT_USER: (username: string) => `/chat/@${username}`,
  CHAT_GROUP: (groupId: string) => `/chat/group/${groupId}`,
  FRIENDS: '/temanku',
  SETTINGS: '/settings',
  LOGIN: '/login',
  LANDING: '/',
  JOIN_CODE: (code: string) => `/join/${code}`,
} as const;

export type RouteKey = keyof typeof ROUTES;

// Navigation helpers
export const isRoomRoute = (path: string): boolean => {
  return path.startsWith('/room/') || path.startsWith('/ruangku/');
};

export const isProtectedRoute = (path: string): boolean => {
  const protectedPaths = [
    '/home',
    '/profile',
    '/rooms',
    '/chat',
    '/temanku',
    '/settings',
    '/room/',
    '/ruangku/',
  ];
  return protectedPaths.some((p) => path.startsWith(p));
};

export const isPublicRoute = (path: string): boolean => {
  return path === '/' || path === '/login' || path.startsWith('/@');
};

export const extractRoomId = (path: string): string | null => {
  const roomMatch = path.match(/\/(?:room|ruangku)\/([^/]+)/);
  return roomMatch ? roomMatch[1] : null;
};
