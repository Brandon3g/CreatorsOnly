import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Conversation, ConversationFolder, NotificationType } from '../types';
import { ICONS } from '../constants';

const Messages: React.FC = () => {
    const { 
        conversations, 
        currentUser, 
        getUserById, 
        selectedConversationId, 
        setSelectedConversationId, 
        sendMessage, 
        navigate, 
        moveConversationToFolder, 
        history, 
        goBack, 
        notifications, 
        markNotificationsAsRead 
    } = useAppContext();
    
    const [newMessage, setNewMessage] = useState('');
    const [activeFolder, setActiveFolder] = useState<ConversationFolder>('general');
    const [searchTerm, setSearchTerm] = useState('');
    const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
    
    const moveMenuRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    const hasOtherNotifications = notifications.some(n => n.userId === currentUser?.id && n.type !== NotificationType.NEW_MESSAGE && !n.isRead);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
                setIsMoveMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [selectedConversation?.messages]);

    useEffect(() => {
        if (!selectedConversationId || !currentUser) return;

        const conversation = conversations.find(c => c.id === selectedConversationId);
        if (!conversation) return;

        const otherParticipantId = conversation.participantIds.find(id => id !== currentUser.id);
        if (!otherParticipantId) return;

        const unreadIds = notifications
            .filter(n =>
                n.type === NotificationType.NEW_MESSAGE &&
                !n.isRead &&
                n.userId === currentUser.id &&
                n.actorId === otherParticipantId
            )
            .map(n => n.id);
        
        if (unreadIds.length > 0) {
            markNotificationsAsRead(unreadIds);
        }

    }, [selectedConversationId, currentUser, conversations, notifications, markNotificationsAsRead]);

    const filteredConversations = conversations
        .filter(c => c.folder === activeFolder)
        .filter(c => {
            if (!currentUser) return false;
            const otherParticipantId = c.participantIds.find(id => id !== currentUser.id);
            if (!otherParticipantId || currentUser.blockedUserIds?.includes(otherParticipantId)) return false;
            
            const otherUser = otherParticipantId ? getUserById(otherParticipantId) : null;
            if (!otherUser || otherUser.blockedUserIds?.includes(currentUser.id)) return false;

            if (!searchTerm) return true;
            return otherUser.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    
    const ConversationListItem: React.FC<{ conv: Conversation, isSelected: boolean }> = ({ conv, isSelected }) => {
        if (!currentUser) return null;
        const otherParticipantId = conv.participantIds.find(id => id !== currentUser.id);
        const otherUser = otherParticipantId ? getUserById(otherParticipantId) : null;
        if (!otherUser) return null;

        const lastMessage = conv.messages[conv.messages.length - 1];

        const isUnread = notifications.some(n => 
            n.type === NotificationType.NEW_MESSAGE &&
            !n.isRead &&
            n.userId === currentUser.id &&
            n.actorId === otherParticipantId
        );

        return (
            <div onClick={() => setSelectedConversationId(conv.id)} onTouchStart={() => setSelectedConversationId(conv.id)} className={`flex items-center space-x-3 p-3 cursor-pointer ${isSelected ? 'bg-surface-light' : 'hover:bg-surface-light/50'}`}>
                <img src={otherUser.avatar} alt={otherUser.name} className="w-12 h-12 rounded-full" />
                <div className="flex-1 overflow-hidden">
                    <p className="font-bold truncate">{otherUser.name}</p>
                    <p className={`text-sm truncate ${isUnread ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {lastMessage?.text || 'No messages yet'}
                    </p>
                </div>
                {isUnread && <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 ml-2"></div>}
            </div>
        );
    }
    
    const handleSendMessage = () => {
        if (newMessage.trim() && selectedConversationId && currentUser) {
            sendMessage(selectedConversationId, newMessage);
            setNewMessage('');
        }
    };
    
    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const handleMoveConversation = (folder: ConversationFolder) => {
        if (selectedConversationId) {
            moveConversationToFolder(selectedConversationId, folder);
        }
        setIsMoveMenuOpen(false);
    };

    const otherUser = selectedConversation && currentUser ? getUserById(selectedConversation.participantIds.find(id => id !== currentUser.id)!) : null;
    
    const FolderButton: React.FC<{ folder: ConversationFolder; label: string }> = ({ folder, label }) => (
        <button
            onClick={() => setActiveFolder(folder)}
            onTouchStart={() => {}}
            className={`flex-1 p-3 text-sm font-bold transition-colors ${activeFolder === folder ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex h-full">
            {/* Conversation List */}
            <div className={`w-full md:w-1/3 border-r border-surface-light flex-col main-content-mobile-padding ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                <header className="app-header flex items-center space-x-4">
                    {history.length > 1 && (
                        <button onClick={goBack} onTouchStart={() => {}} aria-label="Go back" className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2">
                            {ICONS.arrowLeft}
                        </button>
                    )}
                    <div className="flex-grow flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-primary lg:hidden">CreatorsOnly</h1>
                            <h1 className="hidden lg:block text-xl font-bold">Messages</h1>
                        </div>
                        <div className="flex md:hidden items-center space-x-4">
                            <button onClick={() => navigate('search')} onTouchStart={() => {}} aria-label="Search">{ICONS.search}</button>
                            <button onClick={() => navigate('notifications')} onTouchStart={() => {}} aria-label="Notifications" className="relative">
                                {ICONS.notifications}
                                {hasOtherNotifications && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent-red ring-2 ring-background" />}
                            </button>
                        </div>
                    </div>
                </header>

                <div className="p-2">
                     <div className="relative">
                        <input
                            type="text"
                            placeholder="Search messages"
                            className="w-full bg-surface-light border border-transparent rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                            {ICONS.search}
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-surface-light">
                    <FolderButton folder="contact_list" label="Contact List" />
                    <FolderButton folder="general" label="General" />
                    <FolderButton folder="hidden" label="Hidden" />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.map(conv => <ConversationListItem key={conv.id} conv={conv} isSelected={conv.id === selectedConversationId} />)}
                </div>
            </div>

            {/* Chat View */}
            <div className={`w-full md:w-2/3 flex-col main-content-mobile-padding ${selectedConversationId ? 'flex' : 'hidden md:flex'}`}>
                {selectedConversation && currentUser ? (
                    <>
                        <header className="app-header flex items-center space-x-3 justify-between">
                            <div className="flex items-center space-x-4">
                                <button className="md:hidden text-text-secondary" onTouchStart={() => {}} onClick={() => setSelectedConversationId(null)} aria-label="Back to conversations">
                                    {ICONS.arrowLeft}
                                </button>
                                <img src={otherUser?.avatar} className="w-10 h-10 rounded-full" alt={otherUser?.name} />
                                <h2 className="font-bold text-lg">{otherUser?.name}</h2>
                            </div>
                            <div className="relative" ref={moveMenuRef}>
                                <button onClick={() => setIsMoveMenuOpen(!isMoveMenuOpen)} onTouchStart={() => {}} className="text-text-secondary hover:text-text-primary">
                                    {ICONS.ellipsis}
                                </button>
                                {isMoveMenuOpen && (
                                    <div className="absolute top-8 right-0 bg-surface-light rounded-md shadow-lg z-10 w-48">
                                        {selectedConversation.folder !== 'contact_list' && <button onClick={() => handleMoveConversation('contact_list')} onTouchStart={() => {}} className="block w-full text-left px-4 py-2 text-sm hover:bg-surface">Move to Contact List</button>}
                                        {selectedConversation.folder !== 'general' && <button onClick={() => handleMoveConversation('general')} onTouchStart={() => {}} className="block w-full text-left px-4 py-2 text-sm hover:bg-surface">Move to General</button>}
                                        {selectedConversation.folder !== 'hidden' && <button onClick={() => handleMoveConversation('hidden')} onTouchStart={() => {}} className="block w-full text-left px-4 py-2 text-sm hover:bg-surface">Move to Hidden</button>}
                                    </div>
                                )}
                            </div>
                        </header>
                        <div ref={messagesContainerRef} className="flex-1 p-4 overflow-y-auto">
                           {selectedConversation.messages.length > 0 ? (
                             <div className="space-y-4">
                                {selectedConversation.messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.senderId === currentUser.id ? 'bg-primary text-white rounded-br-lg' : 'bg-surface-light rounded-bl-lg'}`}>
                                            <p>{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                             </div>
                           ) : (
                             <div className="h-full flex items-center justify-center text-text-secondary">
                                <p>This is the beginning of your conversation.</p>
                             </div>
                           )}
                        </div>
                        <div className="p-4 border-t border-surface-light">
                           <div className="relative">
                             <input 
                               type="text" 
                               placeholder="Start a new message" 
                               className="w-full bg-surface-light rounded-full py-3 pl-4 pr-12 focus:outline-none"
                               value={newMessage}
                               onChange={(e) => setNewMessage(e.target.value)}
                               onKeyPress={handleKeyPress}
                              />
                             <button 
                               className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                               onClick={handleSendMessage}
                               onTouchStart={() => {}}
                               disabled={!newMessage.trim()}
                               aria-label="Send Message"
                             >
                                {ICONS.send}
                             </button>
                           </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 items-center justify-center text-text-secondary hidden md:flex">
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;