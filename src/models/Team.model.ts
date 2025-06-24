import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  teamId: string;
  teamName: string;
}

const TeamSchema = new Schema({
  teamId: {
    type: String,
    required: true,
    unique: true
  },
  teamName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Team = mongoose.model<ITeam>('Team', TeamSchema); 