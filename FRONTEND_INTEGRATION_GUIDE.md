# Frontend Integration Guide - Role-Based Authorization System

## **🚨 QUAN TRỌNG: Frontend KHÔNG thể hoạt động với Backend mới nếu không thực hiện những thay đổi dưới đây!**

---

## **📋 Tổng quan thay đổi**

Backend đã được cập nhật với hệ thống phân quyền mới dựa trên **role** và **sessionToken**. Frontend cần thay đổi để:

1. **Gửi sessionToken** trong mọi API call quan trọng
2. **Authenticate WebSocket** trước khi join match room
3. **Hiển thị UI khác nhau** cho Host vs Participant
4. **Xử lý lỗi mới** liên quan đến role

---

## **🔑 1. Session Management - Cần lưu trữ thêm thông tin**

### **Trước đây (cũ):**
```javascript
// Chỉ cần lưu thông tin user cơ bản
const user = {
  id: 'MEM-001',
  name: 'John Doe'
};
```

### **Bây giờ (mới) - Cần lưu thêm:**
```javascript
// Cần lưu cả sessionToken và role
const user = {
  id: 'MEM-001',
  name: 'John Doe',
  sessionToken: 'ST-1234567890-abc123def', // ← MỚI!
  role: 'host' // ← MỚI!
};

// Lưu vào localStorage hoặc state management
localStorage.setItem('userSessionToken', user.sessionToken);
localStorage.setItem('userRole', user.role);
```

---

## **🌐 2. API Calls - Cần thêm sessionToken**

### **❌ Trước đây (cũ) - Sẽ bị lỗi:**
```javascript
// Cập nhật điểm - KHÔNG có sessionToken
fetch(`/api/membership/matches/${matchId}/score`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teamIndex: 0,
    score: 5
    // ← THIẾU sessionToken!
  })
});
// Kết quả: Error 400 "Vui lòng cung cấp sessionToken"
```

### **✅ Bây giờ (mới) - Cần thêm sessionToken:**
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

### **📝 Danh sách API cần thêm sessionToken:**

| API Endpoint | Method | Cần sessionToken |
|--------------|--------|------------------|
| `/matches/:id/score` | PUT | ✅ **Bắt buộc** |
| `/matches/:id/teams` | PUT | ✅ **Bắt buộc** |
| `/matches/:id/start` | PUT | ✅ **Bắt buộc** |
| `/matches/:id/end` | PUT | ✅ **Bắt buộc** |
| `/matches/:id` | DELETE | ✅ **Bắt buộc** |

### **📝 Danh sách API KHÔNG cần sessionToken:**

| API Endpoint | Method | Cần sessionToken |
|--------------|--------|------------------|
| `/matches/:id` | GET | ❌ Không cần |
| `/matches/code/:matchCode` | GET | ❌ Không cần |
| `/matches/join` | POST | ❌ Không cần |
| `/matches/leave` | POST | ❌ Không cần |

---

## **🔌 3. WebSocket Authentication - Cần authenticate trước**

### **❌ Trước đây (cũ) - Sẽ bị lỗi:**
```javascript
const socket = io('http://localhost:3000');

// Trực tiếp join room - KHÔNG authenticate
socket.emit('join_match_room', matchId);
// Kết quả: Không thể join room, không nhận được updates
```

### **✅ Bây giờ (mới) - Cần authenticate:**
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
    
    // Bước 3: Bây giờ mới có thể join room
    socket.emit('join_match_room', matchId);
    
    // Bước 4: Lắng nghe các events
    socket.on('match_updated', (matchData) => {
      console.log('Match updated:', matchData);
      // Update UI
    });
  } else {
    console.error('Authentication failed:', data.message);
    // Hiển thị lỗi cho user
  }
});
```

---

## **🎨 4. Role-based UI - Cần hiển thị khác nhau**

### **❌ Trước đây (cũ) - Tất cả user đều thấy giống nhau:**
```javascript
// Tất cả user đều thấy nút "Cập nhật điểm"
<button onClick={updateScore}>Cập nhật điểm</button>
<button onClick={startMatch}>Bắt đầu trận</button>
<button onClick={endMatch}>Kết thúc trận</button>
```

### **✅ Bây giờ (mới) - Cần kiểm tra role:**

```javascript
// Chỉ Host mới thấy các nút chỉnh sửa
{userRole === 'host' && (
  <div className="host-controls">
    <button onClick={updateScore}>Cập nhật điểm</button>
    <button onClick={updateTeams}>Chỉnh sửa thành viên</button>
    <button onClick={startMatch}>Bắt đầu trận</button>
    <button onClick={endMatch}>Kết thúc trận</button>
    <button onClick={deleteMatch} className="danger">Xóa trận đấu</button>
  </div>
)}

// Participant chỉ thấy thông tin và nút tham gia/rời
{userRole === 'participant' && (
  <div className="participant-view">
    <div className="info-only">
      <p>Bạn chỉ có thể xem thông tin trận đấu</p>
      <p>Chỉ người tạo trận đấu mới có quyền chỉnh sửa</p>
    </div>
    <button onClick={leaveMatch}>Rời khỏi trận đấu</button>
  </div>
)}

// Hiển thị role của user
<div className="user-role">
  <span className={`role-badge ${userRole}`}>
    {userRole === 'host' ? '🏆 Người tạo' : '👥 Người tham gia'}
  </span>
</div>
```

---

## **⚠️ 5. Error Handling - Cần xử lý lỗi mới**

### **❌ Trước đây (cũ) - Chỉ xử lý lỗi cơ bản:**
```javascript
if (response.status === 403) {
  alert('Không có quyền truy cập');
}
```

### **✅ Bây giờ (mới) - Cần xử lý lỗi role-based:**

```javascript
// Xử lý lỗi role-based
if (response.status === 403) {
  const errorData = await response.json();
  
  if (errorData.message === 'Bạn không có quyền chỉnh sửa trận đấu này. Chỉ người tạo trận đấu mới có quyền này.') {
    // Lỗi role - User không phải là host
    showErrorModal({
      title: 'Không có quyền chỉnh sửa',
      message: 'Chỉ người tạo trận đấu mới có quyền thực hiện thao tác này.',
      type: 'warning'
    });
  } else {
    // Lỗi khác
    alert('Không có quyền truy cập');
  }
}

if (response.status === 400) {
  const errorData = await response.json();
  
  if (errorData.message === 'Vui lòng cung cấp sessionToken.') {
    // Lỗi sessionToken - Cần đăng nhập lại
    showErrorModal({
      title: 'Phiên đăng nhập hết hạn',
      message: 'Vui lòng đăng nhập lại để tiếp tục.',
      type: 'error'
    });
    // Redirect to login
    router.push('/login');
  }
}
```

---

## **📱 6. Component Examples - Cách implement cụ thể**

### **Match Control Component:**
```javascript
import React, { useState, useEffect } from 'react';

const MatchControl = ({ matchId, userRole, userSessionToken }) => {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);

  // Update Score - Chỉ Host mới có thể
  const updateScore = async (teamIndex, score) => {
    if (userRole !== 'host') {
      alert('Bạn không có quyền chỉnh sửa điểm');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/membership/matches/${matchId}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIndex,
          score,
          sessionToken: userSessionToken // ← QUAN TRỌNG!
        })
      });

      if (response.ok) {
        const updatedMatch = await response.json();
        setMatch(updatedMatch.data);
        showSuccessMessage('Cập nhật điểm thành công!');
      } else {
        // Xử lý lỗi
        handleApiError(response);
      }
    } catch (error) {
      console.error('Error updating score:', error);
      showErrorMessage('Có lỗi xảy ra khi cập nhật điểm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="match-control">
      {/* Hiển thị role */}
      <div className="role-display">
        <span className={`role-badge ${userRole}`}>
          {userRole === 'host' ? '🏆 Người tạo' : '👥 Người tham gia'}
        </span>
      </div>

      {/* Host Controls */}
      {userRole === 'host' && (
        <div className="host-controls">
          <button 
            onClick={() => updateScore(0, 5)}
            disabled={loading}
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật điểm Team 1'}
          </button>
          
          <button onClick={() => startMatch()}>
            Bắt đầu trận đấu
          </button>
          
          <button onClick={() => endMatch()}>
            Kết thúc trận đấu
          </button>
        </div>
      )}

      {/* Participant View */}
      {userRole === 'participant' && (
        <div className="participant-view">
          <p>Bạn chỉ có thể xem thông tin trận đấu</p>
          <p>Chỉ người tạo trận đấu mới có quyền chỉnh sửa</p>
        </div>
      )}
    </div>
  );
};
```

### **WebSocket Hook:**
```javascript
import { useEffect, useRef } from 'react';

const useMatchSocket = (matchId, userSessionToken) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Khởi tạo socket
    socketRef.current = io('http://localhost:3000');

    // Authenticate với sessionToken
    socketRef.current.emit('authenticate_match', {
      matchId,
      sessionToken: userSessionToken
    });

    // Lắng nghe kết quả authentication
    socketRef.current.on('auth_result', (data) => {
      if (data.success) {
        setUserRole(data.role);
        setIsConnected(true);
        
        // Join match room sau khi authenticate thành công
        socketRef.current.emit('join_match_room', matchId);
        
        console.log(`Authenticated as ${data.role}: ${data.userInfo.name}`);
      } else {
        console.error('Socket authentication failed:', data.message);
        setIsConnected(false);
      }
    });

    // Lắng nghe match updates
    socketRef.current.on('match_updated', (matchData) => {
      console.log('Match updated:', matchData);
      // Update match state
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [matchId, userSessionToken]);

  return { socket: socketRef.current, isConnected, userRole };
};
```

---

## **🧪 7. Testing Checklist**

### **✅ Test Cases cần kiểm tra:**

1. **Host User:**
   - ✅ Có thể updateScore, updateTeams, startMatch, endMatch, deleteMatch
   - ✅ Thấy được tất cả nút điều khiển
   - ✅ WebSocket authenticate thành công với role "host"

2. **Participant User:**
   - ✅ KHÔNG thể thực hiện các thao tác chỉnh sửa
   - ✅ Nhận được lỗi 403 khi cố gắng chỉnh sửa
   - ✅ Chỉ thấy thông tin trận đấu
   - ✅ WebSocket authenticate thành công với role "participant"

3. **Error Handling:**
   - ✅ Không có sessionToken → Error 400
   - ✅ SessionToken không hợp lệ → Error 403
   - ✅ Participant cố gắng chỉnh sửa → Error 403

4. **WebSocket:**
   - ✅ Authenticate trước khi join room
   - ✅ Nhận được real-time updates
   - ✅ Role-based permission checking

---

## **🚀 8. Implementation Steps**

### **Bước 1: Update User State Management**
```javascript
// Thêm sessionToken và role vào user state
const [user, setUser] = useState({
  id: null,
  name: null,
  sessionToken: null, // ← MỚI
  role: null // ← MỚI
});
```

### **Bước 2: Update API Calls**
```javascript
// Thêm sessionToken vào tất cả API calls quan trọng
const apiCall = async (endpoint, data) => {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      sessionToken: user.sessionToken // ← MỚI
    })
  });
  return response;
};
```

### **Bước 3: Update WebSocket Flow**
```javascript
// Authenticate trước, join sau
socket.emit('authenticate_match', { matchId, sessionToken });
socket.on('auth_result', handleAuthResult);
```

### **Bước 4: Update UI Components**
```javascript
// Role-based rendering
{user.role === 'host' ? <HostControls /> : <ParticipantView />}
```

### **Bước 5: Update Error Handling**
```javascript
// Xử lý lỗi role-based
if (response.status === 403) {
  handleRoleError(response);
}
```

---

## **📞 9. Support & Questions**

Nếu có thắc mắc về implementation, hãy liên hệ Backend team hoặc xem file `ROLE_BASED_AUTH_README.md` để có thông tin chi tiết về Backend.

---

## **⚠️ Lưu ý cuối cùng:**

**Frontend KHÔNG thể hoạt động với Backend mới nếu không thực hiện những thay đổi trên!**

Các API calls sẽ trả về lỗi 400 "Vui lòng cung cấp sessionToken" nếu không gửi sessionToken, và WebSocket sẽ không thể join match room nếu không authenticate.

Hãy implement theo đúng hướng dẫn để đảm bảo hệ thống hoạt động ổn định! 🎯
