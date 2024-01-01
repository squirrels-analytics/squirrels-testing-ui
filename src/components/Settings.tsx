import { useEffect, useState, MutableRefObject } from 'react';
import { DatasetType, CatalogDataType } from '../types/CatalogResponse';


interface SettingsProps {
    catalogData: CatalogDataType | null;
    tokenURL: MutableRefObject<string>;
    parametersURL: MutableRefObject<string>;
    datasetURL: MutableRefObject<string>;
    datasetName: string;
    username: string;
    setDatasetName: (x: React.SetStateAction<string>) => void;
    clearTableData: () => void;
    updateAllParamData: () => void;
}

export default function Settings({ catalogData, tokenURL, parametersURL, datasetURL, datasetName, username, setDatasetName, clearTableData, updateAllParamData }: SettingsProps) {
    const projects = (catalogData === null) ? [] : catalogData.projects;
    const [projectName, setProjectName] = useState("");
    const [datasets, setDatasets] = useState<DatasetType[]>([]);
    
    useEffect(() => {
        if (projects.length === 0) return;
        setProjectName(projects[0].name);
    }, [projects]);

    useEffect(() => {
        const project = projects.find(obj => (obj.name == projectName));
        if (project === undefined) return;
        
        tokenURL.current = project.versions[0].token_path;

        const newDatasets = project.versions[0].datasets;
        setDatasets(newDatasets);

        if (newDatasets.length === 0) {
            setDatasetName("");
            alert("No datasets found for current user");
        }
        else {
            setDatasetName(newDatasets[0].name);
        }
    }, [projectName, projects]);

    // TODO: when username changes, only do effect if datasetName won't change
    useEffect(() => {
        clearTableData();

        const datasetObj = datasets.find(obj => (obj.name == datasetName))
        if (datasetObj) {
            parametersURL.current = datasetObj.parameters_path;
            datasetURL.current = datasetObj.result_path;
            updateAllParamData();
        }
        else {
            parametersURL.current = "";
            datasetURL.current = "";
        }
    }, [datasetName, username]);

    const projectOptions = projects.map(x => 
        <option key={x.name} value={x.name}>{x.label}</option>
    );

    const datasetOptions = datasets.map(x => 
        <option key={x.name} value={x.name}>{x.label}</option>
    );
    
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
            {/* TODO
            <label>Select the Version:</label>
            <div style={{display: "flex"}}>
                <label>Major</label>
                <input type="number" />
                <label>Minor</label>
                <input type="number" />
            </div> 
            */}
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
