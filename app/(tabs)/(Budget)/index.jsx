import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from "react-native";

import { useState, useEffect } from "react";

import { db } from "../../../database/db";
import { dbEvents } from "../../../events/events";
import { useLanguage } from "../../../context/languageContext";

export default function Budget() {

  const { t } = useLanguage();

  const [people, setPeople] = useState([]);
  const [descriptions, setDescriptions] = useState({});
  const [amounts, setAmounts] = useState({});
  const [expenses, setExpenses] = useState({});


  // =========================================================
  // LOAD PEOPLE + EXPENSES
  // =========================================================

  const refreshPeople = () => {

    const result = db.getAllSync(
      "SELECT * FROM people"
    );

    setPeople(result);

    const expenseData = {};

    result.forEach(person => {

      expenseData[person.id] = db.getAllSync(
        `SELECT *
         FROM expenses
         WHERE personId=?
         ORDER BY id DESC`,
        [person.id]
      );

    });

    setExpenses(expenseData);
  };


  useEffect(() => {

    refreshPeople();

    const listener = () => refreshPeople();

    dbEvents.on("dbUpdated", listener);

    return () => {
      dbEvents.off("dbUpdated", listener);
    };

  }, []);


  // =========================================================
  // TOTAL EXPENSES
  // =========================================================

  const getTotalExpenses = (personId) => {

    return db.getFirstSync(
      `SELECT SUM(amount) as total
       FROM expenses
       WHERE personId=?`,
      [personId]
    )?.total || 0;

  };


  // =========================================================
  // ADD EXPENSE
  // =========================================================

  const addExpense = (personId, initial) => {

    const description =
      descriptions[personId]?.trim() || "";

    const expense =
      Number(amounts[personId] || 0);


    // Invalid amount

    if (isNaN(expense) || expense <= 0) {

      Alert.alert(
        t.invalidAmount,
        t.enterPositive
      );

      return;
    }


    // Remaining budget

    const remaining =
      initial - getTotalExpenses(personId);


    // Not enough money

    if (expense > remaining) {

      Alert.alert(
        t.insufficientBudget,
        `${t.maxAllowed}: ${remaining} DA`
      );

      return;
    }


    // Insert expense

    db.runSync(
      `INSERT INTO expenses
       (personId, description, amount)
       VALUES (?, ?, ?)`,
      [
        personId,
        description,
        expense
      ]
    );


    // Clear inputs

    setDescriptions(prev => ({
      ...prev,
      [personId]: ""
    }));

    setAmounts(prev => ({
      ...prev,
      [personId]: ""
    }));


    // Refresh UI

    dbEvents.emit("dbUpdated");

  };


  // =========================================================
  // COLOR
  // =========================================================

  const getColor = (remaining, initial) => {

    const ratio =
      initial > 0
        ? remaining / initial
        : 0;

    if (ratio > 0.7) {
      return "#2ecc71";
    }

    if (ratio > 0.2) {
      return "#e67e22";
    }

    return "#e74c3c";
  };


  // =========================================================
  // EMPTY STATE
  // =========================================================

  if (people.length === 0) {

    return (

      <View
        style={{
          flex: 1,
          backgroundColor: "#f9f9f9",
          paddingVertical: 60
        }}
      >

        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 80
          }}
        >

          {/* HEADER */}

          <Text style={styles.title}>
            {t.budget || t.expenses || "Budget"}
          </Text>

          <Text style={styles.subtitle}>
            {t.budgetDescription ||
              "Manage each child's budget and track their expenses."}
          </Text>


          {/* EMPTY STATE */}

          <View style={styles.emptyContainer}>

            <Text style={styles.emptyText}>
              {t.noChildrenBudget ||
                "Add children to manage their budgets"}
            </Text>

          </View>

        </ScrollView>

      </View>

    );
  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <View
      style={styles.container}
    >

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ===================================================
            PAGE HEADER
        =================================================== */}

        <Text style={styles.title}>
          {t.budget || t.expenses || "Budget"}
        </Text>

        <Text style={styles.subtitle}>
          {t.budgetDescription ||
            "Manage each child's budget and track their expenses."}
        </Text>


        {/* ===================================================
            CHILDREN
        =================================================== */}

        {people.map(item => {

          const remaining =
            item.money -
            getTotalExpenses(item.id);

          const personExpenses =
            expenses[item.id] || [];


          return (

            <View
              key={item.id}
              style={styles.card}
            >

              {/* =========================================
                  NAME
              ========================================= */}

              <Text style={styles.name}>
                {item.name}
              </Text>


              {/* =========================================
                  BUDGET
              ========================================= */}

              <Text style={styles.budget}>

                {t.initialBudget}: {item.money} DA

                {" — "}

                <Text
                  style={{
                    color: getColor(
                      remaining,
                      item.money
                    ),
                    fontWeight: "bold"
                  }}
                >
                  {t.remaining}: {remaining} DA
                </Text>

              </Text>


              {/* =========================================
                  ADD EXPENSE
              ========================================= */}

              <TextInput
                placeholderTextColor="#999"
                placeholder={t.expenseDescription}
                value={
                  descriptions[item.id] || ""
                }
                onChangeText={val =>
                  setDescriptions(prev => ({
                    ...prev,
                    [item.id]: val
                  }))
                }
                style={styles.input}
              />


              <TextInput
                placeholderTextColor="#999"
                placeholder={t.amount}
                keyboardType="numeric"
                value={
                  amounts[item.id] || ""
                }
                onChangeText={val =>
                  setAmounts(prev => ({
                    ...prev,
                    [item.id]: val
                  }))
                }
                style={styles.input}
              />


              <TouchableOpacity
                onPress={() =>
                  addExpense(
                    item.id,
                    item.money
                  )
                }
                style={styles.button}
              >

                <Text style={styles.buttonText}>
                  {t.add}
                </Text>

              </TouchableOpacity>


              {/* =========================================
                  EXPENSE HISTORY
              ========================================= */}

              {personExpenses.length > 0 && (

                <View style={styles.history}>

                  <Text style={styles.historyTitle}>
                    {t.expenses || "Expenses"}
                  </Text>


                  {personExpenses.map(expense => (

                    <View
                      key={expense.id}
                      style={styles.expenseRow}
                    >

                      {/* DESCRIPTION */}

                      <View
                        style={{
                          flex: 1,
                          paddingRight: 10
                        }}
                      >

                        <Text
                          style={
                            styles.expenseDescription
                          }
                        >
                          {expense.description ||
                            t.noDescription ||
                            "No description"}
                        </Text>

                      </View>


                      {/* AMOUNT */}

                      <Text style={styles.expenseAmount}>
                        -{expense.amount} DA
                      </Text>

                    </View>

                  ))}


                  {/* TOTAL */}

                  <View style={styles.totalRow}>

                    <Text style={styles.totalText}>
                      {t.total || "Total"}
                    </Text>

                    <Text style={styles.totalAmount}>
                      -{getTotalExpenses(item.id)} DA
                    </Text>

                  </View>

                </View>

              )}

            </View>

          );

        })}

      </ScrollView>

    </View>

  );
}


// =========================================================
// STYLES
// =========================================================

const styles = {

  // =======================================================
  // PAGE
  // =======================================================

  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingVertical: 60
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 80
  },


  // =======================================================
  // PAGE HEADER
  // =======================================================

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#2c3e50"
  },

  subtitle: {
    color: "#7f8c8d",
    marginBottom: 20
  },


  // =======================================================
  // CHILD CARD
  // =======================================================

  card: {
    padding: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    elevation: 2
  },

  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#2c3e50"
  },

  budget: {
    marginBottom: 15,
    color: "#555"
  },


  // =======================================================
  // INPUTS
  // =======================================================

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff"
  },


  // =======================================================
  // BUTTON
  // =======================================================

  button: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold"
  },


  // =======================================================
  // EXPENSE HISTORY
  // =======================================================

  history: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee"
  },

  historyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2c3e50"
  },

  expenseRow: {
    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 10,

    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },

  expenseDescription: {
    fontSize: 14,
    color: "#555"
  },

  expenseAmount: {
    fontWeight: "bold",
    color: "#e74c3c"
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",

    marginTop: 12,
    paddingTop: 10,

    borderTopWidth: 1,
    borderTopColor: "#ddd"
  },

  totalText: {
    fontWeight: "bold",
    color: "#2c3e50"
  },

  totalAmount: {
    fontWeight: "bold",
    color: "#e74c3c"
  },


  // =======================================================
  // EMPTY STATE
  // =======================================================

  emptyContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    elevation: 2,

    alignItems: "center",
    justifyContent: "center"
  },

  emptyText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center"
  }

};