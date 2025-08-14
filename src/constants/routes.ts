// Route constants for consistent navigation across the app
export const ROUTES = {
  HOME: '/home',
  WORK: '/rooms', // Standardize "Work" to mean study rooms
  ROOMS: '/rooms',
  ROOM: (id: string) => `/ruangku/${id}`,
  CHAT: '/chat',
  FRIENDS: '/temanku',
  PROFILE: '/profile',
  PUBLIC_PROFILE: (username: string) => `/profile/${username}`,
  SETTINGS: '/settings',
  LOGIN: '/login',
  SIGNUP: '/signup'
} as const;

export type RouteKey = keyof typeof ROUTES;