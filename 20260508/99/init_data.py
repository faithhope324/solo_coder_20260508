from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.item import Item
from app.services.auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if __name__ == "__main__":
    test_users = [
        {
            "username": "zhangsan",
            "email": "zhangsan@example.com",
            "password": "123456",
        },
        {
            "username": "lisi",
            "email": "lisi@example.com",
            "password": "123456",
        },
        {
            "username": "wangwu",
            "email": "wangwu@example.com",
            "password": "123456",
        },
    ]

    created_users = []
    for u in test_users:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            user = User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
            )
            db.add(user)
            db.flush()
            created_users.append(user)
        else:
            created_users.append(existing)
    db.commit()

    test_items = [
        {
            "title": "iPhone 13 Pro 256G",
            "description": "自用iPhone，9成新，无磕碰，电池健康度85%，送原装充电器",
            "price": 3500,
            "category": "电子产品",
            "owner_id": created_users[0].id,
            "image_url": "",
        },
        {
            "title": "MacBook Pro 14寸 M1 Pro",
            "description": "2021款，16G+512G，带AC+到2025年，成色完美",
            "price": 9800,
            "category": "电子产品",
            "owner_id": created_users[0].id,
            "image_url": "",
        },
        {
            "title": "高等数学同济第七版 上下册",
            "description": "教材+习题全解，少量笔记，不影响使用",
            "price": 40,
            "category": "书籍教材",
            "owner_id": created_users[1].id,
            "image_url": "",
        },
        {
            "title": "Nike Air Max 运动鞋",
            "description": "42码，只穿过2次，太小了，专柜正品",
            "price": 280,
            "category": "服装鞋帽",
            "owner_id": created_users[1].id,
            "image_url": "",
        },
        {
            "title": "小米空气净化器2S",
            "description": "除雾霾PM2.5，正常使用中，换过滤芯",
            "price": 350,
            "category": "生活用品",
            "owner_id": created_users[2].id,
            "image_url": "",
        },
        {
            "title": "山地自行车 喜德盛",
            "description": "27速油压碟刹，铝合金车架，9成新",
            "price": 900,
            "category": "运动户外",
            "owner_id": created_users[2].id,
            "image_url": "",
        },
        {
            "title": "SK-II神仙水230ml",
            "description": "正品，还剩一半，买多了转一瓶",
            "price": 550,
            "category": "美妆护肤",
            "owner_id": created_users[2].id,
            "image_url": "",
        },
        {
            "title": "三只松鼠零食大礼包",
            "description": "全新未拆封，保质期到年底",
            "price": 68,
            "category": "食品饮料",
            "owner_id": created_users[1].id,
            "image_url": "",
        },
        {
            "title": "Kindle Paperwhite 4",
            "description": "8G版本，屏幕完美，带保护套，已贴膜，看书神器",
            "price": 500,
            "category": "电子产品",
            "owner_id": created_users[0].id,
            "image_url": "",
        },
        {
            "title": "索尼WH-1000XM4 头戴式降噪耳机",
            "description": "顶级降噪，音质一流，自用爱惜，9成新",
            "price": 1000,
            "category": "电子产品",
            "owner_id": created_users[1].id,
            "image_url": "",
        },
        {
            "title": "英语六级真题试卷",
            "description": "星火英语六级真题10套，部分已做5套，带答案解析",
            "price": 15,
            "category": "书籍教材",
            "owner_id": created_users[2].id,
            "image_url": "",
        },
        {
            "title": "小米手环7 Pro",
            "description": "智能手环，心率血氧监测，续航两周，99新",
            "price": 180,
            "category": "其他",
            "owner_id": created_users[0].id,
            "image_url": "",
        },
    ]

    for item_data in test_items:
        existing = db.query(Item).filter(Item.title == item_data["title"]).first()
        if not existing:
            item = Item(**item_data)
            db.add(item)

    db.commit()
    db.close()
    print("初始化数据完成！")
    print(f"已创建 {len(created_users)} 个用户和 {len(test_items)} 件商品。")
    print("测试账号:")
    for u in test_users:
        print(f"  用户名: {u['username']}, 密码: {u['password']}")
