import pandas as pd
import json

excel_file = 'MYprojet/Referentiel_Cancers_v3_ICDO3_Complet.xlsx'
sheet_name = 'Analyses par Laboratoire'

try:
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    with open('debug_lab_tests.txt', 'w', encoding='utf-8') as f:
        f.write(df.head(20).to_string())
        
    print("Columns:", df.columns.tolist())
    print("Check debug_lab_tests.txt for content")
except Exception as e:
    print("Error:", e)
