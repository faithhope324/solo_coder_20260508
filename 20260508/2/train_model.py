import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import json

data_url = "http://lib.stat.cmu.edu/datasets/boston"
raw_df = pd.read_csv(data_url, sep=r"\s+", skiprows=22, header=None)
data = np.hstack([raw_df.values[::2, :], raw_df.values[1::2, :2]])
target = raw_df.values[1::2, 2]

feature_names = [
    'CRIM', 'ZN', 'INDUS', 'CHAS', 'NOX', 'RM', 'AGE', 'DIS', 'RAD', 
    'TAX', 'PTRATIO', 'B', 'LSTAT'
]

X = pd.DataFrame(data, columns=feature_names)
y = target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = LinearRegression()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)

mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"模型评估指标:")
print(f"MSE (均方误差): {mse:.4f}")
print(f"R2 Score: {r2:.4f}")

metrics = {
    'mse': float(mse),
    'r2': float(r2),
    'feature_names': feature_names,
    'coefficients': model.coef_.tolist(),
    'intercept': float(model.intercept_)
}

with open('model_metrics.json', 'w') as f:
    json.dump(metrics, f, indent=4)

joblib.dump(model, 'boston_housing_model.pkl')

print("\n模型已保存为 'boston_housing_model.pkl'")
print("评估指标已保存为 'model_metrics.json'")
