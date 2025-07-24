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
    unique: true
  },
  clubId: {
    type: String,
    ref: 'Club',
    required: true
  },
  name: {
    type: String,
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

// Tự động sinh tableId trước khi save
TableSchema.pre('save', function (next) {
  if (!this.tableId) {
    this.tableId = `TB-${Date.now()}`;
  }
  next();
});

export const Table = mongoose.model<ITable>('Table', TableSchema); 