import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext"; // ✅

export default function PersonInventory() {

  const { id } = useLocalSearchParams();
  const { t } = useLanguage(); // ✅

  const [person, setPerson] = useState(null);
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState(0);

  const refreshData = () => {

    const p = db.getFirstSync("SELECT * FROM people WHERE id=?", [id]);
    setPerson(p || null); // ✅ FIXED

    const allItems = db.getAllSync("SELECT * FROM items");
    setItems(allItems);

    const inv = db.getAllSync(
      "SELECT inventory.id as inventoryId, inventory.quantity, inventory.itemId, items.name FROM inventory JOIN items ON inventory.itemId = items.id WHERE personId=?",
      [id]
    );
    setInventory(inv);

    const totalExpenses = db.getFirstSync(
      "SELECT SUM(amount) as total FROM expenses WHERE personId=?",
      [id]
    )?.total || 0; // ✅ FIXED

    setExpenses(totalExpenses);
  };

  useEffect(() => {
    refreshData();
    const listener = () => refreshData();
    dbEvents.on("dbUpdated", listener);
    return () => dbEvents.off("dbUpdated", listener);
  }, []);

  if (!person) {
    return <Text style={{ padding: 20 }}>Person not found</Text>;
  }

  const remaining = person.money - expenses;

  const getColor = (remaining, initial) => {
    const ratio = remaining / initial;
    if (ratio > 0.7) return "#2ecc71";
    if (ratio > 0.2) return "#e67e22";
    return "#e74c3c";
  };

  const addItem = (itemId) => {

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

    dbEvents.emit("dbUpdated");
  };

  const removeOne = (inventoryId, quantity) => {

    if (quantity <= 1) {
      Alert.alert(
        t.delete,
        t.confirmDeleteItem || "Remove item?",
        [
          { text: t.cancel, style: "cancel" },
          {
            text: t.delete,
            style: "destructive",
            onPress: () => {
              db.runSync("DELETE FROM inventory WHERE id=?", [inventoryId]);
              dbEvents.emit("dbUpdated");
            },
          },
        ]
      );
    } else {
      db.runSync(
        "UPDATE inventory SET quantity = quantity - 1 WHERE id=?",
        [inventoryId]
      );
      dbEvents.emit("dbUpdated");
    }
  };

  const deleteItem = (inventoryId) => {

    Alert.alert(
      t.delete,
      t.confirmDeleteItem || "Remove item completely?",
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
          style: "destructive",
          onPress: () => {
            db.runSync("DELETE FROM inventory WHERE id=?", [inventoryId]);
            dbEvents.emit("dbUpdated");
          },
        },
      ]
    );
  };

  return (

<SafeAreaView style={{ flex:1, backgroundColor:"#f9f9f9" }}>

<ScrollView contentContainerStyle={{ padding:20 }}>

  {/* PERSON INFO */}
  <View style={styles.card}>
    <Text style={styles.title}>{person.name}</Text>

    <Text style={styles.text}>
      {t.birthDate}: {person.birthDate}
    </Text>

    <Text style={styles.text}>
      {t.initialBudget}: {person.money} DA
    </Text>

    <Text style={{ color:getColor(remaining, person.money), fontWeight:"bold" }}>
      {t.remaining}: {remaining} DA
    </Text>
  </View>

  {/* INVENTORY */}
  <Text style={styles.section}>{t.inventory}</Text>

  {inventory.length === 0 ? (
    <Text style={styles.empty}>{t.noItems}</Text>
  ) : (
    <View style={{ marginBottom:20 }}>
      {inventory.map(item => (
        <View key={item.inventoryId} style={styles.itemRow}>

          <Text style={{ flex:1 }}>
            {item.name} — {t.quantity}: {item.quantity}
          </Text>

          <View style={{ flexDirection:"row" }}>
            <TouchableOpacity onPress={()=>removeOne(item.inventoryId,item.quantity)}>
              <MaterialIcons name="remove" size={20} color="orange"/>
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>deleteItem(item.inventoryId)}>
              <MaterialIcons name="delete" size={20} color="red"/>
            </TouchableOpacity>
          </View>

        </View>
      ))}
    </View>
  )}

  {/* ADD ITEM */}
  <Text style={styles.section}>
    {t.addItem}
  </Text>

  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {items.map(item => (
      <TouchableOpacity
        key={item.id}
        onPress={()=>addItem(item.id)}
        style={styles.itemButton}
      >
        <Text style={styles.itemText}>{item.name}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

</ScrollView>
</SafeAreaView>
  );
}

const styles = {
  card:{padding:20,backgroundColor:"#fff",borderRadius:12,marginBottom:20},
  title:{fontSize:22,fontWeight:"bold"},
  text:{color:"#555"},
  section:{fontWeight:"bold",fontSize:16,marginBottom:10},
  empty:{color:"#888"},
  itemRow:{flexDirection:"row",justifyContent:"space-between",padding:12,backgroundColor:"#fff",borderRadius:10,marginBottom:8},
  itemButton:{paddingVertical:12,paddingHorizontal:18,marginRight:10,backgroundColor:"#3498db",borderRadius:8},
  itemText:{color:"#fff",fontWeight:"bold"}
};