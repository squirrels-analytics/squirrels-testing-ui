import { useEffect, useRef, useState } from 'react';
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


async function callJsonAPI(url: string, callback: (x: any) => void, setIsLoading: (x: boolean) => void) {
    setIsLoading(true);
    const jwt_token = sessionStorage.getItem("jwt_token");
    const response = await fetch(hostname+url, {
        headers: {
            'Authorization': `Bearer ${jwt_token}`
        }
    });

    let alertMessage = "";
    if (response.status === 401) {
        alertMessage = "Unauthorized action. Please try to 'Authorize' first";
    } 
    else if (response.status === 200) {
        const data = await response.json();
        callback(data);
    } 
    else {
        alertMessage = `Unexpected response status: ${response.status}`;
    }
    setIsLoading(false);
    if (alertMessage) alert(alertMessage);
}

export default function App() {
    const [isLoginMode, setIsLoginMode] = useState(false);
    const existingUsername = sessionStorage.getItem("username");
    const [username, setUsername] = useState(existingUsername || "");

    const [isLoading, setIsLoading] = useState(false);

    const [catalogData, setCatalogData] = useState<CatalogDataType | null>(null);

    const tokenURL = useRef("");
    const parametersURL = useRef("");
    const datasetURL = useRef("");

    const [datasetName, setDatasetName] = useState("");
    const [paramData, setParamData] = useState<ParameterType[]>([]);
    const [tableData, setTableData] = useState<TableDataType | null>(null);

    const fetch2 = async (url: string, callback: (x: any) => void) => await callJsonAPI(url, callback, setIsLoading);

    const clearUsername = () => {
        setUsername("");
        sessionStorage.removeItem("jwt_token");
        sessionStorage.removeItem("token_expiry");
        sessionStorage.removeItem("username");
    }

    type TokenResponseType = {username: string, access_token: string, expiry_time: string};
    const updateUsername = (data: TokenResponseType) => {
        setUsername(data.username);
        sessionStorage.setItem("jwt_token", data.access_token);
        sessionStorage.setItem("token_expiry", data.expiry_time);
        sessionStorage.setItem("username", data.username);
    }

    const submitLogout = async () => {
        clearUsername();
        await fetch2(catalogURL, setCatalogData);
    }

    const createUserTimeout = () => {
        const tokenExpiry = sessionStorage.getItem("token_expiry");
        if (tokenExpiry) {
            const timeDiff = new Date(tokenExpiry).getTime() - new Date().getTime();
            if (timeDiff > 0) {
                setTimeout(() => {
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
            
            await fetch2(catalogURL, setCatalogData);
        } 
        else if (response.status === 401) {
            unauthorizedCallback()
        }
        else {
            alert(`Unexpected response status: ${response.status}`);
        }
    }

    const updateAllParamData = () => {
        fetch2(parametersURL.current, (x: ParamDataType) => setParamData(x.parameters));
    }

    const refreshWidgetStates = (provoker: string, selection: string) => {
        const queryParams = new URLSearchParams([[provoker, selection]]);
        const requestURL = parametersURL.current + '?' + queryParams;
        fetch2(requestURL, (x: ParamDataType) => setParamData(paramData => {
            const newParamData = paramData.slice();
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
        fetch2(requestURL, setTableData); 
    };

    useEffect(() => {
        createUserTimeout();
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
                        datasetName={datasetName}
                        username={username}
                        setDatasetName={setDatasetName}
                        clearTableData={clearTableData}
                        updateAllParamData={updateAllParamData}
                    />
                    <br/><hr/><br/>
                    <ParametersContainer 
                        paramData={paramData} 
                        datasetName={datasetName}
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
                            username={username}
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