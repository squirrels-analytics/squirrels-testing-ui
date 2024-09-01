import './ResultTable.css'

import { TableDataType } from '../types/DatasetResponse.tsx'
import { OutputFormatEnum } from '../types/DataCatalogResponse.tsx';


interface ResultTableProps {
    tableDataObj: TableDataType | string | null;
    outputFormat: OutputFormatEnum;
}

export default function ResultTable({ tableDataObj, outputFormat }: ResultTableProps) {
    if (tableDataObj === null || outputFormat === OutputFormatEnum.UNSET) {
        return (<></>);
    }
    if (outputFormat === OutputFormatEnum.HTML) {
        return (<iframe srcDoc={tableDataObj as string} style={{minWidth: "100%", minHeight: "100%"}} />);
    }
    else if (outputFormat === OutputFormatEnum.PNG) {
        return (<img src={"data:image/png;base64," + (tableDataObj as string)} />);
    }
    else if (outputFormat === OutputFormatEnum.TABLE) {
        const tableObj = tableDataObj as TableDataType;
        const fields = tableObj.schema.fields;
        const columnsComponent = (
            <tr key={"table-header"}>
                { fields.map(field => <th key={field.name}>{field.name}</th>) }
            </tr>
        );

        const dataComponents = tableObj.data.map((rowObj, rowNum) =>
            <tr key={rowNum}>
                { fields.map((field, colNum) => <td key={colNum}>{rowObj[field.name]}</td>) }
            </tr>
        );
        
        return (
            <table>
                <thead>{columnsComponent}</thead>
                <tbody>{dataComponents}</tbody>
            </table>
        );
    }
    else {
        console.error(`Unexpected output format: ${OutputFormatEnum[outputFormat]}`)
        return (<></>);
    }
}