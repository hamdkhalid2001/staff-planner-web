"use client";
import { GanttComponent } from '@syncfusion/ej2-react-gantt';
import { data } from '../poc/shared-plans';

// Utility to convert MS JSON date string to JS Date
function parseMSDate(msDate: string): Date | null {
    if (!msDate) return null;
    const match = /\/Date\((\d+)\)\//.exec(msDate);
    return match ? new Date(Number(match[1])) : null;
}

// Types for plan data and mapped tasks
interface PlanItem {
    Id: string | number;
    Title: string;
    Designation?: string;
    Grade?: string;
    RenderStartDate: string;
    RenderEndDate: string;
    ProjectCode?: string;
    ProjectName?: string;
    Department?: string;
    Comments?: string;
}
interface MappedTask {
    TaskID: string | number;
    TaskName: string;
    Designation?: string;
    Grade?: string;
    StartDate: Date | null;
    EndDate: Date | null;
    AvailableStart?: Date | null;
    AvailableEnd?: Date | null;
    Comments?: string;
}
interface GroupedTask {
    TaskID: string;
    TaskName: string;
    StartDate: Date | null;
    EndDate: Date | null;
    subtasks: MappedTask[];
}

// Group and map data for Syncfusion Gantt (similar to POC)
function groupPlansData(raw: PlanItem[]): GroupedTask[] {
    const groups: { [key: string]: GroupedTask } = {};
    raw.forEach((item: PlanItem) => {
        const groupKey = `${item.ProjectCode} | ${item.ProjectName} | ${item.Department}`;
        // Make TaskID safe for DOMTokenList (no spaces)
        const safeGroupId = 'group_' + groupKey.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        if (!groups[groupKey]) {
            groups[groupKey] = {
                TaskID: safeGroupId,
                TaskName: groupKey,
                StartDate: parseMSDate(item.RenderStartDate),
                EndDate: parseMSDate(item.RenderEndDate),
                subtasks: []
            };
        }
        const mainEnd = parseMSDate(item.RenderEndDate);
        const availableStart = mainEnd ? new Date(mainEnd.getTime() + 24*60*60*1000) : null;
        const availableEnd = mainEnd ? new Date(mainEnd.getTime() + 8*24*60*60*1000) : null;
        const mainTask: MappedTask = {
            TaskID: item.Id,
            TaskName: item.Title,
            Designation: item.Designation,
            Grade: item.Grade,
            StartDate: parseMSDate(item.RenderStartDate),
            EndDate: mainEnd,
            AvailableStart: availableStart,
            AvailableEnd: availableEnd,
            Comments: item.Comments
        };
        groups[groupKey].subtasks.push(mainTask);
    });
    return Object.values(groups);
}

// Color taskbar red for tasks with Designation === 'Stores Clerk'
function onQueryTaskbarInfo(args: any) {
    const d = (args?.data?.taskData ?? args?.data) as MappedTask | undefined;
    const desig = d?.Designation?.toString().trim().toLowerCase();
    if (desig === 'stores clerk' || desig === 'quantity surveyor') {
        // Prefer Syncfusion event args so the renderer applies styles reliably
        args.taskbarBgColor = '#ef4444';
        args.taskbarBorderColor = '#b91c1c';
        args.progressBarBgColor = '#dc2626';
        args.milestoneColor = '#ef4444';
        // Show text inside the bar
        (args as any).taskbarText = 'Assigned';
        // Fallback to DOM if needed (older builds)
        const labelEl = (args.taskbarElement as HTMLElement | null)?.querySelector('.e-task-label') as HTMLElement | null;
        if (labelEl) {
            labelEl.textContent = 'Assigned';
            labelEl.style.color = '#ffffff';
            labelEl.style.textAlign = 'center';
        }
    }
}

export default function SyncfusionPage() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    // const endDate = new Date(now.getFullYear() + 1, now.getMonth(), 1); // Removed endDate

    let dataSource = groupPlansData(data.Data);
    console.log('Gantt DataSource:', dataSource);
    let taskSettings = {
        id: 'TaskID',
        name: 'TaskName',
        startDate: 'StartDate',
        endDate: 'EndDate',
        child: 'subtasks',
    };

    // Hide the ID column by specifying columns prop and omitting TaskID
    const columns = [
        { field: 'TaskName', headerText: 'Name', width: 250 },
        { field: 'Designation', headerText: 'Designation', width: 120 }
    ];

    return (
        <GanttComponent
            dataSource={dataSource}
            treeColumnIndex={0}
            taskFields={taskSettings}
            columns={columns}
            splitterSettings={{ columnIndex: 1, position: '800px' }}
            timelineSettings={{
                timelineViewMode: 'Month',
                topTier: { unit: 'Year', format: 'yyyy' },
                bottomTier: { unit: 'Month', format: 'MMM' }
            }}
            projectStartDate={startDate}
            taskbarHeight={30}
            rowHeight={40}
            queryTaskbarInfo={onQueryTaskbarInfo}
            labelSettings={{ taskLabel: 'TaskName' }}
        />
    );
}
