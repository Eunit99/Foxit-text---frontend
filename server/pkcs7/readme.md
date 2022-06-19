# About this example project

<!-- Source Code:./bin/signature.cpp
Function: Implement digital signature using OpenSSL
Environment: Windows -->

This is a Node.js backend example project to demonstrate an implementation of sign/verify algorithm using OpenSSL. It mainly includes the following algorithms:

- The SHA-1 hashing algorithm.
- The PKCS#7 certificate sign algorithm.
- The PKCS#7 certificate verify algorithm.

You may refer to the `./bin/signature.cpp` for source code, and the `./index.js` for the HTTP APIs (./digest_and_sign, and ./verify).

The following section gives an introduction on how to run this example. You will learn how to start the service and interact with the digital signature at UI.

## Start service

- Go to `/server/pkcs7` on your command window.
- Run `npm i` to install dependencies.
- Run `node ./index.js` to start service which will listen on `7777` port. _Note: The port can be changed in the `index.js` file._

## Interact with the digital signature feature

You can try our digital signature workflow by the way of using API or UI.

### Method 1 Programmatically place a signature on the current document

1. Run `/examples/UIExtension/complete_webViewer`.
   _*Note:* You should start the service before run the viewer so you can sign and verify the signature. You can also run our ready-to-go online viewer `https://webviewer-demo.foxitsoftware.com/` without starting a service._
2. Run the following example code on the console.
   A signature field will be automatically created and a digital signature will be placed on it.
3. A singed document will be downloaded and reopened in your viewer. You can click on the signature field to verify it.

   ```js
   //this code example assumes you are running the signature service on a local host and using the default port 7777.
   var pdfviewer = await pdfui.getPDFViewer();
   var pdfdoc = await pdfviewer.getCurrentPDFDoc();
   var signInfo = {
     filter: "Adobe.PPKLite",
     subfilter: "adbe.pkcs7.sha1",
     rect: { left: 10, bottom: 10, right: 300, top: 300 },
     pageIndex: 0,
     flag: 511,
     signer: "signer",
     reason: "reason",
     email: "email",
     DN: "DN",
     location: "loc",
     text: "text",
   };
   const signResult = await pdfdoc.sign(signInfo, (signInfo,buffer) => {
     return requestData(
       "post",
       "http://127.0.0.1:7777/digest_and_sign",
       "arraybuffer",
       { plain: new Blob([buffer]) }
     );
   });
   //open the signed PDF
   const singedPDF = await pdfviewer.openPDFByFile(signResult);
   var pdfform = await singedPDF.loadPDFForm();
   var verify = (
     signatureField,
     plainBuffer,
     signedData,
     hasDataOutOfScope
   ) => {
     return requestData("post", "http://127.0.0.1:7777/verify", "text", {
       filter: signatureField.getFilter(),
       subfilter: signatureField.getSubfilter(),
       signer: signatureField.getSigner(),
       plainContent: new Blob([plainBuffer]),
       signedData: new Blob([signedData]),
     });
   };
   var result = singedPDF.verifySignature(
     pdfform.getField("Signature_0"),
     verify
   );
   ```

### Method 2 Place a signature from the UI

Let's use our online demo `https://webviewer-demo.foxitsoftware.com/` to experience how it works.

- Preparation

    - Open `https://webviewer-demo.foxitsoftware.com/`on your browser.
  <br>
- Add and sign a signature

  1. Click the signature button in the Form tab to switch to the addSignatureStateHandler.
  2. Click to draw a rectangle field on the page.
  3. Click Hand tool or press `Esc` key to switch to the handStateHandler.
  4. Set the sign information on the pop-up box and click Ok to sign it. The signed document will be downloaded and re-opened automatically.
     <br>

- Verify signature
  - Click the signed signature field with the hand too to verify it. A prompt box will be pop-up reporting the verifying result.

_**Note**: To make this signature workflow work, we have referenced the following callback code in the index.html file of the complete_webViewer, and run a signature service on our backend._

    ```js
    //the variable `origin` refers to the service http address where your signature service is running.
    //signature handlers
    var requestData = (type, url, responseType, body) => {
    return new Promise((res, rej) => {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open(type, url);

        xmlHttp.responseType = responseType || "arraybuffer";
        let formData = new FormData();
        if (body) {
        for (let key in body) {
            if (body[key] instanceof Blob) {
            formData.append(key, body[key], key);
            } else {
            formData.append(key, body[key]);
            }
        }
        }
        xmlHttp.onload = (e) => {
        let status = xmlHttp.status;
        if ((status >= 200 && status < 300) || status === 304) {
            res(xmlHttp.response);
        }
        };
        xmlHttp.send(body ? formData : null);
    });
    };
        //set signature information and function. This function can be called to register different algorithm and information for signing
    //the api `/digest_and_sign` is used to calculate the digest and return the signed data
    pdfui.registerSignHandler({
    filter: "Adobe.PPKLite",
    subfilter: "adbe.pkcs7.sha1",
    flag: 0x100,
    distinguishName: "e=test@foxitsoftware.com",
    location: "FZ",
    reason: "Test",
    signer: "web sdk",
    showTime: true,
    sign: (setting, buffer) => {
        return requestData(
        "post",
        "origin",
        "arraybuffer",
        {
            plain: new Blob([buffer]),
        }
        );
    },
    });
    //set signature verification function
    //the api /verify is used to verify the state of signature
    pdfui.setVerifyHandler((signatureField, plainBuffer, signedData) => {
    return requestData("post", "origin", "text", {
        filter: signatureField.getFilter(),
        subfilter: signatureField.getSubfilter(),
        signer: signatureField.getSigner(),
        plainContent: new Blob([plainBuffer]),
        signedData: new Blob([signedData]),
    });
    });
    ```

## About Signature HTTP APIs

If you don't have backend signature service available, you can use the following HTTP API routes which we have registered in our SDK for the test purpose.

Server in US
http://webviewer-demo.foxitsoftware.com/signature/digest_and_sign
http://webviewer-demo.foxitsoftware.com/signature/verify
https://webviewer-demo.foxitsoftware.com/signature/digest_and_sign
https://webviewer-demo.foxitsoftware.com/signature/verify

Server in China
http://webviewer-demo.foxitsoftware.cn/signature/digest_and_sign
http://webviewer-demo.foxitsoftware.cn/signature/verify
