"use client";
import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
// Bryntum styles (requires @bryntum/scheduler to be installed)
import '@bryntum/scheduler/scheduler.stockholm.css';
import { data } from '../poc/shared-plans';

// Dynamically import Bryntum React wrapper (client-only)
const BryntumScheduler: any = dynamic(
  () => import('@bryntum/scheduler-react').then(m => (m as any).BryntumScheduler || (m as any).Scheduler),
  { ssr: false, loading: () => <div>Loading Scheduler…</div> }
);

// Utility to convert MS JSON date string to JS Date
function parseMSDate(msDate: string): Date | null {
  if (!msDate) return null;
  const match = /\/Date\((\d+)\)\//.exec(msDate);
  return match ? new Date(Number(match[1])) : null;
}

// Types (kept similar to Syncfusion page)
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

// Build flat list of unique users (rows) from Summary:false items
function toFlatUsers(raw: PlanItem[]) {
  const seen = new Set<string>();
  const resources: Array<{ id: string; name: string; designation?: string; grade?: string }> = [];

  raw.forEach(item => {
    if (item?.Summary === false) {
      const id = String(item.EmployeeId ?? item.Id);
      if (!seen.has(id)) {
        seen.add(id);
        resources.push({
          id,
          name: item.EmployeeName || item.Title,
          designation: item.Designation,
          grade: item.Grade
        });
      }
    }
  });

  return resources;
}

// Build events from Summary:false items, one event per plan row
function toUserEvents(raw: PlanItem[]) {
  const events: Array<{
    id: string;
    resourceId: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    designation?: string;
    grade?: string;
  }> = [];

  raw.forEach(item => {
    if (item?.Summary === false) {
      const resourceId = String(item.EmployeeId ?? item.Id);
      events.push({
        id: `e_${item.Id}`,
        resourceId,
        name: item.Title || 'Assigned',
        startDate: parseMSDate(item.RenderStartDate),
        endDate: parseMSDate(item.RenderEndDate),
        designation: item.Designation,
        grade: item.Grade
      });
    }
  });

  return events;
}

// Pick a pleasant, modern color style for events based on designation
function getPrettyEventStyle(designation: string): string {
  const key = (designation || '').trim().toLowerCase();

  // Special mappings for known roles
  const special: Record<string, { bg: string; border: string; text: string }> = {
    'stores clerk': { bg: '#0ea5a1', border: '#0f766e', text: '#ffffff' }, // teal
    'quantity surveyor': { bg: '#6366f1', border: '#d97706', text: '#ffffff' } // amber
  };
  if (special[key]) {
    const s = special[key];
    return `background-color:${s.bg};border-color:${s.border};color:${s.text};`;
  }

  // Fallback palette (indigo, emerald, cyan, violet, rose, sky)
  const palette: Array<{ bg: string; border: string; text: string }> = [
    { bg: '#6366f1', border: '#4338ca', text: '#ffffff' }, // indigo
    { bg: '#10b981', border: '#047857', text: '#ffffff' }, // emerald
    { bg: '#06b6d4', border: '#0e7490', text: '#ffffff' }, // cyan
    { bg: '#8b5cf6', border: '#6d28d9', text: '#ffffff' }, // violet
    { bg: '#f43f5e', border: '#be123c', text: '#ffffff' }, // rose
    { bg: '#38bdf8', border: '#0284c7', text: '#ffffff' }  // sky
  ];

  // Simple deterministic hash to pick a color based on the designation
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum = (sum + key.charCodeAt(i)) >>> 0;
  const pick = palette[sum % palette.length];
  return `background-color:${pick.bg};border-color:${pick.border};color:${pick.text};`;
}

// Generate a deterministic dummy photo URL (DiceBear) from a seed
function getDummyPhotoUrl(seed: string): string {
  const s = encodeURIComponent((seed || '').toString());
  // Adventurer style with soft backgrounds, rounded, fixed size for crispness
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${s}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50&size=64`;
}

// Compute per-resource available ranges (gaps) between assigned events within the scheduler range
function computeAvailableRanges(
  resources: Array<{ id: string }>,
  events: Array<{ resourceId: string; startDate: Date | null; endDate: Date | null }>,
  rangeStart: Date,
  rangeEnd: Date
) {
  const byRes = new Map<string, Array<{ start: Date; end: Date }>>();

  // Collect and clamp busy intervals per resource
  for (const ev of events) {
    if (!ev.startDate || !ev.endDate) continue;
    const s = new Date(Math.max(rangeStart.getTime(), ev.startDate.getTime()));
    const e = new Date(Math.min(rangeEnd.getTime(), ev.endDate.getTime()));
    if (e <= s) continue;
    const arr = byRes.get(ev.resourceId) || [];
    arr.push({ start: s, end: e });
    byRes.set(ev.resourceId, arr);
  }

  const ranges: Array<{ id: string; resourceId: string; startDate: Date; endDate: Date; name: string; cls: string; style?: string }> = [];

  // Only consider available gaps strictly greater than 1 week
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  for (const res of resources) {
    const intervals = (byRes.get(res.id) || []).sort((a, b) => a.start.getTime() - b.start.getTime());

    // Merge overlaps
    const merged: Array<{ start: Date; end: Date }> = [];
    for (const iv of intervals) {
      const last = merged[merged.length - 1];
      if (last && iv.start.getTime() <= last.end.getTime()) {
        if (iv.end.getTime() > last.end.getTime()) last.end = iv.end;
      } else {
        merged.push({ start: iv.start, end: iv.end });
      }
    }

    // Compute complements as available ranges
    let cursor = new Date(rangeStart);
    for (const iv of merged) {
      if (iv.start.getTime() > cursor.getTime()) {
        const gapStart = new Date(cursor);
        const gapEnd = new Date(iv.start);
        if (gapEnd.getTime() - gapStart.getTime() > WEEK_MS) {
          ranges.push({
            id: `avail_${res.id}_${gapStart.getTime()}_${gapEnd.getTime()}`,
            resourceId: res.id,
            startDate: gapStart,
            endDate: gapEnd,
            name: 'Available',
            cls: 'available-range',
            style: 'background-color: rgba(16,185,129,0.18); border: 1px solid rgba(22,163,74,0.35); border-radius: 6px;'
          });
        }
      }
      if (iv.end.getTime() > cursor.getTime()) cursor = new Date(iv.end);
    }
    if (cursor.getTime() < rangeEnd.getTime()) {
      const gapStart = new Date(cursor);
      const gapEnd = new Date(rangeEnd);
      if (gapEnd.getTime() - gapStart.getTime() > WEEK_MS) {
        ranges.push({
          id: `avail_${res.id}_${gapStart.getTime()}_${gapEnd.getTime()}`,
          resourceId: res.id,
          startDate: gapStart,
          endDate: gapEnd,
          name: 'Available',
          cls: 'available-range',
          style: 'background-color: rgba(16,185,129,0.18); border: 1px solid rgba(22,163,74,0.35); border-radius: 6px;'
        });
      }
    }
  }

  return ranges;
}

// Compute conflict union segments per resource where active assignments >= 2
function computeConflictSegmentsByResource(events: Array<{ id: string; resourceId: string; startDate: Date | null; endDate: Date | null }>) {
  const map = new Map<string, Array<{ start: Date; end: Date }>>();
  const byRes = new Map<string, Array<{ start: Date; end: Date }>>();

  for (const ev of events) {
    if (!ev.startDate || !ev.endDate) continue;
    const arr = byRes.get(ev.resourceId) || [];
    arr.push({ start: ev.startDate, end: ev.endDate });
    byRes.set(ev.resourceId, arr);
  }

  for (const [resId, list] of byRes) {
    const points: Array<{ t: number; d: number }> = [];
    for (const iv of list) {
      points.push({ t: iv.start.getTime(), d: +1 });
      points.push({ t: iv.end.getTime(), d: -1 });
    }
    points.sort((a, b) => a.t === b.t ? b.d - a.d : a.t - b.t); // starts (+1) before ends (-1) on same time

    let count = 0;
    let segStart: number | null = null;
    const segments: Array<{ start: Date; end: Date }> = [];

    for (const p of points) {
      const prev = count;
      count += p.d;
      if (prev < 2 && count >= 2) {
        segStart = p.t;
      } else if (prev >= 2 && count < 2) {
        if (segStart !== null && p.t > segStart) {
          segments.push({ start: new Date(segStart), end: new Date(p.t) });
        }
        segStart = null;
      }
    }

    map.set(resId, segments);
  }

  return map;
}

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

export default function BryntumSchedulerPage() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear() + 1, now.getMonth(), 1);

  const resources = useMemo(() => toFlatUsers((data as any).Data as PlanItem[]), []);
  const baseAssignedEvents = useMemo(() => toUserEvents((data as any).Data as PlanItem[]), []);

  // Compute conflict segments per resource based on base assigned events
  const conflictSegmentsByRes = useMemo(
    () => computeConflictSegmentsByResource(baseAssignedEvents as any),
    [baseAssignedEvents]
  );

  // Build standalone Conflict events per resource from conflict segments
  const conflictEvents = useMemo(() => {
    const out: any[] = [];
    for (const [resId, segs] of conflictSegmentsByRes) {
      segs.forEach((seg, idx) => {
        out.push({
          id: `conf_${resId}_${seg.start.getTime()}_${seg.end.getTime()}_${idx}`,
          resourceId: resId,
          name: 'Conflict',
          startDate: seg.start,
          endDate: seg.end,
          conflict: true,
          cls: 'conflict-event',
          draggable: false,
          resizable: false
        });
      });
    }
    return out;
  }, [conflictSegmentsByRes]);

  // Split assigned events by subtracting conflict segments per resource
  const splitAssignedEvents = useMemo(() => {
    const out: any[] = [];
    for (const ev of baseAssignedEvents as any[]) {
      if (!ev.startDate || !ev.endDate) continue;
      const segs = conflictSegmentsByRes.get(ev.resourceId) || [];
      const parts = subtractSegmentsFromInterval(ev.startDate, ev.endDate, segs);
      if (!parts.length) continue; // fully overlapped -> represented as conflicts only
      parts.forEach((p, idx) => {
        out.push({
          ...ev,
          id: `${ev.id}_part_${p.start.getTime()}_${p.end.getTime()}_${idx}`,
          startDate: p.start,
          endDate: p.end,
          // explicitly not a conflict
          conflict: false,
          cls: (ev.cls || '').replace(/\bconflict-event\b/g, '').trim()
        });
      });
    }
    return out;
  }, [baseAssignedEvents, conflictSegmentsByRes]);

  // Use split assigned + conflicts to compute availability
  const busyForAvailability = useMemo(
    () => [...splitAssignedEvents, ...conflictEvents],
    [splitAssignedEvents, conflictEvents]
  );

  const availableRanges = useMemo(
    () => computeAvailableRanges(resources, busyForAvailability as any, startDate, endDate),
    [resources, busyForAvailability, startDate, endDate]
  );

  // Build non-interactive "Available" events from the computed gaps
  const availableEvents = useMemo(() =>
    availableRanges.map(r => ({
      id: `av_${r.id}`,
      resourceId: r.resourceId,
      name: 'Available',
      startDate: r.startDate as Date,
      endDate: r.endDate as Date,
      available: true,
      cls: 'available-event',
      draggable: false,
      resizable: false
    })),
  [availableRanges]);

  // POC: add a single Leave bar for the first resource
  const leaveEvents = useMemo(() => {
    if (!resources.length) return [] as any[];
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Try to find the specific employee id from sample (96348). Fallback to the first resource.
    const target = resources.find(r => String(r.id) === '96348') || resources[0];

    // Show a clear 2-month leave window within the current scheduler range for visibility
    const leaveStart = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1); // first day of next month
    const leaveEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0);   // last day of the month after next
    leaveStart.setHours(0, 0, 0, 0);
    leaveEnd.setHours(23, 59, 59, 999);

    // Clamp to the scheduler visible range just in case
    const s = new Date(Math.max(startDate.getTime(), leaveStart.getTime()));
    const e = new Date(Math.min(endDate.getTime(), leaveEnd.getTime()));

    if (e <= s) return [] as any[];

    return [{
      id: `leave_${target.id}_${s.getTime()}`,
      resourceId: target.id,
      name: 'Leave',
      startDate: s,
      endDate: e,
      leave: true,
      cls: 'leave-event',
      draggable: false,
      resizable: false
    }] as any[];
  }, [resources, startDate, endDate]);

  const allEvents = useMemo(
    () => [...(splitAssignedEvents as any), ...conflictEvents, ...availableEvents, ...leaveEvents],
    [splitAssignedEvents, conflictEvents, availableEvents, leaveEvents]
  );

  // Color and label bars. Conflict is separate event now.
  const eventRenderer = ({ eventRecord, renderData }: any) => {
    const cls = String(eventRecord?.cls || '');

    const isLeave = eventRecord?.leave === true || /(^|\s)leave-event(\s|$)/.test(cls);
    if (isLeave) {
      renderData.style = 'background-color:#f59e0b; border: 1px solid #b45309; color:#ffffff; text-shadow:0 1px 1px rgba(0,0,0,0.35);';
      return eventRecord?.name || 'Leave';
    }

    const isAvailable = eventRecord?.available === true || /(^|\s)available-event(\s|$)/.test(cls);
    if (isAvailable) {
      renderData.style = 'background-color: rgba(16,185,129,0.18); border: 1px solid rgba(22,163,74,0.35); color:#065f46;';
      return eventRecord?.name || 'Available';
    }

    const isConflict = eventRecord?.conflict === true || /(^|\s)conflict-event(\s|$)/.test(cls);
    if (isConflict) {
      renderData.style = 'background-image: repeating-linear-gradient(45deg, rgba(239,68,68,0.95) 0 10px, rgba(220,38,38,0.95) 10px 20px); color:#ffffff; text-shadow:0 1px 1px rgba(0,0,0,0.35);';
      return 'Conflict';
    }

    // Assigned event
    const desig = (eventRecord?.designation ?? '').toString();
    renderData.style = getPrettyEventStyle(desig);
    return 'Assigned';
  };

  return (
    <div style={{ height: 'calc(100vh - 16px)' }}
         onContextMenu={(e) => {
           const target = e.target as HTMLElement;
           if (target.closest('.b-scheduler, .b-grid')) {
             e.preventDefault();
           }
         }}>
      <BryntumScheduler
        startDate={startDate}
        endDate={endDate}
        viewPreset="monthAndYear"
        barMargin={15}
        rowHeight={68}
        barHeight={30}
        eventLayout="overlap"
        selectionMode={{ row: false, cell: false }}
        subGridConfigs={{
          locked: { width: 340 }
        }}
        features={{
          cellMenu: false,
          rowMenu: false,
          headerMenu: false,
          eventMenu: false,
          scheduleMenu: false,
          timeAxisHeaderMenu: false,
          eventCopyPaste: false,
          eventDrag: false,
          eventResize: false,
          eventEdit: false,
          resourceTimeRanges: false
        }}
        // resourceTimeRangeStore removed in favor of event-based available bars
        onBeforeCellMenuShow={() => false}
        onBeforeRowMenuShow={() => false}
        onBeforeHeaderMenuShow={() => false}
        onBeforeEventMenuShow={() => false}
        onBeforeScheduleMenuShow={() => false}
        onBeforeTimeAxisHeaderMenuShow={() => false}
        columns={[{
          text: 'Employees',
          field: 'name',
          width: 340,
          // Add a class to the left column cells so we can scope padding nicely
          cellCls: 'emp-col-cell',
          renderer: ({ record }: any) => {
            const name = record?.name ?? '';
            const seed = record?.id || name;
            const photoUrl = getDummyPhotoUrl(seed);

            return {
              className: 'emp-cell',
              children: [
                { tag: 'div', className: 'emp-avatar', children: [
                  { tag: 'img', className: 'emp-avatar-img', src: photoUrl, alt: name }
                ]},
                { tag: 'div', className: 'emp-meta', children: [
                  { tag: 'div', className: 'emp-name', text: name },
                  { tag: 'div', className: 'emp-desig', text: record?.designation ?? '—' },
                  { tag: 'div', className: 'emp-grade', text: record?.grade ?? '—' }
                ]}
              ]
            };
          }
        }]}
        // Flat list of users as resources
        resources={resources}
        // Assigned + Conflict + Available + Leave events
        events={allEvents}
        eventRenderer={eventRenderer}
      />

      <style jsx global>{`
        /* Available as event (non-interactive) */
        .available-event,
        .available-event .b-sch-event-content {
          pointer-events: none !important;
        }
        .available-event {
          background-color: rgba(16, 185, 129, 0.18) !important;
          border: 1px solid rgba(22, 163, 74, 0.35) !important;
          color: #065f46 !important;
          height: 100% !important; /* match wrapper height (barHeight) */
          box-sizing: border-box;   /* include border in height */
        }
        
        /* Available ranges (kept for reference, unused now) */
        .b-sch-resourcetimerange.available-range,
        .available-range {
          background-color: rgba(16, 185, 129, 0.18) !important; /* emerald-500 @ 18% */
          border: 1px solid rgba(22, 163, 74, 0.35) !important;   /* emerald-600 */
          border-radius: 6px;
          pointer-events: none; /* non-interactive */
        }
        .b-sch-resourcetimerange.available-range .b-sch-timerange-label { color: #065f46; font-weight: 600; font-size: 11px; }
        
        /* As a last resort, hide any Bryntum menu if created */
        .b-menu {
          display: none !important;
        }

        /* Slimmer splitter between left grid and timeline */
        .b-scheduler .b-grid-splitter,
        .b-scheduler .b-splitter {
          width: 6px !important;
          min-width: 6px !important;
          background-color: #e5e7eb !important; /* gray-200 */
          border: none !important;
        }
        .b-scheduler .b-grid-splitter .b-splitter-grip,
        .b-scheduler .b-splitter .b-splitter-grip {
          display: none !important;
        }

        /* Slimmer scrollbars (slider) */
        .b-scheduler ::-webkit-scrollbar,
        .b-grid ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .b-scheduler ::-webkit-scrollbar-thumb,
        .b-grid ::-webkit-scrollbar-thumb {
          background-color: #cbd5e1; /* slate-300 */
          border-radius: 6px;
        }
        .b-scheduler ::-webkit-scrollbar-thumb:hover,
        .b-grid ::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8; /* slate-400 */
        }
        .b-scheduler ::-webkit-scrollbar-track,
        .b-grid ::-webkit-scrollbar-track {
          background: transparent;
        }
        .b-scheduler,
        .b-grid {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: #cbd5e1 transparent; /* Firefox */
        }

        /* Tighter padding only for the left Employees column */
        .b-grid-cell.emp-col-cell {
          padding-top: 10px !important;
          padding-bottom: 10px !important;
          padding-left: 12px !important;
          padding-right: 8px !important;
          transition: background-color .15s ease;
        }

        /* Avatar + meta layout */
        .emp-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .emp-avatar {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          line-height: 1;
          flex-shrink: 0;
          overflow: hidden; /* clip image to circle */
          border: 1px solid #e5e7eb; /* neutral border */
          background-color: #f3f4f6; /* light fallback */
        }
        .emp-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .emp-avatar-initials { letter-spacing: 0.2px; }
        .emp-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .emp-name {
          font-weight: 600;
          font-size: 13px;
          line-height: 1.2;
          color: #111827; /* gray-900 */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .emp-desig {
          font-size: 12px;
          line-height: 1.2;
          color: #4b5563; /* gray-600 */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .emp-grade {
          font-size: 12px;
          line-height: 1.2;
          color: #6b7280; /* gray-500 */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Rounded corners for timeline event bars */
        .b-sch-event-wrap,
        .b-sch-event {
          border-radius: 6px;
        }

        /* Ensure inner content respects rounding */
        .b-sch-event-wrap {
          overflow: hidden;
        }

        /* Center the text inside the event bars */
        .b-sch-event {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .b-sch-event .b-sch-event-content,
        .b-sch-event .b-sch-event-label {
          width: 100%;
          text-align: center;
        }
        .b-sch-event:not(.b-milestone) .b-sch-event-content {
            justify-content: center;
            margin: 0;
        }

        /* Leave event style (POC) */
        .leave-event,
        .leave-event .b-sch-event-content {
          pointer-events: none !important;
        }
        .leave-event {
          background-color: #f59e0b !important; /* amber-500 for readability */
          border: none;
          border-radius: none !important;
          color: #ffffff !important;            /* white text */
          text-shadow: 0 1px 1px rgba(0,0,0,0.35); /* improve contrast */
          height: 100% !important;
          box-sizing: border-box;
        }

        /* Conflict event base style (striped red) */
        .conflict-event {
          background-image: repeating-linear-gradient(45deg, rgba(239,68,68,0.95) 0 10px, rgba(220,38,38,0.95) 10px 20px) !important;
          color: #ffffff !important;
          text-shadow: 0 1px 1px rgba(0,0,0,0.35) !important;
        }

        /* Conflict slices overlay (legacy, no longer used but harmless if present) */
        .conflict-slice {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 0;
          background-image: repeating-linear-gradient(45deg, rgba(239,68,68,0.95) 0 10px, rgba(220,38,38,0.95) 10px 20px);
          outline: 1px solid #991b1b; /* thin outline to separate */
          border-radius: 6px; /* inherit rounding */
          pointer-events: none; /* non-interactive */
          z-index: 1; /* behind label */
        }
        .evt-label { position: relative; z-index: 2; }
      `}</style>
    </div>
  );
}
