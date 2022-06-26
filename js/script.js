// Set new PDF metadata

var title = "newPDF";
var author = "current user";
var pageSize = {height:842, width:595};

// Instantiate PDF Viewer object
var PDFViewer = await pdfui.getPDFViewer();

// Create new PDF
var PDFDoc = await PDFViewer.createNewDoc(title, author, pageSize);

// Get first page
var PDFpage = await PDFDoc.getPageByIndex(0);

// Create form fields
var FieldTypes = PDFViewCtrl.PDF.form.constant.Field_Type;
var formfiledsJson = [{
    pageIndex: 0, fieldName: 'Surname', fieldType: FieldTypes.Text, rect: {
        left: 50,
        right: 100,
        top: 650,
        bottom: 630,
    }
},
{
pageIndex: 0, fieldName: 'Middle Name', fieldType: FieldTypes.Text, rect: {
        left: 50,
        right: 100,
        top: 680,
        bottom: 660,
    }
},
{
    pageIndex: 0, fieldName: 'First Name', fieldType: FieldTypes.Text, rect: {
        left: 50,
        right: 100,
        top: 710,
        bottom: 690,
    }
}];

// Load PDF Form
var PDFForm = await PDFDoc.loadPDFForm()
PDFDoc.getPDFForm();

// Add form fields to page programmatically
for(var i=0;i<formfiledsJson.length;i++){
    await PDFForm.addControl(formfiledsJson[i].pageIndex, formfiledsJson[i].fieldName, formfiledsJson[i].fieldType, formfiledsJson[i].rect);
    var field = PDFForm.getField(formfiledsJson[i].fieldName)
    
    // Set some text for the form fields
    field.setValue("This is a text field");
}



