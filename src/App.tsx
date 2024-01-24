import { MutableRefObject, useEffect, useRef, useState } from 'react';
import "./App.css";

import { CatalogDataType } from './types/CatalogResponse.js';
import { ParamDataType, ParameterType } from './types/ParametersResponse.js';
import { TableDataType } from './types/DatasetResponse.js';

import LoadingSpinner from './components/LoadingSpinner.js';
import Settings from './components/Settings.js'
import ResultTable from './components/ResultTable.js';
import { ParametersContainer } from './components/ParameterWidgets.js';
import { AuthGateway, LoginModal } from './components/Authentication.js';

declare const hostname: string;
declare const catalogURL: string;


async function copyTableData(tableData: TableDataType | null) {
    if (tableData === null) return;

    let text = "";
    const fields = tableData.schema.fields;
    for (let j = 0; j < fields.length; j++) {
        if (j !== 0) text += "\t";
        text += fields[j].name;
    }
    text += "\n";

    for (let i = 0; i < tableData.data.length; i++) {
        const tableRow = tableData.data[i];
        for (let j = 0; j < fields.length; j++) {
            if (j !== 0) text += "\t";
            text += tableRow[fields[j].name];
        }
        text += "\n";
    }

    navigator.clipboard.writeText(text).then(() => {
        alert("Table copied to clipboard!");
    }, () => {
        alert("ERROR: Table failed to copy");
    })
}


async function callJsonAPI(
    url: string, jwtToken: MutableRefObject<string>, username: string, callback: (x: any) => void, 
    setIsLoading: (x: boolean) => void, submitLogout: () => Promise<void>
) {
    setIsLoading(true);
    const response = await fetch(hostname+url, {
        headers: {
            'Authorization': `Bearer ${jwtToken.current}`
        }
    });

    const appliedUsername = response.headers.get("Applied-Username");
    const data = await response.json();

    // appliedUsername is null for APIs that aren't impacted by auth, or under certain 400/500 error statuses
    // Also, if logged in but server restarted, token no longer works so we get 401 error. Should logout in this case
    const hasAppliedUsername = (appliedUsername !== null || response.status === 401)
    if (hasAppliedUsername && username !== "" && appliedUsername !== username) {
        alert("User session was invalidated by the server... Logging out.");
        submitLogout();
    }
    else if (response.status === 200) {
        callback(data);
    }
    else if (response.status === 401) {
        alert(data.detail);
    }
    else {
        alert(data.message);
    }
    setIsLoading(false);
}

export default function App() {
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const tokenURL = useRef("");
    const parametersURL = useRef("");
    const datasetURL = useRef("");
    const userTimeoutId = useRef(0);
    const username = useRef("");
    const jwtToken = useRef("");
    const expiryTime = useRef("");

    const [catalogData, setCatalogData] = useState<CatalogDataType | null>(null);
    const [paramData, setParamData] = useState<ParameterType[] | null>(null);
    const [tableData, setTableData] = useState<TableDataType | null>(null);

    const fetch2 = async (url: string, callback: (x: any) => void) => await callJsonAPI(url, jwtToken, username.current, callback, setIsLoading, submitLogout);

    const clearUsername = () => {
        username.current = "";
        jwtToken.current = "";
        expiryTime.current = "";
    }

    type TokenResponseType = {username: string, access_token: string, expiry_time: string};
    const updateUsername = (data: TokenResponseType) => {
        username.current = data.username;
        jwtToken.current = data.access_token;
        expiryTime.current = data.expiry_time;
    }

    const submitLogout = async () => {
        clearUsername();
        clearTimeout(userTimeoutId.current);
        await fetch2(catalogURL, setCatalogData); // TODO: switch from catalogURL to datasetsURL
    }

    const createUserTimeout = () => {
        const tokenExpiry = expiryTime.current;
        if (tokenExpiry !== "") {
            const timeDiff = new Date(tokenExpiry).getTime() - new Date().getTime();
            if (timeDiff > 0) {
                userTimeoutId.current = setTimeout(() => {
                    submitLogout();
                    alert("User session expired");
                }, timeDiff);
            }
            else {
                clearUsername();
            }
        }
    }

    const submitLogin = async (formData: FormData, successCallback: () => void, unauthorizedCallback: () => void) => {
        const response = await fetch(hostname+tokenURL.current, {
            method: 'POST',
            body: formData
        })

        if (response.status === 200) {
            successCallback();
            
            const data: TokenResponseType = await response.json();
            updateUsername(data);
            createUserTimeout();
            
            await fetch2(catalogURL, setCatalogData); // TODO: switch from catalogURL to datasetsURL
        } 
        else if (response.status === 401) {
            unauthorizedCallback()
        }
        else {
            alert(`Unexpected response status: ${response.status}`);
        }
    }

    const refreshWidgetStates = (provoker: string, selection: string) => { 
        const queryParams = new URLSearchParams([[provoker, selection]]);
        const requestURL = parametersURL.current + '?' + queryParams;
        fetch2(requestURL, (x: ParamDataType) => setParamData(paramData => {
            const newParamData = paramData!.slice();
            x.parameters.forEach(currParam => {
                const index = newParamData.findIndex(y => y.name === currParam.name);
                if (index !== -1) newParamData[index] = currParam;
            })
            return newParamData;
        }));
    };

    const clearTableData = () => setTableData(null);

    const updateTableData = (paramSelections: Map<string, string>) => {
        const queryParams = new URLSearchParams([...paramSelections.entries()]);
        const requestURL = datasetURL.current + '?' + queryParams;
        fetch2(requestURL, (x: TableDataType) => setTableData(x)); 
    };

    useEffect(() => {
        fetch2(catalogURL, setCatalogData);
    }, []);

    const copyTableButton = (tableData === null) ? <></> : (
        <button className="white-button" onClick={() => copyTableData(tableData)}>Copy Table</button>
    );
    
    return (
        <> 
            <div id="main-container" className="horizontal-container">
                <div id="left-container">
                    <Settings 
                        catalogData={catalogData} 
                        tokenURL={tokenURL}
                        parametersURL={parametersURL}
                        datasetURL={datasetURL}
                        fetch2={fetch2}
                        setParamData={setParamData}
                        clearTableData={clearTableData}
                    />
                    <br/><hr/><br/>
                    <ParametersContainer 
                        paramData={paramData} 
                        refreshWidgetStates={refreshWidgetStates}
                        updateTableData={updateTableData}
                    />
                </div>
                <div id="right-container">
                    <div id="header-container">
                        <div className="horizontal-container">
                            {copyTableButton}
                        </div>
                        <AuthGateway 
                            username={username.current}
                            setIsLoginMode={setIsLoginMode}
                            submitLogout={submitLogout} 
                        />
                    </div>
                    <div id="table-container">
                        <ResultTable tableDataObj={tableData} />
                    </div>
                </div>
            </div>

            <LoginModal 
                isLoginMode={isLoginMode}
                setIsLoginMode={setIsLoginMode} 
                submitLogin={submitLogin} 
            />

            <LoadingSpinner isLoading={isLoading} />
        </>
    );
}