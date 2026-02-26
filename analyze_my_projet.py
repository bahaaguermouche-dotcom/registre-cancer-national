import os
from docx import Document
from pypdf import PdfReader

def extract_docx(filepath):
    doc = Document(filepath)
    return "\n".join([para.text for para in doc.paragraphs])

def extract_pdf(filepath):
    reader = PdfReader(filepath)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def main():
    folder = r"c:\Users\Innovatech\Desktop\PROJET____ing4GL____S8\MYprojet"
    files = [
        "Donnees_Registre_Cancer_Tlemcen.docx",
        "Scenarios_Registre_Cancer_Tlemcen.docx",
        "Mini_Projet_Registre_Cancer.pdf"
    ]
    
    for filename in files:
        filepath = os.path.join(folder, filename)
        print(f"--- {filename} ---")
        try:
            if filename.endswith(".docx"):
                print(extract_docx(filepath))
            elif filename.endswith(".pdf"):
                print(extract_pdf(filepath))
        except Exception as e:
            print(f"Error reading {filename}: {e}")
        print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    main()
