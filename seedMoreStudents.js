import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const students = [
  { name: 'KANISHK CHADAR', phone: '7440567079' },
  { name: 'NAKSH GUPTA', phone: '7974537643' },
  { name: 'ANSH YADAV', phone: '8085675665' },
  { name: 'AGAM JAIN', phone: '7828493158' },
  { name: 'RUDRA ASATI', phone: '8319803557' },
  { name: 'ARADHY NAYAK', phone: '9200005592' },
  { name: 'LAKSHYA TIWARI', phone: '9752423508' },
  { name: 'ARPAN DWIVEDI', phone: '8269713009' },
  { name: 'NAYAN CHAKRAWARTI', phone: '7509926327' },
  { name: 'SHESHTHA SAHU', phone: '9203619655' },
  { name: 'ATHARV LODHI', phone: '8319011818' },
  { name: 'ABHINAV PANDEY', phone: '9755399641' },
  { name: 'YASHIKA NAWANI', phone: '7000368123' },
  { name: 'KRISHNA GUPTA', phone: '9131122843' },
  { name: 'AARUSH SHRIVASTAVA', phone: '9575767128' },
  { name: 'RUDRAKSH DUBEY', phone: '6263085042' },
  { name: 'BHARGAVI', phone: '9131648694' },
  { name: 'YUVRAJ SAINI', phone: '8224975606' },
  { name: 'NIHAL SONI', phone: '9131003146' },
  { name: 'ANMOL SAHU', phone: '8109903301' },
  { name: 'MAYANK SONI', phone: '9993687234' },
  { name: 'SHRAVAN KUMAR GARG', phone: '9340572101' },
  { name: 'ABHINAV RAJAK', phone: '9399177742' },
  { name: 'MOHD AABAN AFZAL', phone: '9752311093' },
  { name: 'T SAGAR SAHU', phone: '9424956081' },
  { name: 'HIMANSHU PATEL', phone: '7610384682' },
  { name: 'ANIRUDDH SINGH', phone: '9755788448' },
  { name: 'ADITYA RAWAT', phone: '9907276118' },
  { name: 'ANSH NAMDEO', phone: '9685990872' },
  { name: 'AKANSHA KUMARI', phone: '9893567076' },
  { name: 'ANAM SIDDQUI', phone: '8989827328' },
  { name: 'AYSHA ALI', phone: '9907078210' },
  { name: 'AYAN ALI', phone: '9425464756' },
  { name: 'SKAND CHOUDHA', phone: '9893099794' },
  { name: 'MADHUR JAIN', phone: '9229834003' },
  { name: 'VINAY KUMAR LODHI', phone: '6264865562' },
  { name: 'AAFIYA BANO', phone: '8085344200' },
  { name: 'DEVESH TIWARI', phone: '9770342605' },
  { name: 'MOHD. RAYYAN', phone: '7974863900' },
  { name: 'UMMI HEMMERA', phone: '7879597123' },
  { name: 'KHUSHBOO TIWARI', phone: '7987870969' },
  { name: 'GOPAL SAHU', phone: '8889829062' },
  { name: 'SARTHAK PANDEY', phone: '6266889178' },
  { name: 'MANYA SINGH', phone: '8770614224' },
  { name: 'ARADHY SUHANE', phone: '6263266410' },
  { name: 'ARSHPREET AGNIHOTRI', phone: '8982613546' },
  { name: 'NEEDANT JHA', phone: '8349670780' },
  { name: 'GAURAV SINGH CHOUHAN', phone: '9691122245' },
  { name: 'SANSHAY ASWANI', phone: '9303759035' },
  { name: 'ALOK YADAV', phone: '7581892101' },
  { name: 'REYANSH DENGRE', phone: '9630925181' },
  { name: 'AISHWARYA SINGH', phone: '7987275288' },
  { name: 'ABINEET KUMAR', phone: '8641032360' },
  { name: 'RAJVEER SINGH', phone: '9755434345' },
  { name: 'YUG ANWANE', phone: '9179523448' },
  { name: 'NAVYA CHAKRAWARTI', phone: '7509926327' },
  { name: 'SIDDHI GUPTA', phone: '7089146626' },
  { name: 'RIDDHI JAIN', phone: '9926959307' },
  { name: 'VIRAT VIKRAM SINGH', phone: '8650640605' },
  { name: 'JASHIKA MONGARIA', phone: '8839984155' },
  { name: 'AVANTIKA SINGH', phone: '9424742708' },
  { name: 'ANSH SONI', phone: '9399509980' },
  { name: 'AARIT SONI', phone: '8965893272' },
  { name: 'ANIMESH MOURYA', phone: '8109724288' },
  { name: 'MEGHA UPADHYAY', phone: '9285153756' },
  { name: 'OM JAR', phone: '9713281051' },
  { name: 'AARAV SARAVGI', phone: '6267526287' },
  { name: 'BHAVYA NAYAK', phone: '7987738729' },
  { name: 'DRISHTI URMALIYA', phone: '9691268134' },
  { name: 'SANVI DIWEDI', phone: '9174023529' },
  { name: 'ANSH BHATIYA', phone: '8269811300' },
  { name: 'ARNAV SHUKLA', phone: '9131321016' },
  { name: 'SHUBH BURMAN', phone: '8305048655' },
  { name: 'GAURAV TIRTHANI', phone: '7440931524' },
  { name: 'GARIMA DIWAN', phone: '6263942280' },
  { name: 'NILANJALI SAHU', phone: '8319515021' },
  { name: 'AADIDEV TIWARI', phone: '7974986235' },
  { name: 'AADYA JAIN', phone: '7722911923' },
  { name: 'ARPIT DUBEY', phone: '9893207557' },
  { name: 'GARIMA PATEL', phone: '9111190718' },
  { name: 'VEDANSHI NIGAM', phone: '9691765534' },
  { name: 'RAJYAVARDHAN DUBEY', phone: '9098074274' },
  { name: 'SAMARTH SHRIVASTAVA', phone: '7222961832' },
  { name: 'SHIVANSH VISHWAKARMA', phone: '9644790601' },
  { name: 'CHAITANYA VERMA', phone: '9691042671' },
  { name: 'ANANYA RAI', phone: '9617794611' },
  { name: 'ANISH SINGH RAJPOOT', phone: '8085052862' },
  { name: 'ARPIT PRAJAPATI', phone: '9244892946' },
  { name: 'MANVI PANDEY', phone: '9977890523' },
  { name: 'ARADHYA SHUKLA', phone: '8108567333' },
  { name: 'AYUSHI SINGH', phone: '8889694722' },
  { name: 'VIBHANSH KHARE', phone: '9424916760' },
  { name: 'LALIT SUHANE', phone: '7974577171' },
  { name: 'LAKSH BAHRE', phone: '9424916760' },
  { name: 'ABHINAV LUGUN', phone: '913409451' },
  { name: 'SHRSHTI SINGH', phone: '7828258381' },
  { name: 'ADITI SHIVHARE', phone: '8349092068' },
  { name: 'ADITYA DHURIYA', phone: '7909611076' },
  { name: 'ANSHIKA BADGAIYAN', phone: '7987177919' },
  { name: 'ARADHYA SAHU', phone: '8878587424' },
  { name: 'MRAGENDRA YADAV', phone: '9009048015' },
  { name: 'SAVIR SIAL', phone: '7509400888' },
  { name: 'SHREYA S THAKUR', phone: '9340820640' },
  { name: 'SAMYAK AGRAWAL', phone: '8109359987' }
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
    console.log('Total students in Bardsley school: ' + (24 + result.length));
    
    result.forEach((student, index) => {
      console.log((index + 25) + ' | ' + student.name + ' | ' + student.email + ' | ' + student.phone + ' | Bardsley | ' + student.schoolPassword);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedStudents();
