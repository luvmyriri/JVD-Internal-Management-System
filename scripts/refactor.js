const fs = require('fs');

const headerPath = 'c:/Users/Val/Desktop/JVD-Internal-Management-System/frontend/src/components/layout/Header.tsx';
let content = fs.readFileSync(headerPath, 'utf8');

// Add Avatar import if it doesn't exist
if (!content.includes("import { Avatar } from '../../components/ds'")) {
    if (!content.includes("import Avatar from '../../components/ds/Avatar'")) {
        // Find last import
        const lastImportIndex = content.lastIndexOf('import ');
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex) + "\nimport Avatar from '../../components/ds/Avatar';" + content.slice(nextLineIndex);
    }
}

// 1. Members block (1117-1125)
const memRegex = /\{u\.senderAvatar \? \(\s*<div[^>]*>\s*<img src=\{getAvatarUrl\(u\.senderAvatar\) \|\| ''\} alt=\{u\.senderName\} className="w-full h-full object-cover" \/>\s*<\/div>\s*\) : \(\s*<div[^>]*>\s*\{u\.senderInitials\}\s*<\/div>\s*\)\}/g;
content = content.replace(memRegex, '<Avatar src={u.senderAvatar} name={u.senderName} size="xs" />');

// 2. Active Chats Left Avatar Badge (1277-1289)
const leftBadgeRegex = /<div className="relative shrink-0 select-none">\s*\{msg\.senderAvatar \? \(\s*<div[^>]*>\s*<img src=\{getAvatarUrl\(msg\.senderAvatar\) \|\| ''\} alt=\{msg\.senderName\} className="w-full h-full object-cover" \/>\s*<\/div>\s*\) : \(\s*<div[^>]*>\s*\{msg\.senderInitials\}\s*<\/div>\s*\)\}\s*\{msg\.online && \(\s*<span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" \/>\s*\)\}\s*<\/div>/g;
content = content.replace(leftBadgeRegex, '<Avatar src={msg.senderAvatar} name={msg.senderName} online={msg.online} size="lg" />');

// 3. User Avatar
const userAvatarRegex = /\{user\.avatar_url \? \(\s*<div[^>]*>\s*<img\s*src=\{getAvatarUrl\(user\.avatar_url \?\? undefined\) \?\? undefined\}\s*alt="Avatar"\s*className="w-full h-full object-cover"\s*\/>\s*<\/div>\s*\) : \(\s*<div[^>]*>\s*\{getInitials\(user\.first_name, user\.last_name\)\}\s*<\/div>\s*\)\}/g;
content = content.replace(userAvatarRegex, '<Avatar src={user.avatar_url} name={`${user.first_name} ${user.last_name}`} size="sm" className="w-7 h-7" />');

// 4. Message Thread modal
const msgThread1 = /\{msgThread\.senderAvatar \? \(\s*<div[^>]*>\s*<img\s*src=\{getAvatarUrl\(msgThread\.senderAvatar\) \|\| ''\}\s*alt=\{msgThread\.senderName\}\s*className="w-full h-full object-cover"\s*\/>\s*<\/div>\s*\) : \(\s*<div[^>]*>\s*\{msgThread\.senderInitials\}\s*<\/div>\s*\)\}/g;
content = content.replace(msgThread1, '<Avatar src={msgThread.senderAvatar} name={msgThread.senderName} size="xl" className="shadow-md" />');

// 5. Message Thread chat header
const msgThread2 = /\{msgThread\.senderAvatar \? \(\s*<div[^>]*>\s*<img\s*src=\{getAvatarUrl\(msgThread\.senderAvatar\) \|\| ''\}\s*alt=\{msgThread\.senderName\}\s*className="w-full h-full object-cover"\s*\/>\s*<\/div>\s*\) : \(\s*<div[^>]*>\s*\{msgThread\.senderInitials\}\s*<\/div>\s*\)\}/g;
// Actually we can replace globally:
const threadHeaderRegex = /\{thread\.senderAvatar \? \(\s*<div[^>]*>\s*<img src=\{getAvatarUrl\(thread\.senderAvatar\) \|\| ''\} alt=\{thread\.senderName\} className="w-full h-full object-cover" \/>\s*<\/div>\s*\) : \(\s*<div[^>]*>\s*\{thread\.senderInitials\}\s*<\/div>\s*\)\}/g;
content = content.replace(threadHeaderRegex, '<Avatar src={thread.senderAvatar} name={thread.senderName} size="md" />');

// 6. Chat messages list avatars
const chatListRegex = /displayAvatar \? \(\s*<div[^>]*>\s*<img src=\{getAvatarUrl\(displayAvatar\) \|\| ''\} alt=\{displayName\} className="w-full h-full object-cover" \/>\s*<\/div>\s*\) : \(\s*<div[^>]*>\s*\{displayInitials\}\s*<\/div>\s*\)/g;
content = content.replace(chatListRegex, '<Avatar src={displayAvatar} name={displayName} size="sm" />');

// 7. Seen avatar
const seenRegex = /\{thread\.senderAvatar \? \(\s*<div[^>]*>\s*<img src=\{getAvatarUrl\(thread\.senderAvatar\) \|\| ''\} alt="seen" className="w-full h-full object-cover" \/>\s*<\/div>\s*\) : \(\s*<img src=\{`https:\/\/ui-avatars\.com\/api\/\?name=\$\{encodeURIComponent\(thread\.senderName\.replace\(\/\\\\s\*\\\\\(.*?\\\\\\\\s\*\/\s*g,\s*''\)\)\}&background=random&color=fff&size=64`\}\s*alt="seen"\s*className="w-full h-full object-cover"\s*\/>\s*\)\}/g;
content = content.replace(seenRegex, '<Avatar src={thread.senderAvatar} name={thread.senderName} size="xs" />');

// 8. Typing avatar
const typingRegex = /\{thread\.senderAvatar \? \(\s*<div[^>]*>\s*<img src=\{getAvatarUrl\(thread\.senderAvatar\) \|\| ''\} alt="typing" className="w-full h-full object-cover" \/>\s*<\/div>\s*\) : \(\s*<div[^>]*>\s*\{thread\.senderInitials\}\s*<\/div>\s*\)\}/g;
content = content.replace(typingRegex, '<Avatar src={thread.senderAvatar} name={thread.senderName} size="xs" />');


fs.writeFileSync(headerPath, content);
console.log('Refactored Header.tsx successfully');
