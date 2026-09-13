import mongoose from 'mongoose';

// PRIMARY DB - where Resources might be stored (checking both DBs)
const PRIMARY_URI = 'mongodb+srv://studdybuddy:Anshraj0001@cluster0.j1irlmw.mongodb.net/studdy-buddy?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(PRIMARY_URI)
  .then(async () => {
    console.log('✅ Connected to PRIMARY database');
    
    const Resource = mongoose.model('Resource', new mongoose.Schema({}, {strict: false, collection: 'resources'}));
    
    // Count total documents
    const total = await Resource.countDocuments();
    console.log(`\n📊 Total lectures in PRIMARY DB: ${total}`);
    
    if (total === 0) {
      console.log('❌ No lectures found in PRIMARY database');
      console.log('Note: Lectures might be in SECONDARY database based on db-multi.js config');
      process.exit(0);
    }
    
    // Check if viewCount field exists
    const sample = await Resource.findOne().lean();
    console.log('\n📋 Sample lecture:');
    console.log('  ID:', sample._id);
    console.log('  Title:', sample.title);
    console.log('  viewCount:', sample.viewCount);
    console.log('  Has viewCount field:', 'viewCount' in sample);
    
    // Count statistics
    const withViews = await Resource.countDocuments({ viewCount: { $exists: true } });
    const withoutViews = total - withViews;
    
    console.log('\n📊 Statistics:');
    console.log('  Total lectures:', total);
    console.log('  With viewCount field:', withViews);
    console.log('  Without viewCount field:', withoutViews);
    
    // If lectures don't have viewCount, add it
    if (withoutViews > 0) {
      console.log('\n🔧 Adding viewCount field to all lectures without it...');
      const result = await Resource.updateMany(
        { viewCount: { $exists: false } },
        { $set: { viewCount: 0 } }
      );
      console.log(`✅ Updated ${result.modifiedCount} lectures with viewCount: 0`);
      console.log('\n✅ Done! Now refresh admin panel to see views.');
    } else {
      console.log('\n✅ All lectures already have viewCount field!');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
