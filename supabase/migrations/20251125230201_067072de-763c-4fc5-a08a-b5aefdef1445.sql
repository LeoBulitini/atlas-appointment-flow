-- Add setting to control if quick actions button should be shown
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS show_quick_actions_button boolean DEFAULT true;