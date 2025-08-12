import { Request, Response } from 'express';
import { Club } from '../models/Club.model';
import { Brand } from '../models/Brand.model';
import { Admin } from '../models/Admin.model';

// Tạo club mới (hỗ trợ tạo 1 hoặc nhiều club)
export const createClub = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
  try {
    const adminId = req.admin.adminId;
    
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin không tồn tại.' });
      return;
    }
    
    if (!admin.brandId) {
      res.status(400).json({ success: false, message: 'Admin phải có brand mới được tạo club.' });
      return;
    }
    
    const brand = await Brand.findOne({ adminId });
    if (!brand) {
      res.status(400).json({ success: false, message: 'Admin chưa có brand, không thể tạo club.' });
      return;
    }
    // Nếu body là mảng: tạo nhiều club
    if (Array.isArray(req.body)) {
      const clubsData = req.body;
      if (clubsData.length === 0) {
        res.status(400).json({ success: false, message: 'Danh sách club rỗng.' });
        return;
      }
      const createdClubs = [];
      for (const data of clubsData) {
        const { clubName, address, phoneNumber, tableNumber, status } = data;
        if (!clubName || !address || !phoneNumber || !tableNumber) {
          res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin cho từng club.' });
          return;
        }
        const clubId = `CLB-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        const club = await Club.create({
          clubId,
          brandId: brand.brandId,
          clubName,
          address,
          phoneNumber,
          tableNumber,
          status: status || 'open'
        });
        createdClubs.push(club);
      }
      
      const clubIds = createdClubs.map(club => club.clubId);
      brand.clubIds = [...brand.clubIds, ...clubIds];
      await brand.save();
      
      res.status(201).json({ success: true, clubs: createdClubs });
      
      return;
    }
    // Nếu body là object: tạo 1 club
    const { clubName, address, phoneNumber, tableNumber, status } = req.body;
    if (!clubName || !address || !phoneNumber || !tableNumber) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin club.' });
      return;
    }
    const clubId = `CLB-${Date.now()}`;
    const club = await Club.create({
      clubId,
      brandId: brand.brandId,
      clubName,
      address,
      phoneNumber,
      tableNumber,
      status: status || 'maintenance'
    });
    
    brand.clubIds.push(club.clubId);
    await brand.save();

    res.status(201).json({ success: true, club });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sửa thông tin club
export const updateClub = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
  try {
    const adminId = req.admin.adminId;
    const { clubId } = req.params;
    const brand = await Brand.findOne({ adminId });
    if (!brand) {
      res.status(400).json({ success: false, message: 'Admin chưa có brand.' });
      return;
    }
    const club = await Club.findOne({ clubId, brandId: brand.brandId });
    if (!club) {
      res.status(404).json({ success: false, message: 'Club không tồn tại hoặc không thuộc quyền quản lý.' });
      return;
    }
    const { clubName, address, phoneNumber, tableNumber, status } = req.body;
    if (clubName !== undefined) club.clubName = clubName;
    if (address !== undefined) club.address = address;
    if (phoneNumber !== undefined) club.phoneNumber = phoneNumber;
    if (tableNumber !== undefined) club.tableNumber = tableNumber;
    if (status !== undefined) club.status = status;
    await club.save();
    res.status(200).json({ success: true, club });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Xóa club
export const deleteClub = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
  try {
    const adminId = req.admin.adminId;
    const { clubId } = req.params;
    const brand = await Brand.findOne({ adminId });
    if (!brand) {
      res.status(400).json({ success: false, message: 'Admin chưa có brand.' });
      return;
    }
    const club = await Club.findOneAndDelete({ clubId, brandId: brand.brandId });
    if (!club) {
      res.status(404).json({ success: false, message: 'Club không tồn tại hoặc không thuộc quyền quản lý.' });
      return;
    }
    
    // Xóa clubId khỏi mảng clubIds của brand
    brand.clubIds = brand.clubIds.filter(id => id !== clubId);
    await brand.save();
    
    res.status(200).json({ success: true, message: 'Xóa club thành công.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy danh sách club của brand (admin)
export const getClubs = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
  try {
    const adminId = req.admin.adminId;
    const brand = await Brand.findOne({ adminId });
    if (!brand) {
      res.status(400).json({ success: false, message: 'Admin chưa có brand.' });
      return;
    }
    const clubs = await Club.find({ brandId: brand.brandId });
    res.status(200).json({ success: true, clubs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy chi tiết 1 club theo clubId
export const getClubDetail = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
  try {
    const adminId = req.admin.adminId;
    const { clubId } = req.params;
    const brand = await Brand.findOne({ adminId });
    if (!brand) {
      res.status(400).json({ success: false, message: 'Admin chưa có brand.' });
      return;
    }
    const club = await Club.findOne({ clubId, brandId: brand.brandId });
    if (!club) {
      res.status(404).json({ success: false, message: 'Club không tồn tại hoặc không thuộc quyền quản lý.' });
      return;
    }
    res.status(200).json({ success: true, club });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 