import pandas as pd
import json

excel_file = 'MYprojet/Bilan_Packages_232_Complet.xlsx'
sheet_name = 'Catalogue Analyses (Thésaurus)'

try:
    df = pd.read_excel(excel_file, sheet_name=sheet_name, skiprows=3)
    
    # df columns should be: Catégorie, Sous-Catégorie, Code Examen, Nom de l'Examen
    
    sql_lines = []
    sql_lines.append("-- SQL SEED — lab_tests_catalogue")
    sql_lines.append("CREATE TABLE IF NOT EXISTS lab_tests_catalogue (")
    sql_lines.append("  id SERIAL PRIMARY KEY,")
    sql_lines.append("  category VARCHAR(100) NOT NULL,")
    sql_lines.append("  subcategory VARCHAR(100),")
    sql_lines.append("  test_code VARCHAR(50),")
    sql_lines.append("  test_name VARCHAR(255) NOT NULL,")
    sql_lines.append("  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    sql_lines.append(");")
    
    sql_lines.append("INSERT INTO lab_tests_catalogue (category, subcategory, test_code, test_name) VALUES")
    
    values = []
    for index, row in df.iterrows():
        cat = str(row.iloc[0]).replace("'", "''") if not pd.isna(row.iloc[0]) else ""
        subcat = str(row.iloc[1]).replace("'", "''") if not pd.isna(row.iloc[1]) else ""
        code = str(row.iloc[2]).replace("'", "''") if not pd.isna(row.iloc[2]) else ""
        name = str(row.iloc[3]).replace("'", "''") if not pd.isna(row.iloc[3]) else ""
        
        if not name or name == 'nan':
            continue
            
        values.append(f"  ('{cat}', '{subcat}', '{code}', '{name}')")
        
    sql_lines.append(",\n".join(values) + ";")
    
    with open('seed_lab_tests.sql', 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_lines))
        
    print(f"Generated seed_lab_tests.sql with {len(values)} tests.")
except Exception as e:
    print("Error:", e)
