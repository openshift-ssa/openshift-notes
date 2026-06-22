# IPI Installation

A standard OpenShift cluster installation using Installer-Provisioned Infrastructure (IPI) with the `openshift-install` CLI on bare metal. This produces a 6-node cluster with 3 control-plane nodes and 3 worker nodes.

## Prerequisites

- An active OpenShift subscription covering all worker nodes
- Pull secret saved at `~/.pull-secret`
- The `openshift-install` CLI downloaded from the [OpenShift mirror](https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/)
- 6 bare metal hosts with BMC (IPMI/Redfish/iDRAC) access
- A provisioning network (layer 2) between all nodes and the installer host
- A routable baremetal network with access to the internet
- DNS records configured for API and ingress (see Details below)
- DHCP reservations for all nodes on the baremetal network

## Steps

### 1. Download the installer

```bash
OCP_VERSION=stable
curl -sL "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/${OCP_VERSION}/openshift-install-linux.tar.gz" | tar xzf - -C ~/bin openshift-install
curl -sL "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/${OCP_VERSION}/openshift-client-linux.tar.gz" | tar xzf - -C ~/bin oc kubectl
```

### 2. Create the install configuration

```bash
mkdir ~/ocp-install && cd ~/ocp-install
openshift-install create install-config --dir .
```

### 3. Review and customize `install-config.yaml`

```yaml
apiVersion: v1
metadata:
  name: ocp
baseDomain: example.com
controlPlane:
  name: master            # installer-required pool name; cannot be renamed
  replicas: 3
compute:
  - name: worker
    replicas: 3
networking:
  networkType: OVNKubernetes
  clusterNetwork:
    - cidr: 10.128.0.0/14
      hostPrefix: 23
  serviceNetwork:
    - 172.30.0.0/16
  machineNetwork:
    - cidr: 192.168.1.0/24
platform:
  baremetal:
    provisioningNetwork: Disabled
    apiVIPs:
      - 192.168.1.10
    ingressVIPs:
      - 192.168.1.11
    hosts:
      - name: control-plane-0
        role: master
        bootMACAddress: "AA:BB:CC:DD:EE:01"
        bmc:
          address: idrac-virtualmedia+https://192.168.1.101/redfish/v1/Systems/System.Embedded.1
          username: admin
          password: <bmc-password>
          disableCertificateVerification: true
        rootDeviceHints:
          deviceName: /dev/sda
      - name: control-plane-1
        role: master
        bootMACAddress: "AA:BB:CC:DD:EE:02"
        bmc:
          address: idrac-virtualmedia+https://192.168.1.102/redfish/v1/Systems/System.Embedded.1
          username: admin
          password: <bmc-password>
          disableCertificateVerification: true
        rootDeviceHints:
          deviceName: /dev/sda
      - name: control-plane-2
        role: master
        bootMACAddress: "AA:BB:CC:DD:EE:03"
        bmc:
          address: idrac-virtualmedia+https://192.168.1.103/redfish/v1/Systems/System.Embedded.1
          username: admin
          password: <bmc-password>
          disableCertificateVerification: true
        rootDeviceHints:
          deviceName: /dev/sda
      - name: worker-0
        role: worker
        bootMACAddress: "AA:BB:CC:DD:EE:04"
        bmc:
          address: idrac-virtualmedia+https://192.168.1.104/redfish/v1/Systems/System.Embedded.1
          username: admin
          password: <bmc-password>
          disableCertificateVerification: true
        rootDeviceHints:
          deviceName: /dev/sda
      - name: worker-1
        role: worker
        bootMACAddress: "AA:BB:CC:DD:EE:05"
        bmc:
          address: idrac-virtualmedia+https://192.168.1.105/redfish/v1/Systems/System.Embedded.1
          username: admin
          password: <bmc-password>
          disableCertificateVerification: true
        rootDeviceHints:
          deviceName: /dev/sda
      - name: worker-2
        role: worker
        bootMACAddress: "AA:BB:CC:DD:EE:06"
        bmc:
          address: idrac-virtualmedia+https://192.168.1.106/redfish/v1/Systems/System.Embedded.1
          username: admin
          password: <bmc-password>
          disableCertificateVerification: true
        rootDeviceHints:
          deviceName: /dev/sda
pullSecret: '<contents of ~/.pull-secret>'
sshKey: '<contents of ~/.ssh/id_rsa.pub>'
```

### 4. Create the cluster

```bash
openshift-install create cluster --dir . --log-level=info
```

### 5. Access the cluster

```bash
export KUBECONFIG=~/ocp-install/auth/kubeconfig
oc whoami
oc get nodes
```

## Details

### Cluster topology

| Role          | Count | Minimum Specs                    |
| ---           | ---   | ---                              |
| control-plane | 3     | 4 vCPU, 16 GB RAM, 120 GB disk  |
| worker        | 3     | 8 vCPU, 32 GB RAM, 120 GB disk  |

### DNS requirements

The following DNS A records must exist before installation:

| Record                            | Target         |
| ---                               | ---            |
| `api.ocp.example.com`            | 192.168.1.10   |
| `api-int.ocp.example.com`        | 192.168.1.10   |
| `*.apps.ocp.example.com`         | 192.168.1.11   |

### Network architecture

- **Provisioning network** - Layer 2 network used by the installer to PXE boot nodes and manage them via BMC. Typically an isolated VLAN.
- **Baremetal network** - The routable network that carries cluster traffic. Nodes get IPs here via DHCP. The API and ingress VIPs float on this network.

### Installation timeline

The bare metal IPI installer powers on hosts via BMC, boots them from a discovery ISO, then installs RHCOS and configures the cluster. The full process typically takes 60-90 minutes depending on hardware.

### Destroying the cluster

```bash
openshift-install destroy cluster --dir ~/ocp-install --log-level=info
```

This powers off and deprovisions the bare metal hosts via BMC.
