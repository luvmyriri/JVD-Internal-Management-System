import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuickRequest } from '../../context/QuickRequestContext';
import { confirm, promptText, notify } from '../ds';
import { useNavigate, useLocation } from 'react-router-dom';
import { getInitials, getAvatarUrl } from '../../utils';
import client from '../../api/client';
import { purchaseOrderApi } from '../../api/purchaseOrders';
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
  LuShieldCheck,
  LuMessageCircle,
  LuSearch,
  LuSend,
  LuMinus,
  LuUsers,
  LuMaximize2,
  LuTrash2,
  LuPaperclip,
  LuFileText,
  LuDownload,
  LuMenu,
  LuSignature,
  LuWallet,
  LuSun,
  LuMoon
} from 'react-icons/lu';
import { useState, useEffect, useRef } from 'react';
import { CreateCommissionForm } from '../../pages/operations/Commissions';
import HeaderWidgetsMenu from '../HeaderWidgetsMenu';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  model_type?: string;
  model_id?: number;
}

interface MessageDetail {
  id: string;
  sender: 'user' | 'peer';
  senderName?: string;
  senderAvatar?: string;
  text: string;
  time: string;
  timestamp?: number;
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  attachmentPath?: string;
  attachmentName?: string;
  attachmentType?: string;
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
  typing: boolean;
  messages: MessageDetail[];
  lastMessageTimestamp: number;
  hasActualMessages?: boolean;
}

const formatMessageTime = (dateString: string) => {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Just now';
  }
};

const formatConvoTimestamp = (timestamp?: number) => {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  const now = new Date();
  
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60 && date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return `Today at ${timeStr}`;
  }
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24 && date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return `Today at ${timeStr}`;
  }
  
  // Yesterday logic
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
    return `Yesterday at ${timeStr}`;
  }
  
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openQuickRequest } = useQuickRequest();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  const [messagesOpen, setMessagesOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [activeChats, setActiveChats] = useState<Array<{ id: string; minimized: boolean }>>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeImagePreview, setActiveImagePreview] = useState<{ path: string; name: string } | null>(null);
  const [showExtraMenu, setShowExtraMenu] = useState(false);
  const [wsConnectedState, setWsConnectedState] = useState(false);
  const [showRequestCommission, setShowRequestCommission] = useState(false);

  const unreadMessagesCount = messages.filter(m => !m.read).length;

  const hasGeneralAccess = !!(
    user?.role === 'super_admin' ||
    user?.role === 'executive_vice_president' ||
    user?.role === 'operations_manager' ||
    user?.role === 'accounting_executive' ||
    user?.tags?.includes('access:general') ||
    user?.tags?.includes('access:commissions:general')
  );


  const handleMarkAllMessagesRead = async () => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
    try {
      const unreadThreads = messages.filter(m => !m.read);
      await Promise.all(unreadThreads.map(async (msg) => {
        let payload: any = {};
        if (msg.id.startsWith('user-')) {
          payload.sender_id = parseInt(msg.id.replace('user-', ''));
        } else if (msg.id.startsWith('group-')) {
          payload.group_id = msg.id;
        }
        return client.post('/chat/read', payload);
      }));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleMessageClick = async (msg: MessageItem) => {
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

    try {
      let payload: any = {};
      if (msg.id.startsWith('user-')) {
        payload.sender_id = parseInt(msg.id.replace('user-', ''));
      } else if (msg.id.startsWith('group-')) {
        payload.group_id = msg.id;
      }
      await client.post('/chat/read', payload);
    } catch (error) {
      console.error('Failed to mark thread as read', error);
    }
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

  const handleSendMessage = async (msgId: string, text: string, file?: File) => {
    if (!text.trim() && !file) return;

    const optimisticMsgId = `optimistic-${Date.now()}`;
    const newMsg: MessageDetail = {
      id: optimisticMsgId,
      sender: 'user',
      text: text.trim(),
      time: 'Just now',
      status: 'sending',
      attachmentPath: file ? URL.createObjectURL(file) : undefined,
      attachmentName: file ? file.name : undefined,
      attachmentType: file ? file.type : undefined
    };

    playMessageSound(false);

    // Optimistically update the message thread
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

    try {
      const formData = new FormData();
      if (text.trim()) {
        formData.append('text', text.trim());
      }
      if (file) {
        formData.append('attachment', file);
      }
      if (msgId.startsWith('user-')) {
        formData.append('receiver_id', msgId.replace('user-', ''));
      } else if (msgId.startsWith('group-')) {
        formData.append('group_id', msgId);
      }

      const response = await client.post('/chat/messages', formData);
      
      if (response.data?.status === 'success') {
        // Mark the optimistic message as 'sent' — the background poller
        // will replace it with the real DB message within 2s.
        setMessages(prev => prev.map(thread => {
          if (thread.id !== msgId) return thread;
          return {
            ...thread,
            messages: thread.messages.map(m =>
              m.id === optimisticMsgId ? { ...m, status: 'sent' as const } : m
            )
          };
        }));
      }
    } catch (error) {
      console.error('Failed to send message to backend', error);
      // On error mark the optimistic message as failed by removing it gracefully
      setMessages(prev => prev.map(thread => {
        if (thread.id !== msgId) return thread;
        return {
          ...thread,
          messages: thread.messages.filter(m => m.id !== optimisticMsgId)
        };
      }));
    }
  };

  const handleDeleteConversation = async (msg: MessageItem, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Delete this conversation?',
      description: 'This removes the conversation from your inbox. This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });

    if (!confirmed) return;

    // Optimistically update frontend state
    setMessages(prev => prev.filter(m => m.id !== msg.id));

    try {
      let payload: any = {};
      if (msg.id.startsWith('user-')) {
        payload.sender_id = parseInt(msg.id.replace('user-', ''));
      } else {
        payload.group_id = msg.id;
      }

      await client.delete('/chat/conversation', { data: payload });
    } catch (error) {
      console.error('Failed to delete conversation', error);
      fetchUsersAndMapToChats();
    }
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

  const fetchUsersAndMapToChats = async () => {
    try {
      const [usersResponse, messagesResponse] = await Promise.all([
        client.get('/chat/users'),
        client.get('/chat/messages')
      ]);

      const userList = Array.isArray(usersResponse.data) 
        ? usersResponse.data 
        : (Array.isArray(usersResponse.data?.data) ? usersResponse.data.data : []);

      let dbMessages: any[] = [];
      let dbGroups: any[] = [];
      if (messagesResponse.data?.status === 'success') {
        dbMessages = messagesResponse.data.messages || [];
        dbGroups = messagesResponse.data.groups || [];
      }

      const currentUserId = user?.id;

      // Play sound for incoming message if a newer message exists from another user
      if (messages.length > 0) {
        let maxExistingTimestamp = 0;
        messages.forEach(thread => {
          thread.messages.forEach(msg => {
            if (msg.timestamp && !msg.id.startsWith('welcome-') && !msg.id.startsWith('optimistic-')) {
              if (msg.timestamp > maxExistingTimestamp) {
                maxExistingTimestamp = msg.timestamp;
              }
            }
          });
        });

        const hasNewIncoming = dbMessages.some((m: any) => {
          if (m.sender_id === currentUserId) return false;
          const msgTime = new Date(m.created_at).getTime();
          return msgTime > maxExistingTimestamp;
        });

        if (hasNewIncoming && maxExistingTimestamp > 0) {
          playMessageSound(true);
        }
      }

      setMessages(prev => {
        // Map users (one-to-one chats)
        const otherUsers = userList.filter((u: any) => u.id !== currentUserId);
        
        const directThreads = otherUsers.map((u: any) => {
          const userIdStr = `user-${u.id}`;
          const existingThread = prev.find(t => t.id === userIdStr);
          
          const fName = u.first_name || '';
          const lName = u.last_name || '';
          const initials = `${fName.charAt(0)}${lName.charAt(0)}`.toUpperCase() || 'US';
          
          const gradients = [
            'from-purple-500 to-indigo-500',
            'from-pink-500 to-rose-500',
            'from-amber-500 to-orange-500',
            'from-blue-500 to-cyan-500',
            'from-emerald-500 to-teal-500',
            'from-violet-500 to-fuchsia-500'
          ];
          const senderColor = gradients[u.id % gradients.length];
          const senderName = `${fName} ${lName}`;

          // Filter actual database messages between current user and this user
          const userMsgs = dbMessages.filter((m: any) => 
            !m.group_id && 
            ((m.sender_id === currentUserId && m.receiver_id === u.id) || 
             (m.sender_id === u.id && m.receiver_id === currentUserId))
          );

          let mappedMessages: MessageDetail[] = [];
          let lastMessageTime = 'Just now';
          let isRead = true;
          let lastMessageTimestamp = 0;

          if (userMsgs.length > 0) {
            mappedMessages = userMsgs.map((m: any) => ({
              id: String(m.id),
              sender: m.sender_id === currentUserId ? 'user' : 'peer',
              text: m.text,
              time: formatMessageTime(m.created_at),
              timestamp: new Date(m.created_at).getTime(),
              status: m.read_at ? 'seen' : 'sent',
              attachmentPath: m.attachment_path || undefined,
              attachmentName: m.attachment_name || undefined,
              attachmentType: m.attachment_type || undefined
            }));
            const lastMsg = userMsgs[userMsgs.length - 1];
            lastMessageTime = formatMessageTime(lastMsg.created_at);
            isRead = lastMsg.sender_id === currentUserId ? true : (lastMsg.read_at ? true : false);
            lastMessageTimestamp = new Date(lastMsg.created_at).getTime();
          } else {
            let initialMsgText = `Hi there! I am ${fName} from the ${u.department || 'JVD'} team. Let me know if you need any assistance!`;
            if (u.role === 'service_adviser' || u.role === 'head_mechanic') {
              initialMsgText = `Hi! I'm ${fName}. I've updated the fleet maintenance and service logs. Let me know if you need verification!`;
            } else if (u.role === 'purchasing_manager' || u.role === 'logistics_in_charge') {
              initialMsgText = `Hello! I'm ${fName}. The procurement and logistics status reports are updated.`;
            } else if (u.role === 'corporate_secretary' || u.role === 'operations_manager') {
              initialMsgText = `Greetings! The employee records and operational schedules are up to date.`;
            } else if (u.role === 'driver') {
              initialMsgText = `Hello! I'm ${fName}. I've checked my scheduled trips and assigned vehicle. Ready for dispatch!`;
            }

            mappedMessages = [{
              id: `welcome-${u.id}`,
              sender: 'peer',
              text: initialMsgText,
              time: 'Just now',
              timestamp: Date.now() - 3600000,
              status: 'seen'
            }];
            isRead = existingThread ? existingThread.read : true;
            lastMessageTimestamp = Date.now() - 3600000;
          }

          if (existingThread) {
            const optimisticMsgs = existingThread.messages.filter(m => {
              if (!String(m.id).startsWith('optimistic-')) return false;
              const msgTime = parseInt(m.id.split('-')[1] || '0');
              // Keep optimistic messages for up to 30 seconds
              if (Date.now() - msgTime > 30000) return false;

              const alreadyInDb = userMsgs.some((dbM: any) => {
                if (dbM.sender_id !== currentUserId) return false;
                const dbTime = new Date(dbM.created_at).getTime();
                // Allow 45s window for slow network
                if (Math.abs(dbTime - msgTime) > 45000) return false;
                
                const isSameText = m.text ? m.text === dbM.text : true;
                const isSameAttachment = m.attachmentName ? dbM.attachment_name === m.attachmentName : true;
                return isSameText && isSameAttachment;
              });

              return !alreadyInDb;
            });
            
            if (optimisticMsgs.length > 0) {
              mappedMessages = [...mappedMessages, ...optimisticMsgs];
              const lastOpt = optimisticMsgs[optimisticMsgs.length - 1];
              lastMessageTime = lastOpt.time || 'Just now';
              lastMessageTimestamp = parseInt(lastOpt.id.split('-')[1] || '0');
              isRead = true;
            }
          }

          return {
            id: userIdStr,
            senderName,
            senderAvatar: u.avatar_url,
            senderInitials: initials,
            senderColor,
            time: lastMessageTime,
            read: isRead,
            online: u.is_online ? true : false,
            typing: existingThread?.typing || false,
            messages: mappedMessages,
            lastMessageTimestamp,
            hasActualMessages: userMsgs.length > 0
          };
        });

        // Map group chats
        const groupThreads = dbGroups.map((g: any) => {
          const groupIdStr = g.group_id;
          const existingThread = prev.find(t => t.id === groupIdStr);

          const groupInitials = g.name.split(' ').map((w: string) => w.charAt(0)).join('').toUpperCase().substring(0, 2) || 'GP';
          const colors = [
            'from-indigo-500 to-cyan-500',
            'from-purple-500 to-pink-500',
            'from-emerald-500 to-teal-500',
            'from-amber-500 to-rose-500'
          ];
          const groupColor = colors[groupIdStr.length % colors.length];

          const groupMsgs = dbMessages.filter((m: any) => m.group_id === g.group_id);

          let mappedMessages: MessageDetail[] = [];
          let lastMessageTime = 'Just now';
          let isRead = true;
          let lastMessageTimestamp = 0;

          if (groupMsgs.length > 0) {
            mappedMessages = groupMsgs.map((m: any) => ({
              id: String(m.id),
              sender: m.sender_id === currentUserId ? 'user' : 'peer',
              senderName: m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : undefined,
              senderAvatar: m.sender?.avatar_url || undefined,
              text: m.text,
              time: formatMessageTime(m.created_at),
              timestamp: new Date(m.created_at).getTime(),
              status: m.read_at ? 'seen' : 'sent',
              attachmentPath: m.attachment_path || undefined,
              attachmentName: m.attachment_name || undefined,
              attachmentType: m.attachment_type || undefined
            }));
            const lastMsg = groupMsgs[groupMsgs.length - 1];
            lastMessageTime = formatMessageTime(lastMsg.created_at);
            isRead = lastMsg.sender_id === currentUserId ? true : (lastMsg.read_at ? true : false);
            lastMessageTimestamp = new Date(lastMsg.created_at).getTime();
          } else {
            mappedMessages = [{
              id: `welcome-group-${g.group_id}`,
              sender: 'peer',
              senderName: 'System',
              text: `Welcome to the group!`,
              time: 'Just now',
              timestamp: new Date(g.created_at || 0).getTime(),
              status: 'seen'
            }];
            isRead = existingThread ? existingThread.read : true;
            lastMessageTimestamp = new Date(g.created_at || 0).getTime();
          }

          if (existingThread) {
            const optimisticMsgs = existingThread.messages.filter(m => {
              if (!String(m.id).startsWith('optimistic-')) return false;
              const msgTime = parseInt(m.id.split('-')[1] || '0');
              // Keep optimistic messages for up to 30 seconds
              if (Date.now() - msgTime > 30000) return false;

              const alreadyInDb = groupMsgs.some((dbM: any) => {
                if (dbM.sender_id !== currentUserId) return false;
                const dbTime = new Date(dbM.created_at).getTime();
                // Allow 45s window for slow network
                if (Math.abs(dbTime - msgTime) > 45000) return false;
                
                const isSameText = m.text ? m.text === dbM.text : true;
                const isSameAttachment = m.attachmentName ? dbM.attachment_name === m.attachmentName : true;
                return isSameText && isSameAttachment;
              });

              return !alreadyInDb;
            });
            
            if (optimisticMsgs.length > 0) {
              mappedMessages = [...mappedMessages, ...optimisticMsgs];
              const lastOpt = optimisticMsgs[optimisticMsgs.length - 1];
              lastMessageTime = lastOpt.time || 'Just now';
              lastMessageTimestamp = parseInt(lastOpt.id.split('-')[1] || '0');
              isRead = true;
            }
          }

          return {
            id: groupIdStr,
            senderName: g.name,
            senderInitials: groupInitials,
            senderColor: groupColor,
            time: lastMessageTime,
            read: isRead,
            online: true,
            typing: existingThread?.typing || false,
            messages: mappedMessages,
            lastMessageTimestamp,
            hasActualMessages: groupMsgs.length > 0
          };
        });

        // Combine direct threads and group threads
        const combined = [...groupThreads, ...directThreads];

        // Sort combined threads:
        // 1. Unread messages first
        // 2. Then by actual message history presence and timestamp
        // 3. Then alphabetical directory fallback
        combined.sort((a, b) => {
          if (!a.read && b.read) return -1;
          if (a.read && !b.read) return 1;

          if (a.hasActualMessages && !b.hasActualMessages) return -1;
          if (!a.hasActualMessages && b.hasActualMessages) return 1;

          if (a.hasActualMessages && b.hasActualMessages) {
            return (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0);
          }

          return a.senderName.localeCompare(b.senderName);
        });

        return combined;
      });
    } catch (error) {
      console.error('Failed to fetch users and map chats', error);
    }
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    
    try {
      const memberIds = selectedUserIds
        .filter(uid => uid.startsWith('user-'))
        .map(uid => parseInt(uid.replace('user-', '')));

      const response = await client.post('/chat/groups', {
        name: groupName.trim(),
        members: memberIds
      });

      if (response.data?.status === 'success') {
        const newGroup = response.data.group;
        const newGroupId = newGroup.group_id;

        await fetchUsersAndMapToChats();

        setIsCreatingGroup(false);
        setGroupName('');
        setSelectedUserIds([]);

        setActiveChats(prev => {
          const filtered = prev.filter(c => c.id !== newGroupId);
          if (filtered.length >= 3) {
            filtered.shift();
          }
          return [...filtered, { id: newGroupId, minimized: false }];
        });
      }
    } catch (error) {
      console.error('Failed to create group chat on backend', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initial load
    fetchNotifications();
    fetchUsersAndMapToChats();

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const defaultWsUrl = `${protocol}//${window.location.host}/ws`;
        const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnectedState(true);
          console.log('[Chat WS] Connected');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type !== 'new_message') return;

            const msg = payload.data?.message;
            if (!msg) return;

            const senderId = payload.data?.sender_id;
            const receiverId = payload.data?.receiver_id;
            const groupId = payload.data?.group_id;
            const currentUserId = user?.id;

            // Determine which thread this belongs to
            const threadId = groupId
              ? groupId
              : senderId === currentUserId
                ? `user-${receiverId}`
                : `user-${senderId}`;

            const isFromSelf = senderId === currentUserId;

            setMessages(prev => {
              const thread = prev.find(t => t.id === threadId);
              if (!thread) {
                // Thread not found — do a full reload to pick up new threads
                fetchUsersAndMapToChats();
                return prev;
              }

              // If from self — find and replace any optimistic message
              // If from peer — append as a new message
              let updatedMessages: typeof thread.messages;

              if (isFromSelf) {
                // Replace the optimistic placeholder (matched by text/attachment)
                const optimisticIdx = thread.messages.findIndex(m =>
                  String(m.id).startsWith('optimistic-') &&
                  (m.text ? m.text === msg.text : true) &&
                  (m.attachmentName ? m.attachmentName === msg.attachment_name : true)
                );
                if (optimisticIdx !== -1) {
                  updatedMessages = thread.messages.map((m, i) =>
                    i === optimisticIdx
                      ? {
                          id: String(msg.id),
                          sender: 'user' as const,
                          text: msg.text || '',
                          time: 'Just now',
                          timestamp: new Date(msg.created_at).getTime(),
                          status: 'sent' as const,
                          attachmentPath: msg.attachment_path || undefined,
                          attachmentName: msg.attachment_name || undefined,
                          attachmentType: msg.attachment_type || undefined,
                        }
                      : m
                  );
                } else {
                  // No optimistic found — just ensure it's not a duplicate
                  const alreadyExists = thread.messages.some(m => String(m.id) === String(msg.id));
                  if (alreadyExists) return prev;
                  updatedMessages = [...thread.messages, {
                    id: String(msg.id),
                    sender: 'user' as const,
                    text: msg.text || '',
                    time: 'Just now',
                    timestamp: new Date(msg.created_at).getTime(),
                    status: 'sent' as const,
                    attachmentPath: msg.attachment_path || undefined,
                    attachmentName: msg.attachment_name || undefined,
                    attachmentType: msg.attachment_type || undefined,
                  }];
                }
              } else {
                // Incoming message from peer
                const alreadyExists = thread.messages.some(m => String(m.id) === String(msg.id));
                if (alreadyExists) return prev;
                playMessageSound(true);
                updatedMessages = [...thread.messages, {
                  id: String(msg.id),
                  sender: 'peer' as const,
                  senderName: msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : undefined,
                  senderAvatar: msg.sender?.avatar_url || undefined,
                  text: msg.text || '',
                  time: 'Just now',
                  timestamp: new Date(msg.created_at).getTime(),
                  status: 'sent' as const,
                  attachmentPath: msg.attachment_path || undefined,
                  attachmentName: msg.attachment_name || undefined,
                  attachmentType: msg.attachment_type || undefined,
                }];
              }

              return prev.map(t =>
                t.id === threadId
                  ? { ...t, messages: updatedMessages, time: 'Just now', read: isFromSelf ? t.read : false }
                  : t
              );
            });
          } catch (e) {
            console.error('[Chat WS] Parse error', e);
          }
        };

        ws.onclose = () => {
          setWsConnectedState(false);
          console.log('[Chat WS] Disconnected — will retry in 5s');
          reconnectTimeout = setTimeout(connectWs, 5000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        // WebSocket not available — silently fail
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // prevent reconnect on intentional close
        ws.close();
      }
    };
  }, [user]);

  // High-efficiency notifications and chat polling fallback
  useEffect(() => {
    if (!user) return;
    const notifInterval = setInterval(fetchNotifications, 15000);
    const chatInterval = setInterval(fetchUsersAndMapToChats, 3000);
    return () => {
      clearInterval(notifInterval);
      clearInterval(chatInterval);
    };
  }, [user]);

  // Just-in-Time chat polling (every 5s, only if offline AND chat is actively open)
  useEffect(() => {
    if (!user) return;
    const shouldPoll = !wsConnectedState && (messagesOpen || activeChats.length > 0);
    if (shouldPoll) {
      const interval = setInterval(fetchUsersAndMapToChats, 5000);
      return () => clearInterval(interval);
    }
  }, [user, wsConnectedState, messagesOpen, activeChats.length]);


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
    
    let title = format(segments[segments.length - 1]);
    let subtitle = segments.length > 1 ? `Management / ${format(segments[0])}` : 'Internal Management System';

    const hasGeneralAccess = !!(
      user.role === 'super_admin' ||
      user.role === 'executive_vice_president' ||
      user.role === 'operations_manager' ||
      user.role === 'accounting_executive' ||
      user.tags?.includes('access:general') ||
      user.tags?.includes('access:commissions:general')
    );

    if (path === '/accounting/commissions' && !hasGeneralAccess) {
      title = 'Request Commission';
      subtitle = 'Self-Service / Accounting';
    }

    return { title, subtitle };
  };

  const { title, subtitle } = getPageContext();

  return (
    <>
    <header className={`h-16 border-b flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 md:left-64 z-40 transition-colors ${
      theme === 'dark' 
        ? 'bg-gray-900 border-gray-800' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Left: page context */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className={`md:hidden p-2 rounded-lg transition ${
            theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
          aria-label="Toggle menu"
        >
          <LuMenu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className={`text-lg font-bold leading-none tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`text-[11px] mt-1 font-medium truncate max-w-[200px] md:max-w-[400px] ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Notifications + Quick Actions + User */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Action: Request Cash Budget */}
        <button
          type="button"
          onClick={() => openQuickRequest('cash_budget')}
          className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shadow-orange-500/20 active:scale-95 cursor-pointer shrink-0"
          title="Open left drawer request form for Cash Budget"
        >
          <LuWallet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Request Cash Budget</span>
          <span className="sm:hidden">Budget</span>
        </button>

        {/* Quick Action: Request Commission */}
        <button
          type="button"
          onClick={() => openQuickRequest('commission')}
          className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer shrink-0"
          title="Open left drawer request form for Commission"
        >
          <LuSignature className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Request Commission</span>
          <span className="sm:hidden">Commission</span>
        </button>
        {/* Widgets menu (dashboard only) */}
        {location.pathname === '/dashboard' && <HeaderWidgetsMenu />}
        {/* Quick Theme Toggle */}
        <button
          id="header-theme-toggle"
          type="button"
          onClick={toggleTheme}
          className={`relative p-2 rounded-xl transition cursor-pointer ${
            theme === 'dark' 
              ? 'text-amber-400 hover:text-amber-300 hover:bg-gray-800' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <LuSun className="w-5 h-5" /> : <LuMoon className="w-5 h-5" />}
        </button>
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
              <div className={`fixed left-4 right-4 top-[72px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-96 rounded-2xl border shadow-xl z-20 overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-gray-900 border-gray-800 text-white' 
                  : 'bg-white border-gray-100 text-slate-800'
              }`}>
                {isCreatingGroup ? (
                  /* Create Group Form */
                  <div className="p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b pb-2 dark:border-gray-800 border-gray-150">
                      <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <LuUsers className="w-4 h-4 text-blue-600 animate-pulse" />
                        Create Group Chat
                      </h3>
                      <button
                        onClick={() => {
                          setIsCreatingGroup(false);
                          setGroupName('');
                          setSelectedUserIds([]);
                        }}
                        className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:underline"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {/* Group Name */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Group Name</label>
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="e.g. Fleet Ops, Weekend Shift"
                          className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                            theme === 'dark'
                              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                              : 'bg-gray-55 border-gray-200 text-slate-850 placeholder-gray-400 focus:border-blue-500'
                          }`}
                          autoFocus
                        />
                      </div>

                      {/* Select Members */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Select Members ({selectedUserIds.length})</label>
                        <div className="max-h-[180px] overflow-y-auto border rounded-xl divide-y dark:divide-gray-850 dark:border-gray-800 border-gray-150 custom-scrollbar divide-gray-100">
                          {messages.filter(m => m.id.startsWith('user-')).map(u => {
                            const isChecked = selectedUserIds.includes(u.id);
                            return (
                              <label
                                key={u.id}
                                className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition select-none ${
                                  isChecked ? (theme === 'dark' ? 'bg-blue-950/20' : 'bg-blue-50/30') : ''
                                }`}
                              >
                                <div className="flex items-center gap-2.5 max-w-[80%]">
                                  {u.senderAvatar ? (
                                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-850">
                                      <img src={getAvatarUrl(u.senderAvatar) || ''} alt={u.senderName} className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-tr ${u.senderColor}`}>
                                      {u.senderInitials}
                                    </div>
                                  )}
                                  <span className="text-xs font-semibold truncate text-gray-805 dark:text-gray-200">{u.senderName}</span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedUserIds(prev =>
                                      isChecked ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                    );
                                  }}
                                  className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end pt-2.5 border-t border-gray-150 dark:border-gray-800">
                      <button
                        onClick={() => {
                          setIsCreatingGroup(false);
                          setGroupName('');
                          setSelectedUserIds([]);
                        }}
                        className={`px-3.5 py-2 text-[10px] font-bold rounded-xl uppercase tracking-wider transition ${
                          theme === 'dark' ? 'hover:bg-gray-850 text-gray-400' : 'hover:bg-gray-100 text-gray-550'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateGroupChat}
                        disabled={!groupName.trim() || selectedUserIds.length === 0}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-blue-500/20 transition active:scale-[0.98]"
                      >
                        Create Group
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Unified Header */}
                    <div className={`px-4 pt-4 pb-3 border-b flex items-center justify-between ${
                      theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          Inbox
                        </h3>
                        {unreadMessagesCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-blue-600 text-white animate-pulse">
                            {unreadMessagesCount}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsCreatingGroup(true)}
                          className="text-[10px] text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-black tracking-wide uppercase transition flex items-center gap-1 cursor-pointer"
                          title="Create a new Group Chat"
                        >
                          <LuUsers className="w-3.5 h-3.5" />
                          Create Group
                        </button>
                        {unreadMessagesCount > 0 && (
                          <button
                            onClick={handleMarkAllMessagesRead}
                            className="text-[10px] text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 font-black tracking-wide uppercase transition pl-1.5 border-l border-gray-200 dark:border-gray-800"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className={`p-3 border-b bg-gray-50/30 dark:bg-gray-950/10 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                      <div className="relative flex items-center">
                        <LuSearch className="absolute left-3 w-4 h-4 text-gray-400 dark:text-gray-550" />
                        <input
                          type="text"
                          value={messageSearch}
                          onChange={(e) => setMessageSearch(e.target.value)}
                          placeholder="Search chats or directory..."
                          className={`w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl outline-none border transition ${
                            theme === 'dark' 
                              ? 'bg-gray-850 border-gray-700 text-white placeholder-gray-550 focus:border-blue-550' 
                              : 'bg-gray-50 border-gray-200 text-slate-800 placeholder-gray-400 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-850 custom-scrollbar">
                      {(() => {
                        const filteredActive = messages.filter(m => {
                          const matchesSearch = m.senderName.toLowerCase().includes(messageSearch.toLowerCase()) ||
                            (m.messages[m.messages.length - 1]?.text || '').toLowerCase().includes(messageSearch.toLowerCase());
                          return matchesSearch && m.hasActualMessages;
                        });

                        const filteredDirectory = messages.filter(m => {
                          const matchesSearch = m.senderName.toLowerCase().includes(messageSearch.toLowerCase());
                          // Only include non-active user chats (not groups)
                          return matchesSearch && !m.hasActualMessages && m.id.startsWith('user-');
                        });

                        if (filteredActive.length === 0 && filteredDirectory.length === 0) {
                          return (
                            /* Empty State */
                            <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
                              <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-350 dark:text-gray-500">
                                <LuInbox className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                  No results found
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium mt-1 leading-normal">
                                  No active chats or colleagues match your search.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <>
                            {/* Active Chats Section */}
                            {filteredActive.length > 0 && (
                              <div className="flex flex-col">
                                <div className="text-[9px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase px-4 pt-3 pb-1 select-none">
                                  Active Conversations
                                </div>
                                {filteredActive.map(msg => {
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
                                      <div className="relative shrink-0 select-none">
                                        {msg.senderAvatar ? (
                                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-850 shrink-0">
                                            <img src={getAvatarUrl(msg.senderAvatar) || ''} alt={msg.senderName} className="w-full h-full object-cover" />
                                          </div>
                                        ) : (
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-tr ${msg.senderColor}`}>
                                            {msg.senderInitials}
                                          </div>
                                        )}
                                        {msg.online && (
                                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
                                        )}
                                      </div>

                                      {/* Message Body */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1.5">
                                          <p className={`text-xs truncate ${!msg.read ? 'text-slate-900 dark:text-white font-black' : 'text-gray-700 dark:text-gray-300 font-semibold'}`}>{msg.senderName}</p>
                                          <p className="text-[9px] text-gray-400 dark:text-gray-550 shrink-0 font-medium">{msg.time}</p>
                                        </div>
                                        <p className={`text-[11px] mt-1 leading-normal truncate ${msg.read ? 'text-gray-400 dark:text-gray-500 font-medium' : 'text-slate-850 dark:text-gray-200 font-bold'}`}>{lastMessage?.text || (lastMessage?.attachmentName ? `Attachment: ${lastMessage.attachmentName}` : 'No messages')}</p>
                                      </div>

                                      {/* Unread dot */}
                                      {!msg.read && (
                                        <div className="flex items-center shrink-0 pl-1.5">
                                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                                        </div>
                                      )}

                                      {/* Delete Hover Action */}
                                      <div className="flex items-center shrink-0 pl-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <button
                                          onClick={(e) => handleDeleteConversation(msg, e)}
                                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                          title="Delete conversation"
                                        >
                                          <LuTrash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Directory / Colleagues Section */}
                            {filteredDirectory.length > 0 && (
                              <div className="flex flex-col">
                                <div className="text-[9px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase px-4 pt-4 pb-1 select-none border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/10 dark:bg-gray-950/5">
                                  Start New Conversation
                                </div>
                                {filteredDirectory.map(msg => {
                                  return (
                                    <div
                                      key={msg.id}
                                      onClick={() => handleMessageClick(msg)}
                                      className={`p-4 flex gap-3.5 relative group cursor-pointer transition ${
                                        theme === 'dark' ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50'
                                      }`}
                                    >
                                      {/* Left Avatar Badge */}
                                      <div className="relative shrink-0 select-none">
                                        {msg.senderAvatar ? (
                                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-850 shrink-0">
                                            <img src={getAvatarUrl(msg.senderAvatar) || ''} alt={msg.senderName} className="w-full h-full object-cover" />
                                          </div>
                                        ) : (
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-tr ${msg.senderColor}`}>
                                            {msg.senderInitials}
                                          </div>
                                        )}
                                        {msg.online && (
                                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
                                        )}
                                      </div>

                                      {/* Message Body */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1.5">
                                          <p className="text-xs truncate text-gray-700 dark:text-gray-300 font-semibold">{msg.senderName}</p>
                                        </div>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-550 mt-1 font-semibold flex items-center gap-1.5 select-none">
                                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 inline-block ${msg.online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                          <span className="opacity-85">{msg.online ? 'Online' : 'Offline'}</span>
                                          <span className="text-gray-300 dark:text-gray-700">•</span>
                                          <span>Start conversation</span>
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
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
                  </>
                )}
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
              <div className={`fixed left-4 right-4 top-[72px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-96 rounded-2xl border shadow-xl z-20 overflow-hidden ${
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
            {user.avatar_url ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-850 shrink-0">
                <img 
                  src={getAvatarUrl(user.avatar_url ?? undefined) ?? undefined} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-tr from-blue-500 to-indigo-600 border border-gray-200 dark:border-gray-850">
                {initials}
              </div>
            )}
            <LuChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-lg border z-20 py-1 overflow-hidden ${
                theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
              }`}>
                <div className={`px-4 py-3 border-b text-left ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                  <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{user.first_name} {user.last_name}</p>
                  <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{user.email}</p>
                </div>
                <button
                  id="header-profile"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer whitespace-nowrap"
                >
                  <LuUser className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>My Profile</span>
                </button>
                <button
                  id="header-theme-dropdown-toggle"
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition cursor-pointer whitespace-nowrap ${
                    theme === 'dark' 
                      ? 'text-gray-300 hover:bg-gray-800' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? <LuSun className="w-4 h-4 text-amber-400 shrink-0" /> : <LuMoon className="w-4 h-4 text-indigo-500 shrink-0" />}
                    <span>Theme</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    theme === 'dark' ? 'bg-indigo-900/60 text-indigo-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>
                <button
                  id="header-settings"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition cursor-pointer whitespace-nowrap ${
                    theme === 'dark' 
                      ? 'text-gray-300 hover:bg-gray-800' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LuSettings className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Settings</span>
                </button>
                <button
                  id="header-password-security"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition cursor-pointer whitespace-nowrap ${
                    theme === 'dark' 
                      ? 'text-gray-300 hover:bg-gray-800' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LuShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Security &amp; Password</span>
                </button>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <button
                  id="header-logout"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer whitespace-nowrap"
                >
                  <LuLogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

    {/* Request Commission Modal (Quick Action) */}
    {showRequestCommission && (
      <CreateCommissionForm onClose={() => setShowRequestCommission(false)} />
    )}

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
        onRefreshNotifications={fetchNotifications}
      />
    )}

    {/* Floating Restored Chat Windows (PC-style bottom tabs, shifted left to avoid chatheads) */}
    <div className="fixed bottom-0 right-[85px] z-50 flex items-end gap-3 pointer-events-none select-none">
      {activeChats.filter(c => !c.minimized).map(c => {
        const msgThread = messages.find(m => m.id === c.id);
        if (!msgThread) return null;
        return (
          <FloatingChatWindow
            key={c.id}
            thread={msgThread}
            theme={theme}
            minimized={false}
            onMinimize={() => {
              setActiveChats(prev => prev.map(chat => chat.id === c.id ? { ...chat, minimized: true } : chat));
            }}
            onClose={() => {
              setActiveChats(prev => prev.filter(chat => chat.id !== c.id));
            }}
            onSendMessage={(text, file) => handleSendMessage(c.id, text, file)}
            onImageClick={(path, name) => setActiveImagePreview({ path, name })}
          />
        );
      })}
    </div>

    {/* Minimized Circle Chatheads (Facebook-style vertical stack on bottom right, raised on mobile to clear bottom nav) */}
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col items-center gap-2.5 select-none pointer-events-auto">
      {(() => {
        const minimizedChats = activeChats.filter(c => c.minimized);
        const maxDisplayed = 5;
        const displayedChats = minimizedChats.slice(0, maxDisplayed);
        const hiddenChats = minimizedChats.slice(maxDisplayed);

        return (
          <>
            {/* Render up to 5 displayed minimized chatheads */}
            {displayedChats.map(c => {
              const msgThread = messages.find(m => m.id === c.id);
              if (!msgThread) return null;

              return (
                <div key={c.id} className="relative group w-10 h-10 md:w-12 md:h-12 transition-all duration-200 hover:scale-105 active:scale-[0.95] shadow-lg rounded-full">
                  {/* Circle Chathead Body */}
                  <div
                    onClick={() => {
                      setActiveChats(prev => prev.map(chat => chat.id === c.id ? { ...chat, minimized: false } : chat));
                    }}
                    className="w-full h-full rounded-full cursor-pointer relative overflow-visible border-2 border-white dark:border-gray-800 bg-slate-200 dark:bg-gray-700 shadow-sm"
                  >
                    {msgThread.senderAvatar ? (
                      <img
                        src={getAvatarUrl(msgThread.senderAvatar) || ''}
                        alt={msgThread.senderName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className={`w-full h-full rounded-full flex items-center justify-center text-[10px] md:text-xs font-black text-white bg-gradient-to-tr ${msgThread.senderColor || 'from-blue-500 to-indigo-600'}`}>
                        {msgThread.senderInitials || msgThread.senderName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Online status badge */}
                    {msgThread.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Hover Close Button (x) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveChats(prev => prev.filter(chat => chat.id !== c.id));
                    }}
                    className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-white dark:border-gray-950 shadow-md cursor-pointer"
                    title="Close Chat"
                  >
                    ✕
                  </button>

                  {/* Hover Tooltip (Conversation Name) */}
                  <div className="absolute right-12 md:right-14 top-1/2 -translate-y-1/2 bg-gray-950/95 dark:bg-black/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md border border-white/5 pointer-events-none">
                    {msgThread.senderName}
                  </div>
                </div>
              );
            })}

            {/* Extra Plus Chathead if there are more than 5 minimized chats */}
            {hiddenChats.length > 0 && (
              <div className="relative w-10 h-10 md:w-12 md:h-12 shadow-lg rounded-full">
                <button
                  onClick={() => setShowExtraMenu(prev => !prev)}
                  className="w-full h-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs md:text-sm flex items-center justify-center border-2 border-white dark:border-gray-800 transition-all duration-200 hover:scale-105 active:scale-[0.95] cursor-pointer shadow-md"
                  title={`${hiddenChats.length} more chats open`}
                >
                  +{hiddenChats.length}
                </button>

                {/* Extra Minimized Chats Popover List */}
                {showExtraMenu && (
                  <div className="absolute right-12 md:right-14 bottom-0 bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-2xl p-3 shadow-2xl w-56 flex flex-col gap-1.5 z-[100] max-h-60 overflow-y-auto custom-scrollbar animate-fade-in pointer-events-auto">
                    <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 pb-1 border-b border-gray-100 dark:border-gray-855 mb-1">
                      Open Conversations
                    </p>
                    {hiddenChats.map(c => {
                      const msgThread = messages.find(m => m.id === c.id);
                      if (!msgThread) return null;

                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-xl transition-all cursor-pointer group/item"
                          onClick={() => {
                            // Restore chat
                            setActiveChats(prev => prev.map(chat => chat.id === c.id ? { ...chat, minimized: false } : chat));
                            setShowExtraMenu(false);
                          }}
                        >
                          <div className="flex items-center gap-2 max-w-[80%]">
                            <div className="relative shrink-0">
                              {msgThread.senderAvatar ? (
                                <img
                                  src={getAvatarUrl(msgThread.senderAvatar) || ''}
                                  alt={msgThread.senderName}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white bg-gradient-to-tr ${msgThread.senderColor || 'from-blue-500 to-indigo-600'}`}>
                                  {msgThread.senderInitials || msgThread.senderName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              {msgThread.online && (
                                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white dark:border-gray-950 rounded-full" />
                              )}
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate select-none">
                              {msgThread.senderName}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveChats(prev => prev.filter(chat => chat.id !== c.id));
                            }}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-gray-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Close Chat"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>

    {/* Image Preview Modal */}
    {activeImagePreview && (
      <div 
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in pointer-events-auto"
        onClick={() => setActiveImagePreview(null)}
      >
        <button
          onClick={() => setActiveImagePreview(null)}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition duration-200 border border-white/5 cursor-pointer hover:scale-105 active:scale-[0.95] flex items-center justify-center"
          title="Close preview"
        >
          <LuX className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div 
          className="relative max-w-5xl w-full flex flex-col items-center justify-center gap-4 animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-gray-950/40">
            <img
              src={activeImagePreview.path.startsWith('blob:') ? activeImagePreview.path : `${client.defaults.baseURL?.replace(/\/api(\/v\d+)?$/, '')}${activeImagePreview.path}`}
              alt={activeImagePreview.name}
              className="max-w-full max-h-[80vh] object-contain select-text cursor-default"
            />
          </div>

          {/* Bottom Bar: Title, Open original in new tab, and Download */}
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md max-w-md w-full text-white text-xs">
            <div className="flex flex-col min-w-0">
              <span className="font-bold truncate text-[11px]">{activeImagePreview.name}</span>
              <span className="text-[9px] text-gray-400 font-medium">Image Attachment</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={activeImagePreview.path.startsWith('blob:') ? activeImagePreview.path : `${client.defaults.baseURL?.replace(/\/api(\/v\d+)?$/, '')}${activeImagePreview.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer flex items-center justify-center"
                title="Open original"
              >
                <LuExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={activeImagePreview.path.startsWith('blob:') ? activeImagePreview.path : `${client.defaults.baseURL?.replace(/\/api(\/v\d+)?$/, '')}${activeImagePreview.path}`}
                download={activeImagePreview.name}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer flex items-center justify-center font-bold"
                title="Download"
              >
                <LuDownload className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

/* ─── Notification Detail Modal ─────────────────────────── */
function NotificationModal({
  notification,
  theme,
  onClose,
  onNavigate,
  onRefreshNotifications,
}: {
  notification: NotificationItem;
  theme: string;
  onClose: () => void;
  onNavigate: (link: string) => void;
  onRefreshNotifications?: () => void;
}) {
  const { user } = useAuth();
  const [poDetails, setPoDetails] = useState<any>(null);
  const [isLoadingPo, setIsLoadingPo] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [cashBudgetDetails, setCashBudgetDetails] = useState<any>(null);
  const [isLoadingCb, setIsLoadingCb] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAccountingRole = ['accounting_executive', 'super_admin'].includes(user?.role ?? '');

  // 1. Try to get po_number from title or message or model
  let poNumber = '';
  const match = notification.title.match(/(PO-\d{4}-\d+|PO-[A-Z0-9-]+)/i);
  if (match) {
    poNumber = match[1];
  }

  const isPendingCeoApprovalPo = isSuperAdmin && (
    notification.title.toLowerCase().includes('pending ceo approval') ||
    notification.message.toLowerCase().includes('ceo approval')
  );

  useEffect(() => {
    if (isPendingCeoApprovalPo) {
      setIsLoadingPo(true);
      const fetchPo = async () => {
        try {
          if (notification.model_id) {
            const res = await purchaseOrderApi.get(Number(notification.model_id));
            if (res.data.success && res.data.data.status === 'pending_ceo_approval') {
              setPoDetails(res.data.data);
            }
          } else if (poNumber) {
            const res = await client.get(`/purchase-orders`, {
              params: { po_number: poNumber }
            });
            if (res.data.success && res.data.data.length > 0) {
              const matchedPo = res.data.data.find((p: any) => p.po_number === poNumber);
              if (matchedPo && matchedPo.status === 'pending_ceo_approval') {
                setPoDetails(matchedPo);
              }
            }
          }
        } catch (err) {
          console.error("Failed to load PO details for quick approval", err);
        } finally {
          setIsLoadingPo(false);
        }
      };
      fetchPo();
    }
  }, [isPendingCeoApprovalPo, poNumber, notification.model_id]);

  // ── Cash Budget quick-disburse ─────────────────────────────
  const isCashBudgetNotification = isAccountingRole &&
    notification.model_type === 'cash_budget' &&
    !!notification.model_id;

  useEffect(() => {
    if (!isCashBudgetNotification) return;
    setIsLoadingCb(true);
    const fetchCb = async () => {
      try {
        const res = await client.get(`/cash-budgets/${notification.model_id}`);
        const data = res.data?.data ?? res.data;
        // Only show quick-action if still pending accounting action (status === 'pending_accounting')
        if (data && data.status === 'pending_accounting') {
          setCashBudgetDetails(data);
        }
      } catch (err) {
        console.error('Failed to load cash budget details for quick disburse', err);
      } finally {
        setIsLoadingCb(false);
      }
    };
    fetchCb();
  }, [isCashBudgetNotification, notification.model_id]);

  const handleApproveCb = async () => {
    if (!cashBudgetDetails) return;
    const confirmed = await confirm({
      title: 'Approve cash budget?',
      description: `Approve cash budget of ₱${Number(cashBudgetDetails.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}?`,
      confirmLabel: 'Approve',
    });
    if (!confirmed) return;
    try {
      setIsActionPending(true);
      await client.put(`/cash-budgets/${cashBudgetDetails.id}`, { status: 'approved' });
      notify.success('Cash budget approved and ready for disbursement.');
      if (onRefreshNotifications) onRefreshNotifications();
      onClose();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to approve cash budget.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleApprovePo = async () => {
    if (!poDetails) return;
    
    const confirmed = await confirm({
      title: 'Approve purchase order?',
      description: `Approve ${poDetails.po_number} of ₱${Number(poDetails.total_amount || poDetails.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}? This automatically generates the corresponding Cash Budget Request.`,
      confirmLabel: 'Approve',
    });

    if (!confirmed) return;

    try {
      setIsActionPending(true);
      const res = await purchaseOrderApi.approve(poDetails.id, { approved: true });
      if (res.data.success || res.status === 200) {
        notify.success(`Purchase Order ${poDetails.po_number} approved successfully.`);
        if (onRefreshNotifications) onRefreshNotifications();
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to approve PO from notification", err);
      notify.error(err?.response?.data?.message || 'Failed to approve purchase order.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRejectPo = async () => {
    if (!poDetails) return;
    
    const notes = await promptText({
      title: 'Reject purchase order',
      placeholder: 'Provide reason for rejection (optional)…',
      confirmLabel: 'Reject PO',
      cancelLabel: 'Cancel',
      destructive: true,
    });

    if (notes === null) return;

    try {
      setIsActionPending(true);
      const res = await purchaseOrderApi.approve(poDetails.id, { approved: false, notes: notes || '' });
      if (res.data.success || res.status === 200) {
        notify.error(`Purchase Order ${poDetails.po_number} has been rejected.`);
        if (onRefreshNotifications) onRefreshNotifications();
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to reject PO from notification", err);
      notify.error(err?.response?.data?.message || 'Failed to reject purchase order.');
    } finally {
      setIsActionPending(false);
    }
  };

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

          {/* Quick Approval PO Details Section */}
          {isLoadingPo && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 py-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Fetching Purchase Order details...</span>
            </div>
          )}

          {!isLoadingPo && poDetails && (
            <div className="mt-4 p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400">PO Details Summary</span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-450 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-100/40 dark:border-blue-900/30">
                  {poDetails.po_number}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-slate-655 dark:text-gray-300">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400 dark:text-gray-500">Supplier:</span>
                  <span className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                    {poDetails.supplier?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400 dark:text-gray-500">Grand Total:</span>
                  <span className="font-black text-rose-500 dark:text-rose-400 text-sm">
                    ₱{Number(poDetails.total_amount || poDetails.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* PO Line Items */}
              {poDetails.lineItems && poDetails.lineItems.length > 0 && (
                <div className="mt-1 border-t border-slate-100 dark:border-gray-800 pt-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-gray-500 tracking-wider mb-1.5">Items ({poDetails.lineItems.length})</div>
                  <div className="max-h-[100px] overflow-y-auto pr-1 flex flex-col gap-1.5">
                    {poDetails.lineItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start text-[11px] py-1 px-2 bg-white dark:bg-gray-900 rounded-lg border border-slate-100 dark:border-gray-800">
                        <span className="font-medium text-slate-700 dark:text-gray-300 truncate max-w-[180px]">
                          {item.item_name}
                        </span>
                        <span className="font-bold text-slate-500 dark:text-gray-400 shrink-0 ml-2">
                          {item.quantity} x ₱{Number(item.unit_price).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Cash Budget Quick-Disburse Section */}
          {isLoadingCb && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 py-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading cash budget details...</span>
            </div>
          )}

          {!isLoadingCb && cashBudgetDetails && (
            <div className="mt-4 p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Cash Budget Summary</span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-100/40 dark:border-blue-900/30">
                  CB #{cashBudgetDetails.id}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                {cashBudgetDetails.destination && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400 dark:text-gray-500">Destination:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{cashBudgetDetails.destination}</span>
                  </div>
                )}
                {cashBudgetDetails.tripTicket?.control_no && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400 dark:text-gray-500">Trip Ticket:</span>
                    <span className="font-bold text-slate-800 dark:text-white">DTT #{cashBudgetDetails.tripTicket.control_no}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400 dark:text-gray-500">Total Amount:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    ₱{Number(cashBudgetDetails.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`px-6 pb-6 flex items-center gap-3 ${ (poDetails || cashBudgetDetails) ? 'justify-between' : (notification.link ? 'justify-between' : 'justify-end') }`}>
          {cashBudgetDetails && !poDetails ? (
            <div className="flex items-center gap-2.5 w-full">
              <button
                onClick={onClose}
                disabled={isActionPending}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                Dismiss
              </button>
              <button
                onClick={handleApproveCb}
                disabled={isActionPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActionPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
                {!isActionPending && (
                  <span>Approve Budget</span>
                )}
              </button>
            </div>
          ) : poDetails ? (
            <div className="flex items-center gap-2.5 w-full">
              <button
                onClick={handleRejectPo}
                disabled={isActionPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LuX className="w-3.5 h-3.5" />
                Reject
              </button>
              <button
                onClick={handleApprovePo}
                disabled={isActionPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActionPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LuCheck className="w-3.5 h-3.5" />
                )}
                Approve
              </button>
            </div>
          ) : (
            <>
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
            </>
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
  onSendMessage: (text: string, file?: File) => void;
  onImageClick?: (path: string, name: string) => void;
}

function FloatingChatWindow({
  thread,
  theme,
  minimized,
  onMinimize,
  onClose,
  onSendMessage,
  onImageClick
}: FloatingChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!minimized) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread.messages, thread.typing, minimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;
    onSendMessage(inputText, selectedFile || undefined);
    setInputText('');
    setSelectedFile(null);
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
        <div className="flex items-center gap-2 max-w-[70%] select-none">
          <div className="relative shrink-0">
            {thread.senderAvatar ? (
              <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 dark:border-gray-850 shrink-0">
                <img src={getAvatarUrl(thread.senderAvatar) || ''} alt={thread.senderName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-tr ${thread.senderColor}`}>
                {thread.senderInitials}
              </div>
            )}
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
            {minimized ? <LuMaximize2 className="w-3.5 h-3.5" /> : <LuMinus className="w-3.5 h-3.5" />}
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
            {thread.messages.map((item: MessageDetail, idx: number) => {
              const isUser = item.sender === 'user';
              const showStatus = isUser && idx === thread.messages.length - 1;
              
              const displayAvatar = item.senderAvatar || (item.sender === 'peer' ? thread.senderAvatar : undefined);
              const displayInitials = item.senderName ? item.senderName.split(' ').map((w: string) => w.charAt(0)).join('').toUpperCase().substring(0, 2) : thread.senderInitials;
              const displayColor = thread.senderColor;
              const displayName = item.senderName || thread.senderName;
              
              // Calculate if we should show timestamp above this message (gap of 5 minutes or more)
              let showTimestamp = false;
              if (idx === 0) {
                showTimestamp = true;
              } else {
                const prev = thread.messages[idx - 1];
                if (item.timestamp && prev.timestamp) {
                  showTimestamp = (item.timestamp - prev.timestamp) >= 300000; // 5 mins in ms
                } else {
                  showTimestamp = true;
                }
              }
              
              return (
                <div key={item.id || idx} className="flex flex-col w-full">
                  {showTimestamp && (
                    <div className="w-full flex justify-center my-2.5 select-none">
                      <span className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider bg-gray-150/40 dark:bg-gray-800/30 px-2.5 py-0.5 rounded-full">
                        {formatConvoTimestamp(item.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
                    <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
                      {!isUser && (
                        displayAvatar ? (
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 shrink-0 mt-0.5">
                            <img src={getAvatarUrl(displayAvatar) || ''} alt={displayName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0 bg-gradient-to-tr ${displayColor} mt-0.5`}>
                            {displayInitials}
                          </div>
                        )
                      )}
                      
                      <div className="flex flex-col">
                        {thread.id.startsWith('group-') && !isUser && item.senderName && (
                          <span className="text-[8px] text-gray-400 dark:text-gray-550 font-bold ml-1 mb-0.5">{item.senderName}</span>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed flex flex-col gap-1.5 ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : theme === 'dark' ? 'bg-gray-800 text-gray-200 rounded-tl-none' : 'bg-gray-100 text-gray-700 rounded-tl-none'
                        }`}>
                          {item.text && <p className="break-words font-medium">{item.text}</p>}
                          {item.attachmentPath && (
                            <div className={`mt-0.5 rounded-lg overflow-hidden ${item.text ? 'border-t pt-1.5 border-white/20' : ''}`}>
                              {item.attachmentType?.startsWith('image/') || item.attachmentPath.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                <div
                                  onClick={() => onImageClick?.(item.attachmentPath!, item.attachmentName || 'attachment')}
                                  className="block cursor-pointer active:scale-[0.98] transition-all duration-150 hover:opacity-95"
                                  title="Click to preview image"
                                >
                                  <img
                                    src={item.attachmentPath.startsWith('blob:') ? item.attachmentPath : `${client.defaults.baseURL?.replace(/\/api(\/v\d+)?$/, '')}${item.attachmentPath}`}
                                    alt={item.attachmentName || 'attachment'}
                                    className="max-w-full rounded-lg max-h-40 object-cover"
                                  />
                                </div>
                              ) : (
                                <a
                                  href={item.attachmentPath.startsWith('blob:') ? item.attachmentPath : `${client.defaults.baseURL?.replace(/\/api(\/v\d+)?$/, '')}${item.attachmentPath}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={item.attachmentName}
                                  className={`flex items-center gap-2 p-2 rounded-xl text-inherit transition font-semibold ${
                                    isUser ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10'
                                  }`}
                                >
                                  <LuFileText className="w-5 h-5 shrink-0" />
                                  <div className="flex flex-col flex-1 min-w-0 text-left">
                                    <span className="text-[11px] truncate font-bold block">Sent an attachment</span>
                                    <span className="text-[9px] opacity-75 uppercase truncate block">
                                      {item.attachmentName ? item.attachmentName.split('.').pop()?.toUpperCase() : 'FILE'}
                                    </span>
                                  </div>
                                  <LuDownload className="w-4 h-4 shrink-0 ml-1" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {showStatus && (
                      <span className="text-[8px] text-gray-400 font-bold mt-1 pr-1 flex items-center gap-1 select-none">
                        {item.status === 'sending' && <span className="animate-pulse">Sending...</span>}
                        {item.status === 'sent' && 'Sent'}
                        {item.status === 'delivered' && 'Delivered'}
                        {item.status === 'seen' && (
                          <div className="flex items-center gap-1">
                            <span>Seen</span>
                            {thread.senderAvatar ? (
                              <div className="w-3.5 h-3.5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 shrink-0">
                                <img src={getAvatarUrl(thread.senderAvatar) || ''} alt="seen" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 shrink-0">
                                <img 
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(thread.senderName.replace(/\s*\(.*?\)\s*/g, ''))}&background=random&color=fff&size=64`} 
                                  alt="seen" 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {thread.typing && (
              <div className="flex items-start gap-2 max-w-[85%] self-start">
                {thread.senderAvatar ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 shrink-0">
                    <img src={getAvatarUrl(thread.senderAvatar) || ''} alt="typing" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0 bg-gradient-to-tr ${thread.senderColor}`}>
                    {thread.senderInitials}
                  </div>
                )}
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

          {selectedFile && (
            <div className={`px-3.5 py-1.5 flex items-center justify-between border-t text-[10px] select-none font-bold shrink-0 ${
              theme === 'dark' ? 'bg-gray-950/80 border-gray-800 text-gray-400' : 'bg-gray-100/80 border-gray-200 text-slate-500'
            }`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <LuFileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                <span className="truncate max-w-[150px]">{selectedFile.name}</span>
                <span className="opacity-60 shrink-0">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-gray-800 text-red-500 transition active:scale-95 cursor-pointer"
              >
                <LuX className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`h-[52px] border-t px-3 flex items-center gap-2 shrink-0 ${
              theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-full transition active:scale-95 shrink-0 cursor-pointer ${
                theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
              }`}
              title="Attach a file"
            >
              <LuPaperclip className="w-3.5 h-3.5" />
            </button>
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
              disabled={!inputText.trim() && !selectedFile}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-full transition active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <LuSend className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

