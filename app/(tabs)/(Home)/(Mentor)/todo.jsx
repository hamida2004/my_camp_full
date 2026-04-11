import {
  View, Text, TextInput, TouchableOpacity, ScrollView
} from "react-native";
import { useState, useEffect } from "react";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

export default function Todo(){

  const { t } = useLanguage();

  const [todos,setTodos] = useState([]);
  const [text,setText] = useState("");

  const load = ()=>{
    setTodos(db.getAllSync("SELECT * FROM mentor_todos ORDER BY id DESC"));
  };

  useEffect(()=>{
    load();
    dbEvents.on("dbUpdated",load);
    return ()=>dbEvents.off("dbUpdated",load);
  },[]);

  // ADD
  const add = ()=>{
    if(!text.trim()) return;

    db.runSync(
      "INSERT INTO mentor_todos (title,completed) VALUES (?,0)",
      [text]
    );

    dbEvents.emit("dbUpdated");
    setText("");
  };

  // TOGGLE
  const toggle = (id, done)=>{
    db.runSync(
      "UPDATE mentor_todos SET completed=? WHERE id=?",
      [done ? 0 : 1, id]
    );
    dbEvents.emit("dbUpdated");
  };

  // CLEAR ALL
  const clearAll = ()=>{
    db.runSync("DELETE FROM mentor_todos");
    dbEvents.emit("dbUpdated");
  };

  // CLEAR DONE
  const clearDone = ()=>{
    db.runSync("DELETE FROM mentor_todos WHERE completed=1");
    dbEvents.emit("dbUpdated");
  };

  return(
    <ScrollView
      style={{flex:1, backgroundColor:"#f9f9f9",paddingVertical:60}}
      contentContainerStyle={{padding:20, paddingBottom:60}}
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
      >ToDo List :</Text>

      {/* ADD CARD */}
      <View style={styles.card}>
        <Text style={styles.title}>{t.task}</Text>

        <TextInput
        placeholderTextColor="#999"
          placeholder={t.task}
          value={text}
          onChangeText={setText}
          style={styles.input}
        />

        <TouchableOpacity onPress={add} style={styles.button}>
          <Text style={styles.buttonText}>{t.add}</Text>
        </TouchableOpacity>
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={clearDone}>
          <Text>{t.clearDone}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={clearAll}>
          <Text style={{color:"#fff"}}>{t.clearAll}</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {todos.map(todo=>(
        <TouchableOpacity
          key={todo.id}
          onPress={()=>toggle(todo.id, todo.completed)}
          style={styles.card}
        >
          <View style={{flexDirection:"row", alignItems:"center"}}>

            <MaterialIcons
              name={todo.completed ? "check-circle" : "radio-button-unchecked"}
              size={22}
              color={todo.completed ? "#2ecc71" : "#999"}
              style={{marginRight:10}}
            />

            <Text
              style={{
                textDecorationLine: todo.completed ? "line-through" : "none",
                color: todo.completed ? "#888" : "#000"
              }}
            >
              {todo.title}
            </Text>

          </View>
        </TouchableOpacity>
      ))}

    </ScrollView>
  );
}

const styles = {
  card:{
    backgroundColor:"#fff",
    padding:15,
    borderRadius:10,
    marginBottom:12,
    shadowColor:"#000",
    shadowOpacity:0.05,
    shadowRadius:5,
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

  actions:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginBottom:15
  },

  secondaryButton:{
    padding:10,
    backgroundColor:"#ecf0f1",
    borderRadius:8
  },

  dangerButton:{
    padding:10,
    backgroundColor:"#e74c3c",
    borderRadius:8
  }
};