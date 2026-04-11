import {
  View, Text, TextInput, TouchableOpacity, FlatList, Linking
} from "react-native";
import { useState, useEffect } from "react";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useLanguage } from "../../../../context/languageContext";

export default function Contacts() {

  const { t } = useLanguage();

  const [list,setList] = useState([]);
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");

  const insertDefaults = () => {
    db.execSync(`
      INSERT OR IGNORE INTO important_contacts (id,name,phone) VALUES
      (1,'Police','1548'),
      (2,'Firefighters','14'),
      (3,'Gendarmerie','1155'),
      (4,'Civil Protection','14');
    `);
  };

  const load = () => {
    insertDefaults();
    setList(db.getAllSync("SELECT * FROM important_contacts ORDER BY id ASC"));
  };

  useEffect(()=>{
    load();
    const l=()=>load();
    dbEvents.on("dbUpdated",l);
    return ()=>dbEvents.off("dbUpdated",l);
  },[]);

  const add = () => {
    if (!name.trim() || !phone.trim()) return;

    db.runSync(
      "INSERT INTO important_contacts (name,phone) VALUES (?,?)",
      [name,phone]
    );

    setName("");
    setPhone("");
    dbEvents.emit("dbUpdated");
  };

  const remove = (id) => {
    db.runSync("DELETE FROM important_contacts WHERE id=?",[id]);
    dbEvents.emit("dbUpdated");
  };

  return (
    <View style={{ flex:1, padding:20, backgroundColor:"#f9f9f9" ,paddingVertical:60}}>

      <View style={styles.card}>
        <Text style={styles.title}>{t.addContact}</Text>

        <TextInput placeholderTextColor="#999" placeholder={t.name} value={name} onChangeText={setName} style={styles.input}/>
        <TextInput placeholderTextColor="#999" placeholder={t.phone} value={phone} onChangeText={setPhone} style={styles.input}/>

        <TouchableOpacity onPress={add} style={styles.button}>
          <Text style={styles.btnText}>{t.add}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={i=>i.id.toString()}
        renderItem={({item})=>(
          <View style={styles.cardRow}>
            <TouchableOpacity style={{flex:1}} onPress={()=>Linking.openURL(`tel:${item.phone}`)}>
              <Text style={{fontWeight:"bold"}}>{item.name}</Text>
              <Text>{item.phone}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>remove(item.id)}>
              <MaterialIcons name="delete-outline" size={22} color="#e74c3c"/>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = {
  card:{ backgroundColor:"#fff", padding:15, borderRadius:10, marginBottom:15 },
  cardRow:{ flexDirection:"row", padding:15, backgroundColor:"#fff", marginBottom:10, borderRadius:10 },
  title:{ fontWeight:"bold", marginBottom:10 },
  input:{ borderWidth:1, borderColor:"#ddd", padding:10, borderRadius:8, marginBottom:10 },
  button:{ backgroundColor:"#3498db", padding:12, borderRadius:8 },
  btnText:{ color:"#fff", textAlign:"center", fontWeight:"bold" }
};