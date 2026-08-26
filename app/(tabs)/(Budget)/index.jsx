import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from "react-native";

import { useState, useEffect } from "react";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
  // EDITING STATE
  // =========================================================

  const [editingExpense, setEditingExpense] = useState(null);

  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");


  // =========================================================
  // LOAD PEOPLE + EXPENSES
  // =========================================================

  const refreshPeople = () => {

    try {

      const result = db.getAllSync(
        "SELECT * FROM people ORDER BY name ASC"
      );

      setPeople(result);

      const expenseData = {};

      result.forEach(person => {

        expenseData[person.id] =
          db.getAllSync(
            `
            SELECT *
            FROM expenses
            WHERE personId=?
            ORDER BY id DESC
            `,
            [person.id]
          );

      });

      setExpenses(expenseData);

    } catch (error) {

      console.error(
        "Error loading budget data:",
        error
      );

    }

  };


  // =========================================================
  // AUTO REFRESH
  // =========================================================

  useEffect(() => {

    refreshPeople();

    const listener = () =>
      refreshPeople();

    dbEvents.on(
      "dbUpdated",
      listener
    );

    return () => {

      dbEvents.off(
        "dbUpdated",
        listener
      );

    };

  }, []);


  // =========================================================
  // TOTAL EXPENSES
  // =========================================================

  const getTotalExpenses = (
    personId,
    excludeExpenseId = null
  ) => {

    let query = `
      SELECT SUM(amount) as total
      FROM expenses
      WHERE personId=?
    `;

    const params = [personId];

    if (excludeExpenseId !== null) {

      query += `
        AND id != ?
      `;

      params.push(
        excludeExpenseId
      );

    }

    return (
      db.getFirstSync(
        query,
        params
      )?.total || 0
    );

  };


  // =========================================================
  // ADD EXPENSE
  // =========================================================

  const addExpense = (
    personId,
    initial
  ) => {

    const description =
      descriptions[personId]?.trim() || "";

    const expense =
      Number(
        amounts[personId] || 0
      );


    // -------------------------------------------------------
    // VALIDATE AMOUNT
    // -------------------------------------------------------

    if (
      isNaN(expense) ||
      expense <= 0
    ) {

      Alert.alert(
        t.invalidAmount,
        t.enterPositive
      );

      return;
    }


    // -------------------------------------------------------
    // CHECK REMAINING BUDGET
    // -------------------------------------------------------

    const remaining =
      initial -
      getTotalExpenses(personId);


    if (expense > remaining) {

      Alert.alert(
        t.insufficientBudget,
        `${t.maxAllowed}: ${remaining} DA`
      );

      return;
    }


    // -------------------------------------------------------
    // INSERT
    // -------------------------------------------------------

    try {

      db.runSync(
        `
        INSERT INTO expenses
        (
          personId,
          description,
          amount
        )
        VALUES (?, ?, ?)
        `,
        [
          personId,
          description,
          expense
        ]
      );


      // -----------------------------------------------------
      // CLEAR INPUTS
      // -----------------------------------------------------

      setDescriptions(prev => ({
        ...prev,
        [personId]: ""
      }));

      setAmounts(prev => ({
        ...prev,
        [personId]: ""
      }));


      // -----------------------------------------------------
      // REFRESH
      // -----------------------------------------------------

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Add expense error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not add expense."
      );

    }

  };


  // =========================================================
  // START EDITING EXPENSE
  // =========================================================

  const startEditExpense = (
    expense
  ) => {

    setEditingExpense(
      expense.id
    );

    setEditDescription(
      expense.description || ""
    );

    setEditAmount(
      String(expense.amount)
    );

  };


  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const cancelEdit = () => {

    setEditingExpense(
      null
    );

    setEditDescription(
      ""
    );

    setEditAmount(
      ""
    );

  };


  // =========================================================
  // UPDATE EXPENSE
  // =========================================================

  const updateExpense = (
    expense,
    initial
  ) => {

    const description =
      editDescription.trim();

    const amount =
      Number(editAmount);


    // -------------------------------------------------------
    // VALIDATE AMOUNT
    // -------------------------------------------------------

    if (
      isNaN(amount) ||
      amount <= 0
    ) {

      Alert.alert(
        t.invalidAmount,
        t.enterPositive
      );

      return;
    }


    // -------------------------------------------------------
    // CALCULATE BUDGET WITHOUT OLD EXPENSE
    // -------------------------------------------------------

    const otherExpenses =
      getTotalExpenses(
        expense.personId,
        expense.id
      );

    const remainingWithoutCurrent =
      initial -
      otherExpenses;


    // -------------------------------------------------------
    // CHECK BUDGET
    // -------------------------------------------------------

    if (
      amount >
      remainingWithoutCurrent
    ) {

      Alert.alert(
        t.insufficientBudget,
        `${t.maxAllowed}: ${remainingWithoutCurrent} DA`
      );

      return;
    }


    // -------------------------------------------------------
    // UPDATE DATABASE
    // -------------------------------------------------------

    try {

      db.runSync(
        `
        UPDATE expenses
        SET
          description=?,
          amount=?
        WHERE id=?
        `,
        [
          description,
          amount,
          expense.id
        ]
      );


      // -----------------------------------------------------
      // EXIT EDIT MODE
      // -----------------------------------------------------

      cancelEdit();


      // -----------------------------------------------------
      // REFRESH
      // -----------------------------------------------------

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Update expense error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not update expense."
      );

    }

  };


  // =========================================================
  // DELETE EXPENSE
  // =========================================================

  const deleteExpense = (
    expense
  ) => {

    Alert.alert(
      t.deleteExpense ||
        "Delete expense",

      t.deleteExpenseConfirm ||
        "Are you sure you want to delete this expense?",

      [
        {
          text:
            t.cancel ||
            "Cancel",

          style: "cancel"
        },

        {
          text:
            t.delete ||
            "Delete",

          style: "destructive",

          onPress: () => {

            try {

              db.runSync(
                `
                DELETE FROM expenses
                WHERE id=?
                `,
                [expense.id]
              );


              // ------------------------------------------------
              // If this expense was being edited
              // ------------------------------------------------

              if (
                editingExpense ===
                expense.id
              ) {

                cancelEdit();

              }


              // ------------------------------------------------
              // Refresh
              // ------------------------------------------------

              dbEvents.emit(
                "dbUpdated"
              );

            } catch (error) {

              console.error(
                "Delete expense error:",
                error
              );

              Alert.alert(
                "Error",
                "Could not delete expense."
              );

            }

          }

        }

      ]

    );

  };


  // =========================================================
  // BUDGET COLOR
  // =========================================================

  const getColor = (
    remaining,
    initial
  ) => {

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

  if (
    people.length === 0
  ) {

    return (

      <View
        style={styles.container}
      >

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >

          {/* HEADER */}

          <Text
            style={styles.title}
          >
            {
              t.budget ||
              t.expenses ||
              "Budget"
            }
          </Text>

          <Text
            style={styles.subtitle}
          >
            {
              t.budgetDescription ||
              "Manage each child's budget and track their expenses."
            }
          </Text>


          {/* EMPTY STATE */}

          <View
            style={
              styles.emptyContainer
            }
          >

            <MaterialIcons
              name="account-balance-wallet"
              size={42}
              color="#bbb"
            />

            <Text
              style={styles.emptyText}
            >
              {
                t.noChildrenBudget ||
                "Add children to manage their budgets"
              }
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
        contentContainerStyle={
          styles.scrollContent
        }

        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ===================================================
            PAGE HEADER
        =================================================== */}

        <Text
          style={styles.title}
        >
          {
            t.budget ||
            t.expenses ||
            "Budget"
          }
        </Text>

        <Text
          style={styles.subtitle}
        >
          {
            t.budgetDescription ||
            "Manage each child's budget and track their expenses."
          }
        </Text>


        {/* ===================================================
            CHILDREN
        =================================================== */}

        {people.map(item => {

          const totalExpenses =
            getTotalExpenses(
              item.id
            );

          const remaining =
            item.money -
            totalExpenses;

          const personExpenses =
            expenses[item.id] || [];


          return (

            <View
              key={item.id}
              style={styles.card}
            >

              {/* =========================================
                  CHILD HEADER
              ========================================= */}

              <View
                style={
                  styles.childHeader
                }
              >

                <View
                  style={
                    styles.avatar
                  }
                >

                  <MaterialIcons
                    name="person"
                    size={24}
                    color="#3498db"
                  />

                </View>

                <View
                  style={
                    styles.childHeaderText
                  }
                >

                  <Text
                    style={styles.name}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={
                      styles.budget
                    }
                  >

                    {t.initialBudget}:{" "}
                    {item.money} DA

                  </Text>

                </View>

              </View>


              {/* =========================================
                  REMAINING BUDGET
              ========================================= */}

              <View
                style={
                  styles.remainingContainer
                }
              >

                <View>

                  <Text
                    style={
                      styles.remainingLabel
                    }
                  >
                    {t.remaining}
                  </Text>

                  <Text
                    style={[
                      styles.remainingAmount,
                      {
                        color:
                          getColor(
                            remaining,
                            item.money
                          )
                      }
                    ]}
                  >
                    {remaining} DA
                  </Text>

                </View>


                <View
                  style={
                    styles.totalSpentContainer
                  }
                >

                  <Text
                    style={
                      styles.remainingLabel
                    }
                  >
                    {
                      t.total ||
                      "Total"
                    }
                  </Text>

                  <Text
                    style={
                      styles.totalSpent
                    }
                  >
                    {totalExpenses} DA
                  </Text>

                </View>

              </View>


              {/* =========================================
                  ADD EXPENSE SECTION
              ========================================= */}

              <View
                style={
                  styles.addExpenseHeader
                }
              >

                <MaterialIcons
                  name="add-card"
                  size={20}
                  color="#3498db"
                />

                <Text
                  style={
                    styles.addExpenseTitle
                  }
                >
                  {
                    t.add ||
                    "Add expense"
                  }
                </Text>

              </View>


              <TextInput
                placeholderTextColor="#999"

                placeholder={
                  t.expenseDescription ||
                  "Description"
                }

                value={
                  descriptions[
                    item.id
                  ] || ""
                }

                onChangeText={val =>
                  setDescriptions(
                    prev => ({
                      ...prev,
                      [item.id]:
                        val
                    })
                  )
                }

                style={
                  styles.input
                }
              />


              <TextInput
                placeholderTextColor="#999"

                placeholder={
                  t.amount ||
                  "Amount"
                }

                keyboardType="numeric"

                value={
                  amounts[
                    item.id
                  ] || ""
                }

                onChangeText={val =>
                  setAmounts(
                    prev => ({
                      ...prev,
                      [item.id]:
                        val
                    })
                  )
                }

                style={
                  styles.input
                }
              />


              <TouchableOpacity
                onPress={() =>
                  addExpense(
                    item.id,
                    item.money
                  )
                }

                activeOpacity={0.8}

                style={
                  styles.button
                }
              >

                <MaterialIcons
                  name="add"
                  size={20}
                  color="#fff"
                />

                <Text
                  style={
                    styles.buttonText
                  }
                >
                  {t.add}
                </Text>

              </TouchableOpacity>


              {/* =========================================
                  EXPENSE HISTORY
              ========================================= */}

              {personExpenses.length > 0 && (

                <View
                  style={
                    styles.history
                  }
                >

                  <Text
                    style={
                      styles.historyTitle
                    }
                  >
                    {
                      t.expenses ||
                      "Expenses"
                    }
                  </Text>


                  {personExpenses.map(
                    expense => {

                      const isEditing =
                        editingExpense ===
                        expense.id;


                      // ==================================
                      // EDIT MODE
                      // ==================================

                      if (isEditing) {

                        return (

                          <View
                            key={
                              expense.id
                            }

                            style={
                              styles.editContainer
                            }
                          >

                            <TextInput
                              placeholderTextColor="#999"

                              placeholder={
                                t.expenseDescription ||
                                "Description"
                              }

                              value={
                                editDescription
                              }

                              onChangeText={
                                setEditDescription
                              }

                              style={
                                styles.editInput
                              }
                            />


                            <TextInput
                              placeholderTextColor="#999"

                              placeholder={
                                t.amount ||
                                "Amount"
                              }

                              keyboardType="numeric"

                              value={
                                editAmount
                              }

                              onChangeText={
                                setEditAmount
                              }

                              style={
                                styles.editInput
                              }
                            />


                            <View
                              style={
                                styles.editActions
                              }
                            >

                              <TouchableOpacity
                                onPress={() =>
                                  updateExpense(
                                    expense,
                                    item.money
                                  )
                                }

                                style={
                                  styles.saveButton
                                }
                              >

                                <MaterialIcons
                                  name="check"
                                  size={19}
                                  color="#fff"
                                />

                                <Text
                                  style={
                                    styles.buttonText
                                  }
                                >
                                  {
                                    t.save ||
                                    "Save"
                                  }
                                </Text>

                              </TouchableOpacity>


                              <TouchableOpacity
                                onPress={
                                  cancelEdit
                                }

                                style={
                                  styles.cancelButton
                                }
                              >

                                <MaterialIcons
                                  name="close"
                                  size={19}
                                  color="#555"
                                />

                                <Text
                                  style={
                                    styles.cancelButtonText
                                  }
                                >
                                  {
                                    t.cancel ||
                                    "Cancel"
                                  }
                                </Text>

                              </TouchableOpacity>

                            </View>

                          </View>

                        );

                      }


                      // ==================================
                      // NORMAL EXPENSE ROW
                      // ==================================

                      return (

                        <View
                          key={
                            expense.id
                          }

                          style={
                            styles.expenseRow
                          }
                        >

                          {/* DESCRIPTION */}

                          <View
                            style={
                              styles.expenseInfo
                            }
                          >

                            <Text
                              style={
                                styles.expenseDescription
                              }
                            >
                              {
                                expense.description ||
                                t.noDescription ||
                                "No description"
                              }
                            </Text>

                            <Text
                              style={
                                styles.expenseAmount
                              }
                            >
                              -{expense.amount} DA
                            </Text>

                          </View>


                          {/* ACTIONS */}

                          <View
                            style={
                              styles.expenseActions
                            }
                          >

                            <TouchableOpacity
                              onPress={() =>
                                startEditExpense(
                                  expense
                                )
                              }

                              style={
                                styles.iconButton
                              }
                            >

                              <MaterialIcons
                                name="edit"
                                size={20}
                                color="#3498db"
                              />

                            </TouchableOpacity>


                            <TouchableOpacity
                              onPress={() =>
                                deleteExpense(
                                  expense
                                )
                              }

                              style={
                                styles.iconButton
                              }
                            >

                              <MaterialIcons
                                name="delete-outline"
                                size={21}
                                color="#e74c3c"
                              />

                            </TouchableOpacity>

                          </View>

                        </View>

                      );

                    }
                  )}


                  {/* =====================================
                      TOTAL
                  ===================================== */}

                  <View
                    style={
                      styles.totalRow
                    }
                  >

                    <Text
                      style={
                        styles.totalText
                      }
                    >
                      {
                        t.total ||
                        "Total"
                      }
                    </Text>

                    <Text
                      style={
                        styles.totalAmount
                      }
                    >
                      -{totalExpenses} DA
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
    marginBottom: 20,
    lineHeight: 20
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
    shadowOffset: {
      width: 0,
      height: 2
    },

    elevation: 2
  },


  // =======================================================
  // CHILD HEADER
  // =======================================================

  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,

    backgroundColor: "#eef7fd",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 11
  },

  childHeaderText: {
    flex: 1
  },

  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 3
  },

  budget: {
    color: "#555",
    fontSize: 13
  },


  // =======================================================
  // REMAINING BUDGET
  // =======================================================

  remainingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    padding: 14,

    borderRadius: 10,

    backgroundColor: "#f8f9fa",

    marginBottom: 18
  },

  remainingLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 3
  },

  remainingAmount: {
    fontSize: 19,
    fontWeight: "bold"
  },

  totalSpentContainer: {
    alignItems: "flex-end"
  },

  totalSpent: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e74c3c"
  },


  // =======================================================
  // ADD EXPENSE
  // =======================================================

  addExpenseHeader: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 10
  },

  addExpenseTitle: {
    marginLeft: 7,
    fontSize: 15,
    fontWeight: "bold",
    color: "#2c3e50"
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

    backgroundColor: "#fff",

    fontSize: 14
  },


  // =======================================================
  // ADD BUTTON
  // =======================================================

  button: {
    backgroundColor: "#3498db",

    paddingVertical: 12,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row",

    gap: 7
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


  // =======================================================
  // EXPENSE ROW
  // =======================================================

  expenseRow: {
    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 11,

    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },

  expenseInfo: {
    flex: 1,
    paddingRight: 10
  },

  expenseDescription: {
    fontSize: 14,
    color: "#555"
  },

  expenseAmount: {
    fontWeight: "bold",
    color: "#e74c3c",
    fontSize: 14
  },


  // =======================================================
  // EXPENSE ACTIONS
  // =======================================================

  expenseActions: {
    flexDirection: "row",
    alignItems: "center"
  },

  iconButton: {
    width: 38,
    height: 38,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#f8f9fa",

    marginLeft: 5
  },


  // =======================================================
  // EDIT CONTAINER
  // =======================================================

  editContainer: {
    paddingVertical: 10,

    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },

  editInput: {
    borderWidth: 1,
    borderColor: "#ddd",

    padding: 10,

    borderRadius: 8,

    marginBottom: 8,

    backgroundColor: "#fff",

    fontSize: 14
  },

  editActions: {
    flexDirection: "row",
    gap: 8
  },

  saveButton: {
    flex: 1,

    backgroundColor: "#2ecc71",

    paddingVertical: 10,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row",

    gap: 5
  },

  cancelButton: {
    flex: 1,

    backgroundColor: "#eee",

    paddingVertical: 10,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row",

    gap: 5
  },

  cancelButtonText: {
    color: "#555",
    fontWeight: "bold"
  },


  // =======================================================
  // TOTAL
  // =======================================================

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

    padding: 30,

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

    textAlign: "center",

    marginTop: 12
  }

};