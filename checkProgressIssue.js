import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const Schema = new mongoose.Schema({}, { strict: false });
const primary = await mongoose.createConnection(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);

const Resource = primary.model('Resource', Schema, 'resources');
const LectureProgress = primary.model('LectureProgress', Schema, 'lectureprogreses');
const User = primary.model('User', Schema, 'users');

// Check resources in primary
const resources = await Resource.find().lean();
console.log('🎥 Resources in PRIMARY DB:', resources.length);
resources.slice(0, 5).forEach(r => {
  console.log(`  - "${r.title}" | courseId: ${r.courseId} | moduleId: ${r.moduleId} | _id: ${r._id}`);
});

// Check progress records
const progress = await LectureProgress.find().lean();
console.log('\n📊 LectureProgress records:', progress.length);
progress.slice(0, 10).forEach(p => {
  console.log(`  - userId: ${p.userId} | lectureId: ${p.lectureId} | ${p.watchedPercentage}% | completed: ${p.isCompleted}`);
});

// Find student who complained (Anshu from screenshot)
const anshu = await User.findOne({ name: /anshu/i }).lean();
if (anshu) {
  console.log('\n👤 Found student Anshu:', anshu.name, anshu.email, anshu._id);
  const anshuProgress = await LectureProgress.find({ userId: anshu._id }).lean();
  console.log(`   Progress records: ${anshuProgress.length}`);
  anshuProgress.forEach(p => {
    console.log(`   - lectureId: ${p.lectureId} | ${p.watchedPercentage}% | completed: ${p.isCompleted}`);
  });
}

await primary.close();
