"use client";
import * as React from "react";
import { Scheduler, SchedulerView } from "@progress/kendo-react-scheduler";
import { data } from "../poc/shared-plans";

// Utility to convert MS JSON date string to JS Date
function parseMSDate(msDate: string): Date | null {
  if (!msDate) return null;
  const match = /\/Date\((\d+)\)\//.exec(msDate);
  return match ? new Date(Number(match[1])) : null;
}

// Map shared-plans data to Scheduler events
function mapPlansToEvents(raw: any[]) {
  return raw.map((item) => ({
    id: item.Id,
    title: item.Title,
    start: parseMSDate(item.RenderStartDate),
    end: parseMSDate(item.RenderEndDate),
    description: item.Comments,
    ProjectGroup: `${item.ProjectCode} | ${item.ProjectName} | ${item.Department}`,
    designation: item.Designation,
    grade: item.Grade,
  }));
}

const eventData = mapPlansToEvents(data.Data);

const SchedulerPage = () => {
  // Group by ProjectGroup
  const resources = [
    {
      name: "ProjectGroup",
      data: Array.from(
        new Set(eventData.map((e) => e.ProjectGroup))
      ).map((group) => ({ text: group, value: group })),
      field: "ProjectGroup",
      valueField: "value",
      textField: "text",
      colorField: undefined,
    },
  ];

  return (
    <div style={{ height: "800px" }}>
      <Scheduler
        data={eventData}
        resources={resources}
        defaultView="month"
        editable={false}
        group={{ resources: ["ProjectGroup"], orientation: "vertical" }}
        style={{ height: "100%" }}
      />
    </div>
  );
};

export default SchedulerPage;
