import React from 'react';
import { User, Post, Notification, NotificationType, Platform, Conversation, Collaboration, IconCollection, Feedback, FriendRequest, FriendRequestStatus } from './types';

export const MASTER_USER_ID = 'u1';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Elena Voyage',
    username: 'bgcaptures',
    avatar: 'https://picsum.photos/id/1027/200/200',
    banner: 'https://picsum.photos/id/1015/1000/300',
    bio: 'Travel vlogger & photographer capturing the world one frame at a time. ✈️📸 Collabs open!',
    email: 'elena.voyage@example.com',
    isVerified: true,
    friendIds: ['u2', 'u3', 'u4'],
    platformLinks: [
        { platform: Platform.Instagram, url: 'https://instagram.com/elenavoyage' },
        { platform: Platform.TikTok, url: 'https://tiktok.com/@elenavoyage' }
    ],
    tags: ['Videographers', 'Photographers'],
    county: 'Los Angeles County',
    state: 'California',
    customLink: '',
    blockedUserIds: [],
  },
  {
    id: 'u2',
    name: 'Marcus Chef',
    username: 'marcuschef',
    avatar: 'https://picsum.photos/id/1005/200/200',
    banner: 'https://picsum.photos/id/1060/1000/300',
    bio: 'Michelin-star chef sharing recipes and kitchen secrets. Food is my love language. 🍳❤️',
    email: 'marcus.chef@example.com',
    isVerified: true,
    friendIds: ['u1'],
    platformLinks: [
        { platform: Platform.TikTok, url: 'https://tiktok.com/@marcuschef' },
        { platform: Platform.Instagram, url: 'https://instagram.com/marcuschef' }
    ],
    county: 'New York County',
    state: 'New York',
    customLink: '',
    blockedUserIds: [],
  },
  {
    id: 'u3',
    name: 'Aria Tech',
    username: 'aria_tech',
    avatar: 'https://picsum.photos/id/1011/200/200',
    banner: 'https://picsum.photos/id/2/1000/300',
    bio: 'Your go-to source for the latest in tech, gadgets, and gaming. Unboxing the future. 💻🎮',
    email: 'aria.tech@example.com',
    isVerified: false,
    friendIds: ['u1', 'u5'],
    platformLinks: [
        { platform: Platform.TikTok, url: 'https://tiktok.com/@aria_tech' },
        { platform: Platform.Twitch, url: 'https://twitch.tv/aria_tech' }
    ],
    county: 'Travis County',
    state: 'Texas',
    customLink: '',
    blockedUserIds: [],
  },
  {
    id: 'u4',
    name: 'Leo Fit',
    username: 'leofit',
    avatar: 'https://picsum.photos/id/1012/200/200',
    banner: 'https://picsum.photos/id/119/1000/300',
    bio: 'Fitness coach & motivator. Helping you become the best version of yourself. 💪 #fitness',
    email: 'leo.fit@example.com',
    isVerified: true,
    friendIds: ['u1'],
    platformLinks: [
        { platform: Platform.Instagram, url: 'https://instagram.com/leofit' },
        { platform: Platform.TikTok, url: 'https://tiktok.com/@leofit' }
    ],
    county: 'Miami-Dade County',
    state: 'Florida',
    customLink: '',
    blockedUserIds: [],
  },
  {
    id: 'u5',
    name: 'Chloe Glam',
    username: 'chloeglam',
    avatar: 'https://picsum.photos/id/1025/200/200',
    banner: 'https://picsum.photos/id/145/1000/300',
    bio: 'Beauty guru and makeup artist. All things glam and glitter. ✨💄',
    email: 'chloe.glam@example.com',
    isVerified: false,
    friendIds: ['u3'],
    platformLinks: [
        { platform: Platform.OnlyFans, url: 'https://onlyfans.com/chloeglam' },
        { platform: Platform.Instagram, url: 'https://instagram.com/chloeglam' }
    ],
    tags: ['Models'],
    customLink: '',
    blockedUserIds: [],
  }
];

export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
    { id: 'fr1', fromUserId: 'u5', toUserId: 'u1', status: FriendRequestStatus.PENDING, timestamp: '2024-07-21T11:00:00Z' }
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    authorId: 'u1',
    content: 'Just wrapped up my trip to Kyoto! The bamboo forests were absolutely breathtaking. Can\'t wait to share the final video with you all. Stay tuned! 🎋',
    image: 'https://picsum.photos/id/1018/800/600',
    timestamp: '2024-07-21T10:30:00Z',
    likes: 1205,
    comments: 88,
    tags: [Platform.YouTube, Platform.Instagram]
  },
  {
    id: 'p2',
    authorId: 'u2',
    content: 'Perfecting my signature pasta dish. The secret is in the sauce... and fresh basil from my garden! Recipe dropping on TikTok tomorrow. 🍝',
    image: 'https://picsum.photos/id/1080/800/600',
    timestamp: '2024-07-21T09:15:00Z',
    likes: 892,
    comments: 153,
    tags: [Platform.TikTok]
  },
  {
    id: 'p3',
    authorId: 'u3',
    content: 'Got my hands on the new Vision Pro. The future is here, and it is... heavy. Full review coming soon on my channel. What do you want to know about it?',
    image: 'https://picsum.photos/id/1/800/600',
    timestamp: '2024-07-20T18:00:00Z',
    likes: 2300,
    comments: 450,
    tags: [Platform.YouTube]
  },
  {
    id: 'p4',
    authorId: 'u5',
    content: 'Sunset vibes and glitter eyeshadow. This look was so much fun to create. Full tutorial is up for my subscribers! 💖',
    image: 'https://picsum.photos/id/152/800/600',
    timestamp: '2024-07-20T15:45:00Z',
    likes: 5600,
    comments: 720,
    tags: [Platform.OnlyFans, Platform.Instagram]
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
    { 
        id: 'n1', 
        userId: 'u1',
        actorId: 'u5',
        type: NotificationType.FRIEND_REQUEST,
        entityType: 'friend_request',
        entityId: 'fr1',
        message: 'Chloe Glam sent you a friend request.',
        timestamp: '2024-07-21T11:00:00Z', 
        isRead: false 
    },
    { 
        id: 'n2', 
        userId: 'u1',
        actorId: 'u2',
        type: NotificationType.POST_LIKE, 
        entityType: 'post',
        entityId: 'p1',
        message: 'Marcus Chef liked your post.',
        timestamp: '2024-07-21T10:35:00Z', 
        isRead: false 
    },
    { 
        id: 'n3',
        userId: 'u1',
        actorId: 'u4',
        type: NotificationType.COLLAB_REQUEST, 
        entityType: 'collaboration',
        entityId: 'collab1',
        message: 'Leo Fit is interested in your "Seeking Videographer" opportunity.',
        timestamp: '2024-07-20T09:00:00Z', 
        isRead: true 
    },
    { 
        id: 'n4', 
        userId: 'u1',
        actorId: 'u3',
        type: NotificationType.NEW_MESSAGE, 
        entityType: 'user',
        entityId: 'u3',
        message: 'You have a new message from Aria Tech.',
        timestamp: '2024-07-20T18:30:00Z', 
        isRead: false 
    },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: 'c1',
        participantIds: ['u1', 'u2'],
        messages: [
            { id: 'm1', senderId: 'u2', receiverId: 'u1', text: 'Hey Elena! Loved your Kyoto vlog teaser.', timestamp: '2024-07-21T12:05:00Z' },
            { id: 'm2', senderId: 'u1', receiverId: 'u2', text: 'Thanks Marcus! Your pasta looked amazing too. We should collab sometime!', timestamp: '2024-07-21T12:06:00Z' },
            { id: 'm3', senderId: 'u2', receiverId: 'u1', text: 'Absolutely! A travel & food series? Could be epic.', timestamp: '2024-07-21T12:07:00Z' },
        ],
        folder: 'general',
    },
    {
        id: 'c2',
        participantIds: ['u1', 'u3'],
        messages: [
            { id: 'm4', senderId: 'u3', receiverId: 'u1', text: 'Got any drone recommendations for travel?', timestamp: '2024-07-20T18:30:00Z' },
        ],
        folder: 'general',
    }
];

export const MOCK_COLLABORATIONS: Collaboration[] = [
    {
        id: 'collab1',
        authorId: 'u1',
        title: 'Seeking Videographer for Bali Travel Series',
        description: 'I\'m planning a 2-week trip to Bali to film a cinematic travel series for my YouTube channel. Looking for a skilled videographer and drone pilot to partner with. Must have experience with color grading. All expenses paid + rev share.',
        image: 'https://picsum.photos/id/431/800/600',
        timestamp: '2024-07-20T14:00:00Z',
        status: 'open',
        interestedUserIds: ['u2', 'u4'],
    },
    {
        id: 'collab2',
        authorId: 'u3',
        title: 'Co-host for Weekly Tech Podcast',
        description: 'Launching a new podcast covering the latest in AI, gadgets, and gaming news. I\'m looking for a knowledgeable and charismatic co-host to record weekly episodes with. Bonus points if you have an audio engineering background.',
        timestamp: '2024-07-19T11:20:00Z',
        status: 'open',
        interestedUserIds: [],
    },
    {
        id: 'collab3',
        authorId: 'u5',
        title: 'Makeup Artist for a Fantasy Photoshoot',
        description: 'I have a high-concept fantasy photoshoot idea and need a talented MUA who can do creative, avant-garde looks. The theme is "celestial beings". This is a paid gig, TFP considered for the right portfolio.',
        timestamp: '2024-07-18T18:00:00Z',
        status: 'closed',
        interestedUserIds: ['u1', 'u2', 'u3', 'u4'],
    },
];

export const MOCK_FEEDBACK: Feedback[] = [
    {
        id: 'f1',
        userId: 'u3',
        type: 'Bug Report',
        content: 'When I try to upload a banner image that is larger than 2MB, the app crashes on my iPhone 13. No error message is shown, it just closes.',
        timestamp: '2024-07-21T14:00:00Z'
    },
    {
        id: 'f2',
        userId: 'u2',
        type: 'Suggestion',
        content: 'It would be amazing if we could create polls in our posts! It would really help with engagement and getting feedback from my followers on what recipes to post next.',
        timestamp: '2024-07-20T09:30:00Z'
    },
     {
        id: 'f3',
        userId: 'u4',
        type: 'Suggestion',
        content: 'Can we get a "dark mode" toggle? The current theme is great, but a lighter option would be nice for daytime use.',
        timestamp: '2024-07-19T18:15:00Z'
    }
];

export const ICONS: IconCollection = {
  home: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  explore: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 10h6" /></svg>,
  collaborations: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  messages: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  notifications: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  search: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  verified: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-blue" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a.75.75 0 00-1.06-1.06L9 10.94l-1.72-1.72a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l3.75-3.75z" clipRule="evenodd" /></svg>,
  like: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  comment: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  share: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z" /></svg>,
  copy: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  send: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>,
  arrowLeft: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
  'Instagram': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
  'TikTok': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 448 512"><path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.25V349.4a162.6 162.6 0 1 1 -185-188.3v89.9A74.6 74.6 0 1 0 224 378.2V0h88a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z"/></svg>,
  'OnlyFans': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.75c1.035 0 1.875.84 1.875 1.875S13.035 7.5 12 7.5s-1.875-.84-1.875-1.875S10.965 3.75 12 3.75zm0 16.5c-4.556 0-8.25-3.694-8.25-8.25S7.444 3.75 12 3.75c.99 0 1.936.177 2.812.508l-5.32 5.32c-.331.977-.508 2.01-.508 3.088 0 4.556 3.694 8.25 8.25 8.25 1.078 0 2.11-.177 3.088-.508l-5.32-5.32A8.192 8.192 0 0 1 12 20.25z"></path></svg>,
  'YouTube': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>,
  'Twitch': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.149 0L.537 4.119v16.836h5.731V24h3.209l3.209-3.045h4.925L23.463 15V0H2.149zm18.284 13.642l-3.209 3.045h-4.925l-3.545 3.388v-3.388H3.582V2.045h16.851v11.597z"></path><path d="M15.075 5.164h2.149v6.119h-2.149V5.164zm-5.731 0h2.149v6.119H9.343V5.164z"></path></svg>,
  location: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  link: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.536a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  camera: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  plus: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  close: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  ellipsis: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" /></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  refresh: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 10.5M20 20l-1.5-1.5A9 9 0 013.5 13.5" /></svg>,
};