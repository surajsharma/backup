const url = require("url");
const path = require("path");
const fetch = require("node-fetch");
var decode = require('urldecode')
const fs = require("fs");
const http = require('http');
const { google } = require("googleapis");

async function uploadFileAtUrl(auth, urll, size){
    // console.log('uploadFileAtUrl', auth.credentials.access_token, url, size);

    var parsed = url.parse(urll);
    let fname = decode(path.basename(parsed.pathname));
    let ftype = '';

    const drive = google.drive({ version: "v3", auth });

    fetch(urll).then((res)=>{
        if(res.status == 200){
            ftype=res.headers.get("content-type");
            console.log("🥦" , fname, size, ftype);
            
            var fileMetadata = {
                'name': fname
              };
              
              var media = {
                  mimeType: ftype,
                  body: fetch(urll).then(res => res.pipe(fs.createWriteStream(fname)))
                };              
        }
    })
}

module.exports = {
    uploadFileAtUrl
}