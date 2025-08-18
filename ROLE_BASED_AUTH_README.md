# Role-Based Authorization System cho Match Management

## **Tổng quan**

Hệ thống đã được cập nhật để có phân quyền rõ ràng dựa trên role và sessionToken, đảm bảo bảo mật và kiểm soát quyền truy cập tốt hơn.

## **Cấu trúc phân quyền**

### **1. Host (Người tạo trận đấu)**
- **Quyền**: Có thể thực hiện tất cả thao tác chỉnh sửa trận đấu
- **Các API được phép**:
  - `PUT /matches/:id/score` - Cập nhật điểm
  - `PUT /matches/:id/teams` - Cập nhật thành viên
  - `PUT /matches/:id/start` - Bắt đầu trận đấu
  - `PUT /matches/:id/end` - Kết thúc trận đấu
  - `DELETE /matches/:id` - Xóa trận đấu

### **2. Participant (Người tham gia)**
- **Quyền**: Chỉ có thể xem thông tin trận đấu
- **Các API được phép**:
  - `GET /matches/:id` - Xem thông tin trận đấu
  - `GET /matches/code/:matchCode` - Xem trận đấu theo mã
  - `POST /matches/join` - Tham gia trận đấu
  - `POST /matches/leave` - Rời khỏi trận đấu

## **Cách hoạt động**

### **1. Khi tạo trận đấu (createMatch)**
```typescript
// Người tạo sẽ được gán role = "host"
{
  membershipId: "MEM-001",
  membershipName: "John Doe",
  role: "host",
  sessionToken: "ST-1234567890-abc123def"
}

// Người khác sẽ được gán role = "participant"
{
  membershipId: "MEM-002", 
  membershipName: "Jane Doe",
  role: "participant",
  sessionToken: "ST-1234567891-xyz789ghi"
}
```

### **2. Khi tham gia trận đấu (joinMatch)**
```typescript
// Tất cả người tham gia đều có role = "participant"
{
  membershipId: "MEM-003",
  membershipName: "Bob Smith", 
  role: "participant",
  sessionToken: "ST-1234567892-def456jkl"
}
```

### **3. Kiểm tra quyền trong API calls**
```typescript
// Middleware requireHostRole sẽ kiểm tra:
1. sessionToken có hợp lệ không
2. user có role = "host" không
3. Nếu không → trả về Error 403 "Chỉ người tạo trận đấu mới có quyền này"
```

## **WebSocket Authentication**

### **1. Client Authentication**
```javascript
// Client gửi sessionToken để xác thực
socket.emit('authenticate_match', {
  matchId: 'MATCH-001',
  sessionToken: 'ST-1234567890-abc123def'
});

// Server response
socket.on('auth_result', (data) => {
  if (data.success) {
    console.log('Role:', data.role); // 'host' hoặc 'participant'
    console.log('User:', data.userInfo.name);
  }
});
```

### **2. Real-time Role Checking**
```javascript
// Server sẽ kiểm tra role trước khi cho phép thao tác
if (member.role === 'host') {
  // Cho phép thực hiện
  socket.emit('action_success', result);
} else {
  // Từ chối
  socket.emit('permission_denied', {
    message: 'Bạn không có quyền chỉnh sửa trận đấu này'
  });
}
```

## **Database Schema**

### **Match Collection Structure**
```typescript
interface IMatchTeamMember {
  membershipId?: string;
  membershipName?: string;
  guestName?: string;
  role: 'host' | 'participant';        // ← MỚI
  sessionToken: string;                 // ← MỚI
}

interface IMatchTeam {
  teamName: string;
  score: number;
  isWinner: boolean;
  members: IMatchTeamMember[];
}
```

## **Security Features**

### **1. SessionToken Security**
- Mỗi sessionToken là duy nhất
- Format: `ST-{timestamp}-{randomString}`
- Không thể giả mạo hoặc đoán được

### **2. Role Enforcement**
- Chỉ host (người tạo) mới có thể chỉnh sửa trận đấu
- Participant chỉ có thể xem và tham gia/rời khỏi
- Không có bypass mechanism

### **3. WebSocket Security**
- Không thể join match room mà không authenticate
- Mỗi action đều được kiểm tra role
- Real-time permission validation

## **Frontend Integration**

### **1. API Calls - Cần thêm sessionToken**
```javascript
// Cập nhật điểm - Cần sessionToken
fetch(`/api/membership/matches/${matchId}/score`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teamIndex: 0,
    score: 5,
    sessionToken: userSessionToken // ← MỚI!
  })
});
```

### **2. WebSocket Authentication**
```javascript
const socket = io('http://localhost:3000');

// Bước 1: Authenticate với sessionToken
socket.emit('authenticate_match', {
  matchId: matchId,
  sessionToken: userSessionToken
});

// Bước 2: Đợi kết quả authentication
socket.on('auth_result', (data) => {
  if (data.success) {
    console.log('Role:', data.role); // 'host' hoặc 'participant'
    console.log('User:', data.userInfo.name);
    
    // Bây giờ mới có thể join room
    socket.emit('join_match_room', matchId);
  }
});
```

### **3. Role-based UI**
```javascript
// Chỉ Host mới thấy nút "Cập nhật điểm"
{userRole === 'host' && (
  <button onClick={updateScore}>Cập nhật điểm</button>
)}

// Participant chỉ thấy thông tin
{userRole === 'participant' && (
  <div>Bạn chỉ có thể xem thông tin trận đấu</div>
)}
```

## **Migration Notes**

### **Nếu có dữ liệu cũ:**
```javascript
// Cần update tất cả matches cũ để có role và sessionToken
db.matches.updateMany(
  { "teams.members.role": { $exists: false } },
  { 
    $set: { 
      "teams.members.role": "participant",
      "teams.members.sessionToken": "LEGACY-TOKEN"
    } 
  }
);
```

### **Nếu tạo trận đấu mới:**
- Tự động gán role và sessionToken
- Không cần thay đổi gì ở client side

## **Troubleshooting**

### **Lỗi thường gặp:**

1. **Error 403 "Bạn không có quyền chỉnh sửa trận đấu này"**
   - Kiểm tra xem sessionToken có đúng không
   - Kiểm tra xem user có role = "host" không

2. **Error 400 "Vui lòng cung cấp sessionToken"**
   - Đảm bảo gửi sessionToken trong request body

3. **WebSocket authentication failed**
   - Kiểm tra sessionToken có hợp lệ không
   - Kiểm tra matchId có đúng không

## **Testing Checklist**

### **✅ Success Cases:**
1. Host có thể updateScore, updateTeamMembers, startMatch, endMatch, deleteMatch
2. Participant có thể xem thông tin match
3. WebSocket authentication thành công với sessionToken hợp lệ

### **❌ Error Cases:**
1. Participant cố gắng updateScore → Error 403
2. SessionToken không hợp lệ → Error 403
3. Không có sessionToken → Error 400
4. WebSocket authentication failed → Không thể join room
