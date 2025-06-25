import mongoose, { Document, Schema } from 'mongoose';

export interface IMatch extends Document {
  tableId: string;
  membershipId: string;
  managerId: string;
  startTime: Date;
  endTime: Date;
}

const MatchSchema = new Schema({
  tableId: {
    type: Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  membershipId: {
    type: Schema.Types.ObjectId,
    ref: 'Membership',
    required: true
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  }
}, {
  timestamps: true
});

export const Match = mongoose.model<IMatch>('Match', MatchSchema); 