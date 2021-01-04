require("dotenv").config();
const port = 5000;

const chokidar = require("chokidar");
const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const { google } = require("googleapis");
const readline = require("readline");
const runMiddleware = require("run-middleware");
const StringDecoder = require("string_decoder").StringDecoder;
const notifier = require("node-notifier");

const app = express();
runMiddleware(app);

//pug
app.set("view engine", "pug");

// If modifying these scopes, delete token.json.

const SCOPES = ["https://www.googleapis.com/auth/drive"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), main);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    // Check if we have previously stored a token.

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error("Error retrieving access token", err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log("Token stored to", TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getFolder(auth) {
    const drive = google.drive({ version: "v3", auth });

    await drive.files.list(
        {
            q: "mimeType='application/vnd.google-apps.folder'",
            pageSize: 1,
            fields: "nextPageToken, files(id, name)",
        },

        async (err, res) => {
            if (err) return console.log("The API returned an error: " + err);

            const files = res.data.files;

            if (files.length) {
                return files.map(async (file) => {
                    if (file.name === "Running Notes") {
                        uploadFile(file.id, auth);
                    } else {
                        // create folder
                        var folderMetadata = {
                            name: "Running Notes",
                            mimeType: "application/vnd.google-apps.folder",
                        };

                        let folder = await drive.files.create(
                            {
                                resource: folderMetadata,
                                fields: "id",
                            },

                            function (err, file) {
                                if (err) {
                                    // Handle error
                                    console.error(err);
                                } else {
                                    console.log(
                                        "Folder created, uploading file "
                                    );
                                    return uploadFile(file.data.id, auth);
                                }
                            }
                        );
                    }
                });
            } else {
                return console.log("No files found.");
            }
        }
    );
}

// watch changes in current file
// write to GD
async function uploadFile(folderID, auth) {
    const drive = google.drive({ version: "v3", auth });
    // Uploading Single file to drive
    const filename = "RNotes-" + Date.now() + ".md";
    const result = await drive.files.create({
        requestBody: {
            name: filename,
            mimeType: "text/markdown",
            parents: [folderID],
        },
        media: {
            mimeType: "text/markdown",
            body: fs.createReadStream("RNotes.md"),
        },
    });
    console.log("File Uploaded");
    notifier.notify({
        title: "Backup Script",
        message: "File Uploaded",
    });

    let d = new StringDecoder("utf8");
    let stat = fs.statSync("RNotes.md");

    fs.readFile("RNotes.md", "utf-8", (err, data) => {
        let b = Buffer.alloc(stat.size, data);

        fetch("https://api.github.com/gists", {
            method: "post",
            headers: {
                Authorization: "Token " + process.env.GISTS_PAT,
                Accept: "application/json",
                "Content-Type": "application/vnd.github.v3+json",
            },
            body: JSON.stringify({
                public: true,
                files: {
                    [filename]: {
                        content: d.write(b),
                    },
                },
            }),
        }).then((res) =>
            res.status === 201
                ? notifier.notify({
                      title: "Backup Script",
                      message: "Gist Uploaded",
                  }) && console.log("Gist Uploaded")
                : console.log(res, "ERROR Uploading Gist")
        );
    });

    return result.data;
}

async function main(auth) {
    if (auth) {
        notifier.notify({
            title: "Backup Script",
            message: "Connected to GD, watching RNotes.md...",
        });
        console.log("Connected to GD, watching RNotes.md...");
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

app.get("/uploadURL", async (req, res) => {
    res.render("uploadurl", { title: "Hey", message: "Hello there!" });
});

app.post("/uploadGD", async (req, res) => {
    console.log("Changes detected, /uploadGD uploading file...");
    const auth = req.query.auth;

    // Authenticating drive API
    const drive = google.drive({ version: "v3", auth });
    const folderID = await getFolder(auth);
});

app.listen(port, () =>
    console.log(`sever listening at http://localhost:${port}`)
);
