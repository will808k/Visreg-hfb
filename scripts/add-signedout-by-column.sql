-- Add signedout_by column to visits table
-- This column will store the user ID of the person who signed out the visitor

ALTER TABLE visits 
ADD COLUMN signedout_by INT(11) NULL 
AFTER registered_by;

-- Add foreign key constraint to ensure data integrity
ALTER TABLE visits 
ADD CONSTRAINT fk_visits_signedout_by 
FOREIGN KEY (signedout_by) REFERENCES users(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_visits_signedout_by ON visits(signedout_by);

-- Optional: Add a comment to document the column purpose
ALTER TABLE visits 
MODIFY COLUMN signedout_by INT(11) NULL 
COMMENT 'User ID of the person who signed out the visitor';
