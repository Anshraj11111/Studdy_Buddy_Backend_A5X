import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Doubt from './src/models/Doubt.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const total = await Doubt.countDocuments();
    const open = await Doubt.countDocuments({ status: 'open' });
    const resolved = await Doubt.countDocuments({ status: 'resolved' });
    const matched = await Doubt.countDocuments({ status: 'matched' });
    
    console.log('📊 Doubt Stats:');
    console.log('Total:', total);
    console.log('Open:', open);
    console.log('Resolved:', resolved);
    console.log('Matched:', matched);
    
    process.exit(0);
  })
  .catch(err => { console.error(err.message); process.exit(1); });
