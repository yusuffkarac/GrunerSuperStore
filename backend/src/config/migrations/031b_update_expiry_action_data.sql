-- 031b_update_expiry_action_data.sql
-- Applies the expiry action enum/value normalization safely

UPDATE "public"."expiry_actions"
SET action_type = 'labeled'
WHERE action_type = 'reduced';

UPDATE "public"."expiry_actions"
SET action_type = 'removed',
    excluded_from_check = false
WHERE action_type IN ('sorted_out', 'date_updated');

UPDATE "public"."expiry_actions"
SET action_type = 'removed',
    excluded_from_check = true
WHERE action_type = 'deactivated';

UPDATE "public"."expiry_actions"
SET is_undone = false
WHERE is_undone IS NULL;

