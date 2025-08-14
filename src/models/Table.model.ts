import mongoose, { Document, Schema } from 'mongoose';

export interface ITable extends Document {
  tableId: string;
  clubId: string;
  name: string;
  category: string;
  status: string;
  qrCodeData?: string;
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
  },
  qrCodeData: {
    type: String
  }
}, {
  timestamps: true
});

TableSchema.pre('save', function (next) {
  if (!this.tableId) {
    this.tableId = `TB-${Date.now()}`;
  }

  const baseUrl = process.env.FRONTEND_URL;

  if (this.isModified('tableId') || this.isModified('name') || !this.qrCodeData) {
    const params = new URLSearchParams({
      tableId: this.tableId,
      tableName: encodeURIComponent(this.name)
    });

    this.qrCodeData = `${baseUrl}/user/login?${params.toString()}`;
  }
  next();
});

export const Table = mongoose.model<ITable>('Table', TableSchema); 