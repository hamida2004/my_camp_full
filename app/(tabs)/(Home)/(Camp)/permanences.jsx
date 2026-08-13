import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform
} from "react-native";

import { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";

import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

export default function Permanence() {

  const { t } = useLanguage();

  const [dates, setDates] = useState([]);
  const [staff, setStaff] = useState([]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const load = () => {

    const loadedDates = db.getAllSync(
      "SELECT * FROM permanences ORDER BY date ASC"
    );

    setDates(loadedDates);

    setStaff(
      db.getAllSync(
        "SELECT * FROM camp_staff"
      )
    );
  };

  useEffect(() => {

    load();

    const listener = () => load();

    dbEvents.on("dbUpdated", listener);

    return () => {
      dbEvents.off("dbUpdated", listener);
    };

  }, []);

  // Format Date -> YYYY-MM-DD
  const formatDate = (date) => {

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const addDate = () => {

    const dateString = formatDate(selectedDate);

    // Prevent duplicate dates
    const existing = db.getFirstSync(
      "SELECT id FROM permanences WHERE date=?",
      [dateString]
    );

    if (existing) {
      return;
    }

    db.runSync(
      "INSERT INTO permanences (date) VALUES (?)",
      [dateString]
    );

    dbEvents.emit("dbUpdated");
  };

  const isAssigned = (
    permId,
    mentorId,
    shift
  ) => {

    return db.getFirstSync(
      `SELECT id
       FROM permanence_assignments
       WHERE permanenceId=?
       AND mentorId=?
       AND shift=?`,
      [
        permId,
        mentorId,
        shift
      ]
    );
  };

  const toggle = (
    permId,
    mentorId,
    shift
  ) => {

    const existing = isAssigned(
      permId,
      mentorId,
      shift
    );

    if (existing) {

      db.runSync(
        "DELETE FROM permanence_assignments WHERE id=?",
        [existing.id]
      );

    } else {

      // Full day removes nap + night
      if (shift === "full") {

        db.runSync(
          `DELETE FROM permanence_assignments
           WHERE permanenceId=?
           AND mentorId=?
           AND shift IN ('nap','night')`,
          [
            permId,
            mentorId
          ]
        );
      }

      // Nap/night removes full
      if (
        shift === "nap" ||
        shift === "night"
      ) {

        db.runSync(
          `DELETE FROM permanence_assignments
           WHERE permanenceId=?
           AND mentorId=?
           AND shift='full'`,
          [
            permId,
            mentorId
          ]
        );
      }

      // Only one leader per date
      if (shift === "man_of_day") {

        db.runSync(
          `DELETE FROM permanence_assignments
           WHERE permanenceId=?
           AND shift='man_of_day'`,
          [permId]
        );
      }

      db.runSync(
        `INSERT INTO permanence_assignments
         (permanenceId, mentorId, shift)
         VALUES (?,?,?)`,
        [
          permId,
          mentorId,
          shift
        ]
      );
    }

    dbEvents.emit("dbUpdated");
  };

  const onDateChange = (
    event,
    date
  ) => {

    setShowPicker(false);

    if (date) {
      setSelectedDate(date);
    }
  };

  return (

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >

      {/* ADD DATE */}

      <View style={styles.addCard}>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowPicker(true)}
        >

          <Text style={styles.dateButtonText}>
            {formatDate(selectedDate)}
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={addDate}
        >

          <Text style={styles.buttonText}>
            {t.addDate}
          </Text>

        </TouchableOpacity>

      </View>

      {showPicker && (

        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={
            Platform.OS === "ios"
              ? "spinner"
              : "default"
          }
          onChange={onDateChange}
        />

      )}

      {/* TABLES */}

      {dates.map((d) => (

        <View
          key={d.id}
          style={styles.card}
        >

          <Text style={styles.title}>
            {d.date}
          </Text>

          <View style={styles.table}>

            {/* HEADER */}

            <View style={styles.rowHeader}>

              <Text style={[
                styles.cell,
                styles.nameCell,
                styles.headerText
              ]}>
                {t.mentor}
              </Text>

              <Text style={[
                styles.cell,
                styles.headerText
              ]}>
                {t.nap}
              </Text>

              <Text style={[
                styles.cell,
                styles.headerText
              ]}>
                {t.night}
              </Text>

              <Text style={[
                styles.cell,
                styles.headerText
              ]}>
                {t.full}
              </Text>

              <Text style={[
                styles.cell,
                styles.headerText
              ]}>
                {t.leader}
              </Text>

            </View>

            {/* STAFF */}

            {staff.map((s) => {

              const nap = isAssigned(
                d.id,
                s.id,
                "nap"
              );

              const night = isAssigned(
                d.id,
                s.id,
                "night"
              );

              const full = isAssigned(
                d.id,
                s.id,
                "full"
              );

              const man = isAssigned(
                d.id,
                s.id,
                "man_of_day"
              );

              return (

                <View
                  key={s.id}
                  style={styles.row}
                >

                  <Text
                    style={[
                      styles.cell,
                      styles.nameCell
                    ]}
                    numberOfLines={1}
                  >
                    {s.name}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.cell,
                      nap && styles.active
                    ]}
                    onPress={() =>
                      toggle(
                        d.id,
                        s.id,
                        "nap"
                      )
                    }
                  >
                    <Text>
                      {nap ? "✔" : ""}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cell,
                      night && styles.active
                    ]}
                    onPress={() =>
                      toggle(
                        d.id,
                        s.id,
                        "night"
                      )
                    }
                  >
                    <Text>
                      {night ? "✔" : ""}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cell,
                      full && styles.active
                    ]}
                    onPress={() =>
                      toggle(
                        d.id,
                        s.id,
                        "full"
                      )
                    }
                  >
                    <Text>
                      {full ? "✔" : ""}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cell,
                      man && styles.leader
                    ]}
                    onPress={() =>
                      toggle(
                        d.id,
                        s.id,
                        "man_of_day"
                      )
                    }
                  >
                    <Text>
                      {man ? "★" : ""}
                    </Text>
                  </TouchableOpacity>

                </View>
              );
            })}

          </View>

        </View>
      ))}

    </ScrollView>
  );
}

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

  addCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2
  },

  dateButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center"
  },

  dateButtonText: {
    fontSize: 16,
    color: "#333"
  },

  button: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600"
  },

  card: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2
  },

  title: {
    fontWeight: "bold",
    marginBottom: 10,
    fontSize: 16,
    paddingHorizontal: 5
  },

  table: {
    width: "100%"
  },

  rowHeader: {
    flexDirection: "row",
    backgroundColor: "#ddd"
  },

  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee"
  },

  cell: {
    flex: 1,
    minWidth: 0,
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderColor: "#eee",
    textAlign: "center"
  },

  nameCell: {
    flex: 2
  },

  headerText: {
    fontWeight: "bold"
  },

  active: {
    backgroundColor: "#2ecc71"
  },

  leader: {
    backgroundColor: "#f1c40f"
  }
};