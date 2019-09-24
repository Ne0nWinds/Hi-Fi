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
            <li>New Playlist</li>
            {props.playlists.map(p => (
                <Link to={'/playlist/' + p._id}>
                    <li to={'/playlist/' + p._id}>{p.title}</li>
                </Link>
            ))}
        </ul>
    </nav>
);

const Controls = () => <div />;
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
                <li>Play Next</li>
                <li>Add To Queue</li>
                <hr />
                <li>Go To Album</li>
                <hr />
                <li>Add To Library</li>
                {props.playlists.map(p => (
                    <li id={p._id} onClick={addToPlaylist}>
                        {'Add To ' + p.title}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// album or playlist
class SongSet extends React.Component {
    constructor(props) {
        super(props);
        this.count = 0;
    }
    componentDidMount() {
        // generate background color
        let albumArt = document.getElementById('albumArt');
        if (albumArt != null)
            albumArt.onload = () => {
                let avg = getAverageColor(albumArt);
                avg = 'rgb(' + avg.r + ',' + avg.g + ',' + avg.b + ')';
                document.getElementById('songset').style.backgroundImage =
                    'linear-gradient(' + avg + ',#191715)';
            };
    }
    showContextMenu = e => {
        e.preventDefault();
        e.persist();
        let id = e.target.id || e.target.parentElement.id;
        this.props.showContextMenu(id, e.pageX, e.pageY);
    };
    render() {
        if (this.props.loaded) {
            return (
                <main id="songset">
                    <div id="songset-meta">
                        {this.props.set.artID != '' ? (
                            <img
                                id="albumArt"
                                src={'/api/image/view/' + this.props.set.artID}
                                alt="Album Cover"
                            />
                        ) : (
                            <div id="songset-img-placeholder">
                                No{' '}
                                {this.props.set.isAlbum
                                    ? 'Album Cover'
                                    : 'Playlist Photo'}{' '}
                                Available
                            </div>
                        )}
                        <div>
                            <h1>{this.props.set.title}</h1>
                            <p>
                                {this.props.set.description != undefined
                                    ? this.props.set.description
                                    : 'No description'}
                            </p>
                            <button>Play</button>
                        </div>
                    </div>
                    <div id="songset-tracklist">
                        <div class="song-row" id="song-row-header">
                            <p class="song-col song-col-num">&#35;</p>
                            <p class="song-col song-col-title">Title</p>
                            <p class="song-col song-col-artist">Artist</p>
                            <p class="song-col song-col-time">Time</p>
                        </div>
                        {this.props.set.songs.map(s => {
                            this.count++;
                            return (
                                <div
                                    class="song-row"
                                    id={s._id}
                                    onContextMenu={this.showContextMenu}>
                                    <p class="song-col song-col-num">
                                        {this.props.set.isAlbum
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
                                        {s.duration}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </main>
            );
        } else {
            return (
                <main id="songset">
                    <div id="songset-meta">
                        <div id="albumArtPlaceholder" />
                        <div>
                            <h1></h1>
                            <p></p>
                            <button disabled>Play</button>
                        </div>
                    </div>
                    <div id="songset-tracklist">
                        <div class="song-row">
                            <p class="song-col song-col-num">&#35;</p>
                            <p class="song-col song-col-title">Title</p>
                            <p class="song-col song-col-artist">Artist</p>
                            <p class="song-col song-col-time">Time</p>
                        </div>
                    </div>
                </main>
            );
        }
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
            currentSongSet: {},
            songSetLoaded: false,
            serverResponded: false,
        };
        this.contextMenuSongID = '';
    }

    handleAPICalls = async () => {
        let url = this.props.url.substring(1).split('/');
        if (this.state.homeAlbums.length == 0 && url[0] == '')
            return new Promise(async (resolve, reject) => {
                let response = await axios.get('/api/albums/get');
                this.setState({homeAlbums: response.data});
                resolve();
            });
        else if (url[0] == 'album' || url[0] == 'playlist')
            return new Promise(async (resolve, reject) => {
                let response, songset;

                if (url[0] == 'album')
                    response = await axios.get('/api/album/get/' + url[1]);
                else response = await axios.get('/api/playlist/view/' + url[1]);
                songset = {songs: [], ...response.data};
                let songs = response.data.songs.join(',');
                let body = new FormData();
                body.append('songs', songs);

                songset.songs = (await axios.post(
                    '/api/songs/view',
                    body,
                )).data.sort(
                    (a, b) => Number(a.trackNumber) > Number(b.trackNumber),
                );
                songset.isAlbum = url[0] == 'album';
                this.setState({currentSongSet: songset, songSetLoaded: true});
                resolve();
            });
    };

    async componentDidMount() {
        // sidebar queries
        let response, body;
        body = new FormData();
        body.append('playlists', this.props.user.playlists.join(','));
        response = await axios.post('/api/playlist/view', body);
        this.setState({playlists: response.data});

        // main queries
        await this.handleAPICalls();
        this.setState({serverResponded: true});

        // event listeners for context menu removal
        window.addEventListener('resize', this.hideContextMenu);
    }

    async getSnapshotBeforeUpdate(prevProps, prevState) {
        if (prevProps.url != this.props.url) {
            this.setState({songSetLoaded: false});
            await this.handleAPICalls();
        }
    }

    // context menu
    showContextMenu = (id, x, y) => {
        let cm = document.getElementById('playlistcontextmenu');
        cm.style.visibility = 'visible';
        cm.style.position = 'absolute';

        if (x + cm.offsetWidth < window.innerWidth) cm.style.left = x + 'px';
        else cm.style.left = x - cm.offsetWidth + 'px';

        if (y + cm.offsetHeight < window.innerHeight) cm.style.top = y + 'px';
        else cm.style.top = y - cm.offsetHeight + 'px';
        this.contextMenuSongID = id;
    };
    hideContextMenu = () => {
        let cm = document.getElementById('playlistcontextmenu');
        this.contextMenuSongID = '';
        cm.style.visibility = 'hidden';
        cm.style.left = '0px';
        cm.style.top = '0px';
    };
    componentWillUnMount() {
        window.removeEventListener('resize', this.hideContextMenu, true);
    }

    // playlist management
    addToPlaylist = async playlistID => {
        let body = new FormData();
        body.append('songID', this.contextMenuSongID);
        body.append('playlistID', playlistID);
        let response = await axios.post('/api/playlist/addsong', body);
        console.log(response);
    };

    render() {
        if (this.state.serverResponded) {
            return (
                <div id="webPlayer" onClick={this.hideContextMenu}>
                    <Sidebar
                        email={this.state.email}
                        playlists={this.state.playlists}
                    />
                    <Switch>
                        <Route
                            exact
                            path="/"
                            component={() => (
                                <Home albums={this.state.homeAlbums} />
                            )}
                        />
                        <Route
                            exact
                            path="/library"
                            component={() => <Library />}
                        />
                        <Route
                            path="/album/:id"
                            component={() => (
                                <SongSet
                                    set={this.state.currentSongSet}
                                    loaded={this.state.songSetLoaded}
                                    showContextMenu={this.showContextMenu}
                                />
                            )}
                        />
                        <Route
                            path="/playlist/:id"
                            component={() => (
                                <SongSet
                                    set={this.state.currentSongSet}
                                    loaded={this.state.songSetLoaded}
                                    showContextMenu={this.showContextMenu}
                                />
                            )}
                        />
                    </Switch>
                    <Controls />
                    <ContextMenu
                        playlists={this.state.playlists}
                        addToPlaylist={this.addToPlaylist}
                    />
                    <div id="controls">
                        
                    </div>
                </div>
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
