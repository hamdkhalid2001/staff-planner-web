"use client"
import * as React from 'react';

import {
    Gantt,
    GanttWeekView,
    GanttMonthView,
    GanttDayView,
    GanttYearView,
    filterBy,
    orderBy,
    mapTree,
    extendDataItem,
    GanttTextFilter,
    GanttDateFilter,
    GanttColumnResizeEvent,
    GanttColumnReorderEvent,
    GanttDataStateChangeEvent,
    GanttExpandChangeEvent
} from '@progress/kendo-react-gantt';

import { getter } from '@progress/kendo-react-common';
import { data } from './shared-plans';

// Utility to convert MS JSON date string to JS Date
function parseMSDate(msDate: string): Date | null {
    if (!msDate) return null;
    const match = /\/Date\((\d+)\)\//.exec(msDate);
    return match ? new Date(Number(match[1])) : null;
}

// Group and map data for Gantt
function groupPlansData(raw: any[]): any[] {
    const groups: { [key: string]: any } = {};
    raw.forEach(item => {
        const groupKey = `${item.ProjectCode} | ${item.ProjectName} | ${item.Department}`;
        if (!groups[groupKey]) {
            groups[groupKey] = {
                id: groupKey,
                title: groupKey,
                isExpanded: true,
                children: []
            };
        }
        groups[groupKey].children.push({
            id: item.Id,
            title: item.Title,
            designation: item.Designation,
            grade: item.Grade,
            start: parseMSDate(item.StartDate),
            end: parseMSDate(item.EndDate),
            comments: item.Comments
        });
    });
    return Object.values(groups);
}

const ganttStyle = {
    width: '100%'
};

const taskModelFields = {
    id: 'id',
    start: 'start',
    end: 'end',
    title: 'title',
    percentComplete: 'percentComplete',
    isRollup: 'isRollup',
    isExpanded: 'isExpanded',
    isInEdit: 'isInEdit',
    children: 'children'
};

const dependencyModelFields = {
    id: 'id',
    fromId: 'fromId',
    toId: 'toId',
    type: 'type'
};

const getTaskId = getter(taskModelFields.id);

const columns = [
    { field: 'title', title: 'Name', width: 200, expandable: true },
    { field: 'designation', title: 'Site Position', width: 150 },
    { field: 'grade', title: 'Grade', width: 100 },
    { field: 'start', title: 'Start', width: 120, format: '{0:MM/dd/yyyy}' },
    { field: 'end', title: 'End', width: 120, format: '{0:MM/dd/yyyy}' },
    { field: 'comments', title: 'Comments', width: 200 }
];

const POC = () => {
    const [taskData] = React.useState(groupPlansData(data.Data));
    const [dependencyData] = React.useState([]);

    const [expandedState, setExpandedState] = React.useState([7, 11, 12, 13]);
    const [columnsState, setColumnsState] = React.useState<Array<any>>(columns);

    const onColumnResize = React.useCallback(
        (event: GanttColumnResizeEvent) => event.end && setColumnsState(event.columns),
        [setColumnsState]
    );

    const onColumnReorder = React.useCallback(
        (event: GanttColumnReorderEvent) => setColumnsState(event.columns),
        [setColumnsState]
    );

    const [dataState, setDataState] = React.useState<any>({
        sort: [{ field: 'orderId', dir: 'asc' }],
        filter: []
    });

    const onDataStateChange = React.useCallback(
        (event: GanttDataStateChangeEvent) =>
            setDataState({ sort: event.dataState.sort, filter: event.dataState.filter }),
        [setDataState]
    );

    const onExpandChange = React.useCallback(
        (event: GanttExpandChangeEvent) => {
            const id = getTaskId(event.dataItem);
            const newExpandedState = event.value
                ? expandedState.filter((currentId) => currentId !== id)
                : [...expandedState, id];

            setExpandedState(newExpandedState);
        },
        [expandedState, setExpandedState]
    );

    const processedData = React.useMemo(() => {
        const filteredData = filterBy(taskData, dataState.filter, taskModelFields.children);
        const sortedData = orderBy(filteredData, dataState.sort, taskModelFields.children);

        return mapTree(sortedData, taskModelFields.children, (task) =>
            extendDataItem(task, taskModelFields.children, {
                [taskModelFields.isExpanded]: expandedState.includes(getTaskId(task))
            })
        );
    }, [taskData, dataState, expandedState]);

    return (
        <div>
            <Gantt
                style={ganttStyle}
                taskData={processedData}
                taskModelFields={taskModelFields}
                dependencyData={dependencyData}
                dependencyModelFields={dependencyModelFields}
                columns={columnsState}
                resizable={true}
                reorderable={true}
                sortable={true}
                sort={dataState.sort}
                filter={dataState.filter}
                onColumnResize={onColumnResize}
                onColumnReorder={onColumnReorder}
                onExpandChange={onExpandChange}
                onDataStateChange={onDataStateChange}
                
            >
                <GanttWeekView />
                <GanttDayView />
                <GanttMonthView />
                <GanttYearView />
            </Gantt>
        </div>
    );
};

export default POC;