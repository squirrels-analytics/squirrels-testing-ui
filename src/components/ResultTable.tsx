import './ResultTable.css'

import { TableDataType } from '../types/DatasetResponse.tsx'


interface ResultTableProps {
    tableDataObj: TableDataType | null;
}

export default function ResultTable({ tableDataObj }: ResultTableProps) {
    if (tableDataObj === null) {
        return (<></>);
    }

    const fields = tableDataObj.schema.fields;
    const columnsComponent = (
        <tr key={"table-header"}>
            { fields.map(field => <th key={field.name}>{field.name}</th>) }
        </tr>
    );

    const dataComponents = tableDataObj.data.map((rowObj, rowNum) =>
        <tr key={"row"+rowNum}>
            { fields.map(field => <td key={rowObj[field.name]}>{rowObj[field.name]}</td>) }
        </tr>
    );
    
    return (
        <table>
            <thead>{columnsComponent}</thead>
            <tbody>{dataComponents}</tbody>
        </table>
    );
}