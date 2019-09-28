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
const {songSchema, userSchema} = require('./models.js');

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
            return response.status(400).json({msg: 'Duplicate Email'});

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
            delete userInDb.password;
            response.status(200).json(userInDb);
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
        let userInDb = await db
            .collection('users')
            .findOne({_id: new ObjectID(request.session.user)});
        delete userInDb.password;
        response.json(userInDb);
    } catch (err) {
        response.json({msg: 'Not Logged In'});
    }
});

api.get('/logout', (request, response) => {
    delete request.session.user;
    response.json({msg: 'Logout Successful'});
});

// creating/managing playlists
api.post(
    '/playlist/new',
    multer({storage: multer.memoryStorage()}).single('image'),
    async (request, response) => {
        if (!request.session.user) {
            response.json({msg: 'Not Logged In'});
            return;
        }
        if (!request.body.title) {
            response.json({msg: 'No title provided'});
            return;
        }
        let b = request.body;
        let data = {
            title: b.title,
            creatorID: request.session.user,
            artID: '',
            description: b.description ? b.description : '',
            songs: [],
        };

        let newPlaylist;
        try {
            newPlaylist = (await db.collection('playlists').insertOne(data))
                .ops[0];
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
        } catch (err) {
            response.status(500).json(err);
        }
        if (request.file) {
            const readable = new Readable();
            readable.push(request.file.buffer);
            readable.push(null);
            let bucket = new mongodb.GridFSBucket(db, {bucketName: 'images'});

            let uploadStream = bucket.openUploadStream(request.body.title);
            let artID = uploadStream.id;
            readable.pipe(uploadStream);

            uploadStream.on('error', () => {
                return response.status(500).json({msg: 'Error Uploading File'});
            });

            uploadStream.on('finish', async () => {
                try {
                    let data = await db
                        .collection('playlists')
                        .findOneAndUpdate(
                            {_id: new ObjectID(newPlaylist._id)},
                            {$set: {artID}},
                        );
                    response.json(newPlaylist);
                } catch (err) {
                    console.log(err);
                    response.json(newPlaylist);
                }
            });
        } else {
            response.json(newPlaylist);
        }
    },
);

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
    '/playlist/view/',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        try {
            let playlists = request.body.playlists.split(',');
            for (let i in playlists) playlists[i] = new ObjectID(playlists[i]);

            let data = await db
                .collection('playlists')
                .find({_id: {$in: playlists}})
                .toArray();
            response.json(data);
        } catch (err) {
            response.status(400).json({msg: 'Invalid Playlist ID(s)'});
        }
    },
);

api.post(
    '/playlist/addsong/',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        let song, playlist;
        try {
            song = await db
                .collection('songs')
                .findOne({_id: new ObjectID(request.body.songID)});
            if (song == null) throw 'Invalid Song ID';
        } catch (err) {
            response.status(400).json({msg: 'Invalid Song ID'});
        }

        try {
            playlist = await db
                .collection('playlists')
                .findOneAndUpdate(
                    {_id: new ObjectID(request.body.playlistID)},
                    {$push: {songs: new ObjectID(request.body.songID)}},
                );
            response.json({msg: 'Playlist Updated Successfully'});
        } catch (err) {
            response.status(400).json({msg: 'Invalid Playlist ID'});
        }
    },
);

api.post(
    '/playlist/removeSong/',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        console.log(request.body);
        try {
            let playlist = await db
                .collection('playlists')
                .findOneAndUpdate(
                    {_id: new ObjectID(request.body.playlistID)},
                    {$pull: {songs: new ObjectID(request.body.songID)}},
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
            response.status(500).json({msg: 'Meta Data Change Failed'});
        }
    },
);

api.get('/playlist/delete/:id', async (request, response) => {
    if (!request.session.user) {
        response.json({msg: 'Not Logged In'});
        return;
    }
    try {
        let playlistID = new ObjectID(request.params.id);
        let playlist = await db
            .collection('playlists')
            .findOne({_id: playlistID});
        if (playlist.creatorID == request.session.user) {
            await db
                .collection('playlists')
                .findOneAndDelete({_id: playlistID});
            await db
                .collection('users')
                .findOneAndUpdate(
                    {_id: new ObjectID(request.session.user)},
                    {$pull: {playlists: playlistID}},
                );
        } else {
            response.status(400).end();
        }
    } catch (err) {
        response.status(400).json({msg: 'Invalid Playlist ID'});
    }
});

// song upload/streaming/info
api.post(
    '/upload',
    multer({
        storage: multer.memoryStorage(),
        limits: {files: 3, parts: 9},
    }).array('files', 3),
    async (request, response) => {
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
            indexRange: request.body.indexRange,
        };
        try {
            await songSchema.validate(newSong);
        } catch (err) {
            return response.status(400).json(err);
        }
        newSong.duration = parseInt(newSong.duration);

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
    },
);

api.get('/stream/:id', async (request, response) => {
    let DataID, songInDb;
    try {
        DataID = new ObjectID(request.params.id);
        songInDb = await db.collection('songs.files').findOne({_id: DataID});
        if (songInDb == null) throw 'Not found';
    } catch (err) {
        response.status(404).end();
        return;
    }
    response.set('content-type', 'audio/mp4');
    response.set('accept-ranges', 'bytes');

    let bucket = new mongodb.GridFSBucket(db, {bucketName: 'songs'});

    let downloadStream;
    if (request.headers.range) {
        let range_header = request.headers.range
            .replace('bytes=', '')
            .split('-');
        let [start, end] = [
            parseInt(range_header[0]),
            parseInt(range_header[1]) + 1,
        ];
        let dlRequest = {start, end};
        response.writeHead(206, {
            'content-type': 'audio/mp4',
            'accept-ranges': 'bytes',
            'content-range':
                'bytes ' + start + '-' + end + '/' + songInDb.length,
        });
        downloadStream = bucket.openDownloadStream(DataID, dlRequest);
    } else {
        response.writeHead(200, {
            'content-type': 'audio/mp4',
            'accept-ranges': 'bytes',
        });
        downloadStream = bucket.openDownloadStream(DataID);
    }

    downloadStream.on('data', chunk => response.write(chunk));

    downloadStream.on('err', () => response.status(404));

    downloadStream.on('end', () => response.end());
});

api.get('/mpd/:id', async (request, response) => {
    let DataID, songInDb;
    try {
        DataID = new ObjectID(request.params.id);
        songInDb = await db.collection('songs').findOne({_id: DataID});
        if (songInDb == null) throw 'Not Found';
    } catch (err) {
        response.status(404).end();
        return;
    }
    response.set('content-type', 'application/dash+xml');
    let output = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" minBufferTime="PT10S" type="static" mediaPresentationDuration="PT${songInDb.duration}S">
  <Period id="0">
    <AdaptationSet id="0" contentType="audio" subsegmentAlignment="true">
      <Representation id="0" bandwidth="101174" codecs="mp4a.40.2" mimeType="audio/mp4">
        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
            <BaseURL>/api/stream/${songInDb.dataIDs['96k']}</BaseURL>
        <SegmentBase indexRange="822-${songInDb.indexRange}">
          <Initialization range="0-821"/>
        </SegmentBase>
      </Representation>
      <Representation id="1" bandwidth="135607" codecs="mp4a.40.2" mimeType="audio/mp4">
        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
            <BaseURL>/api/stream/${songInDb.dataIDs['128k']}</BaseURL>
        <SegmentBase indexRange="822-${songInDb.indexRange}">
          <Initialization range="0-821"/>
        </SegmentBase>
      </Representation>
      <Representation id="2" bandwidth="197393" codecs="mp4a.40.2" mimeType="audio/mp4">
        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
            <BaseURL>/api/stream/${songInDb.dataIDs['192k']}</BaseURL>
        <SegmentBase indexRange="822-${songInDb.indexRange}">
          <Initialization range="0-821"/>
        </SegmentBase>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;
    response.send(output);
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

api.post(
    '/songs/view',
    multer({storage: multer.memoryStorage()}).none(),
    async (request, response) => {
        try {
            let playlist = request.body.songs.split(','); // works for playlists and albums
            if (playlist[0] == '') playlist = [];
            for (let i in playlist) playlist[i] = new ObjectID(playlist[i]);

            let data = [];
            if (playlist.length > 0)
                data = await db
                    .collection('songs')
                    .find({_id: {$in: playlist}})
                    .toArray();
            response.json(data);
        } catch (err) {
            console.log(err);
            response.status(400).json({msg: 'Invalid Playlist ID(s)'});
        }
    },
);

// albums
api.post('/album/create', (request, response) => {
    const storage = multer.memoryStorage();
    const upload = multer({
        storage: storage,
        limits: {files: 1, parts: 2},
    });

    upload.single('image', 1)(request, response, err => {
        if (err || !request.body.title)
            return response.status(400).json({msg: 'Invalid Upload'});

        const readable = new Readable();
        readable.push(request.file.buffer);
        readable.push(null);

        let bucket = new mongodb.GridFSBucket(db, {bucketName: 'images'});

        let uploadStream = bucket.openUploadStream(request.body.title);
        let artID = uploadStream.id;
        readable.pipe(uploadStream);

        uploadStream.on('error', () => {
            return response.status(500).json({msg: 'Error Uploading File'});
        });

        uploadStream.on('finish', () => {
            let newAlbum = {
                title: request.body.title,
                artID,
                songs: [],
            };
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

api.get('/album/get/:id', async (request, response) => {
    let id;
    try {
        id = new ObjectID(request.params.id);
        response.json(await db.collection('albums').findOne({_id: id}));
    } catch (err) {
        response.status(400).json({msg: 'Invalid Track ID'});
    }
});

api.get('/albums/get', async (request, response) => {
    response.json(
        (await db
            .collection('albums')
            .find({})
            .toArray()).sort((a, b) => a._id > b._id),
    );
});

// images
api.get('/image/view/:id', async (request, response) => {
    let DataID;
    try {
        DataID = new ObjectID(request.params.id);
        let imgInDb = await db
            .collection('images.files')
            .findOne({_id: DataID});
        if (imgInDb == null) throw 'Not found';
    } catch (err) {
        response.status(404).end();
        return;
    }
    response.set('accept-ranges', 'bytes');

    let bucket = new mongodb.GridFSBucket(db, {bucketName: 'images'});

    let downloadStream = bucket.openDownloadStream(DataID);

    downloadStream.on('err', () => response.status(404).end());

    downloadStream.on('data', chunk => response.write(chunk));

    downloadStream.on('end', () => response.end());
});

app.get('*', (request, response) => {
    response.sendFile(
        __dirname.substring(0, __dirname.lastIndexOf('/')) +
            '/Client/index.html',
    );
});

app.listen(8000);
