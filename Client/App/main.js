const {Link, Switch, Route, BrowserRouter, Redirect} = window.ReactRouterDOM;

// credit for this function: https://github.com/matkl/average-color
function getAverageColor(img) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var width = (canvas.width = img.naturalWidth);
    var height = (canvas.height = img.naturalHeight);

    ctx.drawImage(img, 0, 0);

    var imageData = ctx.getImageData(0, 0, width, height);
    var data = imageData.data;
    var r = 0;
    var g = 0;
    var b = 0;

    for (var i = 0, l = data.length; i < l; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }

    r = Math.floor(r / (data.length / 4));
    g = Math.floor(g / (data.length / 4));
    b = Math.floor(b / (data.length / 4));

    return {r, g, b};
}

const Sidebar = props => (
    <nav id="sidebar">
        <ul>
            <li id="accountControl">
                <img src="/img/user-circle-solid.svg" alt="Profile Picture" />
                <p>{props.email.replace(/@.*/, '')}</p>
            </li>
        </ul>
        <ul>
            <Link to="/">
                <li>Home</li>
            </Link>
            <Link to="/library">
                <li>Library</li>
            </Link>
        </ul>
        <ul>
            <li onClick={props.showPlaylistMenu}>New Playlist</li>
            {props.playlists.map(p => (
                <Link to={'/playlist/' + p._id}>
                    <li to={'/playlist/' + p._id}>{p.title}</li>
                </Link>
            ))}
        </ul>
    </nav>
);

const Home = props => (
    <main id="home">
        {props.albums.map(a => (
            <Link to={'/album/' + a._id}>
                <img src={'/api/image/view/' + a.artID} />
            </Link>
        ))}
    </main>
);
const Library = () => <main id="library"></main>;

const ContextMenu = props => {
    let addToPlaylist = e => {
        props.addToPlaylist(e.target.id);
    };
    return (
        <div id="playlistcontextmenu">
            <ul>
                <li onClick={props.addToStartOfQueue}>Play Next</li>
                <li onClick={props.addToEndOfQueue}>Add To Queue</li>
                <hr />
                {props.isAlbum ? (
                    ''
                ) : (
                    <li onClick={props.goToAlbum}>Go To Album</li>
                )}
                {props.isAlbum ? (
                    ''
                ) : (
                    <li onClick={props.removeFromPlaylist}>
                        Remove From Playlist
                    </li>
                )}
                {props.isAlbum ? '' : <hr />}
                {props.playlists.map(p => (
                    <li id={p._id} onClick={addToPlaylist}>
                        {'Add To ' + p.title}
                    </li>
                ))}
            </ul>
        </div>
    );
};
const NewPlaylistMenu = props => {
    let p = props.playlistToEdit;

    const handleNew = async e => {
        e.preventDefault();
        e.persist();
        let form = e.nativeEvent.target;
        let body = new FormData();
        body.append(
            'title',
            form.name.value == '' ? 'New Playlist' : form.name.value,
        );
        body.append('description', form.description.value);
        if (form[2].files[0])
            body.append('image', form[2].files[0], form[2].files[0].name);
        let response = await axios.post('/api/playlist/new', body);
        props.addPlaylist(response.data);
        props.hidePlaylistMenu();
    };
    const handleEdit = async e => {
        e.preventDefault();
        e.persist();
        let form = e.nativeEvent.target;
        let body = new FormData();
        if (form.name.value != '') body.append('title', form.name.value);
        if (form.description.value != '')
            body.append('description', form.description.value);
        if (form[2].files[0])
            body.append('image', form[2].files[0], form[2].files[0].name);
        let response = await axios.post(
            '/api/playlist/editmeta/' + p._id,
            body,
        );
        props.updatePlaylist(response.data.value);
        props.hidePlaylistMenu();
    };
    return (
        <div id="overlay" onClick={props.hidePlaylistMenu}>
            <div id="create-new-playlist">
                <p
                    id="new-playlist-close"
                    onClick={props.hidePlaylistMenu}
                    class="fa">
                    &#xf05c;
                </p>
                <h1>{p ? 'Edit' : 'New'} Playlist</h1>
                <img src="/img/new_playlist.svg" />
                <form onSubmit={p ? handleEdit : handleNew}>
                    <h2>Name</h2>
                    <input
                        type="text"
                        name="name"
                        placeholder={p ? p.title : ''}
                    />
                    <h2>Description</h2>
                    <textarea
                        name="description"
                        placeholder={p ? p.description : ''}></textarea>
                    <label for="file" id="file-label">
                        Choose A Cover Photo <span class="fa">&#xf019;</span>
                    </label>
                    <input type="file" name="file" id="file" />
                    <button>{p ? 'Save' : 'Create'}</button>
                </form>
            </div>
        </div>
    );
};

// album or playlist
class SongSet extends React.Component {
    constructor(props) {
        super(props);
        this.count = 0;
        this.state = {
            loaded: false,
            set: {},
            isOwner: false,
        };
        this.handleAPICalls();
    }
    componentDidUpdate() {
        // generate background color
        let albumArt = document.getElementById('albumArt');
        if (albumArt != null)
            albumArt.onload = () => {
                let avg = getAverageColor(albumArt);
                if (avg.r > 150 || avg.g > 150 || avg.b > 150) {
                    let rows = document.getElementsByClassName('song-row');
                    for (let r of rows) {
                        r.className += ' song-row-dark';
                    }
                }
                avg = 'rgb(' + avg.r + ',' + avg.g + ',' + avg.b + ')';
                document.getElementById('songset').style.backgroundImage =
                    'linear-gradient(' + avg + ',#191715)';
            };
        else
            document.getElementById('songset').style.backgroundImage =
                'linear-gradient(#252525,#191715)';
    }
    componentWillReceiveProps(newProps) {
        if (newProps.url[1] != this.props.url[1]) {
            this.setState({loaded: false});
            this.handleAPICalls(newProps);
        }
    }
    handleAPICalls = async (p = this.props) => {
        let url = p.url;
        let response;
        try {
            if (url[0] == 'album')
                response = await axios.get('/api/album/get/' + url[1]);
            else response = await axios.get('/api/playlist/view/' + url[1]);
        } catch (err) {
            return;
        }
        songset = {...response.data, songs: []};
        let songs = response.data.songs.join(',');
        let body = new FormData();
        body.append('songs', songs);

        response = await axios.post('/api/songs/view', body);
        songset.songs = response.data.sort(
            (a, b) => Number(a.trackNumber) > Number(b.trackNumber),
        );

        songset.isAlbum = url[0] == 'album';
        this.setState({
            set: songset,
            loaded: true,
        });
        if (songset.isAlbum) this.setState({isOwner: false});
        else {
            this.setState({
                isOwner: songset.creatorID == this.props.user._id,
            });
        }
    };
    showContextMenu = e => {
        e.preventDefault();
        e.persist();
        let id = e.target.id || e.target.parentElement.id;
        let song = this.state.set.songs.find(s => s._id == id);
        this.props.showContextMenu(song, e.pageX, e.pageY);
    };
    playSong = e => {
        e.persist();
        let id = e.target.id || e.target.parentElement.id;
        let queue = new Array();
        if (!id) {
            queue = this.state.set.songs;
        } else {
            let allSongs = this.state.set.songs;
            for (let i = 0; i < allSongs.length; i++) {
                if (queue.length > 0 || allSongs[i]._id == id) {
                    queue.push(allSongs[i]);
                }
            }
        }
        this.props.setQueue(queue);
        if (this.state.set.isAlbum) {
            this.props.playNextInQueue(this.state.set.artID);
        } else {
            this.props.playNextInQueue();
        }
    };
    deletePlaylist = () => {
        this.props.deletePlaylist(this.state.set._id);
    };
    editPlaylist = () => {
        this.props.editPlaylist(this.state.set);
    };
    render() {
        this.count = 0;
        return (
            <div>
                {this.state.loaded ? (
                    <main id="songset">
                        <div id="songset-meta">
                            {this.state.set.artID != '' ? (
                                <img
                                    id="albumArt"
                                    src={
                                        '/api/image/view/' +
                                        this.state.set.artID
                                    }
                                    alt="Album Cover"
                                />
                            ) : (
                                <div id="songset-img-placeholder">
                                    No{' '}
                                    {this.state.set.isAlbum
                                        ? 'Album Cover'
                                        : 'Playlist Photo'}{' '}
                                    Available
                                </div>
                            )}
                            <div>
                                <h1>{this.state.set.title}</h1>
                                <p>
                                    {this.state.set.description != undefined
                                        ? this.state.set.description
                                        : 'No description'}
                                </p>
                                <button onClick={this.playSong} class="fa">
                                    &#xf04b;
                                </button>
                                {this.state.isOwner ? (
                                    <button
                                        class="fa"
                                        onClick={this.editPlaylist}>
                                        &#xf044;
                                    </button>
                                ) : (
                                    ''
                                )}
                                {this.state.isOwner ? (
                                    <button
                                        onClick={this.deletePlaylist}
                                        class="fa">
                                        &#xf00d;
                                    </button>
                                ) : (
                                    ''
                                )}
                            </div>
                        </div>
                        <div id="songset-tracklist">
                            {this.state.set.songs.map(s => {
                                this.count++;
                                return (
                                    <div
                                        class="song-row"
                                        id={s._id}
                                        onClick={this.playSong}
                                        onContextMenu={this.showContextMenu}>
                                        <p class="song-col song-col-num">
                                            {this.state.set.isAlbum
                                                ? s.trackNumber
                                                : this.count}
                                        </p>
                                        <p class="song-col song-col-title">
                                            {s.title}
                                        </p>
                                        <p class="song-col song-col-artist">
                                            {s.artist}
                                        </p>
                                        <p class="song-col song-col-time">
                                            {Math.floor(s.duration / 60)}:
                                            {Math.round(s.duration % 60) > 9
                                                ? ''
                                                : '0'}
                                            {Math.round(s.duration % 60)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </main>
                ) : (
                    <main id="songset">
                        <div id="songset-meta">
                            <div id="albumArtPlaceholder" />
                        </div>
                    </main>
                )}
            </div>
        );
    }
}

class WebPlayer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: this.props.user.email,
            userID: this.props.user._id,
            playlists: [],
            homeAlbums: [],
            serverResponded: false,
            playlistToEdit: null,
            overlayOpen: false,
        };
        this.contextMenuSong = '';
        this.audio = new Audio();
        this.player = dashjs.MediaPlayer().create();
        this.player.initialize(this.audio);
        this.interval = null;
        this.queue = [];

        this.getHomeAlbums();
    }

    getHomeAlbums = async () => {
        let response = await axios.get('/api/albums/get');
        this.setState({homeAlbums: response.data});
    };

    async componentDidMount() {
        // event listeners for context menu removal
        window.addEventListener('resize', this.hideContextMenu);

        // sidebar queries
        let response, body;
        if (this.props.user.playlists.length > 0) {
            body = new FormData();
            body.append('playlists', this.props.user.playlists.join(','));
            response = await axios.post('/api/playlist/view', body);
            this.setState({playlists: response.data});
        }

        // main queries
        this.setState({serverResponded: true});

        // controls
        this.volumeSliderContainer = document.getElementById(
            'volume-slider-container',
        );
        this.volumeSlider = document.getElementById('volume-slider');
        window.addEventListener('keydown', e => {
            switch (e.key) {
                case 'ArrowUp':
                    this.setVolume(this.audio.volume + 0.05);
                    break;
                case 'ArrowDown':
                    this.setVolume(this.audio.volume - 0.05);
                    break;
                case ' ':
                    if (!this.state.overlayOpen) this.handlePausePlay();
                    break;
                case 'Escape':
                    this.hideContextMenu();
                    this.hidePlaylistMenu();
                    this.setState({});
            }
        });
        this.progress = document.getElementById('progress');
    }

    // context menu
    showContextMenu = (song, x, y) => {
        let cm = document.getElementById('playlistcontextmenu');
        cm.style.visibility = 'visible';
        cm.style.position = 'absolute';

        if (x + cm.offsetWidth < window.innerWidth) cm.style.left = x + 'px';
        else cm.style.left = x - cm.offsetWidth + 'px';

        if (
            y + cm.offsetHeight <
            window.innerHeight -
                document.getElementById('controls').offsetHeight
        )
            cm.style.top = y + 'px';
        else cm.style.top = y - cm.offsetHeight + 'px';
        this.contextMenuSong = song;
    };
    hideContextMenu = () => {
        let cm = document.getElementById('playlistcontextmenu');
        this.contextMenuSong = null;
        cm.style.visibility = 'hidden';
        cm.style.left = '0px';
        cm.style.top = '0px';
    };

    readDuration = () => {
        if (!this.progress) progress = document.getElementById('progress');
        let percent = (
            (this.audio.currentTime / this.audio.duration) *
            100
        ).toFixed(2);
        if (isFinite(percent)) {
            // edge case of NaN
            this.progress.style.width = percent + '%';
            if (percent >= 100) this.playNextInQueue();
        }
        this.interval = requestAnimationFrame(this.readDuration);
    };

    setQueue = (queue = []) => {
        this.queue = queue;
    };
    playNextInQueue = (artID = null) => {
        const pauseplaybtn = document.getElementById('pause-play');
        this.audio.pause();
        this.audio.currentTime = 0.0;

        if (this.queue.length == 0) {
            pauseplaybtn.innerHTML = '&#xf01d';
            return;
        }
        document.getElementById(
            'controls-song-title',
        ).innerText = this.queue[0].title;
        document.getElementById(
            'controls-song-artist',
        ).innerText = this.queue[0].artist;
        if (artID != null && !artID.type) {
            document.getElementById('left-controls-album-cover').src =
                '/api/image/view/' + artID;
        } else {
            document.getElementById('left-controls-album-cover').src = '';
            axios
                .get('/api/album/get/' + this.queue[0].albumID)
                .then(response => {
                    if (response.status == 200)
                        document.getElementById(
                            'left-controls-album-cover',
                        ).src = '/api/image/view/' + response.data.artID;
                })
                .catch(err => console.log(err));
        }
        this.player.attachSource('/api/mpd/' + this.queue[0]._id);
        this.queue = this.queue.slice(1, this.queue.length);
        pauseplaybtn.innerHTML = '&#xf28c';
        this.readDuration();
    };
    addToStartOfQueue = () => {
        this.queue = [this.contextMenuSong, ...this.queue];
        if (this.queue.length == 1) this.playNextInQueue();
    };
    addToEndOfQueue = song => {
        this.queue.push(this.contextMenuSong);
        if (this.queue.length == 1) this.playNextInQueue();
    };

    handlePausePlay = () => {
        const pauseplaybtn = document.getElementById('pause-play');
        if (this.player.isPaused()) {
            this.player.play();
            pauseplaybtn.innerHTML = '&#xf28c';
            this.readDuration();
        } else {
            this.player.pause();
            pauseplaybtn.innerHTML = '&#xf01d';
            cancelAnimationFrame(this.interval);
        }
    };

    handleVolumeChange = e => {
        e.persist();
        if (e.type == 'click')
            this.setVolume(
                e.nativeEvent.offsetX / this.volumeSliderContainer.offsetWidth,
            );
        else if (e.type == 'onmousemove' && e.buttons == 1)
            this.setVolume(
                e.nativeEvent.offsetX / this.volumeSliderContainer.offsetWidth,
            );
    };

    setVolume = amount => {
        amount = Math.max(0, amount);
        amount = Math.min(1, amount);
        this.player.setVolume(amount);
        this.volumeSlider.style.width = amount * 100 + '%';
    };

    componentWillUnMount() {
        window.removeEventListener('resize', this.hideContextMenu, true);
    }

    // context Menu
    addToPlaylist = async playlistID => {
        let body = new FormData();
        body.append('songID', this.contextMenuSong._id);
        body.append('playlistID', playlistID);
        let response = await axios.post('/api/playlist/addsong', body);
    };

    removeFromPlaylist = async () => {
        let url = this.props.url.substring(1).split('/');
        let body = new FormData();
        body.append('songID', this.contextMenuSong._id);
        body.append('playlistID', url[1]);
        try {
            let response = await axios.post('/api/playlist/removeSong', body);
        } catch (err) {}
    };

    goToAlbum = () => {
        this.setState({redirectToAlbum: this.contextMenuSong.albumID});
    };

    // new playlist menu
    showPlaylistMenu = () => {
        this.setState({overlayOpen: true});
    };
    editPlaylist = playlistToEdit => {
        this.setState({playlistToEdit, overlayOpen: true});
    };
    hidePlaylistMenu = (e = null) => {
        if (e) e.persist();
        if (e == null || e.target.id == 'overlay') {
            this.setState({playlistToEdit: null, overlayOpen: false});
        }
    };

    deletePlaylist = async id => {
        let response = await axios.get('/api/playlist/delete/' + id);
        this.setState({
            playlists: this.state.playlists.filter(p => p._id != id),
        });
        this.setState({redirectHome: true});
    };

    addPlaylist = newPlaylist => {
        this.setState({
            playlists: [...this.state.playlists, newPlaylist],
        });
    };

    updatePlaylist = updatedPlaylist => {
        let sidebarPlaylists = [...this.state.playlists];
        for (let i in sidebarPlaylists) {
            console.log(sidebarPlaylists[i]._id, updatedPlaylist._id);
            if (sidebarPlaylists[i]._id == updatedPlaylist._id) {
                sidebarPlaylists[i].title = updatedPlaylist.title;
                sidebarPlaylists[i].description = updatedPlaylist.description;
            }
        }
        this.setState({
            playlists: sidebarPlaylists,
            redirectToPlaylist: updatedPlaylist._id,
        });
    };

    render() {
        if (this.state.redirectHome) {
            this.setState({redirectHome: false});
            return <Redirect to="/" />;
        }
        if (this.state.redirectToAlbum) {
            this.setState({redirectToAlbum: null});
            return <Redirect to={'/album/' + this.state.redirectToAlbum} />;
        }
        if (this.state.redirectToPlaylist) {
            this.setState({redirectToPlaylist: null});
            return (
                <Redirect to={'/playlist/' + this.state.redirectToPlaylist} />
            );
        }
        return (
            <div id="webPlayer" onClick={this.hideContextMenu}>
                <Sidebar
                    email={this.state.email}
                    playlists={this.state.playlists}
                    showPlaylistMenu={this.showPlaylistMenu}
                />
                <Switch>
                    <Route
                        exact
                        path="/"
                        component={props => (
                            <Home albums={this.state.homeAlbums} />
                        )}
                    />
                    <Route
                        exact
                        path="/library"
                        render={props => <Library />}
                    />
                    <Route
                        path="/album/:id"
                        render={props => {
                            return (
                                <SongSet
                                    showContextMenu={this.showContextMenu}
                                    setQueue={this.setQueue}
                                    playNextInQueue={this.playNextInQueue}
                                    url={props.match.url
                                        .substring(1)
                                        .split('/')}
                                />
                            );
                        }}
                    />
                    <Route
                        path="/playlist/:id"
                        render={props => (
                            <SongSet
                                showContextMenu={this.showContextMenu}
                                setQueue={this.setQueue}
                                playNextInQueue={this.playNextInQueue}
                                deletePlaylist={this.deletePlaylist}
                                editPlaylist={this.editPlaylist}
                                user={this.props.user}
                                url={props.match.url.substring(1).split('/')}
                            />
                        )}
                    />
                </Switch>
                <ContextMenu
                    isAlbum={this.props.url[0] == 'album'}
                    playlists={this.state.playlists}
                    addToPlaylist={this.addToPlaylist}
                    removeFromPlaylist={this.removeFromPlaylist}
                    addToStartOfQueue={this.addToStartOfQueue}
                    addToEndOfQueue={this.addToEndOfQueue}
                    goToAlbum={this.goToAlbum}
                />
                {this.state.overlayOpen ? (
                    <NewPlaylistMenu
                        createNewPlaylist={this.createNewPlaylist}
                        hidePlaylistMenu={this.hidePlaylistMenu}
                        addPlaylist={this.addPlaylist}
                        playlistToEdit={this.state.playlistToEdit}
                        updatePlaylist={this.updatePlaylist}
                    />
                ) : (
                    ''
                )}
                <div id="controls">
                    <span id="progress-container">
                        <div id="progress" />
                    </span>
                    <div id="left-controls">
                        <img id="left-controls-album-cover" src="" />
                        <div>
                            <p id="controls-song-title"></p>
                            <p id="controls-song-artist"></p>
                        </div>
                    </div>
                    <div id="main-controls">
                        <i class="fa skip">&#xf049;</i>
                        <i
                            class="fa"
                            id="pause-play"
                            onClick={this.handlePausePlay}>
                            &#xf01d;
                        </i>
                        <i onClick={this.playNextInQueue} class="fa skip">
                            &#xf050;
                        </i>
                    </div>
                    <div id="right-controls">
                        <div>
                            <i class="fa">&#xf028;</i>
                            <div
                                onClick={this.handleVolumeChange}
                                onMouseMove={this.handleVolumeChange}
                                id="volume-slider-container">
                                <div id="volume-slider"></div>
                            </div>
                        </div>
                        <i class="fa">&#xf00b;</i>
                    </div>
                </div>
            </div>
        );
    }
}

class App extends React.Component {
    constructor() {
        super();
        this.state = {
            user: null,
            serverResponded: false,
        };
    }
    setUser = user => {
        this.setState({user});
    };
    async componentDidMount() {
        let response = await axios.get('/api/loggedInUser');
        if (!response.data.msg) this.setState({user: response.data});
        this.setState({serverResponded: true});
    }
    render() {
        if (this.state.serverResponded) {
            return (
                <BrowserRouter>
                    {this.state.user === null ? (
                        <Switch>
                            <Route
                                exact
                                path="/login"
                                component={() => (
                                    <Login setUser={this.setUser} />
                                )}
                            />
                            <Route
                                path="*"
                                component={() => <Redirect to="/login" />}
                            />
                        </Switch>
                    ) : (
                        <Switch>
                            <Route
                                exact
                                path="/login"
                                component={() => <Redirect to="/" />}
                            />
                            <Route
                                path="*"
                                component={props => (
                                    <WebPlayer
                                        url={props.match.url}
                                        user={this.state.user}
                                    />
                                )}
                            />
                        </Switch>
                    )}
                </BrowserRouter>
            );
        } else {
            return (
                <div id="appAnimContainer">
                    <img id="loadingAnim" src="/img/logo.svg" />
                </div>
            );
        }
    }
}

ReactDOM.render(<App />, document.getElementById('root'));
