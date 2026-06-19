import { Issue, Alarms, availableServices, Services } from ".";
import * as cli from "@actions/exec";
import * as core from "@actions/core";

const EVALUATION_PERIODS = 5
const DATA_POINTS_TO_ALARMS = 3
const ENABLE_CONDITIONS = ["GreaterThanThreshold", "LessThanOrEqualToThreshold", "GreaterThanOrEqualToThreshold", "LessThanLowerThreshold"]

/* ================= ALARMS BUILDER ================= */
export function createAlarms(issue: Issue) {
    const filterAlarms = issue
        .services
        .filter(item => item.alarms !== null && item.alarms?.length > 0)

    if(thereIsAlarms(filterAlarms)) {
        filterAlarms
            .filter(item => availableServices.includes(item.serviceType))
            .map(service => validateCondition(service))
            .map(async service => {
                await execute(
                    {
                        alarm: addParams({
                            alarmItem: addNamespace(service),
                            service: service
                        })
                    }
                )
            })
    }        
}

function addParams(arg: { alarmItem: Alarms, service: Services }) {
    arg.alarmItem = addNamespace(arg.service)
    arg.alarmItem = addName(arg.alarmItem, arg.service)
    return arg.alarmItem
}

const thereIsAlarms = (service: Services[]) => service.flatMap(item => item.alarms).length > 0

function addNamespace(service: Services): Alarms {
    return service
    .alarms
    .map(alarm => ({...alarm, namespace: `AWS/${service.serviceType.toUpperCase()}` }))[0]
}

function addName(alarmItem: Alarms, service: Services): Alarms {
    return {...alarmItem, "name": `${alarmItem.metric}-${service.serviceName}`}
}

function validateCondition(service: Services) {
    service
        .alarms
        .flatMap(item => item.condition)
        .map(name => {
            if(ENABLE_CONDITIONS.includes(name) === false) {
                const messageError = `The condition name is invalid. These conditions are available ${ENABLE_CONDITIONS.join(",")}`
                core.setFailed(messageError)
                throw (messageError)
            }
        })
    return service
}


/* ================== EXEC ================= */
export async function execute(arg: {alarm: Alarms}) {
    const stderr: string[] = [];

    console.log("ACTION_NAME: ", core.getInput("ACTION_NAME", {required: true}))
    console.log("ACTION_NAME_V2: ", core.getInput("ACTION_NAME_V2", {required: true}))

    const code = await cli.exec(
    "aws",
    [
        "cloudwatch",
        "put-metric-alarm",
        
        "--alarm-name",
        arg.alarm.name,

        "--metric-name",
        arg.alarm.metric,

        "--period",
        arg.alarm.period.toString(),

        "--evaluation-periods",
        EVALUATION_PERIODS.toString(),

        "--datapoints-to-alarm",
        DATA_POINTS_TO_ALARMS.toString(),

        "--threshold",
        arg.alarm.threshold.toString(), 
        
        "--statistic",
        arg.alarm.statistic,

        "--comparison-operator",
        arg.alarm.condition,

        "--namespace",
        arg.alarm.namespace!!,
        
        "--ok-actions",
        core.getInput("ACTION_NAME", {required: true})
    ],
    {
        listeners: {
            stderr: (data: Buffer) => stderr.push(data.toString()),
        },
    }
    );

    if (code !== 0) {
        core.error(stderr.join("\n"));
        throw Error(`Dont possible create ${arg.alarm.name}`)
    }
    
}
