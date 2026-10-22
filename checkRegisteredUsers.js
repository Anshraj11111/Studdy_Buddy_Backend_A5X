import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';
import User from './src/models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔍 Checking registered users who might have login issues...\n');
    
    // Get all used PreReg entries (students who have registered)
    const usedPreReg = await PreRegisteredStudent.find({ isUsed: true });
    console.log(`📊 Total registered students (isUsed=true): ${usedPreReg.length}\n`);
    
    // Check school-wise
    const schoolMap = {};
    usedPreReg.forEach(p => {
      const school = p.schoolName || 'Unknown';
      if (!schoolMap[school]) schoolMap[school] = { count: 0, pwd: null };
      schoolMap[school].count++;
      if (!schoolMap[school].pwd && p.schoolPassword) {
        schoolMap[school].pwd = p.schoolPassword.startsWith('$2') ? 
          'BCRYPT (' + p.schoolPassword.substring(0, 20) + '...)' : 
          p.schoolPassword;
      }
    });
    
    console.log('📚 School-wise breakdown:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Object.entries(schoolMap).sort((a,b) => b[1].count - a[1].count).forEach(([school, info]) => {
      console.log(`${school}: ${info.count} students | Password sample: ${info.pwd}`);
    });
    
    // Check if any plain-text passwords exist that could cause issues  
    const plainTextEntries = usedPreReg.filter(p => p.schoolPassword && !p.schoolPassword.startsWith('$2'));
    console.log(`\n⚠️  Plain text passwords (need attention): ${plainTextEntries.length}`);
    plainTextEntries.forEach(p => {
      console.log(`  - ${p.name} (${p.email}): "${p.schoolPassword}"`);
    });
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
