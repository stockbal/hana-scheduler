# HANA Scheduler

Simple MTA project which uses the Cloud Foundry API to start a bound HANA Cloud service instance via a node cron job.  
The project is designed with the HANA Cloud Free Tier model in mind as this variant of the HANA Cloud service will be stopped **every day**.

## Used SAP BTP services

- [SAP Credential Store](https://discovery-center.cloud.sap/serviceCatalog/credential-store?region=all)  
  *Used to store the user credentials that are needed to update the HANA Cloud service instance*
- [SAP HANA Cloud](https://discovery-center.cloud.sap/serviceCatalog/sap-hana-cloud?region=all&tab=feature)  
  *Currently the HANA service instance that should be started is determined via a binding that is created via the `mta.yaml` file*

## Mechanism to schedule the HANA start

To schedule the start of the HANA Cloud instance a simple cron job via then [cron](https://npmjs.org/cron) package is used.  
This has the advantage of no additional costs as the [SAP Job Scheduler](https://) service is not available as free tier.
