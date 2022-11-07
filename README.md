# HANA Scheduler

Simple MTA project which uses the Cloud Foundry REST API to start one or several HANA Cloud service instance via a node cron job.  
The project is designed with the HANA Cloud Free Tier model in mind as this variant of the HANA Cloud service will be stopped **every day**.

## Used SAP BTP services

- [SAP Credential Store](https://discovery-center.cloud.sap/serviceCatalog/credential-store?region=all)  
  *Used to store the user credentials that are needed to update the HANA Cloud service instance*
- [SAP HANA Cloud](https://discovery-center.cloud.sap/serviceCatalog/sap-hana-cloud?region=all&tab=feature)  
  *HANA Cloud instance that shall be started are configured via a separate `JSON` config file*

## Mechanism to schedule the HANA start

To schedule the start of the HANA Cloud instance a simple cron job via then [cron](https://npmjs.org/cron) package is used.  
This has the advantage of no additional costs as the [SAP Job Scheduler](https://) service is not available as free tier.

## Job configuration

The job configuration needs to be stored in a `JSON` file at `/src/jobconfig.json`.  
The file must have the following layout:

```json
[
  {
    "hanaInstanceGuid": "<guid of HANA cloud service instance e.g. a789a432-0aac-42e3-a0cf-5a33a6a4e585>",
    "startCronTimePattern": "<cron time pattern when to start the given HANA instance - e.g. 0 0 7 * * *>"
  }
]