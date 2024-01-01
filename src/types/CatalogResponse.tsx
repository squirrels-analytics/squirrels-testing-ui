export interface DatasetType {
    name: string;
    label: string;
    parameters_path: string;
    result_path: string;
}

export interface ProjectType {
    name: string;
    label: string;
    versions: {
        major_version: number;
        token_path: string;
        datasets: DatasetType[];
    }[];
}

export interface CatalogDataType {
    projects: ProjectType[];
}