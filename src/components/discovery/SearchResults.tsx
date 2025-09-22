import React from 'react';

interface SearchResultsProps {
  query: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ query }) => {
  if (!query) {
    return null;
  }

  const results = {
    rooms: [
      { id: '1', name: 'React Study Group' },
      { id: '2', name: 'TypeScript Enthusiasts' },
    ],
    friends: [
      { id: '1', username: 'friend1' },
      { id: '2', username: 'friend2' },
    ],
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Search Results for "{query}"</h2>
      <div>
        <h3 className="text-lg font-bold mb-2">Rooms</h3>
        <ul>
          {results.rooms.map(room => (
            <li key={room.id}>{room.name}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-bold mb-2">Friends</h3>
        <ul>
          {results.friends.map(friend => (
            <li key={friend.id}>{friend.username}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SearchResults;
