import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import * as ImagePicker from "expo-image-picker";

import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";


export default function PersonInventory() {

  const { id } = useLocalSearchParams();

  const { t } = useLanguage();


  // =========================================================
  // STATE
  // =========================================================

  const [person, setPerson] = useState(null);

  const [items, setItems] = useState([]);

  const [inventory, setInventory] = useState([]);

  const [expenses, setExpenses] = useState(0);

  const [imageLoading, setImageLoading] = useState(false);


  // =========================================================
  // REFRESH DATA
  // =========================================================

  const refreshData = () => {

    try {

      const personId = Number(id);

      if (!personId) {
        setPerson(null);
        return;
      }


      // -----------------------------------------------------
      // PERSON
      // -----------------------------------------------------

      const p = db.getFirstSync(
        `
        SELECT *
        FROM people
        WHERE id=?
        `,
        [personId]
      );

      setPerson(p || null);


      // -----------------------------------------------------
      // ALL ITEMS
      // -----------------------------------------------------

      const allItems = db.getAllSync(
        `
        SELECT *
        FROM items
        ORDER BY name ASC
        `
      );

      setItems(allItems);


      // -----------------------------------------------------
      // INVENTORY
      // -----------------------------------------------------

      const inv = db.getAllSync(
        `
        SELECT
          inventory.id AS inventoryId,
          inventory.quantity,
          inventory.itemId,
          items.name
        FROM inventory

        JOIN items
          ON inventory.itemId = items.id

        WHERE inventory.personId=?

        ORDER BY items.name ASC
        `,
        [personId]
      );

      setInventory(inv);


      // -----------------------------------------------------
      // EXPENSES
      // -----------------------------------------------------

      const totalExpenses =
        db.getFirstSync(
          `
          SELECT SUM(amount) AS total
          FROM expenses
          WHERE personId=?
          `,
          [personId]
        )?.total || 0;

      setExpenses(Number(totalExpenses));

    } catch (error) {

      console.error(
        "Refresh inventory error:",
        error
      );

      Alert.alert(
        t.error || "Error",
        t.loadFailed ||
          "Could not load the child data."
      );
    }
  };


  // =========================================================
  // AUTO REFRESH
  // =========================================================

  useEffect(() => {

    refreshData();


    const listener = () => {
      refreshData();
    };


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

  }, [id]);


  // =========================================================
  // BUDGET COLOR
  // =========================================================

  const getColor = (
    remaining,
    initial
  ) => {

    const budget =
      Number(initial || 0);

    const value =
      Number(remaining || 0);


    if (budget <= 0) {
      return "#e74c3c";
    }


    const ratio =
      value / budget;


    if (ratio > 0.7) {
      return "#2ecc71";
    }


    if (ratio > 0.2) {
      return "#e67e22";
    }


    return "#e74c3c";
  };


  // =========================================================
  // ADD ITEM
  // =========================================================

  const addItem = (
    itemId
  ) => {

    try {

      const personId =
        Number(id);


      const existing =
        db.getFirstSync(
          `
          SELECT *
          FROM inventory
          WHERE personId=?
          AND itemId=?
          `,
          [
            personId,
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
            personId,
            itemId
          ]
        );

      }


      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Add inventory item error:",
        error
      );

      Alert.alert(
        t.error || "Error",
        t.addFailed ||
          "Could not add the item."
      );
    }
  };


  // =========================================================
  // REMOVE ONE
  // =========================================================

  const removeOne = (
    inventoryId,
    quantity
  ) => {

    if (quantity <= 1) {

      Alert.alert(
        t.delete || "Delete",

        t.confirmDeleteItem ||
          "Remove item?",

        [
          {
            text:
              t.cancel ||
              "Cancel",

            style: "cancel",
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
                  DELETE FROM inventory
                  WHERE id=?
                  `,
                  [inventoryId]
                );


                dbEvents.emit(
                  "dbUpdated"
                );

              } catch (error) {

                console.error(
                  "Remove item error:",
                  error
                );

              }

            },
          },
        ]
      );

    } else {

      try {

        db.runSync(
          `
          UPDATE inventory
          SET quantity = quantity - 1
          WHERE id=?
          `,
          [inventoryId]
        );


        dbEvents.emit(
          "dbUpdated"
        );

      } catch (error) {

        console.error(
          "Decrease item error:",
          error
        );

      }

    }
  };


  // =========================================================
  // DELETE ITEM COMPLETELY
  // =========================================================

  const deleteItem = (
    inventoryId
  ) => {

    Alert.alert(
      t.delete || "Delete",

      t.confirmDeleteItem ||
        "Remove item completely?",

      [
        {
          text:
            t.cancel ||
            "Cancel",

          style: "cancel",
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
                DELETE FROM inventory
                WHERE id=?
                `,
                [inventoryId]
              );


              dbEvents.emit(
                "dbUpdated"
              );

            } catch (error) {

              console.error(
                "Delete item error:",
                error
              );

            }

          },
        },
      ]
    );
  };


  // =========================================================
  // TAKE PHOTO
  // =========================================================

  const takeInventoryPhoto = async () => {

    try {

      setImageLoading(true);


      // -----------------------------------------------------
      // REQUEST CAMERA PERMISSION
      // -----------------------------------------------------

      const permission =
        await ImagePicker.requestCameraPermissionsAsync();


      if (!permission.granted) {

        Alert.alert(
          t.cameraPermissionTitle ||
            "Camera permission required",

          t.cameraPermissionMessage ||
            "Please allow camera access to take an inventory photo."
        );

        return;
      }


      // -----------------------------------------------------
      // OPEN CAMERA
      // -----------------------------------------------------

      const result =
        await ImagePicker.launchCameraAsync({

          mediaTypes: ["images"],

          allowsEditing: true,

          aspect: [4, 3],

          quality: 0.8,

        });


      // -----------------------------------------------------
      // USER CANCELLED
      // -----------------------------------------------------

      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {

        return;
      }


      const imageUri =
        result.assets[0].uri;


      // -----------------------------------------------------
      // SAVE URI TO DATABASE
      // -----------------------------------------------------

      db.runSync(
        `
        UPDATE people

        SET inventoryImageUri = ?

        WHERE id = ?
        `,
        [
          imageUri,
          Number(id)
        ]
      );


      dbEvents.emit(
        "dbUpdated"
      );


    } catch (error) {

      console.error(
        "Take inventory photo error:",
        error
      );


      Alert.alert(
        t.error ||
          "Error",

        t.imageSaveFailed ||
          "Could not take or save the inventory photo."
      );

    } finally {

      setImageLoading(false);

    }
  };


  // =========================================================
  // PICK IMAGE FROM GALLERY
  // =========================================================

  const pickInventoryPhoto = async () => {

    try {

      setImageLoading(true);


      // -----------------------------------------------------
      // REQUEST MEDIA LIBRARY PERMISSION
      // -----------------------------------------------------

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();


      if (!permission.granted) {

        Alert.alert(
          t.galleryPermissionTitle ||
            "Photo library permission required",

          t.galleryPermissionMessage ||
            "Please allow photo library access to select an inventory photo."
        );

        return;
      }


      // -----------------------------------------------------
      // OPEN GALLERY
      // -----------------------------------------------------

      const result =
        await ImagePicker.launchImageLibraryAsync({

          mediaTypes: ["images"],

          allowsEditing: true,

          aspect: [4, 3],

          quality: 0.8,

        });


      // -----------------------------------------------------
      // USER CANCELLED
      // -----------------------------------------------------

      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {

        return;
      }


      const imageUri =
        result.assets[0].uri;


      // -----------------------------------------------------
      // SAVE URI
      // -----------------------------------------------------

      db.runSync(
        `
        UPDATE people

        SET inventoryImageUri = ?

        WHERE id = ?
        `,
        [
          imageUri,
          Number(id)
        ]
      );


      dbEvents.emit(
        "dbUpdated"
      );


    } catch (error) {

      console.error(
        "Pick inventory photo error:",
        error
      );


      Alert.alert(
        t.error ||
          "Error",

        t.imageSaveFailed ||
          "Could not select or save the inventory photo."
      );

    } finally {

      setImageLoading(false);

    }
  };


  // =========================================================
  // IMAGE OPTIONS
  // =========================================================

  const chooseImageAction = () => {

    Alert.alert(

      t.inventoryImage ||
        "Inventory Image",

      t.chooseImageAction ||
        "Choose how you want to add the inventory image.",

      [

        {
          text:
            t.takePhoto ||
            "Take Photo",

          onPress:
            takeInventoryPhoto,
        },

        {
          text:
            t.chooseFromGallery ||
            "Choose from Gallery",

          onPress:
            pickInventoryPhoto,
        },

        {
          text:
            t.cancel ||
            "Cancel",

          style: "cancel",
        },

      ]

    );
  };


  // =========================================================
  // DELETE INVENTORY IMAGE
  // =========================================================

  const deleteInventoryImage = () => {

    Alert.alert(

      t.deleteImage ||
        "Delete Image",

      t.confirmDeleteImage ||
        "Are you sure you want to delete the inventory image?",

      [

        {
          text:
            t.cancel ||
            "Cancel",

          style: "cancel",
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
                UPDATE people

                SET inventoryImageUri = NULL

                WHERE id = ?
                `,
                [Number(id)]
              );


              dbEvents.emit(
                "dbUpdated"
              );

            } catch (error) {

              console.error(
                "Delete inventory image error:",
                error
              );

            }

          },

        },

      ]

    );
  };


  // =========================================================
  // PERSON NOT FOUND
  // =========================================================

  if (!person) {

    return (

      <SafeAreaView
        style={
          styles.safeArea
        }
      >

        <View
          style={
            styles.notFound
          }
        >

          <MaterialIcons
            name="person-off"
            size={45}
            color="#bbb"
          />

          <Text
            style={
              styles.notFoundText
            }
          >
            {t.personNotFound ||
              "Person not found"}
          </Text>

        </View>

      </SafeAreaView>

    );
  }


  // =========================================================
  // CALCULATE REMAINING
  // =========================================================

  const remaining =
    Number(person.money || 0) -
    Number(expenses || 0);


  // =========================================================
  // UI
  // =========================================================

  return (

    <SafeAreaView
      style={
        styles.safeArea
      }
    >

      <ScrollView
        contentContainerStyle={
          styles.container
        }

        showsVerticalScrollIndicator={
          false
        }
      >

        {/* =================================================
            PERSON INFO
        ================================================= */}

        <View
          style={
            styles.card
          }
        >

          <View
            style={
              styles.personHeader
            }
          >

            <View
              style={
                styles.personIcon
              }
            >

              <MaterialIcons
                name="person"
                size={28}
                color="#3498db"
              />

            </View>


            <View
              style={
                styles.personHeaderText
              }
            >

              <Text
                style={
                  styles.title
                }
              >
                {person.name}
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                {t.inventory ||
                  "Inventory"}
              </Text>

            </View>

          </View>


          <View
            style={
              styles.infoRow
            }
          >

            <MaterialIcons
              name="cake"
              size={19}
              color="#7f8c8d"
            />

            <Text
              style={
                styles.text
              }
            >
              {t.birthDate}:{" "}
              {person.birthDate}
            </Text>

          </View>


          <View
            style={
              styles.infoRow
            }
          >

            <MaterialIcons
              name="account-balance-wallet"
              size={19}
              color="#7f8c8d"
            />

            <Text
              style={
                styles.text
              }
            >
              {t.initialBudget}:{" "}
              {person.money} DA
            </Text>

          </View>


          <View
            style={
              styles.infoRow
            }
          >

            <MaterialIcons
              name="payments"
              size={19}
              color={
                getColor(
                  remaining,
                  person.money
                )
              }
            />

            <Text
              style={[
                styles.text,
                {
                  color:
                    getColor(
                      remaining,
                      person.money
                    ),

                  fontWeight:
                    "bold",
                },
              ]}
            >
              {t.remaining}:{" "}
              {remaining} DA
            </Text>

          </View>

        </View>


        {/* =================================================
            INVENTORY IMAGE
        ================================================= */}

        <View
          style={
            styles.imageCard
          }
        >

          <View
            style={
              styles.sectionHeader
            }
          >

            <MaterialIcons
              name="photo"
              size={23}
              color="#3498db"
            />

            <Text
              style={
                styles.section
              }
            >
              {t.inventoryImage ||
                "Inventory Image"}
            </Text>

          </View>


          {/* ---------------------------------------------
              IMAGE
          --------------------------------------------- */}

          {person.inventoryImageUri ? (

            <View
              style={
                styles.imageContainer
              }
            >

              <Image
                source={{
                  uri:
                    person.inventoryImageUri,
                }}

                style={
                  styles.inventoryImage
                }

                resizeMode="cover"
              />


              {/* IMAGE ACTIONS */}

              <View
                style={
                  styles.imageActions
                }
              >

                <TouchableOpacity
                  onPress={
                    chooseImageAction
                  }

                  style={
                    styles.changeImageButton
                  }

                  activeOpacity={
                    0.8
                  }
                >

                  <MaterialIcons
                    name="photo-camera"
                    size={20}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.buttonText
                    }
                  >
                    {t.changeImage ||
                      "Change Image"}
                  </Text>

                </TouchableOpacity>


                <TouchableOpacity
                  onPress={
                    deleteInventoryImage
                  }

                  style={
                    styles.deleteImageButton
                  }

                  activeOpacity={
                    0.8
                  }
                >

                  <MaterialIcons
                    name="delete-outline"
                    size={20}
                    color="#fff"
                  />

                </TouchableOpacity>

              </View>

            </View>

          ) : (

            <View
              style={
                styles.noImageContainer
              }
            >

              <MaterialIcons
                name="image-not-supported"
                size={55}
                color="#bbb"
              />

              <Text
                style={
                  styles.noImageText
                }
              >
                {t.noInventoryImage ||
                  "No inventory image"}
              </Text>


              <Text
                style={
                  styles.noImageDescription
                }
              >
                {t.inventoryImageDescription ||
                  "Take a photo or choose one from the gallery."}
              </Text>


              <TouchableOpacity
                onPress={
                  chooseImageAction
                }

                style={
                  styles.addImageButton
                }

                activeOpacity={
                  0.8
                }

                disabled={
                  imageLoading
                }
              >

                <MaterialIcons
                  name="photo-camera"
                  size={21}
                  color="#fff"
                />

                <Text
                  style={
                    styles.buttonText
                  }
                >
                  {imageLoading
                    ? (
                      t.loading ||
                      "Loading..."
                    )
                    : (
                      t.addInventoryImage ||
                      "Add Inventory Image"
                    )}
                </Text>

              </TouchableOpacity>

            </View>

          )}

        </View>


        {/* =================================================
            INVENTORY
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t.inventory ||
            "Inventory"}
        </Text>


        {inventory.length === 0 ? (

          <View
            style={
              styles.emptyCard
            }
          >

            <MaterialIcons
              name="inventory-2"
              size={40}
              color="#bbb"
            />

            <Text
              style={
                styles.empty
              }
            >
              {t.noItems ||
                "No items"}
            </Text>

          </View>

        ) : (

          <View
            style={
              styles.inventoryList
            }
          >

            {inventory.map(
              item => (

                <View
                  key={
                    item.inventoryId
                  }

                  style={
                    styles.itemRow
                  }
                >

                  <View
                    style={
                      styles.itemInfo
                    }
                  >

                    <View
                      style={
                        styles.itemIcon
                      }
                    >

                      <MaterialIcons
                        name="inventory-2"
                        size={20}
                        color="#3498db"
                      />

                    </View>


                    <View
                      style={
                        styles.itemTextContainer
                      }
                    >

                      <Text
                        style={
                          styles.itemName
                        }
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={
                          styles.quantity
                        }
                      >
                        {t.quantity ||
                          "Quantity"}:{" "}
                        {item.quantity}
                      </Text>

                    </View>

                  </View>


                  <View
                    style={
                      styles.itemActions
                    }
                  >

                    <TouchableOpacity
                      onPress={() =>
                        removeOne(
                          item.inventoryId,
                          item.quantity
                        )
                      }

                      style={
                        styles.smallButton
                      }

                      activeOpacity={
                        0.7
                      }
                    >

                      <MaterialIcons
                        name="remove"
                        size={20}
                        color="#e67e22"
                      />

                    </TouchableOpacity>


                    <TouchableOpacity
                      onPress={() =>
                        addItem(
                          item.itemId
                        )
                      }

                      style={
                        styles.smallButton
                      }

                      activeOpacity={
                        0.7
                      }
                    >

                      <MaterialIcons
                        name="add"
                        size={20}
                        color="#2ecc71"
                      />

                    </TouchableOpacity>


                    <TouchableOpacity
                      onPress={() =>
                        deleteItem(
                          item.inventoryId
                        )
                      }

                      style={
                        styles.smallButton
                      }

                      activeOpacity={
                        0.7
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

              )
            )}

          </View>

        )}


        {/* =================================================
            ADD ITEM
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t.addItem ||
            "Add Item"}
        </Text>


        {items.length === 0 ? (

          <View
            style={
              styles.emptyCard
            }
          >

            <MaterialIcons
              name="inventory"
              size={35}
              color="#bbb"
            />

            <Text
              style={
                styles.empty
              }
            >
              {t.noItemsAvailable ||
                "No items available"}
            </Text>

          </View>

        ) : (

          <View
            style={
              styles.availableItems
            }
          >

            {items.map(
              item => (

                <TouchableOpacity
                  key={item.id}

                  onPress={() =>
                    addItem(
                      item.id
                    )
                  }

                  style={
                    styles.itemButton
                  }

                  activeOpacity={
                    0.8
                  }
                >

                  <MaterialIcons
                    name="add"
                    size={19}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.itemText
                    }
                  >
                    {item.name}
                  </Text>

                </TouchableOpacity>

              )
            )}

          </View>

        )}

      </ScrollView>

    </SafeAreaView>

  );
}


// ===========================================================
// STYLES
// ===========================================================

const styles = {

  safeArea: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },


  container: {
    padding: 20,
    paddingBottom: 50,
  },


  // =========================================================
  // PERSON CARD
  // =========================================================

  card: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },


  personHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },


  personIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,

    backgroundColor: "#eef7fd",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 12,
  },


  personHeaderText: {
    flex: 1,
  },


  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
  },


  subtitle: {
    color: "#7f8c8d",
    fontSize: 13,
    marginTop: 2,
  },


  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
  },


  text: {
    color: "#555",
    fontSize: 14,
    flexShrink: 1,
  },


  // =========================================================
  // IMAGE CARD
  // =========================================================

  imageCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },


  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },


  section: {
    fontWeight: "bold",
    fontSize: 17,
    color: "#2c3e50",
    marginLeft: 8,
  },


  imageContainer: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#eee",
  },


  inventoryImage: {
    width: "100%",
    height: 250,
  },


  imageActions: {
    flexDirection: "row",
    padding: 10,
    gap: 10,
    backgroundColor: "#fff",
  },


  changeImageButton: {
    flex: 1,
    backgroundColor: "#3498db",
    padding: 11,
    borderRadius: 9,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 7,
  },


  deleteImageButton: {
    width: 48,
    backgroundColor: "#e74c3c",
    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",
  },


  noImageContainer: {
    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderStyle: "dashed",

    borderRadius: 10,

    padding: 30,

    backgroundColor: "#fafafa",
  },


  noImageText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
  },


  noImageDescription: {
    color: "#999",
    fontSize: 13,
    textAlign: "center",
    marginTop: 5,
    marginBottom: 18,
  },


  addImageButton: {
    backgroundColor: "#3498db",

    paddingVertical: 11,
    paddingHorizontal: 18,

    borderRadius: 9,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 7,
  },


  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },


  // =========================================================
  // SECTIONS
  // =========================================================

  sectionTitle: {
    fontWeight: "bold",
    fontSize: 17,
    marginBottom: 10,
    color: "#2c3e50",
  },


  // =========================================================
  // INVENTORY
  // =========================================================

  inventoryList: {
    marginBottom: 20,
  },


  itemRow: {
    flexDirection: "row",
    alignItems: "center",

    justifyContent: "space-between",

    padding: 12,

    backgroundColor: "#fff",

    borderRadius: 10,

    marginBottom: 8,

    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,

    shadowOffset: {
      width: 0,
      height: 1,
    },

    elevation: 1,
  },


  itemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },


  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,

    backgroundColor: "#eef7fd",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },


  itemTextContainer: {
    flex: 1,
  },


  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c3e50",
  },


  quantity: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },


  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },


  smallButton: {
    width: 34,
    height: 34,

    borderRadius: 8,

    backgroundColor: "#f7f7f7",

    alignItems: "center",
    justifyContent: "center",
  },


  // =========================================================
  // ADD ITEMS
  // =========================================================

  availableItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },


  itemButton: {
    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 11,
    paddingHorizontal: 15,

    backgroundColor: "#3498db",

    borderRadius: 8,

    gap: 5,
  },


  itemText: {
    color: "#fff",
    fontWeight: "bold",
  },


  // =========================================================
  // EMPTY
  // =========================================================

  emptyCard: {
    backgroundColor: "#fff",

    borderRadius: 12,

    padding: 25,

    marginBottom: 20,

    alignItems: "center",
    justifyContent: "center",
  },


  empty: {
    color: "#888",
    marginTop: 8,
  },


  // =========================================================
  // NOT FOUND
  // =========================================================

  notFound: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",
  },


  notFoundText: {
    color: "#888",
    marginTop: 10,
    fontSize: 15,
  },

};