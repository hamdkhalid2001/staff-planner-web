"use client";
import { GanttComponent } from '@syncfusion/ej2-react-gantt';
import { data } from '../poc/shared-plans';

// Utility to convert MS JSON date string to JS Date
function parseMSDate(msDate: string): Date | null {
    if (!msDate) return null;
    const match = /\/Date\((\d+)\)\//.exec(msDate);
    return match ? new Date(Number(match[1])) : null;
}

// Generate a deterministic dummy photo URL (DiceBear) from a seed
function getDummyPhotoUrl(seed: string): string {
    const s = encodeURIComponent((seed || '').toString());
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${s}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50&size=64`;
}

// Types for plan data and mapped tasks
interface PlanItem {
    Id: string | number;
    Title: string;
    EmployeeName?: string;
    EmployeeId?: number;
    Summary?: boolean;
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
    EmployeeName?: string;
    EmployeeId?: number;
    Designation?: string;
    Grade?: string;
    StartDate: Date | null;
    EndDate: Date | null;
    ProjectCode?: string;
    ProjectName?: string;
    Department?: string;
    AvailableStart?: Date | null;
    AvailableEnd?: Date | null;
    Comments?: string;
}

// Map flat assignments (no grouping). One row per plan item where Summary === false
function mapFlatAssignments(raw: PlanItem[]): MappedTask[] {
    const rows: MappedTask[] = [];
    raw.forEach((item: PlanItem) => {
        if (item?.Summary === false) {
            const start = parseMSDate(item.RenderStartDate);
            const end = parseMSDate(item.RenderEndDate);
            // Simple example availability window after task end (placeholder for parity)
            const availableStart = end ? new Date(end.getTime() + 24 * 60 * 60 * 1000) : null;
            const availableEnd = end ? new Date(end.getTime() + 8 * 24 * 60 * 60 * 1000) : null;
            rows.push({
                TaskID: item.Id,
                TaskName: item.Title,
                EmployeeName: item.EmployeeName,
                EmployeeId: item.EmployeeId,
                Designation: item.Designation,
                Grade: item.Grade,
                StartDate: start,
                EndDate: end,
                ProjectCode: item.ProjectCode,
                ProjectName: item.ProjectName,
                Department: item.Department,
                AvailableStart: availableStart,
                AvailableEnd: availableEnd,
                Comments: item.Comments
            });
        }
    });
    return rows;
}

// Color taskbar red for tasks with Designation === 'Stores Clerk' or 'Quantity Surveyor'
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
        // Fallback to DOM if needed (older builds)
        const labelEl = (args.taskbarElement as HTMLElement | null)?.querySelector('.e-task-label') as HTMLElement | null;
        if (labelEl) {
            labelEl.textContent = 'Assigned';
            labelEl.style.color = '#ffffff';
            labelEl.style.textAlign = 'center';
        }
    }
    const labelEl = (args.taskbarElement as HTMLElement | null)?.querySelector('.e-task-label') as HTMLElement | null;
    if (labelEl) {
        labelEl.textContent = 'Assigned';
        labelEl.style.color = '#ffffff';
        labelEl.style.textAlign = 'center';
    }
    (args as any).taskbarText = 'Assigned';
}

export default function SyncfusionPage() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    // Flat, non-grouped data source
    const dataSource: MappedTask[] = mapFlatAssignments((data as any).Data as PlanItem[]);

    const taskSettings = {
        id: 'TaskID',
        name: 'EmployeeName', // show employee in tree column
        startDate: 'StartDate',
        grade: 'Grade',
        designation: 'Designation',
        projectName: 'ProjectName',
        endDate: 'EndDate'
    } as const;

    // Single combined column: avatar + bold name, second line with designation and grade
    const columns: any[] = [
        {
            headerText: 'Employee',
            width: 360,
            template: (props: MappedTask) => {
                const raw: any = props as any;
                const name: string = raw.EmployeeName ?? raw.taskData?.EmployeeName ?? raw.TaskName ?? raw.taskData?.TaskName ?? '(Unknown)';
                const designation: string | undefined = raw.Designation ?? raw.taskData?.Designation ?? raw.ganttProperties?.taskData?.Designation ?? raw.ganttProperties?.Designation;
                const grade: string | undefined = raw.Grade ?? raw.taskData?.Grade ?? raw.ganttProperties?.taskData?.Grade ?? raw.ganttProperties?.Grade;
                const seed = name || String(raw.EmployeeId ?? raw.taskData?.EmployeeId ?? raw.TaskID);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                            alt={name || 'avatar'}
                            src={getDummyPhotoUrl(seed)}
                            style={{ width: 32, height: 32, borderRadius: 9999, display: 'block' }}
                        />
                        <div style={{ lineHeight: 1.2 }}>
                            <div style={{ fontWeight: 600 }}>{name}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                {(designation ?? '-')}{grade ? ` • ${grade}` : ''}
                            </div>
                        </div>
                    </div>
                );
            }
        }
    ];

    return (
        <GanttComponent
            dataSource={dataSource}
            treeColumnIndex={0} // only one grid column
            taskFields={taskSettings}
            columns={columns}
            splitterSettings={{ columnIndex: 0, position: '420px' }}
            timelineSettings={{
                timelineViewMode: 'Month',
                topTier: { unit: 'Year', format: 'yyyy' },
                bottomTier: { unit: 'Month', format: 'MMM' }
            }}
            projectStartDate={startDate}
            taskbarHeight={30}
            rowHeight={48}
            queryTaskbarInfo={onQueryTaskbarInfo}
            labelSettings={{ taskLabel: 'TaskName' }}
        />
    );
}
