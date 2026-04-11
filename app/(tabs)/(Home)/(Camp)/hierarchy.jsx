import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Modal, Linking,
  Pressable
} from "react-native";
import { useState, useEffect } from "react";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useLanguage } from "../../../../context/languageContext";

export default function Family(){

  const { t } = useLanguage();

  const [list,setList] = useState([]);
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [role,setRole] = useState("");

  const [roles,setRoles] = useState([
    "Director","Vice Director","Doctor","Nurse",
    "Finance","Magazinier","Swimming Monitor","Second Chef","Mentor"
  ]);

  const ROLE_ORDER = [
  "Director",
  "Vice Director",
  "Doctor",
  "Nurse",
  "Finance",
  "Magazinier",
  "Swimming Monitor",
  "Second Chef",
  "Mentor"
];
  const [roleModal,setRoleModal] = useState(false);
  const [selectModal,setSelectModal] = useState(false);
  const [newRole,setNewRole] = useState("");

  const load = ()=>{
    setList(db.getAllSync("SELECT * FROM camp_staff"));
  };

  useEffect(()=>{
    load();
    const l=()=>load();
    dbEvents.on("dbUpdated",l);
    return ()=>dbEvents.off("dbUpdated",l);
  },[]);

  const add = ()=>{
    if(!name || !role) return;

    db.runSync(
      "INSERT INTO camp_staff (name,role,phone) VALUES (?,?,?)",
      [name,role,phone]
    );

    dbEvents.emit("dbUpdated");

    setName("");
    setPhone("");
    setRole("");
  };

  const remove = (id)=>{
    db.runSync("DELETE FROM camp_staff WHERE id=?",[id]);
    dbEvents.emit("dbUpdated");
  };

  const addRole = ()=>{
    if(!newRole.trim()) return;
    setRoles(prev=>[...prev,newRole]);
    setNewRole("");
    setRoleModal(false);
  };

  return(
    <View style={{flex:1,backgroundColor:"#f9f9f9", paddingVertical:60}}>

      <ScrollView contentContainerStyle={{padding:20}}>

        <View style={styles.card}>
          <Text style={styles.title}>{t.addMember}</Text>

          <TextInput placeholderTextColor="#999" placeholder={t.name} value={name} onChangeText={setName} style={styles.input}/>
          <TextInput placeholderTextColor="#999" placeholder={t.phonePlaceholder} value={phone} onChangeText={setPhone} style={styles.input}/>

          <TouchableOpacity onPress={()=>setSelectModal(true)} style={styles.input}>
            <Text>{role || t.selectRolePlaceholder}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={()=>setRoleModal(true)} style={styles.secondaryBtn}>
            <Text>{t.addNewRole}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={add}>
            <Text style={styles.btnText}>{t.add}</Text>
          </TouchableOpacity>
        </View>

       {[...new Set([...ROLE_ORDER, ...roles])].map(roleName => {

  const group = list.filter(item => item.role === roleName);

  if (group.length === 0) return null;

  return (
    <View key={roleName} style={styles.section}>

      {/* ROLE TITLE */}
      <Text style={styles.sectionTitle}>
        {roleName}
      </Text>

      {/* MEMBERS */}
      {group.map(item => (
        <View key={item.id} style={styles.card}>

          <View style={{flex:1}}>
            <Text style={{fontWeight:"bold"}}>
              {item.name}
            </Text>

            {item.phone ? (
              <Text
                style={{color:"#3498db"}}
                onPress={()=>Linking.openURL(`tel:${item.phone}`)}
              >
                {item.phone}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={()=>remove(item.id)}>
            <MaterialIcons name="delete-outline" size={22} color="#e74c3c"/>
          </TouchableOpacity>

        </View>
      ))}

    </View>
  );
})}

      </ScrollView>

      {/* ROLE SELECT */}
      <Modal visible={selectModal} transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {roles.map(r=>(
              <TouchableOpacity
              style={{
                borderBottomColor:'#999',
            borderBottomWidth:1,
            paddingVertical:8
              }}
              key={r} onPress={()=>{setRole(r);setSelectModal(false)}}>
                <Text>{r}</Text>
              </TouchableOpacity>
            ))}
          <Pressable
          style={{
            width:'100%',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            marginVertical:10,
            
          }}
          onPress={()=>{
            setSelectModal(false)
          }}
          >
            <Text
            style={{
              color:"red"
            }}
            > {t.cancel} </Text>
          </Pressable>
          </View>
        </View>
      </Modal>

      {/* ADD ROLE */}
      <Modal visible={roleModal} transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput placeholderTextColor="#999" placeholder={t.addNewRole} value={newRole} onChangeText={setNewRole} style={styles.input}/>
            <TouchableOpacity style={styles.button} onPress={addRole}>
              <Text style={styles.btnText}>{t.add}</Text>
            </TouchableOpacity>
            <Pressable
             style={{
            width:'100%',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            marginVertical:10
          }}
          onPress={()=>{
            setRoleModal(false)
          }}
          >
            <Text
            style={{
              color:"red"
            }}
            > {t.cancel} </Text>
          </Pressable>
          </View>
          
        </View>
      </Modal>

    </View>
  );
}

const styles = {
  card:{backgroundColor:"#fff",padding:15,borderRadius:12,marginBottom:10},
  title:{fontWeight:"bold",marginBottom:10},
  input:{borderWidth:1,borderColor:"#ddd",padding:10,borderRadius:8,marginBottom:10},
  button:{backgroundColor:"#3498db",padding:12,borderRadius:10,alignItems:"center"},
  btnText:{color:"#fff",fontWeight:"bold"},
  secondaryBtn:{backgroundColor:"#ecf0f1",padding:10,borderRadius:8,marginBottom:10},
  modalContainer:{flex:1,justifyContent:"center",backgroundColor:"rgba(0,0,0,0.3)"},
  modalContent:{backgroundColor:"#fff",margin:20,padding:20,borderRadius:12},  section:{
  marginBottom:15
},

sectionTitle:{
  fontWeight:"bold",
  fontSize:16,
  marginBottom:8,
  color:"#2c3e50",
  borderBottomWidth:1,
  borderBottomColor:"#eee",
  paddingBottom:4
}
};