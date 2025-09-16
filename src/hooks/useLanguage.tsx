import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.profile': 'Profile',
    'nav.friends': 'Find Friends',
    'nav.rooms': 'Study Rooms',
    'nav.signOut': 'Sign Out',

    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.error': 'Error',
    'common.success': 'Success',

    // Profile
    'profile.title': 'Profile',
    'profile.bio': 'Bio',
    'profile.interests': 'Interests',
    'profile.xp': 'XP Points',
    'profile.streak': 'Study Streak',
    'profile.level': 'Level',
    'profile.editBio': 'Edit Bio & Interests',
    'profile.addInterest': 'Add an interest...',
    'profile.noBio': 'No bio added yet. Click edit to add one!',
    'profile.noInterests': 'No interests added yet. Click edit to add some!',

    // Rooms
    'rooms.create': 'Create Room',
    'rooms.join': 'Join Room',
    'rooms.leave': 'Leave Room',
    'rooms.members': 'Members',
    'rooms.chat': 'Chat',
    'rooms.description': 'Description',
    'rooms.subject': 'Subject',
    'rooms.maxMembers': 'Max Members',
    'rooms.public': 'Public Room',
    'rooms.private': 'Private Room',

    // Friends
    'friends.title': 'Find Study Buddies',
    'friends.addFriend': 'Add Friend',
    'friends.removeFriend': 'Remove Friend',
    'friends.pending': 'Pending',
    'friends.accepted': 'Friends',
    'friends.online': 'Online',
    'friends.offline': 'Offline',

    // Messages
    'messages.typeMessage': 'Type a message...',
    'messages.send': 'Send',
    'messages.noMessages': 'No messages yet. Start the conversation!',
  },
  id: {
    // Navigation
    'nav.home': 'Beranda',
    'nav.profile': 'Profil',
    'nav.friends': 'Cari Teman',
    'nav.rooms': 'Ruang Belajar',
    'nav.signOut': 'Keluar',

    // Common
    'common.loading': 'Memuat...',
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.edit': 'Edit',
    'common.delete': 'Hapus',
    'common.confirm': 'Konfirmasi',
    'common.error': 'Error',
    'common.success': 'Berhasil',

    // Profile
    'profile.title': 'Profil',
    'profile.bio': 'Bio',
    'profile.interests': 'Minat',
    'profile.xp': 'Poin XP',
    'profile.streak': 'Streak Belajar',
    'profile.level': 'Level',
    'profile.editBio': 'Edit Bio & Minat',
    'profile.addInterest': 'Tambah minat...',
    'profile.noBio': 'Belum ada bio. Klik edit untuk menambahkan!',
    'profile.noInterests': 'Belum ada minat. Klik edit untuk menambahkan!',

    // Rooms
    'rooms.create': 'Buat Ruang',
    'rooms.join': 'Gabung Ruang',
    'rooms.leave': 'Keluar Ruang',
    'rooms.members': 'Anggota',
    'rooms.chat': 'Chat',
    'rooms.description': 'Deskripsi',
    'rooms.subject': 'Mata Pelajaran',
    'rooms.maxMembers': 'Maks Anggota',
    'rooms.public': 'Ruang Publik',
    'rooms.private': 'Ruang Privat',

    // Friends
    'friends.title': 'Cari Teman Belajar',
    'friends.addFriend': 'Tambah Teman',
    'friends.removeFriend': 'Hapus Teman',
    'friends.pending': 'Menunggu',
    'friends.accepted': 'Berteman',
    'friends.online': 'Online',
    'friends.offline': 'Offline',

    // Messages
    'messages.typeMessage': 'Ketik pesan...',
    'messages.send': 'Kirim',
    'messages.noMessages': 'Belum ada pesan. Mulai percakapan!',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language') as Language;
      if (stored) return stored;
      return navigator.language.startsWith('id') ? 'id' : 'en';
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageContext };
