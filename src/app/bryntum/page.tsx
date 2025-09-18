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
    'quantity surveyor': { bg: '#f59e0b', border: '#d97706', text: '#ffffff' } // amber
  };
  if (special[key]) {
    const s = special[key];
    return `background-color:${s.bg};border-color:${s.border};color:${s.text};height:30px;`;
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
  return `background-color:${pick.bg};border-color:${pick.border};color:${pick.text};height:30px;text-align:center;justify-content:center;display:flex;align-items:center;`;
}

export default function BryntumSchedulerPage() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear() + 1, now.getMonth(), 1);

  const resources = useMemo(() => toFlatUsers((data as any).Data as PlanItem[]), []);
  const events = useMemo(() => toUserEvents((data as any).Data as PlanItem[]), []);

  // Color and label bars for certain designations
  const eventRenderer = ({ eventRecord, renderData }: any) => {
    const desig = (eventRecord?.designation ?? '').toString();
    renderData.style = getPrettyEventStyle(desig);
    // Always show a uniform label
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
        barHeight={15}
        selectionMode={{ row: false, cell: false }}
        features={{
          cellMenu: false,
          rowMenu: false,
          headerMenu: false,
          eventMenu: false,
          scheduleMenu: false,
          timeAxisHeaderMenu: false,
          eventCopyPaste: false
        }}
        onBeforeCellMenuShow={() => false}
        onBeforeRowMenuShow={() => false}
        onBeforeHeaderMenuShow={() => false}
        onBeforeEventMenuShow={() => false}
        onBeforeScheduleMenuShow={() => false}
        onBeforeTimeAxisHeaderMenuShow={() => false}
        columns={[{
          text: 'Employees',
          field: 'name',
          width: 440,
          // Add a class to the left column cells so we can scope padding nicely
          cellCls: 'emp-col-cell',
          renderer: ({ record }: any) => ({
            className: 'emp-cell',
            children: [
              { tag: 'div', className: 'emp-name', text: record?.name ?? '' },
              { tag: 'div', className: 'emp-desig', text: record?.designation ?? '—' },
              { tag: 'div', className: 'emp-grade', text: record?.grade ?? '—' }
            ]
          })
        }]}
        // Flat list of users as resources
        resources={resources}
        // No events; we only list users
        events={events}
        eventRenderer={eventRenderer}
      />

      <style jsx global>{`
        /* As a last resort, hide any Bryntum menu if created */
        .b-menu {
          display: none !important;
        }

        /* Tighter padding only for the left Employees column */
        .b-grid-cell.emp-col-cell {
          padding-top: 10px !important;
          padding-bottom: 10px !important;
          padding-left: 12px !important;
          padding-right: 8px !important;
          transition: background-color .15s ease;
        }

        /* Custom hover color for left cells */
        .b-grid-subgrid-locked .b-grid-row:hover .b-grid-cell.emp-col-cell,
        .b-grid-subgrid-locked .b-grid-cell.emp-col-cell:hover {
          background-color: #f8fafc !important; /* slate-50 */
        }

        /* Disable any text selection and selection styling in the left (locked) subgrid */
        .b-grid-subgrid-locked .b-grid-cell.emp-col-cell,
        .b-grid-subgrid-locked .b-selected {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          background: transparent !important;
        }
        .b-grid-subgrid-locked .b-grid-row:focus {
          outline: none !important;
        }

        /* Stack name / designation / grade with small gaps */
        .emp-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .emp-name {
          font-weight: 600;
          font-size: 13px;
          line-height: 1.2;
          color: #111827; /* gray-900 */
        }

        .emp-desig {
          font-size: 12px;
          line-height: 1.2;
          color: #4b5563; /* gray-600 */
        }

        .emp-grade {
          font-size: 12px;
          line-height: 1.2;
          color: #6b7280; /* gray-500 */
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
      `}</style>
    </div>
  );
}
