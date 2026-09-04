# Backup and Recovery Runbook

This document defines the required control; it does not assert that production backups are currently enabled.

## Targets

- Proposed RPO: 15 minutes for posted financial transactions.
- Proposed RTO: 4 hours for the primary ERP service.
- Owner: production platform owner; finance owner signs off reconciliation.

## MongoDB Atlas

1. Enable continuous cloud backup and point-in-time restore for the production cluster.
2. Retain daily snapshots for 35 days, monthly snapshots for 12 months, and align longer retention with statutory advice.
3. Encrypt backups with provider-managed or approved customer-managed keys.
4. Keep an off-account export or logically isolated recovery copy so production-admin compromise cannot erase every copy.
5. Restrict restore and snapshot deletion permissions; alert on policy changes.

## Restore procedure

1. Declare the incident, freeze writes, record the recovery timestamp and preserve logs.
2. Restore into a new isolated cluster—never overwrite the only production copy.
3. Configure temporary credentials and deny public network access.
4. Run schema/index checks and application smoke tests.
5. Reconcile sales, purchase, receipt, GST, journal and stock control totals for the restored cutoff.
6. Obtain technical and finance approval before switching traffic.
7. Rotate credentials, document actual RPO/RTO and retain incident evidence.

## Drills

Run a quarterly isolated restore. Record snapshot time, restore duration, row/control totals, exceptions, owners and corrective actions. A backup is not considered verified until a restore and reconciliation pass.

