import base64
from io import BytesIO
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from wordcloud import WordCloud
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


CITY_COLOR = "#1f77b4"


def city_heatmap(df: pd.DataFrame) -> go.Figure:
    city_counts = (
        df.dropna(subset=["纬度", "经度"])
        .groupby(["城市", "纬度", "经度"])
        .size()
        .reset_index(name="岗位数量")
        .sort_values("岗位数量", ascending=False)
    )

    if city_counts.empty:
        fig = go.Figure()
        fig.update_layout(title="暂无地理坐标数据")
        return fig

    fig = px.scatter_geo(
        city_counts,
        lat="纬度",
        lon="经度",
        text="城市",
        size="岗位数量",
        size_max=60,
        color="岗位数量",
        color_continuous_scale="Reds",
        hover_data={"岗位数量": True, "纬度": False, "经度": False},
        scope="asia",
    )
    fig.update_geos(
        projection_type="mercator",
        center={"lat": 34, "lon": 108},
        projection_scale=6,
        showland=True,
        landcolor="rgb(240, 240, 240)",
        showcoastlines=True,
        coastlinecolor="rgb(180, 180, 180)",
    )
    fig.update_layout(
        title="城市岗位数量地理热力图",
        coloraxis_colorbar=dict(
            title="岗位数量",
            len=0.5,
            thickness=12,
            title_font=dict(size=11),
            tickfont=dict(size=9),
        ),
        margin={"l": 0, "r": 0, "t": 50, "b": 0},
    )
    return fig


def skills_wordcloud_image(df: pd.DataFrame) -> str:
    all_skills = []
    for skills in df["技能列表"]:
        all_skills.extend(skills)

    if not all_skills:
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.text(0.5, 0.5, "暂无技能数据", ha="center", va="center", fontsize=16)
        ax.axis("off")
        buf = BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", dpi=150)
        plt.close(fig)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    word_freq = {}
    for skill in all_skills:
        word_freq[skill] = word_freq.get(skill, 0) + 1

    wc = WordCloud(
        font_path=None,
        width=1200,
        height=600,
        background_color="white",
        colormap="viridis",
        max_words=150,
        prefer_horizontal=0.9,
    )
    wc.generate_from_frequencies(word_freq)

    fig, ax = plt.subplots(figsize=(12, 6))
    ax.imshow(wc, interpolation="bilinear")
    ax.axis("off")
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def salary_histogram(df: pd.DataFrame) -> go.Figure:
    salaries = df["薪资_数值"].dropna()
    if salaries.empty:
        fig = go.Figure()
        fig.update_layout(title="暂无薪资数据")
        return fig

    fig = px.histogram(
        salaries,
        x="薪资_数值",
        nbins=30,
        color_discrete_sequence=["#2ca02c"],
    )
    fig.update_layout(
        title="薪资分布直方图",
        xaxis_title="月薪（元）",
        yaxis_title="岗位数量",
        bargap=0.05,
    )
    fig.update_traces(hovertemplate="薪资区间: %{x}<br>数量: %{y}")
    return fig


def job_salary_bar(df: pd.DataFrame, top_n: int = 15) -> go.Figure:
    job_stats = (
        df.groupby("岗位名称")["薪资_数值"]
        .agg(["mean", "count"])
        .reset_index()
        .rename(columns={"mean": "平均薪资", "count": "岗位数量"})
        .sort_values("平均薪资", ascending=False)
        .head(top_n)
    )

    if job_stats.empty:
        fig = go.Figure()
        fig.update_layout(title="暂无岗位数据")
        return fig

    fig = px.bar(
        job_stats,
        x="岗位名称",
        y="平均薪资",
        color="平均薪资",
        color_continuous_scale="Blues",
        hover_data={"岗位数量": True, "平均薪资": ":,.0f"},
    )
    fig.update_layout(
        title=f"TOP {top_n} 岗位平均薪资对比",
        xaxis_title="岗位名称",
        yaxis_title="平均月薪（元）",
        xaxis_tickangle=-45,
        coloraxis_colorbar=dict(
            title="平均薪资",
            len=0.5,
            thickness=12,
            title_font=dict(size=11),
            tickfont=dict(size=9),
        ),
    )
    fig.update_traces(hovertemplate="岗位: %{x}<br>平均薪资: %{y:,.0f}")
    return fig


def city_job_count(df: pd.DataFrame, top_n: int = 20) -> go.Figure:
    city_stats = (
        df.groupby("城市")
        .size()
        .reset_index(name="岗位数量")
        .sort_values("岗位数量", ascending=False)
        .head(top_n)
    )

    if city_stats.empty:
        fig = go.Figure()
        fig.update_layout(title="暂无城市数据")
        return fig

    fig = px.bar(
        city_stats,
        x="城市",
        y="岗位数量",
        color="岗位数量",
        color_continuous_scale="Oranges",
    )
    fig.update_layout(
        title=f"TOP {top_n} 城市岗位数量",
        xaxis_title="城市",
        yaxis_title="岗位数量",
        xaxis_tickangle=-45,
        coloraxis_colorbar=dict(
            title="岗位数量",
            len=0.5,
            thickness=12,
            title_font=dict(size=11),
            tickfont=dict(size=9),
        ),
    )
    return fig
