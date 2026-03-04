from decimal import Decimal, InvalidOperation
import pandas as pd

input_path = r"e:\W020250729615142156867.csv"
output_path = r"e:\schools_normalized.csv"

# 关键：header=2
dtype_map = {"学校标识码": "string", "序号": "string"}
try:
    df = pd.read_csv(input_path, encoding="gbk", header=2, dtype=dtype_map, keep_default_na=False)
except:
    df = pd.read_csv(input_path, encoding="utf-8", header=2, dtype=dtype_map, keep_default_na=False)

df.columns = df.columns.str.strip()

print("识别列名：", df.columns)
print("前5行：")
print(df.head())

current_province = ""
result = []

def normalize_school_code(value):
    text = str(value).strip()
    if not text:
        return ""
    if "E" in text or "e" in text:
        try:
            text = format(Decimal(text), "f")
        except InvalidOperation:
            return text
    if text.endswith(".0") and text.replace(".", "").isdigit():
        text = text[:-2]
    return text

for _, row in df.iterrows():
    first_col = str(row["序号"]).strip()

    # 省份行（如 北京市（92所））
    if "所" in first_col:
        current_province = first_col.split("（")[0]
        continue

    # 学校数据行
    if first_col.isdigit():
        result.append({
            "province_name": current_province,
            "school_name": str(row["学校名称"]).strip(),
            "school_code": normalize_school_code(row["学校标识码"]),
            "department": str(row["主管部门"]).strip(),
            "location": str(row["所在地"]).strip(),
            "level": str(row["办学层次"]).strip(),
            "remark": str(row["备注"]).strip()
        })

print("解析到数据条数：", len(result))

result_df = pd.DataFrame(result)
result_df.to_csv(output_path, index=False, encoding="utf-8")

print("生成成功：", output_path)
