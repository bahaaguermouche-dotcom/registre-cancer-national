import pandas as pd
import sys

def extract_sql(filepath, sheet_name, out_file):
    try:
        df = pd.read_excel(filepath, sheet_name=sheet_name)
        with open(out_file, 'w', encoding='utf-8') as f:
            for col in df.columns:
                f.write(str(col) + "\n")
                for item in df[col].dropna():
                    f.write(str(item) + "\n")
        print(f"Successfully extracted SQL from {filepath} to {out_file}")
    except Exception as e:
        print(f"Error extracting from {filepath}: {e}")

if __name__ == "__main__":
    file1 = r'c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\MYprojet\Referentiel_Cancers_v3_ICDO3_Complet.xlsx'
    file2 = r'c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\MYprojet\Bilan_Packages_232_Complet.xlsx'
    
    extract_sql(file1, 'SQL Seed (INSERT)', 'seed_cancers.sql')
    extract_sql(file2, 'SQL Seed', 'seed_packages.sql')
