-- Fix the scenarios sequence to prevent duplicate key errors
SELECT setval('scenarios_id_seq', (SELECT COALESCE(MAX(id), 0) FROM scenarios));