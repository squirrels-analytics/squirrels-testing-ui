import { useState, useRef, MutableRefObject, useLayoutEffect } from 'react';
import { ProjectMetadataType } from '../types/ProjectMetadataResponse';
import log from '../utils/log';
import { ParamDataType, ParameterType } from '../types/ParametersResponse';
import { DatasetType, DashboardType, DataCatalogType, OutputFormatEnum } from '../types/DataCatalogResponse';


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

    const [isDashboardMode, toggleDashboardMode] = useState<boolean | null>(null);
    const [dataObjName, setDataObjName] = useState("");
    const datasets = useRef<DatasetType[] | null>(null);
    const dashboards = useRef<DashboardType[] | null>(null);

    const dataObjType = isDashboardMode ? "dashboard" : "dataset";
    
    useLayoutEffect(() => {
        if (projectMetadata === null) return;

        log("setting dataset / dashboard name...")
        tokenURL.current = projectMetadata.versions[0].token_path;
        const dataCatalogURL = projectMetadata.versions[0].data_catalog_path;
        fetchJson(dataCatalogURL, async (x: DataCatalogType) => { 
            datasets.current = x.datasets;
            dashboards.current = x.dashboards;
            toggleDashboardMode(false);
            setOutputFormat(OutputFormatEnum.UNSET);

            const newDataObjName = (x.datasets.length === 0) ? "" : x.datasets[0].name;
            setDataObjName(newDataObjName);
        });
    }, [projectMetadata]);

    useLayoutEffect(() => {
        const dataObjList = isDashboardMode ? dashboards.current : datasets.current;
        if (dataObjList === null) return;

        if (dataObjList.length === 0) {
            log("alert if no datasets or dashboards found...");
            alert(`No ${dataObjType} found for current user`);
            setDataObjName("");
        }
        else {
            setDataObjName(dataObjList[0].name);
        }

    }, [isDashboardMode])
    
    useLayoutEffect(() => {
        clearTableData();

        var dataObj = null;
        if (isDashboardMode) {
            dataObj = dashboards.current?.find(obj => (obj.name == dataObjName));
            const formatAsString = dataObj ? dataObj.result_format.toUpperCase() : "UNSET";
            setOutputFormat(OutputFormatEnum[formatAsString as keyof typeof OutputFormatEnum]);
        }
        else {
            dataObj = datasets.current?.find(obj => (obj.name == dataObjName));
            setOutputFormat(OutputFormatEnum.TABLE);
        }

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
    }, [dataObjName]);

    const dataObjList = isDashboardMode ? dashboards.current : datasets.current;
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
                    value={dataObjName}
                    onChange={e => setDataObjName(e.target.value)}
                >
                    {dataObjOptions}
                </select>
            </div>
        </div>
    );
}
