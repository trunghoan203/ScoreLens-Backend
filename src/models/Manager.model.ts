import { Schema, model } from 'mongoose';
import jwt from 'jsonwebtoken';
import { IManager } from '../interfaces/Manager.interface';

const ManagerSchema: Schema<IManager> = new Schema({
    managerId: {
        type: String,
        unique: true
    },
    clubId: {
        type: String,
        ref: 'Club',
        required: true
    },
    fullName: {
        type: String,
        required: [true, 'Tên không được để trống'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email không được để trống'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Vui lòng cung cấp email hợp lệ'
        ]
    },
    phoneNumber: {
        type: String,
        required: [true, 'Số điện thoại không được để trống'],
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Ngày sinh không được để trống']
    },
    citizenCode: {
        type: String,
        required: [true, 'Số CCCD không được để trống'],
        unique: true,
        trim: true
    },
    activationCode: {
        type: String,
        default: null
    },
    activationCodeExpires: {
        type: Date,
        default: null
    },
    address: {
        type: String,
        required: [true, 'Địa chỉ không được để trống'],
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

ManagerSchema.pre('save', function (next) {
    if (!this.managerId) {
        this.managerId = `MNG-${Date.now()}`;
    }
    next();
});

ManagerSchema.methods.signAccessToken = function (): string {
    const accessTokenSecret = process.env.ACCESS_TOKEN;
    const accessTokenExpire = process.env.ACCESS_TOKEN_EXPIRE;

    if (!accessTokenSecret || !accessTokenExpire) {
        console.error('JWT Access Token secrets or expiration are not defined in .env');
        throw new Error('Server configuration error: JWT secrets are missing.');
    }

    return jwt.sign({ managerId: this.managerId, role: 'MANAGER' }, accessTokenSecret,
        { expiresIn: accessTokenExpire } as jwt.SignOptions);
};

ManagerSchema.methods.signRefreshToken = function (): string {
    const refreshTokenSecret = process.env.REFRESH_TOKEN;
    const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE;

    if (!refreshTokenSecret || !refreshTokenExpire) {
        console.error('JWT Refresh Token secrets or expiration are not defined in .env');
        throw new Error('Server configuration error: JWT secrets are missing.');
    }

    return jwt.sign({ managerId: this.managerId, role: 'MANAGER' }, refreshTokenSecret,
        { expiresIn: refreshTokenExpire } as jwt.SignOptions);
};

export const Manager = model<IManager>('Manager', ManagerSchema);