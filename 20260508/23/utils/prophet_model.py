import pandas as pd
import numpy as np
from typing import Dict, Optional
import warnings
warnings.filterwarnings('ignore')

try:
    from prophet import Prophet
except ImportError:
    Prophet = None


class ProphetForecaster:
    def __init__(self):
        self.model = None
        self.data = None
        self.last_date = None
        self.freq = None

    def train(self, df: pd.DataFrame, yearly_seasonality: bool = True, 
              weekly_seasonality: bool = True, daily_seasonality: bool = False,
              changepoint_prior_scale: float = 0.05) -> Dict:
        self.data = df.copy()
        self.last_date = df['date'].iloc[-1]
        
        try:
            self.freq = pd.infer_freq(df['date'])
        except Exception:
            self.freq = None
        
        if self.freq is None:
            diffs = df['date'].diff().dropna()
            if len(diffs) > 0:
                median_diff = diffs.median()
                days = median_diff.days
                if days <= 1:
                    self.freq = 'D'
                elif days <= 7:
                    self.freq = 'W'
                elif days <= 31:
                    self.freq = 'ME'
                else:
                    self.freq = 'YE'
        
        prophet_df = pd.DataFrame()
        prophet_df['ds'] = df['date']
        prophet_df['y'] = df['value'].astype(float)
        
        try:
            if Prophet is None:
                raise ImportError("Prophet库未安装")
            
            self.model = Prophet(
                yearly_seasonality=yearly_seasonality,
                weekly_seasonality=weekly_seasonality,
                daily_seasonality=daily_seasonality,
                changepoint_prior_scale=changepoint_prior_scale,
                interval_width=0.95
            )
            self.model.fit(prophet_df)
            
            return {
                'success': True,
                'parameters': {
                    'yearly_seasonality': yearly_seasonality,
                    'weekly_seasonality': weekly_seasonality,
                    'daily_seasonality': daily_seasonality,
                    'changepoint_prior_scale': changepoint_prior_scale
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Prophet训练失败: {str(e)}"
            }

    def predict(self, periods: int, confidence_level: float = 0.95) -> Dict:
        if self.model is None:
            return {'success': False, 'error': '模型未训练'}
        
        try:
            self.model.interval_width = confidence_level
            
            if self.freq is not None:
                try:
                    future = self.model.make_future_dataframe(
                        periods=periods,
                        freq=self.freq
                    )
                except Exception:
                    future = self.model.make_future_dataframe(
                        periods=periods,
                        freq='D'
                    )
            else:
                future = self.model.make_future_dataframe(
                    periods=periods,
                    freq='D'
                )
            
            forecast = self.model.predict(future)
            
            forecast_future = forecast.tail(periods)
            
            return {
                'success': True,
                'dates': [d.strftime('%Y-%m-%d') for d in forecast_future['ds']],
                'values': [round(float(v), 4) for v in forecast_future['yhat']],
                'lower': [round(float(v), 4) for v in forecast_future['yhat_lower']],
                'upper': [round(float(v), 4) for v in forecast_future['yhat_upper']]
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"预测失败: {str(e)}"
            }

    def evaluate(self, test_df: pd.DataFrame) -> Dict:
        if self.model is None:
            return {'success': False, 'error': '模型未训练'}
        
        try:
            test_periods = len(test_df)
            predictions = self.predict(test_periods)
            
            if not predictions['success']:
                return predictions
            
            predicted = np.array(predictions['values'])
            actual = test_df['value'].values
            
            from utils.data_processor import DataProcessor
            metrics = DataProcessor.calculate_metrics(actual, predicted)
            
            return {
                'success': True,
                'metrics': metrics
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"评估失败: {str(e)}"
            }
