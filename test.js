const fs = require("fs");
const request = require("request");

const accessToken = "###"; // Please set the access token.
const filename = "./sample.png"; // Please set the filename with the path.

const fileSize = fs.statSync(filename).size;

// 1. Retrieve session for resumable upload.
request(
  {
    method: "POST",
    url:
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: "sample.png", mimeType: "image/png" })
  },
  (err, res) => {
    if (err) {
      console.log(err);
      return;
    }

    // 2. Upload the file.
    request(
      {
        method: "PUT",
        url: res.headers.location,
        headers: { "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}` },
        body: fs.readFileSync(filename)
      },
      (err, res, body) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log(body);
      }
    );
  }
);