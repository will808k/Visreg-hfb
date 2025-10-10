-- Cleanup Old Data SQL Script
-- This script deletes visitor and visit records older than 4 years
-- 
-- IMPORTANT: This is a destructive operation. Make sure you have a backup before running.
-- 
-- Usage:
--   mysql -u root -p visreg < scripts/cleanup-old-data.sql
-- 
-- Or run directly in MySQL/MariaDB console:
--   source scripts/cleanup-old-data.sql;

USE visreg;

-- Show current counts before deletion
SELECT 'BEFORE CLEANUP - Current Record Counts' as Status;
SELECT 
    'Visits' as Table_Name,
    COUNT(*) as Total_Records,
    SUM(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 4 YEAR) THEN 1 ELSE 0 END) as Records_Older_Than_4_Years
FROM visits
UNION ALL
SELECT 
    'Visitors' as Table_Name,
    COUNT(*) as Total_Records,
    SUM(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 4 YEAR) THEN 1 ELSE 0 END) as Records_Older_Than_4_Years
FROM visitors;

-- Start transaction
START TRANSACTION;

-- Delete visits older than 4 years
DELETE FROM visits 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 4 YEAR);

-- Get count of deleted visits
SELECT ROW_COUNT() as 'Visits Deleted';

-- Delete visitors older than 4 years that have no remaining visits
DELETE FROM visitors 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 4 YEAR)
AND id NOT IN (SELECT DISTINCT visitor_id FROM visits);

-- Get count of deleted visitors
SELECT ROW_COUNT() as 'Visitors Deleted';

-- Show counts after deletion
SELECT 'AFTER CLEANUP - Remaining Record Counts' as Status;
SELECT 
    'Visits' as Table_Name,
    COUNT(*) as Total_Records
FROM visits
UNION ALL
SELECT 
    'Visitors' as Table_Name,
    COUNT(*) as Total_Records
FROM visitors;

-- Commit the transaction
-- IMPORTANT: Review the results above before committing!
-- If you want to rollback instead, run: ROLLBACK;
COMMIT;

-- Optimize tables to reclaim disk space
OPTIMIZE TABLE visits;
OPTIMIZE TABLE visitors;

SELECT 'Cleanup completed successfully!' as Status;

