import { useState, MutableRefObject, useLayoutEffect } from 'react';
import { ProjectMetadataType } from '../types/ProjectMetadataResponse';
import log from '../utils/log';
import { ParamDataType, ParameterType } from '../types/ParametersResponse';
import { DataObjectType, DashboardType, DataCatalogType, OutputFormatEnum } from '../types/DataCatalogResponse';


interface SettingsProps {
    projectMetadata: ProjectMetadataType | null;
    tokenURL: MutableRefObject<string>;
    parametersURL: MutableRefObject<string>;
    resultsURL: MutableRefObject<string>;
    fetchJson: (url: string, callback: (x: any) => Promise<void>) => Promise<void>;
    setParamData: (x: ParameterType[] | null) => void;
    clearTableData: () => void;
    setOutputFormat: (x: OutputFormatEnum) => void;
}

export default function Settings({ 
    projectMetadata, tokenURL, parametersURL, resultsURL, fetchJson, setParamData, clearTableData, setOutputFormat
}: SettingsProps) {

    const [isDashboardMode, toggleDashboardMode] = useState<boolean>(false);
    const [dataObjList, setDataObjList] = useState<DataObjectType[] | null>(null);
    const [dataObj, setDataObj] = useState<DataObjectType | null>(null);

    const dataObjType = isDashboardMode ? "dashboard" : "dataset";
    
    useLayoutEffect(() => {
        if (projectMetadata === null) return;

        tokenURL.current = projectMetadata.versions[0].token_path;
        const dataCatalogURL = projectMetadata.versions[0].data_catalog_path;
        fetchJson(dataCatalogURL, async (x: DataCatalogType) => {
            log("setting list of datasets / dashboards available");
            setDataObjList(isDashboardMode ? x.dashboards : x.datasets);
        });
    }, [projectMetadata, isDashboardMode]);

    useLayoutEffect(() => {
        if (dataObjList === null) return;

        if (dataObjList.length === 0) {
            log("alert if no datasets or dashboards found...");
            alert(`No ${dataObjType} found for current user`);
            setDataObj(null);
        }
        else {
            log(`setting dataset / dashboard name to ${dataObjList[0].name}`)
            setDataObj(dataObjList[0]);
        }

    }, [dataObjList])
    
    useLayoutEffect(() => {
        clearTableData();

        if (isDashboardMode) {
            const formatAsString = dataObj ? (dataObj as DashboardType).result_format.toUpperCase() : "UNSET";
            log(`setting output format to ${formatAsString}`)
            setOutputFormat(OutputFormatEnum[formatAsString as keyof typeof OutputFormatEnum]);
        }
        else {
            log(`setting output format to TABLE`)
            setOutputFormat(OutputFormatEnum.TABLE);
        }

        log("setting parameter data")
        if (dataObj) {
            parametersURL.current = dataObj.parameters_path;
            resultsURL.current = dataObj.result_path;
            fetchJson(parametersURL.current, async (x: ParamDataType) => { setParamData(x.parameters) });
        }
        else {
            parametersURL.current = "";
            resultsURL.current = "";
            setParamData(null);
        }
    }, [dataObj]);

    const dataObjOptions = dataObjList ? dataObjList.map(x => 
        <option key={x.name} value={x.name}>{x.label}</option>
    ) : <></>;
    
    return (
        <div className="widget-container">
            <div>
                <div className="widget-label"><b>Dataset or Dashboard?</b></div>
                <select id="is-dashboard-select" 
                    className="padded widget"
                    value={dataObjType}
                    onChange={e => toggleDashboardMode(e.target.value === "dashboard")}
                >
                    <option value="dataset">Dataset</option>
                    <option value="dashboard">Dashboard</option>  
                </select>
            </div>
            <div>
                <div className="widget-label"><b>Select a {isDashboardMode ? "Dashboard" : "Dataset"}:</b></div>
                <select id="dataset-select" 
                    className="padded widget"
                    value={dataObj?.name}
                    onChange={e => setDataObj(dataObjList?.find(x => x.name == e.target.value) || null) }
                >
                    {dataObjOptions}
                </select>
            </div>
        </div>
    );
}
