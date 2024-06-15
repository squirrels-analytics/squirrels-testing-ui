import { useEffect, useMemo, useRef, useState } from "react";
import { MultiSelect } from "react-multi-select-component";
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import 'react-calendar/dist/Calendar.css';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import { ParameterType, SingleSelectParameterType, MultiSelectParameterType, DateParameterType, DateRangeParameterType, NumberParameterType, NumberRangeParameterType, TextParameterType } from "../types/ParametersResponse";
import log from '../utils/log';
import './ParameterWidgets.css';


function createOption(id: string, label: string) {
    return (<option key={id} value={id}>{label}</option>);
}


function widgetWithLabel(data: ParameterType, coreWidget: JSX.Element, labelExtension: string = "") {
    return (
        <div>
            <label>{data.label}{labelExtension}</label>
            {coreWidget}
        </div>
    );
}


interface WidgetProps {
    obj: ParameterType;
    handleChange: (x: string[]) => (() => void);
}

interface SelectWidgetProps extends WidgetProps {
    refreshWidgetStates: (provoker: string, selections: string[]) => void;
}


function SingleSelectWidget({ obj, handleChange, refreshWidgetStates }: SelectWidgetProps) {
    const data = obj as SingleSelectParameterType;
    const options = data.options.map(option => {
        return createOption(option.id, option.label);
    });

    const [selectedId, setSelectedId] = useState<string>("");
    useMemo(() => {
        setSelectedId(data.selected_id);
    }, [data])

    useEffect(() => {
        return handleChange([selectedId]);
    }, [selectedId])

    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedId(e.target.value);
        if (data.trigger_refresh) {
            refreshWidgetStates(data.name, [e.target.value]);
        }
    };

    return widgetWithLabel(data,
        <select 
            id={data.name} 
            className="single-select padded widget"
            value={selectedId}
            onChange={onChange}
        >
            {options}
        </select>
    );
}


function MultiSelectWidget({ obj, handleChange, refreshWidgetStates }: SelectWidgetProps) {
    const data = obj as MultiSelectParameterType;

    type InputOption = {label: string, id: string};
    type Option = {label: string, value: string};
    const convertInputOption = (x: InputOption) => {return {label: x.label, value: x.id}};
    const getOptions = () => data.options.map(option => convertInputOption(option));
    const getSelectedValues = (options: Option[]) => {
        return options.length > 0 ? options.map(x => x.value) : [""];
    }

    const [selected, setSelected] = useState<Option[]>([]);
    useMemo(() => {
        const newSelected = data.selected_ids.map(selectedId => {
            const selectedObj = data.options.find(option => (option.id == selectedId));
            return convertInputOption(selectedObj || {label: "", id: ""});
        });
        setSelected(newSelected);
    }, [data]);

    useEffect(() => {
        return handleChange(getSelectedValues(selected));
    }, [selected]);
    
    const onChange = (x: Option[]) => {
        setSelected(x);
        if (data.trigger_refresh) {
            refreshWidgetStates(data.name, getSelectedValues(x));
        }
    };

    const orderMattersTxt = data.order_matters ? " (order matters)" : "";

    return widgetWithLabel(data,
        <MultiSelect
            options={getOptions()}
            labelledBy={data.name}
            className="multi-select widget"
            value={selected}
            onChange={onChange}
            hasSelectAll={data.show_select_all}
        />,
        orderMattersTxt
    );
}


function DateWidget({ obj, handleChange }: WidgetProps) {
    const data = obj as DateParameterType;

    const [selectedDate, setSelectedDate] = useState("");
    useMemo(() => {
        setSelectedDate(data.selected_date);
    }, [data]);

    useEffect(() => {
        return handleChange([selectedDate]);
    }, [selectedDate]);

    return widgetWithLabel(data,
        <input type="date" 
            id={data.name}
            className="date padded widget"
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
        />
    );
}


function DateRangeWidget({ obj, handleChange }: WidgetProps) {
    const data = obj as DateRangeParameterType;

    type ValuePiece = Date | null;
    type Value = ValuePiece | [ValuePiece, ValuePiece];

    const strToDate = (s: string) => new Date(s.replace(/-/g, '\/'))

    const [dateRange, setDateRange] = useState<Value>(null);
    useMemo(() => {
        setDateRange([strToDate(data.selected_start_date), strToDate(data.selected_end_date)]);
    }, [data]);

    const [priorValue, setPriorValue] = useState<[string, string] | null>(null);
    useEffect(() => {
        if (Array.isArray(dateRange)) {
            const [startDate, endDate] = dateRange as [Date, Date];
            if (startDate !== null && endDate !== null) {
                const startISODate = startDate.toISOString().split('T')[0];
                const endISODate = endDate.toISOString().split('T')[0];
                setPriorValue([startISODate, endISODate]);
                return handleChange([startISODate, endISODate]);
            }
        }
        if (priorValue !== null) return handleChange(priorValue);
    }, [dateRange]);
    
    return widgetWithLabel(data,
        <DateRangePicker
            className="widget"
            value={dateRange}
            onChange={setDateRange}
            format="y/MM/dd"
        />
    );
}


function NumberWidget({ obj, handleChange }: WidgetProps) {
    const data = obj as NumberParameterType;

    const [selectedValue, setSelectedValue] = useState(0);
    useMemo(() => {
        setSelectedValue(parseFloat(data.selected_value));
    }, [data]);

    useEffect(() => {
        return handleChange([selectedValue.toString()]);
    }, [selectedValue]);

    return widgetWithLabel(data,
        <>
            <div className="slider-wrapper">
                <Slider 
                    min={parseFloat(data.min_value)}
                    max={parseFloat(data.max_value)}
                    step={parseFloat(data.increment)}
                    value={selectedValue}
                    onChange={val => setSelectedValue(val as number)}
                />
            </div>
            <div className="slider-value">
                <span>Value: {selectedValue}</span>
            </div>
        </>
    );
}


function NumberRangeWidget({ obj, handleChange }: WidgetProps) {
    const data = obj as NumberRangeParameterType;

    const [selectedValues, setSelectedValues] = useState([0, 0]);
    useMemo(() => {
        setSelectedValues([parseFloat(data.selected_lower_value), parseFloat(data.selected_upper_value)]);
    }, [data]);

    useEffect(() => {
        const [lowerValue, upperValue] = selectedValues.map(x => x.toString())
        return handleChange([lowerValue, upperValue]);
    }, [selectedValues]);

    return widgetWithLabel(data,
        <>
            <div className="slider-wrapper">
                <Slider range
                    min={parseFloat(data.min_value)}
                    max={parseFloat(data.max_value)}
                    step={parseFloat(data.increment)}
                    value={selectedValues}
                    onChange={val => setSelectedValues(val as number[])}
                />
            </div>
            <div className="slider-value">
                <span>Lower: {selectedValues[0]}</span><span>Upper: {selectedValues[1]}</span>
            </div>
        </>
    );
}


function TextWidget({ obj, handleChange }: WidgetProps) {
    const data = obj as TextParameterType;

    const [enteredText, setEnteredText] = useState("");
    useMemo(() => {
        setEnteredText(data.entered_text);
    }, [data]);

    useEffect(() => {
        return handleChange([enteredText]);
    }, [enteredText]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEnteredText(e.target.value);
    };

    const coreWidget = data.is_textarea ? (
            <textarea value={enteredText}
                className="textbox padded widget" 
                onChange={onChange} 
            />
        ) : (
            <input type="text" value={enteredText}
                className="textbox padded widget"
                onChange={onChange} 
            />
        );

    return widgetWithLabel(data, coreWidget);
}

interface WidgetFromObjProps {
    obj: ParameterType;
    paramSelections: React.MutableRefObject<Map<string, string[]>>;
    refreshWidgetStates: (provoker: string, selections: string[]) => void;
}

function WidgetFromObj({ obj, paramSelections, refreshWidgetStates }: WidgetFromObjProps) {

    function cleanup() {
        paramSelections.current.delete(obj.name);
        log("removed: ", obj.name);
    }

    function handleChange(value: string[]) {
        paramSelections.current.set(obj.name, value);
        log("added: ", obj.name);
        return cleanup
    }

    let widget = <></>;
    switch(obj.widget_type) {
        case "single_select":
            widget = (<SingleSelectWidget obj={obj} handleChange={handleChange} refreshWidgetStates={refreshWidgetStates} />);
            break;
        case "multi_select":
            widget = (<MultiSelectWidget obj={obj} handleChange={handleChange} refreshWidgetStates={refreshWidgetStates} />);
            break;
        case "date":
            widget = (<DateWidget obj={obj} handleChange={handleChange} />);
            break;
        case "date_range":
            widget = (<DateRangeWidget obj={obj} handleChange={handleChange} />);
            break;
        case "number":
            widget = (<NumberWidget obj={obj} handleChange={handleChange} />);
            break;
        case "number_range":
            widget = (<NumberRangeWidget obj={obj} handleChange={handleChange} />);
            break;
        case "text":
            widget = (<TextWidget obj={obj} handleChange={handleChange} />);
            break;
        default:
            break;
    }
    return <>{widget}</>;
}


interface ParametersContainerProps {
    paramData: ParameterType[] | null;
    refreshWidgetStates: (provoker: string, selections: string[]) => void;
    updateTableData: (x: Map<string, string[]>) => void;
}

export function ParametersContainer({ paramData, refreshWidgetStates, updateTableData }: ParametersContainerProps) {
    const paramSelections = useRef(new Map<string, string[]>());
    
    if (paramData === null) return <div></div>;

    const widgets = paramData.map(obj => {
        return (
            <WidgetFromObj key={obj.name} obj={obj}
                paramSelections={paramSelections} 
                refreshWidgetStates={refreshWidgetStates} 
            />
        );
    });

    return (
        <div>
            {widgets}
            <input type="submit" value="Apply" 
                className="blue-button padded widget"
                onClick={() => updateTableData(paramSelections.current)} 
            />
        </div>
    );
}
