export interface DatasetType {
    name: string;
    label: string;
    parameters_path: string;
    result_path: string;
}

export interface DatasetsCatalogType {
    datasets: DatasetType[]
}