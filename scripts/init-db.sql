-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for rule types
CREATE TYPE rule_type_enum AS ENUM ('GENERAL', 'IP', 'API');

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create rate_limit_rules table
CREATE TABLE IF NOT EXISTS rate_limit_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_type rule_type_enum NOT NULL,
    "limit" INTEGER NOT NULL CHECK ("limit" > 0),
    window_seconds INTEGER NOT NULL CHECK (window_seconds > 0),
    api_pattern VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rules_tenant_id ON rate_limit_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rules_rule_type ON rate_limit_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_rules_tenant_rule_type ON rate_limit_rules(tenant_id, rule_type);

