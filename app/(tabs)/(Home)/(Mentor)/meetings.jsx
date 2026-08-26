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

export default function Meetings() {

  const { t } = useLanguage();

  const [title, setTitle] = useState("");

  const [content, setContent] = useState("");

  const [list, setList] = useState([]);

  // Meeting currently being edited
  const [editingId, setEditingId] = useState(null);


  // =========================================================
  // LOAD
  // =========================================================

  const load = () => {

    try {

      setList(
        db.getAllSync(
          `
          SELECT *
          FROM mentor_meetings
          ORDER BY id DESC
          `
        )
      );

    } catch (error) {

      console.error(
        "Load meetings error:",
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
  // ADD
  // =========================================================

  const add = () => {

    if (
      !title.trim() ||
      !content.trim()
    ) {
      return;
    }

    try {

      db.runSync(
        `
        INSERT INTO mentor_meetings
        (title, content, date)
        VALUES (?, ?, ?)
        `,
        [
          title.trim(),
          content.trim(),
          new Date().toLocaleString()
        ]
      );

      setTitle("");

      setContent("");

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Add meeting error:",
        error
      );

    }

  };


  // =========================================================
  // START EDIT
  // =========================================================

  const edit = (meeting) => {

    setEditingId(
      meeting.id
    );

    setTitle(
      meeting.title
    );

    setContent(
      meeting.content
    );

  };


  // =========================================================
  // UPDATE
  // =========================================================

  const update = () => {

    if (
      !title.trim() ||
      !content.trim()
    ) {
      return;
    }

    if (!editingId) {
      return;
    }

    try {

      db.runSync(
        `
        UPDATE mentor_meetings

        SET
          title=?,
          content=?

        WHERE id=?
        `,
        [
          title.trim(),
          content.trim(),
          editingId
        ]
      );

      setTitle("");

      setContent("");

      setEditingId(null);

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Update meeting error:",
        error
      );

    }

  };


  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const cancelEdit = () => {

    setEditingId(null);

    setTitle("");

    setContent("");

  };


  // =========================================================
  // DELETE
  // =========================================================

  const remove = (id) => {

    Alert.alert(

      t.delete ||
        "Delete",

      t.confirm ||
        "Are you sure you want to delete this meeting?",

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
                DELETE FROM mentor_meetings
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
                "Delete meeting error:",
                error
              );

            }

          }

        }

      ]

    );

  };


  // =========================================================
  // UI
  // =========================================================

  return (

    <ScrollView

      style={{
        flex: 1,
        backgroundColor: "#f9f9f9",
        paddingVertical: 60
      }}

      contentContainerStyle={{
        padding: 20,
        paddingBottom: 60
      }}

      showsVerticalScrollIndicator={
        false
      }
    >

      <Text
        style={
          styles.pageTitle
        }
      >
        {t.meetings}
      </Text>


      {/* =====================================================
          ADD / EDIT MEETING
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
              t.editMeeting ||
              "Edit Meeting"
            )
            : (
              t.meetings
            )}
        </Text>


        {/* TITLE */}

        <TextInput

          placeholderTextColor="#999"

          placeholder={
            t.meetingTitle ||
            "Meeting title"
          }

          value={
            title
          }

          onChangeText={
            setTitle
          }

          style={
            styles.input
          }
        />


        {/* CONTENT */}

        <TextInput

          placeholderTextColor="#999"

          placeholder={
            t.meetingContent ||
            "Meeting content"
          }

          value={
            content
          }

          onChangeText={
            setContent
          }

          multiline

          style={[
            styles.input,
            {
              height: 80
            }
          ]}
        />


        {/* BUTTONS */}

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
                ? update
                : add
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
          LIST
      ===================================================== */}

      {list.map(item => (

        <View
          key={item.id}
          style={
            styles.card
          }
        >

          <View
            style={
              styles.row
            }
          >

            <Text
              style={
                styles.meetingTitle
              }
            >
              {item.title}
            </Text>


            {/* ACTIONS */}

            <View
              style={
                styles.actions
              }
            >

              <TouchableOpacity
                onPress={() =>
                  edit(item)
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


              <TouchableOpacity
                onPress={() =>
                  remove(item.id)
                }

                style={
                  styles.iconButton
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


          <Text
            style={
              styles.content
            }
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

  );

}


// ===========================================================
// STYLES
// ===========================================================

const styles = {

  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2
  },

  title: {
    fontWeight: "bold",
    marginBottom: 10
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff"
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

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },

  meetingTitle: {
    fontWeight: "bold",
    fontSize: 16,
    flex: 1,
    marginRight: 10
  },

  actions: {
    flexDirection: "row",
    gap: 5
  },

  iconButton: {
    width: 36,
    height: 36,

    borderRadius: 8,

    backgroundColor: "#f7f7f7",

    alignItems: "center",
    justifyContent: "center"
  },

  content: {
    marginTop: 8,
    color: "#444"
  },

  date: {
    marginTop: 8,
    fontSize: 12,
    color: "#888"
  }

};