import { useState } from "react";

interface AuthBaseProps {
    setIsLoginMode: (x: boolean) => void;
}

interface AuthGatewayProps extends AuthBaseProps {
    username: string;
    submitLogout: () => void;
}

export function AuthGateway({ username, setIsLoginMode, submitLogout }: AuthGatewayProps) {
    let loggedInAsMsg;
    let button;
    if (username === "") {
        loggedInAsMsg = (<span></span>);
        button = (<button className="white-button" onClick={() => setIsLoginMode(true)}>Authenticate</button>);
    }
    else {
        loggedInAsMsg = (<span>Logged in as "{username}"</span>);
        button = (<button className="white-button" onClick={submitLogout}>Logout</button>);
    }

    return (
        <div className="horizontal-container">
            {loggedInAsMsg}
            {button}
        </div>
    );
}


interface LoginModalProps extends AuthBaseProps {
    isLoginMode: boolean;
    submitLogin: (x: FormData, y: () => void, z: () => void) => Promise<void>
}

export function LoginModal({ isLoginMode, setIsLoginMode, submitLogin }: LoginModalProps) {
    const emptyFormData = {
        username: "",
        password: ""
    }
    const [inputFormData, setInputFormData] = useState(emptyFormData);
    const [isIncorrectPwd, setIsIncorrectPwd] = useState(false);

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setInputFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));
    }

    function handleReset() {
        setIsIncorrectPwd(false);
        setInputFormData(emptyFormData);
        setIsLoginMode(false);
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const formData = new FormData();
        formData.append("username", inputFormData.username);
        formData.append("password", inputFormData.password);

        submitLogin(formData, 
            () => {
                handleReset();
            },
            () => {
                setIsIncorrectPwd(true);
            }
        );
    }

    const incorrectPwdMsg = isIncorrectPwd ? (
        <div>Incorrect username or password. Please try again</div>
    ) : <div></div>;

    const loginForm = (
        <form className="modal-content" 
            style={{width: "400px"}}
            onClick={e => e.stopPropagation()}
            onSubmit={handleSubmit} 
            onReset={handleReset}
        >
            <label htmlFor="username"><b>Username</b></label>
            <input type="text" required
                className="padded widget"
                placeholder="Enter Username" 
                name="username" 
                value={inputFormData.username}
                onChange={handleInputChange}
            />
    
            <label htmlFor="password"><b>Password</b></label>
            <input type="password" required
                className="padded widget"
                placeholder="Enter Password" 
                name="password" 
                value={inputFormData.password}
                onChange={handleInputChange} 
            />
            
            {incorrectPwdMsg}

            <div style={{marginTop: "20px", display: "grid", gridAutoFlow: "column", columnGap: "10px"}}>
                <button type="submit" className="blue-button">Login</button>
                <button type="reset" className="blue-button">Cancel</button>
            </div>
        </form>
    );

    return isLoginMode ? (
        <div className="modal-background" onClick={handleReset}>
            {loginForm}
        </div>
    ) : <div></div>;
}
