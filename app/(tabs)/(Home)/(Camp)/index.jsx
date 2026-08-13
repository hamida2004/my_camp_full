import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert
} from "react-native";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  TextRun,
  WidthType,
  AlignmentType,
  PageBreak
} from "docx";

import * as FileSystem from "expo-file-system/legacy";

export default function CampIndex() {

  const { t } = useLanguage();

  // =========================================================
  // NAVIGATION
  // =========================================================

  const navigate = (route) => {
    router.push(route);
  };

  // =========================================================
  // RESET CAMP DATA
  // =========================================================

  const resetCampData = () => {

    Alert.alert(
      t.reset,
      t.confirm,
      [
        {
          text: t.cancel,
          style: "cancel"
        },

        {
          text: t.delete,
          style: "destructive",

          onPress: () => {

            db.runSync(
              "DELETE FROM camp_info"
            );

            db.runSync(
              "DELETE FROM camp_staff"
            );

            db.runSync(
              "DELETE FROM daily_program"
            );

            db.runSync(
              "DELETE FROM global_program"
            );

            db.runSync(
              "DELETE FROM permanence_assignments"
            );

            db.runSync(
              "DELETE FROM permanences"
            );

            dbEvents.emit(
              "dbUpdated"
            );
          }
        }
      ]
    );
  };

  // =========================================================
  // PDF EXPORT
  // =========================================================

  const exportCampPDF = async () => {

    try {

      const camp = db.getFirstSync(
        "SELECT * FROM camp_info LIMIT 1"
      );

      const staff = db.getAllSync(
        "SELECT * FROM camp_staff"
      );

      const daily = db.getAllSync(
        "SELECT * FROM daily_program"
      );

      const global = db.getAllSync(
        "SELECT * FROM global_program"
      );

      const dates = db.getAllSync(
        "SELECT * FROM permanences ORDER BY date ASC"
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

          th,
          td {
            border: 1px solid #ccc;
            padding: 8px;
          }

          .page {
            page-break-after: always;
          }

        </style>

      </head>

      <body>

        <p>
          ${now.toLocaleString()}
        </p>

        <h1>
          ${t.campReport}
        </h1>
      `;

      // =====================================================
      // CAMP INFO
      // =====================================================

      if (camp) {

        html += `
        <div class="page">

          <h2>
            ${t.campInfo}
          </h2>

          <table>

            ${
              Object.entries(camp)
                .filter(
                  ([key]) =>
                    key !== "id"
                )
                .map(
                  ([key, value]) => `
                    <tr>
                      <th>${key}</th>
                      <td>${value ?? ""}</td>
                    </tr>
                  `
                )
                .join("")
            }

          </table>

        </div>
        `;
      }

      // =====================================================
      // STAFF
      // =====================================================

      html += `
      <div class="page">

        <h2>
          ${t.campFamily}
        </h2>

        <table>

          <tr>
            <th>${t.name}</th>
            <th>${t.role}</th>
            <th>${t.phone}</th>
          </tr>

          ${
            staff
              .map(
                s => `
                  <tr>
                    <td>${s.name}</td>
                    <td>${s.role}</td>
                    <td>${s.phone}</td>
                  </tr>
                `
              )
              .join("")
          }

        </table>

      </div>
      `;

      // =====================================================
      // DAILY PROGRAM
      // =====================================================

      html += `
      <div class="page">

        <h2>
          ${t.dailyProgram}
        </h2>

        <table>

          <tr>
            <th>${t.time}</th>
            <th>${t.activity}</th>
          </tr>

          ${
            daily
              .map(
                d => `
                  <tr>
                    <td>${d.time}</td>
                    <td>${d.activity}</td>
                  </tr>
                `
              )
              .join("")
          }

        </table>

      </div>
      `;

      // =====================================================
      // GLOBAL PROGRAM
      // =====================================================

      html += `
      <div class="page">

        <h2>
          ${t.globalProgram}
        </h2>

        <table>

          <tr>
            <th>${t.day}</th>
            <th>${t.date}</th>
            <th>${t.morning}</th>
            <th>${t.afternoon}</th>
            <th>${t.evening}</th>
          </tr>

          ${
            global
              .map(
                g => `
                  <tr>
                    <td>${g.day}</td>
                    <td>${g.date}</td>
                    <td>${g.morning}</td>
                    <td>${g.afternoon}</td>
                    <td>${g.evening}</td>
                  </tr>
                `
              )
              .join("")
          }

        </table>

      </div>
      `;

      // =====================================================
      // PERMANENCES
      // =====================================================

      for (const d of dates) {

        const get = (shift) => {

          return db
            .getAllSync(
              `
              SELECT camp_staff.name

              FROM permanence_assignments

              JOIN camp_staff
              ON camp_staff.id =
                 permanence_assignments.mentorId

              WHERE permanenceId=?
              AND shift=?
              `,
              [
                d.id,
                shift
              ]
            )
            .map(
              x => x.name
            )
            .join(", ");
        };

        html += `
        <div class="page">

          <h2>
            ${t.permanences} - ${d.date}
          </h2>

          <table>

            <tr>
              <th>Type</th>
              <th>Mentors</th>
            </tr>

            <tr>
              <td>${t.nap}</td>
              <td>${get("nap")}</td>
            </tr>

            <tr>
              <td>${t.night}</td>
              <td>${get("night")}</td>
            </tr>

            <tr>
              <td>${t.fullDay}</td>
              <td>${get("full")}</td>
            </tr>

            <tr>
              <td>${t.manOfDay}</td>
              <td>${get("man_of_day")}</td>
            </tr>

          </table>

        </div>
        `;
      }

      html += `
      </body>
      </html>
      `;

      const { uri } =
        await Print.printToFileAsync({
          html
        });

      await Sharing.shareAsync(uri);

    } catch (error) {

      console.error(
        "PDF export error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to create the PDF."
      );
    }
  };

  // =========================================================
  // DOCX HELPERS
  // =========================================================

  const createCell = (
    value,
    bold = false
  ) => {

    return new TableCell({

      children: [

        new Paragraph({

          children: [

            new TextRun({

              text:
                String(value ?? ""),

              bold

            })

          ]

        })

      ]

    });
  };

  const createRow = (
    values,
    header = false
  ) => {

    return new TableRow({

      children:
        values.map(
          value =>
            createCell(
              value,
              header
            )
        )

    });
  };

  const createTable = (
    rows
  ) => {

    return new Table({

      rows,

      width: {
        size: 100,
        type:
          WidthType.PERCENTAGE
      }

    });
  };

  // =========================================================
  // DOCX EXPORT
  // =========================================================

  const exportCampDOCX = async () => {

    try {

      const camp = db.getFirstSync(
        "SELECT * FROM camp_info LIMIT 1"
      );

      const staff = db.getAllSync(
        "SELECT * FROM camp_staff"
      );

      const daily = db.getAllSync(
        "SELECT * FROM daily_program"
      );

      const global = db.getAllSync(
        "SELECT * FROM global_program"
      );

      const dates = db.getAllSync(
        "SELECT * FROM permanences ORDER BY date ASC"
      );

      const now = new Date();

      const children = [];

      // =====================================================
      // TITLE
      // =====================================================

      children.push(
        new Paragraph({

          text:
            t.campReport,

          heading:
            HeadingLevel.TITLE,

          alignment:
            AlignmentType.CENTER

        })
      );

      children.push(
        new Paragraph({

          children: [

            new TextRun({
              text:
                now.toLocaleString()
            })

          ],

          alignment:
            AlignmentType.CENTER

        })
      );

      // =====================================================
      // CAMP INFO
      // =====================================================

      if (camp) {

        children.push(
          new Paragraph({

            text:
              t.campInfo,

            heading:
              HeadingLevel.HEADING_1

          })
        );

        const campRows =
          Object
            .entries(camp)
            .filter(
              ([key]) =>
                key !== "id"
            )
            .map(
              ([key, value]) =>
                createRow([
                  key,
                  value ?? ""
                ])
            );

        children.push(
          createTable([

            createRow(
              [
                "Field",
                "Value"
              ],
              true
            ),

            ...campRows

          ])
        );

        children.push(
          new Paragraph({
            children: [
              new PageBreak()
            ]
          })
        );
      }

      // =====================================================
      // STAFF
      // =====================================================

      children.push(
        new Paragraph({

          text:
            t.campFamily,

          heading:
            HeadingLevel.HEADING_1

        })
      );

      children.push(
        createTable([

          createRow(
            [
              t.name,
              t.role,
              t.phone
            ],
            true
          ),

          ...staff.map(
            s =>
              createRow([
                s.name,
                s.role,
                s.phone
              ])
          )

        ])
      );

      children.push(
        new Paragraph({
          children: [
            new PageBreak()
          ]
        })
      );

      // =====================================================
      // DAILY PROGRAM
      // =====================================================

      children.push(
        new Paragraph({

          text:
            t.dailyProgram,

          heading:
            HeadingLevel.HEADING_1

        })
      );

      children.push(
        createTable([

          createRow(
            [
              t.time,
              t.activity
            ],
            true
          ),

          ...daily.map(
            d =>
              createRow([
                d.time,
                d.activity
              ])
          )

        ])
      );

      children.push(
        new Paragraph({
          children: [
            new PageBreak()
          ]
        })
      );

      // =====================================================
      // GLOBAL PROGRAM
      // =====================================================

      children.push(
        new Paragraph({

          text:
            t.globalProgram,

          heading:
            HeadingLevel.HEADING_1

        })
      );

      children.push(
        createTable([

          createRow(
            [
              t.day,
              t.date,
              t.morning,
              t.afternoon,
              t.evening
            ],
            true
          ),

          ...global.map(
            g =>
              createRow([
                g.day,
                g.date,
                g.morning,
                g.afternoon,
                g.evening
              ])
          )

        ])
      );

      children.push(
        new Paragraph({
          children: [
            new PageBreak()
          ]
        })
      );

      // =====================================================
      // PERMANENCES
      // =====================================================

      children.push(
        new Paragraph({

          text:
            t.permanences,

          heading:
            HeadingLevel.HEADING_1

        })
      );

      for (
        let i = 0;
        i < dates.length;
        i++
      ) {

        const d =
          dates[i];

        const get = (shift) => {

          return db
            .getAllSync(
              `
              SELECT camp_staff.name

              FROM permanence_assignments

              JOIN camp_staff
              ON camp_staff.id =
                 permanence_assignments.mentorId

              WHERE permanenceId=?
              AND shift=?
              `,
              [
                d.id,
                shift
              ]
            )
            .map(
              x =>
                x.name
            )
            .join(", ");
        };

        children.push(
          new Paragraph({

            text:
              `${t.permanences} - ${d.date}`,

            heading:
              HeadingLevel.HEADING_2

          })
        );

        children.push(
          createTable([

            createRow(
              [
                "Type",
                "Mentors"
              ],
              true
            ),

            createRow([
              t.nap,
              get("nap")
            ]),

            createRow([
              t.night,
              get("night")
            ]),

            createRow([
              t.fullDay,
              get("full")
            ]),

            createRow([
              t.manOfDay,
              get("man_of_day")
            ])

          ])
        );

        if (
          i < dates.length - 1
        ) {

          children.push(
            new Paragraph({
              children: [
                new PageBreak()
              ]
            })
          );
        }
      }

      const document =
        new Document({

          sections: [
            {
              properties: {},
              children
            }
          ]

        });

      const base64 =
        await Packer.toBase64String(
          document
        );

      const fileName =
        `camp-report-${formatDateForFile(
          now
        )}.docx`;

      const fileUri =
        `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        base64,
        {
          encoding:
            FileSystem.EncodingType.Base64
        }
      );

      await Sharing.shareAsync(
        fileUri,
        {
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

          dialogTitle:
            t.exportDOCX
        }
      );

    } catch (error) {

      console.error(
        "DOCX export error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to create the Word document."
      );
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDateForFile = (
    date
  ) => {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =========================================================
  // NAVIGATION ITEMS
  // =========================================================

  const items = [

    {
      label: t.campInfo,
      path: "./info",
      icon: "info-outline",
      color: "#3498db"
    },

    {
      label: t.campFamily,
      path: "./hierarchy",
      icon: "groups",
      color: "#2ecc71"
    },

    {
      label: t.dailyProgram,
      path: "./dailyProgram",
      icon: "today",
      color: "#9b59b6"
    },

    {
      label: t.campProgram,
      path: "./campProgram",
      icon: "event-note",
      color: "#e67e22"
    },

    {
      label: t.permanences,
      path: "./permanences",
      icon: "schedule",
      color: "#e74c3c"
    }

  ];

  // =========================================================
  // UI
  // =========================================================

  return (

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* HEADER */}

      <Text style={styles.title}>
        {t.campInfo}
      </Text>

      <Text style={styles.subtitle}>
        {t.campReport || ""}
      </Text>

      {/* NAVIGATION CARDS */}

      {items.map(
        (item, index) => (

          <TouchableOpacity
            key={index}
            onPress={() =>
              navigate(item.path)
            }
            style={styles.card}
          >

            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    `${item.color}15`
                }
              ]}
            >

              <MaterialIcons
                name={item.icon}
                size={26}
                color={item.color}
              />

            </View>

            <View style={styles.cardContent}>

              <Text style={styles.cardTitle}>
                {item.label}
              </Text>

              <Text style={styles.cardSubtitle}>
                {item.label}
              </Text>

            </View>

            <MaterialIcons
              name="chevron-right"
              size={24}
              color="#bbb"
            />

          </TouchableOpacity>

        )
      )}

      {/* EXPORT */}

      <View style={styles.exportRow}>

        <TouchableOpacity
          onPress={exportCampPDF}
          style={styles.greenButton}
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
          onPress={exportCampDOCX}
          style={styles.blueButton}
        >

          <MaterialIcons
            name="description"
            size={20}
            color="#fff"
          />

          <Text style={styles.buttonText}>
            {t.exportDOCX}
          </Text>

        </TouchableOpacity>

      </View>

      {/* RESET */}

      <TouchableOpacity
        onPress={resetCampData}
        style={styles.redButton}
      >

        <MaterialIcons
          name="delete-sweep"
          size={20}
          color="#fff"
        />

        <Text style={styles.buttonText}>
          {t.reset}
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const styles = {

  container: {
    flex: 1,
    backgroundColor: "#f9f9f9"
  },

  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 50
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#2c3e50"
  },

  subtitle: {
    color: "#7f8c8d",
    marginBottom: 20
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center"
  },

  cardContent: {
    flex: 1,
    marginLeft: 15
  },

  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#2c3e50"
  },

  cardSubtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 3
  },

  exportRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    marginBottom: 10
  },

  greenButton: {
    flex: 1,
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7
  },

  blueButton: {
    flex: 1,
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7
  },

  redButton: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7
  },

  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold"
  }

};