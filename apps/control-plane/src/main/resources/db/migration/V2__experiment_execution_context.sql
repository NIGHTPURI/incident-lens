-- Additive: old experiments keep null configuration/windows, never fabricated values.
ALTER TABLE experiment ADD COLUMN configuration_json LONGTEXT NULL;
ALTER TABLE experiment ADD COLUMN before_started_at TIMESTAMP(6) NULL;
ALTER TABLE experiment ADD COLUMN before_ended_at TIMESTAMP(6) NULL;
ALTER TABLE experiment ADD COLUMN after_started_at TIMESTAMP(6) NULL;
ALTER TABLE experiment ADD COLUMN after_ended_at TIMESTAMP(6) NULL;
