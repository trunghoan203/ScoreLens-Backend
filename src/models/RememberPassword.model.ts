import mongoose, { Schema } from 'mongoose';

export interface IRememberPassword {
  id: string;
  adminId: string;
  tokenHash: string;
  expiresAt: Date;
  isRememberMe: boolean;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const rememberPasswordSchema = new Schema<IRememberPassword>({
  id: { type: String, required: true, unique: true },
  adminId: { type: String, required: true, ref: 'Admin' },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  isRememberMe: { type: Boolean, default: false },
  isRevoked: { type: Boolean, default: false }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
rememberPasswordSchema.index({ adminId: 1 });
rememberPasswordSchema.index({ expiresAt: 1 });
rememberPasswordSchema.index({ tokenHash: 1 });
rememberPasswordSchema.index({ isRevoked: 1 });

// Virtual for checking if token is expired
rememberPasswordSchema.virtual('isExpired').get(function(this: IRememberPassword) {
  return new Date() > this.expiresAt;
});

// Virtual for checking if token is valid
  rememberPasswordSchema.virtual('isValid').get(function(this: IRememberPassword) {
  return !this.isRevoked && !(new Date() > this.expiresAt);
});

export const RememberPassword = mongoose.model<IRememberPassword>('RememberPassword', rememberPasswordSchema); 