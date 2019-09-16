'use strict';
const express = require('express');
const app = express();
const api = express.Router();
app.use('/api', api);
app.use(
    express.static(
        __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Client',
    ),
);
const session = require('express-session');
const bcrypt = require('bcrypt');
api.use(
    session({
        secret: bcrypt.genSaltSync(12),
        resave: true,
        saveUninitialized: true,
    }),
);
app.disable('x-powered-by');
const multer = require('multer');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
const {Readable} = require('stream');
const {songSchema, albumSchema, userSchema} = require('./models.js');

let db;
mongoClient.connect(
    'mongodb://localhost/',
    {useNewUrlParser: true, useUnifiedTopology: true},
    (err, client) => {
        if (err) console.warn("Mongo isn't running"), process.exit();
        db = client.db('HiFi');
    },
);

// Login/Reg
api.post(
    '/register',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        try {
            await userSchema.validate({...request.body});
        } catch (err) {
            return response.status(400).json(err);
        }
        let newUser = {
            email: request.body.email.toLowerCase(),
            password: request.body.password,
            library: [],
            playlists: [],
            profilepic: '',
        };
        newUser.email = newUser.email.toLowerCase();

        let emailDupe = await db.collection('users').findOne({
            email: newUser.email,
        });
        if (emailDupe)
            return response.status(400).json({
                msg: 'Duplicate Email',
            });

        let salt = await bcrypt.genSalt(12);
        let hashed_password = await bcrypt.hash(newUser.password, salt);
        newUser.password = hashed_password;

        let userInDb = (await db.collection('users').insertOne(newUser)).ops[0];
        request.session.user = userInDb._id;

        return response.status(201).json({userInDb});
    },
);

api.post(
    '/login',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        try {
            await userSchema.validate({...request.body});
        } catch (err) {
            return response.status(400).json(err);
        }

        let userInDb = await db.collection('users').findOne({
            email: request.body.email,
        });
        if (!userInDb) return response.json({msg: 'Incorrect Email'});

        if (await bcrypt.compare(request.body.password, userInDb.password)) {
            request.session.user = userInDb._id;
            response.status(200).json({userInDb});
        } else {
            response.status(400).json({msg: 'Incorrect Password'});
        }
    },
);

api.post(
    '/emailExists',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        let userInDb = await db
            .collection('users')
            .findOne({email: request.body.email});

        response.json({emailInDb: userInDb ? true : false});
    },
);

api.get('/loggedInUser', async (request, response) => {
    try {
        console.log(request.session.user);
        let userInDb = await db
            .collection('users')
            .findOne({_id: new ObjectID(request.session.user)});
        delete userInDb.password;
        response.json(userInDb);
    } catch (err) {
        console.log(err);
        response.json({msg: 'Not Logged In'});
    }
});

api.get('/logout', (request, response) => {
    delete request.session.user;
    response.json({
        msg: 'Logout Successful',
    });
});

// creating/managing playlists
api.get('/playlist/new', async (request, response) => {
    let data = {
        name: 'New Playlist',
        creatorID: request.session.user,
        picture: '',
        description: '',
        songs: [],
    };

    let newPlaylist;
    try {
        newPlaylist = (await db.collection('playlists').insertOne(data)).ops[0];
    } catch (err) {
        return response.status(500).json(err);
    }

    try {
        await db
            .collection('users')
            .findOneAndUpdate(
                {_id: new ObjectID(request.session.user)},
                {$push: {playlists: newPlaylist._id}},
            );
        response.status(201).json(newPlaylist);
    } catch (err) {
        response.status(500).json(err);
    }
});

api.get('/playlist/view/:playlistID', async (request, response) => {
    try {
        let playlist = await db
            .collection('playlists')
            .findOne({_id: new ObjectID(request.params.playlistID)});
        response.json(playlist);
    } catch (err) {
        response.status(400).json({msg: 'Invalid Playlist ID'});
    }
});

api.post(
    '/playlist/addsong/',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        let song, playlist;
        try {
            song = await db
                .collection('songs')
                .findOne({_id: new ObjectID(request.body.songID)});
        } catch (err) {
            response.status(400).json({msg: 'Invalid Song ID'});
        }

        try {
            playlist = await db
                .collection('playlists')
                .findOneAndUpdate(
                    {_id: new ObjectID(request.body.playlistID)},
                    {$addToSet: {songs: new ObjectID(request.body.playlistID)}},
                );
            response.json({msg: 'Playlist Updated Successfully'});
        } catch (err) {
            response.status(400).json({msg: 'Invalid Playlist ID'});
        }
    },
);

api.post(
    '/playlist/editmeta/:playlistID',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        let playlistID;
        try {
            playlistID = new ObjectID(request.params.playlistID);
            let oldPlaylist = await db
                .collection('playlists')
                .findOne({_id: playlistID});
        } catch (err) {
            response.status(400).json({msg: 'Invalid Playlist ID'});
        }
        let editedPlaylist = {
            $set: {
                name: request.body.name ? request.body.name : oldPlaylist.name,
            },
            $set: {
                description: request.body.description
                    ? request.body.description
                    : oldPlaylist.description,
            },
        };
        try {
            await db
                .collection('playlist')
                .findOneAndUpdate({_id: playlistID}, editedPlaylist);
            response.json({msg: 'Meta Data Changed Successfully'});
        } catch (err) {
            console.log(err);
            response.status(500).json({msg: 'Meta Data Change Failed'});
        }
    },
);

// song upload/streaming/info
api.post('/upload', (request, response) => {
    const storage = multer.memoryStorage();
    const upload = multer({
        storage: storage,
        limits: {files: 3, parts: 8},
    });

    upload.array('files', 3)(request, response, err => {
        if (err) return response.status(400).json({msg: 'Invalid Upload'});
        if (request.files.length != 3)
            return response.status(400).json({msg: 'Invalid Upload'});

        let newSong = {
            title: request.body.title,
            artist: request.body.artist,
            duration: request.body.duration,
            trackNumber: request.body.trackNumber,
            dataIDs: {
                '96k': '0',
                '128k': '0',
                '192k': '0',
            },
            albumID: request.body.albumID,
        };
        let schemaErrors = songSchema.validate(newSong).error;
        if (schemaErrors) return response.status(400).json({msg: schemaErrors});

        request.files.sort((a, b) => a.size > b.size); // sort least to greatest

        let DataIDs = [];
        let successCount = 0;
        let dataRepresentation = {
            0: '96k',
            1: '128k',
            2: '192k',
        };
        for (let i = 0; i < 3; i++) {
            const readable = new Readable();
            readable.push(request.files[i].buffer);
            readable.push(null);

            let bucket = new mongodb.GridFSBucket(db, {bucketName: 'songs'});

            let uploadStream = bucket.openUploadStream(
                request.body.name + '_' + dataRepresentation[i],
            );
            DataIDs.push(uploadStream.id);
            readable.pipe(uploadStream);

            uploadStream.on('error', () => {
                return response.status(500).json({msg: 'Error Uploading File'});
            });
            uploadStream.on('finish', () => {
                successCount++;
                if (successCount == 3) {
                    newSong.dataIDs = {
                        '96k': DataIDs[0],
                        '128k': DataIDs[1],
                        '192k': DataIDs[2],
                    };

                    db.collection('songs').insertOne(newSong, (err, res) => {
                        if (err)
                            return response
                                .status(500)
                                .json({msg: 'Error adding song to database'});
                        db.collection('albums').findOneAndUpdate(
                            {_id: new ObjectID(res.ops[0].albumID)},
                            {$push: {songs: res.ops[0]._id}},
                            (err, data) => response.send(res.ops[0]),
                        );
                    });
                }
            });
        }
    });
});

api.get('/stream/:id', (request, response) => {
    let DataID;
    try {
        DataID = new ObjectID(request.params.id);
    } catch (err) {
        return response.status(400).json({msg: 'Invalid TrackId'});
    }
    //    response.set('content-type', 'audio/mp4');
    response.set('accept-ranges', 'bytes');

    let bucket = new mongodb.GridFSBucket(db, {bucketName: 'songs'});

    let downloadStream = bucket.openDownloadStream(DataID);

    downloadStream.on('data', chunk => response.write(chunk));

    downloadStream.on('err', () => reponse.sendStatus(404));

    downloadStream.on('end', () => response.end());
});

api.get('/song/:id', async (request, response) => {
    let SongID;
    try {
        SongID = new ObjectID(request.params.id);
    } catch (err) {
        return response.status(400).json({msg: 'Invalid Song Id'});
    }

    response.json(await db.collection('songs').findOne({_id: SongID}));
});

api.post('/album/create', (request, response) => {
    const storage = multer.memoryStorage();
    const upload = multer({
        storage: storage,
        limits: {files: 1, parts: 2},
    });

    upload.single('image', 1)(request, response, err => {
        if (err) return response.status(400).json({msg: 'Invalid Upload'});

        const readable = new Readable();
        readable.push(request.file.buffer);
        readable.push(null);

        let bucket = new mongodb.GridFSBucket(db, {bucketName: 'images'});

        let uploadStream = bucket.openUploadStream(request.body.name);
        let artID = uploadStream.id;
        readable.pipe(uploadStream);

        uploadStream.on('error', () => {
            return response.status(500).json({msg: 'Error Uploading File'});
        });

        uploadStream.on('finish', () => {
            let newAlbum = {
                title: request.body.name,
                artID,
                songs: [],
            };
            console.log(albumSchema.validate(newAlbum));
            db.collection('albums').insertOne(newAlbum, (err, res) => {
                if (err)
                    return response
                        .status(500)
                        .json({msg: 'Error adding album to database'});
                return response.status(201).json(res.ops);
            });
        });
    });
});

app.get('*', (request, response) => {
    response.sendFile(
        __dirname.substring(0, __dirname.lastIndexOf('/')) +
            '/Client/index.html',
    );
});

app.listen(8000);
