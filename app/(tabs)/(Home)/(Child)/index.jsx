import { MaterialIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { db, deletePersonCascade } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext"; // ✅

export default function Home() {

  const { t, lang, changeLanguage } = useLanguage(); // ✅ FIXED

  const [people, setPeople] = useState([]);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [money, setMoney] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const loadPeople = () => {
    const result = db.getAllSync("SELECT * FROM people");

    const updated = result.map(person => {
      const totalExpenses = db.getFirstSync(
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
    dbEvents.on("dbUpdated", listener);

    return () => dbEvents.off("dbUpdated", listener);
  }, []);


  const deletePerson = (personId) => {
    Alert.alert(
      t.deletePerson,
      t.deleteConfirm,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
          style: "destructive",
          onPress: () => {
            deletePersonCascade(personId);
            dbEvents.emit("dbUpdated");
          },
        },
      ]
    );
  };

  const addPerson = () => {
    if (!name || !birthDate || !money || !parentPhone) return;

    db.runSync(
      "INSERT INTO people (name,birthDate,money,parentPhone) VALUES (?,?,?,?)",
      [name, birthDate, Number(money), parentPhone]
    );

    setName("");
    setBirthDate("");
    setMoney("");
    setParentPhone("");

    dbEvents.emit("dbUpdated");
  };

  const getColor = (remaining, initial) => {
    const ratio = remaining / initial;
    if (ratio > 0.7) return "#2ecc71";
    if (ratio > 0.2) return "#e67e22";
    return "#e74c3c";
  };

  const resetDB = () => {
    Alert.alert(
      t.reset,
      t.confirmReset || "Delete all data?",
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
          style: "destructive",
          onPress: () => {
            db.runSync("DELETE FROM expenses");
            db.runSync("DELETE FROM inventory");
            db.runSync("DELETE FROM people");
            db.runSync("DELETE FROM items");
            dbEvents.emit("dbUpdated");
          },
        },
      ]
    );
  };

  const exportPDF = async () => {

    const now = new Date();

    let html = `
    <html dir="${lang === "ar" ? "rtl" : "ltr"}">
    <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial; text-align: center; margin: 50px; direction: ${lang === "ar" ? "rtl" : "ltr"}; }
      table { width: 80%; margin: auto; border-collapse: collapse; }
      th, td { border: 1px solid #555; padding: 8px; }
      th { background: #3498db; color: white; }
      .page { page-break-after: always; }
    </style>
    </head>
    <body>

    <h1>${t.reportTitle}</h1>
    <p>${t.date}: ${now.toLocaleString()}</p>
    `;

    people.forEach(person => {

      const totalExpenses = db.getFirstSync(
        "SELECT SUM(amount) as total FROM expenses WHERE personId=?",
        [person.id]
      )?.total || 0;

      const remaining = person.money - totalExpenses;

      const inventory = db.getAllSync(
        "SELECT inventory.quantity, items.name FROM inventory JOIN items ON inventory.itemId = items.id WHERE personId=?",
        [person.id]
      );

      const table = inventory.length
        ? `<table>
            <tr><th>${t.itemName}</th><th>${t.quantity}</th></tr>
            ${inventory.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td></tr>`).join("")}
          </table>`
        : `<p>${t.noItems}</p>`;

      html += `
      <div class="page">
        <h2>${person.name}</h2>
        <p>${t.birthDate}: ${person.birthDate}</p>
        <p>${t.initialBudget}: ${person.money} DA</p>
        <p>${t.remaining}: ${remaining} DA</p>
        <p>${t.parentPhone}: <a href="tel:${person.parentPhone}">${person.parentPhone}</a></p>
        <p>${t.inventory}</p>
        ${table}
      </div>
      `;
    });

    html += `</body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (

<View style={{ flex:1, padding:20, backgroundColor:"#f9f9f9", paddingVertical:80 }}>


  {/* ADD PERSON */}
  <View style={{ marginBottom:20, backgroundColor:"#fff", padding:15, borderRadius:10 }}>
    <Text style={{fontSize:18,fontWeight:"bold",marginBottom:10}}>
      {t.addPerson}
    </Text>

    <TextInput placeholderTextColor="#999"  placeholder={t.name} value={name} onChangeText={setName} style={styles.input}/>
    <TextInput  placeholderTextColor="#999" placeholder={t.birthDate} value={birthDate} onChangeText={setBirthDate} style={styles.input}/>
    <TextInput placeholderTextColor="#999"  placeholder={t.budget} value={money} onChangeText={setMoney} keyboardType="numeric" style={styles.input}/>
    <TextInput placeholderTextColor="#999"  placeholder={t.parentPhone} value={parentPhone} onChangeText={setParentPhone} keyboardType="phone-pad" style={styles.input}/>

    <Button title={t.addPerson} onPress={addPerson} color="#3498db"/>
  </View>

  {/* ACTIONS */}
  <View style={{flexDirection:"row", justifyContent:"space-between", marginBottom:20}}>
    <Button title={t.exportPDF} color="#2ecc71" onPress={exportPDF}/>
    <Button title={t.reset} color="#e74c3c" onPress={resetDB}/>
  </View>

  {/* PEOPLE */}
  <ScrollView showsVerticalScrollIndicator={false}>
    {people.map(item => (
      <View key={item.id} style={styles.card}>

        <TouchableOpacity onPress={()=>deletePerson(item.id)} style={styles.delete}>
          <MaterialIcons name="delete-outline" size={22} color="#e74c3c"/>
        </TouchableOpacity>

        <TouchableOpacity onPress={()=>router.push(`/personInventory?id=${item.id}`)}>
          <Text style={styles.title}>{item.name}</Text>
          <Text>{t.birthDate}: {item.birthDate}</Text>
          <Text>{t.initialBudget}: {item.money} DA</Text>
          <Text style={{color:getColor(item.remaining,item.money), fontWeight:"bold"}}>
            {t.remaining}: {item.remaining} DA
          </Text>
          <Text style={styles.phone} onPress={()=>Linking.openURL(`tel:${item.parentPhone}`)}>
            {t.parentPhone}: {item.parentPhone}
          </Text>
        </TouchableOpacity>

      </View>
    ))}
  </ScrollView>

</View>
  );
}

const styles = {
  input:{borderWidth:1,borderColor:"#ddd",borderRadius:8,padding:10,marginBottom:10},
  card:{backgroundColor:"#fff",padding:15,borderRadius:10,marginBottom:15,position:"relative"},
  delete:{position:"absolute",top:10,right:10},
  title:{fontSize:16,fontWeight:"bold"},
  phone:{color:"#3498db",fontWeight:"bold"}
};