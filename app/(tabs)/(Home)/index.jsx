import { View, Text, Pressable, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useLanguage } from "../../../context/languageContext";
import { SafeAreaView } from "react-native-safe-area-context";

const Index = () => {

  const { t, changeLanguage, lang } = useLanguage();

  const openLanguageSelector = () => {
    Alert.alert(
      t.language,
      t.chooseLanguage,
      [
        { text: "English", onPress: () => changeLanguage("en") },
        { text: "Français", onPress: () => changeLanguage("fr") },
        { text: "العربية", onPress: () => changeLanguage("ar") }
      ]
    );
  };

  const isRTL = lang === "ar";

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:"#f9f9f9" }}>

      {/* LANGUAGE ICON */}
      <TouchableOpacity
        onPress={openLanguageSelector}
        style={{
          position:"absolute",
          top:40,
          right:40,
          zIndex:10
        }}
      >
        <MaterialIcons name="language" size={26} color="#3498db" />
      </TouchableOpacity>

      <View
        style={{
          flex:1,
          padding:20,
          justifyContent:"center"
        }}
      >

        {/* TITLE */}
        <Text
          style={{
            fontSize:26,
            fontWeight:"bold",
            textAlign:"center",
            marginBottom:40,
            color:"#2c3e50"
          }}
        >
          {t.selectModule || "Select Module"}
        </Text>

        {/* CAMP */}
        <Pressable
          onPress={()=> router.push('./(Camp)')}
          style={styles.card}
        >
          <MaterialIcons name="terrain" size={28} color="#3498db" />

          <View style={{ marginLeft:15, flex:1 }}>
            <Text style={styles.title}>{t.camp || "Camp"}</Text>
            <Text style={styles.subtitle}>
              {t.campDesc || "Manage camp structure & program"}
            </Text>
          </View>
        </Pressable>

        {/* CHILD */}
        <Pressable
          onPress={()=> router.push('./(Child)')}
          style={styles.card}
        >
          <MaterialIcons name="child-care" size={28} color="#2ecc71" />

          <View style={{ marginLeft:15, flex:1 }}>
            <Text style={styles.title}>{t.child || "Child"}</Text>
            <Text style={styles.subtitle}>
              {t.childDesc || "Manage children & inventory"}
            </Text>
          </View>
        </Pressable>

        {/* MENTOR */}
        <Pressable
          onPress={()=> router.push('./(Mentor)')}
          style={styles.card}
        >
          <MaterialIcons name="supervisor-account" size={28} color="#e67e22" />

          <View style={{ marginLeft:15, flex:1 }}>
            <Text style={styles.title}>{t.mentor || "Mentor"}</Text>
            <Text style={styles.subtitle}>
              {t.mentorDesc || "Mentor tools & management"}
            </Text>
          </View>
        </Pressable>

      </View>
    </SafeAreaView>
  );
};

export default Index;

const styles = {
  card:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#fff",
    padding:18,
    borderRadius:14,
    marginBottom:20,

    shadowColor:"#000",
    shadowOpacity:0.05,
    shadowRadius:6,
    elevation:3
  },

  title:{
    fontSize:16,
    fontWeight:"bold",
    color:"#2c3e50"
  },

  subtitle:{
    color:"#7f8c8d",
    marginTop:3,
    fontSize:13
  }
};