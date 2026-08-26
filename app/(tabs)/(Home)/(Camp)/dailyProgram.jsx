import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert
} from "react-native";

import { useState, useEffect } from "react";

import * as ImagePicker from "expo-image-picker";

import DateTimePicker from "@react-native-community/datetimepicker";

import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";


export default function DailyProgram() {

  const { t } = useLanguage();

  const [list, setList] = useState([]);

  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");

  const [image, setImage] = useState(null);

  // Time picker
  const [selectedTime, setSelectedTime] =
    useState(new Date());

  const [showTimePicker, setShowTimePicker] =
    useState(false);

  // Editing
  const [editingId, setEditingId] =
    useState(null);


  // =========================================================
  // LOAD DATA
  // =========================================================

  const load = () => {

    const programs = db.getAllSync(
      `
      SELECT *
      FROM daily_program
      WHERE time IS NOT NULL
      AND activity IS NOT NULL
      ORDER BY time ASC, id ASC
      `
    );

    setList(programs);


    const img = db.getFirstSync(
      `
      SELECT imageUri
      FROM daily_program
      WHERE imageUri IS NOT NULL
      LIMIT 1
      `
    );

    if (img) {
      setImage(img.imageUri);
    } else {
      setImage(null);
    }
  };


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
  // FORMAT TIME
  // =========================================================

  const formatTime = (date) => {

    const hours =
      String(
        date.getHours()
      ).padStart(2, "0");

    const minutes =
      String(
        date.getMinutes()
      ).padStart(2, "0");

    return `${hours}:${minutes}`;
  };


  // =========================================================
  // PARSE TIME
  // =========================================================

  const parseTime = (timeString) => {

    const date = new Date();

    if (!timeString) {
      return date;
    }

    const parts =
      timeString.split(":");

    if (parts.length >= 2) {

      const hours =
        parseInt(parts[0], 10);

      const minutes =
        parseInt(parts[1], 10);

      if (
        !isNaN(hours) &&
        !isNaN(minutes)
      ) {

        date.setHours(
          hours,
          minutes,
          0,
          0
        );
      }
    }

    return date;
  };


  // =========================================================
  // TIME PICKER
  // =========================================================

  const openTimePicker = () => {

    if (time) {

      setSelectedTime(
        parseTime(time)
      );

    }

    setShowTimePicker(true);
  };


  const onTimeChange = (
    event,
    date
  ) => {

    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }

    if (!date) {
      return;
    }

    setSelectedTime(date);

    setTime(
      formatTime(date)
    );
  };


  // =========================================================
  // ADD ACTIVITY
  // =========================================================

  const add = () => {

    const cleanTime =
      time.trim();

    const cleanActivity =
      activity.trim();


    if (
      !cleanTime ||
      !cleanActivity
    ) {

      Alert.alert(
        t.required ||
          "Required",
        t.fillAllFields ||
          "Please fill all fields."
      );

      return;
    }


    db.runSync(
      `
      INSERT INTO daily_program
      (
        time,
        activity
      )
      VALUES (?, ?)
      `,
      [
        cleanTime,
        cleanActivity
      ]
    );


    setTime("");
    setActivity("");

    dbEvents.emit(
      "dbUpdated"
    );
  };


  // =========================================================
  // START EDIT
  // =========================================================

  const startEdit = (item) => {

    setEditingId(item.id);

    setTime(
      item.time || ""
    );

    setActivity(
      item.activity || ""
    );

    setSelectedTime(
      parseTime(item.time)
    );
  };


  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const cancelEdit = () => {

    setEditingId(null);

    setTime("");
    setActivity("");

    setSelectedTime(
      new Date()
    );
  };


  // =========================================================
  // UPDATE ACTIVITY
  // =========================================================

  const update = () => {

    const cleanTime =
      time.trim();

    const cleanActivity =
      activity.trim();


    if (
      !editingId
    ) {
      return;
    }


    if (
      !cleanTime ||
      !cleanActivity
    ) {

      Alert.alert(
        t.required ||
          "Required",
        t.fillAllFields ||
          "Please fill all fields."
      );

      return;
    }


    db.runSync(
      `
      UPDATE daily_program
      SET
        time=?,
        activity=?
      WHERE id=?
      `,
      [
        cleanTime,
        cleanActivity,
        editingId
      ]
    );


    cancelEdit();

    dbEvents.emit(
      "dbUpdated"
    );
  };


  // =========================================================
  // DELETE ACTIVITY
  // =========================================================

  const removeActivity = (id) => {

    Alert.alert(
      t.delete ||
        "Delete",
      t.deleteConfirm ||
        "Are you sure you want to delete this activity?",
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

            db.runSync(
              `
              DELETE FROM daily_program
              WHERE id=?
              `,
              [id]
            );

            if (editingId === id) {
              cancelEdit();
            }

            dbEvents.emit(
              "dbUpdated"
            );
          }
        }
      ]
    );
  };


  // =========================================================
  // TAKE PHOTO
  // =========================================================

  const takePhoto = async () => {

    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {

      Alert.alert(
        t.permissionRequired ||
          "Permission required",
        t.cameraPermission ||
          "Camera permission is required."
      );

      return;
    }


    const res =
      await ImagePicker.launchCameraAsync({
        quality: 1
      });


    if (!res.canceled) {

      const uri =
        res.assets[0].uri;

      /*
       * Delete only the old image record.
       * Program activities remain untouched.
       */

      db.runSync(
        `
        DELETE FROM daily_program
        WHERE imageUri IS NOT NULL
        `
      );


      db.runSync(
        `
        INSERT INTO daily_program
        (imageUri)
        VALUES (?)
        `,
        [uri]
      );


      dbEvents.emit(
        "dbUpdated"
      );
    }
  };


  // =========================================================
  // PICK IMAGE
  // =========================================================

  const pickImage = async () => {

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {

      Alert.alert(
        t.permissionRequired ||
          "Permission required",
        t.galleryPermission ||
          "Gallery permission is required."
      );

      return;
    }


    const res =
      await ImagePicker.launchImageLibraryAsync({
        quality: 1
      });


    if (!res.canceled) {

      const uri =
        res.assets[0].uri;


      db.runSync(
        `
        DELETE FROM daily_program
        WHERE imageUri IS NOT NULL
        `
      );


      db.runSync(
        `
        INSERT INTO daily_program
        (imageUri)
        VALUES (?)
        `,
        [uri]
      );


      dbEvents.emit(
        "dbUpdated"
      );
    }
  };


  // =========================================================
  // REMOVE IMAGE
  // =========================================================

  const removeImage = () => {

    db.runSync(
      `
      DELETE FROM daily_program
      WHERE imageUri IS NOT NULL
      `
    );

    setImage(null);

    dbEvents.emit(
      "dbUpdated"
    );
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

      {/* =====================================================
          HEADER
      ===================================================== */}

      <Text style={styles.pageTitle}>
        {t.dailyProgram ||
          "Daily Program"}
      </Text>

      <Text style={styles.pageDescription}>
        {t.dailyProgramDescription ||
          "Manage the activities planned for the day."}
      </Text>


      {/* =====================================================
          IMAGE
      ===================================================== */}

      {image ? (

        <View style={styles.card}>

          <Image
            source={{
              uri: image
            }}
            style={styles.image}
            resizeMode="contain"
          />


          <View style={styles.imageButtons}>

            <TouchableOpacity
              style={[
                styles.button,
                styles.flexButton
              ]}
              onPress={takePhoto}
            >

              <Text style={styles.btnText}>
                {t.takePhoto ||
                  "Change Photo"}
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={[
                styles.redButton,
                styles.flexButton
              ]}
              onPress={removeImage}
            >

              <Text style={styles.btnText}>
                {t.removeImage ||
                  "Remove Image"}
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      ) : (

        <View style={styles.card}>

          <TouchableOpacity
            style={styles.button}
            onPress={takePhoto}
          >

            <Text style={styles.btnText}>
              {t.takePhoto ||
                "Take Photo"}
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            style={styles.button}
            onPress={pickImage}
          >

            <Text style={styles.btnText}>
              {t.importFromGallery ||
                "Import From Gallery"}
            </Text>

          </TouchableOpacity>

        </View>
      )}


      {/* =====================================================
          ADD / EDIT FORM
      ===================================================== */}

      <View style={styles.card}>

        <Text style={styles.cardTitle}>

          {editingId
            ? (
              t.edit ||
              "Edit Activity"
            )
            : (
              t.add ||
              "Add Activity"
            )}

        </Text>


        {/* TIME */}

        <TouchableOpacity
          style={styles.input}
          onPress={openTimePicker}
        >

          <Text
            style={{
              color:
                time
                  ? "#222"
                  : "#999"
            }}
          >
            {time ||
              t.time ||
              "Select time"}
          </Text>

        </TouchableOpacity>


        {showTimePicker && (

          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={
              Platform.OS === "ios"
                ? "spinner"
                : "default"
            }
            onChange={onTimeChange}
          />

        )}


        {/* ACTIVITY */}

        <TextInput
          placeholderTextColor="#999"
          placeholder={
            t.activity ||
            "Activity"
          }
          value={activity}
          onChangeText={setActivity}
          style={styles.input}
        />


        {/* BUTTONS */}

        {editingId ? (

          <View style={styles.editButtons}>

            <TouchableOpacity
              style={[
                styles.button,
                styles.flexButton
              ]}
              onPress={update}
            >

              <Text style={styles.btnText}>
                {t.save ||
                  "Save"}
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={[
                styles.cancelButton,
                styles.flexButton
              ]}
              onPress={cancelEdit}
            >

              <Text style={styles.cancelButtonText}>
                {t.cancel ||
                  "Cancel"}
              </Text>

            </TouchableOpacity>

          </View>

        ) : (

          <TouchableOpacity
            style={styles.button}
            onPress={add}
          >

            <Text style={styles.btnText}>
              {t.add}
            </Text>

          </TouchableOpacity>

        )}

      </View>


      {/* =====================================================
          ACTIVITIES
      ===================================================== */}

      <Text style={styles.sectionTitle}>
        {t.activities ||
          t.activity ||
          "Activities"}
      </Text>


      {list.length === 0 ? (

        <View style={styles.emptyCard}>

          <Text style={styles.emptyText}>
            {t.noActivities ||
              "No activities added yet."}
          </Text>

        </View>

      ) : (

        list.map(item => (

          <View
            key={item.id}
            style={styles.row}
          >

            <View style={styles.timeContainer}>

              <Text style={styles.timeText}>
                {item.time}
              </Text>

            </View>


            <View style={styles.activityContainer}>

              <Text style={styles.activityText}>
                {item.activity}
              </Text>

            </View>


            {/* EDIT */}

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() =>
                startEdit(item)
              }
            >

              <Text style={styles.editText}>
                {t.edit ||
                  "Edit"}
              </Text>

            </TouchableOpacity>


            {/* DELETE */}

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() =>
                removeActivity(item.id)
              }
            >

              <Text style={styles.deleteText}>
                ×
              </Text>

            </TouchableOpacity>

          </View>

        ))

      )}

    </ScrollView>
  );
}


// =============================================================
// STYLES
// =============================================================

const styles = {

  container: {
    flex: 1,
    backgroundColor: "#f9f9f9"
  },

  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 6
  },

  pageDescription: {
    color: "#777",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    elevation: 2
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 12
  },

  image: {
    width: "100%",
    height: 400,
    borderRadius: 12,
    marginBottom: 12
  },

  imageButtons: {
    flexDirection: "row",
    gap: 10
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 11,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff"
  },

  button: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10
  },

  redButton: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10
  },

  flexButton: {
    flex: 1
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold"
  },

  editButtons: {
    flexDirection: "row",
    gap: 10
  },

  cancelButton: {
    backgroundColor: "#ecf0f1",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10
  },

  cancelButtonText: {
    color: "#2c3e50",
    fontWeight: "bold"
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10
  },

  row: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#fff",

    padding: 12,

    borderRadius: 10,

    marginBottom: 7,

    elevation: 1
  },

  timeContainer: {
    width: 65
  },

  timeText: {
    fontWeight: "bold",
    color: "#3498db"
  },

  activityContainer: {
    flex: 1,
    paddingHorizontal: 8
  },

  activityText: {
    color: "#444",
    fontSize: 14
  },

  iconButton: {
    paddingHorizontal: 6
  },

  editText: {
    color: "#3498db",
    fontWeight: "600",
    fontSize: 13
  },

  deleteText: {
    fontSize: 25,
    color: "#e74c3c",
    fontWeight: "bold"
  },

  emptyCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center"
  },

  emptyText: {
    color: "#777"
  }

};