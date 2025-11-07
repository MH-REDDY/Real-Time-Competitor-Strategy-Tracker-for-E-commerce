# ML Model_Scrapped data

This folder contains artifacts and a notebook for training a global XGBoost price forecasting model.

Files:
- `model_bundle.joblib` — saved artifact containing a dict { 'model': XGBRegressor, 'feature_cols': [...], 'asin_le': LabelEncoder }
- `asin_labelencoder.joblib` — (legacy) saved label encoder
- `xgb_global.joblib` — (legacy) saved model
- `xgboost.ipynb` — notebook: load data from MongoDB, feature engineering, training, forecasting, evaluation

Notes & changes applied:
- Reproducibility: seeds set (`np.random.seed(42)` and `random.seed(42)`) so training and forecast timestamp sampling are deterministic.
- Missing-value filling: notebook now uses `ffill()` before `bfill()` to avoid leaking future values into earlier rows during feature creation.
- Model saving: model + `feature_cols` and `asin_le` are saved together in `model_bundle.joblib` for reproducible loading.
- MAPE: evaluation uses a safe denominator to avoid divide-by-zero errors.

How to run a forecast using the saved bundle (local):

1. Install dependencies:

```powershell
pip install xgboost scikit-learn pandas tqdm joblib pymongo python-dotenv
```

2. Load the bundle and generate forecasts (example snippet):

```python
from joblib import load
import pandas as pd

bundle = load('model_bundle.joblib')
model = bundle['model']
feature_cols = bundle['feature_cols']
asin_le = bundle['asin_le']

# Prepare an input DataFrame `X_new` with the same feature columns and order, then:
# preds = model.predict(X_new[feature_cols].values)
```

If you want, I can also update the notebook to write the model bundle filename in a variable and switch subsequent load calls to use it.
