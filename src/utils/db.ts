import mongoose, { ConnectOptions, Error } from 'mongoose';

mongoose.set('strictQuery', true);

// Connecting to MongoDB(Connecting to the Database)
export const connectDB = (MONGODB_URI: any) => {
    // @event connected: Emitted when this connection successfully connects to the db. May be emitted multiple times in reconnected scenarios
    mongoose.connection.on('connected', () => {
        if (process?.env?.NODE_ENV && process.env.NODE_ENV === 'development') {
            console.log('Kết nối cơ sở dữ liệu MongoDB đã được thiết lập thành công');
        }
    });

    mongoose.connection.on('reconnected', () => {
        if (process?.env?.NODE_ENV && process.env.NODE_ENV === 'development') {
            console.log('Kết nối Mongo được thiết lập lại');
        }
    });

    // @event error: Emitted when an error occurs on this connection.
    mongoose.connection.on('error', (error: Error) => {
        if (process?.env?.NODE_ENV && process.env.NODE_ENV === 'development') {
            console.log('Lỗi kết nối MongoDB. Vui lòng đảm bảo MongoDB đang chạy.: ');
            console.log(`Lỗi kết nối Mongo: ${error}`);
        }
    });

    // @event close
    mongoose.connection.on('close', () => {
        if (process?.env?.NODE_ENV && process.env.NODE_ENV === 'development') {
            console.log('Kết nối Mongo đã đóng...');
        }
    });

    // @event disconnected: Emitted after getting disconnected from the db
    mongoose.connection.on('disconnected', () => {
        if (process?.env?.NODE_ENV && process.env.NODE_ENV === 'development') {
            console.log('Kết nối cơ sở dữ liệu MongoDB đã bị ngắt kết nối...');
            console.log('Đang cố gắng kết nối lại với Mongo ...');
        }

        setTimeout(() => {
            mongoose.connect(MONGODB_URI, {
                socketTimeoutMS: 3000,
                connectTimeoutMS: 3000
                // useNewUrlParser: true,
                // useUnifiedTopology: true
                // useFindAndModify: true,
                // useCreateIndex: true,
            } as ConnectOptions);
        }, 3000);
    });

    // @event close: Emitted after we disconnected and onClose executed on all of this connections models.
    process.on('SIGINT', async () => {
        try {
            await mongoose.connection.close();
            console.log('Kết nối MongoDB bị đóng do ứng dụng bị chấm dứt');
            process.exit(0);
        } catch (err) {
            console.error('Lỗi khi ngắt kết nối MongoDB:', err);
            process.exit(1);
        }
    });

    // mongoose.connect return promise
    mongoose.connect(MONGODB_URI, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true
    } as ConnectOptions);

    return mongoose.connect(MONGODB_URI);
};

export default connectDB;
