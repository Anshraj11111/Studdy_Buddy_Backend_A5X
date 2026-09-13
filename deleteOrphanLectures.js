import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const deleteOrphanLectures = async () => {
  try {
    // Connect to PRIMARY database
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to PRIMARY database\n');

    // Get models
    const Resource = mongoose.model('Resource', new mongoose.Schema({}, { strict: false }));
    const Module = mongoose.model('Module', new mongoose.Schema({}, { strict: false }));

    // Find all resources
    const allResources = await Resource.find({}).lean();

    // Find all modules and their resources
    const allModules = await Module.find({}).lean();

    // Get all resource IDs that are referenced in modules
    const referencedResourceIds = new Set();
    allModules.forEach(module => {
      if (module.resources && Array.isArray(module.resources)) {
        module.resources.forEach(resId => {
          referencedResourceIds.add(resId.toString());
        });
      }
    });

    // Find orphan lectures
    const orphanLectures = allResources.filter(resource => 
      !referencedResourceIds.has(resource._id.toString())
    );

    console.log(`🗑️  Deleting ${orphanLectures.length} orphan lectures...\n`);

    if (orphanLectures.length > 0) {
      const orphanIds = orphanLectures.map(l => l._id);
      const result = await Resource.deleteMany({ _id: { $in: orphanIds } });
      
      console.log(`✅ Deleted ${result.deletedCount} orphan lectures\n`);
      
      // Show remaining lectures
      const remainingLectures = await Resource.find({}).lean();
      console.log(`📊 Remaining lectures in database: ${remainingLectures.length}\n`);
      
      remainingLectures.forEach((lecture, index) => {
        console.log(`${index + 1}. ${lecture.title} (Views: ${lecture.viewCount || 0})`);
      });
    } else {
      console.log('✅ No orphan lectures to delete');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

deleteOrphanLectures();
