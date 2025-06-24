import mongoose, { Document, Schema } from 'mongoose';

export interface IMatchEvent extends Document {
  matchId: string;
  managerId: string;
  performingPlayerId: string;
  eventType: string;
  description: string;
}

const MatchEventSchema = new Schema({
  matchId: {
    type: Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  },
  performingPlayerId: {
    type: Schema.Types.ObjectId,
    ref: 'TeamMember',
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['score', 'foul', 'timeout', 'other']
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

export const MatchEvent = mongoose.model<IMatchEvent>('MatchEvent', MatchEventSchema); 