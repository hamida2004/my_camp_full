import {
  View, Text, TouchableOpacity,
  ScrollView, Alert
} from "react-native";
import { router } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

export default function MentorHome() {

  const { t } = useLanguage();

  const resetMentorData = () => {
    Alert.alert(
      t.resetMentor,
      t.resetConfirm,
      [
        { text: t.cancel },
        {
          text: t.delete,
          style: "destructive",
          onPress: () => {
            db.execSync(`
              DELETE FROM mentor;
              DELETE FROM important_contacts;
              DELETE FROM mentor_todos;
              DELETE FROM mentor_notes;
              DELETE FROM mentor_meetings;
            `);
            dbEvents.emit("dbUpdated");
          }
        }
      ]
    );
  };

  const exportMentorPDF = async () => {

  const mentor = db.getFirstSync("SELECT * FROM mentor LIMIT 1");
  const contacts = db.getAllSync("SELECT * FROM important_contacts");
  const todos = db.getAllSync("SELECT * FROM mentor_todos");
  const remarks = db.getAllSync("SELECT * FROM mentor_notes");
  const meetings = db.getAllSync("SELECT * FROM mentor_meetings");

  const now = new Date();

  let html = `
  <html>
  <head>
    <style>
      body { font-family: Arial; padding:20px; }
      h2 { background:#3498db; color:white; padding:6px; }
      table { width:100%; border-collapse:collapse; margin-bottom:20px; }
      th,td { border:1px solid #ccc; padding:8px; }
      .page { page-break-after: always; }
    </style>
  </head>
  <body>

  <p>${now.toLocaleString()}</p>
  <h1>${t.mentorReport}</h1>
  `;

  // ✅ PAGE 1 - MENTOR INFO
  if (mentor) {
    html += `
    <div class="page">
      <h2>${t.mentorInfo}</h2>
      <table>
        ${Object.entries(mentor)
          .filter(([k]) => k !== "id")
          .map(([k,v]) => `<tr><th>${k}</th><td>${v ?? ""}</td></tr>`)
          .join("")}
      </table>
    </div>`;
  }

  // ✅ PAGE 2 - CONTACTS
  html += `
  <div class="page">
    <h2>${t.importantNumbers}</h2>
    <table>
      <tr><th>${t.name}</th><th>${t.phone}</th></tr>
      ${contacts.map(c=>`<tr><td>${c.name}</td><td>${c.phone}</td></tr>`).join("")}
    </table>
  </div>`;

  // ✅ PAGE 3 - TODOS
  html += `
  <div class="page">
    <h2>${t.todoList}</h2>
    <table>
      <tr><th>${t.task}</th><th>Status</th></tr>
      ${todos.map(td=>`
        <tr>
          <td>${td.title}</td>
          <td>${td.completed ? "Done" : "Pending"}</td>
        </tr>
      `).join("")}
    </table>
  </div>`;

  // ✅ PAGE 4 - REMARKS
  html += `
  <div class="page">
    <h2>${t.remarks}</h2>
    <table>
      <tr><th>Remark</th><th>${t.date}</th></tr>
      ${remarks.map(r=>`
        <tr>
          <td>${r.content}</td>
          <td>${r.date}</td>
        </tr>
      `).join("")}
    </table>
  </div>`;

  // ✅ PAGE 5 - MEETINGS
  html += `
  <div class="page">
    <h2>${t.meetings}</h2>
    <table>
      <tr><th>${t.title}</th><th>${t.content}</th><th>${t.date}</th></tr>
      ${meetings.map(m=>`
        <tr>
          <td>${m.title}</td>
          <td>${m.content}</td>
          <td>${m.date}</td>
        </tr>
      `).join("")}
    </table>
  </div>`;

  html += `</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
};

  const items = [
    { label:t.mentorInfo, path:"/(Mentor)/info", icon:"person", color:"#3498db" },
    { label:t.importantNumbers, path:"/(Mentor)/contacts", icon:"phone", color:"#2ecc71" },
    { label:t.todoList, path:"/(Mentor)/todo", icon:"check-circle", color:"#9b59b6" },
    { label:t.remarks, path:"/(Mentor)/remarks", icon:"notes", color:"#e67e22" },
    { label:t.meetings, path:"/(Mentor)/meetings", icon:"groups", color:"#e74c3c" }
  ];

  return (
    <ScrollView
      style={{flex:1, backgroundColor:"#f9f9f9",paddingVertical:60}}
      contentContainerStyle={{padding:20}}
    >

      {/* HEADER */}
      <Text style={styles.title}>
        {t.mentorDashboard}
      </Text>

      <Text style={styles.subtitle}>
        {t.mentorDesc || ""}
      </Text>

      {/* CARDS */}
      {items.map((item,i)=>(
        <TouchableOpacity
          key={i}
          onPress={()=>router.push(item.path)}
          style={styles.card}
        >
          <MaterialIcons name={item.icon} size={26} color={item.color}/>
          
          <View style={{marginLeft:15}}>
            <Text style={styles.cardTitle}>
              {item.label}
            </Text>

            <Text style={styles.cardSubtitle}>
              {` ${item.label}`}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* ACTIONS */}
      <TouchableOpacity onPress={exportMentorPDF} style={styles.green}>
        <Text style={styles.white}>{t.exportPDF}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={resetMentorData} style={styles.red}>
        <Text style={styles.white}>{t.resetMentor}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles={
  title:{
    fontSize:24,
    fontWeight:"bold",
    marginBottom:5,
    color:"#2c3e50"
  },
  subtitle:{
    color:"#7f8c8d",
    marginBottom:20
  },
  card:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#fff",
    padding:15,
    borderRadius:12,
    marginBottom:12,
    shadowColor:"#000",
    shadowOpacity:0.05,
    shadowRadius:5,
    elevation:2
  },
  cardTitle:{
    fontWeight:"bold",
    fontSize:16
  },
  cardSubtitle:{
    fontSize:12,
    color:"#888"
  },
  green:{
    backgroundColor:"#2ecc71",
    padding:12,
    borderRadius:10,
    marginTop:20
  },
  red:{
    backgroundColor:"#e74c3c",
    padding:12,
    borderRadius:10,
    marginTop:10
  },
  white:{
    color:"#fff",
    textAlign:"center",
    fontWeight:"bold"
  }
};