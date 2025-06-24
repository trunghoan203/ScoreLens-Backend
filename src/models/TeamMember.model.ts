import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamMember extends Document {
  teamId: string;
  membershipId: string;
  guestName: string;
}

const TeamMemberSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  membershipId: {
    type: Schema.Types.ObjectId,
    ref: 'Membership'
  },
  guestName: {
    type: String
  }
}, {
  timestamps: true
});

// Validation to ensure either membershipId or guestName is provided
TeamMemberSchema.pre('save', function(next) {
  if (!this.membershipId && !this.guestName) {
    next(new Error('Either membershipId or guestName must be provided'));
  }
  if (this.membershipId && this.guestName) {
    next(new Error('Cannot provide both membershipId and guestName'));
  }
  next();
});

export const TeamMember = mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema); 