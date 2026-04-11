import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { db } from "../../../database/db";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { dbEvents } from "../../../events/events";
import { useLanguage } from "../../../context/languageContext";

export default function PersonInventory() {

  const { id } = useLocalSearchParams();

  const { t, changeLanguage } = useLanguage(); // ✅ GLOBAL LANGUAGE

  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");

  const loadItems = () => {
    const result = db.getAllSync("SELECT * FROM items");
    setItems(result);
  };

  // ✅ AUTO REFRESH ON DB CHANGE
  useEffect(() => {
    loadItems();

    const listener = () => loadItems();
    dbEvents.on("dbUpdated", listener);

    return () => dbEvents.off("dbUpdated", listener);
  }, []);


  const addItemToDB = () => {

    if (!newItemName.trim()) {
      Alert.alert(t.emptyName, t.enterItemName);
      return;
    }

    try {
      db.runSync(
        "INSERT INTO items (name) VALUES (?)",
        [newItemName.trim()]
      );

      setNewItemName("");

      dbEvents.emit("dbUpdated"); // ✅ notify all screens

    } catch (err) {

      Alert.alert(
        t.duplicateItem,
        `${newItemName} ${t.alreadyExists}`
      );

    }
  };

  const addItemToPerson = (itemId) => {

    const existing = db.getFirstSync(
      "SELECT * FROM inventory WHERE personId=? AND itemId=?",
      [id, itemId]
    );

    if (existing) {
      db.runSync(
        "UPDATE inventory SET quantity = quantity + 1 WHERE id=?",
        [existing.id]
      );
    } else {
      db.runSync(
        "INSERT INTO inventory (personId,itemId,quantity) VALUES (?,?,1)",
        [id, itemId]
      );
    }

    dbEvents.emit("dbUpdated"); // ✅ important
  };

  return (

<View style={{flex:1,padding:20,backgroundColor:"#f9f9f9",paddingVertical:80}}>

 
  {/* ADD ITEM */}
  <View style={{
    marginBottom:20,
    backgroundColor:"#fff",
    padding:15,
    borderRadius:10,
    elevation:2
  }}>

    <Text style={{fontWeight:"bold",marginBottom:10}}>
      {t.addNewItem}
    </Text>

    <TextInput
    placeholderTextColor="#999"
      placeholder={t.itemName}
      value={newItemName}
      onChangeText={setNewItemName}
      style={{
        borderWidth:1,
        borderColor:"#ccc",
        borderRadius:8,
        padding:10,
        marginBottom:10
      }}
    />

    <TouchableOpacity
      onPress={addItemToDB}
      style={{
        backgroundColor:"#3498db",
        paddingVertical:12,
        borderRadius:8,
        alignItems:"center"
      }}
    >
      <Text style={{color:"#fff",fontWeight:"bold"}}>
        {t.addItem}
      </Text>
    </TouchableOpacity>

  </View>

  {/* ITEMS */}
  <Text style={{fontWeight:"bold",fontSize:16,marginBottom:10}}>
    {t.availableItems}
  </Text>

  <FlatList
    data={items}
    numColumns={3}
    keyExtractor={(i)=>i.id.toString()}
    renderItem={({item})=>(

      <TouchableOpacity
        onPress={()=>addItemToPerson(item.id)}
        style={{
          flex:1,
          margin:5,
          backgroundColor:"#fff",
          borderRadius:8,
          padding:15,
          alignItems:"center",
          justifyContent:"center",
          elevation:2
        }}
      >
        <Text style={{textAlign:"center",fontWeight:"500"}}>
          {item.name}
        </Text>
      </TouchableOpacity>

    )}
  />

</View>

  );
}