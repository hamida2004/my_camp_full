import {
  View, Text, TouchableOpacity,
  ScrollView, TextInput
} from "react-native";
import { useState, useEffect } from "react";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

export default function Permanence(){

  const { t } = useLanguage();

  const [dates,setDates] = useState([]);
  const [staff,setStaff] = useState([]);
  const [newDate,setNewDate] = useState("");

  const load = ()=>{
    setDates(db.getAllSync("SELECT * FROM permanences ORDER BY date"));
    setStaff(db.getAllSync("SELECT * FROM camp_staff"));
  };

  useEffect(()=>{
    load();
    const l=()=>load();
    dbEvents.on("dbUpdated",l);
    return ()=>dbEvents.off("dbUpdated",l);
  },[]);

  const addDate = ()=>{
    if(!newDate) return;

    db.runSync("INSERT INTO permanences (date) VALUES (?)",[newDate]);
    dbEvents.emit("dbUpdated");
    setNewDate("");
  };

  const isAssigned = (permId, mentorId, shift)=>{
    return db.getFirstSync(
      "SELECT id FROM permanence_assignments WHERE permanenceId=? AND mentorId=? AND shift=?",
      [permId,mentorId,shift]
    );
  };

  const toggle = (permId, mentorId, shift)=>{

    const existing = isAssigned(permId, mentorId, shift);

    if(existing){
      db.runSync("DELETE FROM permanence_assignments WHERE id=?", [existing.id]);
    }else{

      if(shift === "full"){
        db.runSync(
          "DELETE FROM permanence_assignments WHERE permanenceId=? AND mentorId=? AND shift IN ('nap','night')",
          [permId,mentorId]
        );
      }

      if(shift === "nap" || shift === "night"){
        db.runSync(
          "DELETE FROM permanence_assignments WHERE permanenceId=? AND mentorId=? AND shift='full'",
          [permId,mentorId]
        );
      }

      if(shift === "man_of_day"){
        db.runSync(
          "DELETE FROM permanence_assignments WHERE permanenceId=? AND shift='man_of_day'"
        );
      }

      db.runSync(
        "INSERT INTO permanence_assignments (permanenceId,mentorId,shift) VALUES (?,?,?)",
        [permId,mentorId,shift]
      );
    }

    dbEvents.emit("dbUpdated");
  };

  return(
    <ScrollView style={{flex:1,backgroundColor:"#f9f9f9",padding:20, paddingVertical:60}}>

      {/* ADD DATE */}
      <View style={styles.card}>
        <TextInput
        placeholderTextColor="#999"
          placeholder="YYYY-MM-DD"
          value={newDate}
          onChangeText={setNewDate}
          style={styles.input}
        />
        <TouchableOpacity style={styles.button} onPress={addDate}>
          <Text style={{color:"#fff"}}>{t.addDate}</Text>
        </TouchableOpacity>
      </View>

      {/* TABLE PER DATE */}
      {dates.map(d=>(
        <View key={d.id} style={styles.card}>

          <Text style={styles.title}>{d.date}</Text>

          {/* HEADER */}
          <View style={styles.rowHeader}>
            <Text style={styles.cellName}>{t.mentor}</Text>
            <Text style={styles.cell}>{t.nap}</Text>
            <Text style={styles.cell}>{t.night}</Text>
            <Text style={styles.cell}>{t.full}</Text>
            <Text style={styles.cell}>{t.leader}</Text>
          </View>

          {/* ROWS */}
          {staff.map(s=>{

            const nap = isAssigned(d.id,s.id,"nap");
            const night = isAssigned(d.id,s.id,"night");
            const full = isAssigned(d.id,s.id,"full");
            const man = isAssigned(d.id,s.id,"man_of_day");

            return(
              <View key={s.id} style={styles.row}>

                <Text style={styles.cellName}>{s.name}</Text>

                <TouchableOpacity
                  style={[styles.cell, nap && styles.active]}
                  onPress={()=>toggle(d.id,s.id,"nap")}
                >
                  <Text>{nap ? "✔" : ""}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cell, night && styles.active]}
                  onPress={()=>toggle(d.id,s.id,"night")}
                >
                  <Text>{night ? "✔" : ""}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cell, full && styles.active]}
                  onPress={()=>toggle(d.id,s.id,"full")}
                >
                  <Text>{full ? "✔" : ""}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cell, man && styles.leader]}
                  onPress={()=>toggle(d.id,s.id,"man_of_day")}
                >
                  <Text>{man ? "★" : ""}</Text>
                </TouchableOpacity>

              </View>
            );
          })}

        </View>
      ))}

    </ScrollView>
  );
}

const styles={
  card:{
    backgroundColor:"#fff",
    padding:15,
    borderRadius:12,
    marginBottom:20,
    elevation:2
  },
  input:{
    borderWidth:1,
    borderColor:"#ddd",
    padding:10,
    borderRadius:8,
    marginBottom:10
  },
  button:{
    backgroundColor:"#3498db",
    padding:10,
    borderRadius:8,
    alignItems:"center"
  },
  title:{
    fontWeight:"bold",
    marginBottom:10,
    fontSize:16
  },

  rowHeader:{
    flexDirection:"row",
    backgroundColor:"#ddd",
    padding:8
  },
  row:{
    flexDirection:"row",
    borderBottomWidth:1,
    borderColor:"#eee"
  },

  cell:{
    flex:1,
    alignItems:"center",
    justifyContent:"center",
    padding:10,
    borderRightWidth:1,
    borderColor:"#eee"
  },

  cellName:{
    flex:2,
    padding:10
  },

  active:{
    backgroundColor:"#2ecc71"
  },

  leader:{
    backgroundColor:"#f1c40f"
  }
};