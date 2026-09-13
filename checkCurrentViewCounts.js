import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkViewCounts = async () => {
  try {
    // Connect to PRIMARY database
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to PRIMARY database');

    // Get Resource model
    const Resource = mongoose.model('Resource', new mongoose.Schema({}, { strict: false }));

    // Find all resources with their view counts
    const resources = await Resource.find({}, { 
      title: 1, 
      viewCount: 1, 
      type: 1,
      fileType: 1 
    }).sort({ title: 1 });

    console.log(`\n📊 Current View Counts (${resources.length} lectures):\n`);
    
    resources.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.title || 'Untitled'}`);
      console.log(`   Type: ${resource.type || resource.fileType || 'N/A'}`);
      console.log(`   Views: ${resource.viewCount || 0}`);
      console.log('');
    });

    // Summary
    const totalViews = resources.reduce((sum, r) => sum + (r.viewCount || 0), 0);
    const lecturesWithViews = resources.filter(r => (r.viewCount || 0) > 0).length;

    console.log(`\n📈 Summary:`);
    console.log(`Total lectures: ${resources.length}`);
    console.log(`Lectures with views: ${lecturesWithViews}`);
    console.log(`Total views across all lectures: ${totalViews}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkViewCounts();
