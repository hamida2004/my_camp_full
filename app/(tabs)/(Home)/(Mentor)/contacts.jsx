import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Linking,
  Alert,
} from "react-native";

import { useState, useEffect } from "react";

import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";

import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { useLanguage } from "../../../../context/languageContext";

export default function Contacts() {

  const { t } = useLanguage();

  // =========================================================
  // STATE
  // =========================================================

  const [list, setList] = useState([]);

  const [name, setName] = useState("");

  const [phone, setPhone] = useState("");

  // ID of the contact currently being edited
  const [editingId, setEditingId] = useState(null);


  // =========================================================
  // DEFAULT CONTACTS
  // =========================================================

  const insertDefaults = () => {

    db.execSync(`
      INSERT OR IGNORE INTO important_contacts
      (id, name, phone)
      VALUES
        (1, 'Police', '1548'),
        (2, 'Firefighters', '14'),
        (3, 'Gendarmerie', '1155'),
        (4, 'Civil Protection', '14');
    `);

  };


  // =========================================================
  // LOAD CONTACTS
  // =========================================================

  const load = () => {

    try {

      insertDefaults();

      const contacts =
        db.getAllSync(
          `
          SELECT *
          FROM important_contacts
          ORDER BY id ASC
          `
        );

      setList(contacts);

    } catch (error) {

      console.error(
        "Load contacts error:",
        error
      );

    }

  };


  // =========================================================
  // INITIAL LOAD + AUTO REFRESH
  // =========================================================

  useEffect(() => {

    load();

    const listener = () => {
      load();
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
  // ADD CONTACT
  // =========================================================

  const add = () => {

    if (
      !name.trim() ||
      !phone.trim()
    ) {

      Alert.alert(
        t.error || "Error",
        t.fillAllFields ||
          "Please fill in all fields."
      );

      return;
    }


    try {

      db.runSync(
        `
        INSERT INTO important_contacts
        (name, phone)
        VALUES (?, ?)
        `,
        [
          name.trim(),
          phone.trim()
        ]
      );


      // Clear form
      setName("");

      setPhone("");

      setEditingId(null);


      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Add contact error:",
        error
      );

      Alert.alert(
        t.error || "Error",
        t.addFailed ||
          "Could not add the contact."
      );

    }

  };


  // =========================================================
  // START EDITING
  // =========================================================

  const edit = (contact) => {

    setEditingId(
      contact.id
    );

    setName(
      contact.name
    );

    setPhone(
      contact.phone
    );

  };


  // =========================================================
  // UPDATE CONTACT
  // =========================================================

  const update = () => {

    if (
      !name.trim() ||
      !phone.trim()
    ) {

      Alert.alert(
        t.error || "Error",
        t.fillAllFields ||
          "Please fill in all fields."
      );

      return;
    }


    if (!editingId) {
      return;
    }


    try {

      db.runSync(
        `
        UPDATE important_contacts

        SET
          name = ?,
          phone = ?

        WHERE id = ?
        `,
        [
          name.trim(),
          phone.trim(),
          editingId
        ]
      );


      // Clear form
      setName("");

      setPhone("");

      setEditingId(null);


      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Update contact error:",
        error
      );

      Alert.alert(
        t.error || "Error",
        t.updateFailed ||
          "Could not update the contact."
      );

    }

  };


  // =========================================================
  // CANCEL EDITING
  // =========================================================

  const cancelEdit = () => {

    setEditingId(null);

    setName("");

    setPhone("");

  };


  // =========================================================
  // DELETE CONTACT
  // =========================================================

  const remove = (id) => {

    Alert.alert(

      t.delete || "Delete",

      t.confirmDelete ||
        "Are you sure you want to delete this contact?",

      [

        {
          text:
            t.cancel ||
            "Cancel",

          style: "cancel",
        },

        {

          text:
            t.delete ||
            "Delete",

          style: "destructive",

          onPress: () => {

            try {

              db.runSync(
                `
                DELETE FROM important_contacts
                WHERE id = ?
                `,
                [id]
              );


              // If the deleted contact
              // was currently being edited
              if (
                editingId === id
              ) {

                cancelEdit();

              }


              dbEvents.emit(
                "dbUpdated"
              );

            } catch (error) {

              console.error(
                "Delete contact error:",
                error
              );

            }

          },

        },

      ]

    );

  };


  // =========================================================
  // UI
  // =========================================================

  return (

    <View
      style={
        styles.container
      }
    >

      {/* =====================================================
          ADD / EDIT FORM
      ===================================================== */}

      <View
        style={
          styles.card
        }
      >

        <Text
          style={
            styles.title
          }
        >
          {editingId
            ? (
              t.editContact ||
              "Edit Contact"
            )
            : (
              t.addContact ||
              "Add Contact"
            )}
        </Text>


        {/* NAME */}

        <TextInput
          placeholderTextColor="#999"

          placeholder={
            t.name ||
            "Name"
          }

          value={
            name
          }

          onChangeText={
            setName
          }

          style={
            styles.input
          }
        />


        {/* PHONE */}

        <TextInput
          placeholderTextColor="#999"

          placeholder={
            t.phone ||
            "Phone"
          }

          value={
            phone
          }

          onChangeText={
            setPhone
          }

          keyboardType="phone-pad"

          style={
            styles.input
          }
        />


        {/* BUTTONS */}

        <View
          style={
            styles.formButtons
          }
        >

          <TouchableOpacity
            onPress={
              editingId
                ? update
                : add
            }

            style={
              styles.button
            }

            activeOpacity={
              0.8
            }
          >

            <MaterialIcons
              name={
                editingId
                  ? "save"
                  : "add"
              }

              size={20}

              color="#fff"
            />

            <Text
              style={
                styles.btnText
              }
            >
              {editingId
                ? (
                  t.update ||
                  "Update"
                )
                : (
                  t.add ||
                  "Add"
                )}
            </Text>

          </TouchableOpacity>


          {/* CANCEL EDIT */}

          {editingId && (

            <TouchableOpacity
              onPress={
                cancelEdit
              }

              style={
                styles.cancelButton
              }

              activeOpacity={
                0.8
              }
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

          )}

        </View>

      </View>


      {/* =====================================================
          CONTACT LIST
      ===================================================== */}

      <FlatList

        data={
          list
        }

        keyExtractor={
          item =>
            item.id.toString()
        }

        showsVerticalScrollIndicator={
          false
        }

        renderItem={({
          item
        }) => (

          <View
            style={
              styles.cardRow
            }
          >

            {/* ---------------------------------------------
                CONTACT INFORMATION
            --------------------------------------------- */}

            <TouchableOpacity
              style={
                styles.contactInfo
              }

              onPress={() =>
                Linking.openURL(
                  `tel:${item.phone}`
                )
              }

              activeOpacity={
                0.7
              }
            >

              <View
                style={
                  styles.contactIcon
                }
              >

                <MaterialIcons
                  name="phone"
                  size={21}
                  color="#3498db"
                />

              </View>


              <View
                style={
                  styles.contactText
                }
              >

                <Text
                  style={
                    styles.contactName
                  }
                >
                  {item.name}
                </Text>

                <Text
                  style={
                    styles.contactPhone
                  }
                >
                  {item.phone}
                </Text>

              </View>

            </TouchableOpacity>


            {/* ---------------------------------------------
                ACTIONS
            --------------------------------------------- */}

            <View
              style={
                styles.actions
              }
            >

              {/* EDIT */}

              <TouchableOpacity
                onPress={() =>
                  edit(item)
                }

                style={
                  styles.actionButton
                }

                activeOpacity={
                  0.7
                }
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
                  remove(item.id)
                }

                style={
                  styles.actionButton
                }

                activeOpacity={
                  0.7
                }
              >

                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color="#e74c3c"
                />

              </TouchableOpacity>

            </View>

          </View>

        )}
      />

    </View>

  );

}


// ===========================================================
// STYLES
// ===========================================================

const styles = {

  container: {
    flex: 1,
    padding: 20,
    paddingVertical: 60,
    backgroundColor: "#f9f9f9",
  },


  // =========================================================
  // FORM
  // =========================================================

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },


  title: {
    fontWeight: "bold",
    fontSize: 17,
    marginBottom: 12,
    color: "#2c3e50",
  },


  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    color: "#333",
  },


  formButtons: {
    flexDirection: "row",
    gap: 10,
  },


  button: {
    flex: 1,

    backgroundColor: "#3498db",

    padding: 12,

    borderRadius: 8,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 6,
  },


  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },


  cancelButton: {
    flex: 1,

    backgroundColor: "#eee",

    padding: 12,

    borderRadius: 8,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 6,
  },


  cancelButtonText: {
    color: "#555",
    fontWeight: "bold",
  },


  // =========================================================
  // CONTACT ROW
  // =========================================================

  cardRow: {
    flexDirection: "row",

    alignItems: "center",

    padding: 15,

    backgroundColor: "#fff",

    marginBottom: 10,

    borderRadius: 10,
  },


  contactInfo: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",
  },


  contactIcon: {
    width: 40,
    height: 40,

    borderRadius: 20,

    backgroundColor: "#eef7fd",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },


  contactText: {
    flex: 1,
  },


  contactName: {
    fontWeight: "bold",
    color: "#2c3e50",
    fontSize: 15,
  },


  contactPhone: {
    color: "#666",
    marginTop: 3,
  },


  // =========================================================
  // ACTIONS
  // =========================================================

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },


  actionButton: {
    width: 38,
    height: 38,

    borderRadius: 8,

    backgroundColor: "#f7f7f7",

    alignItems: "center",
    justifyContent: "center",
  },

};