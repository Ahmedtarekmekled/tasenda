const mongoose = require('mongoose');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

const resetPasswords = async () => {
  try {
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    // Default password for all users
    const defaultPassword = 'password123';
    
    // Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);
    
    // Update all users with the hashed password
    for (const user of users) {
      user.password = hashedPassword;
      await user.save();
      console.log(`Reset password for user: ${user.email}`);
    }
    
    console.log('All passwords have been reset');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting passwords:', error);
    process.exit(1);
  }
};

resetPasswords(); 