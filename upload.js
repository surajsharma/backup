const url = require("url");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");
const http = require('http');
const { google } = require("googleapis");
const decode = require('urldecode');
const got = require("got");

async function uploadFileAtUrl(auth, urll, size){
    // console.log('uploadFileAtUrl', auth.credentials.access_token, url, size);

    var parsed = url.parse(urll);
    let fname = decode(path.basename(parsed.pathname));
    let ftype = '';
    let fsize = 0;
    const drive = google.drive({ version: "v3", auth });

    fetch(urll, {method: 'HEAD'}).then((res)=>{
        if(res.status == 200){
            ftype=res.headers.get("content-type");
            fsize=res.headers.get("content-length");
            console.log("🥦" , fname, size, ftype);
            let content = '';
            got.stream(urll).pipe();
            // var fileMetadata = {
            //     'name': fname
            //   };
              
            //   var media = {
            //       mimeType: ftype,
            //       body: fetch(urll).then(res => res.pipe(fs.createWriteStream(fname)))
            //     };              
        }
    })
}

module.exports = {
    uploadFileAtUrl
}