#!/usr/bin/env node

/**
 * Cleanup Old Data Script
 *
 * This script deletes visitor and visit records older than 4 years from the database.
 * It should be run periodically via cron job.
 *
 * Schedule recommendation: Run monthly on the 1st at 2:00 AM
 * Cron expression: 0 2 1 * *
 *
 * Usage:
 *   node scripts/cleanup-old-data.js
 *
 * Or with environment variables:
 *   RETENTION_YEARS=4 node scripts/cleanup-old-data.js
 */

const mysql = require("mysql2/promise");
require("dotenv").config();

// Configuration
const RETENTION_YEARS = process.env.RETENTION_YEARS || 4;
const DRY_RUN = process.env.DRY_RUN === "true";

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "visreg",
};

/**
 * Log with timestamp
 */
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Main cleanup function
 */
async function cleanupOldData() {
  let connection;

  try {
    log("Starting data cleanup process...");
    log(`Retention period: ${RETENTION_YEARS} years`);
    log(`Dry run mode: ${DRY_RUN ? "YES" : "NO"}`);

    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    log("Database connection established");

    // Calculate cutoff date (4 years ago)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    log(`Cutoff date: ${cutoffDateStr}`);
    log(`Records created before this date will be deleted`);

    // Start transaction
    await connection.beginTransaction();
    log("Transaction started");

    // Step 1: Count records to be deleted (for logging)
    const [visitsCounts] = await connection.execute(
      `SELECT COUNT(*) as count FROM visits WHERE created_at < ?`,
      [cutoffDateStr]
    );
    const visitsToDelete = visitsCounts[0].count;

    const [visitorsCount] = await connection.execute(
      `SELECT COUNT(*) as count FROM visitors 
       WHERE created_at < ? 
       AND id NOT IN (SELECT DISTINCT visitor_id FROM visits WHERE created_at >= ?)`,
      [cutoffDateStr, cutoffDateStr]
    );
    const visitorsToDelete = visitorsCount[0].count;

    log(`Found ${visitsToDelete} visit records to delete`);
    log(
      `Found ${visitorsToDelete} visitor records to delete (with no recent visits)`
    );

    if (DRY_RUN) {
      log("DRY RUN MODE - No data will be deleted", "WARN");
      await connection.rollback();
      return {
        dryRun: true,
        visitsToDelete,
        visitorsToDelete,
        cutoffDate: cutoffDateStr,
      };
    }

    if (visitsToDelete === 0 && visitorsToDelete === 0) {
      log("No records to delete", "INFO");
      await connection.rollback();
      return {
        visitsDeleted: 0,
        visitorsDeleted: 0,
        cutoffDate: cutoffDateStr,
      };
    }

    // Step 2: Delete old visits
    log("Deleting old visit records...");
    const [visitsResult] = await connection.execute(
      `DELETE FROM visits WHERE created_at < ?`,
      [cutoffDateStr]
    );
    const visitsDeleted = visitsResult.affectedRows;
    log(`Deleted ${visitsDeleted} visit records`);

    // Step 3: Delete orphaned visitors (visitors with no remaining visits)
    log("Deleting orphaned visitor records...");
    const [visitorsResult] = await connection.execute(
      `DELETE FROM visitors 
       WHERE created_at < ? 
       AND id NOT IN (SELECT DISTINCT visitor_id FROM visits)`,
      [cutoffDateStr]
    );
    const visitorsDeleted = visitorsResult.affectedRows;
    log(`Deleted ${visitorsDeleted} visitor records`);

    // Commit transaction
    await connection.commit();
    log("Transaction committed successfully");

    // Summary
    log("=".repeat(60));
    log("CLEANUP SUMMARY", "INFO");
    log(`Cutoff Date: ${cutoffDateStr}`);
    log(`Visits Deleted: ${visitsDeleted}`);
    log(`Visitors Deleted: ${visitorsDeleted}`);
    log(`Total Records Deleted: ${visitsDeleted + visitorsDeleted}`);
    log("=".repeat(60));

    return {
      success: true,
      visitsDeleted,
      visitorsDeleted,
      cutoffDate: cutoffDateStr,
    };
  } catch (error) {
    log(`Error during cleanup: ${error.message}`, "ERROR");
    log(error.stack, "ERROR");

    // Rollback transaction on error
    if (connection) {
      try {
        await connection.rollback();
        log("Transaction rolled back due to error", "WARN");
      } catch (rollbackError) {
        log(`Rollback failed: ${rollbackError.message}`, "ERROR");
      }
    }

    throw error;
  } finally {
    // Close connection
    if (connection) {
      await connection.end();
      log("Database connection closed");
    }
  }
}

/**
 * Main execution
 */
if (require.main === module) {
  cleanupOldData()
    .then((result) => {
      log("Cleanup completed successfully", "INFO");
      process.exit(0);
    })
    .catch((error) => {
      log("Cleanup failed", "ERROR");
      process.exit(1);
    });
}

module.exports = { cleanupOldData };
