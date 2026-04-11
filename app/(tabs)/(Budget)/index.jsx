import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useState, useEffect } from "react";
import { db } from "../../../database/db";
import { dbEvents } from "../../../events/events";
import { useLanguage } from "../../../context/languageContext";

export default function Budget() {

  const { t } = useLanguage(); // ✅ FIXED

  const [people, setPeople] = useState([]);
  const [descriptions, setDescriptions] = useState({});
  const [amounts, setAmounts] = useState({});

  const refreshPeople = () => {
    const result = db.getAllSync("SELECT * FROM people");
    setPeople(result);
  };

  useEffect(() => {
    refreshPeople();
    const listener = () => refreshPeople();
    dbEvents.on("dbUpdated", listener);
    return () => dbEvents.off("dbUpdated", listener);
  }, []);

  const getTotalExpenses = (personId) =>
    db.getFirstSync(
      "SELECT SUM(amount) as total FROM expenses WHERE personId=?",
      [personId]
    )?.total || 0;

  const addExpense = (personId, initial) => {
    const expense = Number(amounts[personId] || 0);

    if (isNaN(expense) || expense <= 0) {
      Alert.alert(t.invalidAmount, t.enterPositive);
      return;
    }

    const remaining = initial - getTotalExpenses(personId);

    if (expense > remaining) {
      Alert.alert(t.insufficientBudget, `${t.maxAllowed}: ${remaining} DA`);
      return;
    }

    db.runSync(
      "INSERT INTO expenses (personId,description,amount) VALUES (?,?,?)",
      [personId, descriptions[personId] || "", expense]
    );

    dbEvents.emit("dbUpdated");

    setDescriptions((prev) => ({ ...prev, [personId]: "" }));
    setAmounts((prev) => ({ ...prev, [personId]: "" }));
  };

  const getColor = (remaining, initial) => {
    const ratio = remaining / initial;
    if (ratio > 0.7) return "#2ecc71";
    if (ratio > 0.2) return "#e67e22";
    return "#e74c3c";
  };

  // ✅ EMPTY STATE IMPROVED
  if (people.length === 0) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:20 }}>
        <Text style={{ fontSize:16, color:"#777", textAlign:"center" }}>
          {t.noChildrenBudget || "Add children to manage their budgets"}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9f9f9" , paddingVertical:60}}>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        {people.map((item) => {

          const remaining = item.money - getTotalExpenses(item.id);

          return (
            <View
              key={item.id}
              style={{
                padding: 20,
                marginBottom: 20,
                backgroundColor: "#fff",
                borderRadius: 12,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 5,
                elevation: 2,
              }}
            >
              {/* NAME */}
              <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 5 }}>
                {item.name}
              </Text>

              {/* BUDGET */}
              <Text style={{ marginBottom: 10 }}>
                {t.initialBudget}: {item.money} DA —{" "}
                <Text style={{ color: getColor(remaining, item.money), fontWeight: "bold" }}>
                  {t.remaining}: {remaining} DA
                </Text>
              </Text>

              {/* DESCRIPTION */}
              <TextInput
              placeholderTextColor="#999"
                placeholder={t.expenseDescription}
                value={descriptions[item.id] || ""}
                onChangeText={(val) =>
                  setDescriptions((prev) => ({ ...prev, [item.id]: val }))
                }
                style={styles.input}
              />

              {/* AMOUNT */}
              <TextInput
              placeholderTextColor="#999"
                placeholder={t.amount}
                keyboardType="numeric"
                value={amounts[item.id] || ""}
                onChangeText={(val) =>
                  setAmounts((prev) => ({ ...prev, [item.id]: val }))
                }
                style={styles.input}
              />

              {/* BUTTON */}
              <TouchableOpacity
                onPress={() => addExpense(item.id, item.money)}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {t.add}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = {
  input:{
    borderWidth:1,
    borderColor:"#ddd",
    padding:10,
    borderRadius:8,
    marginBottom:10
  },
  button:{
    backgroundColor:"#3498db",
    paddingVertical:12,
    borderRadius:8,
    alignItems:"center"
  },
  buttonText:{
    color:"#fff",
    fontWeight:"bold"
  }
};