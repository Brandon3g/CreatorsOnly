import React from 'react';
import {
  User,
  Post,
  Notification,
  NotificationType,
  Platform,
  Conversation,
  Collaboration,
  IconCollection,
  Feedback,
  FriendRequest,
  FriendRequestStatus,
} from './types';

/* ===========================
   MOCK DATA
   =========================== */

export const MASTER_USER_ID = 'u1';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Elena Voyage',
    username: 'bgcaptures',
    avatar: 'https://picsum.photos/id/1027/200/200',
    banner: 'https://picsum.photos/id/1015/1000/300',
    bio: 'Travel vlogger & photographer capturing the world one frame at a time.\n✈️ Collabs open!',
    email: 'elena.voyage@example.com',
    isVerified: true,
    friendIds: ['u2', 'u3', 'u4'],
    platformLinks: [
      { platform: Platform.Instagram, url: 'https://instagram.com/elenavoyage' },
      { platform: Platform.TikTok, url: 'https://tiktok.com/@elenavoyage' },
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
    bio: 'Michelin-star chef sharing recipes and kitchen secrets.\nFood is my love language.\n❤️',
    email: 'marcus.chef@example.com',
    isVerified: true,
    friendIds: ['u1'],
    platformLinks: [
      { platform: Platform.TikTok, url: 'https://tiktok.com/@marcuschef' },
      { platform: Platform.Instagram, url: 'https://instagram.com/marcuschef' },
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
    bio: 'Your go-to source for the latest in tech, gadgets, and gaming.\nUnboxing the future.\n',
    email: 'aria.tech@example.com',
    isVerified: false,
    friendIds: ['u1', 'u5'],
    platformLinks: [
      { platform: Platform.TikTok, url: 'https://tiktok.com/@aria_tech' },
      { platform: Platform.Twitch, url: 'https://twitch.tv/aria_tech' },
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
    bio: 'Fitness coach & motivator.\nHelping you become the best version of yourself.\n#fitness',
    email: 'leo.fit@example.com',
    isVerified: true,
    friendIds: ['u1'],
    platformLinks: [
      { platform: Platform.Instagram, url: 'https://instagram.com/leofit' },
      { platform: Platform.TikTok, url: 'https://tiktok.com/@leofit' },
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
    bio: 'Beauty guru and makeup artist.\nAll things glam and glitter.\n✨',
    email: 'chloe.glam@example.com',
    isVerified: false,
    friendIds: ['u3'],
    platformLinks: [
      { platform: Platform.OnlyFans, url: 'https://onlyfans.com/chloeglam' },
      { platform: Platform.Instagram, url: 'https://instagram.com/chloeglam' },
    ],
    tags: ['Models'],
    customLink: '',
    blockedUserIds: [],
  },
];

export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'fr1',
    fromUserId: 'u5',
    toUserId: 'u1',
    status: FriendRequestStatus.PENDING,
    timestamp: '2024-07-21T11:00:00Z',
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    authorId: 'u1',
    content:
      "Just wrapped up my trip to Kyoto! The bamboo forests were absolutely breathtaking.\nCan't wait to share the final video with you all. Stay tuned! ",
    image: 'https://picsum.photos/id/1018/800/600',
    timestamp: '2024-07-21T10:30:00Z',
    likes: 1205,
    comments: 88,
    tags: [Platform.YouTube, Platform.Instagram],
  },
  {
    id: 'p2',
    authorId: 'u2',
    content:
      'Perfecting my signature pasta dish. The secret is in the sauce... and fresh basil from my garden! Recipe dropping on TikTok tomorrow.\n',
    image: 'https://picsum.photos/id/1080/800/600',
    timestamp: '2024-07-21T09:15:00Z',
    likes: 892,
    comments: 153,
    tags: [Platform.TikTok],
  },
  {
    id: 'p3',
    authorId: 'u3',
    content:
      "Got my hands on the new Vision Pro. The future is here, and it is... heavy. Full review coming soon on my channel.\nWhat do you want to know about it?",
    image: 'https://picsum.photos/id/1/800/600',
    timestamp: '2024-07-20T18:00:00Z',
    likes: 2300,
    comments: 450,
    tags: [Platform.YouTube],
  },
  {
    id: 'p4',
    authorId: 'u5',
    content:
      'Sunset vibes and glitter eyeshadow. This look was so much fun to create.\nFull tutorial is up for my subscribers! ',
    image: 'https://picsum.photos/id/152/800/600',
    timestamp: '2024-07-20T15:45:00Z',
    likes: 5600,
    comments: 720,
    tags: [Platform.OnlyFans, Platform.Instagram],
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
    isRead: false,
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
    isRead: false,
  },
  {
    id: 'n3',
    userId: 'u1',
    actorId: 'u4',
    type: NotificationType.COLLAB_REQUEST,
    entityType: 'collaboration',
    entityId: 'collab1',
    message:
      'Leo Fit is interested in your "Seeking Videographer" opportunity.',
    timestamp: '2024-07-20T09:00:00Z',
    isRead: true,
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
    isRead: false,
  },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    participantIds: ['u1', 'u2'],
    messages: [
      {
        id: 'm1',
        senderId: 'u2',
        receiverId: 'u1',
        text: 'Hey Elena! Loved your Kyoto vlog teaser.',
        timestamp: '2024-07-21T12:05:00Z',
      },
      {
        id: 'm2',
        senderId: 'u1',
        receiverId: 'u2',
        text: 'Thanks Marcus! Your pasta looked amazing too.\nWe should collab sometime!',
        timestamp: '2024-07-21T12:06:00Z',
      },
      {
        id: 'm3',
        senderId: 'u2',
        receiverId: 'u1',
        text: 'Absolutely! A travel & food series? Could be epic.',
        timestamp: '2024-07-21T12:07:00Z',
      },
    ],
    folder: 'general',
  },
  {
    id: 'c2',
    participantIds: ['u1', 'u3'],
    messages: [
      {
        id: 'm4',
        senderId: 'u3',
        receiverId: 'u1',
        text: 'Got any drone recommendations for travel?',
        timestamp: '2024-07-20T18:30:00Z',
      },
    ],
    folder: 'general',
  },
];

export const MOCK_COLLABORATIONS: Collaboration[] = [
  {
    id: 'collab1',
    authorId: 'u1',
    title: 'Seeking Videographer for Bali Travel Series',
    description:
      "I'm planning a 2-week trip to Bali to film a cinematic travel series for my YouTube channel.\nLooking for a skilled videographer and drone pilot to partner with. Must have experience with color grading. All expenses paid + rev share.",
    image: 'https://picsum.photos/id/431/800/600',
    timestamp: '2024-07-20T14:00:00Z',
    status: 'open',
    interestedUserIds: ['u2', 'u4'],
  },
  {
    id: 'collab2',
    authorId: 'u3',
    title: 'Co-host for Weekly Tech Podcast',
    description:
      "Launching a new podcast covering the latest in AI, gadgets, and gaming news.\nI'm looking for a knowledgeable and charismatic co-host to record weekly episodes with. Bonus points if you have an audio engineering background.",
    timestamp: '2024-07-19T11:20:00Z',
    status: 'open',
    interestedUserIds: [],
  },
  {
    id: 'collab3',
    authorId: 'u5',
    title: 'Makeup Artist for a Fantasy Photoshoot',
    description:
      'I have a high-concept fantasy photoshoot idea and need a talented MUA who can do creative, avant-garde looks. The theme is "celestial beings".\nThis is a paid gig, TFP considered for the right portfolio.',
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
    content:
      'When I try to upload a banner image that is larger than 2MB, the app crashes on my iPhone 13.\nNo error message is shown, it just closes.',
    timestamp: '2024-07-21T14:00:00Z',
  },
  {
    id: 'f2',
    userId: 'u2',
    type: 'Suggestion',
    content:
      'It would be amazing if we could create polls in our posts! It would really help with engagement and getting feedback from my followers on what recipes to post next.',
    timestamp: '2024-07-20T09:30:00Z',
  },
  {
    id: 'f3',
    userId: 'u4',
    type: 'Suggestion',
    content:
      'Can we get a "dark mode" toggle? The current theme is great, but a lighter option would be nice for daytime use.',
    timestamp: '2024-07-19T18:15:00Z',
  },
];

/* ===========================
   ICONS (ReactNodes)
   =========================== */

const Svg = ({
  d,
  stroke = 'currentColor',
  fill = 'none',
  viewBox = '0 0 24 24',
}: {
  d: string;
  stroke?: string;
  fill?: string;
  viewBox?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    className="w-5 h-5 inline-block align-middle"
    fill={fill}
    stroke={stroke}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

export const ICONS: IconCollection = {
  // Nav
  home: <Svg d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4V12H9v11H5a2 2 0 0 1-2-2z" fill="none" />,
  explore: <Svg d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="none" />,
  collaborations: <Svg d="M8 12h8M12 8v8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" fill="none" />,
  messages: <Svg d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" fill="none" />,
  notifications: <Svg d="M6 8a6 6 0 1 1 12 0v6l2 2H4l2-2zM9 21h6" fill="none" />,
  search: <Svg d="M11 19a8 8 0 1 1 8-8M21 21l-4.35-4.35" fill="none" />,

  // Actions / status
  verified: <Svg d="M9 12l2 2 4-4M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" fill="none" />,
  like: <Svg d="M20.8 8.6a5.5 5.5 0 0 0-9.8-3.6L11 6l0 0-0-1C8.8 1.9 3.4 3.1 3.4 8.1 3.4 14 12 21 12 21s8.6-7 8.8-12.4z" fill="none" />,
  comment: <Svg d="M21 15a4 4 0 0 1-4 4H8l-4 4V7a4 4 0 0 1 4-4h9" fill="none" />,
  share: <Svg d="M4 12l8-6v4h8v4h-8v4z" fill="none" />,
  copy: <Svg d="M16 1H4a2 2 0 0 0-2 2v12m6-4h12a2 2 0 0 1 2 2v8H10a2 2 0 0 1-2-2z" fill="none" />,
  send: <Svg d="M22 2L11 13M22 2l-7 20-4-9-9-4z" fill="none" />,
  arrowLeft: <Svg d="M19 12H5M12 19l-7-7 7-7" fill="none" />,
  plus: <Svg d="M12 5v14M5 12h14" fill="none" />,
  close: <Svg d="M18 6L6 18M6 6l12 12" fill="none" />,
  ellipsis: <Svg d="M5 12h.01M12 12h.01M19 12h.01" fill="none" />,
  settings: <Svg d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.9 7.9 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7.9 7.9 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0-.1 1l-2 1.5 2 3.5 2.4-1a7.9 7.9 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.9 7.9 0 0 0 1.7-1l2.4 1 2-3.5z" fill="none" />,
  refresh: <Svg d="M21 12a9 9 0 1 1-2.65-6.36M21 4v8h-8" fill="none" />,

  // Social brand marks (simple)
  Instagram: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  TikTok: <Svg d="M16 3v3a5 5 0 0 0 5 5v3a8 8 0 1 1-8-8h3" fill="none" />,
  OnlyFans: <Svg d="M12 4a8 8 0 1 0 8 8V7h-3a5 5 0 0 1-5-5z" fill="none" />,
  YouTube: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M23 7.5a4 4 0 0 0-2.8-2.8C18.2 4.2 12 4.2 12 4.2s-6.2 0-8.2.5A4 4 0 0 0 1 7.5 41.6 41.6 0 0 0 .5 12 41.6 41.6 0 0 0 1 16.5a4 4 0 0 0 2.8 2.8c2 .5 8.2.5 8.2.5s6.2 0 8.2-.5A4 4 0 0 0 23 16.5 41.6 41.6 0 0 0 23.5 12 41.6 41.6 0 0 0 23 7.5zM10 15V9l6 3-6 3z" />
    </svg>
  ),
  Twitch: <Svg d="M4 3h16v10l-4 4h-4l-2 2H8v-2H4zM8 7h2v4H8V7zm6 0h2v4h-2V7z" fill="none" />,

  // Misc
  location: <Svg d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" fill="none" />,
  link: <Svg d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 1 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 1 1-7-7l1-1" fill="none" />,
  camera: <Svg d="M4 7h4l2-2h4l2 2h4v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" />,
};
