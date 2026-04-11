import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView
} from "react-native";
import { useState, useEffect } from "react";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useLanguage } from "../../../../context/languageContext";

export default function Meetings() {

  const { t } = useLanguage();

  const [title,setTitle] = useState("");
  const [content,setContent] = useState("");
  const [list,setList] = useState([]);

  const load = () => {
    setList(
      db.getAllSync("SELECT * FROM mentor_meetings ORDER BY id DESC")
    );
  };

  useEffect(()=>{
    load();
    const l=()=>load();
    dbEvents.on("dbUpdated",l);
    return ()=>dbEvents.off("dbUpdated",l);
  },[]);

  const add = () => {
    if(!title.trim() || !content.trim()) return;

    db.runSync(
      "INSERT INTO mentor_meetings (title,content,date) VALUES (?,?,?)",
      [title,content,new Date().toLocaleString()]
    );

    dbEvents.emit("dbUpdated");

    setTitle("");
    setContent("");
  };

  const remove = (id) => {
    db.runSync("DELETE FROM mentor_meetings WHERE id=?", [id]);
    dbEvents.emit("dbUpdated");
  };

  return (
    <ScrollView
      style={{ flex:1, backgroundColor:"#f9f9f9", paddingVertical:60 }}
      contentContainerStyle={{ padding:20, paddingBottom:60 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
      style={
        {
          fontSize:18,
          fontWeight:700,
          marginBottom:10
        }
      }
      >{t.meetings}</Text>

      {/* ADD MEETING */}
      <View style={styles.card}>
        <Text style={styles.title}>{t.meetings}</Text>

        <TextInput
        placeholderTextColor="#999"
          placeholder={t.meetingTitle}
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <TextInput
        placeholderTextColor="#999"
          placeholder={t.meetingContent}
          value={content}
          onChangeText={setContent}
          multiline
          style={[styles.input,{height:80}]}
        />

        <TouchableOpacity style={styles.button} onPress={add}>
          <Text style={styles.buttonText}>{t.add}</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {list.map(item=>(
        <View key={item.id} style={styles.card}>

          <View style={styles.row}>
            <Text style={styles.meetingTitle}>
              {item.title}
            </Text>

            <TouchableOpacity onPress={()=>remove(item.id)}>
              <MaterialIcons name="delete-outline" size={22} color="#e74c3c"/>
            </TouchableOpacity>
          </View>

          <Text style={styles.content}>
            {item.content}
          </Text>

          <Text style={styles.date}>
            {item.date}
          </Text>

        </View>
      ))}

    </ScrollView>
  );
}

const styles = {
  card:{
    backgroundColor:"#fff",
    padding:15,
    borderRadius:10,
    marginBottom:15,
    elevation:2
  },
  title:{
    fontWeight:"bold",
    marginBottom:10
  },
  input:{
    borderWidth:1,
    borderColor:"#ddd",
    borderRadius:8,
    padding:10,
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
  row:{
    flexDirection:"row",
    justifyContent:"space-between"
  },
  meetingTitle:{
    fontWeight:"bold",
    fontSize:16
  },
  content:{
    marginTop:5,
    color:"#444"
  },
  date:{
    marginTop:8,
    fontSize:12,
    color:"#888"
  }
};