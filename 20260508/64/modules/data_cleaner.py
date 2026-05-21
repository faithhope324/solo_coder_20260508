import re
import pandas as pd


CITY_COORDS = {
    "北京": (39.9042, 116.4074),
    "上海": (31.2304, 121.4737),
    "广州": (23.1291, 113.2644),
    "深圳": (22.5431, 114.0579),
    "杭州": (30.2741, 120.1551),
    "成都": (30.5728, 104.0668),
    "重庆": (29.5630, 106.5516),
    "武汉": (30.5928, 114.3055),
    "南京": (32.0603, 118.7969),
    "西安": (34.3416, 108.9398),
    "苏州": (31.2989, 120.5853),
    "天津": (39.3434, 117.3616),
    "长沙": (28.2282, 112.9388),
    "青岛": (36.0671, 120.3826),
    "郑州": (34.7466, 113.6254),
    "大连": (38.9140, 121.6147),
    "厦门": (24.4798, 118.0819),
    "合肥": (31.8206, 117.2272),
    "济南": (36.6512, 117.1201),
    "福州": (26.0745, 119.2965),
    "东莞": (23.0489, 113.7447),
    "无锡": (31.4912, 120.3119),
    "宁波": (29.8683, 121.5440),
    "昆明": (24.8801, 102.8329),
    "哈尔滨": (45.8038, 126.5350),
    "沈阳": (41.8057, 123.4315),
    "太原": (37.8706, 112.5489),
    "南宁": (22.8170, 108.3665),
    "南昌": (28.6820, 115.8579),
    "贵阳": (26.6470, 106.6302),
}


def _parse_salary(value: str) -> float:
    if pd.isna(value) or not isinstance(value, str):
        return float("nan")

    text = value.replace(" ", "").replace(",", "")

    monthly_k = re.search(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)K?/\s*月", text)
    if monthly_k:
        low, high = float(monthly_k.group(1)), float(monthly_k.group(2))
        return (low + high) / 2 * 1000

    monthly_wan = re.search(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)万/\s*月", text)
    if monthly_wan:
        low, high = float(monthly_wan.group(1)), float(monthly_wan.group(2))
        return (low + high) / 2 * 10000

    yearly_wan = re.search(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)万/\s*年", text)
    if yearly_wan:
        low, high = float(yearly_wan.group(1)), float(yearly_wan.group(2))
        return (low + high) / 2 * 10000 / 12

    yearly_k = re.search(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)K?/\s*年", text)
    if yearly_k:
        low, high = float(yearly_k.group(1)), float(yearly_k.group(2))
        return (low + high) / 2 * 1000 / 12

    single_k = re.search(r"(\d+(?:\.\d+)?)K", text)
    if single_k:
        return float(single_k.group(1)) * 1000

    single_num = re.search(r"(\d+(?:\.\d+)?)", text)
    if single_num:
        val = float(single_num.group(1))
        if val < 1000:
            return val * 1000
        return val

    return float("nan")


def _split_skills(text) -> list:
    if pd.isna(text) or not isinstance(text, str):
        return []
    parts = re.split(r"[,，、;；/\s]+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _lookup_coord(city: str):
    if pd.isna(city):
        return float("nan"), float("nan")
    city = str(city).strip()
    for key, (lat, lon) in CITY_COORDS.items():
        if key in city or city in key:
            return lat, lon
    return float("nan"), float("nan")


def clean(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()

    result["岗位名称"] = result["岗位名称"].astype(str).str.strip()
    result["城市"] = result["城市"].astype(str).str.strip()
    result["技能要求"] = result["技能要求"].astype(str).str.strip()

    result["薪资_数值"] = result["薪资"].apply(_parse_salary)
    result = result.dropna(subset=["薪资_数值"])

    result["技能列表"] = result["技能要求"].apply(_split_skills)
    result = result[result["技能列表"].apply(len) > 0]

    result = result[result["岗位名称"] != ""]
    result = result[result["城市"] != ""]

    coords = result["城市"].apply(_lookup_coord)
    result["纬度"] = coords.apply(lambda x: x[0])
    result["经度"] = coords.apply(lambda x: x[1])

    result = result.reset_index(drop=True)
    return result
