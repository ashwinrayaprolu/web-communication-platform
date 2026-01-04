-- VoIP Database Initialization Script

-- Create extensions table
CREATE TABLE IF NOT EXISTS extensions (
    id SERIAL PRIMARY KEY,
    extension VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    from_extension VARCHAR(20),
    to_extension VARCHAR(20),
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    status VARCHAR(20),
    direction VARCHAR(10),
    recording_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    extension VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'offline',
    skill_set TEXT[],
    max_concurrent_calls INTEGER DEFAULT 1,
    current_calls INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create active_calls table
CREATE TABLE IF NOT EXISTS active_calls (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    agent_extension VARCHAR(20),
    customer_number VARCHAR(50),
    room_name VARCHAR(100),
    status VARCHAR(20),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ivr_menus table
CREATE TABLE IF NOT EXISTS ivr_menus (
    id SERIAL PRIMARY KEY,
    menu_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    welcome_message TEXT,
    timeout_message TEXT,
    invalid_message TEXT,
    timeout_seconds INTEGER DEFAULT 10,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ivr_menu_options table
CREATE TABLE IF NOT EXISTS ivr_menu_options (
    id SERIAL PRIMARY KEY,
    menu_id VARCHAR(50) REFERENCES ivr_menus(menu_id),
    digit VARCHAR(1) NOT NULL,
    description VARCHAR(200),
    action_type VARCHAR(20),
    action_value VARCHAR(200),
    next_menu_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(menu_id, digit)
);

-- Insert default extensions
INSERT INTO extensions (extension, password, name, email) VALUES
    ('6000', 'test123', 'Test Extension 6000', 'test6000@voip.local'),
    ('6001', 'test123', 'Test Extension 6001', 'test6001@voip.local'),
    ('6002', 'test123', 'Test Extension 6002', 'test6002@voip.local'),
    ('9999', 'ivr123', 'IVR System', 'ivr@voip.local')
ON CONFLICT (extension) DO NOTHING;

-- Insert default agents
INSERT INTO agents (extension, name, email, status, skill_set) VALUES
    ('6001', 'Agent One', 'agent1@voip.local', 'offline', ARRAY['sales', 'support']),
    ('6002', 'Agent Two', 'agent2@voip.local', 'offline', ARRAY['support', 'technical'])
ON CONFLICT (extension) DO NOTHING;

-- Insert default IVR menus
INSERT INTO ivr_menus (menu_id, name, welcome_message, timeout_message, invalid_message) VALUES
    ('main', 'Main Menu', 'Welcome to our service. Press 1 for Sales, 2 for Support, 3 for Billing, or 0 for an operator.', 
     'We did not receive your selection.', 'Invalid selection. Please try again.'),
    ('sales', 'Sales Menu', 'You have reached Sales. Press 1 for new customers, 2 for existing customers, or 9 to return to main menu.',
     'We did not receive your selection.', 'Invalid selection. Please try again.'),
    ('support', 'Support Menu', 'You have reached Support. Press 1 for technical support, 2 for account support, or 9 to return to main menu.',
     'We did not receive your selection.', 'Invalid selection. Please try again.')
ON CONFLICT (menu_id) DO NOTHING;

-- Insert default IVR menu options
INSERT INTO ivr_menu_options (menu_id, digit, description, action_type, action_value) VALUES
    ('main', '1', 'Sales', 'menu', 'sales'),
    ('main', '2', 'Support', 'menu', 'support'),
    ('main', '3', 'Billing', 'transfer', '6002'),
    ('main', '0', 'Operator', 'transfer', '6000'),
    ('sales', '1', 'New Customers', 'transfer', '6001'),
    ('sales', '2', 'Existing Customers', 'transfer', '6002'),
    ('sales', '9', 'Main Menu', 'menu', 'main'),
    ('support', '1', 'Technical Support', 'transfer', '6001'),
    ('support', '2', 'Account Support', 'transfer', '6002'),
    ('support', '9', 'Main Menu', 'menu', 'main')
ON CONFLICT (menu_id, digit) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_from_extension ON call_logs(from_extension);
CREATE INDEX IF NOT EXISTS idx_call_logs_to_extension ON call_logs(to_extension);
CREATE INDEX IF NOT EXISTS idx_call_logs_start_time ON call_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_active_calls_call_id ON active_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_active_calls_agent_extension ON active_calls(agent_extension);
CREATE INDEX IF NOT EXISTS idx_agents_extension ON agents(extension);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO voip_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO voip_user;
