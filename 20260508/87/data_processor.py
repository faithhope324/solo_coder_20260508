import csv
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), "bloggers_data.csv")


def load_bloggers():
    bloggers = []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            bloggers.append({
                "id": int(row["id"]),
                "name": row["name"],
                "category": row["category"],
                "followers": int(row["followers"]),
                "likes": int(row["likes"]),
                "comments": int(row["comments"]),
                "posts_per_month": int(row["posts_per_month"]),
            })
    return bloggers


def compute_scores(bloggers):
    results = []
    for b in bloggers:
        engagement_rate = (b["likes"] + b["comments"] * 3) / b["followers"] * 100
        frequency_factor = min(b["posts_per_month"] / 15, 1.5)
        influence_score = engagement_rate * (b["followers"] ** 0.5) * frequency_factor / 10
        results.append({
            **b,
            "engagement_rate": round(engagement_rate, 2),
            "influence_score": round(influence_score, 2),
        })
    results.sort(key=lambda x: x["influence_score"], reverse=True)
    for rank, item in enumerate(results, start=1):
        item["rank"] = rank
    return results


def filter_raw_by_category(bloggers, category):
    if category and category != "all":
        return [b for b in bloggers if b["category"] == category]
    return bloggers


def filter_by_category(data, category):
    if category and category != "all":
        return [item for item in data if item["category"] == category]
    return data


def get_categories(data):
    return sorted(set(item["category"] for item in data))


def get_processed_data(category="all"):
    bloggers = load_bloggers()
    filtered = filter_raw_by_category(bloggers, category)
    return compute_scores(filtered)