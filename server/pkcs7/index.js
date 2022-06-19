const Koa = require('koa');
const Router = require('koa-router');
const cors = require('koa-cors');
const fs = require('fs');
const app = new Koa();
var process = require('child_process');

const koabody = require('koa-body');

if(!fs.existsSync("./temp")){
    fs.mkdirSync("./temp")
}

const router = Router();
/**
payloads:
    {
        plain:(binary)
    }
returns:
    signedData：arrayBuffer
 */
router.post('/digest_and_sign', koabody({ multipart: true }), async (ctx) => {
    fs.copyFileSync(ctx.request.files.plain.path, '.\\temp\\plain');
    let { filter, subfilter, signer, md } = ctx.request.body;
    if (!md) md = 'sha1';
    if (!subfilter) subfilter = 'adbe.pkcs7.detached';
    if (subfilter == 'adbe.pkcs7.sha1') {
        process.execSync(
            '.\\bin\\pkcs7.exe digest .\\temp\\plain .\\temp\\sha1'
        );
        process.execSync(
            '.\\bin\\pkcs7.exe sign .\\bin\\foxit_all.pfx 123456 .\\temp\\sha1 .\\temp\\signedData'
        );
    } else if ((subfilter == 'adbe.pkcs7.detached')) {
        switch (md) {
            case 'sha1':
                md = '0';
                break;
            case 'sha256':
                md = '1';
                break;
            case 'sha384':
                md = '2';
                break;
        }
        process.execSync(
            '.\\bin\\pkcs7.exe sign .\\bin\\foxit_all.pfx 123456 .\\temp\\plain .\\temp\\signedData Yes ' +
                md
        );
    }
    ctx.body = fs.createReadStream('.\\temp\\signedData');
    return;
});

/**
 * 
payloads:
    {
        filter:(string),
        subfilter:(string),
        signer:(string),
        plainContent:(binary)
        signedData:(binary)
    }
returns:
    signatureState:number
 */
router.post('/verify', koabody({ multipart: true }), async (ctx) => {
    let { filter, subfilter, signer } = ctx.request.body;

    fs.copyFileSync(
        ctx.request.files.plainContent.path,
        '.\\temp\\plainBuffer'
    );
    fs.copyFileSync(ctx.request.files.signedData.path, '.\\temp\\signedData');

    if (subfilter == 'adbe.pkcs7.sha1') {
        process.execSync(
            '.\\bin\\pkcs7.exe digest .\\temp\\plainBuffer .\\temp\\digest'
        );
        process.execSync(
            '.\\bin\\pkcs7.exe verify .\\temp\\signedData .\\temp\\digest .\\temp\\output'
        );
    } else if ((subfilter == 'adbe.pkcs7.detached')) {
        process.execSync(
            '.\\bin\\pkcs7.exe verify .\\temp\\signedData .\\temp\\plainBuffer .\\temp\\output'
        );
    }

    ctx.body = fs.createReadStream('.\\temp\\output');
    /*
    return a digital string. one or a combination of below values. 
    StateVerifyChange:0x00000080
    StateVerifyIncredible:0x00000100
    StateVerifyNoChange:0x00000400
    StateVerifyIssueValid:0x00001000
    StateVerifyIssueUnknown:0x00002000
    StateVerifyIssueRevoke:0x00004000
    StateVerifyIssueExpire:0x00008000
    StateVerifyIssueUncheck:0x00010000
    StateVerifyIssueCurrent:0x00020000
    StateVerifyTimestampNone:0x00040000
    StateVerifyTimestampDoc:0x00080000
    StateVerifyTimestampValid:0x00100000
    StateVerifyTimestampInvalid:0x00200000
    StateVerifyTimestampExpire:0x00400000
    StateVerifyTimestampIssueUnknown:0x00800000
    StateVerifyTimestampIssueValid:0x01000000
    StateVerifyTimestampTimeBefore:0x02000000
    */
});

app.use(cors());
app.use(router.routes());
app.use(router.allowedMethods());

const port = 7777;
app.listen(port, function () {
    console.log(`file downloading server is listening on port ${port}`);
});
