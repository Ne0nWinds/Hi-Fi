const {Link, Switch, Route, BrowserRouter, Redirect} = window.ReactRouterDOM;

class Sidebar extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <div id="sidebar">
                <div>
                    <img src="" />
                    <p>{this.props.email}</p>
                </div>
                <hr />
                <div>
                    <ul>
                        <li>Home</li>
                        <li>Library</li>
                    </ul>
                </div>
                <hr />
                <div>
                    <p>+ New Playlist</p>
                    <ul>
                        {this.props.playlists.map(p => (
                            <li>{p.name}</li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }
}
const Main = () => <div />;
const Controls = () => <div />;

class WebPlayer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: this.props.user.email,
            playlists: [],
            serverResponded: false,
        };
    }
    async componentDidMount() {
        let body = new FormData();
        body.append('playlists', this.props.user.playlists.join(','));
        let response = await axios.post('/api/playlist/view', body);
        this.setState({playlists: response.data});

        this.setState({serverResponded: true});
    }
    render() {
        if (this.state.serverResponded) {
            return (
                <div id="interface">
                    <Sidebar
                        email={this.state.email}
                        playlists={this.state.playlists}
                    />
                    <Main />
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
                                exact
                                path="/"
                                component={() => (
                                    <WebPlayer user={this.state.user} />
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
