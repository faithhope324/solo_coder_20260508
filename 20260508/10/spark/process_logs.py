from pyspark.sql import SparkSession
from pyspark.sql.functions import col, hour, date, count, avg, to_timestamp
import os

# 创建Spark会话
def create_spark_session():
    return SparkSession.builder \
        .appName("LogProcessor") \
        .getOrCreate()

# 处理日志数据
def process_logs(spark, input_file, mysql_url, mysql_table, mysql_user, mysql_password):
    # 读取CSV数据
    df = spark.read.csv(input_file, header=True, inferSchema=True)
    
    # 解析时间戳（带时区）
    df = df.withColumn("timestamp", to_timestamp(col("timestamp"), "yyyy-MM-dd HH:mm:ss"))
    
    # 添加日期和小时字段
    df = df.withColumn("date", date(col("timestamp")))
    df = df.withColumn("hour", hour(col("timestamp")))
    
    # 计算每小时指标（按日期和小时分组）
    hourly_metrics = df.groupBy(
        col("date"),
        col("hour")
    ).agg(
        count("*").alias("request_count"),
        avg("response_time").alias("avg_response_time"),
        count(col("status_code").eqNullSafe(200)).alias("success_count"),
        count(col("status_code").gt(400)).alias("error_count")
    ).orderBy("date", "hour")
    
    # 计算每小时按路径分组的指标（按日期和小时分组）
    hourly_path_metrics = df.groupBy(
        col("date"),
        col("hour"),
        col("path")
    ).agg(
        count("*").alias("request_count"),
        avg("response_time").alias("avg_response_time")
    ).orderBy("date", "hour", "path")
    
    # 显示结果
    print("Hourly Metrics:")
    hourly_metrics.show()
    
    print("\nHourly Path Metrics:")
    hourly_path_metrics.show()
    
    # 保存到MySQL
    print("\nSaving to MySQL...")
    
    # 保存每小时指标
    hourly_metrics.write \
        .format("jdbc") \
        .option("url", mysql_url) \
        .option("dbtable", mysql_table + "_hourly") \
        .option("user", mysql_user) \
        .option("password", mysql_password) \
        .option("driver", "com.mysql.cj.jdbc.Driver") \
        .mode("overwrite") \
        .save()
    
    # 保存每小时路径指标
    hourly_path_metrics.write \
        .format("jdbc") \
        .option("url", mysql_url) \
        .option("dbtable", mysql_table + "_path_hourly") \
        .option("user", mysql_user) \
        .option("password", mysql_password) \
        .option("driver", "com.mysql.cj.jdbc.Driver") \
        .mode("overwrite") \
        .save()
    
    print("Data saved to MySQL successfully!")

if __name__ == "__main__":
    # 配置参数
    input_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "logs.csv")
    mysql_url = "jdbc:mysql://localhost:3306/spark_logs"
    mysql_table = "log_metrics"
    mysql_user = "root"
    mysql_password = "password"
    
    # 创建Spark会话
    spark = create_spark_session()
    
    try:
        # 处理日志数据
        process_logs(spark, input_file, mysql_url, mysql_table, mysql_user, mysql_password)
    finally:
        # 停止Spark会话
        spark.stop()