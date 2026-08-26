import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
  Platform,
  Modal,
} from "react-native";

import { useState, useEffect } from "react";

import DateTimePicker from "@react-native-community/datetimepicker";

import { db } from "../../../../database/db.js";
import { dbEvents } from "../../../../events/events.js";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../../../context/languageContext";


export default function MentorInfo() {

  const { t } = useLanguage();

  // =========================================================
  // FORM
  // =========================================================

  const [form, setForm] = useState({
    fullName: "",
    birthDate: "",
    birthPlace: "",
    address: "",
    bloodGroup: "",
    idNumber: "",
    wilaya: "",
    daira: "",
    phone: "",
    email: "",
    emergencyPhone: "",
    academicLevel: "",
    job: "",
    familyStatus: "",
    sex: "",
    role: "mentor",
    customRole: ""
  });


  // =========================================================
  // PICKER
  // =========================================================

  const [picker, setPicker] = useState({
    visible: false,
    key: "",
    title: "",
    options: []
  });


  // =========================================================
  // DATE PICKER
  // =========================================================

  const [datePickerVisible, setDatePickerVisible] =
    useState(false);

  const [selectedDate, setSelectedDate] =
    useState(new Date());


  // =========================================================
  // LOAD MENTOR
  // =========================================================

  const load = () => {

    try {

      const m =
        db.getFirstSync(
          "SELECT * FROM mentor LIMIT 1"
        );

      if (m) {

        const {
          id,
          ...rest
        } = m;

        setForm(rest);


        // -----------------------------------------------
        // Restore saved birth date into Date object
        // -----------------------------------------------

        if (m.birthDate) {

          const parsedDate =
            new Date(m.birthDate);

          if (!isNaN(parsedDate.getTime())) {
            setSelectedDate(parsedDate);
          }

        }

      }

    } catch (error) {

      console.error(
        "Load mentor error:",
        error
      );

    }

  };


  // =========================================================
  // INITIALIZE
  // =========================================================

  useEffect(() => {

    load();

    const l = () => load();

    dbEvents.on(
      "dbUpdated",
      l
    );

    return () =>
      dbEvents.off(
        "dbUpdated",
        l
      );

  }, []);


  // =========================================================
  // UPDATE FORM
  // =========================================================

  const update = (
    key,
    value
  ) => {

    setForm(prev => ({
      ...prev,
      [key]: value
    }));

  };


  // =========================================================
  // OPEN SELECT PICKER
  // =========================================================

  const pickOption = (
    title,
    key,
    options
  ) => {

    setPicker({
      visible: true,
      key,
      title,
      options
    });

  };


  // =========================================================
  // OPEN DATE PICKER
  // =========================================================

  const openDatePicker = () => {

    // If a date is already saved, use it.
    // Otherwise use today's date.

    if (form.birthDate) {

      const existingDate =
        new Date(form.birthDate);

      if (!isNaN(existingDate.getTime())) {

        setSelectedDate(
          existingDate
        );

      }

    } else {

      setSelectedDate(
        new Date()
      );

    }

    setDatePickerVisible(true);

  };


  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (
    date
  ) => {

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const year =
      date.getFullYear();

    return `${day}/${month}/${year}`;

  };


  // =========================================================
  // DATE CHANGE
  // =========================================================

  const handleDateChange = (
    event,
    date
  ) => {

    // Android sends "dismissed" when
    // the user closes the picker.

    if (
      event.type === "dismissed"
    ) {

      setDatePickerVisible(false);

      return;

    }


    if (date) {

      setSelectedDate(date);

      update(
        "birthDate",
        formatDate(date)
      );

    }


    // Android closes automatically
    // after selecting a date.

    if (
      Platform.OS === "android"
    ) {

      setDatePickerVisible(false);

    }

  };


  // =========================================================
  // SAVE
  // =========================================================

  const save = () => {

    try {

      const exists =
        db.getFirstSync(
          "SELECT id FROM mentor LIMIT 1"
        );


      if (exists) {

        db.runSync(`
          UPDATE mentor SET

          fullName=?,
          birthDate=?,
          birthPlace=?,
          address=?,

          bloodGroup=?,
          idNumber=?,
          wilaya=?,
          daira=?,

          phone=?,
          email=?,
          emergencyPhone=?,

          academicLevel=?,
          job=?,
          familyStatus=?,
          sex=?,

          role=?,
          customRole=?

          WHERE id=?
        `, [

          form.fullName,
          form.birthDate,
          form.birthPlace,
          form.address,

          form.bloodGroup,
          form.idNumber,
          form.wilaya,
          form.daira,

          form.phone,
          form.email,
          form.emergencyPhone,

          form.academicLevel,
          form.job,
          form.familyStatus,
          form.sex,

          form.role,
          form.customRole,

          exists.id

        ]);

      } else {

        db.runSync(`
          INSERT INTO mentor (

            fullName,
            birthDate,
            birthPlace,
            address,

            bloodGroup,
            idNumber,
            wilaya,
            daira,

            phone,
            email,
            emergencyPhone,

            academicLevel,
            job,
            familyStatus,
            sex,

            role,
            customRole

          )

          VALUES (
            ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
          )
        `, [

          form.fullName,
          form.birthDate,
          form.birthPlace,
          form.address,

          form.bloodGroup,
          form.idNumber,
          form.wilaya,
          form.daira,

          form.phone,
          form.email,
          form.emergencyPhone,

          form.academicLevel,
          form.job,
          form.familyStatus,
          form.sex,

          form.role,
          form.customRole

        ]);

      }


      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Save mentor error:",
        error
      );

    }

  };


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#f9f9f9",
        paddingVertical: 20
      }}
    >

      {/* ===================================================
          HEADER
      =================================================== */}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 40
        }}
      >

        <Text>
          {t.mentorInfo}
        </Text>


        <TouchableOpacity
          onPress={save}
          style={{
            backgroundColor: "#3498db",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            marginTop: 10
          }}
        >

          <Text
            style={{
              color: "#fff",
              fontWeight: "bold"
            }}
          >
            {t.save}
          </Text>

        </TouchableOpacity>

      </View>


      {/* ===================================================
          FORM
      =================================================== */}

      <ScrollView
        contentContainerStyle={{
          padding: 20
        }}
      >

        {/* -----------------------------------------------
            TEXT INPUTS EXCEPT BIRTH DATE
        ------------------------------------------------ */}

        {[
          [t.fullName, "fullName"],
          [t.birthPlace, "birthPlace"],
          [t.address, "address"],
          [t.idNumber, "idNumber"],
          [t.wilaya, "wilaya"],
          [t.daira, "daira"],
          [t.phone, "phone"],
          [t.email, "email"],
          [t.emergencyPhone, "emergencyPhone"],
          [t.academicLevel, "academicLevel"],
          [t.job, "job"]
        ].map(
          ([label, key]) => (

            <TextInput

              key={key}

              placeholderTextColor="#999"

              placeholder={label}

              value={
                form[key]
              }

              onChangeText={
                value =>
                  update(
                    key,
                    value
                  )
              }

              style={
                styles.input
              }

            />

          )
        )}


        {/* =================================================
            DATE OF BIRTH
        ================================================= */}

        <TouchableOpacity
          onPress={
            openDatePicker
          }

          style={
            styles.select
          }

          activeOpacity={0.7}
        >

          <Text
            style={{
              color:
                form.birthDate
                  ? "#222"
                  : "#999"
            }}
          >

            {form.birthDate ||
              t.birthDate}

          </Text>

        </TouchableOpacity>


        {/* =================================================
            BLOOD GROUP
        ================================================= */}

        <TouchableOpacity

          onPress={() =>
            pickOption(
              t.bloodGroup,
              "bloodGroup",
              [
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-"
              ]
            )
          }

          style={
            styles.select
          }

        >

          <Text>

            {form.bloodGroup ||
              t.bloodGroup}

          </Text>

        </TouchableOpacity>


        {/* =================================================
            SEX
        ================================================= */}

        <TouchableOpacity

          onPress={() =>
            pickOption(
              t.sex,
              "sex",
              [
                t.male,
                t.female
              ]
            )
          }

          style={
            styles.select
          }

        >

          <Text>

            {form.sex ||
              t.sex}

          </Text>

        </TouchableOpacity>


        {/* =================================================
            FAMILY STATUS
        ================================================= */}

        <TouchableOpacity

          onPress={() =>
            pickOption(
              t.familyStatus,
              "familyStatus",
              [
                t.single,
                t.married,
                t.divorced
              ]
            )
          }

          style={
            styles.select
          }

        >

          <Text>

            {form.familyStatus ||
              t.familyStatus}

          </Text>

        </TouchableOpacity>


        {/* =================================================
            ROLE
        ================================================= */}

        <TouchableOpacity

          onPress={() =>
            pickOption(
              t.role,
              "role",
              [
                "mentor",
                "other"
              ]
            )
          }

          style={
            styles.select
          }

        >

          <Text>

            {form.role ||
              t.selectRolePlaceholder}

          </Text>

        </TouchableOpacity>


        {/* =================================================
            CUSTOM ROLE
        ================================================= */}

        {form.role === "other" && (

          <TextInput

            placeholderTextColor="#999"

            placeholder={
              t.customRole ||
              "Custom role"
            }

            value={
              form.customRole
            }

            onChangeText={
              value =>
                update(
                  "customRole",
                  value
                )
            }

            style={
              styles.input
            }

          />

        )}

      </ScrollView>


      {/* ===================================================
          DATE PICKER
      =================================================== */}

      {datePickerVisible && (

        <DateTimePicker

          value={
            selectedDate
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
            handleDateChange
          }

        />

      )}


      {/* ===================================================
          SELECT OPTION PICKER
      =================================================== */}

      {picker.visible && (

        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,

            backgroundColor: "#fff",

            padding: 20
          }}
        >

          <Text
            style={{
              fontWeight: "bold"
            }}
          >
            {picker.title}
          </Text>


          <ScrollView
            style={{
              maxHeight: 250
            }}
          >

            {picker.options.map(
              option => (

                <TouchableOpacity

                  key={option}

                  onPress={() => {

                    update(
                      picker.key,
                      option
                    );

                    setPicker({
                      visible: false,
                      key: "",
                      title: "",
                      options: []
                    });

                  }}

                  style={{
                    padding: 12
                  }}

                >

                  <Text>
                    {option}
                  </Text>

                </TouchableOpacity>

              )
            )}

          </ScrollView>


          <TouchableOpacity

            onPress={() =>
              setPicker({
                visible: false,
                key: "",
                title: "",
                options: []
              })
            }

          >

            <Text
              style={{
                color: "#e74c3c"
              }}
            >
              {t.cancel}
            </Text>

          </TouchableOpacity>

        </View>

      )}

    </SafeAreaView>

  );

}


// ===========================================================
// STYLES
// ===========================================================

const styles = {

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#fff"
  },

  select: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#fff"
  }

};