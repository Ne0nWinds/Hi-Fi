const {Link, Switch, Route, BrowserRouter} = window.ReactRouterDOM;

const LOGIN = 'LOGIN';

const loginReducer = (state = null, action) => {
    switch (action.type) {
        case LOGIN:
            return action.id;
        default:
            return state;
    }
};

const loginStore = Redux.createStore(loginReducer);

class Login extends React.Component {
    constructor(props) {
        super(props);
        console.log(props);
    }
    login = async e => {
        e.preventDefault();
        try {
            let body = new FormData();
            body.append('email', e.target.children.email.value);
            body.append('password', e.target.children.password.value);
            let response = await axios.post('/api/login', body);
            if (response.status == 200) this.props.setUserId(response.data.msg);
        } catch (err) {
            console.log(err);
        }
    };
    render() {
        return (
            <div>
                <h1>Log In</h1>
                <form onSubmit={this.login}>
                    <input type="text" placeholder="Email" name="email" />
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                    />
                    <button>Log In</button>
                    <p>
                        Don't have an account?
                        <Link to="/register">Register here</Link>
                    </p>
                </form>
            </div>
        );
    }
}
class Register extends React.Component {
    constructor(props) {
        super(props);
        console.log(this.props);
    }
    register = async e => {
        e.preventDefault();
        try {
            let body = new FormData();
            body.append('email', e.target.children.email.value);
            body.append('password', e.target.children.password.value);
            let response = await axios.post('/api/register', body);
            if (response.status == 201) this.props.setUserId(response.data.msg);
        } catch (err) {
            console.log(err);
        }
    };
    render() {
        return (
            <div>
                <h1>Sign Up</h1>
                <form onSubmit={this.register}>
                    <input type="text" placeholder="Email" name="email" />
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                    />
                    <button>Create Account</button>
                    <p>
                        Already have an account?
                        <Link to="/login">Log in here</Link>
                    </p>
                </form>
            </div>
        );
    }
}

class App extends React.Component {
    constructor() {
        super();
        this.state = {
            userId: null,
        };
    }
    setUserId = id => {
        this.setState({userId: id});
    };
    render() {
        return (
            <BrowserRouter>
                {this.state.userId === null ? (
                    <Switch>
                        <Route
                            exact
                            path="/register"
                            component={() => (
                                <Register
                                    userId={this.state.userId}
                                    setUserId={this.setUserId}
                                />
                            )}
                            userId={this.state.userId}
                        />
                        <Route
                            exact
                            path="/login"
                            component={() => (
                                <Login
                                    userId={this.state.userId}
                                    setUserId={this.setUserId}
                                />
                            )}
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
