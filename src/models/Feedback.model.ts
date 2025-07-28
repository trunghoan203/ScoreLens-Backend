import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
    feedbackId: string;
    createdBy: {
        userId: string;
        type: 'guest' | 'membership';
    };
    clubId: String;
    tableId: String;
    content: string;
    status: 'pending' | 'managerP' | 'adminP' | 'superadminP' | 'resolved';
    needSupport: boolean;
    note?: string;
    history: Array<{
        byId: string;
        byName: string;
        byRole: string;
        action: string;
        note?: string;
        date: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
    {
        feedbackId: { type: String, unique: true },
        createdBy: {
            userId: { type: String },
            type: { type: String, enum: ['guest', 'membership'], required: true }
        },
        clubId: { type: String, ref: 'Club', required: true },
        tableId: { type: String, ref: 'Table', required: true },
        content: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending', 'managerP', 'adminP', 'superadminP', 'resolved'],
            default: 'pending'
        },
        needSupport: { type: Boolean, default: false },
        note: { type: String },
        history: [
            {
                byId: String,
                byName: String,
                byRole: String,
                action: String,
                note: String,
                date: { type: Date, default: Date.now }
            }
        ]
    },
    { timestamps: true }
);

FeedbackSchema.pre('save', function (next) {
    if (!this.feedbackId) {
        this.feedbackId = `FB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
    next();
});

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);