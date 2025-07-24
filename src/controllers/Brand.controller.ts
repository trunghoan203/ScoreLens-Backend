import { Request, Response } from 'express';
import { Brand } from '../models/Brand.model';
import { Admin } from '../models/Admin.model';

// Tạo brand mới
export const createBrand = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        // Kiểm tra admin đã có brand chưa
        const existed = await Brand.findOne({ adminId });
        if (existed) {
            res.status(400).json({ success: false, message: 'Admin đã có brand, không thể tạo thêm.' });
            return;
        }
        const { brandName, phoneNumber, website, logo_url, citizenCode } = req.body;
        if (!brandName || !phoneNumber || !citizenCode || !logo_url) {
            res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin brand.' });
            return;
        }
        const brandId = `BR-${Date.now()}`;
        const brand = await Brand.create({
            brandId,
            adminId,
            brandName,
            phoneNumber,
            website,
            logo_url,
            citizenCode
        });

        // Cập nhật brandId cho admin
        await Admin.findOneAndUpdate(
            { adminId },
            { brandId: brand.brandId }
        );

        res.status(201).json({ success: true, brand });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Sửa thông tin brand
export const updateBrand = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const { brandId } = req.params;
        const { brandName, phoneNumber, website, logo_url, citizenCode } = req.body;
        const brand = await Brand.findOne({ brandId, adminId });
        if (!brand) {
            res.status(404).json({ success: false, message: 'Brand không tồn tại hoặc bạn không có quyền.' });
            return;
        }
        if (brandName !== undefined) brand.brandName = brandName;
        if (phoneNumber !== undefined) brand.phoneNumber = phoneNumber;
        if (website !== undefined) brand.website = website;
        if (logo_url !== undefined) brand.logo_url = logo_url;
        if (citizenCode !== undefined) brand.citizenCode = citizenCode;
        await brand.save();
        res.status(200).json({ success: true, brand });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy danh sách brand của admin
export const getBrands = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const brands = await Brand.find({ adminId });
        res.status(200).json({ success: true, brands });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy chi tiết brand theo brandId
export const getBrandDetail = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const { brandId } = req.params;
        const brand = await Brand.findOne({ brandId, adminId });
        if (!brand) {
            res.status(404).json({ success: false, message: 'Brand không tồn tại hoặc bạn không có quyền.' });
            return;
        }
        res.status(200).json({ success: true, brand });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Xóa brand
export const deleteBrand = async (req: Request & { admin?: any }, res: Response): Promise<void> => {
    try {
        const adminId = req.admin.adminId;
        const { brandId } = req.params;
        const brand = await Brand.findOneAndDelete({ brandId, adminId });
        if (!brand) {
            res.status(404).json({ success: false, message: 'Brand không tồn tại hoặc bạn không có quyền.' });
            return;
        }

        // Cập nhật brandId về null cho admin
        await Admin.findOneAndUpdate(
            { adminId },
            { brandId: null }
        );

        res.status(200).json({ success: true, message: 'Xóa brand thành công.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}; 