const {Link, Switch, Route, BrowserRouter} = window.ReactRouterDOM;

class App extends React.Component {
    constructor() {
        super();
        this.state = {
            user: null,
        };
    }
    setUser = user => {
        this.setState({user});
    };
    async componentDidMount() {
        let response = await axios.get('/api/loggedInUser');
        if (!response.data.msg) this.setState({user: response.data});
    }
    render() {
        return (
            <BrowserRouter>
                {this.state.user === null ? (
                    <Switch>
                        <Route
                            exact
                            path="/register"
                            component={() => (
                                <Register setUser={this.setUser} />
                            )}
                        />
                        <Route
                            exact
                            path="/login"
                            component={() => <Login setUser={this.setUser} />}
                        />
                    </Switch>
                ) : (
                    ''
                )}
            </BrowserRouter>
        );
    }
}

ReactDOM.render(<App />, document.getElementById('root'));
