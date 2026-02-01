import * as core from "@actions/core";
import * as github from "@actions/github";
import * as cli from "@actions/exec";

interface Dashboard {
  start: "-PT1H",
  widgets: Array<any>,
}

interface Issue {
  region: string,
  title: string,
  services: {
    enable: boolean,
    serviceName: string,
    serviceType: string
  }[]  
}

function processMarkdown(tree: Issue) {
  const treeCopy = Object.assign(tree, {})
  return treeCopy;
}

function createDash(data: Issue) {
  const dashboard = {
    start: "-PT1H",
    widgets: []
  } as Dashboard;

  data.services.map((service) => {
    if (service.enable === true) {
      switch (service.serviceType) {
        case "SQS":
          dashboard.widgets.push(...SQSService(data.region, service.serviceName))
          break;

        case "S3":
          dashboard.widgets.push(...S3Service(data.region, service.serviceName))
          break;

        case "SNS": 
          dashboard.widgets.push(...SNSService(data.region, service.serviceName))
          break;

        case "Lambda": 
          dashboard.widgets.push(...lambdaService(data.region, service.serviceName))
          break;
        
        case "Dynamodb":
          dashboard.widgets.push(...dynamodbService(data.region, service.serviceName))
        default:
          break;
      }
    }
  });

  return JSON.stringify(dashboard);
}

async function execute(dashboard: string, dashboardTitle: string) {
  const stderr: Array<string> = [] 

  await cli.exec(
    "aws", 
    [
      "cloudwatch",
      "put-dashboard",
      "--dashboard-name",
      dashboardTitle,
      "--dashboard-body",
      dashboard,
    ],
    {
      silent: true,
      ignoreReturnCode: true,
      listeners: {
        stderr: (data: Buffer) => {
          stderr.push(data.toString().trim())
        },
      },
    }
)
  core.error(`It's not possible to create the dashboard ${dashboardTitle}`)
  core.error(stderr[0])
}

function SQSService(region: string, serviceName: string) {
  return [
    {
      type: "metric",
      x: 0,
      y: 0,
      width: 6,
      height: 6,
      properties: {
        title: "Messages Available (Visible)",
        metrics: [
          [
            "AWS/SQS",
            "ApproximateNumberOfMessagesVisible",
            "QueueName",
            serviceName,
          ],
        ],
          stat: "Sum",
          period: 60,
          region: region,
          view :"singleValue"
      },
    },
    {
      type: "metric",
      x: 6,
      y: 0,
      width: 6,
      height: 6,
      properties: {
        title: "Messages In Flight (Not Visible)",
        metrics: [
          [
            "AWS/SQS",
            "ApproximateNumberOfMessagesNotVisible",
            "QueueName",
            serviceName,
          ],
        ],
        view: "singleValue",
        stat: "Sum",
        period: 60,
        region: region,
      },
    },
    {
      type: "metric",
      x: 12,
      y: 0,
      width: 12,
      height: 6,
      properties: {
        title: "Messages Received",
        metrics: [
          [
            "AWS/SQS", 
            "NumberOfMessagesReceived", 
            "QueueName", 
            serviceName
          ],
        ],
        stat: "Sum",
        period: 60,
        region: region,
        view: "timeSeries"
      },
    },
    {
      type: "metric",
      x: 0,
      y: 4,
      width: 24,
      height: 6,
      properties: {
        title: "Messages Deleted",
        metrics: [
          [
            "AWS/SQS", 
            "NumberOfMessagesDeleted", 
            "QueueName",
            serviceName
          ],
        ],
          stat: "Sum",
          period: 60,
          region: region,
          view: "timeSeries"
        },
    },
  ];
}

function S3Service(region: string, serviceName: string) {
  return [
    {
      type: "metric",
      x: 0,
      y: 0,
      width: 6,
      height: 6,
      properties: {
        title: "S3 Number of Objects",
        metrics: [
          [ 
            "AWS/S3", 
            "NumberOfObjects", 
            "BucketName", 
            serviceName, 
            "StorageType", 
            "AllStorageTypes"
          ]
        ],
        sparkline: false,
        view: "singleValue",
        stacked: false,
        region: region,
        period: 604800,
        stat: "Sum",
        start: "-PT72H",
        end: "P0D"
      },
    },
    {
      type: "metric",
      x: 6,
      y: 0,
      width: 6,
      height: 6,
      properties: {
        title: "S3 Bucket Size (Bytes)",
        metrics: [
          [
            "AWS/S3",
            "BucketSizeBytes",
            "BucketName",
            serviceName,
            "StorageType",
            "StandardStorage"
          ],
        ],
        sparkline: false,
        view: "singleValue",
        stacked: false,
        region: region,
        period: 86400,
        stat: "Sum",
        start: "-PT72H",
        end: "P0D"
      },
    },
    {
      type: "metric",
      x: 12,
      y: 0,
      width: 12,
      height: 6,
      properties: {
        title: "S3 Number of Objects",
        metrics: [
          [
            "AWS/S3", 
            "NumberOfObjects", 
            "BucketName",
            serviceName,
            "StorageType", 
            "AllStorageTypes"
          ],
        ],
        stat: "Sum",
        period: 86400,
        region: region,
        view: "timeSeries",
        stacked: false,
        start: "-PT168H",
        end: "P0D"
      },
    }
  ];
}

function SNSService(region: string, serviceName: string) {
  return [
    {
      type: "metric",
      x: 0,
      y: 4,
      width: 6,
      height: 6,
      properties: {
        title: "Publish size",
        metrics: [
          [ 
            "AWS/SNS", 
            "PublishSize", 
            "TopicName", 
            serviceName
          ]
        ],
        stat: "Average",
        period: 60,
        region: region,
        view :"singleValue"
      },
    },
    {
      type: "metric",
      x: 6,
      y: 4,
      width: 18,
      height: 6,
      properties: {
        title: "Number of notifications delivered",
        metrics: [
          [ 
            "AWS/SNS", 
            "NumberOfNotificationsFailed", 
            "TopicName", 
            serviceName, 
            { 
              label: "Number Of Notifications Failed",
              color: "#fe6e73"
            } 
          ],
          [
            "AWS/SNS", 
            "NumberOfNotificationsPublisher", 
            "TopicName", 
            serviceName, 
            { 
              label: "Number Of Notifications Publisher",
              color: "#f89256"
            }
          ],
          [ 
            "AWS/SNS", 
            "NumberOfNotificationsDelivered", 
            "TopicName", 
            serviceName, 
            { 
              label: "Number Of Notifications Delivered",
              color: "#98dcf5" 
            } 
          ]
        ],
        stat: "Sum",
        period: 60,
        region: region,
        view :"timeSeries"
      },
    }
  ]
}

function lambdaService(region: string, serviceName: string) {
  return [
    {
      type: "metric",
      x: 0,
      y: 8,
      width: 12,
      height: 6,
      properties: {
        title: "Invocations",
        metrics: [
          [ 
            "AWS/Lambda", 
            "Invocations", 
            "FunctionName", 
            serviceName, 
            { 
              "stat": "Sum", 
              "label": "Invocations [sum: ${SUM}]", 
              "region": region 
            }
          ]
        ],
        stat: "Average",
        period: 60,
        region: region,
        view :"timeSeries"
      },
    },
    {
      type: "metric",
      x: 12,
      y: 8,
      width: 12,
      height: 6,
      properties: {
        title: "Average",
        metrics: [
          [ 
            "AWS/Lambda", 
            "Duration", 
            "FunctionName", 
            serviceName, 
            { 
              "stat": "Average", 
              "label": "Average [${AVG}]", 
              "region": region 
            }
          ]
        ],
        stat: "Average",
        period: 60,
        region: region,
        view :"timeSeries"
      },
    },
    {
      type: "metric",
      x: 0,
      y: 10,
      width: 24,
      height: 6,
      properties: {
        title: "Total concurrent executions",
        metrics: [
          [ 
            "AWS/Lambda", 
            "ConcurrentExecutions", 
            "FunctionName", 
            serviceName, 
            { 
              "stat": "Maximum", 
              "label": "Concurrent executions [max: ${MAX}]", 
              "region": region 
            }
          ]
        ],
        period: 60,
        region: region,
        view :"timeSeries"
      },
    },
  ]
} 

function dynamodbService(region: string, serviceName: string) {
  return [
    {
      type: "metric",
      x: 0,
      y: 12,
      width: 12,
      height: 6,
      properties: {
        title: "Invocations",
        metrics: [
        [ 
          "AWS/DynamoDB", 
          "ConsumedReadCapacityUnits", 
          "TableName", 
          serviceName, 
          { 
            "stat": "Sum", 
            "id": "m1", 
            "visible": false, 
            "region": region 
          } 
        ],
        [ 
          { 
            "expression": "m1/PERIOD(m1)", 
            "label": "Consumed", 
            "id": "e1", 
            "color": "#0073BB", 
            "region": region 
          } 
        ]
      ],
        stat: "Average",
        period: 60,
        region: region,
        view :"timeSeries"
      },
    },
    {
      type: "metric",
      x: 12,
      y: 12,
      width: 12,
      height: 6,
      properties: {
        title: "Write usage (average units/second)",
        metrics: [
          [ 
            "AWS/DynamoDB", 
            "ConsumedWriteCapacityUnits", 
            "TableName", 
            serviceName, 
            { 
              "stat": "Sum", 
              "id": "m1", 
              "visible": false, 
              "region": region 
            } 
          ],
          [ 
            { 
              "expression": "m1/PERIOD(m1)", 
              "label": "Consumed", 
              "id": "e1", 
              "color": "#0073BB", 
              "region": region 
            } 
          ]
        ],
        stat: "Average",
        period: 60,
        region: region,
        view :"timeSeries"
      },
    },
    {
      type: "metric",
      x: 0,
      y: 12,
      width: 12,
      height: 6,
      properties: {
        title: "Put Latency",
        metrics: [
          [ 
            "AWS/DynamoDB", 
            "SuccessfulRequestLatency", 
            "TableName", 
            serviceName, 
            "Operation", 
            "PutItem", 
            { 
              "stat": "Average", 
              "color": "#0073BB", 
              "label": "Put latency", 
              "region": region 
            } 
          ],
          [ 
            "...", 
            "BatchWriteItem", 
            { 
              "color": "#9468BD", 
              "label": "Batch write latency", 
              "region": region 
            } 
          ]
        ],
        stat: "Average",
        period: 60,
        region: region,
        view :"timeSeries"
      },
    },
    {
      type: "metric",
      x: 12,
      y: 12,
      width: 12,
      height: 6,
      properties: {
        title: "Successful Read Requests (count)",
        metrics: [
          [ "AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", serviceName, "Operation", "GetItem", { "color": "#0073BB", "region": region } ],
          [ "...", "Scan", { "color": "#FF7F0F", "region": region } ],
          [ "...", "Query", { "color": "#2DA02D", "region": region } ],
          [ "...", "BatchGetItem", { "color": "#9468BD", "region": region } ]
        ],
        stat: "Average",
        period: 60,
        region: region,
        view :"timeSeries"
      },
    },
    
    {
      type: "metric",
      x: 0,
      y: 24,
      width: 24,
      height: 6,
      properties: {
        title: "Successful Write Requests (count)",
        metrics: [
          [ "AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", serviceName, "Operation", "PutItem", { "color": "#0073BB", "region": region } ],
          [ "...", "UpdateItem", { "color": "#FF7F0F", "region": region } ],
          [ "...", "DeleteItem", { "color": "#2DA02D", "region": region } ],
          [ "...", "BatchWriteItem", { "color": "#9468BD", "region": region } ],
          [ "...", "TransactWriteItems", { "color": "#008080", "region": region } ]
        ],
        stat: "Average",
        period: 60,
        region: region,
        view :"timeSeries"
      },
    }
      
  ]
}

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

function run() {
  const issue = github.context.payload.issue

  console.log(JSON.stringify(issue))
  
  if (issue?.title === "Create Dashboard") {
    const tree = JSON.parse(issue?.body!!) as Issue;

    const terraformData = processMarkdown(tree);
    const dashboard = createDash(terraformData);
    core.info("title: " + terraformData.title)

    execute(dashboard, terraformData.title);
    return;
  }

  core.info(
    "An issue was opened, but it's not for dashboard creation. Skipping this workflow."
  );
}

//(() => run())();

export const quickStart = {
  "run": run
}