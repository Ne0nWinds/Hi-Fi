const express = require('express');
const router = express.Router();
const app = express();
app.use('/api', router);
const session = require('client-sessions');
const multer = require('multer');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
const joi = require('@hapi/joi');
const { Readable } = require('stream');

let db;
mongoClient.connect('mongodb://localhost/', { useNewUrlParser: true, useUnifiedTopology: true }, (err,client) => {
    if (err) console.warn("Mongo isn't running"), process.exit();
    db = client.db("HiFi");
});

router.post("/upload", (request, response) => {

    const storage = multer.memoryStorage();
    const upload = multer({ storage: storage, limits: {files: 3, parts:4 }});

    upload.array('files', 3)(request,response, (err) => {
        console.log(err);
        if (err) return response.status(400).json({msg:"Invalid Upload"});

        request.files.sort((a,b) => a.size > b.size); // sort least to greatest
        console.log(request.files[0], request.files[1], request.files[2]);

        let DataIDs = [];
        let successCount = 0;
        let dataRepresentation = {
            0: "96k",
            1: "128k",
            2: "192k"
        };
        for (let i = 0; i < 3;i++) {

            const readable = new Readable();
            readable.push(request.files[i].buffer);
            readable.push(null);
            
            let bucket = new mongodb.GridFSBucket(db, {
                bucketName: 'songs'
            });

            let uploadStream = bucket.openUploadStream(request.body.name + "_" + dataRepresentation[i]);
            DataIDs.push(uploadStream.id);
            readable.pipe(uploadStream);

            uploadStream.on('error', () => {
                return response.status(500).json({ msg: "Error Uploading File"});
            });
            uploadStream.on('finish', () => {
                successCount++;
                if (successCount == 3) {
                    return response.status(200).json({ msg:DataIDs });
                }
            })
        }
    });
});

app.listen(8000);
