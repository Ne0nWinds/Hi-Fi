const {Link, Switch, Route, BrowserRouter, Redirect} = window.ReactRouterDOM;

const Sidebar = props => (
    <nav id="sidebar">
        <ul>
            <li id="accountControl">
                <img src="/img/user_logo.jpg" />
                <p>{props.email.replace(/@.*/, '')}</p>
            </li>
        </ul>
        <ul>
            <li>
                <Link to="/">Home</Link>
            </li>
            <li>
                <Link to="/library">Library</Link>
            </li>
        </ul>
        <ul>
            <li>New Playlist</li>
            {props.playlists.map(p => (
                <li>
                    <Link to={'/playlist/' + p._id}>{p.name}</Link>
                </li>
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

// album or playlist
const SongSet = props => (
    <main id="songset">
        <div>
            <img src={'/api/image/view/' + props.set.artID} />
            <div>
                <h1>{props.set.title}</h1>
                <p>
                    {props.set.description != undefined
                        ? props.set.description
                        : 'No description'}
                </p>
                <button>Play</button>
                <button>Shuffle</button>
            </div>
        </div>
        <div>
            <div class="song-row-header">
                <p class="song-col song-col-num">&#35;</p>
                <p class="song-col song-col-title">Title</p>
                <p class="song-col song-col-album">Artist</p>
                <p class="song-col song-col-time">Time</p>
            </div>
            {props.set.songs.map(s => (
                <div class="song-row">
                    <p class="song-col song-col-num">{s.trackNumber}</p>
                    <p class="song-col song-col-title">{s.title}</p>
                    <p class="song-col song-col-artist">{s.artist}</p>
                    <p class="song-col song-col-tim">{s.duration}</p>
                </div>
            ))}
        </div>
    </main>
);

class WebPlayer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: this.props.user.email,
            playlists: [],
            homeAlbums: [],
            currentSongSet: {},
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
                this.setState({currentSongSet: songset});
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
        if (prevProps.url != this.props.url) await this.handleAPICalls();
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
                                <SongSet set={this.state.currentSongSet} />
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
