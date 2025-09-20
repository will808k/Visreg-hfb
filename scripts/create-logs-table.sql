-- Create logs table for tracking CRUD operations
-- This table will capture all changes to branch_offices, branch_reasons, and users tables

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    operation ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_fields JSON,
    user_id INT,
    user_name VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_operation (operation),
    INDEX idx_user (user_id),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create triggers for branch_offices table
DELIMITER $$

-- Trigger for INSERT on branch_offices
CREATE TRIGGER branch_offices_after_insert
AFTER INSERT ON branch_offices
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name, 
        record_id, 
        operation, 
        new_values, 
        user_id,
        user_name
    ) VALUES (
        'branch_offices',
        NEW.id,
        'CREATE',
        JSON_OBJECT(
            'id', NEW.id,
            'branch_id', NEW.branch_id,
            'office_name', NEW.office_name
        ),
        @current_user_id,
        @current_user_name
    );
END$$

-- Trigger for UPDATE on branch_offices
CREATE TRIGGER branch_offices_after_update
AFTER UPDATE ON branch_offices
FOR EACH ROW
BEGIN
    DECLARE changed_fields JSON DEFAULT JSON_ARRAY();
    
    -- Check which fields changed
    IF OLD.branch_id != NEW.branch_id THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'branch_id');
    END IF;
    
    IF OLD.office_name != NEW.office_name THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'office_name');
    END IF;
    
    -- Only log if there were actual changes
    IF JSON_LENGTH(changed_fields) > 0 THEN
        INSERT INTO audit_logs (
            table_name, 
            record_id, 
            operation, 
            old_values, 
            new_values, 
            changed_fields,
            user_id,
            user_name
        ) VALUES (
            'branch_offices',
            NEW.id,
            'UPDATE',
            JSON_OBJECT(
                'id', OLD.id,
                'branch_id', OLD.branch_id,
                'office_name', OLD.office_name
            ),
            JSON_OBJECT(
                'id', NEW.id,
                'branch_id', NEW.branch_id,
                'office_name', NEW.office_name
            ),
            changed_fields,
            @current_user_id,
            @current_user_name
        );
    END IF;
END$$

-- Trigger for DELETE on branch_offices
CREATE TRIGGER branch_offices_after_delete
AFTER DELETE ON branch_offices
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name, 
        record_id, 
        operation, 
        old_values,
        user_id,
        user_name
    ) VALUES (
        'branch_offices',
        OLD.id,
        'DELETE',
        JSON_OBJECT(
            'id', OLD.id,
            'branch_id', OLD.branch_id,
            'office_name', OLD.office_name
        ),
        @current_user_id,
        @current_user_name
    );
END$$

-- Trigger for INSERT on branch_reasons
CREATE TRIGGER branch_reasons_after_insert
AFTER INSERT ON branch_reasons
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name, 
        record_id, 
        operation, 
        new_values,
        user_id,
        user_name
    ) VALUES (
        'branch_reasons',
        NEW.id,
        'CREATE',
        JSON_OBJECT(
            'id', NEW.id,
            'branch_id', NEW.branch_id,
            'reason_name', NEW.reason_name
        ),
        @current_user_id,
        @current_user_name
    );
END$$

-- Trigger for UPDATE on branch_reasons
CREATE TRIGGER branch_reasons_after_update
AFTER UPDATE ON branch_reasons
FOR EACH ROW
BEGIN
    DECLARE changed_fields JSON DEFAULT JSON_ARRAY();
    
    -- Check which fields changed
    IF OLD.branch_id != NEW.branch_id THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'branch_id');
    END IF;
    
    IF OLD.reason_name != NEW.reason_name THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'reason_name');
    END IF;
    
    -- Only log if there were actual changes
    IF JSON_LENGTH(changed_fields) > 0 THEN
        INSERT INTO audit_logs (
            table_name, 
            record_id, 
            operation, 
            old_values, 
            new_values, 
            changed_fields,
            user_id,
            user_name
        ) VALUES (
            'branch_reasons',
            NEW.id,
            'UPDATE',
            JSON_OBJECT(
                'id', OLD.id,
                'branch_id', OLD.branch_id,
                'reason_name', OLD.reason_name
            ),
            JSON_OBJECT(
                'id', NEW.id,
                'branch_id', NEW.branch_id,
                'reason_name', NEW.reason_name
            ),
            changed_fields,
            @current_user_id,
            @current_user_name
        );
    END IF;
END$$

-- Trigger for DELETE on branch_reasons
CREATE TRIGGER branch_reasons_after_delete
AFTER DELETE ON branch_reasons
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name, 
        record_id, 
        operation, 
        old_values,
        user_id,
        user_name
    ) VALUES (
        'branch_reasons',
        OLD.id,
        'DELETE',
        JSON_OBJECT(
            'id', OLD.id,
            'branch_id', OLD.branch_id,
            'reason_name', OLD.reason_name
        ),
        @current_user_id,
        @current_user_name
    );
END$$

-- Trigger for INSERT on users
CREATE TRIGGER users_after_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name, 
        record_id, 
        operation, 
        new_values,
        user_id,
        user_name
    ) VALUES (
        'users',
        NEW.id,
        'CREATE',
        JSON_OBJECT(
            'id', NEW.id,
            'name', NEW.name,
            'email', NEW.email,
            'phone_number', NEW.phone_number,
            'branch_id', NEW.branch_id,
            'is_active', NEW.is_active,
            'isAdmin', NEW.isAdmin
        ),
        @current_user_id,
        @current_user_name
    );
END$$

-- Trigger for UPDATE on users
CREATE TRIGGER users_after_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    DECLARE changed_fields JSON DEFAULT JSON_ARRAY();
    
    -- Check which fields changed (excluding password for security)
    IF OLD.name != NEW.name THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'name');
    END IF;
    
    IF OLD.email != NEW.email THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'email');
    END IF;
    
    IF OLD.phone_number != NEW.phone_number THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'phone_number');
    END IF;
    
    IF OLD.branch_id != NEW.branch_id THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'branch_id');
    END IF;
    
    IF OLD.is_active != NEW.is_active THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'is_active');
    END IF;
    
    IF OLD.isAdmin != NEW.isAdmin THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'isAdmin');
    END IF;
    
    -- Check if password was changed (we can't compare hashes, so we'll assume it changed if the field was provided)
    IF OLD.password != NEW.password THEN
        SET changed_fields = JSON_ARRAY_APPEND(changed_fields, '$', 'password');
    END IF;
    
    -- Only log if there were actual changes
    IF JSON_LENGTH(changed_fields) > 0 THEN
        INSERT INTO audit_logs (
            table_name, 
            record_id, 
            operation, 
            old_values, 
            new_values, 
            changed_fields,
            user_id,
            user_name
        ) VALUES (
            'users',
            NEW.id,
            'UPDATE',
            JSON_OBJECT(
                'id', OLD.id,
                'name', OLD.name,
                'email', OLD.email,
                'phone_number', OLD.phone_number,
                'branch_id', OLD.branch_id,
                'is_active', OLD.is_active,
                'isAdmin', OLD.isAdmin
            ),
            JSON_OBJECT(
                'id', NEW.id,
                'name', NEW.name,
                'email', NEW.email,
                'phone_number', NEW.phone_number,
                'branch_id', NEW.branch_id,
                'is_active', NEW.is_active,
                'isAdmin', NEW.isAdmin
            ),
            changed_fields,
            @current_user_id,
            @current_user_name
        );
    END IF;
END$$

-- Trigger for DELETE on users
CREATE TRIGGER users_after_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name, 
        record_id, 
        operation, 
        old_values,
        user_id,
        user_name
    ) VALUES (
        'users',
        OLD.id,
        'DELETE',
        JSON_OBJECT(
            'id', OLD.id,
            'name', OLD.name,
            'email', OLD.email,
            'phone_number', OLD.phone_number,
            'branch_id', OLD.branch_id,
            'is_active', OLD.is_active,
            'isAdmin', OLD.isAdmin
        ),
        @current_user_id,
        @current_user_name
    );
END$$

DELIMITER ;
