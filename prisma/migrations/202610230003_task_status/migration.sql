-- Standardize the legacy Tasks-screen spelling without dropping task history.
UPDATE "Task" SET "status" = 'completed' WHERE "status" = 'done';
