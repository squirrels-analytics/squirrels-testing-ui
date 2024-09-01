import { MutableRefObject, useEffect, useRef, useState } from 'react';
import "./App.css";

import { ProjectMetadataType } from './types/ProjectMetadataResponse.js';
import { ParamDataType, ParameterType } from './types/ParametersResponse.js';
import { TableDataType } from './types/DatasetResponse.js';

import LoadingSpinner from './components/LoadingSpinner.js';
import Settings from './components/Settings.js'
import ResultTable from './components/ResultTable.js';
import { ParametersContainer } from './components/ParameterWidgets.js';
import { AuthGateway, LoginModal } from './components/Authentication.js';
import { OutputFormatEnum } from './types/DataCatalogResponse.js';

declare const hostname: string;
declare const projectMetadataURL: string;


async function copyTableData(tableData: TableDataType) {
    if (tableData === null || typeof tableData == "string") return;

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


async function callAPI(
    url: string, jwtToken: MutableRefObject<string>, username: string, callback: (x: Response) => Promise<void>, 
    setIsLoading: (x: boolean) => void, submitLogout: () => Promise<void>
) {
    setIsLoading(true);
    
    try {
        const response = await fetch(hostname+url, {
            headers: {
                'Authorization': `Bearer ${jwtToken.current}`
            }
        });

        const appliedUsername = response.headers.get("Applied-Username");

        // appliedUsername is null for APIs that aren't impacted by auth, or under certain 400/500 error statuses
        // Also, if logged in but server restarted, token no longer works so we get 401 error. Should logout in this case
        const hasAppliedUsername = (appliedUsername !== null || response.status === 401)
        if (hasAppliedUsername && username !== "" && appliedUsername !== username) {
            alert("User session was invalidated by the server... Logging out.");
            submitLogout();
        }
        if (response.status === 200) {
            await callback(response);
        }
        else {
            const data = await response.json();
    
            if (response.status === 401) {
                alert(data.detail);
            }
            else {
                alert(data.message);
            }
        }
    }
    catch(error) {
        console.error(error);
        alert("An unexpected error occurred")
    }

    setIsLoading(false);
}


async function callJsonAPI(
    url: string, jwtToken: MutableRefObject<string>, username: string, callback: (x: any) => Promise<void>, 
    setIsLoading: (x: boolean) => void, submitLogout: () => Promise<void>
) {
    const newCallback = async (x: Response) => {
        const data = await x.json();
        await callback(data);
    };
    await callAPI(url, jwtToken, username, newCallback, setIsLoading, submitLogout);
}

export default function App() {
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const tokenURL = useRef("");
    const parametersURL = useRef("");
    const resultsURL = useRef("");
    const userTimeoutId = useRef(0);
    const username = useRef("");
    const jwtToken = useRef("");
    const expiryTime = useRef("");

    const [projectMetadata, setProjectMetadata] = useState<ProjectMetadataType | null>(null);
    const [paramData, setParamData] = useState<ParameterType[] | null>(null);
    const [resultContent, setResultContent] = useState<TableDataType | string | null>(null);
    const [outputFormat, setOutputFormat] = useState(OutputFormatEnum.UNSET);

    const fetchJson = async (url: string, callback: (x: any) => Promise<void>) => await callJsonAPI(url, jwtToken, username.current, callback, setIsLoading, submitLogout);

    const fetchHTTPResponse = async (url: string, callback: (x: Response) => Promise<void>) => await callAPI(url, jwtToken, username.current, callback, setIsLoading, submitLogout);

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
        await fetchJson(projectMetadataURL, async x => setProjectMetadata(x));
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
            
            await fetchJson(projectMetadataURL, async x => setProjectMetadata(x));
        } 
        else if (response.status === 401) {
            unauthorizedCallback()
        }
        else {
            alert(`Unexpected response status: ${response.status}`);
        }
    }

    const toQueryParams = (paramSelections: Map<string, string[]>) => {
        const queryParams = new URLSearchParams();
        for (const [param, selections] of paramSelections) {
            for (const selection of selections) {
                queryParams.append(param, selection);
            }
        }
        return queryParams;
    }

    const refreshWidgetStates = (provoker: string, selections: string[]) => { 
        const queryParams = toQueryParams(new Map([[provoker, selections]]));
        const requestURL = parametersURL.current + '?' + queryParams;
        fetchJson(requestURL, async (x: ParamDataType) => setParamData(paramData => {
            const newParamData = paramData!.slice();
            x.parameters.forEach(currParam => {
                const index = newParamData.findIndex(y => y.name === currParam.name);
                if (index !== -1) newParamData[index] = currParam;
            })
            return newParamData;
        }));
    };

    const clearTableData = () => {
        setResultContent(null);
    }

    const updateTableData = (paramSelections: Map<string, string[]>) => {
        const queryParams = toQueryParams(paramSelections);
        const requestURL = resultsURL.current + '?' + queryParams;
        const callback = async (x: Response) => {
            const data = (outputFormat === OutputFormatEnum.TABLE) ? await x.json() : 
                (outputFormat === OutputFormatEnum.PNG) ? btoa(String.fromCharCode(...new Uint8Array(await x.arrayBuffer()))) :
                (outputFormat === OutputFormatEnum.HTML) ? await x.text() : null;
            setResultContent(data);
        }
        fetchHTTPResponse(requestURL, callback);
    };

    useEffect(() => {
        fetchJson(projectMetadataURL, async x => setProjectMetadata(x));
    }, []);

    const copyTableButton = (resultContent === null || outputFormat !== OutputFormatEnum.TABLE) ? <></> : (
        <button className="white-button" onClick={() => copyTableData(resultContent as TableDataType)}>Copy Table</button>
    );
    
    return (
        <> 
            <div id="main-container" className="horizontal-container">
                <div id="left-container">
                    <Settings 
                        projectMetadata={projectMetadata} 
                        tokenURL={tokenURL}
                        parametersURL={parametersURL}
                        resultsURL={resultsURL}
                        fetchJson={fetchJson}
                        setParamData={setParamData}
                        clearTableData={clearTableData}
                        setOutputFormat={setOutputFormat}
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
                        <ResultTable tableDataObj={resultContent} outputFormat={outputFormat} />
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