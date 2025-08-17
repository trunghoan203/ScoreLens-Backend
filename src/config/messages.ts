// Response Messages Configuration
export const MESSAGES = {
  // Auth
  MSG01: 'Đăng nhập thành công',
  MSG02: 'Đăng xuất thành công',
  MSG03: 'Đăng ký thành công',
  MSG04: 'Xác thực email thành công',
  MSG05: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu',
  MSG06: 'Email đã được đăng ký',
  MSG07: 'Mã xác thực đã được gửi đến email',
  MSG08: 'Thông tin đăng nhập không hợp lệ',
  MSG09: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để nhận mã xác thực.',
  MSG10: 'Không có refresh token được cung cấp',
  MSG11: 'Refresh token không hợp lệ',
  MSG12: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.',
  MSG13: 'Mã đặt lại đã được xác thực thành công. Bạn có thể đặt mật khẩu mới.',
  MSG14: 'Cập nhật mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.',
  MSG15: 'Mã đặt lại không hợp lệ',
  MSG16: 'Mã đặt lại đã hết hạn',
  MSG17: 'Vui lòng xác thực mã đặt lại trước khi tiếp tục',
  MSG18: 'Tài khoản đã được xác thực',
  MSG19: 'Tài khoản chưa được xác thực. Vui lòng xác thực tài khoản trước.',
  MSG20: 'Không được phép truy cập',
  MSG21: 'Vui lòng nhập email và mật khẩu',
  MSG22: 'Vui lòng cung cấp email',
  MSG23: 'Mã xác thực không hợp lệ',
  MSG24: 'Mã xác thực đã hết hạn',
  // Super Admin
  MSG30: 'Super Admin không tồn tại',
  MSG31: 'Admin không tồn tại',

  // Table
  MSG40: 'Bàn không tồn tại',
  MSG41: 'Bàn đã được xóa',
  MSG42: 'Vui lòng cung cấp dữ liệu QR code.',

  // Camera
  MSG50: 'Camera đã được xóa',

  // Membership
  MSG60: 'Câu lạc bộ không tồn tại',
  MSG61: 'Thành viên không tồn tại',
  MSG62: 'Thành viên đã được xóa',

  // Notification
  MSG70: 'Thiếu userId hoặc role',
  MSG71: 'Thiếu userId',

  // Match
  MSG80: 'Người tạo với ID ${createdByMembershipId} không tồn tại.',
  MSG81: 'Trận đấu không tồn tại.',

  // Middleware
  MSG90: 'Không có token được cung cấp, vui lòng đăng nhập.',
  MSG91: 'Token không hợp lệ hoặc người dùng chưa được xác thực.',
  MSG92: 'Dữ liệu token không hợp lệ.',
  MSG93: 'Token đã hết hạn, vui lòng đăng nhập lại.',
  MSG94: 'Định dạng token không hợp lệ.',
  MSG95: 'Không được phép truy cập tài nguyên này.',
  MSG96: 'Match ID là bắt buộc trong params.',
  MSG97: 'Cần có định danh người thực hiện (actorMembershipId hoặc actorGuestToken).',
  MSG98: 'Token không hợp lệ: Không tìm thấy thành viên.',
  MSG99: 'Không có file được upload.',

  // Error
  MSG100: 'Lỗi máy chủ nội bộ',
  MSG101: 'Không tìm thấy tài nguyên. Không hợp lệ: ${error.path}',
  MSG102: 'Dữ liệu trùng lặp ${Object.keys(error.keyValue)} đã được nhập',
  MSG103: 'Json web token không hợp lệ, hãy thử lại',
  MSG104: 'Json web token đã hết hạn, hãy thử lại',

  // Admin Service
  MSG110: 'Lỗi xác thực: Không tìm thấy Admin ID trong token.',
  MSG111: 'Vui lòng điền đầy đủ tất cả các trường bắt buộc.',
  MSG112: 'Tài khoản Manager đã được tạo thành công.',
  MSG113: 'Manager ID là bắt buộc.',
  MSG114: 'Thông tin Manager đã được cập nhật thành công.',
  MSG115: 'Manager đã được xóa thành công.',
  MSG116: 'Admin không tồn tại.',
  MSG117: 'Brand không tồn tại hoặc bạn không có quyền.',

  // Generic
  MSG120: 'Request body là bắt buộc',
  MSG121: 'Email là bắt buộc',
  MSG122: 'Refresh token là bắt buộc',

  // Mail
  MSG123: 'Mã xác thực đã được gửi đến email của bạn. Mã này sẽ hết hạn trong 10 phút.',
  MSG124: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn. Mã này sẽ hết hạn trong 10 phút.',
  MSG125: 'Email thông báo đăng ký thành công đã được gửi.',

  // TOKEN
  MSG130: 'ACCESS_TOKEN không được xác định trong các biến môi trường',
  MSG131: 'REFRESH_TOKEN không được xác định trong các biến môi trường',
  MSG132: 'REFRESH_TOKEN hoặc REFRESH_TOKEN_EXPIRE không được xác định trong các biến môi trường',
  MSG133: 'ACCESS_TOKEN hoặc ACCESS_TOKEN_EXPIRE không được xác định trong các biến môi trường'

};

// Type for message codes
export type MessageCode = keyof typeof MESSAGES;

// Helper function to get message by code
export const getMessage = (code: MessageCode): string => {
  return MESSAGES[code] || 'Thông báo không xác định';
};

// Helper function to get message with parameters
export const getMessageWithParams = (code: MessageCode, params: Record<string, string>): string => {
  let message = MESSAGES[code] || 'Thông báo không xác định';
  
  Object.entries(params).forEach(([key, value]) => {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  
  return message;
};

// Export default for convenience
export default MESSAGES; 