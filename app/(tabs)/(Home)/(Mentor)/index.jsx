import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert
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

  /* =========================
     RESET MENTOR DATA
  ========================= */

  const resetMentorData = () => {
    Alert.alert(
      t.resetMentor,
      t.resetConfirm,
      [
        {
          text: t.cancel,
          style: "cancel"
        },
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


  /* =========================
     EXPORT PDF
  ========================= */

  const exportMentorPDF = async () => {

    const mentor = db.getFirstSync(
      "SELECT * FROM mentor LIMIT 1"
    );

    const contacts = db.getAllSync(
      "SELECT * FROM important_contacts"
    );

    const todos = db.getAllSync(
      "SELECT * FROM mentor_todos"
    );

    const remarks = db.getAllSync(
      "SELECT * FROM mentor_notes"
    );

    const meetings = db.getAllSync(
      "SELECT * FROM mentor_meetings"
    );

    const now = new Date();

    let html = `
      <html>
      <head>

        <style>

          body {
            font-family: Arial;
            padding: 20px;
          }

          h2 {
            background: #3498db;
            color: white;
            padding: 6px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          th, td {
            border: 1px solid #ccc;
            padding: 8px;
          }

          .page {
            page-break-after: always;
          }

        </style>

      </head>

      <body>

        <p>${now.toLocaleString()}</p>

        <h1>${t.mentorReport}</h1>
    `;


    /* =========================
       MENTOR INFORMATION
    ========================= */

    if (mentor) {

      html += `
        <div class="page">

          <h2>${t.mentorInfo}</h2>

          <table>

            ${Object.entries(mentor)
              .filter(([key]) => key !== "id")
              .map(
                ([key, value]) => `
                  <tr>
                    <th>${key}</th>
                    <td>${value ?? ""}</td>
                  </tr>
                `
              )
              .join("")}

          </table>

        </div>
      `;
    }


    /* =========================
       CONTACTS
    ========================= */

    html += `
      <div class="page">

        <h2>${t.importantNumbers}</h2>

        <table>

          <tr>
            <th>${t.name}</th>
            <th>${t.phone}</th>
          </tr>

          ${contacts
            .map(
              contact => `
                <tr>
                  <td>${contact.name}</td>
                  <td>${contact.phone}</td>
                </tr>
              `
            )
            .join("")}

        </table>

      </div>
    `;


    /* =========================
       TODO LIST
    ========================= */

    html += `
      <div class="page">

        <h2>${t.todoList}</h2>

        <table>

          <tr>
            <th>${t.task}</th>
            <th>Status</th>
          </tr>

          ${todos
            .map(
              todo => `
                <tr>
                  <td>${todo.title}</td>
                  <td>
                    ${todo.completed ? "Done" : "Pending"}
                  </td>
                </tr>
              `
            )
            .join("")}

        </table>

      </div>
    `;


    /* =========================
       REMARKS
    ========================= */

    html += `
      <div class="page">

        <h2>${t.remarks}</h2>

        <table>

          <tr>
            <th>Remark</th>
            <th>${t.date}</th>
          </tr>

          ${remarks
            .map(
              remark => `
                <tr>
                  <td>${remark.content}</td>
                  <td>${remark.date}</td>
                </tr>
              `
            )
            .join("")}

        </table>

      </div>
    `;


    /* =========================
       MEETINGS
    ========================= */

    html += `
      <div class="page">

        <h2>${t.meetings}</h2>

        <table>

          <tr>
            <th>${t.title}</th>
            <th>${t.content}</th>
            <th>${t.date}</th>
          </tr>

          ${meetings
            .map(
              meeting => `
                <tr>
                  <td>${meeting.title}</td>
                  <td>${meeting.content}</td>
                  <td>${meeting.date}</td>
                </tr>
              `
            )
            .join("")}

        </table>

      </div>
    `;


    html += `
      </body>
      </html>
    `;


    const { uri } = await Print.printToFileAsync({
      html
    });

    await Sharing.shareAsync(uri);
  };


  /* =========================
     NAVIGATION ITEMS
  ========================= */

  const items = [

    {
      label: t.mentorInfo,
      path: "/(Mentor)/info",
      icon: "person",
      color: "#3498db"
    },

    {
      label: t.importantNumbers,
      path: "/(Mentor)/contacts",
      icon: "phone",
      color: "#2ecc71"
    },

    {
      label: t.todoList,
      path: "/(Mentor)/todo",
      icon: "check-circle",
      color: "#9b59b6"
    },

    {
      label: t.remarks,
      path: "/(Mentor)/remarks",
      icon: "notes",
      color: "#e67e22"
    },

    {
      label: t.meetings,
      path: "/(Mentor)/meetings",
      icon: "groups",
      color: "#e74c3c"
    }

  ];


  /* =========================
     UI
  ========================= */

  return (

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* HEADER */}

      <Text style={styles.header}>
        {t.mentorDashboard}
      </Text>

      <Text style={styles.subtitle}>
        {t.mentorDesc || ""}
      </Text>


      {/* MENU CARDS */}

      {items.map((item, index) => (

        <TouchableOpacity
          key={index}
          activeOpacity={0.7}
          onPress={() => router.push(item.path)}
          style={styles.card}
        >

          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: `${item.color}15`
              }
            ]}
          >

            <MaterialIcons
              name={item.icon}
              size={25}
              color={item.color}
            />

          </View>


          <Text style={styles.cardTitle}>
            {item.label}
          </Text>


          <MaterialIcons
            name="chevron-right"
            size={24}
            color="#bbb"
            style={styles.arrow}
          />

        </TouchableOpacity>

      ))}


      {/* ACTIONS */}

      <View style={styles.actions}>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={exportMentorPDF}
          activeOpacity={0.8}
        >

          <MaterialIcons
            name="picture-as-pdf"
            size={20}
            color="#fff"
          />

          <Text style={styles.buttonText}>
            {t.exportPDF}
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetMentorData}
          activeOpacity={0.8}
        >

          <MaterialIcons
            name="delete-outline"
            size={20}
            color="#fff"
          />

          <Text style={styles.buttonText}>
            {t.resetMentor}
          </Text>

        </TouchableOpacity>

      </View>

    </ScrollView>
  );
}


/* =========================
   STYLES
========================= */

const styles = {

  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingVertical: 60
  },

  content: {
    padding: 20,
    paddingBottom: 40
  },


  /* HEADER */

  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5
  },

  subtitle: {
    color: "#7f8c8d",
    marginBottom: 25
  },


  /* CARDS */

  card: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#fff",

    padding: 15,

    borderRadius: 10,

    marginBottom: 10,

    elevation: 2,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5
  },

  iconContainer: {
    width: 44,
    height: 44,

    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center"
  },

  cardTitle: {
    marginLeft: 12,

    fontSize: 16,

    fontWeight: "bold",

    color: "#2c3e50",

    flex: 1
  },

  arrow: {
    marginLeft: 5
  },


  /* ACTIONS */

  actions: {
    flexDirection: "row",

    gap: 10,

    marginTop: 10
  },


  exportButton: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#2ecc71",

    padding: 12,

    borderRadius: 10
  },

  resetButton: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#e74c3c",

    padding: 12,

    borderRadius: 10
  },

  buttonText: {
    color: "#fff",

    fontWeight: "bold",

    marginLeft: 7
  }

};