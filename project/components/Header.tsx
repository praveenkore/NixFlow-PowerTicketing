import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { ChevronDownIcon, Cog6ToothIcon, ShieldCheckIcon, ArrowRightOnRectangleIcon, User as UserIcon, PlusIcon, MagnifyingGlassIcon } from './icons';

type View = 'DASHBOARD' | 'TICKET_LIST' | 'PROFILE' | 'ADMIN' | 'SLA_POLICIES' | 'SLA_POLICY_FORM' | 'SLA_POLICY_DETAIL' | 'SLA_METRICS' | 'SLA_BREACHES' | 'SLA_COMPLIANCE_REPORT' | 'SLA_DASHBOARD';

interface HeaderProps {
    currentUser: User;
    onLogout: () => void;
    onNavigate: (view: View) => void;
    onNewTicket: () => void;
    onSearch: (keyword: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onNavigate, onNewTicket, onSearch }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Debounced search handler - only triggers search after user stops typing for 300ms
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        // Set new timeout
        searchTimeoutRef.current = setTimeout(() => {
            onSearch(value);
        }, 300);
    }, [onSearch]);
    
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Trigger search immediately on form submit
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        onSearch(searchQuery);
    };

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center h-16">
                    {/* Left: Logo & Nav */}
                    <div className="flex items-center gap-8 flex-shrink-0">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => onNavigate('DASHBOARD')}>
                            Ticketing System
                        </h1>
                          <nav className="hidden md:flex items-center gap-4">
                            <button onClick={() => onNavigate('DASHBOARD')} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Dashboard</button>
                            <button onClick={() => onNavigate('TICKET_LIST')} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">All Tickets</button>
                            <button onClick={() => onNavigate('SLA_DASHBOARD')} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">SLA Dashboard</button>
                            <button onClick={() => onNavigate('SLA_POLICIES')} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">SLA Policies</button>
                            <button onClick={() => onNavigate('SLA_METRICS')} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">SLA Metrics</button>
                            <button onClick={() => onNavigate('SLA_BREACHES')} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">SLA Breaches</button>
                            <button onClick={() => onNavigate('SLA_COMPLIANCE_REPORT')} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">SLA Reports</button>
                        </nav>
                    </div>

                    {/* Middle: Search Bar */}
                    <div className="flex-1 flex justify-center px-8">
                        <div className="max-w-md w-full">
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="search"
                                    name="search"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Search tickets..."
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </form>
                        </div>
                    </div>

                    {/* Right: Actions & User Menu */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <button 
                            onClick={onNewTicket} 
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span className="hidden sm:inline">New Ticket</span>
                        </button>
                        
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200">{currentUser.name}</span>
                                <ChevronDownIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-30">
                                    <button onClick={() => { onNavigate('PROFILE'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                                        <Cog6ToothIcon className="h-5 w-5"/> Profile
                                    </button>
                                    {currentUser.role === Role.Admin && (
                                        <button onClick={() => { onNavigate('ADMIN'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                                            <ShieldCheckIcon className="h-5 w-5"/> Admin Panel
                                        </button>
                                    )}
                                    <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                                       <ArrowRightOnRectangleIcon className="h-5 w-5"/> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};