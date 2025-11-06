-- schema.sql
-- this is a file to create the required tables for this application

-- User Profiles Table

DROP TABLE IF EXISTS user_profiles;

CREATE TABLE user_profiles (
    User_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT NOT NULL UNIQUE,
    Password_Hash TEXT NOT NULL UNIQUE,
    Admin_Status BOOLEAN DEFAULT FALSE
);


-- Machine Metrics Table

DROP TABLE IF EXISTS machine_metrics;

CREATE TABLE machine_metrics (
    Metrics_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Machine_ID INTEGER FOREIGN KEY REFERENCES machine_details(Machine_ID),
    Current_Time INTEGER NOT NULL,
    Current_CPU_Usage INTEGER,
    Current_Memory_Usage INTEGER,
    Current_Disk_Usage INTEGER
);

-- Machine Details Table

DROP TABLE IF EXISTS machine_details;

CREATE TABLE machine_details (
    Machine_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    User_ID INTEGER FOREIGN KEY REFERENCES user_profiles(User_ID),
    Admin_Only BOOLEAN DEFAULT FALSE,
    Gather_CPU_Details BOOLEAN DEFAULT TRUE,
    Gather_Memory_Details BOOLEAN DEFAULT TRUE,
    Gather_Disk_Details BOOLEAN DEFAULT TRUE
);


-- Saved Dashboards Table

DROP TABLE IF EXISTS saved_dashboards;

CREATE TABLE saved_dashboards (
    Dashboard_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    User_ID INTEGER FOREIGN KEY REFERENCES user_profiles(User_ID),
    Machine_ID INTEGER FOREIGN KEY REFERENCES machine_details(Machine_ID),
    Admin_Only BOOLEAN DEFAULT FALSE,
    Show_CPU_Usage TEXT NOT NULL,
    Show_Memory_Usage TEXT NOT NULL,
    Show_Disk_Usage TEXT NOT NULL
);


