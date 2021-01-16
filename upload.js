const url = require("url");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");
const http = require('http');
const { google } = require("googleapis");
const decode = require('urldecode');
const got = require("got");
const {promisify} = require('util');
const stream = require('stream');
async function uploadFileAtUrl(auth, urll, size){
    // console.log('uploadFileAtUrl', auth.credentials.access_token, url, size);
    const pipeline = promisify(stream.pipeline);

    let parsed = url.parse(urll);
    let fname = decode(path.basename(parsed.pathname));
    let ftype = '';
    let fsize = 0;
    const drive = google.drive({ version: "v3", auth });

    fetch(urll, {method: 'HEAD'}).then( async (res)=>{
        if(res.status == 200){
            ftype=res.headers.get("content-type");
            fsize=res.headers.get("content-length");
            console.log("🥦" , fname, size, ftype);

            let fileMetadata = {
                'name': fname
              };

            let media = {};
              
            let body = await pipeline(got.stream(urll), fs.createWriteStream(fname)).then(b=>{
                media = {
                    mimeType: ftype,
                    body: b
                }
            }).catch(err=>console.log(err));

            console.log(media)
        }
    })
}

module.exports = {
    uploadFileAtUrl
}