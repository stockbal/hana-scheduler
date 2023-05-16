# HANA Scheduler

Simple MTA project which uses the Cloud Foundry REST API to start one or several HANA Cloud service instance via a node cron job.  
The project is designed with the HANA Cloud Free Tier model in mind as this variant of the HANA Cloud service will be stopped **every day**.

## Note

If the free HANA Cloud instance is running on a Free Tier account it is recommended to use the [Automation Pilot](https://discovery-center.cloud.sap/serviceCatalog/automation-pilot?region=all) instead.

## Used SAP BTP services

- [SAP Credential Store](https://discovery-center.cloud.sap/serviceCatalog/credential-store?region=all)  
  *Used to store the user credentials that are needed to update the HANA Cloud service instance*
- [SAP HANA Cloud](https://discovery-center.cloud.sap/serviceCatalog/sap-hana-cloud?region=all&tab=feature)  
  *HANA Cloud instances that shall be started are configured via a separate `JSON` configuration*

## Mechanism to schedule the HANA start

To schedule the start of the HANA Cloud instance a simple cron job via then [cron](https://npmjs.org/cron) package is used.  
This has the advantage of no additional costs as the [SAP Job Scheduler](https://) service is not available as free tier.

Additionally as the scheduling takes place inside a node application, the scheduler checks all HANA instances if they are truly started if the initial job date lies in the future.

## Job configuration

The job configuration for starting HANA instances can be provided as  

- a user-provided environment variable with name `HANA_SCHEDULER_JOB_CONFIG`

or

- a `JSON` file that can be deployed together with the application at path `/src/jobconfig.json`.

In both cases the `JSON` configuration must be provided in the following format

```json
[
  {
    "hanaInstanceGuid": "<guid of HANA cloud service instance e.g. a789a432-0aac-42e3-a0cf-5a33a6a4e585>",
    "startCronTimePattern": "<cron time pattern when to start the given HANA instance - e.g. 0 0 7 * * *>"
  }
]
```

## Deployment

1. Execute `npm run build:trial` (for Trial accounts) or `npm run build:free` if used on Free Tier accounts
2. Logon to Cloud Foundry with `cli l` and target the org and space where the scheduler should be deployed
3. Execute `npm run deploy` to trigger the deployment of the `mtar` archive

## After Deployment

### Credentials for CF API

1. Access the cockpit of the created `Credential Store` instance
2. Create a new `password`-credential in namespace `utils` with name `cf-api`
3. Enter username/password of a user that has `Space Developer` rights in the space where your HANA Cloud instance is running