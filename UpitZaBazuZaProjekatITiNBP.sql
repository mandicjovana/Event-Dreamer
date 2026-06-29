CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    RoleId INT NOT NULL,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    FOREIGN KEY (RoleId) REFERENCES Roles(Id)
);

CREATE TABLE EventTypes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL
);
CREATE TABLE Events (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    EventTypesId INT NOT NULL,
    Title NVARCHAR(100) NOT NULL,
    Date DATETIME,
    Location NVARCHAR(100) NOT NULL,
    TotalBudget DECIMAL(18, 2) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(Id),
    FOREIGN KEY (EventTypesID) REFERENCES EventTypes(Id)
);

CREATE TABLE Guests (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EventId INT NOT NULL,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    RSVPStatus NVARCHAR(30) DEFAULT 'Pozvan' NOT NULL, 
    TableNumber INT,
    FOREIGN KEY (EventId) REFERENCES Events(Id)
);

CREATE TABLE DietaryRequirements (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    GuestID INT NOT NULL,
    RequirementType NVARCHAR(50) NOT NULL,
    FOREIGN KEY (GuestID) REFERENCES Guests(Id)
);

CREATE TABLE Tasks (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EventID INT NOT NULL,
    TaskName NVARCHAR(100) NOT NULL,
    DueDate DATETIME,
    IsCompleted BIT DEFAULT 0 NOT NULL,
    FOREIGN KEY (EventID) REFERENCES Events(Id),
);

CREATE TABLE VendorCategories (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL,
);

CREATE TABLE Vendors (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CategoryID INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Contact VARCHAR(50) NOT NULL,
    BasePrice DECIMAL(18, 2) NOT NULL,
    ImagePath NVARCHAR(255) NOT NULL,
    FOREIGN KEY (CategoryID) REFERENCES VendorCategories(Id),
);

CREATE TABLE Expenses (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EventID INT NOT NULL,
    VendorId INT,
    ExpenseName NVARCHAR(100) NOT NULL,
    PlannedAmount DECIMAL(18, 2) NOT NULL,
    ActualAmount DECIMAL(18, 2) NOT NULL,
    IsPaid BIT DEFAULT 0 NOT NULL,
    FOREIGN KEY (EventID) REFERENCES Events(Id),
    FOREIGN KEY (VendorID) REFERENCES Vendors(Id),
);

INSERT INTO Roles (RoleName) VALUES ('Admin'), ('Korisnik');
INSERT INTO EventTypes (Name) VALUES 
('Vjenčanje'), ('Djevojačko veče'), ('Rođendan'), ('Krštenje'), ('Gala večera');
INSERT INTO VendorCategories (CategoryName) VALUES 
('Restorani i Sale'), ('Fotografi'), ('Muzika i Bendovi'), ('Dekoracija'), ('Poslastičare');
INSERT INTO Users (RoleId, FirstName, LastName, Email, Password) VALUES 
(1, 'Jovana', 'Mandić', 'mandicjovana478@gmail.com', 'admin123'),
(2, 'Jelena', 'Jovanović', 'jelena@gmail.com', 'jelena123'),
(2, 'Marija', 'Marković', 'marija@gmail.com', 'marija123');

INSERT INTO Vendors (CategoryID, Name, Contact, BasePrice, ImagePath) VALUES 
(1, 'Hotel Splendid', '067-111-222', 5000.00, 'splendid.jpg'),
(1, 'Imanje Knjaz', '067-333-444', 3500.00, 'knjaz.jpg'),
(2, 'Focus Studio', '068-555-666', 800.00, 'focus.jpg'),
(3, 'Prizma Bend', '069-777-888', 1200.00, 'prizma.jpg'),
(5, 'Čarolija Slatkiša', '067-999-000', 300.00, 'torte.jpg');

INSERT INTO Events (UserID, EventTypesId, Title, Date, Location, TotalBudget) VALUES 
(2, 1, 'Vjenčanje Jelena & Marko', '2026-08-15 17:00:00', 'Imanje Knjaz, Podgorica', 15000.00),
(2, 2, 'Jelenino djevojačko veče', '2026-08-01 20:00:00', 'Konoba Badanj', 500.00);


INSERT INTO Guests (EventId, FirstName, LastName, RSVPStatus, TableNumber) VALUES 
(1, 'Nikola', 'Nikić', 'Potvrdio', 1),
(1, 'Ana', 'Anić', 'Potvrdio', 1),
(1, 'Petar', 'Petrović', 'Pozvan', NULL),
(1, 'Ivana', 'Ivić', 'Odbio', NULL);

INSERT INTO Tasks (EventId, TaskName, DueDate, IsCompleted) VALUES 
(1, 'Rezervisati salu', '2026-01-01', 1),
(1, 'Kupiti vjenčanicu', '2026-04-15', 0),
(1, 'Odabrati muziku', '2026-03-20', 1),
(1, 'Poslati pozivnice', '2026-06-01', 0);

INSERT INTO Expenses (EventID, VendorId, ExpenseName, PlannedAmount, ActualAmount, IsPaid) VALUES 
(1, 2, 'Rezervacija sale', 3500.00, 3500.00, 1),
(1, 3, 'Fotografisanje', 800.00, 900.00, 0);

