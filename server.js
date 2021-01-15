require("dotenv").config();
const port = 5000;

const fs = require("fs");
const runMiddleware = require("run-middleware");
const express = require("express");
const chokidar = require("chokidar");
const notifier = require("node-notifier");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const fetch = require("node-fetch");

const {validURL, getFileSize} = require ("./utils")
const {authorize} = require("./drive");
const {uploadFileAtUrl} = require("./upload");
const {getFolder} = require("./backup");

const app = express();
runMiddleware(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("view engine", "pug");

app.get('/', function (req, res) {
  res.render('index', { title: 'URL To GD', message: 'Enter URL of file To upload' })
})

app.post("/uploadurl",  async (req, res) => {
    let url = req.body.url;
    // Authenticating drive API
    if (validURL(url)) {
        // get file size
        let size = await getFileSize(url);
        if(size){
            res.render("uploadurl", { title: "uploading file", message: size });
            // Load client secrets from a local file.
            fs.readFile("credentials.json", (err, content) => {
                if (err) return console.log("Error loading client secret file:", err);
                // Authorize a client with credentials, then call the Google Drive API.
                authorize(JSON.parse(content), (auth)=> uploadFileAtUrl(auth, url, size));
            });
            // 1. Retrieve session for resumable upload.
            // 2. upload the file 
            fetch(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var csv = body;
                    // Continue with your processing here.
                    console.log(csv)
                }
            });
        }

    } else {
        res.render("error", { title: "Invalid Input", message: url });
    }
});

app.post("/uploadGD", async (req, res) => {
    console.log("Changes detected, /uploadGD uploading file...");
    const auth = req.query.auth;
    // Authenticating drive API
    const drive = google.drive({ version: "v3", auth });
    const folderID = await getFolder(auth);
});

async function startBackupServer(auth) {
    if (auth) {

        notifier.notify({
            title: "Backup Script",
            message: "Connected to GD, watching RNotes.md...",
        });

        console.log("✅  Connected to GD, watching RNotes.md...");

        chokidar.watch("RNotes.md").on("all", (event, path) => {
            if (event === "change") {
                app.runMiddleware("/uploadGD", {
                    method: "post",
                    query: { auth: auth },
                });
            }
        });
    }
}

function start() {
    fs.readFile("credentials.json", (err, content) => {
        if (err) return console.log("Error loading client secret file:", err);
        // Authorize a client with credentials, then call the Google Drive API.
        authorize(JSON.parse(content), (auth)=>startBackupServer(auth, app));
        app.listen(port, () => console.log(`✅  Server listening at http://localhost:${port}`));
    });
};

start();