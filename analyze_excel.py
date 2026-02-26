import pandas as pd

excel_file = r'c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\MYprojet\Referentiel_Cancers_v2_Complet.xlsx'
output_file = r'c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\excel_analysis.txt'

try:
    df_raw = pd.read_excel(excel_file, header=None)
    
    header_row = 0
    for i, row in df_raw.iterrows():
        # Look for typical medical registry keywords
        row_str = [str(val).strip() for val in row]
        if any(keyword in row_str for keyword in ['Index CIM-10', 'Légende', 'Code TOP', 'Organe']):
            header_row = i
            break
            
    df = pd.read_excel(excel_file, skiprows=header_row)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"Header found at row {header_row}\n\n")
        f.write("Columns:\n")
        f.write(str(df.columns.tolist()) + "\n\n")
        f.write("First 100 rows:\n")
        f.write(df.head(100).to_string())
        f.write("\n\nShape: " + str(df.shape))
        
    print(f"Success! Analysis written to {output_file}")
    
except Exception as e:
    print(f"Error: {e}")
