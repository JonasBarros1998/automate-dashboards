import * as core from "@actions/core";
import * as github from "@actions/github";
import * as cli from "@actions/exec";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { Root } from "remark-parse/lib";

const markdown = `
region AWS: us-east-1

1. [ ] EC2 | name: ...
2. [x] S3 | name: aws-cloudtrail-logs-700552527916-a0e3addd
3. [x] SQS | name: lambda-sqs
4. [x] SNS | name: my-topic-dashboards
5. [x] Lambda | name: change-data-capture
6. [x] Dynamodb | name: dashboard
`;

interface Issue {
  title: string;
  services: Array<{
    serviceType: string;
    checked: boolean;
    serviceName: string;
  }>;
}

interface Dashboard {
  region: string;
  serviceType: string;
  checked: boolean;
  serviceName: string;
  body: string;
}

const regex = /^\s*\[x\]\s+.*$/i;

function mocks() {
  return {
    number: 123,
    title: "Create Dahsboard",
    body: markdown,
  };
}

function processMarkdown(tree: Root) {
  const dashboards = {
    title: "",
    services: [],
  } as Issue;

  const [childrenTitle, childrenData] = tree.children as any;

  const itens = childrenData["children"] as Array<any>;

  itens.map((childrens) => {
    const childrensFields = childrens["children"][0]["children"][0];
    const [serviceType, service] = (childrensFields["value"] as string).split("|");
    const isChecked = regex.test(serviceType);

    //Remove spaces and atributte name
    const serviceName = service?.replace(/name:|\s/g, "");

    dashboards.services.push({
      serviceType: serviceType.trimEnd(),
      checked: isChecked,
      serviceName,
    });
  });

  const [, region] = childrenTitle["children"][0]["value"].split(":") as string;

  dashboards.title = region.trimStart();

  return dashboards;
}

function createDash(data: Issue) {
  const dashboard = [] as Array<Dashboard>;
  const dashboard1 = {
    start: "-PT1H",
    widgets: [],
  } as { start: string; widgets: Array<any> };

  data.services.map((service) => {
    if (service.checked === true) {
      switch (service.serviceType) {

        case "[x] SQS":
          dashboard1.widgets.push(
            ...SQSService(data.title, service.serviceName)
          );
          break;

        case "[x] S3":
          dashboard1.widgets.push(
            ...S3Service(data.title, service.serviceName)
          );
          break;

        case "[x] SNS": 
          dashboard1.widgets.push(
            ...SNSService(data.title, service.serviceName)
          )
          break;

        case "[x] Lambda": 
          dashboard1.widgets.push(
            ...lambdaService(data.title, service.serviceName)
          )
          break;
        
        case "[x] Dynamodb":
          dashboard1.widgets.push(
            ...dynamodbService(data.title, service.serviceName)
          )

        default:
          break;
      }
    }
  });

  return dashboard1;
}

function execute(dashboard: string) {
  cli.exec("aws", [
    "cloudwatch",
    "put-dashboard",
    "--dashboard-name",
    "my-dashboard",
    "--dashboard-body",
    dashboard,
  ]);
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

async function run() {
  //const issue = github.context.payload.issue
  const issue = mocks();

  if (issue?.title === "Create Dahsboard") {
    const tree = unified().use(remarkParse).parse(issue?.body);

    const terraformData = processMarkdown(tree);
    const dashboard = createDash(terraformData);
    execute(JSON.stringify(dashboard));
    //console.log(JSON.stringify(dashboard));
    return;
  }

  core.info(
    "An issue was opened, but it's not for dashboard creation. Skipping this workflow."
  );
}

(() => {
  run();
})();
