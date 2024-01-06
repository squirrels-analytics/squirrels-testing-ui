import { useEffect, useState, MutableRefObject, useLayoutEffect } from 'react';
import { DatasetType, CatalogDataType } from '../types/CatalogResponse';
import log from '../utils/log';
import { ParameterType } from '../types/ParametersResponse';


interface SettingsProps {
    catalogData: CatalogDataType | null;
    tokenURL: MutableRefObject<string>;
    parametersURL: MutableRefObject<string>;
    datasetURL: MutableRefObject<string>;
    setParamData: (x: ParameterType[] | null) => void;
    clearTableData: () => void;
    updateAllParamData: () => void;
}

export default function Settings({ catalogData, tokenURL, parametersURL, datasetURL, setParamData, clearTableData, updateAllParamData }: SettingsProps) {
    const [projectName, setProjectName] = useState("");
    const [datasets, setDatasets] = useState<DatasetType[] | null>(null);
    const [datasetName, setDatasetName] = useState("");
    
    const projects = (catalogData === null) ? [] : catalogData.projects;

    useLayoutEffect(() => {
        if (projects.length === 0) return;

        log("setting project name...")
        log("- projects dependency:", projects)

        setProjectName(projects[0].name);
    }, [projects]);

    useLayoutEffect(() => {
        const project = projects.find(obj => (obj.name == projectName));
        if (project === undefined) return;
        
        log("setting dataset name...")
        log("- projectName dependency:", projectName)
        log("- projects dependency:", projects)

        tokenURL.current = project.versions[0].token_path;

        const newDatasets = project.versions[0].datasets;
        setDatasets(newDatasets);

        const newDatasetName = (newDatasets.length === 0) ? "" : newDatasets[0].name ;
        setDatasetName(newDatasetName);
    }, [projectName, projects]);
    
    useLayoutEffect(() => {
        if (datasetName === null) return;

        log("updating parameters...");
        log("- datasetName dependency:", datasetName);
        log("- datasets dependency", datasets);

        clearTableData();

        const datasetObj = datasets?.find(obj => (obj.name == datasetName))
        if (datasetObj) {
            parametersURL.current = datasetObj.parameters_path;
            datasetURL.current = datasetObj.result_path;
            updateAllParamData();
        }
        else {
            parametersURL.current = "";
            datasetURL.current = "";
            setParamData(null);
        }
    }, [datasetName, datasets]);

    useEffect(() => {
        log("alert if no datasets found...");
        if (datasets?.length === 0)
            alert("No datasets found for current user");
    }, [datasets]);

    const projectOptions = projects.map(x => 
        <option key={x.name} value={x.name}>{x.label}</option>
    );

    const datasetOptions = datasets ? datasets.map(x => 
        <option key={x.name} value={x.name}>{x.label}</option>
    ) : <></>;
    
    return (
        <div>
            <label htmlFor="project-select">Select a Project:</label>
            <select id="project-select" 
                className="padded widget"
                value={projectName} 
                onChange={e => setProjectName(e.target.value)}
            >
                {projectOptions}
            </select>
            <label htmlFor="dataset-select">Select a Dataset:</label>
            <select id="dataset-select" 
                className="padded widget"
                value={datasetName}
                onChange={e => setDatasetName(e.target.value)}
            >
                {datasetOptions}
            </select>
        </div>
    );
}
