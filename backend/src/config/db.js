import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hitam-transport';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

export default connectDB;
