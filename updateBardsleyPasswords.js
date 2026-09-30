import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!values) continue;
    
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ? values[index].replace(/"/g, '').trim() : '';
    });
    records.push(record);
  }
  
  return records;
}

// CSV data embedded
const csvData = `SR NO,NAME,EMAIL,PHONE,SCHOOL CODE,PASSWORD,STATUS
"1","AYUSH KUMAR YADAV 7701090584","ayushkumar.yadav@student.com","7701090584","Bardsley","D66FYDMS","PENDING"
"2","Abhigyan Gupta","abhigyan.gupta@student.com","9399831580","Bardsley","TK5XRTW3","PENDING"
"3","Yati Sharma","yati.sharma@student.com","6266556794","Bardsley","GATMOILS","PENDING"
"4","SAATVIK AGRAWAL","saatvik.agrawal@student.com","8319994981","Bardsley","IU7M7WQT","PENDING"
"5","VAISHNAVI ASATI","vaishnavi.asati@student.com","7693869949","Bardsley","FYDT96NX","PENDING"
"6","SHAMBHAVI TIWARI","shambhavi.tiwari@student.com","8085204457","Bardsley","O9CUC7L9","PENDING"
"7","UTKARSH NIGAM","utkarsh.nigam@student.com","8109108435","Bardsley","HPIILXI4","PENDING"
"8","AASHI KUDARHA","aashi.kudarha@student.com","8516071571","Bardsley","LVCO9D9T","PENDING"
"9","ANSH TRIPATHI","ansh.tripathi@student.com","9201632261","Bardsley","95JHDVTL","PENDING"
"10","SURYANSH CHOUDHARY","suryansh.choudhary@student.com","6263776717","Bardsley","77XYH9WK","PENDING"
"11","PRACHI YADAV","prachi.yadav@student.com","6260090811","Bardsley","WIHPU8JQ","PENDING"
"12","RUDRA NISHAD","rudra.nishad@student.com","8817508997","Bardsley","XOZ83TQR","PENDING"
"13","AKSHARA ASATI","akshara.asati@student.com","7999434383","Bardsley","8PZ2AKI6","PENDING"
"14","NANDINI ASATI","nandini.asati@student.com","9244220104","Bardsley","I80CRXM4","PENDING"
"15","MUKUND SONI","mukund.soni@student.com","7869767804","Bardsley","X78010U0","PENDING"
"16","PREESHA DWIVEDI","preesha.dwivedi@student.com","9174023529","Bardsley","MY3GN8DM","PENDING"
"17","SOUMYA SEN","soumya.sen@student.com","8349735654","Bardsley","95QJ7X34","PENDING"
"18","ANUSHREE SHUKLA","anushree.shukla@student.com","9424012054","Bardsley","TWAGRBQL","PENDING"
"19","DEVANSHI BAIRAGI","devanshi.bairagi@student.com","9300510521","Bardsley","06SPVEJH","PENDING"
"20","SAHIL RAJAK","sahil.rajak@student.com","9630227037","Bardsley","HJ6Z75BZ","PENDING"
"21","DARSH SHRIVASTAVA","darsh.shrivastava@student.com","8817333022","Bardsley","UEV093HK","PENDING"
"22","AASHI RAJAK","aashi.rajak@student.com","7879229479","Bardsley","NK16Y1EQ","PENDING"
"23","VEDIKA SINGH","vedika.singh@student.com","9770540259","Bardsley","8UFNAYER","PENDING"
"24","NEELANSHI MEGHANI","neelanshi.meghani@student.com","9131542051","Bardsley","MP9NF58E","PENDING"
"25","SYNA TIWARI","syna.tiwari@student.com","8358982097","Bardsley","WKAQGZRR","PENDING"
"26","HIMANSHU RIJHWANI","himanshu.rijhwani@student.com","7987049643","Bardsley","4FQYBYEY","PENDING"
"27","MOHINI YADAV","mohini.yadav@student.com","8962638829","Bardsley","S1FJ4JJR","PENDING"
"28","ADITYA SAHU","aditya.sahu@student.com","7898140628","Bardsley","4G7TNKCF","PENDING"
"29","SAMAR SATYENDRA TIWARI","samar.satyendra.tiwari@student.com","8856842203","Bardsley","AEMZ5FCX","PENDING"
"30","VEER SONI","veer.soni@student.com","6266178164","Bardsley","61XRSJG1","PENDING"
"31","PRIYANSHU NISHAD","priyanshu.nishad@student.com","9179179434","Bardsley","GP3G546O","PENDING"
"32","SANCHAYA BARSAIYA","sanchaya.barsaiya@student.com","9752881643","Bardsley","ADOFNYGM","PENDING"
"33","CHAHAT GUPTA","chahat.gupta@student.com","7617251980","Bardsley","S09ZWC3H","PENDING"
"34","MISBAH FATIMA","misbah.fatima@student.com","9131495757","Bardsley","3ZAO09VP","PENDING"
"35","NELIMA PATEL","nelima.patel@student.com","7610384682","Bardsley","XK95FKV3","PENDING"
"36","JAGRITI TIRKEY","jagriti.tirkey@student.com","9685902006","Bardsley","00AO6H8I","PENDING"
"37","A KRITIKA","a.kritika@student.com","8770722025","Bardsley","1SEU0FUU","PENDING"
"38","MAHIMA PURWAR","mahima.purwar@student.com","9754060355","Bardsley","HER0UNR0","PENDING"
"39","NAURIN KHAN","naurin.khan@student.com","6266826962","Bardsley","BOJRXEUB","PENDING"
"40","LUCKY KHEMCHANDANI","lucky.khemchandani@student.com","6263626630","Bardsley","27NGFIOL","PENDING"
"41","AAGYA PANDEY","aagya.pandey@student.com","9425152376","Bardsley","9U2GM5UK","PENDING"
"42","ARYAN NAMDEV","aryan.namdev@student.com","7224900436","Bardsley","CPBRJDJF","PENDING"
"43","SANSKRITI SAHU","sanskriti.sahu@student.com","7223850038","Bardsley","WW8POAOY","PENDING"
"44","ADITYA KUMAR GUPTA","aditya.kumar.gupta@student.com","9329999315","Bardsley","7FYSF8AW","PENDING"
"45","MANYA KHARE","manya.khare@student.com","7999773940","Bardsley","OJF3E67W","PENDING"
"46","SOMIL SONI","somil.soni@student.com","9752880004","Bardsley","DJ72SBVB","PENDING"
"47","TAPASHYA SINGH","tapashya.singh@student.com","6260327225","Bardsley","8Z0COT1K","PENDING"
"48","ANSHIKA PATEL","anshika.patel@student.com","7000685265","Bardsley","KVAGHKFJ","PENDING"
"49","JUHI ROHRA","juhi.rohra@student.com","9243763287","Bardsley","Q74294B9","PENDING"
"50","PRATHANA MAHAJAN","prathana.mahajan@student.com","9479756247","Bardsley","ISYN95MA","PENDING"
"51","SHREE VISHWKARMA","shree.vishwkarma@student.com","7828360394","Bardsley","3720MAOP","PENDING"
"52","DARSHIT MISHRA","darshit.mishra@student.com","7354774224","Bardsley","2U2K9RSF","PENDING"
"53","MOHD. ANAS","mohd.anas@student.com","9770906202","Bardsley","1TZIHFT8","PENDING"
"54","ALISHA QAZI","alisha.qazi@student.com","8962733599","Bardsley","DE3RBQAB","PENDING"
"55","ANSHIKA JAISWAL","anshika.jaiswal@student.com","6260533053","Bardsley","W89Q3OF3","PENDING"
"56","ISHIKA SONI","ishika.soni@student.com","7999389061","Bardsley","BIA5PQCV","PENDING"
"57","ANURAG YADAV","anurag.yadav@student.com","7470932332","Bardsley","0R6L4OZ0","PENDING"
"58","HARSHITA SAHU","harshita.sahu@student.com","7470956324","Bardsley","V0Z0MI2L","PENDING"
"59","EKTA PANDEY","ekta.pandey@student.com","8236019233","Bardsley","4Q6QZN2Q","PENDING"
"60","ANSHIKA PAROHA","anshika.paroha@student.com","9977226622","Bardsley","LW13OP9N","PENDING"
"61","ISHAN SINGH","ishan.singh@student.com","7723932230","Bardsley","K4W68CBP","PENDING"
"62","MADHUR SINGH","madhur.singh@student.com","9303482983","Bardsley","GM8689LM","PENDING"
"63","VAISHNAVI PATEL","vaishnavi.patel@student.com","7974586664","Bardsley","WDRP8O6U","PENDING"
"64","SIDDHARTH MAHAWAR","siddharth.mahawar@student.com","9752574076","Bardsley","4ZGU1T6R","PENDING"
"65","KANAK SHEETLANI","kanak.sheetlani@student.com","7999782275","Bardsley","XCO6970T","PENDING"
"66","PRATEEK SINGH PATEL","prateek.singh.patel@student.com","7581949791","Bardsley","N2M47SYY","PENDING"
"67","SHRESTH MISHRA","shresth.mishra@student.com","9753313610","Bardsley","KRIROZEI","PENDING"
"68","HARSH KUMAR","harsh.kumar@student.com","9938819417","Bardsley","8OIIJPNG","PENDING"
"69","PRATHAMESH SONI","prathamesh.soni@student.com","9893629765","Bardsley","DD09HW1P","PENDING"
"70","AADI SONI","aadi.soni@student.com","8109596258","Bardsley","IQM9D7B3","PENDING"
"71","SMRITI SONI","smriti.soni@student.com","9131901967","Bardsley","103PVQ5O","PENDING"
"72","ROHINI ROHRA","rohini.rohra@student.com","8319219444","Bardsley","XCKF7UQU","PENDING"
"73","HARSH YADAV","harsh.yadav@student.com","9981720837","Bardsley","IWUCI8RV","PENDING"
"74","AYUSH NAGRE","ayush.nagre@student.com","9981137445","Bardsley","ZXGYNLZW","PENDING"
"75","ROSHNI WADHWANI","roshni.wadhwani@student.com","9302258983","Bardsley","JUR7RJZ1","PENDING"
"76","ELINA S. SAIMA","elina.s.saima@student.com","9039470423","Bardsley","DKUDFG6U","PENDING"
"77","RISHIKA RANI","rishika.rani@student.com","9203620744","Bardsley","IYP8V2LF","PENDING"
"78","PRARTHNA SINGH","prarthna.singh@student.com","7415144696","Bardsley","CMNZG697","PENDING"
"79","DEEPIKA PATEL","deepika.patel@student.com","9752697724","Bardsley","K06SFCZQ","PENDING"
"80","ANSHIKA GUPTA","anshika.gupta@student.com","9926633531","Bardsley","0FEQEFQ6","PENDING"
"81","AARAV BHAGAT","aarav.bhagat@student.com","9770285517","Bardsley","MD1187P3","PENDING"
"82","SHREYASH PATEL","shreyash.patel@student.com","9893851212","Bardsley","68AWO8C8","PENDING"
"83","MOHD. AFTAB","mohd.aftab@student.com","7489346556","Bardsley","38N61F0B","PENDING"
"84","OM SAXENA","om.saxena@student.com","7389189949","Bardsley","S8NEWKNS","PENDING"
"85","SHREE BADERIA","shree.baderia@student.com","8871650797","Bardsley","ETLELTLO","PENDING"
"86","VAISHNAVI CHATURVEDI","vaishnavi.chaturvedi@student.com","9111409629","Bardsley","CMOOIHWV","PENDING"
"87","MOHD. HUZEFA","mohd.huzefa@student.com","8305981321","Bardsley","J7WZLVFU","PENDING"
"88","MOHD. NAVAJIS","mohd.navajis@student.com","9755702250","Bardsley","Q70OT6SI","PENDING"
"89","ANSHIKA BADGAIYAN","anshika.badgaiyan@student.com","7987177919","Bardsley","Y158I1BZ","PENDING"
"90","LALIT SUHANE","lalit.suhane@student.com","7974577171","Bardsley","1XYT4VCJ","PENDING"
"91","LAKSH BAHRE","laksh.bahre@student.com","9424916760","Bardsley","NGGW4DZX","PENDING"
"92","ABHINAV LUGUN","abhinav.lugun@student.com","913409451","Bardsley","Y7KGQOX7","PENDING"
"93","SHRSHTI SINGH","shrshti.singh@student.com","7828258381","Bardsley","RQ80CY3E","PENDING"
"94","ADITI SHIVHARE","aditi.shivhare@student.com","8349092068","Bardsley","39EYH3XK","PENDING"
"95","ADITYA DHURIYA","aditya.dhuriya@student.com","7909611076","Bardsley","F9M9UPJM","PENDING"
"96","ARADHYA SAHU","aradhya.sahu@student.com","8878587424","Bardsley","0TPK2N68","PENDING"
"97","MRAGENDRA YADAV","mragendra.yadav@student.com","9009048015","Bardsley","O7STS3M8","PENDING"
"98","SAVIR SIAL","savir.sial@student.com","7509400888","Bardsley","LPAZ4F1R","PENDING"
"99","SHREYA S THAKUR","shreya.s.thakur@student.com","9340820640","Bardsley","C80DJRJA","PENDING"
"100","SAMYAK AGRAWAL","samyak.agrawal@student.com","8109359987","Bardsley","WT1GZM4U","PENDING"
"101","CHAITANYA VERMA","chaitanya.verma@student.com","9691042671","Bardsley","I52JNHNA","PENDING"
"102","VIBHANSH KHARE","vibhansh.khare@student.com","9424916760","Bardsley","M8Q2N7OU","PENDING"
"103","AYUSHI SINGH","ayushi.singh@student.com","8889694722","Bardsley","66LK7PN8","PENDING"
"104","ARADHYA SHUKLA","aradhya.shukla@student.com","8108567333","Bardsley","YBCL7HE5","PENDING"
"105","MANVI PANDEY","manvi.pandey@student.com","9977890523","Bardsley","X60K2QO3","PENDING"
"106","ARPIT PRAJAPATI","arpit.prajapati@student.com","9244892946","Bardsley","FX4L5ER8","PENDING"
"107","ANISH SINGH RAJPOOT","anish.singh.rajpoot@student.com","8085052862","Bardsley","USDX25HQ","PENDING"
"108","ANANYA RAI","ananya.rai@student.com","9617794611","Bardsley","IBWL0RN7","PENDING"
"109","SHIVANSH VISHWAKARMA","shivansh.vishwakarma@student.com","9644790601","Bardsley","4WZVM074","PENDING"
"110","GARIMA DIWAN","garima.diwan@student.com","6263942280","Bardsley","T3M1E0OE","PENDING"
"111","NILANJALI SAHU","nilanjali.sahu@student.com","8319515021","Bardsley","WLTS3TEQ","PENDING"
"112","AADIDEV TIWARI","aadidev.tiwari@student.com","7974986235","Bardsley","DM1LOJC5","PENDING"
"113","AADYA JAIN","aadya.jain@student.com","7722911923","Bardsley","RJVGV245","PENDING"
"114","ARPIT DUBEY","arpit.dubey@student.com","9893207557","Bardsley","CEHAU61N","PENDING"
"115","GARIMA PATEL","garima.patel@student.com","9111190718","Bardsley","8FHMUI6B","PENDING"
"116","VEDANSHI NIGAM","vedanshi.nigam@student.com","9691765534","Bardsley","7YBJCQYA","PENDING"
"117","RAJYAVARDHAN DUBEY","rajyavardhan.dubey@student.com","9098074274","Bardsley","NJNFO6KL","PENDING"
"118","SAMARTH SHRIVASTAVA","samarth.shrivastava@student.com","7222961832","Bardsley","Y9YA23X5","PENDING"
"119","RIDDHI JAIN","riddhi.jain@student.com","9926959307","Bardsley","G8T71H6F","PENDING"
"120","NAVYA CHAKRAWARTI","navya.chakrawarti@student.com","7509926327","Bardsley","WX2XJ2Z4","PENDING"
"121","SIDDHI GUPTA","siddhi.gupta@student.com","7089146626","Bardsley","ZJOCJ8TE","PENDING"
"122","VIRAT VIKRAM SINGH","virat.vikram.singh@student.com","8650640605","Bardsley","NXROMJH0","PENDING"
"123","JASHIKA MONGARIA","jashika.mongaria@student.com","8839984155","Bardsley","YUAZ4VZS","PENDING"
"124","AVANTIKA SINGH","avantika.singh@student.com","9424742708","Bardsley","EWC3UOUS","PENDING"
"125","ANSH SONI","ansh.soni@student.com","9399509980","Bardsley","FO6V4Z3T","PENDING"
"126","AARIT SONI","aarit.soni@student.com","8965893272","Bardsley","ZDJX6FL1","PENDING"
"127","ANIMESH MOURYA","animesh.mourya@student.com","8109724288","Bardsley","3UGZ1E1J","PENDING"
"128","MEGHA UPADHYAY","megha.upadhyay@student.com","9285153756","Bardsley","ZX1RFLLK","PENDING"
"129","GAURAV TIRTHANI","gaurav.tirthani@student.com","7440931524","Bardsley","KS2J3QDI","PENDING"
"130","OM JAR","om.jar@student.com","9713281051","Bardsley","XJCERNL4","PENDING"
"131","SHUBH BURMAN","shubh.burman@student.com","8305048655","Bardsley","80E41MHC","PENDING"
"132","ARNAV SHUKLA","arnav.shukla@student.com","9131321016","Bardsley","LW62NAWY","PENDING"
"133","ANSH BHATIYA","ansh.bhatiya@student.com","8269811300","Bardsley","H5HL8QIC","PENDING"
"134","SANVI DIWEDI","sanvi.diwedi@student.com","9174023529","Bardsley","I5VKDVPG","PENDING"
"135","DRISHTI URMALIYA","drishti.urmaliya@student.com","9691268134","Bardsley","4VVS5048","PENDING"
"136","BHAVYA NAYAK","bhavya.nayak@student.com","7987738729","Bardsley","WB5KBWMC","PENDING"
"137","AARAV SARAVGI","aarav.saravgi@student.com","6267526287","Bardsley","OSFTUI8M","PENDING"
"138","MOHD. RAYYAN","mohd.rayyan@student.com","7974863900","Bardsley","BY2CV7E7","PENDING"
"139","GAURAV SINGH CHOUHAN","gaurav.singh.chouhan@student.com","9691122245","Bardsley","HM8732UW","PENDING"
"140","UMMI HEMMERA","ummi.hemmera@student.com","7879597123","Bardsley","5IPEIKPU","PENDING"
"141","KHUSHBOO TIWARI","khushboo.tiwari@student.com","7987870969","Bardsley","NA4JR9LB","PENDING"
"142","GOPAL SAHU","gopal.sahu@student.com","8889829062","Bardsley","DE3OBZD1","PENDING"
"143","SARTHAK PANDEY","sarthak.pandey@student.com","6266889178","Bardsley","2UI7YLMS","PENDING"
"144","MANYA SINGH","manya.singh@student.com","8770614224","Bardsley","SYZVYZ1K","PENDING"
"145","ARADHY SUHANE","aradhy.suhane@student.com","6263266410","Bardsley","FTP9FVHU","PENDING"
"146","ARSHPREET AGNIHOTRI","arshpreet.agnihotri@student.com","8982613546","Bardsley","PMAMCFW0","PENDING"
"147","NEEDANT JHA","needant.jha@student.com","8349670780","Bardsley","J2XOTLOS","PENDING"
"148","SANSHAY ASWANI","sanshay.aswani@student.com","9303759035","Bardsley","KPTUIXZ5","PENDING"
"149","ALOK YADAV","alok.yadav@student.com","7581892101","Bardsley","ZGNNH0M7","PENDING"
"150","REYANSH DENGRE","reyansh.dengre@student.com","9630925181","Bardsley","09BLMYU5","PENDING"
"151","AISHWARYA SINGH","aishwarya.singh@student.com","7987275288","Bardsley","D572RT2T","PENDING"
"152","ABINEET KUMAR","abineet.kumar@student.com","8641032360","Bardsley","IX14CTID","PENDING"
"153","RAJVEER SINGH","rajveer.singh@student.com","9755434345","Bardsley","PNAMFULP","PENDING"
"154","YUG ANWANE","yug.anwane@student.com","9179523448","Bardsley","1DZ4W3PP","PENDING"
"155","AYSHA ALI","aysha.ali@student.com","9907078210","Bardsley","PMPNLVG9","PENDING"
"156","T SAGAR SAHU","t.sagar.sahu@student.com","9424956081","Bardsley","O8T1G7QX","PENDING"
"157","HIMANSHU PATEL","himanshu.patel@student.com","7610384682","Bardsley","R54IPVZD","PENDING"
"158","ANIRUDDH SINGH","aniruddh.singh@student.com","9755788448","Bardsley","LT0Z7E10","PENDING"
"159","ADITYA RAWAT","aditya.rawat@student.com","9907276118","Bardsley","8TDKZGV3","PENDING"
"160","ANSH NAMDEO","ansh.namdeo@student.com","9685990872","Bardsley","3ET6B30Y","PENDING"
"161","AKANSHA KUMARI","akansha.kumari@student.com","9893567076","Bardsley","BKMDOSOQ","PENDING"
"162","ANAM SIDDQUI","anam.siddqui@student.com","8989827328","Bardsley","IU2CKZZQ","PENDING"
"163","AYAN ALI","ayan.ali@student.com","9425464756","Bardsley","REMTV9WB","PENDING"
"164","SKAND CHOUDHA","skand.choudha@student.com","9893099794","Bardsley","TOJ1Z6DR","PENDING"
"165","MADHUR JAIN","madhur.jain@student.com","9229834003","Bardsley","4VJBWB0J","PENDING"
"166","VINAY KUMAR LODHI","vinay.kumar.lodhi@student.com","6264865562","Bardsley","LJAS4YWL","PENDING"
"167","AAFIYA BANO","aafiya.bano@student.com","8085344200","Bardsley","R6W63WL7","PENDING"
"168","DEVESH TIWARI","devesh.tiwari@student.com","9770342605","Bardsley","729MBARM","PENDING"
"169","YUVRAJ SAINI","yuvraj.saini@student.com","8224975606","Bardsley","J7KJ7SHI","PENDING"
"170","ABHINAV PANDEY","abhinav.pandey@student.com","9755399641","Bardsley","B9Z7WVSB","PENDING"
"171","YASHIKA NAWANI","yashika.nawani@student.com","7000368123","Bardsley","2ANWKM5G","PENDING"
"172","KRISHNA GUPTA","krishna.gupta@student.com","9131122843","Bardsley","QK365AU1","PENDING"
"173","AARUSH SHRIVASTAVA","aarush.shrivastava@student.com","9575767128","Bardsley","X9FYA2Q0","PENDING"
"174","RUDRAKSH DUBEY","rudraksh.dubey@student.com","6263085042","Bardsley","247XQ5ZN","PENDING"
"175","BHARGAVI","bhargavi@student.com","9131648694","Bardsley","08WPFRY4","PENDING"
"176","NIHAL SONI","nihal.soni@student.com","9131003146","Bardsley","737MJF81","PENDING"
"177","ANMOL SAHU","anmol.sahu@student.com","8109903301","Bardsley","SFYWDARR","PENDING"
"178","MAYANK SONI","mayank.soni@student.com","9993687234","Bardsley","PAVPTQL4","PENDING"
"179","SHRAVAN KUMAR GARG","shravan.kumar.garg@student.com","9340572101","Bardsley","TGK6TFOS","PENDING"
"180","ABHINAV RAJAK","abhinav.rajak@student.com","9399177742","Bardsley","YXFYA8JR","PENDING"
"181","MOHD AABAN AFZAL","mohd.aaban.afzal@student.com","9752311093","Bardsley","0GMDP0NF","PENDING"
"182","ATHARV LODHI","atharv.lodhi@student.com","8319011818","Bardsley","AGCTQC8F","PENDING"
"183","SHESHTHA SAHU","sheshtha.sahu@student.com","9203619655","Bardsley","NDBN4CMM","PENDING"
"184","NAYAN CHAKRAWARTI","nayan.chakrawarti@student.com","7509926327","Bardsley","RLAYGILM","PENDING"
"185","ARPAN DWIVEDI","arpan.dwivedi@student.com","8269713009","Bardsley","QNDD80BI","PENDING"
"186","RUDRA ASATI","rudra.asati@student.com","8319803557","Bardsley","5T6BICLK","PENDING"
"187","NAKSH GUPTA","naksh.gupta@student.com","7974537643","Bardsley","Y7TFTTEZ","PENDING"
"188","ANSH YADAV","ansh.yadav@student.com","8085675665","Bardsley","ZWV1VY9B","PENDING"
"189","AGAM JAIN","agam.jain@student.com","7828493158","Bardsley","ZN3Z0B8N","PENDING"
"190","ARADHY NAYAK","aradhy.nayak@student.com","9200005592","Bardsley","CMJ6PF6T","PENDING"
"191","LAKSHYA TIWARI","lakshya.tiwari@student.com","9752423508","Bardsley","OY7Z5NZV","PENDING"
"192","KANISHK CHADAR","kanishk.chadar@student.com","7440567079","Bardsley","KMSDR1IB","PENDING"
"193","ADITI MISHRA","aditi.mishra@student.com","7898517752","Bardsley","PIWRC3NV","PENDING"
"194","SHOURYA GUPTA","shourya.gupta@student.com","7805978111","Bardsley","C186HTNO","PENDING"
"195","ARYAN AGRAWAL","aryan.agrawal@student.com","9630220316","Bardsley","QER2LH74","PENDING"
"196","SHOURYA RAJAK","shourya.rajak@student.com","9300835773","Bardsley","G3XVHSEB","PENDING"
"197","SONAKSHI TIWARI","sonakshi.tiwari@student.com","8358982097","Bardsley","D8ZUNYI1","PENDING"
"198","GOURI KASTOR","gouri.kastor@student.com","6260080008","Bardsley","3VXLTGBG","PENDING"
"199","SAANVI SHRI","saanvi.shri@student.com","7987255348","Bardsley","HM1532N7","PENDING"
"200","YASHASHVI PITALE","yashashvi.pitale@student.com","7000898498","Bardsley","7FTB1SOF","PENDING"
"201","ANVESHA GUPTA","anvesha.gupta@student.com","9407000144","Bardsley","SMY0LAY2","PENDING"
"202","ABHIRAJ SHRIVASTAVA","abhiraj.shrivastava@student.com","9111395339","Bardsley","39ETJZ1I","PENDING"
"203","SOUMYA RAJAK","soumya.rajak@student.com","7725856177","Bardsley","UM1W705I","PENDING"
"204","ANMOL KHATRI","anmol.khatri@student.com","6264458992","Bardsley","1ZCXEW4H","PENDING"
"205","FATIMA ZAHRA","fatima.zahra@student.com","7999727614","Bardsley","4NZ584G2","PENDING"
"206","ARADHYA KOSTA","aradhya.kosta@student.com","9755957460","Bardsley","I8A6V7UT","PENDING"
"207","ARADHYA SHRIVASTAVA","aradhya.shrivastava@student.com","8871251195","Bardsley","4116AW0F","PENDING"
"208","MOHD FARIDI","mohd.faridi@student.com","9424665232","Bardsley","MZT8GBLC","PENDING"
"209","PRAGYAN SONI","pragyan.soni@student.com","9826706228","Bardsley","E028RBPE","PENDING"
"210","ANSHIKA SINGH","anshika.singh@student.com","9893690839","Bardsley","Z5W96RK8","PENDING"
"211","AARAV SHUKLA","aarav.shukla@student.com","8108567333","Bardsley","JAI451SJ","PENDING"
"212","ADITYA SINGH","aditya.singh@student.com","9981816593","Bardsley","QFMO4DU5","PENDING"
"213","SWARNIMA GOUR","swarnima.gour@student.com","8103180021","Bardsley","DSK6BSX6","PENDING"
"214","ARSHITA SHRIVASTAVA","arshita.shrivastava@student.com","9589362757","Bardsley","2H9I7WB8","PENDING"
"215","JASNOOR KAUR","jasnoor.kaur@student.com","9557451849","Bardsley","OG4WRC7L","PENDING"`;

async function updatePasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Parse CSV
    const records = parseCSV(csvData);

    console.log(`📊 CSV Records: ${records.length}`);
    console.log('═'.repeat(70));

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const record of records) {
      const email = record.EMAIL.trim().toLowerCase();
      const password = record.PASSWORD.trim();

      // Find student in database
      const student = await PreRegisteredStudent.findOne({
        email: { $regex: new RegExp(`^${email}$`, 'i') },
        schoolName: { $regex: new RegExp(`^Bardsley$`, 'i') }
      });

      if (!student) {
        console.log(`❌ NOT FOUND: ${email}`);
        notFound++;
        continue;
      }

      // Check if already has plain password
      if (student.schoolPasswordPlain && student.schoolPasswordPlain !== '') {
        console.log(`⏭️  SKIP: ${student.name} (${email}) - Already has plain password: ${student.schoolPasswordPlain}`);
        skipped++;
        continue;
      }

      // Update with CSV password
      student.schoolPassword = await bcrypt.hash(password, 10);
      student.schoolPasswordPlain = password;
      await student.save();

      console.log(`✅ UPDATED: ${student.name} (${email}) → ${password}`);
      updated++;
    }

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 UPDATE COMPLETE!');
    console.log('═'.repeat(70));
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped (already has plain): ${skipped}`);
    console.log(`❌ Not found in DB: ${notFound}`);
    console.log(`📊 Total processed: ${records.length}`);
    console.log('═'.repeat(70));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updatePasswords();
