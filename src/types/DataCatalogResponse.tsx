export enum OutputFormatEnum {
    UNSET,
    TABLE,
    PNG,
    HTML
}

export interface DataObjectType {
    name: string;
    label: string;
    parameters_path: string;
    result_path: string;
}

export interface DatasetType extends DataObjectType {}

export interface DashboardType extends DataObjectType {
    result_format: string;
}

export interface DataCatalogType {
    datasets: DatasetType[];
    dashboards: DashboardType[];
}