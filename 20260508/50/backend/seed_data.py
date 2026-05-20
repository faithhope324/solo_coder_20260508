from models import SessionLocal, Table, TableColumn, ETLPipeline, LineageRelationship, DataQualityCheck
from datetime import datetime, timedelta

db = SessionLocal()


def seed_data():
    tables_data = [
        {"name": "ods_user_info", "database": "ods", "schema": "public", "description": "用户原始数据"},
        {"name": "ods_order_info", "database": "ods", "schema": "public", "description": "订单原始数据"},
        {"name": "ods_product_info", "database": "ods", "schema": "public", "description": "商品原始数据"},
        {"name": "dwd_user_order", "database": "dwd", "schema": "public", "description": "用户订单明细宽表"},
        {"name": "dwd_product_sales", "database": "dwd", "schema": "public", "description": "商品销售明细表"},
        {"name": "dws_user_stat", "database": "dws", "schema": "public", "description": "用户统计汇总表"},
        {"name": "dws_product_stat", "database": "dws", "schema": "public", "description": "商品统计汇总表"},
        {"name": "ads_user_profile", "database": "ads", "schema": "public", "description": "用户画像应用层表"},
        {"name": "ads_sales_report", "database": "ads", "schema": "public", "description": "销售报表应用层表"},
        {"name": "ads_recommendation", "database": "ads", "schema": "public", "description": "推荐系统结果表"},
    ]

    table_objs = {}
    for t in tables_data:
        table = Table(**t)
        db.add(table)
        table_objs[t["name"]] = table
    db.commit()

    columns_data = {
        "ods_user_info": [
            ("user_id", "BIGINT", "NO", "用户ID"),
            ("user_name", "VARCHAR(100)", "YES", "用户名"),
            ("phone", "VARCHAR(20)", "YES", "手机号"),
            ("email", "VARCHAR(100)", "YES", "邮箱"),
            ("register_time", "DATETIME", "YES", "注册时间"),
            ("level", "VARCHAR(20)", "YES", "用户等级"),
        ],
        "ods_order_info": [
            ("order_id", "BIGINT", "NO", "订单ID"),
            ("user_id", "BIGINT", "NO", "用户ID"),
            ("product_id", "BIGINT", "NO", "商品ID"),
            ("order_amount", "DECIMAL(10,2)", "YES", "订单金额"),
            ("order_time", "DATETIME", "YES", "下单时间"),
            ("status", "VARCHAR(20)", "YES", "订单状态"),
        ],
        "ods_product_info": [
            ("product_id", "BIGINT", "NO", "商品ID"),
            ("product_name", "VARCHAR(200)", "YES", "商品名称"),
            ("category", "VARCHAR(100)", "YES", "商品分类"),
            ("price", "DECIMAL(10,2)", "YES", "价格"),
            ("stock", "INT", "YES", "库存"),
            ("seller_id", "BIGINT", "YES", "商家ID"),
        ],
        "dwd_user_order": [
            ("order_id", "BIGINT", "NO", "订单ID"),
            ("user_id", "BIGINT", "NO", "用户ID"),
            ("user_name", "VARCHAR(100)", "YES", "用户名"),
            ("product_id", "BIGINT", "NO", "商品ID"),
            ("product_name", "VARCHAR(200)", "YES", "商品名称"),
            ("order_amount", "DECIMAL(10,2)", "YES", "订单金额"),
            ("order_time", "DATETIME", "YES", "下单时间"),
        ],
        "dwd_product_sales": [
            ("product_id", "BIGINT", "NO", "商品ID"),
            ("product_name", "VARCHAR(200)", "YES", "商品名称"),
            ("category", "VARCHAR(100)", "YES", "分类"),
            ("sale_amount", "DECIMAL(10,2)", "YES", "销售金额"),
            ("sale_count", "INT", "YES", "销售数量"),
            ("stat_date", "DATE", "YES", "统计日期"),
        ],
        "dws_user_stat": [
            ("user_id", "BIGINT", "NO", "用户ID"),
            ("total_orders", "INT", "YES", "总订单数"),
            ("total_amount", "DECIMAL(12,2)", "YES", "总消费金额"),
            ("last_order_time", "DATETIME", "YES", "最近下单时间"),
            ("avg_order_amount", "DECIMAL(10,2)", "YES", "平均订单金额"),
        ],
        "dws_product_stat": [
            ("product_id", "BIGINT", "NO", "商品ID"),
            ("total_sales", "DECIMAL(12,2)", "YES", "总销售额"),
            ("total_units", "INT", "YES", "总销量"),
            ("avg_price", "DECIMAL(10,2)", "YES", "平均售价"),
            ("rank", "INT", "YES", "销售排名"),
        ],
        "ads_user_profile": [
            ("user_id", "BIGINT", "NO", "用户ID"),
            ("user_level", "VARCHAR(20)", "YES", "用户等级"),
            ("consumption_capability", "VARCHAR(20)", "YES", "消费能力"),
            ("preferred_category", "VARCHAR(100)", "YES", "偏好分类"),
            ("churn_risk", "FLOAT", "YES", "流失风险"),
        ],
        "ads_sales_report": [
            ("report_date", "DATE", "NO", "报表日期"),
            ("total_sales", "DECIMAL(12,2)", "YES", "总销售额"),
            ("total_orders", "INT", "YES", "总订单数"),
            ("active_users", "INT", "YES", "活跃用户数"),
            ("conversion_rate", "FLOAT", "YES", "转化率"),
        ],
        "ads_recommendation": [
            ("user_id", "BIGINT", "NO", "用户ID"),
            ("recommend_products", "TEXT", "YES", "推荐商品列表"),
            ("recommend_score", "FLOAT", "YES", "推荐评分"),
            ("algorithm", "VARCHAR(50)", "YES", "推荐算法"),
        ],
    }

    for table_name, cols in columns_data.items():
        table = table_objs[table_name]
        for col_name, col_type, nullable, desc in cols:
            db.add(TableColumn(
                table_id=table.id,
                name=col_name,
                data_type=col_type,
                is_nullable=nullable,
                description=desc
            ))
    db.commit()

    pipelines_data = [
        {"name": "etl_dwd_user_order", "task_type": "Spark", "description": "用户订单明细宽表加工", "status": "running", "last_run_hours": 1},
        {"name": "etl_dwd_product_sales", "task_type": "Spark", "description": "商品销售明细加工", "status": "success", "last_run_hours": 2},
        {"name": "etl_dws_user_stat", "task_type": "Hive", "description": "用户统计汇总", "status": "success", "last_run_hours": 4},
        {"name": "etl_dws_product_stat", "task_type": "Hive", "description": "商品统计汇总", "status": "failed", "last_run_hours": 6},
        {"name": "etl_ads_user_profile", "task_type": "ML", "description": "用户画像计算", "status": "success", "last_run_hours": 8},
        {"name": "etl_ads_sales_report", "task_type": "Spark", "description": "销售报表生成", "status": "paused", "last_run_hours": 24},
        {"name": "etl_ads_recommendation", "task_type": "ML", "description": "推荐结果计算", "status": "running", "last_run_hours": 0.5},
    ]

    pipeline_objs = {}
    now = datetime.utcnow()
    for p in pipelines_data:
        last_run_time = now - timedelta(hours=p["last_run_hours"])
        created_at_time = last_run_time - timedelta(days=7)
        pipeline = ETLPipeline(
            name=p["name"],
            task_type=p["task_type"],
            description=p["description"],
            status=p["status"],
            last_run=last_run_time,
            created_at=created_at_time
        )
        db.add(pipeline)
        pipeline_objs[p["name"]] = pipeline
    db.commit()

    lineage_edges = [
        ("table", "ods_user_info", "pipeline", "etl_dwd_user_order", "input"),
        ("table", "ods_order_info", "pipeline", "etl_dwd_user_order", "input"),
        ("pipeline", "etl_dwd_user_order", "table", "dwd_user_order", "output"),
        ("table", "ods_order_info", "pipeline", "etl_dwd_product_sales", "input"),
        ("table", "ods_product_info", "pipeline", "etl_dwd_product_sales", "input"),
        ("pipeline", "etl_dwd_product_sales", "table", "dwd_product_sales", "output"),
        ("table", "dwd_user_order", "pipeline", "etl_dws_user_stat", "input"),
        ("pipeline", "etl_dws_user_stat", "table", "dws_user_stat", "output"),
        ("table", "dwd_product_sales", "pipeline", "etl_dws_product_stat", "input"),
        ("pipeline", "etl_dws_product_stat", "table", "dws_product_stat", "output"),
        ("table", "dws_user_stat", "pipeline", "etl_ads_user_profile", "input"),
        ("table", "dwd_user_order", "pipeline", "etl_ads_user_profile", "input"),
        ("pipeline", "etl_ads_user_profile", "table", "ads_user_profile", "output"),
        ("table", "dwd_user_order", "pipeline", "etl_ads_sales_report", "input"),
        ("table", "dwd_product_sales", "pipeline", "etl_ads_sales_report", "input"),
        ("pipeline", "etl_ads_sales_report", "table", "ads_sales_report", "output"),
        ("table", "ads_user_profile", "pipeline", "etl_ads_recommendation", "input"),
        ("table", "dws_product_stat", "pipeline", "etl_ads_recommendation", "input"),
        ("pipeline", "etl_ads_recommendation", "table", "ads_recommendation", "output"),
    ]

    for src_type, src_name, tgt_type, tgt_name, rel_type in lineage_edges:
        if src_type == "table":
            src_id = table_objs[src_name].id
        else:
            src_id = pipeline_objs[src_name].id
        if tgt_type == "table":
            tgt_id = table_objs[tgt_name].id
        else:
            tgt_id = pipeline_objs[tgt_name].id
        db.add(LineageRelationship(
            source_type=src_type,
            source_id=src_id,
            target_type=tgt_type,
            target_id=tgt_id,
            relationship_type=rel_type
        ))
    db.commit()

    quality_checks = []
    base_time = datetime.utcnow()
    for table_idx, (table_name, table) in enumerate(table_objs.items()):
        checks = [
            ("完整性", "非空检查", 95.5 + hash(table_name) % 5, f"{table_name} 非空字段检查通过率", 0),
            ("一致性", "主键唯一检查", 98.0 + hash(table_name) % 2, f"{table_name} 主键唯一性检查", 24),
            ("准确性", "值域范围检查", 92.0 + hash(table_name) % 8, f"{table_name} 字段值范围检查", 48),
        ]
        for check_idx, (check_type, check_name, score, details, hours_ago) in enumerate(checks):
            check_time = base_time - timedelta(hours=hours_ago + table_idx * 0.5)
            quality_checks.append(DataQualityCheck(
                table_id=table.id,
                check_type=check_type,
                check_name=check_name,
                result="PASS" if score >= 90 else "FAIL",
                score=score,
                details=details,
                checked_at=check_time
            ))
    db.add_all(quality_checks)
    db.commit()
    print("数据初始化完成！")


if __name__ == "__main__":
    seed_data()
    db.close()
