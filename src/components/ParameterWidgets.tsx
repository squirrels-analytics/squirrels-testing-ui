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
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div>
            <div className="widget-label">
                <span onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                    <u>{data.label}</u>{labelExtension}
                </span>
                {isHovered && data.description && <div className="hover-text">{data.description}</div>}
            </div>
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
            min={data.min_date} max={data.max_date}
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

    const strToDate = (s: string) => new Date(s.replace(/-/g, '\/'));

    const [dateRange, setDateRange] = useState<Value>(null);
    useMemo(() => {
        const startDate = data.selected_start_date ? strToDate(data.selected_start_date) : null;
        const endDate = data.selected_end_date ? strToDate(data.selected_end_date) : null;
        setDateRange([startDate, endDate]);
    }, [data]);

    const [priorValue, setPriorValue] = useState<[string, string] | null>(null);
    useEffect(() => {
        if (Array.isArray(dateRange)) {
            const [startDate, endDate] = dateRange as [Date, Date];
            if (startDate !== null && endDate !== null) {
                const startDateFormatted = startDate.toLocaleDateString("en-CA");
                const endDateFormatted = endDate.toLocaleDateString("en-CA");
                setPriorValue([startDateFormatted, endDateFormatted]);
                return handleChange([startDateFormatted, endDateFormatted]);
            }
        }
        if (priorValue !== null) return handleChange(priorValue);
    }, [dateRange]);
    
    return widgetWithLabel(data,
        <DateRangePicker
            className="widget"
            value={dateRange}
            minDate={data.min_date ? strToDate(data.min_date) : undefined}
            maxDate={data.max_date ? strToDate(data.max_date) : undefined}
            onChange={setDateRange}
            format="y-MM-dd"
            clearIcon={null}
            rangeDivider="~"
        />
    );
}


function validateBounds(value: number, prior_value: number, min: number, max: number) {
    if (value < min || value > max)
        return prior_value;
    return value;
}


function getWidthOfNumber(value: number) {
    return `${value.toString().length+3}ch`;
}


function onNumberBoxChange(e: React.ChangeEvent<HTMLInputElement>, selectedValue: number, setSelectedValue: (value: number) => void, min: number, max: number) {
    const value = parseFloat(e.target.value);
    const newValue = validateBounds(value, selectedValue, min, max);
    setSelectedValue(newValue);
}


function SliderInfo({ minValue, maxValue, increment }: { minValue: number, maxValue: number, increment: number }) {
    return (
        <div className="slider-info">
            <span>Min: {minValue}</span><span>- steps of {increment} -</span><span>Max: {maxValue}</span>
        </div>
    );
}


function NumberWidget({ obj, handleChange }: WidgetProps) {
    const data = obj as NumberParameterType;
    const minValue = data.min_value;
    const maxValue = data.max_value;
    const increment = data.increment;

    const [selectedValue, setSelectedValue] = useState(0);
    useMemo(() => {
        setSelectedValue(data.selected_value);
    }, [data]);

    useEffect(() => {
        return handleChange([selectedValue.toString()]);
    }, [selectedValue]);

    return widgetWithLabel(data,
        <div>
            <div className="slider-info">
                <span>
                    <label>Value: </label>
                    <input type="number"
                        min={minValue} 
                        max={maxValue}
                        step={increment}
                        value={selectedValue}
                        style={{width: getWidthOfNumber(selectedValue), minWidth: "40px"}}
                        onChange={e => onNumberBoxChange(e, selectedValue, setSelectedValue, minValue, maxValue)}
                    />
                </span>
            </div>
            <div>
                <div className="slider-wrapper">
                    <Slider 
                        min={minValue}
                        max={maxValue}
                        step={increment}
                        value={selectedValue}
                        onChange={val => setSelectedValue(val as number)}
                    />
                </div>
                <SliderInfo minValue={minValue} maxValue={maxValue} increment={increment} />
            </div>
        </div>
    );
}


function NumberRangeWidget({ obj, handleChange }: WidgetProps) {
    const data = obj as NumberRangeParameterType;
    const minValue = data.min_value;
    const maxValue = data.max_value;
    const increment = data.increment;

    const [selectedLowerValue, setSelectedLowerValue] = useState(0);
    const [selectedUpperValue, setSelectedUpperValue] = useState(0);
    useMemo(() => {
        setSelectedLowerValue(data.selected_lower_value);
        setSelectedUpperValue(data.selected_upper_value);
    }, [data]);

    useEffect(() => {
        return handleChange([selectedLowerValue, selectedUpperValue].map(x => x.toString()));
    }, [selectedLowerValue, selectedUpperValue]);

    const onRangeSliderChange = (val: number[]) => {
        setSelectedLowerValue(val[0]);
        setSelectedUpperValue(val[1]);
    }

    return widgetWithLabel(data,
        <div>
            <div className="slider-info">
                <span>
                    <label>Lower: </label>
                    <input type="number"
                        min={minValue} 
                        max={maxValue}
                        step={increment}
                        value={selectedLowerValue}
                        style={{width: getWidthOfNumber(selectedLowerValue), minWidth: "40px"}}
                        onChange={e => onNumberBoxChange(e, selectedLowerValue, setSelectedLowerValue, minValue, selectedUpperValue)}
                    />
                </span>
                <span>
                    <label>Upper: </label>
                    <input type="number"
                        min={minValue} 
                        max={maxValue}
                        step={increment}
                        value={selectedUpperValue}
                        style={{width: getWidthOfNumber(selectedUpperValue), minWidth: "40px"}}
                        onChange={e => onNumberBoxChange(e, selectedUpperValue, setSelectedUpperValue, selectedLowerValue, maxValue)}
                    />
                </span>
            </div>
            <div>
                <div className="slider-wrapper">
                    <Slider range
                        min={data.min_value}
                        max={data.max_value}
                        step={data.increment}
                        value={[selectedLowerValue, selectedUpperValue]}
                        onChange={val => onRangeSliderChange(val as number[])}
                    />
                </div>
                <SliderInfo minValue={minValue} maxValue={maxValue} increment={increment} />
            </div>
        </div>
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

    const className = (data.input_type == "color") ? "widget" : "padded widget";
    const coreWidget = (data.input_type == "textarea") ? (
            <textarea 
                value={enteredText}
                className={className}
                onChange={onChange} 
            />
        ) : (
            <input type={data.input_type} 
                value={enteredText}
                className={className}
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
    
    if (paramData === null) return <></>;

    const widgets = paramData.map(obj => {
        return (
            <WidgetFromObj key={obj.name} obj={obj}
                paramSelections={paramSelections} 
                refreshWidgetStates={refreshWidgetStates} 
            />
        );
    });

    return (
        <div className="widget-container">
            {widgets}
            <input type="submit" value="Apply" 
                className="blue-button padded widget"
                onClick={() => updateTableData(paramSelections.current)} 
            />
        </div>
    );
}
