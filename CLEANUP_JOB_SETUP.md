# Data Cleanup Job Setup Guide

This guide explains how to set up an automated job to delete visitor and visit records older than 4 years.

## Overview

The cleanup system provides two options:

1. **Node.js Script** (Recommended) - Automated with logging and error handling
2. **SQL Script** - Manual execution for one-time cleanups

## Option 1: Node.js Script (Recommended)

### Prerequisites

- Node.js installed
- `mysql2` package (already in project dependencies)
- Database credentials in `.env` file

### Configuration

The script uses environment variables from your `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=visreg

# Optional: Override retention period (default: 4 years)
RETENTION_YEARS=4
```

### Usage

#### Test Run (Dry Run)

Before actually deleting data, test what would be deleted:

```bash
DRY_RUN=true node scripts/cleanup-old-data.js
```

#### Actual Cleanup

Run the cleanup:

```bash
node scripts/cleanup-old-data.js
```

#### Custom Retention Period

Delete data older than 5 years instead:

```bash
RETENTION_YEARS=5 node scripts/cleanup-old-data.js
```

### Setting Up Automated Cron Job

#### 1. Make the script executable

```bash
chmod +x scripts/cleanup-old-data.js
```

#### 2. Edit your crontab

```bash
crontab -e
```

#### 3. Add one of these cron schedules

**Monthly cleanup (1st of month at 2:00 AM):**

```cron
0 2 1 * * cd /home/willadmin/Desktop/code/Visreg-hfb && node scripts/cleanup-old-data.js >> /var/log/visreg-cleanup.log 2>&1
```

**Quarterly cleanup (1st day of quarter at 2:00 AM):**

```cron
0 2 1 1,4,7,10 * cd /home/willadmin/Desktop/code/Visreg-hfb && node scripts/cleanup-old-data.js >> /var/log/visreg-cleanup.log 2>&1
```

**Yearly cleanup (January 1st at 2:00 AM):**

```cron
0 2 1 1 * cd /home/willadmin/Desktop/code/Visreg-hfb && node scripts/cleanup-old-data.js >> /var/log/visreg-cleanup.log 2>&1
```

**Weekly cleanup (Every Sunday at 3:00 AM):**

```cron
0 3 * * 0 cd /home/willadmin/Desktop/code/Visreg-hfb && node scripts/cleanup-old-data.js >> /var/log/visreg-cleanup.log 2>&1
```

#### 4. View logs

```bash
tail -f /var/log/visreg-cleanup.log
```

## Option 2: SQL Script (Manual)

### Usage

#### Preview what will be deleted

```bash
mysql -u root -p visreg < scripts/cleanup-old-data.sql
```

The script will:

1. Show counts before deletion
2. Delete old records
3. Show counts after deletion
4. Optimize tables

### Modifying Retention Period

Edit `scripts/cleanup-old-data.sql` and change `INTERVAL 4 YEAR` to your desired period:

```sql
-- Change 4 to any number of years
WHERE created_at < DATE_SUB(NOW(), INTERVAL 4 YEAR)
```

## How It Works

### Deletion Logic

1. **Delete Visits**: Removes all visit records where `created_at` is older than 4 years
2. **Delete Visitors**: Removes visitor records that:
   - Have `created_at` older than 4 years
   - AND have no remaining visits in the database

This ensures:

- Visitors with recent visits are kept, even if their profile is old
- Only truly inactive visitors are removed
- Data integrity is maintained (no orphaned records)

### What Gets Deleted

```
Visits older than 4 years → DELETED
Visitors older than 4 years with NO visits → DELETED
Visitors older than 4 years with recent visits → KEPT
```

### Safety Features

- **Transaction-based**: All operations are wrapped in transactions
- **Dry run mode**: Test before actual deletion
- **Detailed logging**: Track what was deleted and when
- **Error handling**: Automatic rollback on failure
- **Orphan prevention**: Only deletes visitors with no remaining visits

## Monitoring

### Check Last Cleanup Run

```bash
tail -20 /var/log/visreg-cleanup.log
```

### Check Data Age Distribution

```sql
USE visreg;

-- Check oldest records
SELECT
    'Visits' as table_name,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    COUNT(*) as total_records
FROM visits
UNION ALL
SELECT
    'Visitors' as table_name,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    COUNT(*) as total_records
FROM visitors;

-- Count records by age
SELECT
    CASE
        WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN '< 1 year'
        WHEN created_at >= DATE_SUB(NOW(), INTERVAL 2 YEAR) THEN '1-2 years'
        WHEN created_at >= DATE_SUB(NOW(), INTERVAL 3 YEAR) THEN '2-3 years'
        WHEN created_at >= DATE_SUB(NOW(), INTERVAL 4 YEAR) THEN '3-4 years'
        ELSE '> 4 years'
    END as age_range,
    COUNT(*) as count
FROM visits
GROUP BY age_range
ORDER BY age_range;
```

## Backup Recommendations

**IMPORTANT**: Always backup your database before running cleanup operations!

### Create Backup

```bash
# Full database backup
mysqldump -u root -p visreg > visreg_backup_$(date +%Y%m%d).sql

# Backup only old data (before deletion)
mysqldump -u root -p visreg \
  --where="created_at < DATE_SUB(NOW(), INTERVAL 4 YEAR)" \
  visits visitors > visreg_old_data_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
mysql -u root -p visreg < visreg_backup_20240101.sql
```

## Troubleshooting

### Permission Denied

```bash
chmod +x scripts/cleanup-old-data.js
```

### Cron Job Not Running

Check cron logs:

```bash
grep CRON /var/log/syslog
```

### Database Connection Error

Verify `.env` file has correct credentials:

```bash
cat .env | grep DB_
```

### Script Fails Silently

Check the log file:

```bash
tail -50 /var/log/visreg-cleanup.log
```

## Performance Considerations

- The cleanup runs in a transaction for data safety
- Large deletions (100k+ records) may take several minutes
- Schedule during low-traffic periods (e.g., 2-4 AM)
- After cleanup, tables are optimized to reclaim disk space

## Customization

### Change Retention Period

Edit `.env`:

```env
RETENTION_YEARS=5  # Keep 5 years instead of 4
```

### Change Log Location

Edit crontab and update log path:

```cron
>> /path/to/your/custom/cleanup.log 2>&1
```

### Add Email Notifications

Install `mailutils` and modify crontab:

```cron
0 2 1 * * cd /path/to/project && node scripts/cleanup-old-data.js 2>&1 | mail -s "Visreg Cleanup Report" admin@example.com
```

## Security Notes

- Keep database credentials secure in `.env`
- Restrict log file permissions: `chmod 600 /var/log/visreg-cleanup.log`
- Review deletion logs regularly
- Test dry run before actual cleanup
- Maintain backups for at least 30 days after cleanup
