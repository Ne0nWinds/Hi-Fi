const {Link, Switch, Route, BrowserRouter, Redirect} = window.ReactRouterDOM;

const Sidebar = props => (
    <div id="sidebar">
        <div>
            <img src="" />
            <p>{props.email}</p>
        </div>
        <hr />
        <div>
            <ul>
                <li>
                    <Link to="/">Home</Link>
                </li>
                <li>
                    <Link to="/library">Library</Link>
                </li>
            </ul>
        </div>
        <hr />
        <div>
            <p>+ New Playlist</p>
            <ul>
                {props.playlists.map(p => (
                    <li>
                        <Link to={'/playlist/' + p._id}>{p.name}</Link>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const Controls = () => <div />;
const Home = props => (
    <div id="home">
        {props.albums.map(a => {
            return <img src={'/api/image/view/' + a.artID} />;
        })}
    </div>
);
const Library = () => <div id="library"></div>;
const SongSet = () => <div id="songset"></div>;

class WebPlayer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: this.props.user.email,
            playlists: [],
            homeAlbums: [],
            serverResponded: false,
        };
    }
    handleAPICalls = async () => {};
    async componentDidMount() {
        // sidebar queries
        let response, body;
        body = new FormData();
        body.append('playlists', this.props.user.playlists.join(','));
        response = await axios.post('/api/playlist/view', body);
        this.setState({playlists: response.data});

        let url = this.props.url.substring(1).split('/');
        if (url[0] == '') {
            response = await axios.get('/api/albums/get');
            console.log(response.data);
            this.setState({homeAlbums: response.data});
        }
        this.setState({serverResponded: true});
    }
    getSnapshotBeforeUpdate(prevProps, prevState) {}
    render() {
        if (this.state.serverResponded) {
            return (
                <div id="interface">
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
