import { MaterialIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";

import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
  db,
  deletePersonCascade
} from "../../../../database/db";

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
  AlignmentType,
  ImageRun
} from "docx";

import * as FileSystem from "expo-file-system/legacy";

export default function Home() {

  const { t, lang } = useLanguage();

  // =========================================================
  // STATE
  // =========================================================

  const [people, setPeople] = useState([]);

  // =========================================================
  // ADD PERSON
  // =========================================================

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [money, setMoney] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [showBirthPicker, setShowBirthPicker] =
    useState(false);

  const [birthDateValue, setBirthDateValue] =
    useState(new Date());

  // =========================================================
  // EDIT PERSON
  // =========================================================

  const [editingPerson, setEditingPerson] =
    useState(null);

  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] =
    useState("");

  const [editMoney, setEditMoney] = useState("");

  const [editParentPhone, setEditParentPhone] =
    useState("");

  const [showEditBirthPicker, setShowEditBirthPicker] =
    useState(false);

  const [editBirthDateValue, setEditBirthDateValue] =
    useState(new Date());


  // =========================================================
  // DATE HELPERS
  // =========================================================

  // Date -> YYYY-MM-DD
  const formatDate = (date) => {

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


  // YYYY-MM-DD -> Date
  const parseDate = (dateString) => {

    if (!dateString) {
      return new Date();
    }

    const parts =
      dateString.split("-");

    if (parts.length !== 3) {
      return new Date();
    }

    const year =
      Number(parts[0]);

    const month =
      Number(parts[1]) - 1;

    const day =
      Number(parts[2]);

    const date =
      new Date(
        year,
        month,
        day
      );

    if (
      isNaN(date.getTime())
    ) {
      return new Date();
    }

    return date;
  };


  // =========================================================
  // IMAGE HELPERS
  // =========================================================

  /**
   * Convert a local image URI to Base64.
   *
   * This is used when exporting the image because the
   * generated PDF/DOCX cannot reliably access the original
   * local file URI after sharing.
   */
  const getImageBase64 = async (imageUri) => {

    if (!imageUri) {
      return null;
    }

    try {

      const base64 =
        await FileSystem.readAsStringAsync(
          imageUri,
          {
            encoding:
              FileSystem.EncodingType.Base64
          }
        );

      if (!base64) {
        return null;
      }

      return base64;

    } catch (error) {

      console.error(
        "Could not read inventory image:",
        error
      );

      return null;
    }
  };


  /**
   * Determine image MIME type from the URI.
   */
  const getImageMimeType = (imageUri) => {

    if (!imageUri) {
      return "image/jpeg";
    }

    const cleanUri =
      imageUri
        .split("?")[0]
        .toLowerCase();

    if (cleanUri.endsWith(".png")) {
      return "image/png";
    }

    if (
      cleanUri.endsWith(".webp")
    ) {
      return "image/webp";
    }

    if (
      cleanUri.endsWith(".gif")
    ) {
      return "image/gif";
    }

    return "image/jpeg";
  };


  /**
   * Convert Base64 to Uint8Array.
   *
   * DOCX ImageRun accepts binary image data.
   */
  const base64ToUint8Array = (base64) => {

    const binaryString =
      global.atob
        ? global.atob(base64)
        : atob(base64);

    const length =
      binaryString.length;

    const bytes =
      new Uint8Array(length);

    for (
      let i = 0;
      i < length;
      i++
    ) {

      bytes[i] =
        binaryString.charCodeAt(i);

    }

    return bytes;
  };


  // =========================================================
  // LOAD PEOPLE
  // =========================================================

  const loadPeople = () => {

    try {

      const result =
        db.getAllSync(
          "SELECT * FROM people ORDER BY name ASC"
        );

      const updated =
        result.map(person => {

          const totalExpenses =
            db.getFirstSync(
              `
              SELECT SUM(amount) as total
              FROM expenses
              WHERE personId=?
              `,
              [person.id]
            )?.total || 0;

          return {
            ...person,

            remaining:
              Number(
                person.money || 0
              ) -
              Number(
                totalExpenses || 0
              )
          };
        });

      setPeople(updated);

    } catch (error) {

      console.error(
        "Load people error:",
        error
      );

      Alert.alert(
        t.error || "Error",

        t.loadFailed ||
          "Could not load the children."
      );
    }
  };


  // =========================================================
  // AUTO REFRESH
  // =========================================================

  useEffect(() => {

    loadPeople();

    const listener = () => {
      loadPeople();
    };

    dbEvents.on(
      "dbUpdated",
      listener
    );

    return () => {

      dbEvents.off(
        "dbUpdated",
        listener
      );

    };

  }, []);


  // =========================================================
  // ADD BIRTH DATE PICKER
  // =========================================================

  const onBirthDateChange = (
    event,
    date
  ) => {

    setShowBirthPicker(false);

    if (date) {

      setBirthDateValue(date);

      setBirthDate(
        formatDate(date)
      );
    }
  };


  // =========================================================
  // EDIT BIRTH DATE PICKER
  // =========================================================

  const onEditBirthDateChange = (
    event,
    date
  ) => {

    setShowEditBirthPicker(false);

    if (date) {

      setEditBirthDateValue(date);

      setEditBirthDate(
        formatDate(date)
      );
    }
  };


  // =========================================================
  // ADD PERSON
  // =========================================================

  const addPerson = () => {

    if (
      !name.trim() ||
      !birthDate.trim() ||
      !money.trim() ||
      !parentPhone.trim()
    ) {

      Alert.alert(
        t.invalidData ||
          "Invalid data",

        t.fillAllFields ||
          "Please fill in all fields."
      );

      return;
    }

    const budget =
      Number(money);

    if (
      isNaN(budget) ||
      budget < 0
    ) {

      Alert.alert(
        t.invalidBudget ||
          "Invalid budget",

        t.enterValidBudget ||
          "Please enter a valid budget."
      );

      return;
    }

    try {

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
          name.trim(),
          birthDate.trim(),
          budget,
          parentPhone.trim()
        ]
      );

      setName("");
      setBirthDate("");
      setMoney("");
      setParentPhone("");

      setBirthDateValue(
        new Date()
      );

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Add person error:",
        error
      );

      Alert.alert(
        t.error ||
          "Error",

        t.addFailed ||
          "Could not add the child."
      );
    }
  };


  // =========================================================
  // OPEN EDIT FORM
  // =========================================================

  const openEditPerson = (
    person
  ) => {

    setEditingPerson(
      person
    );

    setEditName(
      person.name || ""
    );

    setEditBirthDate(
      person.birthDate || ""
    );

    setEditMoney(
      person.money !== null &&
      person.money !== undefined
        ? String(person.money)
        : ""
    );

    setEditParentPhone(
      person.parentPhone || ""
    );

    setEditBirthDateValue(
      parseDate(
        person.birthDate
      )
    );
  };


  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const cancelEdit = () => {

    setEditingPerson(
      null
    );

    setEditName("");
    setEditBirthDate("");
    setEditMoney("");
    setEditParentPhone("");

    setShowEditBirthPicker(
      false
    );
  };


  // =========================================================
  // UPDATE PERSON
  // =========================================================

  const updatePerson = () => {

    if (!editingPerson) {
      return;
    }

    if (
      !editName.trim() ||
      !editBirthDate.trim() ||
      !editMoney.trim() ||
      !editParentPhone.trim()
    ) {

      Alert.alert(
        t.invalidData ||
          "Invalid data",

        t.fillAllFields ||
          "Please fill in all fields."
      );

      return;
    }

    const budget =
      Number(editMoney);

    if (
      isNaN(budget) ||
      budget < 0
    ) {

      Alert.alert(
        t.invalidBudget ||
          "Invalid budget",

        t.enterValidBudget ||
          "Please enter a valid budget."
      );

      return;
    }

    try {

      db.runSync(
        `
        UPDATE people
        SET
          name = ?,
          birthDate = ?,
          money = ?,
          parentPhone = ?
        WHERE id = ?
        `,
        [
          editName.trim(),
          editBirthDate.trim(),
          budget,
          editParentPhone.trim(),
          editingPerson.id
        ]
      );

      cancelEdit();

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Update person error:",
        error
      );

      Alert.alert(
        t.error ||
          "Error",

        t.updateFailed ||
          "Could not update the child."
      );
    }
  };


  // =========================================================
  // DELETE PERSON
  // =========================================================

  const deletePerson = (
    personId
  ) => {

    Alert.alert(
      t.deletePerson ||
        "Delete child",

      t.deleteConfirm ||
        "Are you sure you want to delete this child?",

      [
        {
          text:
            t.cancel ||
            "Cancel",

          style: "cancel"
        },

        {
          text:
            t.delete ||
            "Delete",

          style: "destructive",

          onPress: () => {

            try {

              deletePersonCascade(
                personId
              );

              if (
                editingPerson?.id ===
                personId
              ) {
                cancelEdit();
              }

              dbEvents.emit(
                "dbUpdated"
              );

            } catch (error) {

              console.error(
                "Delete person error:",
                error
              );

              Alert.alert(
                t.error ||
                  "Error",

                t.deleteFailed ||
                  "Could not delete the child."
              );
            }
          }
        }
      ]
    );
  };


  // =========================================================
  // BUDGET COLOR
  // =========================================================

  const getColor = (
    remaining,
    initial
  ) => {

    if (
      !initial ||
      initial <= 0
    ) {
      return "#e74c3c";
    }

    const ratio =
      remaining / initial;

    if (ratio > 0.7) {
      return "#2ecc71";
    }

    if (ratio > 0.2) {
      return "#e67e22";
    }

    return "#e74c3c";
  };


  // =========================================================
  // RESET DATABASE
  // =========================================================

  const resetDB = () => {

    Alert.alert(
      t.reset ||
        "Reset database",

      t.confirmReset ||
        "Delete all data?",

      [
        {
          text:
            t.cancel ||
            "Cancel",

          style: "cancel"
        },

        {
          text:
            t.delete ||
            "Delete",

          style: "destructive",

          onPress: () => {

            try {

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

              cancelEdit();

              dbEvents.emit(
                "dbUpdated"
              );

            } catch (error) {

              console.error(
                "Reset database error:",
                error
              );

              Alert.alert(
                t.error ||
                  "Error",

                t.resetFailed ||
                  "Could not reset the database."
              );
            }
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

      const now =
        new Date();

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

          .inventory-image {
            max-width: 500px;
            max-height: 350px;
            width: auto;
            height: auto;
            display: block;
            margin: 15px auto 25px auto;
            border: 1px solid #ddd;
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

      for (
        const person of people
      ) {

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
          Number(
            person.money || 0
          ) -
          Number(
            totalExpenses || 0
          );


        // ===================================================
        // INVENTORY
        // ===================================================

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


        // ===================================================
        // EXPENSES
        // ===================================================

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


        // ===================================================
        // INVENTORY IMAGE
        // ===================================================

        let inventoryImageHTML =
          "";

        if (
          person.inventoryImageUri
        ) {

          const imageBase64 =
            await getImageBase64(
              person.inventoryImageUri
            );

          if (imageBase64) {

            const mimeType =
              getImageMimeType(
                person.inventoryImageUri
              );

            inventoryImageHTML = `
              <img
                class="inventory-image"
                src="data:${mimeType};base64,${imageBase64}"
              />
            `;
          }
        }


        // ===================================================
        // INVENTORY TABLE
        // ===================================================

        const inventoryTable =
          inventory.length
            ? `
              <table>

                <tr>

                  <th>
                    ${t.itemName}
                  </th>

                  <th>
                    ${t.quantity}
                  </th>

                </tr>

                ${
                  inventory
                    .map(
                      item => `
                        <tr>

                          <td>
                            ${item.name}
                          </td>

                          <td>
                            ${item.quantity}
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
                ${t.noItems}
              </p>
            `;


        // ===================================================
        // EXPENSE TABLE
        // ===================================================

        const expensesTable =
          expenses.length
            ? `
              <table>

                <tr>

                  <th class="expense-header">
                    ${
                      t.expenseDescription ||
                      "Description"
                    }
                  </th>

                  <th class="expense-header">
                    ${
                      t.amount ||
                      "Amount"
                    }
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


        // ===================================================
        // CHILD PAGE
        // ===================================================

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

            ${inventoryImageHTML}

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
      }


      html += `
        </body>
        </html>
      `;


      const { uri } =
        await Print.printToFileAsync({
          html
        });


      await Sharing.shareAsync(
        uri
      );

    } catch (error) {

      console.error(
        "PDF export error:",
        error
      );

      Alert.alert(
        t.error ||
          "Error",

        t.pdfExportFailed ||
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
                String(
                  text ?? ""
                ),

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


      // =====================================================
      // TITLE
      // =====================================================

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


      // =====================================================
      // EACH CHILD
      // =====================================================

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


        // ===================================================
        // EXPENSES
        // ===================================================

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
          Number(
            person.money || 0
          ) -
          Number(
            totalExpenses || 0
          );


        // ===================================================
        // NAME
        // ===================================================

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


        // ===================================================
        // INFO
        // ===================================================

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


        // ===================================================
        // INVENTORY
        // ===================================================

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


        // ===================================================
        // INVENTORY IMAGE
        // ===================================================

        if (
          person.inventoryImageUri
        ) {

          try {

            const imageBase64 =
              await getImageBase64(
                person.inventoryImageUri
              );

            if (imageBase64) {

              const imageBytes =
                base64ToUint8Array(
                  imageBase64
                );

              children.push(

                new Paragraph({

                  alignment:
                    AlignmentType.CENTER,

                  children: [

                    new ImageRun({

                      data:
                        imageBytes,

                      transformation: {

                        width: 500,

                        height: 300

                      }

                    })

                  ]

                })

              );
            }

          } catch (error) {

            console.error(
              `Could not add inventory image for ${person.name}:`,
              error
            );

          }
        }


        // ===================================================
        // INVENTORY TABLE
        // ===================================================

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


        // ===================================================
        // EXPENSES
        // ===================================================

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


      // =====================================================
      // CREATE DOCX
      // =====================================================

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
        t.error ||
          "Error",

        t.docxExportFailed ||
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

      contentContainerStyle={
        styles.content
      }

      showsVerticalScrollIndicator={
        false
      }
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <Text style={styles.title}>
        {t.addPerson}
      </Text>

      <Text style={styles.subtitle}>
        {t.mentorDesc || ""}
      </Text>


      {/* =====================================================
          ADD PERSON
      ===================================================== */}

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


        {/* BIRTH DATE */}

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() =>
            setShowBirthPicker(true)
          }
        >

          <MaterialIcons
            name="calendar-today"
            size={20}
            color="#3498db"
          />

          <Text
            style={[
              styles.dateButtonText,
              !birthDate &&
                styles.placeholderText
            ]}
          >
            {birthDate ||
              t.birthDate}
          </Text>

        </TouchableOpacity>


        {showBirthPicker && (

          <DateTimePicker
            value={birthDateValue}
            mode="date"
            display={
              Platform.OS === "ios"
                ? "spinner"
                : "default"
            }
            maximumDate={
              new Date()
            }
            onChange={
              onBirthDateChange
            }
          />

        )}


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
          activeOpacity={0.8}
        >

          <MaterialIcons
            name="person-add"
            size={20}
            color="#fff"
          />

          <Text style={styles.buttonText}>
            {t.addPerson}
          </Text>

        </TouchableOpacity>

      </View>


      {/* =====================================================
          EDIT PERSON
      ===================================================== */}

      {editingPerson && (

        <View style={styles.formCard}>

          <View style={styles.sectionHeader}>

            <MaterialIcons
              name="edit"
              size={24}
              color="#3498db"
            />

            <Text style={styles.sectionTitle}>
              {t.editPerson ||
                "Edit Child"}
            </Text>

          </View>


          <Text style={styles.editingLabel}>
            {editingPerson.name}
          </Text>


          <TextInput
            placeholderTextColor="#999"
            placeholder={t.name}
            value={editName}
            onChangeText={setEditName}
            style={styles.input}
          />


          {/* EDIT BIRTH DATE */}

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() =>
              setShowEditBirthPicker(
                true
              )
            }
          >

            <MaterialIcons
              name="calendar-today"
              size={20}
              color="#3498db"
            />

            <Text
              style={[
                styles.dateButtonText,
                !editBirthDate &&
                  styles.placeholderText
              ]}
            >
              {editBirthDate ||
                t.birthDate}
            </Text>

          </TouchableOpacity>


          {showEditBirthPicker && (

            <DateTimePicker
              value={
                editBirthDateValue
              }
              mode="date"
              display={
                Platform.OS === "ios"
                  ? "spinner"
                  : "default"
              }
              maximumDate={
                new Date()
              }
              onChange={
                onEditBirthDateChange
              }
            />

          )}


          <TextInput
            placeholderTextColor="#999"
            placeholder={t.budget}
            value={editMoney}
            onChangeText={setEditMoney}
            keyboardType="numeric"
            style={styles.input}
          />


          <TextInput
            placeholderTextColor="#999"
            placeholder={t.parentPhone}
            value={editParentPhone}
            onChangeText={
              setEditParentPhone
            }
            keyboardType="phone-pad"
            style={styles.input}
          />


          <View style={styles.actionRow}>

            <TouchableOpacity
              onPress={cancelEdit}
              style={styles.cancelButton}
              activeOpacity={0.8}
            >

              <MaterialIcons
                name="close"
                size={20}
                color="#555"
              />

              <Text
                style={
                  styles.cancelButtonText
                }
              >
                {t.cancel ||
                  "Cancel"}
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              onPress={updatePerson}
              style={styles.blueButton}
              activeOpacity={0.8}
            >

              <MaterialIcons
                name="save"
                size={20}
                color="#fff"
              />

              <Text
                style={
                  styles.buttonText
                }
              >
                {t.save ||
                  "Save"}
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      )}


      {/* =====================================================
          EXPORT
      ===================================================== */}

      <View style={styles.actionRow}>

        <TouchableOpacity
          onPress={exportPDF}
          style={styles.greenButton}
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
          onPress={exportDOCX}
          style={styles.blueButton}
          activeOpacity={0.8}
        >

          <MaterialIcons
            name="description"
            size={20}
            color="#fff"
          />

          <Text style={styles.buttonText}>
            {t.exportDOCX ||
              "Export DOCX"}
          </Text>

        </TouchableOpacity>

      </View>


      {/* =====================================================
          PEOPLE
      ===================================================== */}

      <Text style={styles.sectionHeading}>
        {t.name}
      </Text>


      {people.length === 0 ? (

        <View style={styles.emptyState}>

          <MaterialIcons
            name="people-outline"
            size={45}
            color="#bbb"
          />

          <Text style={styles.emptyTitle}>
            {t.noPeople ||
              "No children yet"}
          </Text>

          <Text
            style={
              styles.emptyDescription
            }
          >
            {t.addPerson ||
              "Add a child above to get started."}
          </Text>

        </View>

      ) : (

        people.map(item => (

          <View
            key={item.id}
            style={styles.card}
          >

            {/* EDIT */}

            <TouchableOpacity
              onPress={() =>
                openEditPerson(item)
              }

              style={styles.edit}

              activeOpacity={0.7}
            >

              <MaterialIcons
                name="edit"
                size={21}
                color="#3498db"
              />

            </TouchableOpacity>


            {/* DELETE */}

            <TouchableOpacity
              onPress={() =>
                deletePerson(
                  item.id
                )
              }

              style={styles.delete}

              activeOpacity={0.7}
            >

              <MaterialIcons
                name="delete-outline"
                size={23}
                color="#e74c3c"
              />

            </TouchableOpacity>


            {/* PERSON */}

            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/personInventory?id=${item.id}`
                )
              }

              style={styles.personContent}

              activeOpacity={0.75}
            >

              <View
                style={
                  styles.personHeader
                }
              >

                <View
                  style={styles.avatar}
                >

                  <MaterialIcons
                    name="person"
                    size={25}
                    color="#3498db"
                  />

                </View>


                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  {item.name}
                </Text>

              </View>


              <View
                style={styles.infoRow}
              >

                <MaterialIcons
                  name="cake"
                  size={18}
                  color="#7f8c8d"
                />

                <Text
                  style={
                    styles.infoText
                  }
                >
                  {t.birthDate}:{" "}
                  {item.birthDate}
                </Text>

              </View>


              <View
                style={styles.infoRow}
              >

                <MaterialIcons
                  name="account-balance-wallet"
                  size={18}
                  color="#7f8c8d"
                />

                <Text
                  style={
                    styles.infoText
                  }
                >
                  {t.initialBudget}:{" "}
                  {item.money} DA
                </Text>

              </View>


              <View
                style={styles.infoRow}
              >

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
                      color:
                        getColor(
                          item.remaining,
                          item.money
                        ),

                      fontWeight:
                        "bold"
                    }
                  ]}
                >
                  {t.remaining}:{" "}
                  {item.remaining} DA
                </Text>

              </View>


              <View
                style={styles.infoRow}
              >

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


              <View
                style={
                  styles.inventoryLink
                }
              >

                <Text
                  style={
                    styles.inventoryLinkText
                  }
                >
                  {t.inventory ||
                    "Inventory"}
                </Text>

                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color="#3498db"
                />

              </View>

            </TouchableOpacity>

          </View>

        ))

      )}


      {/* =====================================================
          RESET
      ===================================================== */}

      <TouchableOpacity
        onPress={resetDB}
        style={styles.redButton}
        activeOpacity={0.8}
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
    marginBottom: 20,
    lineHeight: 20
  },

  formCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2
    },

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

  editingLabel: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "600",
    marginBottom: 12
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 11,
    marginBottom: 10,
    backgroundColor: "#fff",
    fontSize: 14
  },

  // =========================================================
  // DATE BUTTON
  // =========================================================

  dateButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 11,
    marginBottom: 10,
    backgroundColor: "#fff",

    flexDirection: "row",
    alignItems: "center",

    gap: 8
  },

  dateButtonText: {
    color: "#333",
    fontSize: 14
  },

  placeholderText: {
    color: "#999"
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2c3e50"
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

  cancelButton: {
    flex: 1,
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,

    flexDirection: "row",

    justifyContent: "center",
    alignItems: "center",

    gap: 7
  },

  cancelButtonText: {
    color: "#555",
    fontWeight: "bold"
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

    shadowOffset: {
      width: 0,
      height: 2
    },

    elevation: 2,

    position: "relative"
  },

  personContent: {
    paddingRight: 55
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
    fontSize: 14,
    flexShrink: 1
  },

  phone: {
    color: "#3498db",
    fontWeight: "bold",
    fontSize: 14
  },

  edit: {
    position: "absolute",
    top: 12,
    right: 45,

    zIndex: 2,

    width: 30,
    height: 30,

    alignItems: "center",
    justifyContent: "center"
  },

  delete: {
    position: "absolute",
    top: 12,
    right: 12,

    zIndex: 2,

    width: 30,
    height: 30,

    alignItems: "center",
    justifyContent: "center"
  },

  inventoryLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",

    marginTop: 8,
    paddingTop: 10,

    borderTopWidth: 1,
    borderTopColor: "#eee",

    gap: 5
  },

  inventoryLinkText: {
    color: "#3498db",
    fontSize: 13,
    fontWeight: "600"
  },

  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 12,

    padding: 30,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2
    },

    elevation: 2
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",

    marginTop: 10,
    marginBottom: 4
  },

  emptyDescription: {
    fontSize: 13,
    color: "#888",
    textAlign: "center"
  }

};