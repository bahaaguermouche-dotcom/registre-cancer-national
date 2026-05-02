import pandas as pd
import sys

def analyze_excel(filepath):
    print(f"=== Analyzing {filepath} ===")
    try:
        xls = pd.ExcelFile(filepath)
        print(f"Sheets: {xls.sheet_names}")
        for sheet in xls.sheet_names:
            df = pd.read_excel(filepath, sheet_name=sheet)
            print(f"\nSheet: {sheet}")
            print(f"Shape: {df.shape}")
            print("Columns:")
            print(df.dtypes)
            print("First 3 rows:")
            print(df.head(3).to_string(index=False))
            print("-" * 20)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

if __name__ == "__main__":
    analyze_excel(r'c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\MYprojet\Bilan_Packages_232_Complet.xlsx')
    print("\n" + "="*50 + "\n")
    analyze_excel(r'c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\MYprojet\Referentiel_Cancers_v3_ICDO3_Complet.xlsx')
