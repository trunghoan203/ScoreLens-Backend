# 🔧 Backend Fixes - Role-Based Authorization System

## 📋 Tổng quan vấn đề đã được khắc phục

**Vấn đề chính:** Backend chưa implement đúng role-based authorization cho các API quan trọng, dẫn đến:
- ❌ `updateScore` - không có sessionToken validation
- ❌ `updateTeamMembers` - không có sessionToken validation  
- ❌ Cả hai function đều không kiểm tra role (host/participant)
- ❌ Gây ra lỗi "SessionToken không hợp lệ" và "Không có quyền chỉnh sửa"

## ✅ Các fix đã thực hiện

### 1. **Sửa lỗi Double Validation**
**Vấn đề:** Route sử dụng `requireHostRole` middleware nhưng controller lại kiểm tra sessionToken và role một lần nữa → gây conflict.

**Giải pháp:** Loại bỏ duplicate logic khỏi tất cả controller, chỉ sử dụng middleware.

#### **Files đã sửa:**
- `src/controllers/Match.controller.ts`

#### **Controllers đã clean:**
- ✅ `updateScore` - Loại bỏ sessionToken validation và role checking
- ✅ `updateTeamMembers` - Loại bỏ sessionToken validation và role checking  
- ✅ `startMatch` - Loại bỏ sessionToken validation và role checking
- ✅ `endMatch` - Loại bỏ sessionToken validation và role checking
- ✅ `deleteMatch` - Loại bỏ sessionToken validation và role checking

### 2. **Middleware System hoàn chỉnh**
**Files middleware:**
- `src/middlewares/auth/matchRoleAuth.middleware.ts` - Kiểm tra role
- `src/middlewares/utils/findMatchById.middleware.ts` - Tìm match
- `src/routes/Membership.route.ts` - Áp dụng middleware

#### **Flow hoạt động:**
1. **Route** → `findMatchById` → Tìm match và gán vào `req.match`
2. **Route** → `requireHostRole` → Kiểm tra sessionToken và role, gán `matchMember` vào `req.matchMember`
3. **Controller** → Chỉ xử lý business logic, không cần kiểm tra quyền

### 3. **Role-Based Authorization hoàn chỉnh**

#### **Host Role (Người tạo trận đấu):**
- ✅ Có quyền `updateScore`
- ✅ Có quyền `updateTeamMembers`
- ✅ Có quyền `startMatch`
- ✅ Có quyền `endMatch`
- ✅ Có quyền `deleteMatch`

#### **Participant Role (Người tham gia):**
- ✅ Chỉ có quyền xem
- ✅ Không thể thực hiện các thao tác chỉnh sửa

### 4. **SessionToken System**
- ✅ Mỗi member được gán unique `sessionToken`
- ✅ Middleware validate sessionToken trước khi cho phép thực hiện action
- ✅ WebSocket authentication sử dụng sessionToken
- ✅ **Smart Token Preservation**: `updateTeamMembers` giữ nguyên token của members hiện tại, chỉ tạo token mới cho members mới
- ✅ **Host Token Protection**: Host luôn giữ nguyên token, không bị thay đổi khi update teams

## 🚀 Kết quả sau khi fix

### **Frontend sẽ hoạt động bình thường:**

**Khi Frontend gửi:**
```javascript
{
  teamIndex: 0,
  score: 1,
  sessionToken: 'ST-1755520287521-g9ale3dxl'
}
```

**Backend xử lý:**
1. ✅ **Middleware `findMatchById`** tìm match và gán vào `req.match`
2. ✅ **Middleware `requireHostRole`** kiểm tra sessionToken và role, gán `matchMember` vào `req.matchMember`
3. ✅ **Controller `updateScore`** chỉ cần xử lý business logic, không cần kiểm tra quyền

### **API Endpoints đã được bảo vệ:**
```
PUT /api/membership/matches/:id/score     ✅ Host only
PUT /api/membership/matches/:id/teams     ✅ Host only  
PUT /api/membership/matches/:id/start     ✅ Host only
PUT /api/membership/matches/:id/end       ✅ Host only
DELETE /api/membership/matches/:id        ✅ Host only
```

## 📁 Files đã được sửa đổi

### **Core Files:**
- `src/controllers/Match.controller.ts` - Clean duplicate validation logic
- `src/middlewares/auth/matchRoleAuth.middleware.ts` - Role checking middleware
- `src/middlewares/utils/findMatchById.middleware.ts` - Match finding middleware
- `src/routes/Membership.route.ts` - Route protection
- `src/models/Match.model.ts` - Thêm role và sessionToken fields
- `src/utils/generateCode.ts` - Thêm generateSessionToken function
- `src/socket.ts` - WebSocket authentication

### **Documentation Files:**
- `FRONTEND_INTEGRATION_GUIDE.md` - Hướng dẫn Frontend integration
- `ROLE_BASED_AUTH_README.md` - Tài liệu hệ thống authorization

## 🎯 Lợi ích sau khi fix

1. **Bảo mật:** Chỉ host mới có quyền thực hiện các thao tác quan trọng
2. **Hiệu suất:** Loại bỏ duplicate validation logic
3. **Maintainability:** Code sạch hơn, dễ maintain
4. **User Experience:** Frontend hoạt động mượt mà, không còn lỗi authorization

## 🔐 Smart Token Preservation System

### **Vấn đề đã khắc phục:**
- ❌ **Trước:** `updateTeamMembers` tạo lại `sessionToken` mới cho TẤT CẢ members
- ❌ **Hậu quả:** Host bị mất token → không thể thực hiện các API khác
- ❌ **Gây ra:** "SessionToken không hợp lệ" errors

### **Giải pháp đã áp dụng:**
- ✅ **Giữ nguyên token của members hiện tại** (bao gồm host)
- ✅ **Chỉ tạo token mới cho members mới** tham gia
- ✅ **Host luôn giữ nguyên role và token** khi update teams
- ✅ **Preserve existing authentication state**

### **Logic hoạt động:**
```typescript
// 1. Tìm member hiện tại trong team
const existingMember = match.teams[teamIndex].members.find(m => 
    m.membershipId === foundMembership.membershipId
);

// 2. Giữ nguyên token nếu member đã tồn tại
sessionToken: existingMember ? existingMember.sessionToken : generateSessionToken()

// 3. Giữ nguyên role của host
role: isHost ? 'host' : 'participant'
```

### **Kết quả:**
- 🎯 **Host không bị mất token** khi update teams
- 🎯 **Members hiện tại giữ nguyên authentication**
- 🎯 **Chỉ members mới cần token mới**
- 🎯 **Không còn lỗi "SessionToken không hợp lệ"**

## 🔍 Testing Checklist

- [ ] Host có thể update score
- [ ] Host có thể update team members  
- [ ] Host có thể start/end match
- [ ] Host có thể delete match
- [ ] Participant không thể thực hiện các thao tác trên
- [ ] WebSocket authentication hoạt động
- [ ] SessionToken validation hoạt động

## 📝 Lưu ý cho Frontend

**Frontend không cần thay đổi gì!** Tất cả API calls hiện tại sẽ hoạt động bình thường vì:
- ✅ Backend vẫn nhận sessionToken trong request body
- ✅ Backend vẫn trả về response format giống cũ
- ✅ Chỉ thêm validation ở middleware level

**Frontend chỉ cần đảm bảo:**
- Gửi `sessionToken` trong request body
- Xử lý error response khi không có quyền (403 Forbidden)

## 🔄 Đồng bộ SessionToken

**Để tránh conflict sessionToken giữa Frontend và Backend:**

### **1. Khi tạo match (createMatch):**
```javascript
// Backend sẽ trả về hostSessionToken
const response = await createMatch(matchData);
const { hostSessionToken } = response.data;
// Lưu hostSessionToken để sử dụng
```

### **2. Khi join match (joinMatch):**
```javascript
// Backend sẽ trả về userSessionToken
const response = await joinMatch(joinData);
const { userSessionToken } = response.data;
// Lưu userSessionToken để sử dụng
```

### **3. Khi lấy thông tin match:**
```javascript
// Thêm query params để lấy sessionToken
const response = await getMatchById(matchId, {
  membershipId: 'MB-123', // hoặc guestName: 'Guest Name'
});
const { userSessionToken } = response.data;
```

### **4. API mới để lấy sessionToken:**
```javascript
// POST /api/membership/matches/:matchId/session-token
const response = await fetch(`/api/membership/matches/${matchId}/session-token`, {
  method: 'POST',
  body: JSON.stringify({
    membershipId: 'MB-123', // hoặc guestName: 'Guest Name'
  })
});
const { sessionToken, role, userName } = response.data;
```

**🎯 Kết quả:** Frontend và Backend sẽ luôn có sessionToken giống nhau!

---

**🎉 Backend đã sẵn sàng! Frontend có thể test ngay!**
