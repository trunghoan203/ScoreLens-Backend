import mongoose, { Document, Schema } from 'mongoose';

export interface IClub extends Document {
  clubId: string;
  brandId: string;
  clubName: string;
  address: string;
  phoneNumber: string;
  tableNumber: number;
  status: string;
}

const ClubSchema = new Schema({
  clubId: {
    type: String,
    required: true,
    unique: true
  },
  brandId: {
    type: String,
    ref: 'Brand',
    required: true
  },
  clubName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  tableNumber: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'closed', 'maintenance'],
    default: 'maintenance'
  }
}, {
  timestamps: true
});

export const Club = mongoose.model<IClub>('Club', ClubSchema); 