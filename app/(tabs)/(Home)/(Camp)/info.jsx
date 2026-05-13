import { View, TextInput, TouchableOpacity, ScrollView, Text } from "react-native";
import { useState, useEffect } from "react";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

export default function General() {
  const { t } = useLanguage();

  const [info, setInfo] = useState({
    name:"", center:"", organized_by:"",
    location:"", startDate:"", endDate:"",
    children_male:"", children_female:"",
    stuff_male:"", stuff_female:"",
    description:""
  });

  useEffect(() => {
    const data = db.getFirstSync("SELECT * FROM camp_info LIMIT 1");
    if (data) {
      const { id, ...rest } = data;
      setInfo(rest);
    }
  }, []);

  const update = (k, v) => setInfo(p => ({ ...p, [k]: v }));

  const save = () => {
    db.runSync(`
      INSERT OR REPLACE INTO camp_info (
        id, name, center, organized_by, location,
        startDate, endDate,
        children_male, children_female,
        stuff_male, stuff_female,
        description
      ) VALUES (1,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      info.name, info.center, info.organized_by, info.location,
      info.startDate, info.endDate,
      info.children_male, info.children_female,
      info.stuff_male, info.stuff_female,
      info.description
    ]);

    dbEvents.emit("dbUpdated");
  };

  return (
    <ScrollView style={{ padding: 20, backgroundColor: "#f9f9f9", paddingVertical: 60 }}>

      <TextInput placeholderTextColor="#999" placeholder={t.campName}
        value={info.name} onChangeText={v => update("name", v)} style={styles.input} />
      <TextInput placeholderTextColor="#999" placeholder={t.center}
        value={info.center} onChangeText={v => update("center", v)} style={styles.input} />
      <TextInput placeholderTextColor="#999" placeholder={t.organizedBy}
        value={info.organized_by} onChangeText={v => update("organized_by", v)} style={styles.input} />
      <TextInput placeholderTextColor="#999" placeholder={t.location}
        value={info.location} onChangeText={v => update("location", v)} style={styles.input} />

      <TextInput placeholderTextColor="#999" placeholder={t.startDate}
        value={info.startDate} onChangeText={v => update("startDate", v)} style={styles.input} />
      <TextInput placeholderTextColor="#999" placeholder={t.endDate}
        value={info.endDate} onChangeText={v => update("endDate", v)} style={styles.input} />

      <TextInput placeholderTextColor="#999" placeholder={t.childrenMale}
        value={info.children_male} onChangeText={v => update("children_male", v)} style={styles.input} />
      <TextInput placeholderTextColor="#999" placeholder={t.childrenFemale}
        value={info.children_female} onChangeText={v => update("children_female", v)} style={styles.input} />

      <TextInput placeholderTextColor="#999" placeholder={t.staffMale}
        value={info.stuff_male} onChangeText={v => update("stuff_male", v)} style={styles.input} />
      <TextInput placeholderTextColor="#999" placeholder={t.staffFemale}
        value={info.stuff_female} onChangeText={v => update("stuff_female", v)} style={styles.input} />

      <TextInput placeholderTextColor="#999" placeholder={t.description}
        value={info.description} onChangeText={v => update("description", v)}
        multiline style={styles.input} />

      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.btn}>{t.save}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = {
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8, backgroundColor: "#fff" },
  button: { backgroundColor: "#3498db", padding: 12, borderRadius: 10 },
  btn: { color: "#fff", textAlign: "center", fontWeight: "bold" }
};