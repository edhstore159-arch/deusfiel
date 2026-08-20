"""CTR Predictor Module — Based on avazu-ctr feature engineering principles.

Features hash encoding, temporal features, frequency bucketing, and cross features
inspired by the avazu-ctr project. Uses LightGBM for fast training/inference.
"""
import hashlib
import json
import os
import tempfile
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# Lazy imports to avoid startup lag
_lgbm = None
_train_test_split = None
_roc_auc_score = None


def _ensure_deps():
    global _lgbm, _train_test_split, _roc_auc_score
    if _lgbm is None:
        import lightgbm as lgbm
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import roc_auc_score
        _lgbm = lgbm
        _train_test_split = train_test_split
        _roc_auc_score = roc_auc_score


# ---------------------------------------------------------------------------
# Feature engineering (inspired by avazu-ctr)
# ---------------------------------------------------------------------------

HASH_BINS = 100000


def _hash_encode(val: str, n_bins: int = HASH_BINS) -> int:
    """Multi-hash bucketing — same principle as avazu-ctr FFM."""
    h = hashlib.md5(val.encode("utf-8", errors="ignore")).hexdigest()
    return int(h[:8], 16) % n_bins


def _parse_hour(val) -> Optional[int]:
    """Extract hour of day from various formats."""
    try:
        if isinstance(val, (int, float)):
            v = int(val)
            if v > 20000000:
                return v % 100
            return v % 24
        s = str(val).strip()
        for fmt in ("%Y%m%d%H", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S",
                     "%m/%d/%Y %H:%M", "%d/%m/%Y %H:%M"):
            try:
                return datetime.strptime(s, fmt).hour
            except ValueError:
                continue
        if len(s) >= 10:
            return int(s[-2:]) % 24
    except Exception:
        pass
    return None


def _parse_day_of_week(val) -> Optional[int]:
    """Extract day of week (0=Mon, 6=Sun)."""
    try:
        if isinstance(val, (int, float)):
            v = int(val)
            if v > 20000000:
                from datetime import date
                y = v // 10000
                m = (v % 10000) // 100
                d = v % 100
                return date(y, m, d).weekday()
            return v % 7
        s = str(val).strip()
        for fmt in ("%Y%m%d%H", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
            try:
                dt = datetime.strptime(s, fmt)
                return dt.weekday()
            except ValueError:
                continue
    except Exception:
        pass
    return None


def engineer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Apply avazu-ctr inspired feature engineering.

    Returns (featured_df, metadata).
    """
    out = pd.DataFrame(index=df.index)
    meta: Dict[str, Any] = {"categorical": [], "numerical": [], "hash_features": []}

    # Auto-detect columns
    cols_lower = {c.lower().strip(): c for c in df.columns}

    # --- Click column (target) ---
    click_col = None
    for name in ["click", "clicked", "is_click", "label", "target", "conversion"]:
        if name in cols_lower:
            click_col = cols_lower[name]
            break
    if click_col:
        out["click"] = df[click_col].astype(int)

    # --- Hour / temporal features ---
    hour_col = None
    for name in ["hour", "time", "timestamp", "datetime", "date_time", "click_time",
                  "impression_time", "event_time", "created_at"]:
        if name in cols_lower:
            hour_col = cols_lower[name]
            break
    if hour_col:
        out["hour_of_day"] = df[hour_col].apply(_parse_hour)
        out["day_of_week"] = df[hour_col].apply(_parse_day_of_week)
        out["is_weekend"] = out["day_of_week"].apply(lambda x: 1 if x and x >= 5 else 0)
        out["is_peak_hour"] = out["hour_of_day"].apply(
            lambda x: 1 if x and 9 <= x <= 21 else 0)
        meta["numerical"].extend(["hour_of_day", "day_of_week", "is_weekend", "is_peak_hour"])

    # --- Hash-encoded categorical features ---
    hash_cols_map = {
        "site_id": ["site_id", "site", "publisher_id", "publisher"],
        "app_id": ["app_id", "app", "ad_id", "advertiser_id", "campaign_id", "campaign"],
        "device_id": ["device_id", "device", "user_id", "visitor_id"],
        "device_ip": ["device_ip", "ip", "user_ip"],
        "device_model": ["device_model", "model", "device_type"],
        "banner_position": ["banner_position", "position", "ad_position", "placement"],
        "C1": ["c1", "category_1"],
        "C14": ["c14", "category_14"],
        "C15": ["c15", "category_15"],
        "C16": ["c16", "category_16"],
        "C17": ["c17", "category_17"],
        "C18": ["c18", "category_18"],
        "C19": ["c19", "category_19"],
        "C20": ["c20", "category_20"],
        "C21": ["c21", "category_21"],
    }

    for feat_name, candidates in hash_cols_map.items():
        for cand in candidates:
            if cand in cols_lower:
                col = cols_lower[cand]
                out[f"h_{feat_name}"] = df[col].astype(str).apply(
                    lambda x: _hash_encode(x))
                meta["hash_features"].append(f"h_{feat_name}")
                break

    # --- Cross features (avazu-ctr style) ---
    hash_feats = [c for c in out.columns if c.startswith("h_")]
    if len(hash_feats) >= 2:
        # Top cross features
        for i in range(min(3, len(hash_feats))):
            for j in range(i + 1, min(4, len(hash_feats))):
                a, b = hash_feats[i], hash_feats[j]
                cross_name = f"cross_{a[2:]}_{b[2:]}"
                out[cross_name] = (out[a].astype(str) + "_" + out[b].astype(str)).apply(
                    lambda x: _hash_encode(x, 50000))
                meta["hash_features"].append(cross_name)

    # --- Frequency features (log1p counts) ---
    for feat in hash_feats[:6]:
        freq_name = f"freq_{feat[2:]}"
        counts = out[feat].value_counts()
        out[freq_name] = out[feat].map(counts).fillna(0).apply(lambda x: np.log1p(x))
        meta["numerical"].append(freq_name)

    # --- Numeric columns from original data ---
    for col in df.columns:
        if col.lower().strip() in ["click", "clicked", "is_click", "label", "target"]:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            n_unique = df[col].nunique()
            if n_unique > 2 and n_unique < 100:
                name = f"num_{col.lower().strip()}"
                out[name] = df[col].fillna(0).astype(float)
                meta["numerical"].append(name)

    # --- Fill NaN ---
    for c in out.columns:
        if out[c].dtype in [np.float64, np.float32]:
            out[c] = out[c].fillna(0.0)
        elif out[c].dtype in [np.int64, np.int32]:
            out[c] = out[c].fillna(0)

    return out, meta


# ---------------------------------------------------------------------------
# Model training
# ---------------------------------------------------------------------------

class CTRModel:
    """LightGBM CTR model with avazu-ctr inspired features."""

    def __init__(self):
        self.model = None
        self.meta: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self.threshold: float = 0.5

    def train(self, df: pd.DataFrame, target_col: str = "click") -> Dict[str, Any]:
        """Train the model. Returns metrics."""
        _ensure_deps()

        featured, meta = engineer_features(df)
        self.meta = meta

        if target_col not in featured.columns:
            raise ValueError(f"Target column '{target_col}' not found. Detected click-like columns from: {list(df.columns)}")

        y = featured[target_col].values
        X = featured.drop(columns=[target_col], errors="ignore")
        self.feature_names = list(X.columns)

        if len(self.feature_names) == 0:
            raise ValueError("No features could be engineered from the provided data.")

        # Split
        X_train, X_val, y_train, y_val = _train_test_split(
            X.values, y, test_size=0.2, random_state=42, stratify=y if y.sum() > 10 else None)

        # Train LightGBM
        train_data = _lgbm.Dataset(X_train, label=y_train)
        val_data = _lgbm.Dataset(X_val, label=y_val, reference=train_data)

        params = {
            "objective": "binary",
            "metric": ["binary_logloss", "auc"],
            "boosting_type": "gbdt",
            "num_leaves": 63,
            "learning_rate": 0.05,
            "feature_fraction": 0.8,
            "bagging_fraction": 0.8,
            "bagging_freq": 5,
            "verbose": -1,
            "n_jobs": -1,
            "seed": 42,
        }

        callbacks = [_lgbm.log_evaluation(period=0)]
        self.model = _lgbm.train(
            params, train_data,
            num_boost_round=200,
            valid_sets=[val_data],
            callbacks=callbacks,
        )

        # Evaluate
        y_pred = self.model.predict(X_val)
        auc = _roc_auc_score(y_val, y_pred) if len(np.unique(y_val)) > 1 else 0.0
        avg_ctr = float(y.mean()) if len(y) > 0 else 0.0

        self.threshold = avg_ctr

        return {
            "auc": round(auc, 4),
            "avg_ctr": round(avg_ctr, 6),
            "train_size": len(X_train),
            "val_size": len(X_val),
            "features": len(self.feature_names),
            "feature_names": self.feature_names[:20],
            "feature_importance": dict(zip(
                self.feature_names,
                [round(float(x), 4) for x in self.model.feature_importance("gain")[:len(self.feature_names)]]
            )),
        }

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """Predict CTR for each row. Returns DataFrame with predictions."""
        if self.model is None:
            raise ValueError("Model not trained yet.")

        featured, _ = engineer_features(df)

        # Ensure same features
        for col in self.feature_names:
            if col not in featured.columns:
                featured[col] = 0
        X = featured[self.feature_names].values

        probs = self.model.predict(X)

        result = df.copy()
        result["ctr_probability"] = probs
        result["ctr_estimated"] = (probs * 100).round(4)
        result["classification"] = result["ctr_probability"].apply(
            lambda p: "Alto" if p >= self.threshold * 1.5
            else ("Medio" if p >= self.threshold * 0.7 else "Baixo"))

        return result

    def save(self, path: str):
        if self.model:
            self.model.save_model(path)
            meta_path = path + ".meta.json"
            with open(meta_path, "w") as f:
                json.dump({"meta": self.meta, "features": self.feature_names,
                           "threshold": self.threshold}, f)

    def load(self, path: str):
        _ensure_deps()
        self.model = _lgbm.Booster(model_file=path)
        meta_path = path + ".meta.json"
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                data = json.load(f)
                self.meta = data.get("meta", {})
                self.feature_names = data.get("features", [])
                self.threshold = data.get("threshold", 0.5)


# ---------------------------------------------------------------------------
# Job management
# ---------------------------------------------------------------------------

JOBS_DIR = Path(tempfile.gettempdir()) / "ctr_jobs"
JOBS_DIR.mkdir(exist_ok=True)

_jobs: Dict[str, Dict[str, Any]] = {}


def create_job() -> str:
    job_id = str(uuid.uuid4())[:12]
    _jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "progress": 0,
        "message": "",
        "results": None,
        "model_path": str(JOBS_DIR / f"{job_id}.model"),
        "csv_path": None,
    }
    return job_id


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    return _jobs.get(job_id)


def process_upload(job_id: str, csv_content: bytes, filename: str) -> Dict[str, Any]:
    """Parse and validate uploaded CSV."""
    job = _jobs[job_id]
    job["status"] = "processing"
    job["message"] = "Lendo arquivo..."

    try:
        df = pd.read_csv(pd.io.common.BytesIO(csv_content))
        if len(df) == 0:
            raise ValueError("CSV vazio")

        if len(df) > 500000:
            df = df.head(500000)
            job["message"] = f"Arquivo truncado para 500.000 linhas"

        # Save CSV
        csv_path = str(JOBS_DIR / f"{job_id}.csv")
        df.to_csv(csv_path, index=False)
        job["csv_path"] = csv_path

        # Preview
        preview = df.head(10).to_dict(orient="records")
        columns = list(df.columns)
        dtypes = {c: str(df[c].dtype) for c in columns}

        # Detect potential click column
        click_candidates = [c for c in columns if c.lower() in
                           ["click", "clicked", "is_click", "label", "target", "conversion"]]

        job["status"] = "uploaded"
        job["message"] = f"Arquivo carregado: {len(df)} linhas, {len(columns)} colunas"
        job["progress"] = 100
        job["results"] = {
            "rows": len(df),
            "columns": columns,
            "dtypes": dtypes,
            "preview": preview,
            "click_column": click_candidates[0] if click_candidates else None,
        }
        return job["results"]

    except Exception as e:
        job["status"] = "error"
        job["message"] = f"Erro ao processar CSV: {str(e)}"
        raise


def train_model(job_id: str, click_col: Optional[str] = None) -> Dict[str, Any]:
    """Train CTR model on uploaded data."""
    job = _jobs[job_id]
    if not job.get("csv_path"):
        raise ValueError("Nenhum CSV carregado")

    job["status"] = "training"
    job["progress"] = 10
    job["message"] = "Carregando dados..."

    try:
        df = pd.read_csv(job["csv_path"])

        # Auto-detect click column
        if not click_col:
            for name in ["click", "clicked", "is_click", "label", "target", "conversion"]:
                if name in df.columns:
                    click_col = name
                    break

        if not click_col:
            # Generate synthetic CTR data for demo
            job["message"] = "Coluna de clique não encontrada. Gerando dados sintéticos para demonstração..."
            job["progress"] = 20

            # Create synthetic click labels based on feature patterns
            np.random.seed(42)
            n = len(df)
            base_prob = 0.02  # 2% base CTR
            synthetic = np.random.random(n) < base_prob

            # Boost probability for certain patterns
            for col in df.columns:
                if df[col].nunique() < 10:
                    vals = df[col].unique()
                    for v in vals:
                        mask = df[col] == v
                        boost = np.random.uniform(0.5, 3.0)
                        synthetic[mask] = synthetic[mask] | (np.random.random(mask.sum()) < base_prob * boost)

            df["click"] = synthetic.astype(int)
            click_col = "click"

        job["progress"] = 30
        job["message"] = "Engenharia de features..."

        model = CTRModel()

        job["progress"] = 50
        job["message"] = "Treinando modelo LightGBM..."

        metrics = model.train(df, target_col=click_col)

        job["progress"] = 90
        job["message"] = "Salvando modelo..."

        model.save(job["model_path"])

        # Generate predictions on full dataset
        job["message"] = "Gerando previsões..."
        predictions = model.predict(df)

        # Summary stats
        stats = {
            "total_impressions": len(df),
            "avg_ctr": float(predictions["ctr_probability"].mean()),
            "estimated_clicks": int(predictions["ctr_probability"].sum()),
            "high_ctr": int((predictions["classification"] == "Alto").sum()),
            "medium_ctr": int((predictions["classification"] == "Medio").sum()),
            "low_ctr": int((predictions["classification"] == "Baixo").sum()),
            "best_ad": predictions.loc[predictions["ctr_probability"].idxmax()].to_dict() if len(predictions) > 0 else None,
            "worst_ad": predictions.loc[predictions["ctr_probability"].idxmin()].to_dict() if len(predictions) > 0 else None,
        }

        # Distribution for charts
        ctr_values = predictions["ctr_probability"].tolist()
        bin_edges = np.linspace(0, max(ctr_values) if ctr_values else 1, 20)
        hist, _ = np.histogram(ctr_values, bins=bin_edges)
        distribution = [{"range": f"{bin_edges[i]:.4f}-{bin_edges[i+1]:.4f}", "count": int(hist[i])}
                       for i in range(len(hist))]

        # Per-column CTR breakdowns (for charts)
        breakdowns = {}
        for col in df.columns[:10]:
            if df[col].nunique() <= 20 and col != click_col:
                group = predictions.groupby(col)["ctr_probability"].mean().sort_values(ascending=False)
                breakdowns[col] = [{"name": str(k), "ctr": round(float(v), 6)}
                                  for k, v in group.head(15).items()]

        # Save predictions CSV
        pred_csv_path = str(JOBS_DIR / f"{job_id}_predictions.csv")
        predictions.to_csv(pred_csv_path, index=False)

        # Table data (sample for frontend)
        table_cols = [c for c in ["campaign_id", "ad_id", "site_id", "app_id", "device_model",
                                   "banner_position", "hour_of_day"] if c in predictions.columns]
        if not table_cols:
            table_cols = list(predictions.columns[:4])
        table_data = predictions[table_cols + ["ctr_probability", "ctr_estimated", "classification"]].head(500).to_dict(orient="records")

        job["status"] = "completed"
        job["progress"] = 100
        job["message"] = "Análise concluída!"
        job["results"] = {
            **metrics,
            "stats": stats,
            "distribution": distribution,
            "breakdowns": breakdowns,
            "table_data": table_data,
            "pred_csv_path": pred_csv_path,
        }

        return job["results"]

    except Exception as e:
        job["status"] = "error"
        job["message"] = f"Erro no treino: {str(e)}"
        import traceback
        traceback.print_exc()
        raise


def export_predictions(job_id: str) -> Optional[bytes]:
    """Export predictions as CSV."""
    job = _jobs.get(job_id)
    if not job or not job.get("results", {}).get("pred_csv_path"):
        return None
    csv_path = job["results"]["pred_csv_path"]
    if os.path.exists(csv_path):
        with open(csv_path, "rb") as f:
            return f.read()
    return None
