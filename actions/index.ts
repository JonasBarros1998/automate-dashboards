import * as core from "@actions/core";
import * as github from "@actions/github";
import * as cli from "@actions/exec";
import { start } from "node:repl";

/* ================= TYPES ================= */

interface Dashboard {
  start: string;
  widgets: any[];
}

interface Issue {
  region: string;
  title: string;
  services: {
    enable: boolean;
    serviceName: string;
    serviceType: string;
  }[];
}

/* ================= LAYOUT ENGINE ================= */

const GRID_WIDTH = 24;
const SPACING = 2;

function addHeader(title: string) {
  return {
    type: "text",
    x: 0,
    y: 0,
    width: GRID_WIDTH,
    height: 1,
    properties: {
      markdown: `## ${title}`,
      background: "transparent",
    },
  };
}

function placeWidgets(widgets: any[], startY: number) {
  return widgets.map((w) => ({
    ...w,
    y: (w.y || 0) + startY,
  }));
}

function getBlockHeight(widgets: any[]) {
  return Math.max(...widgets.map((w) => (w.y || 0) + w.height));
}

/* ================= DASHBOARD BUILDER ================= */

function createDash(data: Issue) {
  const dashboard: Dashboard = {
    start: "-PT1H",
    widgets: [],
  };

  let currentY = 0;

  const orderedServices = data.services
    .filter((s) => s.enable)
    .sort((a, b) =>
      ["SQS", "SNS", "Lambda", "Dynamodb", "S3", "EC2"].indexOf(a.serviceType) -
      ["SQS", "SNS", "Lambda", "Dynamodb", "S3", "EC2"].indexOf(b.serviceType)
    );

  for (const service of orderedServices) {
    let widgets: any[] = [];

    switch (service.serviceType) {
      case "SQS":
        widgets = SQSService(data.region, service.serviceName);
        break;
      case "S3":
        widgets = S3Service(data.region, service.serviceName);
        break;
      case "SNS":
        widgets = SNSService(data.region, service.serviceName);
        break;
      case "Lambda":
        widgets = lambdaService(data.region, service.serviceName);
        break;
      case "Dynamodb":
        widgets = dynamodbService(data.region, service.serviceName);
        break;
      case "EC2":
        widgets = EC2Service(data.region, service.serviceName);
        break;
    }

    const section = [
      addHeader(`${service.serviceType} - ${service.serviceName}`),
      ...widgets,
    ];

    const placed = placeWidgets(section, currentY);
    dashboard.widgets.push(...placed);

    currentY += getBlockHeight(section) + SPACING;
  }

  return JSON.stringify(dashboard);
}

/* ================= SERVICES ================= */

function SQSService(region: string, name: string) {
  return [
    // KPIs
    metric("Available", 0, 1, 8, 4, [
      ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", name],
    ], region, "singleValue"),

    metric("In Flight", 8, 1, 8, 4, [
      ["AWS/SQS", "ApproximateNumberOfMessagesNotVisible", "QueueName", name],
    ], region, "singleValue"),

    metric("Received", 16, 1, 8, 4, [
      ["AWS/SQS", "NumberOfMessagesReceived", "QueueName", name],
    ], region),

    // Charts
    metric("Messages Received", 0, 5, 24, 6, [
      ["AWS/SQS", "NumberOfMessagesReceived", "QueueName", name, {"color": "#17becf"}],
      ["AWS/SQS", "NumberOfMessagesDeleted", "QueueName", name, { "color": "#d62728" }],
    ], region),
  ];
}

function SNSService(region: string, name: string) {
  return [
    metric("Publish Size", 0, 1, 6, 4, [
      ["AWS/SNS", "PublishSize", "TopicName", name],
    ], region, "singleValue"),

    {
      type: "metric",
      x: 6,
      y: 1,
      width: 18,
      height: 6,
      properties: {
        title: "Notifications",
        metrics: [
          ["AWS/SNS", "NumberOfNotificationsFailed", "TopicName", name],
          ["AWS/SNS", "NumberOfNotificationsDelivered", "TopicName", name],
          ["AWS/SNS", "NumberOfNotificationsPublished", "TopicName", name],
        ],
        stat: "Sum",
        region,
      },
    },
  ];
}

function lambdaService(region: string, name: string) {
  return [
    metric("Invocations", 0, 1, 12, 6, [
      ["AWS/Lambda", "Invocations", "FunctionName", name],
      ["AWS/Lambda", "Errors",      "FunctionName", name, { "color": "#d62728" }]
    ], region),

    metric("Duration", 12, 1, 12, 6, [
      ["AWS/Lambda", "Duration", "FunctionName", name],
    ], region),

    metric("Concurrency", 0, 7, 24, 6, [
      ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", name],
    ], region),
  ];
}

function dynamodbService(region: string, name: string) {
  return [
    metric("Read Capacity", 0, 1, 12, 6, [
      ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", name, {"color": "#7f7f7f"}],
    ], region),

    metric("Write Capacity", 12, 1, 12, 6, [
      ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", name, {"color": "#9467bd"}],
    ], region),
  ];
}

function S3Service(region: string, name: string) {
  return [
    metric("Objects", 0, 1, 8, 4, [
      ["AWS/S3", "NumberOfObjects", "BucketName", name, "StorageType", "AllStorageTypes"],
    ], region, "singleValue", {start: "-PT72H", end: "P0D"}),

    metric("Storage", 8, 1, 8, 4, [
      ["AWS/S3", "BucketSizeBytes", "BucketName", name, "StorageType", "StandardStorage"],
    ], region, "singleValue", {start: "-PT72H", end: "P0D"}),

    metric("Growth", 16, 1, 8, 4, [
      ["AWS/S3", "NumberOfObjects", "BucketName", name],
    ], region, "timeSeries", {start: "-PT72H", end: "P0D"}),
  ];
}

function EC2Service(region: string, name: string) {
  return [
    metric("CPU", 0, 1, 24, 6, [
      ["AWS/EC2", "CPUUtilization", "InstanceId", name],
    ], region),

    metric("Network", 12, 7, 24, 6, [
      ["AWS/EC2", "NetworkOut", "InstanceId", name, {"color": "#2ca02c"}],
      ["AWS/EC2", "NetworkIn", "InstanceId", name, {"color": "#ff7f0e"}],
    ], region),
  ];
}

/* ================= GENERIC METRIC ================= */

function metric(
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
  metrics: any[],
  region: string,
  view: "timeSeries" | "singleValue" = "timeSeries",
  rangeTime: any | null = null
) {
  if(rangeTime === null) {
    return {
      type: "metric",
      x,
      y,
      width,
      height,
      properties: {
        title,
        metrics,
        region,
        stat: "Sum",
        view,
        period: 60,
      },
    };
  }
  else {
    return {
    type: "metric",
    x,
    y,
    width,
    height,
    properties: {
      title,
      metrics,
      region,
      stat: "Sum",
      view,
      start: rangeTime.start,
      end: rangeTime.end,
      period: 60
    },
  };
  }
  
}

/* ================= EXEC ================= */

async function execute(dashboard: string, title: string) {
  const stderr: string[] = [];

  const code = await cli.exec(
    "aws",
    [
      "cloudwatch",
      "put-dashboard",
      "--dashboard-name",
      title,
      "--dashboard-body",
      dashboard,
    ],
    {
      listeners: {
        stderr: (data: Buffer) => stderr.push(data.toString()),
      },
    }
  );

  if (code !== 0) {
    core.error(stderr.join("\n"));
  }
}

/*==================== MOCK =====================*/
export const loadDatas = (body: string) => {

  Object.defineProperty(github.context.payload, "issue", {
      value: {
        title: "Create Dashboard",
        body: body
      },
      writable: false
    }
  )
}

/* ================= RUN ================= */

function run() {
  const issue = github.context.payload.issue;

  if (issue?.title === "Create Dashboard") {
    const data = JSON.parse(issue.body as string) as Issue;
    const dashboard = createDash(data);
    execute(dashboard, data.title);
  }
}

(() => run())();

export const quickStart = {
  "run": run
}

/* ================== Invoke function to start action ==================== */
