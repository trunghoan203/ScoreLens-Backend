import mongoose, { Document, Schema } from 'mongoose';

export interface IMatchTeamMember {
  membershipId?: string;
  guestName?: string;
}

export interface IMatchTeam {
  teamName: string;
  score: number;
  isWinner: boolean;
  members: IMatchTeamMember[];
}

export interface IMatch extends Document {
  matchId: string;
  tableId: string;
  managerId?: string;
  createdByMembershipId?: string;
  isAiAssisted: boolean;
  gameType: 'pool-8' | 'carom';
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  matchCode: string;
  teams: IMatchTeam[];
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema con cho thành viên trong đội
const MatchTeamMemberSchema = new Schema({
  membershipId: {
    type: String,
    ref: 'Membership',
    default: null,
  },
  guestName: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Schema con cho đội trong trận đấu
const MatchTeamSchema = new Schema({
  teamName: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  isWinner: {
    type: Boolean,
    default: false,
  },
  members: [MatchTeamMemberSchema],
});

const MatchSchema = new Schema({
  matchId: {
    type: String,
    unique: true,
    required: true,
  },
  tableId: {
    type: String,
    ref: 'Table',
    required: true,
  },
  managerId: {
    type: String,
    ref: 'Manager',
    default: null,
  },
  createdByMembershipId: {
    type: String,
    ref: 'Membership',
    default: null,
  },
  isAiAssisted: {
    type: Boolean,
    default: false,
  },
  gameType: {
    type: String,
    enum: ['pool-8', 'carom'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'ongoing', 'completed', 'cancelled'],
    default: 'pending',
  },
  matchCode: {
    type: String,
    unique: true,
    required: true,
  },
  teams: [MatchTeamSchema],
  startTime: { type: Date },
  endTime: { type: Date },
}, { timestamps: true });

export const Match = mongoose.model<IMatch>('Match', MatchSchema);