 
SET NAMES utf8mb4;
 
ALTER TABLE scenarios
  ADD COLUMN image_url VARCHAR(500) DEFAULT NULL AFTER description;
 
