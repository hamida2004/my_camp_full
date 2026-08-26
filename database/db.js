import * as SQLite from "expo-sqlite";
import { dbEvents } from "../events/events";

export const db = SQLite.openDatabaseSync("bagapp.db");

/**
 * Check whether a column exists in a SQLite table.
 */
const columnExists = (tableName, columnName) => {
  const columns = db.getAllSync(
    `PRAGMA table_info(${tableName})`
  );

  return columns.some(
    (column) => column.name === columnName
  );
};

/**
 * Add missing columns to existing tables.
 *
 * IMPORTANT:
 * CREATE TABLE IF NOT EXISTS does NOT update an existing table.
 * Therefore migrations are required when adding new columns.
 */
const runMigrations = () => {
  try {
    // -------------------------------------------------------
    // PEOPLE
    // -------------------------------------------------------

    if (!columnExists("people", "inventoryImageUri")) {
      db.execSync(`
        ALTER TABLE people
        ADD COLUMN inventoryImageUri TEXT;
      `);
    }

  } catch (error) {
    console.error(
      "Database migration error:",
      error
    );

    throw error;
  }
};

export const initDB = () => {
  try {
    // =======================================================
    // CREATE TABLES
    // =======================================================

    db.execSync(`
      CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        birthDate TEXT,
        money REAL,
        parentPhone TEXT,
        inventoryImageUri TEXT
      );

      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        personId INTEGER,
        itemId INTEGER,
        quantity INTEGER
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        personId INTEGER,
        description TEXT,
        amount REAL
      );

      CREATE TABLE IF NOT EXISTS mentor (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        fullName TEXT,
        birthDate TEXT,
        birthPlace TEXT,
        address TEXT,

        bloodGroup TEXT,

        idNumber TEXT,
        wilaya TEXT,
        daira TEXT,

        phone TEXT,
        email TEXT,
        emergencyPhone TEXT,

        academicLevel TEXT,
        job TEXT,
        familyStatus TEXT,
        sex TEXT,

        role TEXT,
        customRole TEXT
      );

      CREATE TABLE IF NOT EXISTS mentors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        role TEXT
      );

      CREATE TABLE IF NOT EXISTS mentor_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mentorId INTEGER,
        content TEXT,
        date TEXT
      );

      CREATE TABLE IF NOT EXISTS mentor_todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mentorId INTEGER,
        title TEXT,
        completed INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS mentor_meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        date TEXT,
        content TEXT
      );

      CREATE TABLE IF NOT EXISTS important_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT
      );

      CREATE TABLE IF NOT EXISTS camp_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        center TEXT,
        organized_by TEXT,
        location TEXT,
        startDate TEXT,
        children_male INTEGER,
        children_female INTEGER,
        stuff_male INTEGER,
        stuff_female INTEGER,
        endDate TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS camp_staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        role TEXT,
        phone TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_program (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT,
        activity TEXT,
        imageUri TEXT
      );

      CREATE TABLE IF NOT EXISTS global_program (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day INTEGER,
        date TEXT,
        morning TEXT,
        afternoon TEXT,
        evening TEXT,
        notes TEXT,
        imageUri TEXT
      );

      CREATE TABLE IF NOT EXISTS permanences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT
      );

      CREATE TABLE IF NOT EXISTS permanence_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        permanenceId INTEGER,
        mentorId INTEGER,
        shift TEXT
      );
    `);

    // =======================================================
    // MIGRATIONS
    // =======================================================

    runMigrations();

    console.log(
      "Database initialized successfully."
    );

  } catch (error) {
    console.error(
      "Database initialization error:",
      error
    );

    throw error;
  }
};

// ===========================================================
// DELETE PERSON + RELATED DATA
// ===========================================================

export const deletePersonCascade = (
  personId
) => {

  db.runSync(
    "DELETE FROM expenses WHERE personId=?",
    [personId]
  );

  db.runSync(
    "DELETE FROM inventory WHERE personId=?",
    [personId]
  );

  db.runSync(
    "DELETE FROM people WHERE id=?",
    [personId]
  );

  dbEvents.emit("dbUpdated");
};