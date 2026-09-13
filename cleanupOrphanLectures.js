import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const cleanupOrphanLectures = async () => {
  try {
    // Connect to PRIMARY database
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to PRIMARY database\n');

    // Get models
    const Resource = mongoose.model('Resource', new mongoose.Schema({}, { strict: false }));
    const Module = mongoose.model('Module', new mongoose.Schema({}, { strict: false }));

    // Find all resources
    const allResources = await Resource.find({}).lean();
    console.log(`📊 Total lectures in database: ${allResources.length}\n`);

    // Find all modules and their resources
    const allModules = await Module.find({}).lean();
    console.log(`📦 Total modules: ${allModules.length}\n`);

    // Get all resource IDs that are referenced in modules
    const referencedResourceIds = new Set();
    allModules.forEach(module => {
      if (module.resources && Array.isArray(module.resources)) {
        module.resources.forEach(resId => {
          referencedResourceIds.add(resId.toString());
        });
      }
    });

    console.log(`✅ Lectures referenced in modules: ${referencedResourceIds.size}\n`);

    // Find orphan lectures (not referenced in any module)
    const orphanLectures = allResources.filter(resource => 
      !referencedResourceIds.has(resource._id.toString())
    );

    console.log(`🗑️  Orphan lectures (not in any module): ${orphanLectures.length}\n`);

    if (orphanLectures.length > 0) {
      console.log('Orphan Lectures Details:');
      orphanLectures.forEach((lecture, index) => {
        console.log(`${index + 1}. ${lecture.title || 'Untitled'} (ID: ${lecture._id})`);
      });

      console.log('\n⚠️  These lectures are not part of any module.');
      console.log('Do you want to delete them? (This script will show info only)\n');

      // Show which lectures ARE in modules
      console.log('\n✅ Valid Lectures (in modules):');
      const validLectures = allResources.filter(resource => 
        referencedResourceIds.has(resource._id.toString())
      );
      validLectures.forEach((lecture, index) => {
        console.log(`${index + 1}. ${lecture.title || 'Untitled'} (Views: ${lecture.viewCount || 0})`);
      });

      // Uncomment below to actually delete orphan lectures
      // const orphanIds = orphanLectures.map(l => l._id);
      // await Resource.deleteMany({ _id: { $in: orphanIds } });
      // console.log(`\n✅ Deleted ${orphanLectures.length} orphan lectures`);
    } else {
      console.log('✅ No orphan lectures found. Database is clean!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

cleanupOrphanLectures();
