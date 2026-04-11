import { View, TextInput, ScrollView, TouchableOpacity, Text } from "react-native";
import { useState, useEffect } from "react";
import { db } from "../../../../database/db.js";
import { dbEvents } from "../../../../events/events.js";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../../../context/languageContext";

export default function MentorInfo() {

  const { t } = useLanguage();

  const [form, setForm] = useState({
    fullName: "",
    birthDate: "",
    birthPlace: "",
    address: "",
    bloodGroup: "",
    idNumber: "",
    wilaya: "",
    daira: "",
    phone: "",
    email: "",
    emergencyPhone: "",
    academicLevel: "",
    job: "",
    familyStatus: "",
    sex: "",
    role: "mentor",
    customRole: ""
  });

  const [picker, setPicker] = useState({
    visible: false,
    key: "",
    title: "",
    options: []
  });

  const load = () => {
    const m = db.getFirstSync("SELECT * FROM mentor LIMIT 1");
    if (m) {
      const { id, ...rest } = m;
      setForm(rest);
    }
  };

  useEffect(() => {
    load();
    const l = () => load();
    dbEvents.on("dbUpdated", l);
    return () => dbEvents.off("dbUpdated", l);
  }, []);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const pickOption = (title, key, options) => {
    setPicker({ visible: true, key, title, options });
  };

  const save = () => {

    const exists = db.getFirstSync("SELECT id FROM mentor LIMIT 1");

    if (exists) {
      db.runSync(`
        UPDATE mentor SET
        fullName=?, birthDate=?, birthPlace=?, address=?,
        bloodGroup=?, idNumber=?, wilaya=?, daira=?,
        phone=?, email=?, emergencyPhone=?,
        academicLevel=?, job=?, familyStatus=?, sex=?,
        role=?, customRole=?
        WHERE id=?
      `,[
        form.fullName, form.birthDate, form.birthPlace, form.address,
        form.bloodGroup, form.idNumber, form.wilaya, form.daira,
        form.phone, form.email, form.emergencyPhone,
        form.academicLevel, form.job, form.familyStatus, form.sex,
        form.role, form.customRole,
        exists.id
      ]);
    } else {
      db.runSync(`
        INSERT INTO mentor (
          fullName,birthDate,birthPlace,address,
          bloodGroup,idNumber,wilaya,daira,
          phone,email,emergencyPhone,
          academicLevel,job,familyStatus,sex,
          role,customRole
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,[
        form.fullName, form.birthDate, form.birthPlace, form.address,
        form.bloodGroup, form.idNumber, form.wilaya, form.daira,
        form.phone, form.email, form.emergencyPhone,
        form.academicLevel, form.job, form.familyStatus, form.sex,
        form.role, form.customRole
      ]);
    }

    dbEvents.emit("dbUpdated");
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f9f9f9", paddingVertical:20 }}>

      <View style={{
        flexDirection:'row',
        alignItems:'center',
        justifyContent:'space-between',
        paddingHorizontal:40
      }}>
        <Text>{t.mentorInfo}</Text>

        <TouchableOpacity onPress={save} style={{
          backgroundColor:"#3498db",
          paddingHorizontal:12,
          paddingVertical:8,
          borderRadius:10,
          marginTop:10
        }}>
          <Text style={{ color:"#fff", fontWeight:"bold" }}>
            {t.save}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding:20 }}>

        {[
          [t.fullName,"fullName"],
          [t.birthDate,"birthDate"],
          [t.birthPlace,"birthPlace"],
          [t.address,"address"],
          [t.idNumber,"idNumber"],
          [t.wilaya,"wilaya"],
          [t.daira,"daira"],
          [t.phone,"phone"],
          [t.email,"email"],
          [t.emergencyPhone,"emergencyPhone"],
          [t.academicLevel,"academicLevel"],
          [t.job,"job"]
        ].map(([label,key])=>(
          <TextInput 
            placeholderTextColor="#999"
            key={key}
            placeholder={label}
            value={form[key]}
            onChangeText={(v)=>update(key,v)}
            style={styles.input}
          />
        ))}

        <TouchableOpacity
          onPress={()=>pickOption(t.bloodGroup,"bloodGroup",["A+","A-","B+","B-","AB+","AB-","O+","O-"])}
          style={styles.select}
        >
          <Text>{form.bloodGroup || t.bloodGroup}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={()=>pickOption(t.sex,"sex",[t.male,t.female])}
          style={styles.select}
        >
          <Text>{form.sex || t.sex}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={()=>pickOption(t.familyStatus,"familyStatus",[t.single,t.married,t.divorced])}
          style={styles.select}
        >
          <Text>{form.familyStatus || t.familyStatus}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={()=>pickOption(t.role,"role",["mentor","other"])}
          style={styles.select}
        >
          <Text>{form.role || t.selectRolePlaceholder}</Text>
        </TouchableOpacity>

        {form.role === "other" && (
          <TextInput  placeholderTextColor="#999" 
            value={form.customRole}
            onChangeText={(v)=>update("customRole",v)}
            style={styles.input}
          />
        )}

      </ScrollView>

      {picker.visible && (
        <View style={{
          position:"absolute",
          bottom:0,
          left:0,
          right:0,
          backgroundColor:"#fff",
          padding:20
        }}>
          <Text style={{ fontWeight:"bold" }}>{picker.title}</Text>

          <ScrollView style={{ maxHeight:250 }}>
            {picker.options.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={()=>{
                  update(picker.key, opt);
                  setPicker({ visible:false });
                }}
                style={{ padding:12 }}
              >
                <Text>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={()=>setPicker({ visible:false })}>
            <Text style={{ color:"#e74c3c" }}>{t.cancel}</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = {
  input:{borderWidth:1,borderColor:"#ddd",padding:12,borderRadius:10,marginBottom:12,background:"#fff"},
  select:{borderWidth:1,borderColor:"#ddd",padding:12,borderRadius:10,marginBottom:12,background:"#fff"}
};