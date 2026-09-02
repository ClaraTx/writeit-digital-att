SET NAMES utf8mb4;
 
ALTER TABLE matches
  ADD COLUMN expected_participants INT DEFAULT NULL AFTER num_teams,
  ADD COLUMN max_team_size INT DEFAULT NULL AFTER expected_participants;
 