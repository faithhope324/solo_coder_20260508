import sys
print("Python version:", sys.version)

try:
    import flask
    print("Flask version:", flask.__version__)
except ImportError as e:
    print("Flask not installed:", e)

try:
    import pandas as pd
    print("Pandas version:", pd.__version__)
except ImportError as e:
    print("Pandas not installed:", e)

try:
    import plotly
    print("Plotly version:", plotly.__version__)
except ImportError as e:
    print("Plotly not installed:", e)

print("\nTesting app import...")
try:
    from app import app, load_data, get_monthly_trend, get_category_pie, get_region_heatmap
    print("App imported successfully")
    
    print("\nTesting load_data with sample data...")
    df = load_data('sample_data.csv')
    print(f"Data loaded: {len(df)} rows, {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")
    
    print("\nTesting chart generation...")
    trend = get_monthly_trend(df)
    print("Monthly trend chart generated")
    
    pie = get_category_pie(df)
    print("Pie chart generated")
    
    heatmap = get_region_heatmap(df)
    print("Heatmap chart generated")
    
    print("\n✅ All tests passed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
