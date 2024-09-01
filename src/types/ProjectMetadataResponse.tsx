export interface ProjectMetadataType {
    name: string;
    label: string;
    versions: {
        major_version: number;
        token_path: string;
        data_catalog_path: string;
    }[];
}

export interface CatalogDataType {
    projects: ProjectMetadataType[];
}