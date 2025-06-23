import mongoose, { Document, Schema } from 'mongoose';

export interface IBrand extends Document {
  brandId: string;
  adminId: string;
  brandName: string;
  website: string;
  logo_url: string;
}

const BrandSchema = new Schema({
  brandId: {
    type: String,
    required: true,
    unique: true
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  brandName: {
    type: String,
    required: true
  },
  website: {
    type: String
  },
  logo_url: {
    type: String
  }
}, {
  timestamps: true
});

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema); 