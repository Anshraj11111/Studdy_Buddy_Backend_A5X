import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

console.log('🔍 DEBUG: Feed Creation Issue');
console.log('═'.repeat(50));

async function debugFeedIssue() {
  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'pragyan.soni@student.com',
      password: 'password123',
      role: 'student',
      schoolPassword: 'E028RBPE'
    }, {
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' }
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Step 2: Try minimal feed post
    console.log('\nStep 2: Trying minimal feed post...');
    
    const feedData = {
      content: 'Simple test post'
    };
    
    console.log('POST Data:', JSON.stringify(feedData, null, 2));
    
    try {
      const postResponse = await axios.post(`${API_URL}/feed`, feedData, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Post created successfully!');
      console.log('Response:', JSON.stringify(postResponse.data, null, 2));
      
    } catch (postError) {
      console.log('❌ Post creation failed');
      console.log('Status:', postError.response?.status);
      console.log('Error Response:', JSON.stringify(postError.response?.data, null, 2));
      
      // Check if it's a server error vs client error
      if (postError.response?.status >= 500) {
        console.log('\n⚠️ This is a SERVER ERROR (500+) - something is wrong on the backend');
      } else {
        console.log('\n⚠️ This is a CLIENT ERROR (400-499) - request issue');
      }
    }

  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

debugFeedIssue();