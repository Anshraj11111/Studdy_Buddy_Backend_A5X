import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();

async function addTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studdy-buddy');
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      schoolName: String,
      schoolPassword: String,
      city: String,
      xp: { type: Number, default: 0 },
      tokens: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      referralCode: String,
    }, { timestamps: true, strict: false }));

    // Check if user exists
    let user = await User.findOne({ email: 'adityamishraa2509@gmail.com' });
    
    if (user) {
      console.log('User already exists:', user.name);
      // Update with school credentials
      user.schoolName = 'Bardsley';
      user.schoolPassword = 'WZ7FUCXB';
      await user.save();
      console.log('✅ Updated user with school credentials');
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      user = await User.create({
        name: 'Aditya Kumar Mishra',
        email: 'adityamishraa2509@gmail.com',
        password: hashedPassword,
        role: 'student',
        schoolName: 'Bardsley',
        schoolPassword: 'WZ7FUCXB',
        city: 'Jabalpur',
        referralCode: 'ADIT' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      });
      console.log('✅ Created new user with school credentials');
    }

    // Now create PreRegisteredStudent entry
    const PreRegisteredStudent = mongoose.model('PreRegisteredStudent', new mongoose.Schema({
      name: String,
      email: String,
      phone: String,
      schoolName: String,
      schoolPassword: String,
      isUsed: Boolean,
      usedAt: Date,
      createdBy: mongoose.Schema.Types.ObjectId,
    }, { timestamps: true, strict: false }));

    // Check if pre-registered entry exists
    let preReg = await PreRegisteredStudent.findOne({ email: 'adityamishraa2509@gmail.com' });
    
    if (!preReg) {
      // Find an admin user for createdBy
      const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
      
      preReg = await PreRegisteredStudent.create({
        name: 'Aditya Kumar Mishra',
        email: 'adityamishraa2509@gmail.com',
        phone: '',
        schoolName: 'Bardsley',
        schoolPassword: 'WZ7FUCXB',
        isUsed: true,
        usedAt: new Date(),
        createdBy: adminUser?._id,
      });
      console.log('✅ Created PreRegisteredStudent entry');
    } else {
      console.log('PreRegisteredStudent entry already exists');
    }

    console.log('\n✅ All done! User details:');
    console.log('Email:', user.email);
    console.log('School Code:', user.schoolName);
    console.log('School Password:', user.schoolPassword);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addTestUser();
