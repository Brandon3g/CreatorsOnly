import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import UserCard from '../components/UserCard';
import { US_COUNTIES_BY_STATE } from '../data/locations';

const Search: React.FC = () => {
  const { users, currentUser, history, goBack } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');

  const filters = ["Models", "Photographers", "Videographers"];
  const states = Object.keys(US_COUNTIES_BY_STATE);
  const counties = selectedState ? US_COUNTIES_BY_STATE[selectedState] : [];

  const handleFilterClick = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null); // Deselect if already active
    } else {
      setActiveFilter(filter);
    }
  };
  
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
    setSelectedCounty(''); // Reset county when state changes
  };

  const filteredUsers = users.filter(user => {
    if (!currentUser || user.id === currentUser.id) return false;

    // Block checks
    if (currentUser.blockedUserIds?.includes(user.id) || user.blockedUserIds?.includes(currentUser.id)) {
        return false;
    }

    const matchesSearchTerm = searchTerm === '' ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = !activeFilter || user.tags?.includes(activeFilter);
    
    const matchesState = !selectedState || user.state === selectedState;
    
    const matchesCounty = !selectedCounty || user.county === selectedCounty;

    return matchesSearchTerm && matchesTag && matchesState && matchesCounty;
  });

  return (
    <div>
      <header className="app-header">
        <div className="flex items-center space-x-4 mb-4 h-8">
            {history.length > 1 && (
                <button onClick={goBack} aria-label="Go back" className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2">
                    {ICONS.arrowLeft}
                </button>
            )}
            <div className="flex-grow">
                <h1 className="text-xl font-bold text-primary lg:hidden">CreatorsOnly</h1>
                <h1 className="hidden lg:block text-xl font-bold">Search</h1>
            </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search for creators by name or @username"
            className="w-full bg-surface-light border border-surface-light rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {ICONS.search}
          </div>
        </div>
      </header>
      
      <div className="p-4 flex flex-wrap gap-2 border-b border-surface-light">
          {filters.map(filter => (
              <button 
                  key={filter}
                  onClick={() => handleFilterClick(filter)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      activeFilter === filter 
                      ? 'bg-primary text-white' 
                      : 'bg-surface-light text-text-secondary hover:bg-surface'
                  }`}
              >
                  {filter}
              </button>
          ))}
      </div>
      
      <div className="p-4 flex flex-col sm:flex-row gap-4 border-b border-surface-light">
        <div className="flex-1">
            <label htmlFor="state-select" className="block text-sm font-medium text-text-secondary mb-1">State</label>
            <select
                id="state-select"
                value={selectedState}
                onChange={handleStateChange}
                className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        <div className="flex-1">
            <label htmlFor="county-select" className="block text-sm font-medium text-text-secondary mb-1">County</label>
            <select
                id="county-select"
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                disabled={!selectedState}
                className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option value="">All Counties</option>
                {counties.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      <div className="mt-4">
        {(searchTerm || activeFilter || selectedState) ? (
            filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                    <UserCard key={user.id} user={user} />
                ))
            ) : (
                <p className="p-4 text-center text-text-secondary">No creators found.</p>
            )
        ) : (
            <p className="p-4 text-center text-text-secondary">Use the search bar or filters to find creators.</p>
        )}
      </div>
    </div>
  );
};

export default Search;