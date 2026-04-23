-- SM 2.1: Supabase Realtime postgres_changes on jobs (tech dashboard live updates).
-- REPLICA IDENTITY FULL is required for filtered Realtime subscriptions to evaluate
-- UPDATE events correctly (see Supabase Realtime postgres_changes docs).

ALTER TABLE jobs REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
