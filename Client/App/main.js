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
    render() {
        return (
            <div>
                <h1>Log In</h1>
                <form action="#">
                    <input type="text" placeholder="Email" name="email" />
                    <input
                        type="password"
                        placeholder="Password"
                        name="Password"
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
    register = async e => {
        e.preventDefault();
        try {
            let body = new FormData();
            body.append('email', e.target.children.email.value);
            body.append('password', e.target.children.password.value);
            let response = await fetch('/api/register', {
                method: 'post',
                body,
            });
            console.log(response);
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
    render() {
        return (
            <BrowserRouter>
                <Switch>
                    <Route exact path="/register" component={Register} />
                    <Route exact path="/login" component={Login} />
                </Switch>
            </BrowserRouter>
        );
    }
}

ReactDOM.render(<App />, document.getElementById('root'));
