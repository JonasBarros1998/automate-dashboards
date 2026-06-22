import * as action from "."

function mocks() {
  return {
    title: "dashboard-services",
    region: "us-east-1",
    services: [
      {
        enable: false,
        serviceName: "aws-cloudtrail-logs-700552527916-a0e3addd",
        serviceType: "S3",
        alarms: [
          {
            metric: "NumberOfObjects",
            period: 300,
            statistic: "Sum",
            condition: "LessThanOrEqualToThreshold",
            threshold: 1
          },
          {
            metric: "BucketSizeBytes",
            period: 300,
            statistic: "Sum",
            condition: "GreaterThanThreshold",
            threshold: 1
          }
        ]
      },
      {
        enable: false,
        serviceName: "lambda-sqs",
        serviceType: "SQS",
        alarms: [
          {
            metric: "NumberOfMessagesSent",
            period: 600, // 600 seconds = 10 minutes 
            statistic: "Sum",
            condition: "GreaterThanThreshold",
            threshold: 1
          },
          {
            metric: "NumberOfMessagesReceiver",
            period: 600,
            statistic: "Sum",
            condition: "LessThanOrEqualToThreshold",
            threshold: 1
          },
          {
            metric: "NumberEmptyMessages",
            period: 600,
            statistic: "Sum",
            condition: "LessThanOrEqualToThreshold",
            threshold: 1
          },
        ]
      },
      {
        enable: false,
        serviceName: "my-topic-dashboards",
        serviceType: "SNS",
        alarms: [
          {
            metric: "NumberOfNotificationsFailed",
            period: 600,
            statistic: "Sum",
            condition: "GreaterThanThreshold",
            threshold: 1
          },
          {
            metric: "NumberOfMessagesPublished",
            period: 600, 
            statistic: "Sum",
            condition: "GreaterThanThreshold",
            threshold: 1
          }
        ]
      },
      {
        enable: false,
        serviceName: "change-data-capture",
        serviceType: "Lambda",
        alarms: [
          {
            metric: "Duration",
            period: 600, 
            statistic: "Average",
            condition: "GreaterThanOrEqualToThreshold",
            threshold: 1
          },
          {
            metric: "Invocations",
            period: 600, 
            statistic: "Sum",
            condition: "LessThanOrEqualToThreshold",
            threshold: 1
          },
          {
            metric: "Errors",
            period: 600, 
            statistic: "Sum",
            condition: "GreaterThanThreshold",
            threshold: 1
          }
        ]
      },
      {
        enable: true,
        serviceName: "dashboard",
        serviceType: "Dynamodb",
        alarms: [
          {
            metric: "ConsumedReadCapacityUnits",
            period: 600, 
            statistic: "Sum",
            condition: "GreaterThanThreshold",
            threshold: 1
          },
          {
            metric: "ConsumedWriteCapacityUnits",
            period: 600, 
            statistic: "Sum",
            condition: "GreaterThanThreshold",
            threshold: 1
          },

        ]
      },
      {
        enable: true,
        serviceName: "i-06e79e74c4657bf85",
        serviceType: "EC2",
        alarms: [
          {
            metric: "CPUUtilization",
            period: 600, 
            statistic: "Sum",
            condition: "LessThanOrEqualToThreshold",
            threshold: 50
          },
          {
            metric: "StatusCheckFailed_Instance",
            period: 600, 
            statistic: "Sum",
            condition: "LessThanOrEqualToThreshold",
            threshold: 1
          }
        ]
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