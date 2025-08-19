process.on('unhandledRejection', (reason: Error | any) => {
    console.log(`Sự từ chối không được xử lý: ${reason.message || reason}`);

    throw new Error(reason.message || reason);
});

process.on('uncaughtException', (error: Error) => {
    console.log(`Ngoại lệ chưa được phát hiện: ${error.message}`);
    // process.exit(1);
});
