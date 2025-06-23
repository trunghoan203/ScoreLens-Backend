import mongoose, { Document, Schema } from 'mongoose';

export interface IMatchTeam extends Document {
  matchTeamId: string;
  matchId: string;
  teamId: string;
  totalScore: number;
  isWin: boolean;
}

const MatchTeamSchema = new Schema({
  matchTeamId: {
    type: String,
    required: true,
    unique: true
  },
  matchId: {
    type: Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  totalScore: {
    type: Number,
    required: true,
    default: 0
  },
  isWin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const MatchTeam = mongoose.model<IMatchTeam>('MatchTeam', MatchTeamSchema); 