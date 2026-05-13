-- 创建数据库
CREATE DATABASE IF NOT EXISTS spark_logs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE spark_logs;

-- 创建每小时指标表
CREATE TABLE IF NOT EXISTS log_metrics_hourly (
    date DATE NOT NULL,
    hour INT NOT NULL,
    request_count BIGINT NOT NULL,
    avg_response_time DOUBLE NOT NULL,
    success_count BIGINT NOT NULL,
    error_count BIGINT NOT NULL,
    PRIMARY KEY (date, hour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建每小时路径指标表
CREATE TABLE IF NOT EXISTS log_metrics_path_hourly (
    id INT AUTO_INCREMENT,
    date DATE NOT NULL,
    hour INT NOT NULL,
    path VARCHAR(255) NOT NULL,
    request_count BIGINT NOT NULL,
    avg_response_time DOUBLE NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY idx_date_hour_path (date, hour, path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;