import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from "react-native";

import { useState, useEffect } from "react";

import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";

import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { useLanguage } from "../../../../context/languageContext";

export default function Remarks() {

  const { t } = useLanguage();

  const [notes, setNotes] = useState([]);

  const [text, setText] = useState("");

  // Current note being edited
  const [editingId, setEditingId] = useState(null);


  // =========================================================
  // LOAD
  // =========================================================

  const load = () => {

    try {

      const result = db.getAllSync(
        `
        SELECT *
        FROM mentor_notes
        ORDER BY id DESC
        `
      );

      setNotes(result);

    } catch (error) {

      console.error(
        "Load notes error:",
        error
      );

    }

  };


  // =========================================================
  // EFFECT
  // =========================================================

  useEffect(() => {

    load();

    const listener = () => load();

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
  // ADD NOTE
  // =========================================================

  const addNote = () => {

    if (!text.trim()) {
      return;
    }

    try {

      db.runSync(
        `
        INSERT INTO mentor_notes
        (content, date)
        VALUES (?, ?)
        `,
        [
          text.trim(),
          new Date().toLocaleString()
        ]
      );

      setText("");

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Add note error:",
        error
      );

    }

  };


  // =========================================================
  // START EDIT
  // =========================================================

  const editNote = (note) => {

    setEditingId(
      note.id
    );

    setText(
      note.content
    );

  };


  // =========================================================
  // UPDATE NOTE
  // =========================================================

  const updateNote = () => {

    if (!text.trim()) {
      return;
    }

    if (!editingId) {
      return;
    }

    try {

      db.runSync(
        `
        UPDATE mentor_notes
        SET content=?
        WHERE id=?
        `,
        [
          text.trim(),
          editingId
        ]
      );

      setText("");

      setEditingId(null);

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Update note error:",
        error
      );

    }

  };


  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const cancelEdit = () => {

    setEditingId(null);

    setText("");

  };


  // =========================================================
  // DELETE NOTE
  // =========================================================

  const deleteNote = (id) => {

    Alert.alert(

      t.delete ||
        "Delete",

      t.confirm ||
        "Are you sure you want to delete this note?",

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
                `
                DELETE FROM mentor_notes
                WHERE id=?
                `,
                [id]
              );

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
                "Delete note error:",
                error
              );

            }

          }

        }

      ]

    );

  };


  // =========================================================
  // CLEAR ALL
  // =========================================================

  const clearAll = () => {

    Alert.alert(

      t.clearAll ||
        "Clear All",

      t.resetConfirm ||
        "Are you sure you want to delete all notes?",

      [

        {
          text:
            t.cancel ||
            "Cancel",

          style: "cancel"
        },

        {

          text:
            t.yes ||
            "Yes",

          style: "destructive",

          onPress: () => {

            db.runSync(
              "DELETE FROM mentor_notes"
            );

            cancelEdit();

            dbEvents.emit(
              "dbUpdated"
            );

          }

        }

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

      <Text
        style={
          styles.pageTitle
        }
      >
        {t.remark}
      </Text>


      {/* =====================================================
          ADD / EDIT
      ===================================================== */}

      <View
        style={
          styles.card
        }
      >

        <TextInput

          placeholderTextColor="#999"

          placeholder={
            editingId
              ? (
                t.editRemark ||
                "Edit Remark"
              )
              : (
                t.addRemark ||
                "Add Remark"
              )
          }

          value={
            text
          }

          onChangeText={
            setText
          }

          multiline

          style={
            styles.input
          }
        />


        <View
          style={
            styles.formButtons
          }
        >

          <TouchableOpacity

            style={
              styles.button
            }

            onPress={
              editingId
                ? updateNote
                : addNote
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
                styles.buttonText
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


          {editingId && (

            <TouchableOpacity

              style={
                styles.cancelButton
              }

              onPress={
                cancelEdit
              }
            >

              <MaterialIcons
                name="close"
                size={20}
                color="#555"
              />

              <Text
                style={
                  styles.cancelText
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
          CLEAR ALL
      ===================================================== */}

      <TouchableOpacity
        onPress={
          clearAll
        }

        style={
          styles.clearBtn
        }
      >

        <Text
          style={
            styles.clearText
          }
        >
          {t.clearAll ||
            "Clear All"}
        </Text>

      </TouchableOpacity>


      {/* =====================================================
          LIST
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
      >

        {notes.map(item => (

          <View
            key={item.id}
            style={styles.card}
          >

            <View
              style={
                styles.noteActions
              }
            >

              {/* EDIT */}

              <TouchableOpacity
                onPress={() =>
                  editNote(item)
                }

                style={
                  styles.iconButton
                }
              >

                <MaterialIcons
                  name="edit"
                  size={20}
                  color="#3498db"
                />

              </TouchableOpacity>


              {/* DELETE */}

              <TouchableOpacity
                onPress={() =>
                  deleteNote(item.id)
                }

                style={
                  styles.iconButton
                }
              >

                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color="#e74c3c"
                />

              </TouchableOpacity>

            </View>


            <Text
              style={{
                marginBottom: 5,
                paddingRight: 70
              }}
            >
              {item.content}
            </Text>


            <Text
              style={
                styles.date
              }
            >
              {item.date}
            </Text>

          </View>

        ))}

      </ScrollView>

    </View>

  );

}


// ===========================================================
// STYLES
// ===========================================================

const styles = {

  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 20,
    paddingVertical: 60
  },

  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    minHeight: 45
  },

  formButtons: {
    flexDirection: "row",
    gap: 10
  },

  button: {
    flex: 1,

    backgroundColor: "#3498db",

    padding: 12,

    borderRadius: 8,

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",

    gap: 6
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold"
  },

  cancelButton: {
    flex: 1,

    backgroundColor: "#ecf0f1",

    padding: 12,

    borderRadius: 8,

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",

    gap: 6
  },

  cancelText: {
    color: "#555",
    fontWeight: "bold"
  },

  formButton: {
    flexDirection: "row",
    alignItems: "center"
  },

  clearBtn: {
    alignSelf: "flex-end",
    marginBottom: 10
  },

  clearText: {
    color: "#e74c3c",
    fontWeight: "bold"
  },

  noteActions: {
    position: "absolute",
    top: 10,
    right: 10,

    flexDirection: "row",
    gap: 5
  },

  iconButton: {
    width: 34,
    height: 34,

    borderRadius: 8,

    backgroundColor: "#f7f7f7",

    alignItems: "center",
    justifyContent: "center"
  },

  date: {
    color: "#888",
    fontSize: 12
  }

};