import mongoose, { Document, Schema } from 'mongoose';

export interface IMembership extends Document {
  membershipId: string;
  brandId: string;
  fullName: string;
  phoneNumber: string;
  status: 'active' | 'inactive';
}

const MembershipSchema = new Schema({
  membershipId: {
    type: String,
    unique: true
  },
  brandId: {
    type: String,
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
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

MembershipSchema.pre('save', function (next) {
  if (!this.membershipId) {
    this.membershipId = `MB-${Date.now()}`;
  }
  next();
});

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);