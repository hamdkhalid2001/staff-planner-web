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
  Designation?: string;
  Grade?: string;
  RenderStartDate: string;
  RenderEndDate: string;
  ProjectCode?: string;
  ProjectName?: string;
  Department?: string;
  Comments?: string;
}

// Build Scheduler resources (groups) and events from plan data
function toSchedulerData(raw: PlanItem[]) {
  const resourceMap = new Map<string, { id: string; name: string }>();
  const events: any[] = [];

  raw.forEach(item => {
    const groupKey = `${item.ProjectCode} | ${item.ProjectName} | ${item.Department}`;
    const safeGroupId = 'group_' + groupKey.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

    if (!resourceMap.has(groupKey)) {
      resourceMap.set(groupKey, { id: safeGroupId, name: groupKey });
    }

    const start = parseMSDate(item.RenderStartDate);
    const end = parseMSDate(item.RenderEndDate);

    events.push({
      id: item.Id,
      resourceId: safeGroupId,
      name: item.Title,
      startDate: start,
      endDate: end,
      designation: item.Designation,
      grade: item.Grade,
      comments: item.Comments
    });
  });

  return { resources: Array.from(resourceMap.values()), events };
}

export default function BryntumSchedulerPage() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear() + 1, now.getMonth(), 1);

  const { resources, events } = useMemo(() => toSchedulerData((data as any).Data as PlanItem[]), []);

  // Event renderer to color and label per requirements
  const eventRenderer = ({ eventRecord, renderData }: any) => {
    const desig = (eventRecord?.designation ?? '').toString().trim().toLowerCase();
    if (desig === 'stores clerk' || desig === 'quantity surveyor') {
      renderData.style = 'background-color:#ef4444;border-color:#b91c1c;color:#ffffff;';
      return 'Assigned';
    }
    // Default label: task name
    return eventRecord.name;
  };

  return (
    <div style={{ height: 'calc(100vh - 16px)' }}>
      <BryntumScheduler
        startDate={startDate}
        endDate={endDate}
        viewPreset="monthAndYear"
        barMargin={6}
        rowHeight={40}
        columns={[{ text: 'Name', field: 'name', width: 350 }]}
        resources={resources}
        events={events}
        eventRenderer={eventRenderer}
      />
    </div>
  );
}
