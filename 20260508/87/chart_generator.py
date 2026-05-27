import os
import base64
import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

FONT_DIRS = [
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/msyhbd.ttc",
    "C:/Windows/Fonts/simhei.ttf",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
]
for fp in FONT_DIRS:
    if os.path.exists(fp):
        font_manager.fontManager.addfont(fp)
        plt.rcParams["font.family"] = font_manager.FontProperties(fname=fp).get_name()
        break
plt.rcParams["axes.unicode_minus"] = False

CATEGORY_COLORS = {
    "美食": "#E74C3C",
    "旅游": "#27AE60",
    "科技": "#3498DB",
}


def generate_bubble_chart(data):
    fig, ax = plt.subplots(figsize=(10, 7))

    categories = {}
    for item in data:
        cat = item["category"]
        if cat not in categories:
            categories[cat] = {"followers": [], "engagement": [], "sizes": [], "names": []}
        categories[cat]["followers"].append(item["followers"])
        categories[cat]["engagement"].append(item["engagement_rate"])
        categories[cat]["sizes"].append(item["influence_score"] * 8)
        categories[cat]["names"].append(item["name"])

    for cat, vals in categories.items():
        color = CATEGORY_COLORS.get(cat, "#95A5A6")
        sc = ax.scatter(
            vals["followers"],
            vals["engagement"],
            s=vals["sizes"],
            c=color,
            alpha=0.65,
            edgecolors="white",
            linewidth=1,
            label=cat,
        )

    ax.set_xlabel("粉丝数", fontsize=12)
    ax.set_ylabel("互动率 (%)", fontsize=12)
    ax.set_title("社交媒体影响力气泡图", fontsize=14, fontweight="bold")
    ax.legend(loc="upper right", fontsize=10, title="类别")
    ax.grid(True, linestyle="--", alpha=0.4)

    for item in data:
        ax.annotate(
            item["name"],
            (item["followers"], item["engagement_rate"]),
            textcoords="offset points",
            xytext=(5, 5),
            fontsize=8,
        )

    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)

    return img_base64