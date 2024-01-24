export interface ProjectType {
    name: string;
    label: string;
    versions: {
        major_version: number;
        token_path: string;
        datasets_path: string;
    }[];
}

export interface CatalogDataType {
    projects: ProjectType[];
}