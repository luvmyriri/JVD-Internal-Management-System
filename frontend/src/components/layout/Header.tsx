import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getInitials, getAvatarUrl } from '../../utils';
import client from '../../api/client';
import { 
  LuBell, 
  LuChevronDown, 
  LuLogOut, 
  LuUser, 
  LuSettings, 
  LuInfo, 
  LuCheck, 
  LuX, 
  LuInbox,
  LuExternalLink,
  LuTriangleAlert,
  LuCircleAlert,
  LuMessageCircle,
  LuSearch,
  LuSend,
  LuMinus
} from 'react-icons/lu';
import { useState, useEffect, useRef } from 'react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
}

interface MessageDetail {
  id: string;
  sender: 'user' | 'peer';
  text: string;
  time: string;
  status: 'sent' | 'delivered' | 'seen';
}

interface MessageItem {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderInitials: string;
  senderColor: string;
  time: string;
  read: boolean;
  online: boolean;
  typing?: boolean;
  messages: MessageDetail[];
}


export default function Header() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  const [messagesOpen, setMessagesOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [activeChats, setActiveChats] = useState<Array<{ id: string; minimized: boolean }>>([]);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'msg-1',
      senderName: 'Lamsen (Procurement)',
      senderInitials: 'VL',
      senderColor: 'from-purple-500 to-indigo-500',
      time: '2 mins ago',
      read: false,
      online: true,
      typing: false,
      messages: [
        {
          id: '1',
          sender: 'peer',
          text: 'Hey Emman, I just uploaded the new bus fleet report. Can you verify the pricing fields?',
          time: '2 mins ago',
          status: 'seen'
        }
      ]
    },
    {
      id: 'msg-2',
      senderName: 'Val (Operations)',
      senderInitials: 'VM',
      senderColor: 'from-pink-500 to-rose-500',
      time: '25 mins ago',
      read: false,
      online: true,
      typing: false,
      messages: [
        {
          id: '1',
          sender: 'peer',
          text: 'The login page branding looks amazing! The glowing JVD logo is a really great touch.',
          time: '25 mins ago',
          status: 'seen'
        }
      ]
    },
    {
      id: 'msg-3',
      senderName: 'Greg (Accounting)',
      senderInitials: 'GC',
      senderColor: 'from-amber-500 to-orange-500',
      time: '2 hours ago',
      read: true,
      online: false,
      typing: false,
      messages: [
        {
          id: '1',
          sender: 'peer',
          text: 'Can we check the POS billing discount calculation tomorrow morning? I noticed a small discrepancy.',
          time: '2 hours ago',
          status: 'seen'
        }
      ]
    },
    {
      id: 'msg-4',
      senderName: 'System Administrator',
      senderInitials: 'SA',
      senderColor: 'from-blue-500 to-cyan-500',
      time: '1 day ago',
      read: true,
      online: true,
      typing: false,
      messages: [
        {
          id: '1',
          sender: 'peer',
          text: 'Your system access permissions have been updated to Full Administrator role.',
          time: '1 day ago',
          status: 'seen'
        }
      ]
    }
  ]);

  const unreadMessagesCount = messages.filter(m => !m.read).length;

  const handleMarkAllMessagesRead = () => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  };

  const handleMessageClick = (msg: MessageItem) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
    
    setActiveChats(prev => {
      if (prev.some(c => c.id === msg.id)) {
        return prev.map(c => c.id === msg.id ? { ...c, minimized: false } : c);
      }
      const filtered = prev.filter(c => c.id !== msg.id);
      if (filtered.length >= 3) {
        filtered.shift();
      }
      return [...filtered, { id: msg.id, minimized: false }];
    });
    setMessagesOpen(false);
  };

  const playMessageSound = (isIncoming: boolean) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (isIncoming) {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(650, ctx.currentTime);
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.35);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.45);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const getMockResponse = (peerId: string, userMessage: string): string => {
    const msg = userMessage.toLowerCase();
    if (peerId === 'msg-1') {
      if (msg.includes('verify') || msg.includes('bus') || msg.includes('fleet') || msg.includes('check') || msg.includes('price')) {
        return "Awesome, thanks for checking that! Let me know if everything matches the invoice.";
      }
      return "Got it! I am finalizing the procurement logs right now. I will be online if you need anything else.";
    }
    if (peerId === 'msg-2') {
      if (msg.includes('logo') || msg.includes('branding') || msg.includes('nice') || msg.includes('thanks') || msg.includes('amazing')) {
        return "Totally! It cycles through the JVD brand colors really nicely now. Glad you liked it!";
      }
      return "Absolutely, Emman! Let's catch up in the afternoon sync to review the next portal updates.";
    }
    if (peerId === 'msg-3') {
      if (msg.includes('pos') || msg.includes('billing') || msg.includes('discount') || msg.includes('price') || msg.includes('check')) {
        return "Yes, exactly! Let's double check the calculations together tomorrow. I'll prepare the report.";
      }
      return "Great! Talk to you tomorrow morning, let's keep the transaction registry accurate.";
    }
    return "System log: Command executed successfully. All permissions are operating within standard authorization levels.";
  };

  const handleSendMessage = (msgId: string, text: string) => {
    if (!text.trim()) return;

    const newMsgId = Math.random().toString(36).substring(7);
    const newMsg: MessageDetail = {
      id: newMsgId,
      sender: 'user',
      text,
      time: 'Just now',
      status: 'sent'
    };

    playMessageSound(false);

    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          time: 'Just now',
          messages: [...m.messages, newMsg]
        };
      }
      return m;
    }));

    setTimeout(() => {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            messages: m.messages.map(item => item.id === newMsgId ? { ...item, status: 'delivered' } : item)
          };
        }
        return m;
      }));
    }, 600);

    setTimeout(() => {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            messages: m.messages.map(item => item.id === newMsgId ? { ...item, status: 'seen' } : item)
          };
        }
        return m;
      }));
    }, 1200);

    setTimeout(() => {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return { ...m, typing: true };
        }
        return m;
      }));
    }, 1800);

    setTimeout(() => {
      playMessageSound(true);

      const peerResponse: MessageDetail = {
        id: Math.random().toString(36).substring(7),
        sender: 'peer',
        text: getMockResponse(msgId, text),
        time: 'Just now',
        status: 'seen'
      };

      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            typing: false,
            messages: [...m.messages, peerResponse]
          };
        }
        return m;
      }));
    }, 3500);
  };



  const fetchNotifications = async () => {
    try {
      const response = await client.get('/notifications');
      if (response.data?.success) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Live poll every 15 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await client.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await client.delete('/notifications');
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await client.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await client.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss notification', error);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    setNotificationsOpen(false);
    setSelectedNotification(notification);
  };



  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const initials = getInitials(user.first_name, user.last_name);

  // Determine page title and subtitle based on path
  const getPageContext = () => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return {
        title: 'Dashboard',
        subtitle: `Welcome back, ${user.first_name} ${user.last_name}. Here's what's happening.`
      };
    }

    if (path === '/profile') {
      return {
        title: 'Account Settings',
        subtitle: 'Manage your personal information and preferences.'
      };
    }
    
    // Map other paths (simplified)
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return { title: '', subtitle: '' };

    if (path.startsWith('/travel/customers/') && !isNaN(Number(segments[segments.length - 1]))) {
      return {
        title: 'Customer Profile',
        subtitle: 'Management / Travel'
      };
    }

    const format = (s: string) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    return {
      title: format(segments[segments.length - 1]),
      subtitle: segments.length > 1 ? `Management / ${format(segments[0])}` : 'Internal Management System'
    };
  };

  const { title, subtitle } = getPageContext();

  return (
    <>
    <header className={`h-16 border-b flex items-center justify-between px-8 ml-64 fixed top-0 right-0 left-0 z-40 transition-colors ${
      theme === 'dark' 
        ? 'bg-gray-900 border-gray-800' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Left: page context */}
      <div className="flex flex-col">
        <h1 className={`text-lg font-bold leading-none tracking-tight ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-[11px] mt-1 font-medium truncate max-w-[400px] ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-3">
        {/* Messages Dropdown */}
        <div className="relative">
          <button
            id="header-messages"
            onClick={() => setMessagesOpen(!messagesOpen)}
            className={`relative p-2 rounded-xl transition ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Messages"
          >
            <LuMessageCircle className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {messagesOpen && (
            <>
              {/* Overlay background to dismiss dropdown when clicking outside */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMessagesOpen(false)}
              />
              
              {/* Dropdown Card */}
              <div className={`absolute right-0 mt-3 w-96 rounded-2xl border shadow-xl z-20 overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-gray-900 border-gray-800 text-white' 
                  : 'bg-white border-gray-100 text-slate-800'
              }`}>
                {/* Header */}
                <div className={`p-4 border-b flex flex-col gap-3.5 ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm uppercase tracking-wide">Chats</h3>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{unreadMessagesCount} unread message{unreadMessagesCount !== 1 ? 's' : ''}</p>
                    </div>
                    {unreadMessagesCount > 0 && (
                      <button
                        onClick={handleMarkAllMessagesRead}
                        className="text-xs text-blue-600 hover:text-blue-500 font-bold tracking-wide uppercase transition"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative flex items-center">
                    <LuSearch className="absolute left-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      placeholder="Search messages..."
                      className={`w-full text-xs pl-9 pr-3.5 py-2 rounded-xl outline-none border transition ${
                        theme === 'dark' 
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' 
                          : 'bg-gray-50 border-gray-200 text-slate-800 placeholder-gray-400 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {messages.filter(m => 
                    m.senderName.toLowerCase().includes(messageSearch.toLowerCase()) ||
                    (m.messages[m.messages.length - 1]?.text || '').toLowerCase().includes(messageSearch.toLowerCase())
                  ).length > 0 ? (
                    messages.filter(m => 
                      m.senderName.toLowerCase().includes(messageSearch.toLowerCase()) ||
                      (m.messages[m.messages.length - 1]?.text || '').toLowerCase().includes(messageSearch.toLowerCase())
                    ).map(msg => {
                      const lastMessage = msg.messages[msg.messages.length - 1];
                      return (
                        <div
                          key={msg.id}
                          onClick={() => handleMessageClick(msg)}
                          className={`p-4 flex gap-3.5 relative group cursor-pointer transition ${
                            !msg.read 
                              ? (theme === 'dark' ? 'bg-blue-950/10 hover:bg-blue-950/20' : 'bg-blue-50/25 hover:bg-blue-50/45')
                              : (theme === 'dark' ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50')
                          }`}
                        >
                          {/* Left Avatar Badge */}
                          <div className="relative shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-tr ${msg.senderColor}`}>
                              {msg.senderInitials}
                            </div>
                            {msg.online && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                            )}
                          </div>

                          {/* Message Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className={`text-xs truncate ${msg.read ? 'text-gray-500 dark:text-gray-400 font-semibold' : 'text-slate-900 dark:text-white font-black'}`}>{msg.senderName}</p>
                              <p className="text-[9px] text-gray-400 dark:text-gray-550 shrink-0 font-medium">{msg.time}</p>
                            </div>
                            <p className={`text-[11px] mt-1 leading-normal truncate ${msg.read ? 'text-gray-400 dark:text-gray-500 font-medium' : 'text-slate-850 dark:text-gray-200 font-bold'}`}>{lastMessage?.text || 'No messages'}</p>
                          </div>

                          {/* Unread dot */}
                          {!msg.read && (
                            <div className="flex items-center shrink-0 pl-1.5">
                              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    /* Empty State */
                    <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-350 dark:text-gray-500">
                        <LuInbox className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">No chats found</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-1 leading-normal">No messages match your search filter.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Control Bar */}
                <div className={`p-3 border-t bg-gray-50/50 dark:bg-gray-950/30 flex items-center justify-center ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                  <button
                    onClick={() => {
                      setMessagesOpen(false);
                    }}
                    className="w-full py-2 px-3 text-center text-[10px] font-bold text-blue-600 hover:text-blue-500 uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Open Messages in Chat
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notification Bell & Dropdown */}
        <div className="relative">
          <button
            id="header-notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={`relative p-2 rounded-xl transition ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Notifications"
          >
            <LuBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <>
              {/* Overlay background to dismiss dropdown when clicking outside */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotificationsOpen(false)}
              />
              
              {/* Dropdown Card */}
              <div className={`absolute right-0 mt-3 w-96 rounded-2xl border shadow-xl z-20 overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-gray-900 border-gray-800 text-white' 
                  : 'bg-white border-gray-100 text-slate-800'
              }`}>
                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">Notifications</h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:text-blue-500 font-bold tracking-wide uppercase transition"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Notifications Scroll Area */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {notifications.length > 0 ? (
                    notifications.map(n => {
                      // Icon & Accent Color styling mapping
                      let Icon = LuInfo;
                      let iconColor = 'text-blue-500 bg-blue-50 dark:bg-blue-950/40';
                      
                      if (n.type === 'success') {
                        Icon = LuCheck;
                        iconColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
                      } else if (n.type === 'warning') {
                        Icon = LuInfo;
                        iconColor = 'text-amber-500 bg-amber-50 dark:bg-amber-950/40';
                      } else if (n.type === 'error') {
                        Icon = LuInfo;
                        iconColor = 'text-red-500 bg-red-50 dark:bg-red-950/40';
                      }

                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-4 flex gap-3.5 relative group cursor-pointer transition ${
                            !n.read 
                              ? (theme === 'dark' ? 'bg-blue-950/10 hover:bg-blue-950/20' : 'bg-blue-50/20 hover:bg-blue-50/40')
                              : (theme === 'dark' ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50')
                          }`}
                        >
                          {/* Left Icon Badge */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Message Body */}
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-xs font-bold truncate ${n.read ? 'text-gray-500 dark:text-gray-400' : 'text-slate-900 dark:text-white'}`}>{n.title}</p>
                              {!n.read && (
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal font-medium">{n.message}</p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-550 mt-1.5 font-semibold">{n.time}</p>
                          </div>

                          {/* Hover Action: Dismiss Button */}
                          <button
                            onClick={(e) => handleDismiss(n.id, e)}
                            className="absolute right-3.5 top-3.5 p-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Dismiss notification"
                          >
                            <LuX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    /* Empty State */
                    <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-350 dark:text-gray-500">
                        <LuInbox className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">All caught up!</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-1 leading-normal">You have no new inbox notifications.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Control Bar */}
                <div className={`p-3 border-t bg-gray-50/50 dark:bg-gray-950/30 flex items-center justify-between gap-2.5 ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                  <button
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                    className="w-full py-2 px-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-550 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 disabled:hover:text-gray-400 uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            id="header-user-menu"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center shrink-0">
              {user.avatar_url ? (
                <img src={getAvatarUrl(user.avatar_url) || ''} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{initials}</span>
              )}
            </div>
            {/* Role Display */}
            <div className="hidden sm:block text-right mr-1">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                {user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">Authorized Session</p>
            </div>
            <LuChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border z-20 py-1 overflow-hidden ${
                theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
              }`}>
                <div className={`px-4 py-3 border-b ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{user.first_name} {user.last_name}</p>
                  <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{user.email}</p>
                </div>
                <button
                  id="header-profile"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <LuUser className="w-4 h-4 text-blue-600" />
                  My Profile
                </button>
                <button
                  id="header-settings"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/admin/settings');
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                    theme === 'dark' 
                      ? 'text-gray-300 hover:bg-gray-800' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LuSettings className="w-4 h-4 text-blue-600" />
                  Settings
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  id="header-logout"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LuLogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

    {/* Notification Detail Modal */}
    {selectedNotification && (
      <NotificationModal
        notification={selectedNotification}
        theme={theme}
        onClose={() => setSelectedNotification(null)}
        onNavigate={(link) => {
          setSelectedNotification(null);
          navigate(link);
        }}
      />
    )}

    {/* Floating Facebook PC-style Chat Windows */}
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-3 pointer-events-none">
      {activeChats.map(c => {
        const msgThread = messages.find(m => m.id === c.id);
        if (!msgThread) return null;
        return (
          <FloatingChatWindow
            key={c.id}
            thread={msgThread}
            theme={theme}
            minimized={c.minimized}
            onMinimize={() => {
              setActiveChats(prev => prev.map(chat => chat.id === c.id ? { ...chat, minimized: !chat.minimized } : chat));
            }}
            onClose={() => {
              setActiveChats(prev => prev.filter(chat => chat.id !== c.id));
            }}
            onSendMessage={(text) => handleSendMessage(c.id, text)}
          />
        );
      })}
    </div>
    </>
  );
}

/* ─── Notification Detail Modal ─────────────────────────── */
function NotificationModal({
  notification,
  theme,
  onClose,
  onNavigate,
}: {
  notification: NotificationItem;
  theme: string;
  onClose: () => void;
  onNavigate: (link: string) => void;
}) {
  const typeConfig = {
    info:    { Icon: LuInfo,          bg: 'bg-blue-50 dark:bg-blue-950/40',    icon: 'text-blue-500',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',    label: 'Info' },
    success: { Icon: LuCheck,         bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300', label: 'Success' },
    warning: { Icon: LuTriangleAlert, bg: 'bg-amber-50 dark:bg-amber-950/40',  icon: 'text-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',   label: 'Warning' },
    error:   { Icon: LuCircleAlert,   bg: 'bg-red-50 dark:bg-red-950/40',      icon: 'text-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',         label: 'Alert' },
  };

  const { Icon, bg, icon, badge, label } = typeConfig[notification.type] ?? typeConfig.info;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
          theme === 'dark'
            ? 'bg-gray-900 border-gray-800 text-white'
            : 'bg-white border-gray-100 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <LuX className="w-4 h-4" />
        </button>

        {/* Top Section: Icon + Badge */}
        <div className={`px-6 pt-6 pb-5 flex items-start gap-4`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon className={`w-6 h-6 ${icon}`} />
          </div>
          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badge}`}>
                {label}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold">{notification.time}</span>
            </div>
            <h2 className={`text-base font-bold leading-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {notification.title}
            </h2>
          </div>
        </div>

        {/* Divider */}
        <div className={`mx-6 border-t ${ theme === 'dark' ? 'border-gray-800' : 'border-gray-100' }`} />

        {/* Message Body */}
        <div className="px-6 py-5">
          <p className={`text-sm leading-relaxed ${ theme === 'dark' ? 'text-gray-300' : 'text-gray-600' }`}>
            {notification.message}
          </p>
        </div>

        {/* Footer Actions */}
        <div className={`px-6 pb-6 flex items-center gap-3 ${ notification.link ? 'justify-between' : 'justify-end' }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              theme === 'dark'
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            Dismiss
          </button>
          {notification.link && (
            <button
              onClick={() => onNavigate(notification.link!)}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition active:scale-[0.98]"
            >
              <LuExternalLink className="w-3.5 h-3.5" />
              Go to Page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Floating Facebook PC-style Chat Window ───────── */
interface FloatingChatWindowProps {
  thread: MessageItem;
  theme: string;
  minimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onSendMessage: (text: string) => void;
}

function FloatingChatWindow({
  thread,
  theme,
  minimized,
  onMinimize,
  onClose,
  onSendMessage
}: FloatingChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!minimized) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread.messages, thread.typing, minimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div
      className={`w-76 flex flex-col border shadow-2xl rounded-t-2xl transition-all duration-200 pointer-events-auto shrink-0 select-none overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white shadow-black/40' : 'bg-white border-gray-200 text-slate-800 shadow-slate-300/40'
      } ${minimized ? 'h-11' : 'h-[380px]'}`}
    >
      {/* Header Bar */}
      <div
        onClick={onMinimize}
        className={`h-11 px-3.5 flex items-center justify-between cursor-pointer select-none ${
          theme === 'dark' ? 'bg-gray-950/70 border-b border-gray-800' : 'bg-slate-100/90 border-b border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 max-w-[70%]">
          <div className="relative shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-tr ${thread.senderColor}`}>
              {thread.senderInitials}
            </div>
            {thread.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-950 rounded-full" />
            )}
          </div>
          <span className="text-xs font-bold truncate leading-none">{thread.senderName}</span>
        </div>

        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={onMinimize}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-slate-200/50 dark:hover:bg-gray-800/60 transition cursor-pointer"
            title={minimized ? "Restore Chat" : "Minimize Chat"}
          >
            <LuMinus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
            title="Close Chat"
          >
            <LuX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-gray-50/50 dark:bg-gray-950/20 max-h-[285px]">
            {thread.messages.map((item, idx) => {
              const isUser = item.sender === 'user';
              const showStatus = isUser && idx === thread.messages.length - 1;
              return (
                <div key={item.id || idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
                  <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
                    {!isUser && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-tr ${thread.senderColor}`}>
                        {thread.senderInitials}
                      </div>
                    )}
                    
                    <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : theme === 'dark' ? 'bg-gray-800 text-gray-200 rounded-tl-none' : 'bg-gray-100 text-gray-700 rounded-tl-none'
                    }`}>
                      <p className="break-words">{item.text}</p>
                      <span className={`block text-[7px] mt-0.5 font-medium text-right leading-none ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
                        {item.time}
                      </span>
                    </div>
                  </div>

                  {showStatus && (
                    <span className="text-[8px] text-gray-400 font-bold mt-1 pr-1 flex items-center gap-1 select-none">
                      {item.status === 'sent' && 'Sent'}
                      {item.status === 'delivered' && 'Delivered'}
                      {item.status === 'seen' && (
                        <div className="flex items-center gap-1">
                          <span>Seen</span>
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-black text-white shrink-0 bg-gradient-to-tr ${thread.senderColor}`}>
                            {thread.senderInitials}
                          </div>
                        </div>
                      )}
                    </span>
                  )}
                </div>
              );
            })}

            {thread.typing && (
              <div className="flex items-start gap-2 max-w-[85%] self-start">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-tr ${thread.senderColor}`}>
                  {thread.senderInitials}
                </div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1 ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className={`h-[52px] border-t px-3 flex items-center gap-2 ${
              theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-slate-50/50'
            }`}
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Aa"
              className={`flex-1 text-xs px-3 py-2 rounded-full border outline-none transition ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                  : 'bg-white border-gray-200 text-slate-800 placeholder-gray-400 focus:border-blue-500'
              }`}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-full transition active:scale-95 flex items-center justify-center shrink-0"
            >
              <LuSend className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

