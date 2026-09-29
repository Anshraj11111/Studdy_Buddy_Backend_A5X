import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function fixAllPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB');

    // Find all PreRegisteredStudent entries
    const allPreReg = await PreRegisteredStudent.find({});
    console.log(`\n📊 Found ${allPreReg.length} pre-registered students`);

    let fixedCount = 0;
    let alreadyHashedCount = 0;

    for (const preReg of allPreReg) {
      const password = preReg.schoolPassword;
      
      // Check if password is already a bcrypt hash
      // Bcrypt hashes always start with $2a$, $2b$, or $2y$ and are 60 chars long
      const isBcryptHash = password && password.match(/^\$2[aby]\$\d{2}\$/) && password.length === 60;
      
      if (isBcryptHash) {
        console.log(`✅ ${preReg.email} - Already hashed`);
        alreadyHashedCount++;
      } else {
        console.log(`🔧 ${preReg.email} - Plain text detected: "${password}"`);
        
        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(password, 10);
        preReg.schoolPassword = hashedPassword;
        await preReg.save();
        
        console.log(`   ✅ Fixed! New hash: ${hashedPassword.substring(0, 20)}...`);
        fixedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Processing complete!`);
    console.log(`   Already hashed: ${alreadyHashedCount}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAllPasswords();
