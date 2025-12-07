-- SQL Migration Script
-- Add 'leftwithdevice' column to visits table
-- Add 'residence' column to visitors table

-- Add leftwithdevice column to visits table
-- This column will store JSON data about which items the visitor left with
ALTER TABLE visits 
ADD COLUMN leftwithdevice TEXT NULL 
COMMENT 'JSON string storing which items the visitor left with (equipment and other items)';

-- Add residence column to visitors table
-- This column stores the place of residence for each visitor
ALTER TABLE visitors 
ADD COLUMN residence VARCHAR(255) NULL 
COMMENT 'Place of residence of the visitor';

-- Optional: Add index on residence if you plan to search by it frequently
-- CREATE INDEX idx_visitors_residence ON visitors(residence);

