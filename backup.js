const fs = require("fs");
const notifier = require("node-notifier");
const { google } = require("googleapis");
const fetch = require("node-fetch");
// const path = require('path')
// const readline = require("readline");
const StringDecoder = require("string_decoder").StringDecoder;



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


module.exports = {
    getFolder, uploadFile
}