import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Image
} from "react-native";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

export default function DailyProgram(){

  const { t } = useLanguage();

  const [list,setList] = useState([]);
  const [time,setTime] = useState("");
  const [activity,setActivity] = useState("");
  const [image,setImage] = useState(null);

  const load = ()=>{
    setList(db.getAllSync("SELECT * FROM daily_program"));
    const img = db.getFirstSync("SELECT imageUri FROM daily_program WHERE imageUri IS NOT NULL LIMIT 1");
    if(img) setImage(img.imageUri);
  };

  useEffect(()=>{
    load();
    const l=()=>load();
    dbEvents.on("dbUpdated",l);
    return ()=>dbEvents.off("dbUpdated",l);
  },[]);

  const takePhoto = async ()=>{
    const res = await ImagePicker.launchCameraAsync({quality:1});
    if(!res.canceled){
      const uri = res.assets[0].uri;
      db.runSync("DELETE FROM daily_program");
      db.runSync("INSERT INTO daily_program (imageUri) VALUES (?)",[uri]);
      dbEvents.emit("dbUpdated");
    }
  };

  const pickImage = async ()=>{
    const res = await ImagePicker.launchImageLibraryAsync({quality:1});
    if(!res.canceled){
      const uri = res.assets[0].uri;
      db.runSync("DELETE FROM daily_program");
      db.runSync("INSERT INTO daily_program (imageUri) VALUES (?)",[uri]);
      dbEvents.emit("dbUpdated");
    }
  };

  const reset = ()=>{
    db.runSync("DELETE FROM daily_program");
    dbEvents.emit("dbUpdated");
    setImage(null);
  };

  const add = ()=>{
    db.runSync("INSERT INTO daily_program (time,activity) VALUES (?,?)",[time,activity]);
    dbEvents.emit("dbUpdated");
    setTime(""); setActivity("");
  };

  return(
    <ScrollView style={{padding:20,backgroundColor:"#f9f9f9",paddingVertical:60}}>

      {image ? (
        <>
          <Image source={{uri:image}} style={{width:"100%",height:400,borderRadius:12}} resizeMode="contain"/>
          <TouchableOpacity style={styles.button} onPress={reset}>
            <Text style={styles.btnText}>{t.removeImage}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Text style={styles.btnText}>{t.takePhoto}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={pickImage}>
              <Text style={styles.btnText}>{t.importFromGallery}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <TextInput placeholderTextColor="#999" placeholder={t.time} value={time} onChangeText={setTime} style={styles.input}/>
            <TextInput placeholderTextColor="#999" placeholder={t.activity} value={activity} onChangeText={setActivity} style={styles.input}/>
            <TouchableOpacity style={styles.button} onPress={add}>
              <Text style={styles.btnText}>{t.add}</Text>
            </TouchableOpacity>
          </View>

          {list.map(item=>(
            <View key={item.id} style={styles.row}>
              <Text>{item.time}</Text>
              <Text>{item.activity}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles={
  card:{backgroundColor:"#fff",padding:15,borderRadius:12,marginBottom:15},
  input:{borderWidth:1,borderColor:"#ddd",padding:10,borderRadius:8,marginBottom:10},
  button:{backgroundColor:"#3498db",padding:12,borderRadius:10,alignItems:"center",marginBottom:10},
  btnText:{color:"#fff",fontWeight:"bold"},
  row:{flexDirection:"row",justifyContent:"space-between",backgroundColor:"#fff",padding:10,marginBottom:5}
};