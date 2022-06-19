var fs = require('fs');
/**
 * The PDF password is in clear text.
 * This method encrypts the PDF password to protect it from being transmit in plain text.
 * In Web Viewer, the encryptPassword parameter is passed at the same level as the original PDF password parameter, and is decrypted internally to restore the original  password.
 */
/**
 * A class that encrypts passwords
 * @param locateDirPath You can access the folder path to gsdk.js.
 * @constructor
 */
function EncryptPDFPassword (locateDirPath) {
    var wasmModule = require(locateDirPath + 'gsdk.js');
    var wasmReadyDeferred = createDeferred();
    var wasmReadyPromies = wasmReadyDeferred.promise;

    var Module = wasmModule({
        onRuntimeInitialized: function () {
            // gsdk.js initialization is complete
            wasmReadyDeferred.resolve();
        },
        onAbort: function () {
            // gsdk.js initialization is fail
            wasmReadyDeferred.reject();
        },
        locateFile: function (filename) {
            // The main thing is access to gsdk.wasm
            return locateDirPath + filename;
        },
        // Print log
        print:function(){}
    });
    if (Module instanceof Promise) {
        Module.then(function () {
            wasmReadyDeferred.resolve();
        }, function () {
            wasmReadyDeferred.reject(Module);
        });
    }
    /**
     * Encrypt the password
     * @param password PDF Document Password
     * @returns {Promise.<String>} Encrypted password
     */
    this.encrypt = function (password) {
        return wasmReadyPromies.then(function () {
            return Module.then(gsdk=>{
                return gsdk.Library.EncryptPassword(new gsdk.String(password)).toString()
            });
        });
    };
}

module.exports = EncryptPDFPassword;

function createDeferred () {
    var deferred = {};
    var promise = new Promise(function (resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    deferred.promise = promise;
    return deferred;
}

// ================= test example =======================
// node
//var EncryptPDFPassword = require('./index.js');
//var encryptPDFPassword = new EncryptPDFPassword('../../src/jr-engine/gsdk/');
//encryptPDFPassword.encrypt('123').then(function (password) {
//    console.log('encryptPassword', password);
//})
