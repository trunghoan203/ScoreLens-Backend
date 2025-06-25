import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  teamName: string;
}

const TeamSchema = new Schema({
  teamName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Team = mongoose.model<ITeam>('Team', TeamSchema); 