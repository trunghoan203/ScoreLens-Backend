import mongoose, { Document, Schema } from 'mongoose';

export interface IMembership extends Document {
  membershipId: string;
  brandId: string;
  fullName: string;
  phoneNumber: string;
}

const MembershipSchema = new Schema({
  membershipId: {
    type: String,
    required: true,
    unique: true
  },
  brandId: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  totalPlayTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema); 