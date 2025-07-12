import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
    feedbackId: string;
    createdBy: {
        userId: string;
        type: 'guest' | 'membership';
    };
    clubId: string;
    tableId: string;
    content: string;
    status: 'pending' | 'manager_processing' | 'admin_processing' | 'superadmin_processing' | 'resolved';
    needSupport: boolean;
    note?: string;
    history: Array<{
        by: string;
        role: string;
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
        clubId: { type: String, required: true },
        tableId: { type: String, required: true },
        content: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending', 'manager_processing', 'admin_processing', 'superadmin_processing', 'resolved'],
            default: 'pending'
        },
        needSupport: { type: Boolean, default: false },
        note: { type: String },
        history: [
            {
                by: String,
                role: String,
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