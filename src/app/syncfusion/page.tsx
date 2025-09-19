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
    // Segments to split the bar (Assigned + Available + Leave in same row)
    Segments?: Array<{ StartDate: Date; Duration: number }>;
    // Parallel array to identify segment types for styling in queryTaskbarInfo
    SegmentKinds?: Array<'assigned' | 'available' | 'leave' | 'conflict'>;
    Comments?: string;
}

// Helper date utilities
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

// Subtract a list of [start,end) segments from one interval
function subtractSegmentsFromInterval(baseStart: Date, baseEnd: Date, segments: Array<{ start: Date; end: Date }>) {
    const es = baseStart.getTime();
    const ee = baseEnd.getTime();
    const sorted = [...segments]
        .filter(s => s.end.getTime() > es && s.start.getTime() < ee)
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    const result: Array<{ start: Date; end: Date }> = [];
    let cursor = es;

    for (const seg of sorted) {
        const ss = Math.max(es, seg.start.getTime());
        const se = Math.min(ee, seg.end.getTime());
        if (se <= ss) continue;
        if (ss > cursor) {
            result.push({ start: new Date(cursor), end: new Date(ss) });
        }
        cursor = Math.max(cursor, se);
    }
    if (cursor < ee) {
        result.push({ start: new Date(cursor), end: new Date(ee) });
    }

    return result;
}

// Merge overlapping intervals and clip to window
function mergeIntervals(intervals: Array<{ start: Date; end: Date }>, windowStart: Date, windowEnd: Date) {
    const sW = windowStart.getTime();
    const eW = windowEnd.getTime();
    const list = intervals
        .map(iv => ({ start: new Date(Math.max(iv.start.getTime(), sW)), end: new Date(Math.min(iv.end.getTime(), eW)) }))
        .filter(iv => iv.end.getTime() > iv.start.getTime())
        .sort((a, b) => a.start.getTime() - b.start.getTime());
    const out: Array<{ start: Date; end: Date }> = [];
    for (const iv of list) {
        if (!out.length) { out.push({ ...iv }); continue; }
        const last = out[out.length - 1];
        if (iv.start.getTime() <= last.end.getTime()) {
            if (iv.end.getTime() > last.end.getTime()) last.end = new Date(iv.end.getTime());
        } else {
            out.push({ ...iv });
        }
    }
    return out;
}

// POC: generate a leave window for a target employee similar to Bryntum implementation
function generatePOCLeaves(raw: PlanItem[], rangeStart: Date, rangeEnd: Date) {
    // Choose target employee: prefer id 96348 else first encountered
    let targetId: number | string | undefined;
    for (const item of raw) {
        if (item?.Summary === false) {
            if (String(item.EmployeeId ?? '') === '96348') { targetId = item.EmployeeId as any; break; }
            if (targetId == null) targetId = item.EmployeeId ?? item.Id;
        }
    }
    if (targetId == null) return new Map<string | number, Array<{ start: Date; end: Date }>>();

    // Create 2-month leave window starting 4 months after rangeStart
    const leaveStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 4, 1);
    const leaveEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 6, 0);
    leaveStart.setHours(0, 0, 0, 0);
    leaveEnd.setHours(23, 59, 59, 999);

    const s = new Date(Math.max(rangeStart.getTime(), leaveStart.getTime()));
    const e = new Date(Math.min(rangeEnd.getTime(), leaveEnd.getTime()));
    if (e <= s) return new Map<string | number, Array<{ start: Date; end: Date }>>();

    const map = new Map<string | number, Array<{ start: Date; end: Date }>>();
    map.set(targetId, [{ start: s, end: e }]);
    return map;
}

// Compute conflict segments per employee where overlapping assignments >= 2
function computeConflictSegmentsByEmployee(raw: PlanItem[], rangeStart: Date, rangeEnd: Date) {
    const byEmp = new Map<string | number, Array<{ start: Date; end: Date }>>();
    for (const item of raw) {
        if (item?.Summary === false) {
            const start = parseMSDate(item.RenderStartDate);
            const end = parseMSDate(item.RenderEndDate);
            if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) continue;
            const s = new Date(Math.max(rangeStart.getTime(), start.getTime()));
            const e = new Date(Math.min(rangeEnd.getTime(), end.getTime()));
            if (e <= s) continue;
            const key = (item.EmployeeId ?? item.Id) as any;
            const arr = byEmp.get(key) || [];
            arr.push({ start: s, end: e });
            byEmp.set(key, arr);
        }
    }

    const out = new Map<string | number, Array<{ start: Date; end: Date }>>();
    for (const [emp, list] of byEmp) {
        const points: Array<{ t: number; d: number }> = [];
        for (const iv of list) {
            points.push({ t: iv.start.getTime(), d: +1 });
            points.push({ t: iv.end.getTime(), d: -1 });
        }
        points.sort((a, b) => a.t === b.t ? b.d - a.d : a.t - b.t);
        let count = 0;
        let segStart: number | null = null;
        const segs: Array<{ start: Date; end: Date }> = [];
        for (const p of points) {
            const prev = count;
            count += p.d;
            if (prev < 2 && count >= 2) {
                segStart = p.t;
            } else if (prev >= 2 && count < 2) {
                if (segStart !== null && p.t > segStart) segs.push({ start: new Date(segStart), end: new Date(p.t) });
                segStart = null;
            }
        }
        out.set(emp, segs);
    }
    return out;
}

// Map flat assignments (no grouping). One row per plan item where Summary === false
function mapFlatAssignments(raw: PlanItem[], rangeStart: Date, rangeEnd: Date, leaveMap: Map<string | number, Array<{ start: Date; end: Date }>>, conflictMap: Map<string | number, Array<{ start: Date; end: Date }>>): MappedTask[] {
    const rows: MappedTask[] = [];

    // Pre-compute next assignment start date per item (by employee) [kept for potential future use]
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

    raw.forEach((item: PlanItem) => {
        if (item?.Summary === false) {
            const start = parseMSDate(item.RenderStartDate);
            const end = parseMSDate(item.RenderEndDate);
            if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return;

            // Clamp assigned to visible window
            const clampedAssignedStart = new Date(Math.max(start.getTime(), rangeStart.getTime()));
            const clampedAssignedEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
            if (clampedAssignedEnd.getTime() <= clampedAssignedStart.getTime()) return;

            const segments: Array<{ StartDate: Date; Duration: number }> = [];
            const kinds: Array<'assigned' | 'available' | 'leave' | 'conflict'> = [];

            // Build leave and conflict segments for this employee (may be empty)
            const lv = leaveMap.get(item.EmployeeId ?? item.Id) || [];
            const cf = conflictMap.get(item.EmployeeId ?? item.Id) || [];

            // 1) Assigned parts with leave and conflict subtracted
            const assignedParts = subtractSegmentsFromInterval(clampedAssignedStart, clampedAssignedEnd, [...lv, ...cf]);
            for (const p of assignedParts) {
                const dur = durationForGantt(p.start, p.end);
                segments.push({ StartDate: p.start, Duration: dur });
                kinds.push('assigned');
            }

            // 2) Conflict slices within the assigned window, excluding leave
            for (const seg of cf) {
                const ss = Math.max(seg.start.getTime(), clampedAssignedStart.getTime());
                const se = Math.min(seg.end.getTime(), clampedAssignedEnd.getTime());
                if (se > ss) {
                    const confWindow = { start: new Date(ss), end: new Date(se) };
                    const pureConf = subtractSegmentsFromInterval(confWindow.start, confWindow.end, lv);
                    for (const pc of pureConf) {
                        const dur = durationForGantt(pc.start, pc.end);
                        segments.push({ StartDate: pc.start, Duration: dur });
                        kinds.push('conflict');
                    }
                }
            }

            // 3) Leave slices within the assigned window
            for (const seg of lv) {
                const ss = Math.max(seg.start.getTime(), clampedAssignedStart.getTime());
                const se = Math.min(seg.end.getTime(), clampedAssignedEnd.getTime());
                if (se > ss) {
                    const sDate = new Date(ss);
                    const eDate = new Date(se);
                    const dur = durationForGantt(sDate, eDate);
                    segments.push({ StartDate: sDate, Duration: dur });
                    kinds.push('leave');
                }
            }

            // 4) Available after assigned end up to rangeEnd, excluding leave
            if (clampedAssignedEnd.getTime() < rangeEnd.getTime()) {
                const availWindowStart = addDays(clampedAssignedEnd, 1); // day after assigned
                const availWindowEnd = new Date(rangeEnd.getTime());
                if (availWindowEnd.getTime() >= availWindowStart.getTime()) {
                    const leaveAfterAssigned = lv
                        .filter(s => s.end.getTime() > availWindowStart.getTime())
                        .map(s => ({
                            start: new Date(Math.max(s.start.getTime(), availWindowStart.getTime())),
                            end: new Date(Math.min(s.end.getTime(), availWindowEnd.getTime()))
                        }))
                        .filter(s => s.end > s.start);
                    const availParts = subtractSegmentsFromInterval(availWindowStart, availWindowEnd, leaveAfterAssigned);
                    for (const p of availParts) {
                        const dur = durationForGantt(p.start, p.end);
                        segments.push({ StartDate: p.start, Duration: dur });
                        kinds.push('available');
                    }
                    // Also add leave slices in the available window (to render leave on the row)
                    for (const s of leaveAfterAssigned) {
                        const dur = durationForGantt(s.start, s.end);
                        segments.push({ StartDate: s.start, Duration: dur });
                        kinds.push('leave');
                    }
                }
            }

            // Sort segments by time to ensure stable ordering with kinds aligned
            const withKinds = segments.map((s, i) => ({ s, k: kinds[i] }));
            withKinds.sort((a, b) => a.s.StartDate.getTime() - b.s.StartDate.getTime());

            const sortedSegments = withKinds.map(x => x.s);
            const sortedKinds = withKinds.map(x => x.k);

            // Duration must cover all segments so split bars render
            const durationTotal = sortedSegments.length
                ? sortedSegments.reduce((sum, s) => sum + (s.Duration || 0), 0)
                : undefined;

            // Base task dates: start clamped to window; end must at least cover last segment or assigned end
            const lastSegEnd = (() => {
                let maxTime = clampedAssignedEnd.getTime();
                for (const seg of sortedSegments) {
                    const segEnd = addDays(seg.StartDate, seg.Duration); // end-exclusive; add Duration days
                    maxTime = Math.max(maxTime, segEnd.getTime());
                }
                return new Date(maxTime);
            })();

            rows.push({
                TaskID: item.Id,
                TaskName: item.Title,
                EmployeeName: item.EmployeeName,
                EmployeeId: item.EmployeeId,
                Designation: item.Designation,
                Grade: item.Grade,
                StartDate: clampedAssignedStart,
                EndDate: lastSegEnd,
                ProjectCode: item.ProjectCode,
                ProjectName: item.ProjectName,
                Department: item.Department,
                AvailableStart: sortedSegments.find((_, idx) => sortedKinds[idx] === 'available')?.StartDate ?? null,
                AvailableEnd: (() => {
                    const idx = sortedKinds.lastIndexOf('available');
                    if (idx >= 0) {
                        const s = sortedSegments[idx];
                        return addDays(s.StartDate, s.Duration);
                    }
                    return null;
                })(),
                Duration: durationTotal,
                Segments: sortedSegments.length ? sortedSegments : undefined,
                SegmentKinds: sortedKinds.length ? sortedKinds : undefined,
                Comments: item.Comments
            });
        }
    });
    return rows;
}

// NEW: Map to a single consolidated row per employee
function mapPerEmployeeRows(
    raw: PlanItem[],
    rangeStart: Date,
    rangeEnd: Date,
    leaveMap: Map<string | number, Array<{ start: Date; end: Date }>>,
    conflictMap: Map<string | number, Array<{ start: Date; end: Date }>>
): MappedTask[] {
    type Group = {
        key: string | number;
        employeeId?: number;
        employeeName?: string;
        designation?: string;
        grade?: string;
        items: PlanItem[];
    };

    const groups = new Map<string, Group>();
    for (const item of raw) {
        if (item?.Summary !== false) continue;
        const key = (item.EmployeeId != null ? `id:${item.EmployeeId}` : `name:${(item.EmployeeName ?? '').toLowerCase()}`);
        const g = groups.get(key) ?? {
            key,
            employeeId: item.EmployeeId,
            employeeName: item.EmployeeName,
            designation: item.Designation,
            grade: item.Grade,
            items: []
        };
        // Prefer non-empty identity fields from any item
        if (!g.employeeName && item.EmployeeName) g.employeeName = item.EmployeeName;
        if (!g.designation && item.Designation) g.designation = item.Designation;
        if (!g.grade && item.Grade) g.grade = item.Grade;
        g.items.push(item);
        groups.set(key, g);
    }

    const rows: MappedTask[] = [];

    for (const [, g] of groups) {
        // Collect and clamp all assignment intervals for employee
        const assignedIntervals: Array<{ start: Date; end: Date }> = [];
        for (const it of g.items) {
            const s = parseMSDate(it.RenderStartDate);
            const e = parseMSDate(it.RenderEndDate);
            if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) continue;
            const cs = new Date(Math.max(s.getTime(), rangeStart.getTime()));
            const ce = new Date(Math.min(e.getTime(), rangeEnd.getTime()));
            if (ce > cs) assignedIntervals.push({ start: cs, end: ce });
        }
        const assignedUnion = mergeIntervals(assignedIntervals, rangeStart, rangeEnd);

        // Leaves and conflicts, clamped
        const lvRaw = leaveMap.get(g.employeeId ?? g.key) || [];
        const cfRaw = conflictMap.get(g.employeeId ?? g.key) || [];
        const leaves = mergeIntervals(lvRaw, rangeStart, rangeEnd);
        const conflicts = mergeIntervals(cfRaw, rangeStart, rangeEnd);

        // Assigned minus leaves and conflicts
        const assignedPure: Array<{ start: Date; end: Date }> = [];
        for (const iv of assignedUnion) {
            const parts = subtractSegmentsFromInterval(iv.start, iv.end, [...leaves, ...conflicts]);
            assignedPure.push(...parts);
        }

        // Conflicts minus leaves
        const conflictPure: Array<{ start: Date; end: Date }> = [];
        for (const iv of conflicts) {
            const parts = subtractSegmentsFromInterval(iv.start, iv.end, leaves);
            conflictPure.push(...parts);
        }

        // Available = window minus (assignedUnion U leaves)
        const occupied = mergeIntervals([...assignedUnion, ...leaves], rangeStart, rangeEnd);
        const available = subtractSegmentsFromInterval(rangeStart, rangeEnd, occupied);

        // Build disjoint segments array with kinds
        type Kind = 'assigned' | 'available' | 'leave' | 'conflict';
        let segments: Array<{ StartDate: Date; Duration: number } > = [];
        let kinds: Kind[] = [];

        const pushSegments = (list: Array<{ start: Date; end: Date }>, kind: Kind) => {
            for (const p of list) {
                const dur = durationForGantt(p.start, p.end);
                if (dur <= 0) continue;
                segments.push({ StartDate: p.start, Duration: dur });
                kinds.push(kind);
            }
        };

        pushSegments(available, 'available');
        pushSegments(assignedPure, 'assigned');
        pushSegments(leaves, 'leave');
        pushSegments(conflictPure, 'conflict');

        // Sort and then merge adjacent segments of same kind
        const withKinds = segments.map((s, i) => ({ s, k: kinds[i] }));
        withKinds.sort((a, b) => a.s.StartDate.getTime() - b.s.StartDate.getTime());

        const merged: Array<{ s: { StartDate: Date; Duration: number }; k: Kind }> = [];
        for (const cur of withKinds) {
            if (!merged.length) { merged.push(cur); continue; }
            const last = merged[merged.length - 1];
            const lastEnd = addDays(last.s.StartDate, last.s.Duration).getTime();
            if (cur.k === last.k && cur.s.StartDate.getTime() === lastEnd) {
                // extend
                last.s.Duration += cur.s.Duration;
            } else {
                merged.push(cur);
            }
        }

        const finalSegments = merged.map(x => x.s);
        const finalKinds = merged.map(x => x.k);

        // Compute row duration and dates
        const durationTotal = finalSegments.reduce((sum, s) => sum + (s.Duration || 0), 0);
        const rowStart = finalSegments.length ? finalSegments[0].StartDate : rangeStart;
        const rowEnd = finalSegments.length ? addDays(finalSegments[finalSegments.length - 1].StartDate, finalSegments[finalSegments.length - 1].Duration) : rangeEnd;

        rows.push({
            TaskID: (g.employeeId != null ? g.employeeId : g.key),
            TaskName: g.employeeName || String(g.key),
            EmployeeName: g.employeeName || String(g.key),
            EmployeeId: g.employeeId as any,
            Designation: g.designation,
            Grade: g.grade,
            StartDate: rowStart,
            EndDate: rowEnd,
            Duration: durationTotal,
            Segments: finalSegments,
            SegmentKinds: finalKinds
        });
    }

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

// Color taskbar by segment kind and role
function onQueryTaskbarInfo(args: any) {
    const d = (args?.data?.taskData ?? args?.data) as MappedTask | undefined;
    const desig = d?.Designation?.toString().trim().toLowerCase();

    // Robust segment index detection for split tasks
    let segIndex: number | undefined = (args as any).segmentIndex ?? (args as any).segment?.index ?? (args as any).segmentIndexInternal;
    if (segIndex == null) {
        const el = args.taskbarElement as HTMLElement | null;
        const dsIdx = el?.dataset?.segmentIndex || el?.getAttribute?.('data-segment-index') || el?.getAttribute?.('data-seg-index');
        if (dsIdx != null) {
            const n = parseInt(String(dsIdx), 10);
            if (!isNaN(n)) segIndex = n;
        }
        if (segIndex == null && el?.parentElement) {
            const sibs = Array.from(el.parentElement.querySelectorAll('.e-taskbar')) as HTMLElement[];
            if (sibs.length > 1) segIndex = sibs.indexOf(el);
        }
    }

    const kind = (typeof segIndex === 'number' && segIndex >= 0) ? d?.SegmentKinds?.[segIndex] : undefined;

    if (kind === 'available') {
        args.taskbarBgColor = '#22c55e';
        args.taskbarBorderColor = '#16a34a';
        args.progressBarBgColor = '#16a34a';
        args.milestoneColor = '#22c55e';
        setTaskbarLabel(args.taskbarElement as HTMLElement | null, 'Available');
        return;
    }

    if (kind === 'leave') {
        args.taskbarBgColor = '#f59e0b';
        args.taskbarBorderColor = '#b45309';
        args.progressBarBgColor = '#d97706';
        args.milestoneColor = '#f59e0b';
        setTaskbarLabel(args.taskbarElement as HTMLElement | null, 'Leave');
        return;
    }

    if (kind === 'conflict') {
        // Apply a striped red conflict style via element since color props don't support gradients
        const el = args.taskbarElement as HTMLElement | null;
        if (el) {
            el.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(239,68,68,0.95) 0 10px, rgba(220,38,38,0.95) 10px 20px)';
            el.style.color = '#ffffff';
        }
        args.taskbarBgColor = '#ef4444';
        args.taskbarBorderColor = '#991b1b';
        args.progressBarBgColor = '#dc2626';
        args.milestoneColor = '#ef4444';
        setTaskbarLabel(args.taskbarElement as HTMLElement | null, 'Conflict');
        return;
    }

    // Default to assigned
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

    const raw = (data as any).Data as PlanItem[];
    // POC leaves map (by employee)
    const leaveMap = generatePOCLeaves(raw, rangeStart, rangeEnd);
    // Conflicts map (by employee)
    const conflictMap = computeConflictSegmentsByEmployee(raw, rangeStart, rangeEnd);

    // Flat, non-grouped data source consolidated to one row per employee with disjoint segments
    const dataSource: MappedTask[] = mapPerEmployeeRows(raw, rangeStart, rangeEnd, leaveMap, conflictMap);

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
