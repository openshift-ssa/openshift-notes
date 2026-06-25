# Prerequisites

The goal is to install OpenShift (OCP) in a bare metal (BM), on-premise environment in a basic configuration designed for functional testing. 

There are multiple install options available. This documentation will follow the recommended approach for those wanting to understand not only OpenShift cluster capabilities, but how Red Hat Advanced Cluster Management for Kubernetes (ACM) fits into their enterprise cluster fleet management strategy. 

- You must have a proper [Red Hat account](https://www.redhat.com/wapps/ugc/register.html) for your organization with subscriptions attached. Evaluation subscriptions will be provided by your Red Hat sales team. 
- You will need to make DNS additions. 
- You will probably need to make changes to open your firewall. 

#### Standalone Install

If you are choosing to install OCP as a standalone cluster, you simply need to follow the instructions for using the [assisted installer](install/assisted-installer.md). However, you still need to gather the information below, using the spoke cluster specifications only, ignore the hub requirements. 

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

| Item                          | Value             |
| ---                           | ---               |
| Machine Network CIDR          | 10.0.0.0/28       |
| Machine Network Gateway       | 10.0.0.1          |
| Machine Network Broadcast     | 10.0.0.15         |
| Machine Network Subnet Mask   | 255.255.255.240   |

!!! info "MetalLB VIPs"
    OpenShift clusters running on bare metal use MetalLB for load balancing by default. Each OpenShift cluster requires two virtual IP addresses (VIPs) to handle the API and ingress endpoints. These VIPs need to be on the same subnet as the machine network and need to be open for use by MetalLB. 

## Network Connectivity

You should check if you have access to the necessary external sites through your firewall. Official documentation for the firewall configuration can be found [here](https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html/installation_configuration/configuring-firewall). We will need access to the following for pulling OpenShift container images.

```
registry.redhat.io
access.redhat.com
registry.access.redhat.com
quay.io
cdn.quay.io
cdn01.quay.io
cdn02.quay.io
cdn03.quay.io
cdn04.quay.io
cdn05.quay.io
cdn06.quay.io
sso.redhat.com
```

Required for Telemetry

```
cert-api.access.redhat.com
api.access.redhat.com
infogw.api.openshift.com
```

Other Content

```
*.apps.<cluster_name>.<base_domain>
console.redhat.com 
api.openshift.com
mirror.openshift.com
quayio-production-s3.s3.amazonaws.com
rhcos.mirror.openshift.com
sso.redhat.com
storage.googleapis.com/openshift-release 
registry.connect.redhat.com
```

### Connectivity Checks

Below are some example scripts you can use to assist in these checks. 

```shell
for domain in registry.redhat.io access.redhat.com registry.access.redhat.com quay.io cdn.quay.io cdn01.quay.io cdn02.quay.io cdn03.quay.io cdn04.quay.io cdn05.quay.io cdn06.quay.io sso.redhat.com cert-api.access.redhat.com api.access.redhat.com infogw.api.openshift.com console.redhat.com; do
  nc -zv -w 2 $domain 443 2>&1 | grep -iqE "connected|succeeded|open" && echo "$domain: SUCCESS" || echo "$domain: FAILED"
done
```
You can also use netcat to test port connectivity individually  
```shell
nc -zv registry.redhat.io 443
nc -zv sso.redhat.com 443
```

You can also login with your Red Hat account using podman
```shell
podman login registry.redhat.io
```

!!! warning "Port Assumption"
    It is assumed that all ports are open between hosts. If not, please use the official [docs](https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html/installation_configuration/configuring-firewall#network-flow-matrix_configuring-firewall) to determine port openings required. 

### DNS Records

| Type                  | Value                                 | IP        |
| ---                   | ---                                   | ---       |
| A                     | api.hub.clusters.example.com          | 10.0.0.3  |
| A                     | api-int.hub.clusters.example.com      | 10.0.0.3  |
| A/CNAME (Wildcard)    | *.apps.hub.clusters.example.com       | 10.0.0.3  |
| A                     | api.spoke.clusters.example.com        | 10.0.0.4  |
| A                     | api-int.spoke.clusters.example.com    | 10.0.0.4  |
| A/CNAME (Wildcard)    | *.apps.spoke.clusters.example.com     | 10.0.0.5  |

Validate these are in place prior to install using dig

```shell
dig +noall +answer @<dns> api.<cluster_suffix>
dig +noall +answer @<dns> test.apps.<cluster_suffix>
```

- [Official Documentation](https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html-single/installing_on_bare_metal/index#network-requirements-dns_ipi-install-prerequisites)
- [Validating DNS resolution](https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html-single/installing_on_bare_metal/index#installation-user-provisioned-validating-dns_installing-bare-metal-network-customizations)

## Storage

Prior to installation, you will need to determine who your storage provider will be. Most importantly, you must ensure they have an OpenShift-supported CSI driver available and to what minor versions of OpenShift it is certified to work. Most storage providers' support for OpenShift minor version releases lag behind so it is important to validate what is the latest minor version of OpenShift is supported by that vendor's CSI driver as this will be the upgrade cadence that you will end up following. 

If you are targeting OpenShift Platform Plus and would like to use ODF as your storage, the only requirement is the additional disks on the worker nodes. 

## Putting It All Together

### Environment and Cluster Information

| Item                    | Value                |
| ---                     | ---                  |
| Base Domain             | clusters.example.com |
| Hub - Cluster Name      | hub                  |
| Hub - API VIP           | 10.0.0.3             |
| Hub - Ingress VIP       | 10.0.0.3             |
| Spoke - Cluster Name    | spoke                |
| Spoke - API VIP         | 10.0.0.4             |
| Spoke - Ingress VIP     | 10.0.0.5             |
| DNS                     | 10.1.0.2,10.1.0.3    |
| SSH Public Key Location | `~/.ssh/ocp_ed25519.pub |

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

!!! note 
    - On modern RHEL (RHEL CoreOS included), the names of your NICs aren't the old eth0, eth1 style anymore. They use predictable network interface names, which are generated at boot based on hardware topology and firmware information. So the name is tied to where the NIC is physically, not just "first one detected.". Here's the gist of how RHEL decides what your NICs will be called:
        - eno1, eno2 → onboard NICs (from BIOS/firmware)
        - ens1f0, ens1f1 → PCI Express slots ("s" = slot, "f" = function)
        - enp3s0 → PCI bus location (p3 = bus 3, s0 = slot 0)
        - enx → if nothing else matches, fall back to the MAC address
        




## Additional Notes

### SSH keygen

An SSH key is required to access the OpenShift hosts in cases of debugging requirements and is required as part of the OpenShift install.

```shell
ssh-keygen -t ed25519 -f ~/.ssh/ocp_ed25519
```
