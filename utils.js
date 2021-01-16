const fetch = require("node-fetch");
const got = require("got");

var rfs = require('remote-file-size')

function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
}

function getFileSize(url)
{    
    // this works only if the server is broadcasting content-length

    //TODO: add workaround for when this fails

    console.log('getting file size...');

    let s = 0;

    let size = '';

    s = rfs(url, (err,o)=>{
        console.log('file size is ', o,' bytes')
        return o;
    });

    return s;     
}

module.exports = {
    validURL, getFileSize
}