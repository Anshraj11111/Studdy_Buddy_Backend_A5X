import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

/**
 * Migration script to add schoolPasswordPlain field to existing PreRegisteredStudent entries
 * 
 * NOTE: Since we already hashed all passwords in the previous fix, we CANNOT recover
 * the original plain text passwords. This script will:
 * 1. Add the schoolPasswordPlain field to the schema
 * 2. Set it to empty string for all existing entries
 * 3. Future entries from admin panel will have both hashed and plain text
 * 
 * Admin will need to manually update school passwords for existing students
 * if they want to view them in the admin panel.
 */

async function migrateSchoolPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB');

    // Count total entries
    const total = await PreRegisteredStudent.countDocuments();
    console.log(`\n📊 Found ${total} pre-registered students`);

    // Update all entries to add schoolPasswordPlain field (empty string)
    const result = await PreRegisteredStudent.updateMany(
      { schoolPasswordPlain: { $exists: false } }, // Only update entries without the field
      { $set: { schoolPasswordPlain: '' } }
    );

    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${result.modifiedCount} entries`);
    console.log(`   Already had field: ${total - result.modifiedCount} entries`);
    console.log('\n⚠️  NOTE: Existing entries have empty schoolPasswordPlain.');
    console.log('   Admin will need to manually update passwords for these students');
    console.log('   if they want to view them in the admin panel.');
    console.log('   Future entries will automatically have both hashed and plain text.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateSchoolPasswords();
