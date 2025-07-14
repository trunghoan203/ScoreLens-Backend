import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IBrand extends Document {
  brandId: string;
  adminId: string;
  brandName: string;
  numberPhone: string;
  website: string;
  logo_url: string;
  citizenCode: string;
  clubIds: string[];
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
  },
  clubIds: {
    type: [String],
    default: [],
    ref: 'Club'
  }
}, {
  timestamps: true
});

BrandSchema.pre('save', async function (next) {
  if (this.isModified('citizenCode')) {
    const salt = await bcrypt.genSalt(10);
    this.citizenCode = await bcrypt.hash(this.citizenCode, salt);
  }
  next();
});

BrandSchema.methods.compareCitizenCode = async function (candidateCode: string): Promise<boolean> {
  return bcrypt.compare(candidateCode, this.citizenCode);
};

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema); 