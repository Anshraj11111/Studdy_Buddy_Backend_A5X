import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const students = [
  { name: 'MOHD. NAVAJIS', phone: '9755702250' },
  { name: 'ROSHNI WADHWANI', phone: '9302258983' },
  { name: 'ELINA S. SAIMA', phone: '9039470423' },
  { name: 'RISHIKA RANI', phone: '9203620744' },
  { name: 'PRARTHNA SINGH', phone: '7415144696' },
  { name: 'ANSHIKA GUPTA', phone: '9926633531' },
  { name: 'AARAV BHAGAT', phone: '9770285517' },
  { name: 'MOHD. HUZEFA', phone: '8305981321' },
  { name: 'SHREYASH PATEL', phone: '9893851212' },
  { name: 'MOHD. AFTAB', phone: '7489346556' },
  { name: 'DEEPIKA PATEL', phone: '9752697724' },
  { name: 'OM SAXENA', phone: '7389189949' },
  { name: 'SHREE BADERIA', phone: '8871650797' },
  { name: 'VAISHNAVI CHATURVEDI', phone: '9111409629' },
  { name: 'ANSHIKA PATEL', phone: '7000685265' },
  { name: 'TAPASHYA SINGH', phone: '6260327225' },
  { name: 'SOMIL SONI', phone: '9752880004' },
  { name: 'MANYA KHARE', phone: '7999773940' },
  { name: 'ADITYA KUMAR GUPTA', phone: '9329999315' },
  { name: 'SANSKRITI SAHU', phone: '7223850038' },
  { name: 'ARYAN NAMDEV', phone: '7224900436' },
  { name: 'AAGYA PANDEY', phone: '9425152376' },
  { name: 'LUCKY KHEMCHANDANI', phone: '6263626630' },
  { name: 'NAURIN KHAN', phone: '6266826962' },
  { name: 'MAHIMA PURWAR', phone: '9754060355' },
  { name: 'A KRITIKA', phone: '8770722025' },
  { name: 'JAGRITI TIRKEY', phone: '9685902006' },
  { name: 'VEDIKA SINGH', phone: '9770540259' },
  { name: 'NEELANSHI MEGHANI', phone: '9131542051' },
  { name: 'SYNA TIWARI', phone: '8358982097' },
  { name: 'HIMANSHU RIJHWANI', phone: '7987049643' },
  { name: 'MOHINI YADAV', phone: '8962638829' },
  { name: 'ADITYA SAHU', phone: '7898140628' },
  { name: 'SAMAR SATYENDRA TIWARI', phone: '8856842203' },
  { name: 'MISBAH FATIMA', phone: '9131495757' },
  { name: 'VEER SONI', phone: '6266178164' },
  { name: 'PRIYANSHU NISHAD', phone: '9179179434' },
  { name: 'SANCHAYA BARSAIYA', phone: '9752881643' },
  { name: 'CHAHAT GUPTA', phone: '7617251980' },
  { name: 'NELIMA PATEL', phone: '7610384682' },
  { name: 'PRATHANA MAHAJAN', phone: '9479756247' },
  { name: 'JUHI ROHRA', phone: '9243763287' },
  { name: 'SIDDHARTH MAHAWAR', phone: '9752574076' },
  { name: 'KANAK SHEETLANI', phone: '7999782275' },
  { name: 'PRATEEK SINGH PATEL', phone: '7581949791' },
  { name: 'SHRESTH MISHRA', phone: '9753313610' },
  { name: 'HARSH KUMAR', phone: '9938819417' },
  { name: 'PRATHAMESH SONI', phone: '9893629765' },
  { name: 'AADI SONI', phone: '8109596258' },
  { name: 'SMRITI SONI', phone: '9131901967' },
  { name: 'ROHINI ROHRA', phone: '8319219444' },
  { name: 'HARSH YADAV', phone: '9981720837' },
  { name: 'VAISHNAVI PATEL', phone: '7974586664' },
  { name: 'AYUSH NAGRE', phone: '9981137445' },
  { name: 'MADHUR SINGH', phone: '9303482983' },
  { name: 'ISHAN SINGH', phone: '7723932230' },
  { name: 'ANSHIKA PAROHA', phone: '9977226622' },
  { name: 'EKTA PANDEY', phone: '8236019233' },
  { name: 'HARSHITA SAHU', phone: '7470956324' },
  { name: 'ANURAG YADAV', phone: '7470932332' },
  { name: 'ISHIKA SONI', phone: '7999389061' },
  { name: 'ANSHIKA JAISWAL', phone: '6260533053' },
  { name: 'ALISHA QAZI', phone: '8962733599' },
  { name: 'MOHD. ANAS', phone: '9770906202' },
  { name: 'DARSHIT MISHRA', phone: '7354774224' },
  { name: 'SHREE VISHWKARMA', phone: '7828360394' },
  { name: 'VAISHNAVI ASATI', phone: '7693869949' },
  { name: 'SHAMBHAVI TIWARI', phone: '8085204457' },
  { name: 'ABHIGYAN GUPTA', phone: '9399831580' },
  { name: 'UTKARSH NIGAM', phone: '8109108435' },
  { name: 'AASHI KUDARHA', phone: '8516071571' },
  { name: 'AYUSH KUMAR YADAV', phone: '7701090584' },
  { name: 'ANSH TRIPATHI', phone: '9201632261' },
  { name: 'SAATVIK AGRAWAL', phone: '8319994981' },
  { name: 'SURYANSH CHOUDHARY', phone: '6263776717' },
  { name: 'PRACHI YADAV', phone: '6260090811' },
  { name: 'RUDRA NISHAD', phone: '8817508997' },
  { name: 'AKSHARA ASATI', phone: '7999434383' },
  { name: 'SOUMYA SEN', phone: '8349735654' },
  { name: 'NANDINI ASATI', phone: '9244220104' },
  { name: 'MUKUND SONI', phone: '7869767804' },
  { name: 'PREESHA DWIVEDI', phone: '9174023529' },
  { name: 'ANUSHREE SHUKLA', phone: '9424012054' },
  { name: 'DEVANSHI BAIRAGI', phone: '9300510521' },
  { name: 'SAHIL RAJAK', phone: '9630227037' },
  { name: 'DARSH SHRIVASTAVA', phone: '8817333022' },
  { name: 'AASHI RAJAK', phone: '7879229479' }
];

const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const generateEmail = (name) => {
  return name.toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/\.\./g, '.')
    .replace(/[^a-z0-9.]/g, '')
    + '@student.com';
};

async function seedStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('Connected to MongoDB');

    const anyUser = await mongoose.connection.db.collection('users').findOne({});
    const createdById = anyUser ? anyUser._id : new mongoose.Types.ObjectId();

    const studentsData = students.map(student => ({
      name: student.name,
      email: generateEmail(student.name),
      phone: student.phone,
      schoolName: 'Bardsley',
      schoolPassword: generatePassword(),
      isUsed: false,
      createdBy: createdById
    }));

    const result = await PreRegisteredStudent.insertMany(studentsData);
    
    console.log('Successfully added ' + result.length + ' more students!');
    console.log('Total students in Bardsley school: ' + (128 + result.length));
    
    result.forEach((student, index) => {
      console.log((index + 129) + ' | ' + student.name + ' | ' + student.email + ' | ' + student.phone + ' | Bardsley | ' + student.schoolPassword);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedStudents();
