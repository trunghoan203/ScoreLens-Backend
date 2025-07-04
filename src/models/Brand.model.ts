import mongoose, { Document, Schema } from 'mongoose';

export interface IBrand extends Document {
  brandId: string;
  adminId: string;
  brandName: string;
  numberPhone: string;
  website: string;
  logo_url: string;
  citizenCode: string;
}

const BrandSchema = new Schema({
  brandId: {
    type: String,
    required: true,
    unique: true
  },
  adminId: {
    type: String,
    ref: 'Admin',
    required: true
  },
  brandName: {
    type: String,
    required: true
  },
  logo_url: {
    type: String
  },
  citizenCode: {
    type: String,
    required: true
  },
  numberPhone: {
    type: String,
    required: true
  },
  website: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema); 