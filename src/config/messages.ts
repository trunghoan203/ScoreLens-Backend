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
  MSG32: 'Manager không tồn tại',

  // Table
  MSG37: 'Bàn đã được tạo thành công.',
  MSG38: 'Bàn đã được cập nhật thành công.',
  MSG40: 'Bàn không tồn tại',
  MSG41: 'Bàn đã được xóa',
  MSG42: 'Vui lòng cung cấp dữ liệu QR code.',
  MSG43: 'Không tìm thấy bàn chơi',
  MSG44: 'Bàn này hiện đang được sử dụng.',
  MSG45: 'Bàn này hiện đang được bảo trì.',
  MSG46: 'Vui lòng cung cấp đầy đủ thông tin.',
  MSG47: 'Danh sách bàn chơi đã được lấy thành công.',

  // Camera
  MSG50: 'Camera đã được xóa',
  MSG51: 'Camera không tồn tại',
  MSG52: 'Camera đã được tạo thành công.',
  MSG53: 'Camera đã được cập nhật thành công.',

  // Membership
  MSG60: 'Câu lạc bộ không tồn tại',
  MSG61: 'Thành viên không tồn tại',
  MSG62: 'Thành viên đã được xóa',
  MSG63: 'Xác thực thành công. Bạn có thể tạo trận đấu.',
  MSG64: 'Thành viên đã được tạo thành công.',
  MSG65: 'Vui lòng cung cấp membershipId.',
  MSG66: 'Thành viên đã được cập nhật thành công.',

  // Notification
  MSG70: 'Thiếu userId hoặc role',
  MSG71: 'Thiếu userId',
  MSG72: 'Không tìm thấy thông báo hoặc bạn không có quyền truy cập',
  MSG73: 'Đã đánh dấu tất cả thông báo là đã đọc',
  MSG74: 'Đã xóa thông báo thành công',

  // Match
  MSG75: 'Trận đấu đã được tạo thành công.',
  MSG76: 'Rời khỏi trận đấu thành công.',
  MSG77: 'Chỉ có thể rời khỏi trận đấu khi đang ở trạng thái chờ.',
  MSG78: 'Tham gia trận đấu thành công.',
  MSG79: 'Bạn đã tham gia trận đấu này rồi.',
  MSG80: 'Người tạo với ID ${createdByMembershipId} không tồn tại.',
  MSG81: 'Trận đấu không tồn tại.',
  MSG82: 'Tài khoản hội viên của ${fullName} đang bị cấm',
  MSG83: 'Người tạo không thuộc cùng thương hiệu với câu lạc bộ',
  MSG84: 'Vui lòng cung cấp teamIndex và score.',
  MSG85: 'Không thể cập nhật thông tin trận đấu đã hoàn thành hoặc đã bị hủy.',
  MSG86: 'Chỉ số đội không hợp lệ.',
  MSG87: 'Teams phải có 2 thành viên trở lên.',
  MSG88: 'Trận đấu đã kết thúc rồi.',
  MSG89: 'Trận đấu đã được xóa thành công.',

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
  MSG105: 'Lỗi khi xóa tài khoản admin.',

  // Admin Service
  MSG107: 'Admin đã có brand, không thể tạo thêm.',
  MSG108: 'Tài khoản Admin và tất cả dữ liệu liên quan đã được xóa thành công.',
  MSG109: 'Admin chưa có brand được gán.',
  MSG110: 'Lỗi xác thực: Không tìm thấy Admin ID trong token.',
  MSG111: 'Vui lòng điền đầy đủ tất cả các trường bắt buộc.',
  MSG112: 'Tài khoản Manager đã được tạo thành công.',
  MSG113: 'Manager ID là bắt buộc.',
  MSG114: 'Thông tin Manager đã được cập nhật thành công.',
  MSG115: 'Manager đã được xóa thành công.',
  MSG116: 'Admin không tồn tại.',
  MSG117: 'Brand không tồn tại hoặc bạn không có quyền.',
  MSG118: 'Xóa brand thành công',
  MSG119: 'Manager đã được vô hiệu hóa thành công.',

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
  MSG133: 'ACCESS_TOKEN hoặc ACCESS_TOKEN_EXPIRE không được xác định trong các biến môi trường',

  // Brand
  MSG134: 'Brand đã được tạo thành công.',
  MSG135: 'Brand đã được cập nhật thành công.',
  MSG136: 'Brand đã được xóa thành công.',

  // Club
  MSG140: 'Câu lạc bộ đã được tạo thành công.',
  MSG141: 'Câu lạc bộ đã được cập nhật thành công.',
  MSG142: 'Câu lạc bộ đã được xóa thành công.',

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