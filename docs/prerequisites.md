# Prerequisites

The goal is to install OpenShift (OCP) in a bare metal (BM), on-premise environment in a basic configuration designed for functional testing. 

There are multiple install options available. This documentation will follow the recommended approach for those wanting to understand not only OpenShift cluster capabilities, but how Red Hat Advanced Cluster Management for Kubernetes (ACM) fits into their enterprise cluster fleet management strategy. 

## Hardware Specifications

The bare minimum needed to perform an basic OpenShift install designed for functional testing is the following. 

| host                      | cores | ram   | install disk | data disk | nic       |
| ---                       | ---   | ---   | ---          | ---       | ---       |
| install                   | 4     | 16 GB | 120 GB       |           | 10 GbE    |
| hub                       | 16    | 64 GB | 120 GB       | 1 TB      | 10 GbE    |
| spoke control plane x 3   | 16    | 64 GB | 120 GB       |           | 10 GbE    |
| spoke worker x 3          | 16    | 64 GB | 120 GB       | 1 TB      | 10 GbE    |

!!! notes
    - More is better. This is the bare minimum. The host resources restrict workload capacity. 
    - Bonded NICs require additional available NICs. Most want LACP for management bond (bond0).
    - This assumes storage will be handled off-cluster via vendor-provided CSI driver. If storage is needed, ODF can be used but only in cases where OPP is the targeted SKU and ODF is planned for production use. If ODF, then additional disks are required - minimum 1TB on each worker node. 
    - The install host can be VM or BM

## Network Specifications

The 6 cluster hosts must have their primary NICs configured on the same network subnet.  

Here's an example subnet providing 14 IP addresses: 

**Machine Network:**    10.0.0.0/28  
**Gateway:**            10.0.0.1  
**Broadcast:**          10.0.0.15  
**Subnet Mask:**        255.255.255.240  

!!! notes
    OpenShift clusters running on bare metal use MetalLB for load balancing by default. Each OpenShift cluster requires two virtual IP addresses (VIPs) to handle the API and ingress endpoints. These VIPs need to be on the same subnet as the machine network and need to be open for use by MetalLB. 

## Putting It All Together

### Environment and Cluster Information

| Item                    | Value                |
| ---                     | ---                  |
| DNS                     | 10.1.0.2,10.1.0.3    |
| Base Domain             | clusters.example.com |
| Hub - Cluster Name      | hub                  |
| Hub - API VIP           | 10.0.0.3             |
| Hub - Ingress VIP       | 10.0.0.3             |
| Spoke - Cluster Name    | spoke                |
| Spoke - API VIP         | 10.0.0.4             |
| Spoke - Ingress VIP     | 10.0.0.5             |

### Machine Information

| hostname | nic  | bond  | mac               | ip        | disk     |
| ---      | ---  | ---   | ---               | ---       | ---      |
| install  | eno1 | -     | 00:1A:2B:3C:4D:00 | 10.0.0.2  | /dev/sda |
| hub      | eno1 | bond0 | 00:1A:2B:3C:4D:01 | 10.0.0.3  | /dev/sda |
|          | eno2 | bond0 | 00:1A:2B:3C:4D:02 |           |          |
| cp1      | eno1 | bond0 | 00:1A:2B:3C:4D:03 | 10.0.0.6  | /dev/sda |
|          | eno2 | bond0 | 00:1A:2B:3C:4D:04 |           |          |
| cp2      | eno1 | bond0 | 00:1A:2B:3C:4D:05 | 10.0.0.7  | /dev/sda |
|          | eno2 | bond0 | 00:1A:2B:3C:4D:06 |           |          |
| cp3      | eno1 | bond0 | 00:1A:2B:3C:4D:07 | 10.0.0.8  | /dev/sda |
|          | eno2 | bond0 | 00:1A:2B:3C:4D:08 |           |          |
| w1       | eno1 | bond0 | 00:1A:2B:3C:4D:09 | 10.0.0.9  | /dev/sda |
|          | eno2 | bond0 | 00:1A:2B:3C:4D:0A |           |          |
| w2       | eno1 | bond0 | 00:1A:2B:3C:4D:0B | 10.0.0.10 | /dev/sda |
|          | eno2 | bond0 | 00:1A:2B:3C:4D:0C |           |          |
| w3       | eno1 | bond0 | 00:1A:2B:3C:4D:0D | 10.0.0.11 | /dev/sda |
|          | eno2 | bond0 | 00:1A:2B:3C:4D:0E |           |          |

### DNS Records

| Type                  | Value                                 | IP        |
| ---                   | ---                                   | ---       |
| A                     | api.hub.clusters.example.com          | 10.0.0.3  |
| A                     | api-int.hub.clusters.example.com      | 10.0.0.3  |
| A/CNAME (Wildcard)    | *.apps.hub.clusters.example.com       | 10.0.0.3  |
| A                     | api.spoke.clusters.example.com        | 10.0.0.4  |
| A                     | api-int.spoke.clusters.example.com    | 10.0.0.4  |
| A/CNAME (Wildcard)    | *.apps.spoke.clusters.example.com     | 10.0.0.5  |