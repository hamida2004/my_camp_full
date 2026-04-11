import { View, Text, Pressable, ScrollView, TouchableOpacity, Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

export default function CampIndex() {

  const { t } = useLanguage();

  const navigate = (route) => router.push(route);

  const resetCampData = () => {
    Alert.alert(
      t.reset,
      t.confirm,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
          style: "destructive",
          onPress: () => {
            db.runSync("DELETE FROM camp_info");
            db.runSync("DELETE FROM camp_staff");
            db.runSync("DELETE FROM daily_program");
            db.runSync("DELETE FROM global_program");
            db.runSync("DELETE FROM permanences");
            db.runSync("DELETE FROM permanence_assignments");
            dbEvents.emit("dbUpdated");
          }
        }
      ]
    );
  };

 const exportCampPDF = async () => {

  const camp = db.getFirstSync("SELECT * FROM camp_info LIMIT 1");
  const staff = db.getAllSync("SELECT * FROM camp_staff");
  const daily = db.getAllSync("SELECT * FROM daily_program");
  const global = db.getAllSync("SELECT * FROM global_program");
  const dates = db.getAllSync("SELECT * FROM permanences");

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
  <h1>${t.campReport}</h1>
  `;

  // ✅ PAGE 1 - CAMP INFO
  if (camp) {
    html += `
    <div class="page">
      <h2>${t.campInfo}</h2>
      <table>
        ${Object.entries(camp)
          .filter(([k]) => k !== "id")
          .map(([k,v]) => `<tr><th>${k}</th><td>${v ?? ""}</td></tr>`)
          .join("")}
      </table>
    </div>`;
  }

  // ✅ PAGE 2 - STAFF
  html += `
  <div class="page">
    <h2>${t.campFamily}</h2>
    <table>
      <tr><th>${t.name}</th><th>${t.role}</th><th>${t.phone}</th></tr>
      ${staff.map(s=>`
        <tr>
          <td>${s.name}</td>
          <td>${s.role}</td>
          <td>${s.phone}</td>
        </tr>
      `).join("")}
    </table>
  </div>`;

  // ✅ PAGE 3 - DAILY PROGRAM
  html += `
  <div class="page">
    <h2>${t.dailyProgram}</h2>
    <table>
      <tr><th>${t.time}</th><th>${t.activity}</th></tr>
      ${daily.map(d=>`
        <tr>
          <td>${d.time}</td>
          <td>${d.activity}</td>
        </tr>
      `).join("")}
    </table>
  </div>`;

  // ✅ PAGE 4 - GLOBAL PROGRAM
  html += `
  <div class="page">
    <h2>${t.globalProgram}</h2>
    <table>
      <tr>
        <th>${t.day}</th>
        <th>${t.date}</th>
        <th>${t.morning}</th>
        <th>${t.afternoon}</th>
        <th>${t.evening}</th>
      </tr>
      ${global.map(g=>`
        <tr>
          <td>${g.day}</td>
          <td>${g.date}</td>
          <td>${g.morning}</td>
          <td>${g.afternoon}</td>
          <td>${g.evening}</td>
        </tr>
      `).join("")}
    </table>
  </div>`;

  // ✅ PAGE 5+ - PERMANENCES
  for (const d of dates) {

    const get = (shift)=>db.getAllSync(`
      SELECT camp_staff.name FROM permanence_assignments
      JOIN camp_staff ON camp_staff.id = permanence_assignments.mentorId
      WHERE permanenceId=${d.id} AND shift='${shift}'
    `).map(x=>x.name).join(", ");

    html += `
    <div class="page">
      <h2>${t.permanences} - ${d.date}</h2>
      <table>
        <tr><th>Type</th><th>Mentors</th></tr>
        <tr><td>${t.nap}</td><td>${get("nap")}</td></tr>
        <tr><td>${t.night}</td><td>${get("night")}</td></tr>
        <tr><td>${t.fullDay}</td><td>${get("full")}</td></tr>
        <tr><td>${t.manOfDay}</td><td>${get("man_of_day")}</td></tr>
      </table>
    </div>`;
  }

  html += `</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
};

  return (
    <ScrollView style={{ flex:1, backgroundColor:"#f9f9f9" , paddingVertical:60}} contentContainerStyle={{ padding:20 }}>

      <Text style={{ fontSize:24, fontWeight:"bold", marginBottom:25 }}>
        {t.campInfo}
      </Text>

      {[
        { icon:"info-outline", label:t.campInfo, route:"./info" },
        { icon:"groups", label:t.campFamily, route:"./hierarchy" },
        { icon:"today", label:t.dailyProgram, route:"./dailyProgram" },
        { icon:"event-note", label:t.campProgram, route:"./campProgram" },
        { icon:"schedule", label:t.permanences, route:"./permanences" }
      ].map((item,i)=>(
        <Pressable key={i} onPress={()=>navigate(item.route)} style={styles.card}>
          <MaterialIcons name={item.icon} size={26} color="#3498db"/>
          <Text style={styles.title}>{item.label}</Text>
        </Pressable>
      ))}

      <View style={{ flexDirection:"row", gap:10 }}>
        <TouchableOpacity style={styles.greenBtn} onPress={exportCampPDF}>
          <Text style={styles.btnText}>{t.exportPDF}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.redBtn} onPress={resetCampData}>
          <Text style={styles.btnText}>{t.reset}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = {
  card:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#fff",
    padding:15,
    borderRadius:10,
    marginBottom:10
  },
  title:{ marginLeft:10, fontWeight:"bold" },
  greenBtn:{ flex:1, backgroundColor:"#2ecc71", padding:12, borderRadius:10 },
  redBtn:{ flex:1, backgroundColor:"#e74c3c", padding:12, borderRadius:10 },
  btnText:{ color:"#fff", textAlign:"center", fontWeight:"bold" }
};