import mongoose, { Document, Schema } from 'mongoose';

export interface ITable extends Document {
  tableId: string;
  clubId: string;
  number: number;
  category: string;
  status: string;
}

const TableSchema = new Schema({
  tableId: {
    type: String,
    required: true,
    unique: true
  },
  clubId: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  number: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['pool-8', 'carom']
  },
  status: {
    type: String,
    required: true,
    enum: ['empty', 'inuse', 'maintenance'],
    default: 'empty'
  }
}, {
  timestamps: true
});

export const Table = mongoose.model<ITable>('Table', TableSchema); 