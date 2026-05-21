import os
import dash
from dash import Dash, html, dcc, Input, Output, State
import plotly.io as pio

from modules.data_loader import load_all
from modules.data_cleaner import clean
from modules.charts import (
    city_heatmap,
    skills_wordcloud_image,
    salary_histogram,
    job_salary_bar,
    city_job_count,
)


DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

pio.templates.default = "plotly_white"

app = Dash(__name__)
server = app.server


def _load_and_clean():
    raw = load_all(DATA_DIR)
    return clean(raw)


def _empty_figure(title: str = "暂无数据"):
    return {
        "data": [],
        "layout": {"title": title, "xaxis": {"visible": False}, "yaxis": {"visible": False}},
    }


app.layout = html.Div(
    [
        html.H1(
            "招聘网站岗位分析工具",
            style={"textAlign": "center", "color": "#2c3e50", "padding": "20px 0"},
        ),
        html.Div(
            [
                html.Button(
                    "刷新数据",
                    id="refresh-btn",
                    n_clicks=0,
                    style={
                        "padding": "10px 24px",
                        "fontSize": "14px",
                        "backgroundColor": "#3498db",
                        "color": "white",
                        "border": "none",
                        "borderRadius": "6px",
                        "cursor": "pointer",
                    },
                ),
                html.Span(
                    id="data-info",
                    style={"marginLeft": "20px", "color": "#7f8c8d", "fontSize": "14px"},
                ),
            ],
            style={"textAlign": "center", "marginBottom": "30px"},
        ),
        html.Div(
            [
                html.Div(
                    [dcc.Graph(id="city-heatmap", style={"height": "500px"})],
                    style={
                        "background": "white",
                        "padding": "20px",
                        "borderRadius": "10px",
                        "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
                    },
                ),
            ],
            style={"marginBottom": "20px"},
        ),
        html.Div(
            [
                html.Div(
                    [
                        html.H3("技能要求词云", style={"textAlign": "center", "color": "#34495e"}),
                        html.Img(
                            id="skills-wordcloud",
                            style={"width": "100%", "maxHeight": "450px", "objectFit": "contain"},
                        ),
                    ],
                    style={
                        "background": "white",
                        "padding": "20px",
                        "borderRadius": "10px",
                        "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
                        "flex": "1",
                    },
                ),
                html.Div(
                    [dcc.Graph(id="city-job-count", style={"height": "450px"})],
                    style={
                        "background": "white",
                        "padding": "20px",
                        "borderRadius": "10px",
                        "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
                        "flex": "1",
                    },
                ),
            ],
            style={"display": "flex", "gap": "20px", "marginBottom": "20px"},
        ),
        html.Div(
            [
                html.Div(
                    [dcc.Graph(id="salary-histogram", style={"height": "450px"})],
                    style={
                        "background": "white",
                        "padding": "20px",
                        "borderRadius": "10px",
                        "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
                        "flex": "1",
                    },
                ),
                html.Div(
                    [dcc.Graph(id="job-salary-bar", style={"height": "450px"})],
                    style={
                        "background": "white",
                        "padding": "20px",
                        "borderRadius": "10px",
                        "boxShadow": "0 2px 8px rgba(0,0,0,0.1)",
                        "flex": "1",
                    },
                ),
            ],
            style={"display": "flex", "gap": "20px"},
        ),
    ],
    style={
        "background": "#f5f6fa",
        "minHeight": "100vh",
        "padding": "20px",
        "fontFamily": "'Microsoft YaHei', 'PingFang SC', sans-serif",
    },
)


@app.callback(
    Output("city-heatmap", "figure"),
    Output("city-job-count", "figure"),
    Output("salary-histogram", "figure"),
    Output("job-salary-bar", "figure"),
    Output("skills-wordcloud", "src"),
    Output("data-info", "children"),
    Input("refresh-btn", "n_clicks"),
)
def update_all(n_clicks):
    try:
        df = _load_and_clean()
        heatmap_fig = city_heatmap(df)
        city_fig = city_job_count(df)
        salary_fig = salary_histogram(df)
        bar_fig = job_salary_bar(df)
        wc_img = skills_wordcloud_image(df)
        info = f"共加载 {len(df)} 条岗位数据"
        return heatmap_fig, city_fig, salary_fig, bar_fig, f"data:image/png;base64,{wc_img}", info
    except Exception as e:
        err_msg = f"数据加载失败: {e}"
        empty = _empty_figure(err_msg)
        return empty, empty, empty, empty, "", err_msg


if __name__ == "__main__":
    print("=" * 50)
    print("招聘网站岗位分析工具")
    print(f"数据目录: {DATA_DIR}")
    print("请将 CSV / Excel 文件放入 data 目录后启动")
    print("=" * 50)
    app.run(debug=False, host="0.0.0.0", port=8050)
