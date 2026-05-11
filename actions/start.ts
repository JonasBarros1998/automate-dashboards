import * as action from "."

function mocks() {
  return {
    title: "dashboard-services",
    region: "us-east-1",
    services: [
      {
        enable: true,
        serviceName: "aws-cloudtrail-logs-700552527916-a0e3addd",
        serviceType: "S3"
      },
      {
        enable: true,
        serviceName: "lambda-sqs",
        serviceType: "SQS"
      },
      {
        enable: true,
        serviceName: "my-topic-dashboards",
        serviceType: "SNS"
      },
      {
        enable: true,
        serviceName: "change-data-capture",
        serviceType: "Lambda"
      },
      {
        enable: true,
        serviceName: "dashboard",
        serviceType: "Dynamodb"
      },
      {
        enable: true,
        serviceName: "i-06e79e74c4657bf85",
        serviceType: "EC2"
      }
    ],
  };
}

function starter() {
  const mock = mocks()
  action.loadDatas(JSON.stringify(mock))
  action.quickStart.run()
}

(() => starter())();