from flask import Flask, render_template, request
from data_processor import get_processed_data, get_categories, load_bloggers, compute_scores
from chart_generator import generate_bubble_chart

app = Flask(__name__)


@app.route("/")
def index():
    category = request.args.get("category", "all")
    data = get_processed_data(category)
    chart_img = generate_bubble_chart(data)
    all_categories = get_categories(compute_scores(load_bloggers()))
    return render_template(
        "index.html",
        data=data,
        categories=all_categories,
        selected_category=category,
        chart_img=chart_img,
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)