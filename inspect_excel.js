const XLSX = require('xlsx');

const workbook = XLSX.readFile('c:\\Users\\Innovatech\\Desktop\\PROJET____ing4GL____S8\\Bilan_Packages_232_Complet.xlsx');
console.log('Sheets:', workbook.SheetNames);

const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
if (data.length > 0) {
    console.log('Headers:', Object.keys(data[0]));
    console.log('First row sample:', data[0]);
}
