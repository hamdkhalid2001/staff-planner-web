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
    // Total duration in days (required for segmented tasks)
    Duration?: number;
    // Segments to split the bar (Assigned + Available in same row)
    Segments?: Array<{ StartDate: Date; Duration: number }>;
    Comments?: string;
}

// Map flat assignments (no grouping). One row per plan item where Summary === false
function mapFlatAssignments(raw: PlanItem[], rangeStart: Date, rangeEnd: Date): MappedTask[] {
    const rows: MappedTask[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;

    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const daysInclusive = (from: Date, to: Date) => {
        const a = startOfDay(from);
        const b = startOfDay(to);
        const diff = Math.floor((b.getTime() - a.getTime()) / DAY_MS) + 1;
        return Math.max(1, diff);
    };
    // Syncfusion Gantt interprets Duration as end-exclusive; make bars end on the given date
    const durationForGantt = (from: Date, to: Date) => {
        const inc = daysInclusive(from, to);
        return inc > 1 ? inc - 1 : 1; // single-day stays 1, multi-day subtract 1 so end = last day
    };

    // Pre-compute next assignment start date per item (by employee)
    type Enriched = { item: PlanItem; start: Date; end: Date };
    const byEmp: Record<string, Enriched[]> = {};

    for (const item of raw) {
        if (item?.Summary === false) {
            const start = parseMSDate(item.RenderStartDate);
            const end = parseMSDate(item.RenderEndDate);
            if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) continue;
            const key = (item.EmployeeId != null
                ? `id:${item.EmployeeId}`
                : `name:${(item.EmployeeName ?? '').toLowerCase()}`);
            (byEmp[key] ||= []).push({ item, start, end });
        }
    }

    const nextStartMap = new Map<string | number, Date>();
    Object.values(byEmp).forEach(list => {
        list.sort((a, b) => a.start.getTime() - b.start.getTime());
        for (let i = 0; i < list.length; i++) {
            const cur = list[i];
            let next: Date | undefined;
            for (let j = i + 1; j < list.length; j++) {
                if (list[j].start.getTime() > cur.end.getTime()) {
                    next = list[j].start; break;
                }
            }
            if (next) nextStartMap.set(cur.item.Id, next);
        }
    });

    raw.forEach((item: PlanItem) => {
        if (item?.Summary === false) {
            const start = parseMSDate(item.RenderStartDate);
            const end = parseMSDate(item.RenderEndDate);

            const segments: Array<{ StartDate: Date; Duration: number }> = [];
            let availableStart: Date | null = null;
            let availableEnd: Date | null = null;
            // Track assigned-only duration
            let assignedDurationDays: number | undefined = undefined;

            if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                // Clamp assigned to visible window
                const clampedAssignedStart = new Date(Math.max(start.getTime(), rangeStart.getTime()));
                const clampedAssignedEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));

                if (clampedAssignedEnd.getTime() > clampedAssignedStart.getTime()) {
                    const durDays = durationForGantt(clampedAssignedStart, clampedAssignedEnd);
                    segments.push({ StartDate: clampedAssignedStart, Duration: durDays });
                    // Duration should reflect assigned-only
                    assignedDurationDays = durDays;
                }

                // Compute availability after clamped assigned end, within window
                if (clampedAssignedEnd.getTime() < rangeEnd.getTime()) {
                    const afterAssigned = addDays(clampedAssignedEnd, 1); // day after assigned
                    // Always extend Available to the end of the visible window
                    const candidateEnd = rangeEnd;
                    // Clamp available bounds to window as well
                    const clampedAvailStart = new Date(Math.max(afterAssigned.getTime(), rangeStart.getTime()));
                    const clampedAvailEnd = new Date(rangeEnd.getTime());
                    if (clampedAvailEnd.getTime() >= clampedAvailStart.getTime()) {
                        availableStart = clampedAvailStart;
                        availableEnd = clampedAvailEnd;
                        const durAvail = durationForGantt(availableStart, availableEnd);
                        // Removed total (assigned + available) duration logging to avoid confusion
                        segments.push({ StartDate: availableStart, Duration: durAvail });
                    } else {
                        availableStart = null;
                        availableEnd = null;
                    }
                }
            }

            // Duration must cover all segments so split bars render. Keep assigned-only in variable if needed.
            const durationTotal = segments.length
                ? segments.reduce((sum, s) => sum + (s.Duration || 0), 0)
                : undefined;

            // Base task dates: start clamped to window; end must at least cover last segment
            const baseStart = (start && !isNaN(start.getTime())) ? new Date(Math.max(start.getTime(), rangeStart.getTime())) : start;
            const baseEnd = availableEnd
                ? new Date(rangeEnd.getTime())
                : ((end && !isNaN(end.getTime())) ? new Date(Math.min(end.getTime(), rangeEnd.getTime())) : end);

            rows.push({
                TaskID: item.Id,
                TaskName: item.Title,
                EmployeeName: item.EmployeeName,
                EmployeeId: item.EmployeeId,
                Designation: item.Designation,
                Grade: item.Grade,
                StartDate: baseStart,
                EndDate: baseEnd,
                ProjectCode: item.ProjectCode,
                ProjectName: item.ProjectName,
                Department: item.Department,
                AvailableStart: availableStart,
                AvailableEnd: availableEnd,
                Duration: durationTotal,
                Segments: segments.length ? segments : undefined,
                Comments: item.Comments
            });
        }
    });
    return rows;
}

// Utility to ensure a visible centered label inside a taskbar element
function setTaskbarLabel(taskbarEl: HTMLElement | null, text: string) {
    if (!taskbarEl) return;
    // Use a unique class to avoid conflicts with Syncfusion's internal label
    let label = taskbarEl.querySelector('.copilot-task-label') as HTMLElement | null;
    if (!label) {
        label = document.createElement('span');
        label.className = 'copilot-task-label';
        // Center the label over the bar
        label.style.position = 'absolute';
        label.style.left = '0';
        label.style.right = '0';
        label.style.top = '50%';
        label.style.transform = 'translateY(-50%)';
        label.style.textAlign = 'center';
        label.style.pointerEvents = 'none';
        label.style.whiteSpace = 'nowrap';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.fontSize = '12px';
        label.style.zIndex = '5';
        // Ensure parent can contain absolutely positioned child
        if (!taskbarEl.style.position) taskbarEl.style.position = 'relative';
        taskbarEl.appendChild(label);
    }
    label.textContent = text;
    label.style.color = '#ffffff';
}

// Color taskbar red for tasks with Designation === 'Stores Clerk' or 'Quantity Surveyor'
function onQueryTaskbarInfo(args: any) {
    const d = (args?.data?.taskData ?? args?.data) as MappedTask | undefined;
    const desig = d?.Designation?.toString().trim().toLowerCase();

    // Robust segment index detection for split tasks
    let segIndex: number | undefined = (args as any).segmentIndex ?? (args as any).segment?.index ?? (args as any).segmentIndexInternal;
    if (segIndex == null) {
        const el = args.taskbarElement as HTMLElement | null;
        // Try dataset attributes used by Syncfusion internals in some builds
        const dsIdx = el?.dataset?.segmentIndex || el?.getAttribute?.('data-segment-index') || el?.getAttribute?.('data-seg-index');
        if (dsIdx != null) {
            const n = parseInt(String(dsIdx), 10);
            if (!isNaN(n)) segIndex = n;
        }
        // Fallback heuristic: if multiple taskbar-like siblings exist, later one is the next segment
        if (segIndex == null && el?.parentElement) {
            const sibs = Array.from(el.parentElement.querySelectorAll('.e-taskbar')) as HTMLElement[];
            if (sibs.length > 1) segIndex = sibs.indexOf(el);
        }
    }

    // Treat any segment with index > 0 as the Available segment
    const isAvailableSegment = typeof segIndex === 'number' && segIndex > 0;

    if (isAvailableSegment) {
        // Always style Available segment green and label as 'Available'
        args.taskbarBgColor = '#22c55e';
        args.taskbarBorderColor = '#16a34a';
        args.progressBarBgColor = '#16a34a';
        args.milestoneColor = '#22c55e';
        setTaskbarLabel(args.taskbarElement as HTMLElement | null, 'Available');
        return;
    }

    // Assigned segment styling
    if (desig === 'stores clerk' || desig === 'quantity surveyor') {
        args.taskbarBgColor = '#ef4444';
        args.taskbarBorderColor = '#b91c1c';
        args.progressBarBgColor = '#dc2626';
        args.milestoneColor = '#ef4444';
    }
    setTaskbarLabel(args.taskbarElement as HTMLElement | null, 'Assigned');
}

export default function SyncfusionPage() {
    const now = new Date();
    // Scale: start from current month, cover next 3 years (36 months)
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const endAnchor = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 36, 1); // first day after the 36-month window
    const rangeEnd = new Date(endAnchor.getTime() - 24 * 60 * 60 * 1000); // last day within the 36-month window

    // Flat, non-grouped data source
    const dataSource: MappedTask[] = mapFlatAssignments((data as any).Data as PlanItem[], rangeStart, rangeEnd);

    const taskSettings = {
        id: 'TaskID',
        name: 'EmployeeName', // show employee in tree column
        startDate: 'StartDate',
        grade: 'Grade',
        designation: 'Designation',
        projectName: 'ProjectName',
        endDate: 'EndDate',
        duration: 'Duration',
        // Map segments so split task bars render on the same row
        segments: 'Segments'
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
        <>
            {/* Hide Syncfusion's built-in task label to avoid duplicate text */}
            <style>{`.e-gantt .e-task-label{ display:none !important; }`}</style>
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
                projectStartDate={rangeStart}
                projectEndDate={rangeEnd}
                taskbarHeight={30}
                rowHeight={48}
                queryTaskbarInfo={onQueryTaskbarInfo}
                workWeek={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']}
            />
        </>
    );
}
