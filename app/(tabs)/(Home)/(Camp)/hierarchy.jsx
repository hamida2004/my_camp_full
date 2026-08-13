import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  Pressable
} from "react-native";

import { useState, useEffect } from "react";

import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

import MaterialIcons from "react-native-vector-icons/MaterialIcons";


export default function Family() {

  const { t, lang } = useLanguage();

  const [list, setList] = useState([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");

  const [roles, setRoles] = useState([
    "Director",
    "Vice Director",
    "Doctor",
    "Nurse",
    "Finance",
    "Magazinier",
    "Swimming Monitor",
    "Chef",
    "Second Chef",
    "Chef sous camp",
    "Mentor"
  ]);

  const ROLE_ORDER = [
    "Director",
    "Vice Director",
    "Doctor",
    "Nurse",
    "Finance",
    "Magazinier",
    "Swimming Monitor",
    "Chef",
    "Second Chef",
    "Chef sous camp",
    "Mentor"
  ];

  const [roleModal, setRoleModal] = useState(false);
  const [selectModal, setSelectModal] = useState(false);
  const [newRole, setNewRole] = useState("");


  // =========================================================
  // ROLE TRANSLATION
  // =========================================================

  const roleTranslations = {

    "Director":
      t.roleDirector,

    "Vice Director":
      t.roleViceDirector,

    "Doctor":
      t.roleDoctor,

    "Nurse":
      t.roleNurse,

    "Finance":
      t.roleFinance,

    "Magazinier":
      t.roleMagazinier,

    "Swimming Monitor":
      t.roleSwimmingMonitor,

    "Chef":
      t.roleChef,

    "Second Chef":
      t.roleSecondChef,

    "Chef sous camp":
      t.roleChefSousCamp,

    "Mentor":
      t.roleMentor

  };


  const getRoleLabel = (roleName) => {

    return (
      roleTranslations[roleName] ||
      roleName
    );

  };


  // =========================================================
  // LOAD STAFF
  // =========================================================

  const load = () => {

    setList(
      db.getAllSync(
        "SELECT * FROM camp_staff"
      )
    );

  };


  useEffect(() => {

    load();

    const listener = () => load();

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
  // ADD MEMBER
  // =========================================================

  const add = () => {

    if (!name || !role) {
      return;
    }

    db.runSync(
      `
      INSERT INTO camp_staff
      (name, role, phone)
      VALUES (?, ?, ?)
      `,
      [
        name,
        role,
        phone
      ]
    );

    dbEvents.emit(
      "dbUpdated"
    );

    setName("");
    setPhone("");
    setRole("");

  };


  // =========================================================
  // REMOVE MEMBER
  // =========================================================

  const remove = (id) => {

    db.runSync(
      "DELETE FROM camp_staff WHERE id=?",
      [id]
    );

    dbEvents.emit(
      "dbUpdated"
    );

  };


  // =========================================================
  // ADD CUSTOM ROLE
  // =========================================================

  const addRole = () => {

    if (!newRole.trim()) {
      return;
    }

    setRoles(
      prev => [
        ...prev,
        newRole.trim()
      ]
    );

    setNewRole("");

    setRoleModal(false);

  };


  // =========================================================
  // UI
  // =========================================================

  return (

    <View
      style={
        styles.container
      }
    >

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <Text
          style={
            styles.pageTitle
          }
        >
          {t.campFamily}
        </Text>


        <Text
          style={
            styles.pageDescription
          }
        >
          {t.campFamilyDescription}
        </Text>


        {/* =====================================================
            ADD MEMBER
        ===================================================== */}

        <View
          style={
            styles.card
          }
        >

          <Text
            style={
              styles.cardTitle
            }
          >
            {t.addMember}
          </Text>


          <TextInput
            placeholderTextColor="#999"
            placeholder={t.name}
            value={name}
            onChangeText={setName}
            style={
              styles.input
            }
          />


          <TextInput
            placeholderTextColor="#999"
            placeholder={t.phonePlaceholder}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={
              styles.input
            }
          />


          {/* ROLE SELECT */}

          <TouchableOpacity
            onPress={() =>
              setSelectModal(true)
            }

            style={
              styles.input
            }
          >

            <Text
              style={{
                color:
                  role
                    ? "#222"
                    : "#999"
              }}
            >
              {
                role
                  ? getRoleLabel(role)
                  : t.selectRolePlaceholder
              }
            </Text>

          </TouchableOpacity>


          {/* ADD NEW ROLE */}

          <TouchableOpacity
            onPress={() =>
              setRoleModal(true)
            }

            style={
              styles.secondaryBtn
            }
          >

            <Text
              style={
                styles.secondaryBtnText
              }
            >
              {t.addNewRole}
            </Text>

          </TouchableOpacity>


          {/* ADD */}

          <TouchableOpacity
            style={
              styles.button
            }

            onPress={add}
          >

            <Text
              style={
                styles.btnText
              }
            >
              {t.add}
            </Text>

          </TouchableOpacity>

        </View>


        {/* =====================================================
            STAFF GROUPS
        ===================================================== */}

        {
          [
            ...new Set([
              ...ROLE_ORDER,
              ...roles
            ])
          ].map(
            roleName => {

              const group =
                list.filter(
                  item =>
                    item.role === roleName
                );


              if (
                group.length === 0
              ) {
                return null;
              }


              return (

                <View
                  key={roleName}
                  style={
                    styles.section
                  }
                >

                  {/* ROLE TITLE */}

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    {
                      getRoleLabel(
                        roleName
                      )
                    }
                  </Text>


                  {/* MEMBERS */}

                  {
                    group.map(
                      item => (

                        <View
                          key={item.id}
                          style={
                            styles.memberCard
                          }
                        >

                          <View
                            style={
                              styles.memberInfo
                            }
                          >

                            <Text
                              style={
                                styles.memberName
                              }
                            >
                              {item.name}
                            </Text>


                            {
                              item.phone ? (

                                <Text
                                  style={
                                    styles.phone
                                  }

                                  onPress={() =>
                                    Linking.openURL(
                                      `tel:${item.phone}`
                                    )
                                  }
                                >
                                  {item.phone}
                                </Text>

                              ) : null
                            }

                          </View>


                          {/* DELETE */}

                          <TouchableOpacity
                            onPress={() =>
                              remove(
                                item.id
                              )
                            }
                          >

                            <MaterialIcons
                              name="delete-outline"
                              size={22}
                              color="#e74c3c"
                            />

                          </TouchableOpacity>

                        </View>

                      )
                    )
                  }

                </View>

              );

            }
          )
        }

      </ScrollView>


      {/* =====================================================
          ROLE SELECT MODAL
      ===================================================== */}

      <Modal
        visible={selectModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectModal(false)
        }
      >

        <View
          style={
            styles.modalContainer
          }
        >

          <View
            style={
              styles.modalContent
            }
          >

            <Text
              style={
                styles.modalTitle
              }
            >
              {t.selectRolePlaceholder}
            </Text>


            {
              [
                ...new Set([
                  ...ROLE_ORDER,
                  ...roles
                ])
              ].map(
                r => (

                  <TouchableOpacity
                    key={r}

                    style={
                      styles.roleOption
                    }

                    onPress={() => {

                      setRole(r);

                      setSelectModal(
                        false
                      );

                    }}
                  >

                    <Text>
                      {
                        getRoleLabel(r)
                      }
                    </Text>

                  </TouchableOpacity>

                )
              )
            }


            {/* CANCEL */}

            <Pressable
              style={
                styles.cancelButton
              }

              onPress={() =>
                setSelectModal(false)
              }
            >

              <Text
                style={
                  styles.cancelText
                }
              >
                {t.cancel}
              </Text>

            </Pressable>

          </View>

        </View>

      </Modal>


      {/* =====================================================
          ADD ROLE MODAL
      ===================================================== */}

      <Modal
        visible={roleModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setRoleModal(false)
        }
      >

        <View
          style={
            styles.modalContainer
          }
        >

          <View
            style={
              styles.modalContent
            }
          >

            <Text
              style={
                styles.modalTitle
              }
            >
              {t.addNewRole}
            </Text>


            <TextInput
              placeholderTextColor="#999"
              placeholder={t.addNewRole}
              value={newRole}
              onChangeText={setNewRole}
              style={
                styles.input
              }
            />


            <TouchableOpacity
              style={
                styles.button
              }

              onPress={addRole}
            >

              <Text
                style={
                  styles.btnText
                }
              >
                {t.add}
              </Text>

            </TouchableOpacity>


            <Pressable
              style={
                styles.cancelButton
              }

              onPress={() =>
                setRoleModal(false)
              }
            >

              <Text
                style={
                  styles.cancelText
                }
              >
                {t.cancel}
              </Text>

            </Pressable>

          </View>

        </View>

      </Modal>

    </View>

  );

}


// =============================================================
// STYLES
// =============================================================

const styles = {

  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingVertical: 60
  },

  content: {
    padding: 20,
    paddingBottom: 80
  },


  // ===========================================================
  // PAGE HEADER
  // ===========================================================

  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 6
  },

  pageDescription: {
    fontSize: 14,
    color: "#777",
    lineHeight: 20,
    marginBottom: 20
  },


  // ===========================================================
  // CARDS
  // ===========================================================

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,

    elevation: 2
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 12
  },


  memberCard: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#fff",

    padding: 15,

    borderRadius: 12,

    marginBottom: 10,

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,

    elevation: 1
  },

  memberInfo: {
    flex: 1
  },

  memberName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 3
  },

  phone: {
    color: "#3498db",
    fontSize: 14
  },


  // ===========================================================
  // INPUTS
  // ===========================================================

  input: {
    borderWidth: 1,
    borderColor: "#ddd",

    padding: 11,

    borderRadius: 8,

    marginBottom: 10,

    backgroundColor: "#fff"
  },


  // ===========================================================
  // BUTTONS
  // ===========================================================

  button: {
    backgroundColor: "#3498db",

    paddingVertical: 12,

    borderRadius: 9,

    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold"
  },

  secondaryBtn: {
    backgroundColor: "#ecf0f1",

    padding: 11,

    borderRadius: 8,

    marginBottom: 10,

    alignItems: "center"
  },

  secondaryBtnText: {
    color: "#2c3e50",
    fontWeight: "600"
  },


  // ===========================================================
  // ROLE SECTIONS
  // ===========================================================

  section: {
    marginBottom: 15
  },

  sectionTitle: {
    fontWeight: "bold",

    fontSize: 16,

    marginBottom: 8,

    color: "#2c3e50",

    borderBottomWidth: 1,

    borderBottomColor: "#eee",

    paddingBottom: 7
  },


  // ===========================================================
  // MODALS
  // ===========================================================

  modalContainer: {
    flex: 1,

    justifyContent: "center",

    backgroundColor:
      "rgba(0,0,0,0.3)"
  },

  modalContent: {
    backgroundColor: "#fff",

    margin: 20,

    padding: 20,

    borderRadius: 12,

    maxHeight: "80%"
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",

    color: "#2c3e50",

    marginBottom: 15
  },

  roleOption: {
    borderBottomColor: "#eee",

    borderBottomWidth: 1,

    paddingVertical: 12
  },

  cancelButton: {
    width: "100%",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 15,

    paddingVertical: 8
  },

  cancelText: {
    color: "#e74c3c",

    fontWeight: "600"
  }

};