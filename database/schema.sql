CREATE DATABASE IF NOT EXISTS BookApp;

USE BookApp;

CREATE TABLE User (
    User_ID         INT AUTO_INCREMENT PRIMARY KEY,
    Name            VARCHAR(100) NOT NULL,
    Email           VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash    VARCHAR(255) NOT NULL,
    DOB             DATE,
    Registered_At   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Author (
    Author_ID       INT AUTO_INCREMENT PRIMARY KEY,
    Name            VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Genre (
    Genre_ID        INT AUTO_INCREMENT PRIMARY KEY,
    Name            VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Book (
    Book_ID         VARCHAR(20) PRIMARY KEY,       
    Title           VARCHAR(500) NOT NULL,
    Synopsis        TEXT,
    Year            INT,
    Language        VARCHAR(10),
    Cover_URL       VARCHAR(500),
    INDEX idx_title (Title)
);

CREATE TABLE Book_Author (
    Book_ID         VARCHAR(20),
    Author_ID       INT,
    PRIMARY KEY (Book_ID, Author_ID),
    FOREIGN KEY (Book_ID) REFERENCES Book(Book_ID) ON DELETE CASCADE,
    FOREIGN KEY (Author_ID) REFERENCES Author(Author_ID) ON DELETE CASCADE
);
 
CREATE TABLE Book_Genre (
    Book_ID         VARCHAR(20),
    Genre_ID        INT,
    PRIMARY KEY (Book_ID, Genre_ID),
    FOREIGN KEY (Book_ID) REFERENCES Book(Book_ID) ON DELETE CASCADE,
    FOREIGN KEY (Genre_ID) REFERENCES Genre(Genre_ID) ON DELETE CASCADE
);

CREATE TABLE List (
    List_ID         INT AUTO_INCREMENT PRIMARY KEY,
    User_ID         INT NOT NULL,
    List_Name       VARCHAR(150) NOT NULL,
    Description     TEXT,
    Created_At      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
);
 
CREATE TABLE List_Entry (
    ListEntryID     INT AUTO_INCREMENT PRIMARY KEY,
    List_ID         INT NOT NULL,
    Book_ID         VARCHAR(20) NOT NULL,
    DateAdded       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_list_book (List_ID, Book_ID),
    FOREIGN KEY (List_ID) REFERENCES List(List_ID) ON DELETE CASCADE,
    FOREIGN KEY (Book_ID) REFERENCES Book(Book_ID) ON DELETE CASCADE
);
 
CREATE TABLE Review (
    Review_ID       INT AUTO_INCREMENT PRIMARY KEY,
    User_ID         INT NOT NULL,
    Book_ID         VARCHAR(20) NOT NULL,
    Rating          TINYINT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Text            TEXT,
    Created_On      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_book_review (User_ID, Book_ID),
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Book_ID) REFERENCES Book(Book_ID) ON DELETE CASCADE
);
 
CREATE TABLE Reading_Log (
    Log_ID          INT AUTO_INCREMENT PRIMARY KEY,
    User_ID         INT NOT NULL,
    Book_ID         VARCHAR(20) NOT NULL,
    Status          ENUM('want_to_read', 'currently_reading', 'read') NOT NULL,
    UNIQUE KEY uq_user_book_log (User_ID, Book_ID),
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Book_ID) REFERENCES Book(Book_ID) ON DELETE CASCADE
);
 
 
CREATE TABLE Friendship (
    User_ID_1       INT NOT NULL,                   -- requester
    User_ID_2       INT NOT NULL,                   -- recipient
    Status          ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'pending',
    Created_At      DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (User_ID_1, User_ID_2),
    FOREIGN KEY (User_ID_1) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (User_ID_2) REFERENCES User(User_ID) ON DELETE CASCADE,
    CHECK (User_ID_1 <> User_ID_2)
);
 
CREATE TABLE Notification (
    Notification_ID INT AUTO_INCREMENT PRIMARY KEY,
    User_ID         INT NOT NULL,                   -- recipient
    NotificationType ENUM('friend_request', 'friend_accepted', 'review', 'list_share', 'system') NOT NULL,
    Message         VARCHAR(500),
    ReferenceID     VARCHAR(50),                    -- ID of related entity (review, list, user, etc.)
    Created_At      DATETIME DEFAULT CURRENT_TIMESTAMP,
    Is_Read         BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
);