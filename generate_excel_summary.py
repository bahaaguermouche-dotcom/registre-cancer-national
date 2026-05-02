import pandas as pd
import sys
import os

def analyze_to_markdown(filepath, outfile):
    try:
        xls = pd.ExcelFile(filepath)
        filename = os.path.basename(filepath)
        outfile.write(f"## Fichier : {filename}\n")
        outfile.write(f"**Feuilles détectées ({len(xls.sheet_names)}) :** {', '.join(xls.sheet_names)}\n\n")
        
        for sheet in xls.sheet_names:
            df = pd.read_excel(filepath, sheet_name=sheet)
            outfile.write(f"### Feuille : {sheet}\n")
            outfile.write(f"- **Dimensions :** {df.shape[0]} lignes, {df.shape[1]} colonnes\n")
            
            outfile.write("- **Colonnes :**\n")
            for col in df.columns:
                outfile.write(f"  - `{col}` ({df[col].dtype})\n")
                
            outfile.write("\n**Aperçu des 3 premières lignes :**\n")
            outfile.write(df.head(3).to_markdown(index=False))
            outfile.write("\n\n---\n\n")
            
    except Exception as e:
        outfile.write(f"**Erreur lors de la lecture de {filepath} :** {e}\n\n")

if __name__ == "__main__":
    file1 = r'c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\MYprojet\Bilan_Packages_232_Complet.xlsx'
    file2 = r'c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\MYprojet\Referentiel_Cancers_v3_ICDO3_Complet.xlsx'
    
    with open('excel_summary.md', 'w', encoding='utf-8') as f:
        f.write("# Analyse des Fichiers de Référence Excel\n\n")
        analyze_to_markdown(file1, f)
        analyze_to_markdown(file2, f)
    
    print("Done generating excel_summary.md")
