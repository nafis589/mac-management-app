USE friperie_luxe;

-- Set constraints behavior
SET FOREIGN_KEY_CHECKS = 0;

-- Admin
INSERT INTO users (username, password, first_name, last_name, role, status) VALUES
('admin', '$2b$10$.irvvwth4i8amO0SMAUFy.1H2oAfsUSj3sdqptDVZSXS.5..VZC2y', 'Super', 'Admin', 'ADMIN', 'ACTIVE')
ON DUPLICATE KEY UPDATE username=username;

SET FOREIGN_KEY_CHECKS = 1;
