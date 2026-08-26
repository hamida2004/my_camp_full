import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert
} from "react-native";

import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";

import { db } from "../../../database/db";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { dbEvents } from "../../../events/events";
import { useLanguage } from "../../../context/languageContext";

export default function PersonInventory() {

  const { id } = useLocalSearchParams();

  const { t } = useLanguage();

  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");


  // =========================================================
  // LOAD ITEMS
  // =========================================================

  const loadItems = () => {

    const result = db.getAllSync(
      "SELECT * FROM items ORDER BY name ASC"
    );

    setItems(result);
  };


  // =========================================================
  // AUTO REFRESH
  // =========================================================

  useEffect(() => {

    loadItems();

    const listener = () => loadItems();

    dbEvents.on(
      "dbUpdated",
      listener
    );

    return () =>
      dbEvents.off(
        "dbUpdated",
        listener
      );

  }, []);


  // =========================================================
  // ADD NEW ITEM
  // =========================================================

  const addItemToDB = () => {

    const itemName =
      newItemName.trim();

    if (!itemName) {

      Alert.alert(
        t.emptyName,
        t.enterItemName
      );

      return;
    }

    try {

      db.runSync(
        "INSERT INTO items (name) VALUES (?)",
        [itemName]
      );

      setNewItemName("");

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (err) {

      Alert.alert(
        t.duplicateItem,
        `${itemName} ${t.alreadyExists}`
      );

    }
  };


  // =========================================================
  // DELETE ITEM
  // =========================================================

  const deleteItem = (itemId, itemName) => {

    Alert.alert(
      t.delete || "Delete",
      `${t.deleteConfirm || "Are you sure you want to delete"} "${itemName}"?`,
      [
        {
          text: t.cancel,
          style: "cancel"
        },

        {
          text: t.delete,
          style: "destructive",

          onPress: () => {

            try {

              // Remove all inventory references
              // to this item first.

              db.runSync(
                `
                DELETE FROM inventory
                WHERE itemId=?
                `,
                [itemId]
              );


              // Then remove the item itself.

              db.runSync(
                `
                DELETE FROM items
                WHERE id=?
                `,
                [itemId]
              );


              dbEvents.emit(
                "dbUpdated"
              );

            } catch (error) {

              console.error(
                "Delete item error:",
                error
              );

              Alert.alert(
                t.error || "Error",
                t.deleteItemError ||
                  "Could not delete this item."
              );

            }

          }

        }

      ]
    );
  };


  // =========================================================
  // ADD ITEM TO PERSON
  // =========================================================

  const addItemToPerson = (itemId) => {

    const existing =
      db.getFirstSync(
        `
        SELECT *
        FROM inventory
        WHERE personId=?
        AND itemId=?
        `,
        [
          id,
          itemId
        ]
      );


    if (existing) {

      db.runSync(
        `
        UPDATE inventory
        SET quantity = quantity + 1
        WHERE id=?
        `,
        [existing.id]
      );

    } else {

      db.runSync(
        `
        INSERT INTO inventory
        (
          personId,
          itemId,
          quantity
        )
        VALUES (?,?,1)
        `,
        [
          id,
          itemId
        ]
      );

    }


    dbEvents.emit(
      "dbUpdated"
    );
  };


  // =========================================================
  // REMOVE ONE ITEM FROM PERSON
  // =========================================================

  const removeItemFromPerson = (itemId) => {

    const existing =
      db.getFirstSync(
        `
        SELECT *
        FROM inventory
        WHERE personId=?
        AND itemId=?
        `,
        [
          id,
          itemId
        ]
      );


    if (!existing) {
      return;
    }


    if (existing.quantity > 1) {

      db.runSync(
        `
        UPDATE inventory
        SET quantity = quantity - 1
        WHERE id=?
        `,
        [existing.id]
      );

    } else {

      db.runSync(
        `
        DELETE FROM inventory
        WHERE id=?
        `,
        [existing.id]
      );

    }


    dbEvents.emit(
      "dbUpdated"
    );
  };


  // =========================================================
  // UI
  // =========================================================

  return (

    <View style={styles.container}>

      <FlatList
        data={items}
        numColumns={3}

        keyExtractor={(item) =>
          item.id.toString()
        }

        showsVerticalScrollIndicator={false}

        contentContainerStyle={
          styles.content
        }

        columnWrapperStyle={
          styles.columnWrapper
        }

        ListHeaderComponent={

          <>

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <View style={styles.header}>

              <Text style={styles.title}>
                {t.inventory}
              </Text>

              <Text style={styles.subtitle}>
                {t.inventoryDescription ||
                  "Manage the items assigned to this child and add new items to the inventory."}
              </Text>

            </View>


            {/* =================================================
                ADD NEW ITEM CARD
            ================================================= */}

            <View style={styles.addCard}>

              <View style={styles.sectionHeader}>

                <View style={styles.iconContainer}>

                  <MaterialIcons
                    name="add-box"
                    size={22}
                    color="#3498db"
                  />

                </View>

                <View style={styles.sectionText}>

                  <Text style={styles.cardTitle}>
                    {t.addNewItem}
                  </Text>

                  <Text style={styles.cardDescription}>
                    {t.addItemDescription ||
                      "Create a new item that can be added to the child's inventory."}
                  </Text>

                </View>

              </View>


              <TextInput
                placeholderTextColor="#999"
                placeholder={t.itemName}
                value={newItemName}
                onChangeText={setNewItemName}
                style={styles.input}
              />


              <TouchableOpacity
                onPress={addItemToDB}
                activeOpacity={0.8}
                style={styles.addButton}
              >

                <MaterialIcons
                  name="add"
                  size={20}
                  color="#fff"
                />

                <Text style={styles.buttonText}>
                  {t.addItem}
                </Text>

              </TouchableOpacity>

            </View>


            {/* =================================================
                AVAILABLE ITEMS SECTION
            ================================================= */}

            <View style={styles.itemsHeader}>

              <Text style={styles.sectionTitle}>
                {t.availableItems}
              </Text>

              <Text style={styles.sectionDescription}>
                {t.availableItemsDescription ||
                  "Tap an item to add it to this child's inventory."}
              </Text>

            </View>

          </>
        }


        // =====================================================
        // ITEM
        // =====================================================

        renderItem={({ item }) => (

          <View
            style={styles.itemCard}
          >

            {/* ADD */}

            <TouchableOpacity
              onPress={() =>
                addItemToPerson(item.id)
              }

              activeOpacity={0.75}

              style={styles.itemMain}
            >

              <View style={styles.itemIcon}>

                <MaterialIcons
                  name="inventory-2"
                  size={24}
                  color="#3498db"
                />

              </View>

              <Text style={styles.itemName}>
                {item.name}
              </Text>

            </TouchableOpacity>


            {/* DELETE ITEM */}

            <TouchableOpacity
              onPress={() =>
                deleteItem(
                  item.id,
                  item.name
                )
              }

              style={styles.deleteButton}

              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8
              }}
            >

              <MaterialIcons
                name="delete-outline"
                size={19}
                color="#e74c3c"
              />

            </TouchableOpacity>

          </View>

        )}


        // =====================================================
        // EMPTY
        // =====================================================

        ListEmptyComponent={

          <View style={styles.emptyState}>

            <MaterialIcons
              name="inventory-2"
              size={40}
              color="#bbb"
            />

            <Text style={styles.emptyTitle}>
              {t.noItems ||
                "No items available"}
            </Text>

            <Text style={styles.emptyDescription}>
              {t.addNewItem ||
                "Add a new item above to get started."}
            </Text>

          </View>

        }

      />

    </View>

  );
}


// ===========================================================
// STYLES
// ===========================================================

const styles = {

  container: {
    flex: 1,
    backgroundColor: "#f9f9f9"
  },


  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 50
  },


  columnWrapper: {
    gap: 10,
    marginBottom: 10
  },


  // ---------------------------------------------------------
  // HEADER
  // ---------------------------------------------------------

  header: {
    marginBottom: 20
  },


  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5
  },


  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    lineHeight: 20
  },


  // ---------------------------------------------------------
  // ADD CARD
  // ---------------------------------------------------------

  addCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 25,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2
    },

    elevation: 2
  },


  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15
  },


  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,

    backgroundColor: "#eef6fc",

    alignItems: "center",
    justifyContent: "center"
  },


  sectionText: {
    flex: 1,
    marginLeft: 12
  },


  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 3
  },


  cardDescription: {
    fontSize: 12,
    color: "#888",
    lineHeight: 17
  },


  // ---------------------------------------------------------
  // INPUT
  // ---------------------------------------------------------

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 11,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: "#fff"
  },


  // ---------------------------------------------------------
  // ADD BUTTON
  // ---------------------------------------------------------

  addButton: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row"
  },


  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 6
  },


  // ---------------------------------------------------------
  // ITEMS HEADER
  // ---------------------------------------------------------

  itemsHeader: {
    marginBottom: 12
  },


  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4
  },


  sectionDescription: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18
  },


  // ---------------------------------------------------------
  // ITEM CARD
  // ---------------------------------------------------------

  itemCard: {
    flex: 1,
    minHeight: 105,

    backgroundColor: "#fff",
    borderRadius: 12,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2
    },

    elevation: 2,

    position: "relative",

    overflow: "hidden"
  },


  itemMain: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    padding: 12,

    paddingTop: 16,
    paddingBottom: 16
  },


  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor: "#eef6fc",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 8
  },


  itemName: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#2c3e50",

    paddingHorizontal: 5
  },


  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------

  deleteButton: {
    position: "absolute",

    top: 7,
    right: 7,

    width: 28,
    height: 28,

    borderRadius: 14,

    backgroundColor: "#fff5f5",

    alignItems: "center",
    justifyContent: "center"
  },


  // ---------------------------------------------------------
  // EMPTY STATE
  // ---------------------------------------------------------

  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 12,

    padding: 30,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 5,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2
    },

    elevation: 2
  },


  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",

    marginTop: 10,
    marginBottom: 4
  },


  emptyDescription: {
    fontSize: 13,
    color: "#888",
    textAlign: "center"
  }

};

