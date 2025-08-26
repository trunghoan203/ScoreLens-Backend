import { Request, Response } from 'express';
import { Club } from '../models/Club.model';
import { Brand } from '../models/Brand.model';
import { Admin } from '../models/Admin.model';
import { Table } from '../models/Table.model';
import { MESSAGES } from '../config/messages';

// Tạo club mới (hỗ trợ tạo 1 hoặc nhiều club)
export const createClub = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
  try {
    const adminId = req.admin.adminId;

    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      res.status(404).json({ success: false, message: MESSAGES.MSG116 });
      return;
    }

    if (!admin.brandId) {
      res.status(400).json({ success: false, message: MESSAGES.MSG111 });
      return;
    }

    const brand = await Brand.findOne({ adminId });
    if (!brand) {
      res.status(400).json({ success: false, message: MESSAGES.MSG109 });
      return;
    }
    if (Array.isArray(req.body)) {
      const clubsData = req.body;
      if (clubsData.length === 0) {
        res.status(400).json({ success: false, message: MESSAGES.MSG120 });
        return;
      }

      const addresses = clubsData.map(data => data.address);
      const uniqueAddresses = new Set(addresses);
      if (addresses.length !== uniqueAddresses.size) {
        res.status(400).json({ success: false, message: 'Không thể tạo nhiều chi nhánh với cùng địa chỉ' });
        return;
      }

      for (const data of clubsData) {
        const { address } = data;
        const existingClub = await Club.findOne({ brandId: brand.brandId, address });
        if (existingClub) {
          res.status(400).json({ success: false, message: `Địa chỉ "${address}" đã tồn tại trong hệ thống` });
          return;
        }
      }

      const createdClubs = [];
      for (const data of clubsData) {
        const { clubName, address, phoneNumber, tableNumber, status } = data;
        if (!clubName || !address || !phoneNumber || !tableNumber) {
          res.status(400).json({ success: false, message: MESSAGES.MSG46 });
          return;
        }
        if (tableNumber === 0) {
          res.status(400).json({ success: false, message: 'Số bàn không thể là 0' });
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
          status: status || 'open'
        });
        createdClubs.push(club);
      }

      const clubIds = createdClubs.map(club => club.clubId);
      brand.clubIds = [...brand.clubIds, ...clubIds];
      await brand.save();

      res.status(201).json({ success: true, message: MESSAGES.MSG140 });

      return;
    }
    const { clubName, address, phoneNumber, tableNumber, status } = req.body;
    if (!clubName || !address || !phoneNumber || !tableNumber) {
      res.status(400).json({ success: false, message: MESSAGES.MSG46 });
      return;
    }
    if (tableNumber === 0) {
      res.status(400).json({ success: false, message: 'Số bàn không thể là 0' });
      return;
    }

    // Kiểm tra địa chỉ trùng với các club hiện có
    const existingClub = await Club.findOne({ brandId: brand.brandId, address });
    if (existingClub) {
      res.status(400).json({ success: false, message: `Địa chỉ "${address}" đã tồn tại trong hệ thống` });
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
      status: status || 'open'
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
      res.status(400).json({ success: false, message: MESSAGES.MSG109 });
      return;
    }
    const club = await Club.findOne({ clubId, brandId: brand.brandId });
    if (!club) {
      res.status(404).json({ success: false, message: MESSAGES.MSG60 });
      return;
    }
    const { clubName, address, phoneNumber, tableNumber, status } = req.body;
    if (clubName !== undefined) club.clubName = clubName;
    if (address !== undefined) {
      const existingClub = await Club.findOne({
        brandId: brand.brandId,
        address,
        clubId: { $ne: clubId }
      });
      if (existingClub) {
        res.status(400).json({ success: false, message: `Địa chỉ "${address}" đã tồn tại trong hệ thống` });
        return;
      }
      club.address = address;
    }
    if (phoneNumber !== undefined) club.phoneNumber = phoneNumber;
    if (tableNumber !== undefined) {
      if (tableNumber === 0) {
        res.status(400).json({ success: false, message: 'Số bàn không thể là 0' });
        return;
      }
      club.tableNumber = tableNumber;
    }
    if (status !== undefined) club.status = status;
    await club.save();
    res.status(200).json({ success: true, message: MESSAGES.MSG141, club });
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
      res.status(400).json({ success: false, message: MESSAGES.MSG109 });
      return;
    }
    const club = await Club.findOneAndDelete({ clubId, brandId: brand.brandId });
    if (!club) {
      res.status(404).json({ success: false, message: MESSAGES.MSG60 });
      return;
    }

    brand.clubIds = brand.clubIds.filter(id => id !== clubId);
    await brand.save();

    res.status(200).json({ success: true, message: MESSAGES.MSG142 });
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
      res.status(400).json({ success: false, message: MESSAGES.MSG109 });
      return;
    }

    const clubs = await Club.find({ brandId: brand.brandId });

    const clubsWithTableCount = await Promise.all(
      clubs.map(async (club) => {
        const tableCount = await Table.countDocuments({ clubId: club.clubId });
        return {
          ...club.toObject(),
          actualTableCount: tableCount
        };
      })
    );

    res.status(200).json({ success: true, clubs: clubsWithTableCount });
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
      res.status(400).json({ success: false, message: MESSAGES.MSG109 });
      return;
    }
    const club = await Club.findOne({ clubId, brandId: brand.brandId });
    if (!club) {
      res.status(404).json({ success: false, message: MESSAGES.MSG60 });
      return;
    }

    const actualTableCount = await Table.countDocuments({ clubId: club.clubId });

    const clubWithTableCount = {
      ...club.toObject(),
      actualTableCount
    };

    res.status(200).json({ success: true, club: clubWithTableCount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 