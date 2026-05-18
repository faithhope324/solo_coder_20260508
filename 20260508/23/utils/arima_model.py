import pandas as pd
import numpy as np
from typing import Tuple, Dict, Optional
import warnings
warnings.filterwarnings('ignore')

try:
    from pmdarima import auto_arima
    from pmdarima.arima import ARIMA as PMDARIMA
except ImportError:
    auto_arima = None
    PMDARIMA = None

try:
    from statsmodels.tsa.arima.model import ARIMA as SM_ARIMA
except ImportError:
    SM_ARIMA = None


class ARIMAForecaster:
    def __init__(self):
        self.model = None
        self.order = None
        self.data = None
        self.last_date = None
        self.freq = None

    @staticmethod
    def auto_select_params(data: pd.Series, max_p: int = 5, max_d: int = 2, max_q: int = 5) -> Tuple[int, int, int]:
        if auto_arima is None:
            return (1, 1, 1)
        
        try:
            stepwise_fit = auto_arima(
                data,
                start_p=0, start_q=0,
                max_p=max_p, max_q=max_q, max_d=max_d,
                m=1,
                seasonal=False,
                trace=False,
                error_action='ignore',
                suppress_warnings=True,
                stepwise=True,
                information_criterion='aic'
            )
            return stepwise_fit.order
        except Exception:
            return (1, 1, 1)

    def train(self, df: pd.DataFrame, order: Optional[Tuple[int, int, int]] = None) -> Dict:
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
        
        series = df['value'].astype(float)
        series.index = df['date']
        
        if order is None:
            self.order = self.auto_select_params(series)
        else:
            self.order = order
        
        p, d, q = self.order
        
        try:
            if PMDARIMA is not None:
                self.model = PMDARIMA(order=self.order, suppress_warnings=True)
                self.model.fit(series)
                aic = self.model.aic()
            elif SM_ARIMA is not None:
                self.model = SM_ARIMA(series, order=self.order)
                self.model = self.model.fit()
                aic = self.model.aic
            else:
                raise ImportError("No ARIMA implementation available")
            
            return {
                'success': True,
                'order': {'p': p, 'd': d, 'q': q},
                'aic': round(float(aic), 4) if aic is not None else None
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"ARIMA训练失败: {str(e)}"
            }

    def predict(self, periods: int, confidence_level: float = 0.95) -> Dict:
        if self.model is None:
            return {'success': False, 'error': '模型未训练'}
        
        try:
            if PMDARIMA is not None and hasattr(self.model, 'predict'):
                forecast, conf_int = self.model.predict(
                    n_periods=periods,
                    return_conf_int=True,
                    alpha=1 - confidence_level
                )
                forecast_values = forecast.values if hasattr(forecast, 'values') else np.array(forecast)
                lower_values = conf_int[:, 0]
                upper_values = conf_int[:, 1]
            elif SM_ARIMA is not None and hasattr(self.model, 'get_forecast'):
                forecast_result = self.model.get_forecast(steps=periods)
                forecast = forecast_result.predicted_mean
                conf_int = forecast_result.conf_int(alpha=1 - confidence_level)
                forecast_values = forecast.values
                lower_values = conf_int.iloc[:, 0].values
                upper_values = conf_int.iloc[:, 1].values
            else:
                raise ValueError("不支持的模型类型")
            
            if self.freq is not None:
                try:
                    future_dates = pd.date_range(
                        start=self.last_date + pd.Timedelta(days=1),
                        periods=periods,
                        freq=self.freq
                    )
                except Exception:
                    future_dates = pd.date_range(
                        start=self.last_date + pd.Timedelta(days=1),
                        periods=periods,
                        freq='D'
                    )
            else:
                future_dates = pd.date_range(
                    start=self.last_date + pd.Timedelta(days=1),
                    periods=periods,
                    freq='D'
                )
            
            return {
                'success': True,
                'dates': [d.strftime('%Y-%m-%d') for d in future_dates],
                'values': [round(float(v), 4) for v in forecast_values],
                'lower': [round(float(v), 4) for v in lower_values],
                'upper': [round(float(v), 4) for v in upper_values]
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
