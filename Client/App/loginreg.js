class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isNewAccount: true,
            emailError: '',
            passwordError: '',
        };
    }
    validate = async e => {
        e.preventDefault();
        e.persist();
        let validations = {
            email: [
                {
                    msg: 'An email is required',
                    async: false,
                    test: email => email != '',
                },
                {
                    msg: 'Invalid Email',
                    async: false,
                    test: email =>
                        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                            email,
                        ),
                },
                {
                    msg: this.state.isNewAccount
                        ? 'This email is taken'
                        : "There's not an account with this email",
                    async: true,
                    test: email =>
                        new Promise(async (resolve, reject) => {
                            let body = new FormData();
                            body.append('email', email);
                            let response = await axios.post(
                                '/api/emailExists',
                                body,
                            );
                            resolve(
                                response.data.emailInDb ^
                                    this.state.isNewAccount,
                            );
                        }),
                },
            ],
            password: [
                {
                    msg: 'A password is required',
                    async: false,
                    test: p => p.length > 0,
                },
                {
                    msg: this.state.isNewAccount
                        ? 'Password is too short'
                        : 'Invalid Password',
                    async: false,
                    test: p => p.length >= 4,
                },
            ],
        };

        // check if it's a plausible login
        let validated = true;
        for (let key in validations) {
            for (let v of validations[key]) {
                let value = e.target.children[key].value;
                let valid;
                if (v.async) valid = await v.test(value);
                else valid = v.test(value);

                let state = {};
                if (!valid) {
                    state[key + 'Error'] = v.msg;
                    this.setState(state);
                    validated = false;
                    break;
                } else {
                    state[key + 'Error'] = '';
                    this.setState(state);
                }
            }
        }

        // attempt to login/register
        if (validated) {
            try {
                let body = new FormData();
                body.append('email', e.target.children.email.value);
                body.append('password', e.target.children.password.value);
                let response = await axios.post(
                    this.state.isNewAccount ? '/api/register' : '/api/login',
                    body,
                );
                if (response.status == 200 || response.status == 201)
                    this.props.setUser(response.data);
            } catch (err) {
                if (!this.state.isNewAccount)
                    this.setState({passwordError: 'Incorrect Password'});
            }
        }
    };
    render() {
        return (
            <div id="loginregcontainer">
                <div id="loginreg">
                    <h1>Hi-Fi Music</h1>
                    <h2>Stream unlimited music</h2>
                    <img src="/img/login.svg" />
                    <form onSubmit={this.validate}>
                        <input type="text" placeholder="Email" name="email" />
                        <p class="error-text">{this.state.emailError}</p>
                        <input
                            type="password"
                            placeholder="Password"
                            name="password"
                        />
                        <p class="error-text">{this.state.passwordError}</p>
                        <button>
                            {this.state.isNewAccount ? 'Register' : 'Login'}
                        </button>
                        {this.state.isNewAccount ? (
                            <p>
                                Already have an account?{' '}
                                <span
                                    onClick={() =>
                                        this.setState({isNewAccount: false})
                                    }>
                                    Login here
                                </span>
                            </p>
                        ) : (
                            <p>
                                Don't have an account?{' '}
                                <span
                                    onClick={() =>
                                        this.setState({isNewAccount: true})
                                    }>
                                    Register here
                                </span>
                            </p>
                        )}
                    </form>
                </div>
            </div>
        );
    }
}
