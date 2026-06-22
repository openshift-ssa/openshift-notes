# Installation

## Prerequisites

- You need a [Red Hat account](https://www.redhat.com/wapps/ugc/register.html) associated with your organization. Do not use personal Red Hat accounts for business purposes.
- All installation procedures are executed from a dedicated [Install Host](install-host.md) running RHEL 9.

## Cluster Installation Methods

- **[IPI Installation](ipi.md)** - Standard 6-node cluster (3 control-plane, 3 worker) using Installer-Provisioned Infrastructure and the `openshift-install` CLI on bare metal
- **[SNO + ACM Installation](sno-acm.md)** - Single Node OpenShift with Advanced Cluster Management to provision additional clusters via bare metal host inventory
