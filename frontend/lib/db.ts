
if (!cached.promise) {
    const opts = {
        bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        return mongoose;
    });
}

try {
    cached.conn = await cached.promise;
} catch (e) {
    cached.promise = null;
    throw e;
}

return cached.conn;
}

export default connectDB;
