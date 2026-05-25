import pandas as pd
import numpy as np
from typing import Tuple, Dict, Optional, List
import warnings
warnings.filterwarnings('ignore')


class ModelNotInstalledError(Exception):
    def __init__(self, model_name: str, install_command: str):
        self.model_name = model_name
        self.install_command = install_command
        super().__init__(f"{model_name} 未安装。请运行: {install_command}")


class SalesForecaster:
    def __init__(self, data_loader):
        self.data_loader = data_loader
        self.model = None
        self.model_type: Optional[str] = None
        self.best_params: Optional[Dict] = None
        self.history: Optional[pd.Series] = None
        self.fitted = False

    @staticmethod
    def is_prophet_available() -> bool:
        try:
            import prophet
            return True
        except ImportError:
            return False

    @staticmethod
    def is_arima_available() -> bool:
        try:
            import statsmodels
            return True
        except ImportError:
            return False

    @staticmethod
    def get_available_models() -> List[str]:
        models = []
        if SalesForecaster.is_arima_available():
            models.append('ARIMA')
        if SalesForecaster.is_prophet_available():
            models.append('Prophet')
        return models

    @staticmethod
    def get_model_install_info() -> Dict[str, str]:
        return {
            'Prophet': 'pip install prophet',
            'ARIMA': 'pip install statsmodels pmdarima'
        }

    def _auto_tune_arima(self, series: pd.Series, max_p: int = 5, max_d: int = 2, max_q: int = 5) -> Tuple[int, int, int]:
        try:
            import pmdarima as pm
            auto_model = pm.auto_arima(
                series,
                start_p=1, start_q=1,
                max_p=max_p, max_q=max_q, max_d=max_d,
                seasonal=False,
                trace=False,
                error_action='ignore',
                suppress_warnings=True,
                stepwise=True
            )
            return auto_model.order
        except ImportError:
            return (1, 1, 1)

    def _fit_arima(self, series: pd.Series, auto_tune: bool = True, order: Optional[Tuple[int, int, int]] = None) -> None:
        from statsmodels.tsa.arima.model import ARIMA

        if auto_tune or order is None:
            order = self._auto_tune_arima(series)
            self.best_params = {'order': order}

        self.model = ARIMA(series, order=order)
        self.model = self.model.fit()
        self.model_type = 'ARIMA'
        self.fitted = True

    def _fit_prophet(self, series: pd.Series, promo_series: Optional[pd.Series] = None) -> None:
        try:
            from prophet import Prophet
        except ImportError:
            raise ModelNotInstalledError("Prophet", "pip install prophet")

        df = pd.DataFrame({
            'ds': series.index,
            'y': series.values
        })

        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.95
        )

        if promo_series is not None:
            df['promo'] = promo_series.values
            self.model.add_regressor('promo')

        self.model.fit(df)
        self.model_type = 'Prophet'
        self.fitted = True
        self.best_params = {'seasonality': 'yearly+weekly', 'interval_width': 0.95}

    def fit(self, model_type: str = 'auto', auto_tune: bool = True, order: Optional[Tuple[int, int, int]] = None) -> Dict:
        series = self.data_loader.get_time_series()
        promo_series = self.data_loader.get_promo_series()
        self.history = series

        if model_type == 'auto':
            prophet_available = self.is_prophet_available()
            arima_available = self.is_arima_available()

            if not prophet_available and not arima_available:
                raise ModelNotInstalledError("任何预测模型", "pip install statsmodels prophet pmdarima")

            if prophet_available:
                try:
                    self._fit_prophet(series, promo_series)
                except Exception as e:
                    if arima_available:
                        self._fit_arima(series, auto_tune, order)
                    else:
                        raise RuntimeError(f"Prophet 模型训练失败，且 ARIMA 不可用: {str(e)}")
            else:
                self._fit_arima(series, auto_tune, order)

        elif model_type.lower() == 'prophet':
            if not self.is_prophet_available():
                raise ModelNotInstalledError("Prophet", "pip install prophet")
            self._fit_prophet(series, promo_series)

        elif model_type.lower() == 'arima':
            if not self.is_arima_available():
                raise ModelNotInstalledError("ARIMA", "pip install statsmodels pmdarima")
            self._fit_arima(series, auto_tune, order)
        else:
            available = ', '.join(self.get_available_models())
            raise ValueError(f"不支持的模型类型: {model_type}。可用模型: {available}")

        return {
            'model_type': self.model_type,
            'parameters': self.best_params,
            'training_points': len(series),
            'date_range': f"{series.index.min().strftime('%Y-%m-%d')} 至 {series.index.max().strftime('%Y-%m-%d')}"
        }

    def predict(self, periods: int = 7, promo_dates: Optional[List[str]] = None) -> pd.DataFrame:
        if not self.fitted:
            raise ValueError("模型尚未训练，请先调用 fit() 方法")

        if self.model_type == 'ARIMA':
            return self._predict_arima(periods)
        elif self.model_type == 'Prophet':
            return self._predict_prophet(periods, promo_dates)
        else:
            raise ValueError("模型类型错误")

    def _predict_arima(self, periods: int) -> pd.DataFrame:
        forecast = self.model.get_forecast(steps=periods)
        forecast_df = forecast.summary_frame(alpha=0.05)

        last_date = self.history.index.max()
        future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=periods, freq='D')

        result = pd.DataFrame({
            'date': future_dates,
            'predicted': forecast_df['mean'].values,
            'lower': forecast_df['mean_ci_lower'].values,
            'upper': forecast_df['mean_ci_upper'].values
        })
        result = result.set_index('date')
        return result

    def _predict_prophet(self, periods: int, promo_dates: Optional[List[str]] = None) -> pd.DataFrame:
        future = self.model.make_future_dataframe(periods=periods, freq='D')

        if self.data_loader.column_mapping.get('promo'):
            future_promo = self.data_loader.generate_future_promo(periods, promo_dates)
            promo_col = self.data_loader.column_mapping['promo']

            history_promo = self.data_loader.get_promo_series()
            all_promo = pd.concat([history_promo, future_promo[promo_col]])
            all_promo = all_promo.reindex(future['ds']).fillna(0)
            future['promo'] = all_promo.values

        forecast = self.model.predict(future)

        forecast_future = forecast.tail(periods).copy()
        result = pd.DataFrame({
            'date': forecast_future['ds'],
            'predicted': forecast_future['yhat'].values,
            'lower': forecast_future['yhat_lower'].values,
            'upper': forecast_future['yhat_upper'].values
        })
        result = result.set_index('date')

        result['predicted'] = result['predicted'].apply(lambda x: max(0, x))
        result['lower'] = result['lower'].apply(lambda x: max(0, x))
        result['upper'] = result['upper'].apply(lambda x: max(0, x))

        return result

    def get_prediction_summary(self, predictions: pd.DataFrame) -> Dict:
        if predictions.empty:
            return {}

        total_predicted = predictions['predicted'].sum()
        avg_predicted = predictions['predicted'].mean()
        total_lower = predictions['lower'].sum()
        total_upper = predictions['upper'].sum()

        return {
            'model_type': self.model_type,
            'periods': len(predictions),
            'total_predicted': round(total_predicted, 2),
            'average_predicted': round(avg_predicted, 2),
            'total_lower': round(total_lower, 2),
            'total_upper': round(total_upper, 2),
            'start_date': predictions.index.min().strftime('%Y-%m-%d'),
            'end_date': predictions.index.max().strftime('%Y-%m-%d')
        }
