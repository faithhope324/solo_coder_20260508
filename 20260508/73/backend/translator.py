import os
import hashlib
import random
import time
import requests
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()


class Translator:
    def __init__(self):
        self.provider = os.getenv("TRANSLATION_PROVIDER", "mock")
        self.baidu_app_id = os.getenv("BAIDU_APP_ID", "")
        self.baidu_secret_key = os.getenv("BAIDU_SECRET_KEY", "")
        self.mock_translations = {
            "你好": "Hello",
            "欢迎": "Welcome",
            "出口": "Exit",
            "入口": "Entrance",
            "餐厅": "Restaurant",
            "菜单": "Menu",
            "洗手间": "Restroom",
            "小心地滑": "Caution: Wet Floor",
            "禁止吸烟": "No Smoking",
            "停车场": "Parking",
            "银行": "Bank",
            "医院": "Hospital",
            "学校": "School",
            "超市": "Supermarket",
            "酒店": "Hotel",
            "机场": "Airport",
            "火车站": "Train Station",
            "公交站": "Bus Stop",
            "地铁站": "Subway Station",
            "公园": "Park",
            "博物馆": "Museum",
            "图书馆": "Library",
            "电影院": "Cinema",
            "剧院": "Theater",
            "体育场": "Stadium",
            "加油站": "Gas Station",
            "便利店": "Convenience Store",
            "咖啡厅": "Cafe",
            "酒吧": "Bar",
            "餐厅": "Restaurant",
            "北京": "Beijing",
            "上海": "Shanghai",
            "广州": "Guangzhou",
            "深圳": "Shenzhen",
            "中国": "China",
            "美国": "USA",
            "日本": "Japan",
            "韩国": "Korea",
            "英国": "UK",
            "法国": "France",
            "德国": "Germany",
            "意大利": "Italy",
            "西班牙": "Spain",
            "俄罗斯": "Russia",
            "加拿大": "Canada",
            "澳大利亚": "Australia",
            "巴西": "Brazil",
            "印度": "India",
            "咖啡": "Coffee",
            "茶": "Tea",
            "水": "Water",
            "面包": "Bread",
            "米饭": "Rice",
            "面条": "Noodles",
            "饺子": "Dumplings",
            "牛肉": "Beef",
            "鸡肉": "Chicken",
            "鱼": "Fish",
            "蔬菜": "Vegetables",
            "水果": "Fruits",
            "鸡蛋": "Eggs",
            "牛奶": "Milk",
            "果汁": "Juice",
            "啤酒": "Beer",
            "葡萄酒": "Wine",
            "谢谢": "Thank you",
            "对不起": "Sorry",
            "请": "Please",
            "是": "Yes",
            "否": "No",
            "帮助": "Help",
            "电话": "Phone",
            "地址": "Address",
            "时间": "Time",
            "日期": "Date",
            "价格": "Price",
            "元": "Yuan",
            "免费": "Free",
            "打折": "Discount",
            "特价": "Special Offer",
            "新品": "New Arrival",
            "热卖": "Hot Sale",
            "营业时间": "Business Hours",
            "周一": "Monday",
            "周二": "Tuesday",
            "周三": "Wednesday",
            "周四": "Thursday",
            "周五": "Friday",
            "周六": "Saturday",
            "周日": "Sunday",
            "上午": "AM",
            "下午": "PM",
            "开门": "Open",
            "关门": "Closed",
            "暂停营业": "Temporarily Closed",
            "维修中": "Under Repair",
            "施工中": "Under Construction",
            "禁止通行": "No Entry",
            "危险": "Danger",
            "警告": "Warning",
            "注意": "Attention",
            "安全": "Safety",
            "急救": "First Aid",
            "消防栓": "Fire Hydrant",
            "灭火器": "Fire Extinguisher",
            "紧急出口": "Emergency Exit",
            "逃生通道": "Escape Route",
            "电梯": "Elevator",
            "楼梯": "Stairs",
            "扶梯": "Escalator",
            "一层": "1st Floor",
            "二层": "2nd Floor",
            "三层": "3rd Floor",
            "地下一层": "B1",
            "地下二层": "B2",
            "卫生间": "Toilet",
            "男厕": "Men",
            "女厕": "Women",
            "无障碍": "Accessible",
            "母婴室": "Baby Care Room",
            "吸烟区": "Smoking Area",
            "无烟区": "Non-smoking Area",
            "行李寄存": "Luggage Storage",
            "失物招领": "Lost and Found",
            "问讯处": "Information",
            "售票处": "Ticket Office",
            "检票口": "Ticket Gate",
            "候车室": "Waiting Room",
            "站台": "Platform",
            "出口": "Exit",
            "入口": "Entrance",
        }

    def _mock_translate(self, text: str, target_lang: str = "en") -> str:
        if text in self.mock_translations:
            return self.mock_translations[text]
        
        if target_lang == "en":
            return f"[{text}]"
        return text

    def _baidu_translate(self, text: str, source_lang: str = "auto", target_lang: str = "en") -> str:
        if not self.baidu_app_id or not self.baidu_secret_key:
            return self._mock_translate(text, target_lang)

        try:
            salt = str(random.randint(32768, 65536))
            sign = hashlib.md5(
                (self.baidu_app_id + text + salt + self.baidu_secret_key).encode("utf-8")
            ).hexdigest()

            url = "https://fanyi-api.baidu.com/api/trans/vip/translate"
            params = {
                "q": text,
                "from": source_lang,
                "to": target_lang,
                "appid": self.baidu_app_id,
                "salt": salt,
                "sign": sign
            }

            response = requests.get(url, params=params, timeout=10)
            result = response.json()

            if "trans_result" in result and len(result["trans_result"]) > 0:
                return result["trans_result"][0]["dst"]
            
            return self._mock_translate(text, target_lang)
        except Exception as e:
            print(f"Baidu translation error: {e}")
            return self._mock_translate(text, target_lang)

    def translate(self, text: str, source_lang: str = "auto", target_lang: str = "en") -> str:
        if not text or not text.strip():
            return ""

        if self.provider == "baidu":
            return self._baidu_translate(text, source_lang, target_lang)
        else:
            return self._mock_translate(text, target_lang)

    def translate_batch(
        self,
        texts: list,
        source_lang: str = "auto",
        target_lang: str = "en"
    ) -> list:
        results = []
        for text in texts:
            translated = self.translate(text, source_lang, target_lang)
            results.append({
                "original": text,
                "translated": translated,
                "source_lang": source_lang,
                "target_lang": target_lang
            })
        return results
