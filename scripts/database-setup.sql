-- Create database
CREATE DATABASE IF NOT EXISTS visreg;
USE visreg;

-- Branches table
CREATE TABLE branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    offices JSON,
    reasons JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    branch_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Visitors table
CREATE TABLE visitors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    digital_card_no VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    office VARCHAR(255) NOT NULL,
    branch_id INT NOT NULL,
    has_laptop BOOLEAN DEFAULT FALSE,
    laptop_brand VARCHAR(100),
    laptop_model VARCHAR(100),
    photo LONGBLOB,
    id_photo_front LONGBLOB,
    id_photo_back LONGBLOB,
    signature LONGBLOB,
    sign_in_time DATETIME NOT NULL,
    sign_out_time DATETIME,
    registered_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (registered_by) REFERENCES users(id)
);

-- Insert sample data
INSERT INTO branches (name, location, offices, reasons) VALUES
('Main Office', '123 Business Street, City Center', 
 '["Reception", "HR Department", "IT Department", "Finance", "Management"]',
 '["Business Meeting", "Job Interview", "Delivery", "Maintenance", "Consultation"]'),
('Branch Office', '456 Commerce Ave, Downtown', 
 '["Customer Service", "Sales", "Marketing", "Operations"]',
 '["Client Meeting", "Product Demo", "Support Visit", "Training Session"]');

-- Insert sample admin user (password: admin123)
INSERT INTO users (name, email, phone_number, password, branch_id, is_active) VALUES
('Admin User', 'admin@company.com', '+1234567890', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, TRUE);
