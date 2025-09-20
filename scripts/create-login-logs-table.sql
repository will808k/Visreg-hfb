-- Create login_logs table for tracking user login attempts
-- This table will capture all login attempts (successful and failed)

CREATE TABLE IF NOT EXISTS login_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    email VARCHAR(255),
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    failure_reason VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    INDEX idx_success (success),
    INDEX idx_timestamp (timestamp),
    INDEX idx_ip_address (ip_address),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample data (optional - for testing)
-- INSERT INTO login_logs (user_id, email, success, ip_address, user_agent, failure_reason) VALUES
-- (1, 'admin@company.com', TRUE, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NULL),
-- (NULL, 'invalid@email.com', FALSE, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Invalid credentials');
