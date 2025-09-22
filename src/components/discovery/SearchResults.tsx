import React, { useState, useEffect } from 'react';
import { searchRooms, searchFriends } from '../../lib/discovery';
import type { Room } from '../../types/room';
import type { UserProfile } from '../../lib/auth';

interface SearchResultsProps {
  query: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ query }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setRooms([]);
        setFriends([]);
        return;
      }

      setLoading(true);
      const [roomResults, friendResults] = await Promise.all([
        searchRooms(query),
        searchFriends(query),
      ]);

      setRooms(roomResults);
      setFriends(friendResults);
      setLoading(false);
    };

    const handler = setTimeout(() => {
      fetchResults();
    }, 300); // Debounce search

    return () => clearTimeout(handler);
  }, [query]);

  if (!query) {
    return null;
  }

  if (loading) {
    return <div>Searching...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Search Results for "{query}"</h2>
      <div>
        <h3 className="text-lg font-bold mb-2">Rooms</h3>
        {rooms.length === 0 ? (
          <p>No rooms found.</p>
        ) : (
          <ul>
            {rooms.map(room => (
              <li key={room.id}>{room.name}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-bold mb-2">Friends</h3>
        {friends.length === 0 ? (
          <p>No friends found.</p>
        ) : (
          <ul>
            {friends.map(friend => (
              <li key={friend.id}>{friend.username}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
