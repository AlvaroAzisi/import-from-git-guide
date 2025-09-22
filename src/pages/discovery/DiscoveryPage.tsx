import React from 'react';
import SearchBar from '../../components/discovery/SearchBar';
import SearchResults from '../../components/discovery/SearchResults';

const DiscoveryPage: React.FC = () => {
  const [query, setQuery] = React.useState('');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Discover Rooms & Friends</h1>
      <SearchBar onSearch={setQuery} />
      <div className="mt-4">
        <SearchResults query={query} />
      </div>
    </div>
  );
};

export default DiscoveryPage;
