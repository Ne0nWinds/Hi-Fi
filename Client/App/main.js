const {Link, Switch, Route, BrowserRouter, Redirect} = window.ReactRouterDOM;

const Sidebar = props => (
    <nav id="sidebar">
        <ul>
            <li id="accountControl">
                <img src="/img/user_logo.jpg" alt="Profile Picture" />
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
                    <li to={'/playlist/' + p._id}>{p.name}</li>
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

// album or playlist
class SongSet extends React.Component {
    constructor(props) {
        super(props);
    }
    componentDidMount() {
        let albumArt = document.getElementById('albumArt');
        if (albumArt != null)
            albumArt.onload = () => {
                let avg = getAverageColor(albumArt);
                avg = 'rgb(' + avg.r + ',' + avg.g + ',' + avg.b + ')';
                document.getElementById('songset').style.backgroundImage =
                    'linear-gradient(' + avg + ',#191715)';
            };
    }
    render() {
        let props = this.props;
        if (props.loaded) {
            return (
                <main id="songset">
                    <div id="songset-meta">
                        <img
                            id="albumArt"
                            src={'/api/image/view/' + props.set.artID}
                            alt="Album Cover"
                        />
                        <div>
                            <h1>{props.set.title}</h1>
                            <p>
                                {props.set.description != undefined
                                    ? props.set.description
                                    : 'No description'}
                            </p>
                            <button>Play</button>
                        </div>
                    </div>
                    <div id="songset-tracklist">
                        <div class="song-row">
                            <p class="song-col song-col-num">&#35;</p>
                            <p class="song-col song-col-title">Title</p>
                            <p class="song-col song-col-artist">Artist</p>
                            <p class="song-col song-col-time">Time</p>
                        </div>
                        {props.set.songs.map(s => (
                            <div class="song-row">
                                <p class="song-col song-col-num">
                                    {s.trackNumber}
                                </p>
                                <p class="song-col song-col-title">{s.title}</p>
                                <p class="song-col song-col-artist">
                                    {s.artist}
                                </p>
                                <p class="song-col song-col-time">
                                    {s.duration}
                                </p>
                            </div>
                        ))}
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
            playlists: [],
            homeAlbums: [],
            currentSongSet: {},
            songSetLoaded: false,
            serverResponded: false,
        };
    }
    handleAPICalls = async () => {
        let url = this.props.url.substring(1).split('/');
        if (this.state.homeAlbums.length == 0 && url[0] == '')
            return new Promise(async (resolve, reject) => {
                let response = await axios.get('/api/albums/get');
                this.setState({homeAlbums: response.data});
                resolve();
            });
        else if (url[0] == 'album')
            return new Promise(async (resolve, reject) => {
                let response, songset;

                response = await axios.get('/api/album/get/' + url[1]);
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
    }

    async getSnapshotBeforeUpdate(prevProps, prevState) {
        if (prevProps.url != this.props.url) {
            this.setState({songSetLoaded: false});
            await this.handleAPICalls();
        }
    }
    render() {
        if (this.state.serverResponded) {
            return (
                <div id="webPlayer">
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
                                />
                            )}
                        />
                    </Switch>
                    <Controls />
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
