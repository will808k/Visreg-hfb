-- Add category column to visits table
ALTER TABLE visits ADD COLUMN category ENUM('Normal', 'Vendor', 'Employee') NOT NULL DEFAULT 'Normal' AFTER visitor_id;

-- Add index for category column for better performance
ALTER TABLE visits ADD INDEX idx_visits_category (category);
