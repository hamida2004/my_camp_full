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

  const load = () => {
    const result = db.getAllSync(
      "SELECT * FROM mentor_notes ORDER BY id DESC"
    );
    setNotes(result);
  };

  useEffect(() => {
    load();
    const listener = () => load();
    dbEvents.on("dbUpdated", listener);
    return () => dbEvents.off("dbUpdated", listener);
  }, []);

  const addNote = () => {
    if (!text.trim()) return;

    db.runSync(
      "INSERT INTO mentor_notes (content, date) VALUES (?, ?)",
      [text, new Date().toLocaleString()]
    );

    setText("");
    dbEvents.emit("dbUpdated");
  };

  const deleteNote = (id) => {
    Alert.alert(
      t.delete,
      t.confirm,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
          style: "destructive",
          onPress: () => {
            db.runSync("DELETE FROM mentor_notes WHERE id=?", [id]);
            dbEvents.emit("dbUpdated");
          },
        },
      ]
    );
  };

  const clearAll = () => {
    Alert.alert(
      t.clearAll,
      t.resetConfirm,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.yes,
          style: "destructive",
          onPress: () => {
            db.runSync("DELETE FROM mentor_notes");
            dbEvents.emit("dbUpdated");
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex:1, backgroundColor:"#f9f9f9", padding:20 , paddingVertical:60}}>

<Text
      style={
        {
          fontSize:18,
          fontWeight:700,
          marginBottom:10
        }
      }
      >{t.remark}</Text>

      {/* INPUT */}
      <View style={styles.card}>
        <TextInput
        placeholderTextColor="#999"
          placeholder={t.addRemark}
          value={text}
          onChangeText={setText}
          style={styles.input}
        />

        <TouchableOpacity style={styles.button} onPress={addNote}>
          <Text style={styles.buttonText}>{t.add}</Text>
        </TouchableOpacity>
      </View>

      {/* CLEAR ALL */}
      <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
        <Text style={styles.clearText}>{t.clearAll}</Text>
      </TouchableOpacity>

      {/* LIST */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {notes.map((item) => (
          <View key={item.id} style={styles.card}>

            <TouchableOpacity
              onPress={() => deleteNote(item.id)}
              style={styles.deleteIcon}
            >
              <MaterialIcons name="delete-outline" size={20} color="#e74c3c"/>
            </TouchableOpacity>

            <Text style={{ marginBottom:5 }}>
              {item.content}
            </Text>

            <Text style={styles.date}>
              {item.date}
            </Text>

          </View>
        ))}
      </ScrollView>

    </View>
  );
}

const styles = {
  card:{
    backgroundColor:"#fff",
    padding:15,
    borderRadius:10,
    marginBottom:10,
    elevation:2
  },
  input:{
    borderWidth:1,
    borderColor:"#ddd",
    padding:10,
    borderRadius:8,
    marginBottom:10,
    backgroundColor:"#fff"
  },
  button:{
    backgroundColor:"#3498db",
    padding:12,
    borderRadius:8,
    alignItems:"center"
  },
  buttonText:{
    color:"#fff",
    fontWeight:"bold"
  },
  clearBtn:{
    alignSelf:"flex-end",
    marginBottom:10
  },
  clearText:{
    color:"#e74c3c",
    fontWeight:"bold"
  },
  deleteIcon:{
    position:"absolute",
    top:10,
    right:10
  },
  date:{
    color:"#888",
    fontSize:12
  }
};