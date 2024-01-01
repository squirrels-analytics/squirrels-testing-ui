export interface TableDataType {
    schema: {
        fields: {
            name: string;
            type: string;
        }[];
        dimensions: string[];
    };
    data: Record<string, any>[];
}
