import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Image
} from "react-native";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

export default function GlobalProgram(){

  const { t } = useLanguage();

  const [list,setList] = useState([]);
  const [image,setImage] = useState(null);

  const [row,setRow] = useState({
    day:"",
    date:"",
    morning:"",
    afternoon:"",
    evening:""
  });

  const load = ()=>{
    setList(db.getAllSync("SELECT * FROM global_program ORDER BY day"));
    const img = db.getFirstSync("SELECT imageUri FROM global_program WHERE imageUri IS NOT NULL LIMIT 1");
    if(img) setImage(img.imageUri);
  };

  useEffect(()=>{
    load();
    const l=()=>load();
    dbEvents.on("dbUpdated",l);
    return ()=>dbEvents.off("dbUpdated",l);
  },[]);

  const pickImage = async ()=>{
    const res = await ImagePicker.launchImageLibraryAsync({quality:1});
    if(!res.canceled){
      const uri = res.assets[0].uri;
      db.runSync("DELETE FROM global_program");
      db.runSync("INSERT INTO global_program (imageUri) VALUES (?)",[uri]);
      dbEvents.emit("dbUpdated");
    }
  };

  const reset = ()=>{
    db.runSync("DELETE FROM global_program");
    dbEvents.emit("dbUpdated");
    setImage(null);
  };

  const addRow = ()=>{
    db.runSync(
      "INSERT INTO global_program (day,date,morning,afternoon,evening) VALUES (?,?,?,?,?)",
      [row.day,row.date,row.morning,row.afternoon,row.evening]
    );
    dbEvents.emit("dbUpdated");
    setRow({day:"",date:"",morning:"",afternoon:"",evening:""});
  };

  return(
    <ScrollView style={{flex:1,backgroundColor:"#f9f9f9",padding:20, paddingVertical:60}}>

      {image ? (
        <>
          <Image source={{uri:image}} style={{width:"100%",height:500,borderRadius:12}} resizeMode="contain"/>
          <TouchableOpacity style={styles.button} onPress={reset}>
            <Text style={styles.btnText}>{t.removeImage}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <TouchableOpacity style={styles.button} onPress={pickImage}>
              <Text style={styles.btnText}>{t.importProgramImage}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <TextInput placeholderTextColor="#999" placeholder={t.day} value={row.day} onChangeText={v=>setRow({...row,day:v})} style={styles.input}/>
            <TextInput placeholderTextColor="#999" placeholder={t.date} value={row.date} onChangeText={v=>setRow({...row,date:v})} style={styles.input}/>
            <TextInput placeholderTextColor="#999" placeholder={t.morning} value={row.morning} onChangeText={v=>setRow({...row,morning:v})} style={styles.input}/>
            <TextInput placeholderTextColor="#999" placeholder={t.afternoon} value={row.afternoon} onChangeText={v=>setRow({...row,afternoon:v})} style={styles.input}/>
            <TextInput placeholderTextColor="#999" placeholder={t.evening} value={row.evening} onChangeText={v=>setRow({...row,evening:v})} style={styles.input}/>

            <TouchableOpacity style={styles.button} onPress={addRow}>
              <Text style={styles.btnText}>{t.addRow}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

    </ScrollView>
  );
}

const styles={
  card:{backgroundColor:"#fff",padding:15,borderRadius:12,marginBottom:15},
  input:{borderWidth:1,borderColor:"#ddd",padding:10,borderRadius:8,marginBottom:8},
  button:{backgroundColor:"#3498db",padding:12,borderRadius:10,alignItems:"center"},
  btnText:{color:"#fff",fontWeight:"bold"}
};