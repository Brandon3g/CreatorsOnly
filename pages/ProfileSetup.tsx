import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { US_COUNTIES_BY_STATE } from '../data/locations';

const ProfileSetup: React.FC = () => {
    const { registerAndSetup, cancelRegistration } = useAppContext();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [selectedState, setSelectedState] = useState('');
    const [selectedCounty, setSelectedCounty] = useState('');
    const [error, setError] = useState('');

    const BIO_LIMIT = 150;
    const availableTags = ["Model", "Photographer", "Videographer"];

    const states = Object.keys(US_COUNTIES_BY_STATE);
    const counties = selectedState ? US_COUNTIES_BY_STATE[selectedState] : [];

    useEffect(() => {
        // Ensure the registration page always starts at the top.
        window.scrollTo(0, 0);
    }, []);

    const handleTagToggle = (tag: string) => {
        setTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };
    
    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedState(e.target.value);
        setSelectedCounty(''); // Reset county when state changes
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const setupData = {
            username,
            password,
            name,
            email,
            bio,
            tags,
            state: selectedState,
            county: selectedCounty,
        };

        const success = registerAndSetup(setupData);
        if (!success) {
            setError('This username is already taken. Please choose another.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-lg p-8 space-y-6 bg-surface rounded-2xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary">Create Your Account</h1>
                    <p className="mt-2 text-text-secondary">Join the community for creators.</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                     <div>
                        <label htmlFor="username" className="block text-sm font-medium text-text-secondary">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-surface-light bg-surface-light rounded-md shadow-sm placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Your unique @username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-surface-light bg-surface-light rounded-md shadow-sm placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Choose a secure password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-text-secondary">
                            Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-surface-light bg-surface-light rounded-md shadow-sm placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Your display name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-surface-light bg-surface-light rounded-md shadow-sm placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary">
                            What kind of creator are you?
                        </label>
                        <p className="text-xs text-text-secondary mt-1">Select all that apply.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {availableTags.map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => handleTagToggle(tag)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                        tags.includes(tag)
                                            ? 'bg-primary text-white'
                                            : 'bg-surface-light text-text-primary hover:bg-gray-700'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">
                            Location (Recommended)
                        </label>
                         <div className="mt-2 flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <select
                                    id="state-select"
                                    value={selectedState}
                                    onChange={handleStateChange}
                                    className="w-full bg-surface-light p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">Select State</option>
                                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <select
                                    id="county-select"
                                    value={selectedCounty}
                                    onChange={(e) => setSelectedCounty(e.target.value)}
                                    disabled={!selectedState}
                                    className="w-full bg-surface-light p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select County</option>
                                    {counties.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <label htmlFor="bio" className="block text-sm font-medium text-text-secondary">
                            Bio (Recommended)
                        </label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-surface-light bg-surface-light rounded-md shadow-sm placeholder-text-secondary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm resize-none"
                            placeholder="Tell us about yourself..."
                            value={bio}
                            onChange={(e) => {
                                if (e.target.value.length <= BIO_LIMIT) {
                                    setBio(e.target.value);
                                }
                            }}
                        />
                        <span className="absolute bottom-2 right-2 text-xs text-text-secondary">
                            {bio.length}/{BIO_LIMIT}
                        </span>
                    </div>

                    {error && <p className="text-sm text-accent-red text-center">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={!username || !password || !name || !email || tags.length === 0}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover disabled:opacity-50"
                        >
                            Complete Setup & Join
                        </button>
                    </div>
                </form>

                <div className="text-sm text-center">
                    <span
                        onClick={cancelRegistration}
                        className="font-medium text-text-secondary hover:text-primary cursor-pointer"
                    >
                        Back to Login
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProfileSetup;