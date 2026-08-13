import { MaterialIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { db, deletePersonCascade } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

// DOCX
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
  AlignmentType
} from "docx";

import * as FileSystem from "expo-file-system/legacy";

export default function Home() {

  const { t, lang } = useLanguage();

  const [people, setPeople] = useState([]);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [money, setMoney] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  // =========================================================
  // LOAD PEOPLE
  // =========================================================

  const loadPeople = () => {

    const result = db.getAllSync(
      "SELECT * FROM people"
    );

    const updated = result.map(person => {

      const totalExpenses =
        db.getFirstSync(
          "SELECT SUM(amount) as total FROM expenses WHERE personId=?",
          [person.id]
        )?.total || 0;

      return {
        ...person,
        remaining: person.money - totalExpenses
      };
    });

    setPeople(updated);
  };

  useEffect(() => {

    loadPeople();

    const listener = () => loadPeople();

    dbEvents.on(
      "dbUpdated",
      listener
    );

    return () =>
      dbEvents.off(
        "dbUpdated",
        listener
      );

  }, []);

  // =========================================================
  // DELETE PERSON
  // =========================================================

  const deletePerson = (personId) => {

    Alert.alert(
      t.deletePerson,
      t.deleteConfirm,
      [
        {
          text: t.cancel,
          style: "cancel"
        },
        {
          text: t.delete,
          style: "destructive",

          onPress: () => {

            deletePersonCascade(personId);

            dbEvents.emit(
              "dbUpdated"
            );
          }
        }
      ]
    );
  };

  // =========================================================
  // ADD PERSON
  // =========================================================

  const addPerson = () => {

    if (
      !name ||
      !birthDate ||
      !money ||
      !parentPhone
    ) {
      return;
    }

    db.runSync(
      `
      INSERT INTO people
      (
        name,
        birthDate,
        money,
        parentPhone
      )
      VALUES (?,?,?,?)
      `,
      [
        name,
        birthDate,
        Number(money),
        parentPhone
      ]
    );

    setName("");
    setBirthDate("");
    setMoney("");
    setParentPhone("");

    dbEvents.emit(
      "dbUpdated"
    );
  };

  // =========================================================
  // BUDGET COLOR
  // =========================================================

  const getColor = (
    remaining,
    initial
  ) => {

    if (!initial || initial <= 0)
      return "#e74c3c";

    const ratio =
      remaining / initial;

    if (ratio > 0.7)
      return "#2ecc71";

    if (ratio > 0.2)
      return "#e67e22";

    return "#e74c3c";
  };

  // =========================================================
  // RESET DATABASE
  // =========================================================

  const resetDB = () => {

    Alert.alert(
      t.reset,
      t.confirmReset ||
        "Delete all data?",
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
              "DELETE FROM expenses"
            );

            db.runSync(
              "DELETE FROM inventory"
            );

            db.runSync(
              "DELETE FROM people"
            );

            db.runSync(
              "DELETE FROM items"
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

  const exportPDF = async () => {

    try {

      const now = new Date();

      const isArabic =
        lang === "ar";

      let html = `
      <html dir="${isArabic ? "rtl" : "ltr"}">

      <head>

        <meta charset="UTF-8">

        <style>

          body {
            font-family: Arial;
            text-align: center;
            margin: 50px;
            direction: ${isArabic ? "rtl" : "ltr"};
          }

          h1 {
            margin-bottom: 30px;
          }

          h2 {
            margin-bottom: 15px;
          }

          h3 {
            margin-top: 30px;
          }

          table {
            width: 80%;
            margin: 15px auto 30px auto;
            border-collapse: collapse;
          }

          th,
          td {
            border: 1px solid #555;
            padding: 8px;
          }

          th {
            background: #3498db;
            color: white;
          }

          .expense-header {
            background: #e67e22;
          }

          .page {
            page-break-after: always;
          }

        </style>

      </head>

      <body>

        <h1>${t.reportTitle}</h1>

        <p>
          ${t.date}: ${now.toLocaleString()}
        </p>
      `;

      // =====================================================
      // EACH CHILD
      // =====================================================

      people.forEach(person => {

        const totalExpenses =
          db.getFirstSync(
            `
            SELECT SUM(amount) as total
            FROM expenses
            WHERE personId=?
            `,
            [person.id]
          )?.total || 0;

        const remaining =
          person.money -
          totalExpenses;

        // INVENTORY

        const inventory =
          db.getAllSync(
            `
            SELECT
              inventory.quantity,
              items.name
            FROM inventory
            JOIN items
              ON inventory.itemId = items.id
            WHERE personId=?
            ORDER BY items.name
            `,
            [person.id]
          );

        // EXPENSES

        const expenses =
          db.getAllSync(
            `
            SELECT
              description,
              amount
            FROM expenses
            WHERE personId=?
            ORDER BY id ASC
            `,
            [person.id]
          );

        // INVENTORY TABLE

        const inventoryTable =
          inventory.length
            ? `
              <table>

                <tr>
                  <th>${t.itemName}</th>
                  <th>${t.quantity}</th>
                </tr>

                ${
                  inventory
                    .map(
                      item => `
                        <tr>
                          <td>${item.name}</td>
                          <td>${item.quantity}</td>
                        </tr>
                      `
                    )
                    .join("")
                }

              </table>
            `
            : `
              <p>
                ${t.noItems}
              </p>
            `;

        // EXPENSE TABLE

        const expensesTable =
          expenses.length
            ? `
              <table>

                <tr>
                  <th class="expense-header">
                    ${t.expenseDescription || "Description"}
                  </th>

                  <th class="expense-header">
                    ${t.amount || "Amount"}
                  </th>
                </tr>

                ${
                  expenses
                    .map(
                      expense => `
                        <tr>
                          <td>
                            ${
                              expense.description ||
                              "-"
                            }
                          </td>

                          <td>
                            ${expense.amount} DA
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                }

              </table>
            `
            : `
              <p>
                ${
                  t.noExpenses ||
                  "No expenses"
                }
              </p>
            `;

        // CHILD PAGE

        html += `
          <div class="page">

            <h2>
              ${person.name}
            </h2>

            <p>
              <strong>
                ${t.birthDate}:
              </strong>
              ${person.birthDate}
            </p>

            <p>
              <strong>
                ${t.initialBudget}:
              </strong>
              ${person.money} DA
            </p>

            <p>
              <strong>
                ${t.remaining}:
              </strong>
              ${remaining} DA
            </p>

            <p>
              <strong>
                ${t.parentPhone}:
              </strong>

              <a href="tel:${person.parentPhone}">
                ${person.parentPhone}
              </a>
            </p>

            <h3>
              ${t.inventory}
            </h3>

            ${inventoryTable}

            <h3>
              ${
                t.expenses ||
                "Expenses"
              }
            </h3>

            ${expensesTable}

          </div>
        `;
      });

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
        "Could not export PDF."
      );
    }
  };

  // =========================================================
  // DOCX HELPERS
  // =========================================================

  const createCell = (
    text,
    bold = false
  ) => {

    return new TableCell({

      children: [

        new Paragraph({

          alignment:
            lang === "ar"
              ? AlignmentType.RIGHT
              : AlignmentType.LEFT,

          children: [

            new TextRun({

              text:
                String(text ?? ""),

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

      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },

      rows

    });
  };

  // =========================================================
  // DOCX EXPORT
  // =========================================================

  const exportDOCX = async () => {

    try {

      const now =
        new Date();

      const children = [];

      // TITLE

      children.push(
        new Paragraph({

          alignment:
            lang === "ar"
              ? AlignmentType.RIGHT
              : AlignmentType.CENTER,

          children: [

            new TextRun({

              text:
                t.reportTitle,

              bold: true,

              size: 32

            })

          ]

        })
      );

      children.push(
        new Paragraph({

          alignment:
            lang === "ar"
              ? AlignmentType.RIGHT
              : AlignmentType.CENTER,

          children: [

            new TextRun({

              text:
                `${t.date}: ${now.toLocaleString()}`

            })

          ]

        })
      );

      // EACH CHILD

      for (
        let index = 0;
        index < people.length;
        index++
      ) {

        const person =
          people[index];

        if (index > 0) {

          children.push(

            new Paragraph({

              pageBreakBefore: true,

              children: []

            })

          );
        }

        const totalExpenses =
          db.getFirstSync(
            `
            SELECT SUM(amount) as total
            FROM expenses
            WHERE personId=?
            `,
            [person.id]
          )?.total || 0;

        const remaining =
          person.money -
          totalExpenses;

        // NAME

        children.push(
          new Paragraph({

            heading:
              HeadingLevel.HEADING_1,

            alignment:
              lang === "ar"
                ? AlignmentType.RIGHT
                : AlignmentType.CENTER,

            children: [

              new TextRun({

                text:
                  person.name,

                bold: true

              })

            ]

          })
        );

        // INFORMATION

        children.push(
          new Paragraph({
            alignment:
              lang === "ar"
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,

            children: [
              new TextRun({
                text:
                  `${t.birthDate}: ${person.birthDate}`
              })
            ]
          })
        );

        children.push(
          new Paragraph({
            alignment:
              lang === "ar"
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,

            children: [
              new TextRun({
                text:
                  `${t.initialBudget}: ${person.money} DA`
              })
            ]
          })
        );

        children.push(
          new Paragraph({
            alignment:
              lang === "ar"
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,

            children: [
              new TextRun({
                text:
                  `${t.remaining}: ${remaining} DA`,
                bold: true
              })
            ]
          })
        );

        children.push(
          new Paragraph({
            alignment:
              lang === "ar"
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,

            children: [
              new TextRun({
                text:
                  `${t.parentPhone}: ${person.parentPhone}`
              })
            ]
          })
        );

        // INVENTORY

        children.push(
          new Paragraph({

            heading:
              HeadingLevel.HEADING_2,

            alignment:
              lang === "ar"
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,

            children: [
              new TextRun({
                text:
                  t.inventory,
                bold: true
              })
            ]
          })
        );

        const inventory =
          db.getAllSync(
            `
            SELECT
              inventory.quantity,
              items.name
            FROM inventory
            JOIN items
              ON inventory.itemId = items.id
            WHERE personId=?
            ORDER BY items.name
            `,
            [person.id]
          );

        if (
          inventory.length > 0
        ) {

          children.push(
            createTable([

              createRow(
                [
                  t.itemName,
                  t.quantity
                ],
                true
              ),

              ...inventory.map(
                item =>
                  createRow([
                    item.name,
                    item.quantity
                  ])
              )

            ])
          );

        } else {

          children.push(
            new Paragraph({

              alignment:
                lang === "ar"
                  ? AlignmentType.RIGHT
                  : AlignmentType.LEFT,

              children: [
                new TextRun({
                  text:
                    t.noItems
                })
              ]
            })
          );
        }

        // EXPENSES

        children.push(
          new Paragraph({

            heading:
              HeadingLevel.HEADING_2,

            alignment:
              lang === "ar"
                ? AlignmentType.RIGHT
                : AlignmentType.LEFT,

            children: [
              new TextRun({
                text:
                  t.expenses ||
                  "Expenses",
                bold: true
              })
            ]
          })
        );

        const expenses =
          db.getAllSync(
            `
            SELECT
              description,
              amount
            FROM expenses
            WHERE personId=?
            ORDER BY id ASC
            `,
            [person.id]
          );

        if (
          expenses.length > 0
        ) {

          children.push(
            createTable([

              createRow(
                [
                  t.expenseDescription ||
                    "Description",

                  t.amount ||
                    "Amount"
                ],
                true
              ),

              ...expenses.map(
                expense =>
                  createRow([
                    expense.description ||
                      "-",

                    `${expense.amount} DA`
                  ])
              )

            ])
          );

        } else {

          children.push(
            new Paragraph({

              alignment:
                lang === "ar"
                  ? AlignmentType.RIGHT
                  : AlignmentType.LEFT,

              children: [

                new TextRun({
                  text:
                    t.noExpenses ||
                    "No expenses"
                })

              ]

            })
          );
        }
      }

      const doc =
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
          doc
        );

      const fileName =
        `camp_report_${Date.now()}.docx`;

      const fileUri =
        FileSystem.documentDirectory +
        fileName;

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
            t.exportDOCX ||
            "Export DOCX"
        }
      );

    } catch (error) {

      console.error(
        "DOCX export error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not export DOCX."
      );
    }
  };

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
        {t.addPerson}
      </Text>

      <Text style={styles.subtitle}>
        {t.mentorDesc || ""}
      </Text>

      {/* ADD PERSON CARD */}

      <View style={styles.formCard}>

        <View style={styles.sectionHeader}>

          <MaterialIcons
            name="person-add"
            size={24}
            color="#3498db"
          />

          <Text style={styles.sectionTitle}>
            {t.addPerson}
          </Text>

        </View>

        <TextInput
          placeholderTextColor="#999"
          placeholder={t.name}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholderTextColor="#999"
          placeholder={t.birthDate}
          value={birthDate}
          onChangeText={setBirthDate}
          style={styles.input}
        />

        <TextInput
          placeholderTextColor="#999"
          placeholder={t.budget}
          value={money}
          onChangeText={setMoney}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholderTextColor="#999"
          placeholder={t.parentPhone}
          value={parentPhone}
          onChangeText={setParentPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TouchableOpacity
          onPress={addPerson}
          style={styles.blueButton}
        >
          <Text style={styles.buttonText}>
            {t.addPerson}
          </Text>
        </TouchableOpacity>

      </View>

      {/* ACTIONS */}

      <View style={styles.actionRow}>

        <TouchableOpacity
          onPress={exportPDF}
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
          onPress={exportDOCX}
          style={styles.blueButton}
        >
          <MaterialIcons
            name="description"
            size={20}
            color="#fff"
          />

          <Text style={styles.buttonText}>
            {t.exportDOCX || "Export DOCX"}
          </Text>
        </TouchableOpacity>

      </View>

      {/* PEOPLE */}

      <Text style={styles.sectionHeading}>
        {t.name}
      </Text>

      {people.map(item => (

        <View
          key={item.id}
          style={styles.card}
        >

          <TouchableOpacity
            onPress={() =>
              deletePerson(item.id)
            }
            style={styles.delete}
          >
            <MaterialIcons
              name="delete-outline"
              size={23}
              color="#e74c3c"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push(
                `/personInventory?id=${item.id}`
              )
            }
            style={styles.personContent}
          >

            <View style={styles.personHeader}>

              <View style={styles.avatar}>

                <MaterialIcons
                  name="person"
                  size={25}
                  color="#3498db"
                />

              </View>

              <Text style={styles.cardTitle}>
                {item.name}
              </Text>

            </View>

            <View style={styles.infoRow}>

              <MaterialIcons
                name="cake"
                size={18}
                color="#7f8c8d"
              />

              <Text style={styles.infoText}>
                {t.birthDate}: {item.birthDate}
              </Text>

            </View>

            <View style={styles.infoRow}>

              <MaterialIcons
                name="account-balance-wallet"
                size={18}
                color="#7f8c8d"
              />

              <Text style={styles.infoText}>
                {t.initialBudget}: {item.money} DA
              </Text>

            </View>

            <View style={styles.infoRow}>

              <MaterialIcons
                name="payments"
                size={18}
                color={getColor(
                  item.remaining,
                  item.money
                )}
              />

              <Text
                style={[
                  styles.infoText,
                  {
                    color: getColor(
                      item.remaining,
                      item.money
                    ),
                    fontWeight: "bold"
                  }
                ]}
              >
                {t.remaining}: {item.remaining} DA
              </Text>

            </View>

            <View style={styles.infoRow}>

              <MaterialIcons
                name="phone"
                size={18}
                color="#3498db"
              />

              <Text
                style={styles.phone}
                onPress={() =>
                  Linking.openURL(
                    `tel:${item.parentPhone}`
                  )
                }
              >
                {item.parentPhone}
              </Text>

            </View>

          </TouchableOpacity>

        </View>

      ))}

      {/* RESET */}

      <TouchableOpacity
        onPress={resetDB}
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

  formCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#2c3e50"
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2c3e50"
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 11,
    marginBottom: 10,
    backgroundColor: "#fff"
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 25
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
  },

  card: {
    backgroundColor: "#fff",
    padding: 17,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    position: "relative"
  },

  personContent: {
    paddingRight: 25
  },

  personHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eef7fd",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2c3e50"
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
    gap: 8
  },

  infoText: {
    color: "#555",
    fontSize: 14
  },

  phone: {
    color: "#3498db",
    fontWeight: "bold",
    fontSize: 14
  },

  delete: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2
  }

};