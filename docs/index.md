# Home

This is a collection of instructions, documentation and notes related to the installation and configuration of a basic OpenShift environments in on-premise environments, focused on bare-metal.  

## Prerequisites 

Prior to install, there are some required prerequisites to setup your environment properly.

[Prerequisites](prerequisites.md)  

## Hub and Spoke Install

1. [Create hub cluster using Red Hat Hybrid Cloud Console Assisted Installer](install/assisted-installer.md)
2. Configure hub cluster - LVM Storage, ACM
3. Configure host inventory in ACM for spoke cluster
4. Provision spoke cluster using ACM
5. Configure spoke cluster for functional testing - Storage first.   
6. Configure spoke cluster storage
7. Complete spoke cluster configuration
    - Image Registry
    - Network
    - Workload Availability
    - Virtualization
    - Certificates

## Standalone Install

Coming soon. 

