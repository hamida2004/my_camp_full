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

export default function Todo() {

  const { t } = useLanguage();

  const [todos, setTodos] = useState([]);

  const [text, setText] = useState("");

  // ID of the todo currently being edited
  const [editingId, setEditingId] = useState(null);


  // =========================================================
  // LOAD
  // =========================================================

  const load = () => {

    try {

      const result = db.getAllSync(
        `
        SELECT *
        FROM mentor_todos
        ORDER BY id DESC
        `
      );

      setTodos(result);

    } catch (error) {

      console.error(
        "Load todos error:",
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

    if (!text.trim()) {
      return;
    }

    try {

      db.runSync(
        `
        INSERT INTO mentor_todos
        (title, completed)
        VALUES (?, 0)
        `,
        [text.trim()]
      );

      setText("");

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Add todo error:",
        error
      );

    }

  };


  // =========================================================
  // START EDIT
  // =========================================================

  const edit = (todo) => {

    setEditingId(
      todo.id
    );

    setText(
      todo.title
    );

  };


  // =========================================================
  // UPDATE
  // =========================================================

  const update = () => {

    if (!text.trim()) {
      return;
    }

    if (!editingId) {
      return;
    }

    try {

      db.runSync(
        `
        UPDATE mentor_todos
        SET title=?
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
        "Update todo error:",
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
  // TOGGLE
  // =========================================================

  const toggle = (
    id,
    done
  ) => {

    try {

      db.runSync(
        `
        UPDATE mentor_todos
        SET completed=?
        WHERE id=?
        `,
        [
          done ? 0 : 1,
          id
        ]
      );

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Toggle todo error:",
        error
      );

    }

  };


  // =========================================================
  // DELETE TODO
  // =========================================================

  const remove = (id) => {

    Alert.alert(

      t.delete ||
        "Delete",

      t.confirm ||
        "Are you sure you want to delete this task?",

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
                DELETE FROM mentor_todos
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
                "Delete todo error:",
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
        "Are you sure you want to clear all tasks?",

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
              "DELETE FROM mentor_todos"
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
  // CLEAR DONE
  // =========================================================

  const clearDone = () => {

    Alert.alert(

      t.clearDone ||
        "Clear Done",

      t.resetConfirm ||
        "Are you sure you want to remove completed tasks?",

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
              `
              DELETE FROM mentor_todos
              WHERE completed=1
              `
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

      showsVerticalScrollIndicator={false}
    >

      <Text
        style={styles.pageTitle}
      >
        {t.todoList ||
          "ToDo List"}
      </Text>


      {/* =====================================================
          ADD / EDIT CARD
      ===================================================== */}

      <View
        style={styles.card}
      >

        <Text
          style={styles.title}
        >
          {editingId
            ? (
              t.editTask ||
              "Edit Task"
            )
            : (
              t.task ||
              "Task"
            )}
        </Text>


        <TextInput

          placeholderTextColor="#999"

          placeholder={
            t.task ||
            "Task"
          }

          value={
            text
          }

          onChangeText={
            setText
          }

          style={
            styles.input
          }
        />


        <View
          style={styles.formButtons}
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

              onPress={
                cancelEdit
              }

              style={
                styles.cancelButton
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
          ACTIONS
      ===================================================== */}

      <View
        style={styles.actions}
      >

        <TouchableOpacity
          style={
            styles.secondaryButton
          }
          onPress={
            clearDone
          }
        >

          <Text>
            {t.clearDone ||
              "Clear Done"}
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          style={
            styles.dangerButton
          }
          onPress={
            clearAll
          }
        >

          <Text
            style={{
              color: "#fff"
            }}
          >
            {t.clearAll ||
              "Clear All"}
          </Text>

        </TouchableOpacity>

      </View>


      {/* =====================================================
          LIST
      ===================================================== */}

      {todos.map(todo => (

        <View
          key={todo.id}
          style={styles.card}
        >

          <TouchableOpacity
            onPress={() =>
              toggle(
                todo.id,
                todo.completed
              )
            }

            style={
              styles.todoContent
            }
          >

            <MaterialIcons

              name={
                todo.completed
                  ? "check-circle"
                  : "radio-button-unchecked"
              }

              size={22}

              color={
                todo.completed
                  ? "#2ecc71"
                  : "#999"
              }

              style={{
                marginRight: 10
              }}
            />


            <Text
              style={{
                flex: 1,

                textDecorationLine:
                  todo.completed
                    ? "line-through"
                    : "none",

                color:
                  todo.completed
                    ? "#888"
                    : "#000"
              }}
            >
              {todo.title}
            </Text>

          </TouchableOpacity>


          {/* ACTIONS */}

          <View
            style={
              styles.todoActions
            }
          >

            <TouchableOpacity
              onPress={() =>
                edit(todo)
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
                remove(todo.id)
              }

              style={
                styles.iconButton
              }
            >

              <MaterialIcons
                name="delete-outline"
                size={21}
                color="#e74c3c"
              />

            </TouchableOpacity>

          </View>

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
    marginBottom: 12,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

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

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15
  },

  secondaryButton: {
    padding: 10,
    backgroundColor: "#ecf0f1",
    borderRadius: 8
  },

  dangerButton: {
    padding: 10,
    backgroundColor: "#e74c3c",
    borderRadius: 8
  },

  todoContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },

  todoActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 5
  },

  iconButton: {
    width: 36,
    height: 36,

    borderRadius: 8,

    backgroundColor: "#f7f7f7",

    alignItems: "center",
    justifyContent: "center"
  }

};