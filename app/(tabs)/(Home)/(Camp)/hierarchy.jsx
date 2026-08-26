import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  Pressable,
  Alert
} from "react-native";

import { useState, useEffect } from "react";

import { db } from "../../../../database/db";
import { dbEvents } from "../../../../events/events";
import { useLanguage } from "../../../../context/languageContext";

import MaterialIcons from "react-native-vector-icons/MaterialIcons";


export default function Family() {

  const { t, lang } = useLanguage();

  // =========================================================
  // STATE
  // =========================================================

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


  // =========================================================
  // MODALS
  // =========================================================

  const [roleModal, setRoleModal] = useState(false);
  const [selectModal, setSelectModal] = useState(false);

  const [newRole, setNewRole] = useState("");


  // =========================================================
  // EDIT STATE
  // =========================================================

  const [editModal, setEditModal] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");

  const [editRoleModal, setEditRoleModal] = useState(false);


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
  // ALL AVAILABLE ROLES
  // =========================================================

  const getAllRoles = () => {

    return [
      ...new Set([
        ...ROLE_ORDER,
        ...roles
      ])
    ];

  };


  // =========================================================
  // LOAD STAFF
  // =========================================================

  const load = () => {

    const result =
      db.getAllSync(
        "SELECT * FROM camp_staff ORDER BY id ASC"
      );

    setList(result);

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

    const cleanName =
      name.trim();

    const cleanPhone =
      phone.trim();


    if (!cleanName || !role) {

      Alert.alert(
        t.error || "Error",
        t.fillRequired ||
          "Please fill in all required fields."
      );

      return;
    }


    try {

      db.runSync(
        `
        INSERT INTO camp_staff
        (
          name,
          role,
          phone
        )
        VALUES (?, ?, ?)
        `,
        [
          cleanName,
          role,
          cleanPhone
        ]
      );


      // Clear form

      setName("");
      setPhone("");
      setRole("");


      // Refresh

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Add staff error:",
        error
      );

      Alert.alert(
        t.error || "Error",
        t.couldNotAdd ||
          "Could not add this member."
      );

    }

  };


  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEdit = (member) => {

    setEditingId(member.id);

    setEditName(
      member.name || ""
    );

    setEditPhone(
      member.phone || ""
    );

    setEditRole(
      member.role || ""
    );

    setEditModal(true);

  };


  // =========================================================
  // UPDATE MEMBER
  // =========================================================

  const updateMember = () => {

    const cleanName =
      editName.trim();

    const cleanPhone =
      editPhone.trim();


    if (
      !editingId ||
      !cleanName ||
      !editRole
    ) {

      Alert.alert(
        t.error || "Error",
        t.fillRequired ||
          "Please fill in all required fields."
      );

      return;
    }


    try {

      db.runSync(
        `
        UPDATE camp_staff

        SET
          name = ?,
          role = ?,
          phone = ?

        WHERE id = ?
        `,
        [
          cleanName,
          editRole,
          cleanPhone,
          editingId
        ]
      );


      // Close modal

      setEditModal(false);


      // Clear edit state

      setEditingId(null);
      setEditName("");
      setEditPhone("");
      setEditRole("");


      // Refresh

      dbEvents.emit(
        "dbUpdated"
      );

    } catch (error) {

      console.error(
        "Update staff error:",
        error
      );

      Alert.alert(
        t.error || "Error",
        t.couldNotUpdate ||
          "Could not update this member."
      );

    }

  };


  // =========================================================
  // CLOSE EDIT MODAL
  // =========================================================

  const closeEdit = () => {

    setEditModal(false);

    setEditingId(null);

    setEditName("");
    setEditPhone("");
    setEditRole("");

    setEditRoleModal(false);

  };


  // =========================================================
  // REMOVE MEMBER
  // =========================================================

  const remove = (id) => {

    Alert.alert(
      t.delete || "Delete",
      t.deleteConfirm ||
        "Are you sure you want to delete this member?",

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
                DELETE FROM camp_staff
                WHERE id=?
                `,
                [id]
              );

              dbEvents.emit(
                "dbUpdated"
              );

            } catch (error) {

              console.error(
                "Delete staff error:",
                error
              );

              Alert.alert(
                t.error || "Error",
                t.couldNotDelete ||
                  "Could not delete this member."
              );

            }

          }

        }

      ]

    );

  };


  // =========================================================
  // ADD CUSTOM ROLE
  // =========================================================

  const addRole = () => {

    const cleanRole =
      newRole.trim();


    if (!cleanRole) {

      return;
    }


    // Prevent duplicate roles

    const exists =
      getAllRoles().some(
        existingRole =>
          existingRole.toLowerCase() ===
          cleanRole.toLowerCase()
      );


    if (exists) {

      Alert.alert(
        t.roleExists ||
          "Role already exists",
        t.roleAlreadyExists ||
          "This role already exists."
      );

      return;
    }


    setRoles(
      prev => [
        ...prev,
        cleanRole
      ]
    );


    setNewRole("");

    setRoleModal(false);

  };


  // =========================================================
  // SELECT ROLE FOR ADD FORM
  // =========================================================

  const selectRole = (selectedRole) => {

    setRole(
      selectedRole
    );

    setSelectModal(false);

  };


  // =========================================================
  // SELECT ROLE FOR EDIT FORM
  // =========================================================

  const selectEditRole = (selectedRole) => {

    setEditRole(
      selectedRole
    );

    setEditRoleModal(false);

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

        showsVerticalScrollIndicator={false}
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


          {/* NAME */}

          <TextInput
            placeholderTextColor="#999"
            placeholder={t.name}
            value={name}
            onChangeText={setName}
            style={
              styles.input
            }
          />


          {/* PHONE */}

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

            <MaterialIcons
              name="add"
              size={18}
              color="#2c3e50"
            />

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

            <MaterialIcons
              name="person-add"
              size={20}
              color="#fff"
            />

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
          getAllRoles().map(
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


                          {/* ACTIONS */}

                          <View
                            style={
                              styles.memberActions
                            }
                          >

                            {/* EDIT */}

                            <TouchableOpacity
                              onPress={() =>
                                openEdit(item)
                              }

                              style={
                                styles.actionButton
                              }
                            >

                              <MaterialIcons
                                name="edit"
                                size={21}
                                color="#3498db"
                              />

                            </TouchableOpacity>


                            {/* DELETE */}

                            <TouchableOpacity
                              onPress={() =>
                                remove(
                                  item.id
                                )
                              }

                              style={
                                styles.actionButton
                              }
                            >

                              <MaterialIcons
                                name="delete-outline"
                                size={22}
                                color="#e74c3c"
                              />

                            </TouchableOpacity>

                          </View>

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
          ROLE SELECT MODAL — ADD
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


            <ScrollView
              showsVerticalScrollIndicator={false}
            >

              {
                getAllRoles().map(
                  r => (

                    <TouchableOpacity
                      key={r}

                      style={
                        styles.roleOption
                      }

                      onPress={() =>
                        selectRole(r)
                      }
                    >

                      <Text
                        style={
                          styles.roleOptionText
                        }
                      >
                        {
                          getRoleLabel(r)
                        }
                      </Text>

                    </TouchableOpacity>

                  )
                )
              }

            </ScrollView>


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

              <MaterialIcons
                name="add"
                size={20}
                color="#fff"
              />

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


      {/* =====================================================
          EDIT MEMBER MODAL
      ===================================================== */}

      <Modal
        visible={editModal}
        transparent
        animationType="fade"

        onRequestClose={
          closeEdit
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

            {/* HEADER */}

            <View
              style={
                styles.editHeader
              }
            >

              <View
                style={
                  styles.editIcon
                }
              >

                <MaterialIcons
                  name="edit"
                  size={22}
                  color="#3498db"
                />

              </View>

              <Text
                style={
                  styles.modalTitle
                }
              >
                {t.editMember ||
                  "Edit Member"}
              </Text>

            </View>


            {/* NAME */}

            <TextInput
              placeholderTextColor="#999"
              placeholder={t.name}
              value={editName}
              onChangeText={setEditName}
              style={
                styles.input
              }
            />


            {/* PHONE */}

            <TextInput
              placeholderTextColor="#999"
              placeholder={t.phonePlaceholder}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              style={
                styles.input
              }
            />


            {/* ROLE */}

            <TouchableOpacity
              onPress={() =>
                setEditRoleModal(true)
              }

              style={
                styles.input
              }
            >

              <Text
                style={{
                  color:
                    editRole
                      ? "#222"
                      : "#999"
                }}
              >
                {
                  editRole
                    ? getRoleLabel(
                        editRole
                      )
                    : t.selectRolePlaceholder
                }
              </Text>

            </TouchableOpacity>


            {/* SAVE */}

            <TouchableOpacity
              style={
                styles.button
              }

              onPress={
                updateMember
              }
            >

              <MaterialIcons
                name="save"
                size={20}
                color="#fff"
              />

              <Text
                style={
                  styles.btnText
                }
              >
                {t.save ||
                  "Save"}
              </Text>

            </TouchableOpacity>


            {/* CANCEL */}

            <Pressable
              style={
                styles.cancelButton
              }

              onPress={
                closeEdit
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
          EDIT ROLE SELECT MODAL
      ===================================================== */}

      <Modal
        visible={editRoleModal}
        transparent
        animationType="fade"

        onRequestClose={() =>
          setEditRoleModal(false)
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


            <ScrollView
              showsVerticalScrollIndicator={false}
            >

              {
                getAllRoles().map(
                  r => (

                    <TouchableOpacity
                      key={r}

                      style={
                        styles.roleOption
                      }

                      onPress={() =>
                        selectEditRole(r)
                      }
                    >

                      <Text
                        style={
                          styles.roleOptionText
                        }
                      >
                        {
                          getRoleLabel(r)
                        }
                      </Text>

                    </TouchableOpacity>

                  )
                )
              }

            </ScrollView>


            {/* CANCEL */}

            <Pressable
              style={
                styles.cancelButton
              }

              onPress={() =>
                setEditRoleModal(false)
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

  // ===========================================================
  // PAGE
  // ===========================================================

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

  memberActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },

  actionButton: {
    padding: 7
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

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",

    gap: 7
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

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",

    gap: 6
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

  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15
  },

  editIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eef6fc",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10
  },

  roleOption: {
    borderBottomColor: "#eee",

    borderBottomWidth: 1,

    paddingVertical: 12
  },

  roleOptionText: {
    fontSize: 15,
    color: "#2c3e50"
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