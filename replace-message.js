const fs = require('fs');
const path = require('path');

// Đọc file messages.ts để lấy mapping
const messagesPath = path.join(__dirname, 'src/config/messages.ts');
const messagesContent = fs.readFileSync(messagesPath, 'utf8');

// Parse các message từ file messages.ts
const messageRegex = /MSG\d+:\s*'([^']+)'/g;
const messageMap = new Map();
let match;

while ((match = messageRegex.exec(messagesContent)) !== null) {
    const msgCode = match[0].split(':')[0].trim();
    const message = match[1];
    messageMap.set(message, msgCode);
}

console.log('Found messages:', messageMap.size);

// Hàm thay thế message trong file
function replaceMessagesInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        messageMap.forEach((msgCode, message) => {
            const regex = new RegExp(`'${message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g');
            if (regex.test(content)) {
                content = content.replace(regex, `MESSAGES.${msgCode}`);
                hasChanges = true;
                console.log(`Replaced in ${filePath}: "${message}" -> MESSAGES.${msgCode}`);
            }
        });
        
        if (hasChanges) {
            // Thêm import MESSAGES nếu chưa có
            if (!content.includes("import { MESSAGES }") && !content.includes("import MESSAGES")) {
                const lines = content.split('\n');
                let lastImportIndex = -1;
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim().startsWith('import ')) {
                        lastImportIndex = i;
                    }
                }
                
                if (lastImportIndex !== -1) {
                    lines.splice(lastImportIndex + 1, 0, "import { MESSAGES } from '../config/messages';");
                    content = lines.join('\n');
                }
            }
            
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        return false;
    }
}

// Hàm duyệt thư mục và xử lý các file
function processDirectory(dirPath, extensions = ['.ts', '.js']) {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (item !== 'node_modules' && item !== '.git' && !item.startsWith('.')) {
                processDirectory(fullPath, extensions);
            }
        } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (extensions.includes(ext)) {
                if (item !== 'messages.ts' && item !== 'replace-messages.js') {
                    replaceMessagesInFile(fullPath);
                }}
            }
        });
    }
    
    // Bắt đầu xử lý từ thư mục src
    console.log('\nStarting message replacement...');
    processDirectory('src', ['.ts']);
    console.log('\nMessage replacement completed!');