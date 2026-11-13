import re
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any

STANDARD_INTRUSION_FEATURES = [
    "destination_port",
    "flow_duration",
    "total_fwd_packets",
    "total_backward_packets",
    "total_length_of_fwd_packets",
    "total_length_of_bwd_packets",
    "fwd_packet_length_max",
    "fwd_packet_length_min",
    "fwd_packet_length_mean",
    "bwd_packet_length_mean",
    "flow_bytes_s",
    "flow_packets_s",
    "flow_iat_mean",
    "flow_iat_std",
    "fin_flag_count",
    "syn_flag_count",
    "rst_flag_count",
    "psh_flag_count",
    "ack_flag_count"
]

def clean_column_name(col: str) -> str:
    """Normalize CIC-IDS2017 column names: strip spaces, lowercase, replace symbols."""
    col = str(col).strip().lower()
    col = re.sub(r'[/\\()\-_\s]+', '_', col)
    col = re.sub(r'_+', '_', col).strip('_')
    return col

def clean_cic_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize headers and sanitize invalid float values (inf, -inf, nan)."""
    df = df.copy()
    # Normalize column names
    col_mapping = {col: clean_column_name(col) for col in df.columns}
    df.rename(columns=col_mapping, inplace=True)
    
    # Common CIC-IDS2017 aliases
    alias_map = {
        "dest_port": "destination_port",
        "total_fwd_packet": "total_fwd_packets",
        "total_bwd_packets": "total_backward_packets",
        "totlen_fwd_pkts": "total_length_of_fwd_packets",
        "totlen_bwd_pkts": "total_length_of_bwd_packets",
        "flow_byts_s": "flow_bytes_s",
        "flow_pkts_s": "flow_packets_s"
    }
    for old, new in alias_map.items():
        if old in df.columns and new not in df.columns:
            df.rename(columns={old: new}, inplace=True)
            
    # Replace inf and -inf with NaN
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    return df

def extract_flow_features(df: pd.DataFrame, target_col: str = "label") -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """Clean and extract feature matrix X and label vector y."""
    df_clean = clean_cic_dataset(df)
    
    # Detect target column
    actual_target = None
    for candidate in [target_col, "label", "attack", "class"]:
        if candidate in df_clean.columns:
            actual_target = candidate
            break
            
    if not actual_target:
        raise ValueError("Could not find label column (e.g. 'label' or 'attack') in dataset.")
        
    y_raw = df_clean[actual_target].astype(str).str.strip()
    
    # Select available features matching standard features, or top numeric columns
    selected_features = [f for f in STANDARD_INTRUSION_FEATURES if f in df_clean.columns]
    if len(selected_features) < 5:
        # Fallback to all numeric columns except target and identifiers
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns.tolist()
        exclude = [actual_target, "id", "flow_id", "source_ip", "destination_ip", "timestamp"]
        selected_features = [c for c in numeric_cols if c not in exclude][:25]
        
    if not selected_features:
        raise ValueError("No valid numerical features found for training.")
        
    X = df_clean[selected_features].copy()
    
    # Impute missing with median
    for col in selected_features:
        if X[col].isna().any():
            median_val = X[col].median()
            if pd.isna(median_val):
                median_val = 0.0
            X[col] = X[col].fillna(median_val)
            
    return X, y_raw, selected_features
