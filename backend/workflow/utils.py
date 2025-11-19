import csv
import logging
import os
import pathlib
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def save_csv_file(
    folder_name: str, rows: list[dict[str, Any]], headers: list[str], filename: str
) -> str:
    os.makedirs(folder_name, exist_ok=True)
    filepath = os.path.join(folder_name, filename)

    with open(filepath, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    return filepath


def read_file_to_csv(file_path: str) -> str:
    """Read spreadsheet file and return as CSV string."""
    ext = pathlib.Path(file_path).suffix.lower()

    try:
        if ext in [".xlsx", ".xls", ".ods"]:
            df = pd.read_excel(file_path)
        elif ext == ".csv":
            df = pd.read_csv(file_path, encoding_errors="replace")
        else:
            raise ValueError(f"Unsupported format: {ext}")

        return df.to_csv(index=False)
    except Exception as e:
        print(f"Error: {e}")
        raise
