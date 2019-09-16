const {Link, Switch, Route, BrowserRouter} = window.ReactRouterDOM;

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            validations: {
                email: '',
                password: '',
            },
        };
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
            let validations = {...this.state.validations};
            validations.password = 'Incorrect Password';
            this.setState({validations});
        }
    };
    validateEmail = async e => {
        let emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        let validations = {...this.state.validations};
        if (!emailRegex.test(e.target.value)) {
            validations.email = 'Invalid Email';
            this.setState({validations});
            return;
        } else {
            validations.email = '';
            this.setState({validations});
        }
        let body = new FormData();
        body.append('email', e.target.value);
        let response = await axios.post('/api/emailExists', body);
        if (!response.data.emailInDb) {
            validations.email = 'Invalid Email';
            this.setState({validations});
            return;
        } else {
            validations.email = '';
            this.setState({validations});
        }
    };
    validatePassword = e => {
        let validations = {...this.state.validations};
        if (e.target.value.length < 4) {
            validations.password = 'Incorrect Password';
            this.setState({validations});
        } else {
            validations.password = '';
            this.setState({validations});
        }
    };
    render() {
        return (
            <div>
                <h1>Log In</h1>
                <form onSubmit={this.login}>
                    <input
                        type="text"
                        placeholder="Email"
                        name="email"
                        onBlur={this.validateEmail}
                    />
                    {this.state.validations.email ? (
                        <p>{this.state.validations.email}</p>
                    ) : (
                        ''
                    )}
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                        onBlur={this.validatePassword}
                    />
                    {this.state.validations.password ? (
                        <p>{this.state.validations.password}</p>
                    ) : (
                        ''
                    )}
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
        this.state = {
            validations: {
                email: '',
                password: '',
            },
        };
    }
    register = async e => {
        e.preventDefault();
        if (this.state.validations.email || this.state.validations.password)
            return;
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
    validateEmail = async e => {
        let emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        let validations = {...this.state.validations};
        if (!emailRegex.test(e.target.value)) {
            validations.email = 'Invalid Email';
            this.setState({validations});
            return;
        } else {
            validations.email = '';
            this.setState({validations});
        }
        let body = new FormData();
        body.append('email', e.target.value);
        let response = await axios.post('/api/emailExists', body);
        if (response.data.emailInDb) {
            validations.email = 'Email already in use';
            this.setState({validations});
            return;
        } else {
            validations.email = '';
            this.setState({validations});
        }
    };
    validatePassword = e => {
        let validations = {...this.state.validations};
        if (e.target.value.length < 4) {
            validations.password = 'Password must have at least 4 characters';
            this.setState({validations});
        } else {
            validations.password = '';
            this.setState({validations});
        }
    };
    render() {
        return (
            <div>
                <h1>Sign Up</h1>
                <form onSubmit={this.register}>
                    <input
                        type="text"
                        placeholder="Email"
                        name="email"
                        onBlur={this.validateEmail}
                    />
                    {this.state.validations.email ? (
                        <p>{this.state.validations.email}</p>
                    ) : (
                        ''
                    )}
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                        onBlur={this.validatePassword}
                    />
                    {this.state.validations.password ? (
                        <p>{this.state.validations.password}</p>
                    ) : (
                        ''
                    )}
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
