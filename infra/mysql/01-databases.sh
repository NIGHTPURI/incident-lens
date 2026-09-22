#!/bin/bash
set -euo pipefail
[[ "$MYSQL_USER" =~ ^[a-zA-Z0-9_]+$ ]] || { echo 'MYSQL_USER must contain only letters, digits, underscores'; exit 1; }
# The official image creates MYSQL_USER and control_plane before executing this file.
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS demo_api CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS demo_worker CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON demo_api.* TO '${MYSQL_USER}'@'%';
GRANT ALL PRIVILEGES ON demo_worker.* TO '${MYSQL_USER}'@'%';
SQL
