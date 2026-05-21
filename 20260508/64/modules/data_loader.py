import os
import glob
import pandas as pd


REQUIRED_COLUMNS = {"岗位名称", "薪资", "城市", "技能要求"}


def _detect_format(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".csv":
        return "csv"
    if ext in (".xlsx", ".xls"):
        return "excel"
    raise ValueError(f"不支持的文件格式: {ext}")


def _read_single(filepath: str) -> pd.DataFrame:
    fmt = _detect_format(filepath)
    if fmt == "csv":
        return pd.read_csv(filepath, encoding="utf-8-sig")
    return pd.read_excel(filepath)


def load_all(data_dir: str) -> pd.DataFrame:
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"数据目录不存在: {data_dir}")

    patterns = ["*.csv", "*.xlsx", "*.xls"]
    file_list = []
    for p in patterns:
        file_list.extend(glob.glob(os.path.join(data_dir, p)))

    if not file_list:
        raise FileNotFoundError(f"在 {data_dir} 中未找到 CSV 或 Excel 文件")

    frames = []
    for fp in sorted(file_list):
        try:
            df = _read_single(fp)
            missing = REQUIRED_COLUMNS - set(df.columns)
            if missing:
                raise ValueError(f"文件 {os.path.basename(fp)} 缺少列: {missing}")
            frames.append(df)
        except Exception as e:
            print(f"[警告] 读取 {os.path.basename(fp)} 失败: {e}")

    if not frames:
        raise RuntimeError("所有文件均读取失败")

    merged = pd.concat(frames, ignore_index=True)
    return merged[list(REQUIRED_COLUMNS)].copy()
