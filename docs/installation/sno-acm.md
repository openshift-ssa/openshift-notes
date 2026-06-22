# SNO + ACM Installation

Install a Single Node OpenShift (SNO) cluster, deploy Advanced Cluster Management (ACM), register bare metal hosts into the infrastructure inventory, and provision a new cluster through ACM.

## Prerequisites

- An active OpenShift subscription
- Pull secret saved at `~/.pull-secret`
- The `openshift-install` CLI downloaded from the [OpenShift mirror](https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/)
- Bare metal hosts with BMC (Baseboard Management Controller) access for the target cluster
- Network connectivity between the SNO host and the bare metal hosts

## Steps

### 1. Install Single Node OpenShift

#### Download the installer

```bash
OCP_VERSION=stable
curl -sL "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/${OCP_VERSION}/openshift-install-linux.tar.gz" | tar xzf - -C ~/bin openshift-install
curl -sL "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/${OCP_VERSION}/openshift-client-linux.tar.gz" | tar xzf - -C ~/bin oc kubectl
```

#### Create the SNO install configuration

```bash
mkdir ~/sno-install && cd ~/sno-install
openshift-install create install-config --dir .
```

#### Customize `install-config.yaml` for SNO

```yaml
apiVersion: v1
metadata:
  name: sno
baseDomain: example.com
platform:
  none: {}
controlPlane:
  name: control-plane
  replicas: 1
compute:
  - name: worker
    replicas: 0
networking:
  networkType: OVNKubernetes
pullSecret: '<contents of ~/.pull-secret>'
sshKey: '<contents of ~/.ssh/id_rsa.pub>'
```

#### Generate the ISO and install

```bash
openshift-install create single-node-ignition-config --dir .
```

Boot the target host from the generated ISO. The installation completes automatically.

#### Access the SNO cluster

```bash
export KUBECONFIG=~/sno-install/auth/kubeconfig
oc whoami
oc get nodes
```

### 2. Install Advanced Cluster Management

#### Create the ACM namespace and operator subscription

```bash
oc create -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: open-cluster-management
  labels:
    openshift.io/cluster-monitoring: "true"
EOF
```

```bash
oc create -f - <<EOF
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: open-cluster-management
  namespace: open-cluster-management
spec:
  targetNamespaces:
    - open-cluster-management
EOF
```

```bash
oc create -f - <<EOF
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: advanced-cluster-management
  namespace: open-cluster-management
spec:
  channel: release-2.12
  installPlanApproval: Automatic
  name: advanced-cluster-management
  source: redhat-operators
  sourceNamespace: openshift-marketplace
EOF
```

#### Wait for the operator to install

```bash
oc wait --for=condition=Ready pod -l app=multiclusterhub-operator -n open-cluster-management --timeout=300s
```

#### Create the MultiClusterHub

```bash
oc create -f - <<EOF
apiVersion: operator.open-cluster-management.io/v1
kind: MultiClusterHub
metadata:
  name: multiclusterhub
  namespace: open-cluster-management
spec: {}
EOF
```

#### Wait for ACM to be ready

```bash
oc wait --for=condition=Complete multiclusterhub/multiclusterhub -n open-cluster-management --timeout=600s
```

### 3. Register bare metal host inventory

#### Enable the infrastructure operator (Central Infrastructure Management)

```bash
oc create -f - <<EOF
apiVersion: agent-install.openshift.io/v1beta1
kind: InfraEnv
metadata:
  name: bare-metal-hosts
  namespace: open-cluster-management
spec:
  pullSecretRef:
    name: pull-secret
  sshAuthorizedKey: '<contents of ~/.ssh/id_rsa.pub>'
EOF
```

#### Add bare metal hosts using BMC credentials

```bash
oc create -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: bmc-host1
  namespace: open-cluster-management
type: Opaque
stringData:
  username: admin
  password: <bmc-password>
---
apiVersion: metal3.io/v1alpha1
kind: BareMetalHost
metadata:
  name: host1
  namespace: open-cluster-management
  labels:
    infraenvs.agent-install.openshift.io: bare-metal-hosts
spec:
  online: true
  bootMACAddress: "AA:BB:CC:DD:EE:01"
  bmc:
    address: idrac-virtualmedia+https://192.168.1.101/redfish/v1/Systems/System.Embedded.1
    credentialsName: bmc-host1
    disableCertificateVerification: true
EOF
```

Repeat for each bare metal host.

#### Verify hosts are discovered

```bash
oc get agents -n open-cluster-management
```

Wait until all agents show `Approved` status.

### 4. Create a cluster using ACM

#### Create the cluster deployment

```bash
oc create -f - <<EOF
apiVersion: hive.openshift.io/v1
kind: ClusterDeployment
metadata:
  name: spoke-cluster
  namespace: open-cluster-management
spec:
  baseDomain: example.com
  clusterName: spoke-cluster
  platform:
    agentBareMetal:
      agentSelector:
        matchLabels:
          cluster-name: spoke-cluster
  pullSecretRef:
    name: pull-secret
  clusterInstallRef:
    group: extensions.hive.openshift.io
    kind: AgentClusterInstall
    name: spoke-cluster
    version: v1beta1
---
apiVersion: extensions.hive.openshift.io/v1beta1
kind: AgentClusterInstall
metadata:
  name: spoke-cluster
  namespace: open-cluster-management
spec:
  clusterDeploymentRef:
    name: spoke-cluster
  networking:
    clusterNetwork:
      - cidr: 10.128.0.0/14
        hostPrefix: 23
    serviceNetwork:
      - 172.30.0.0/16
  provisionRequirements:
    controlPlaneAgents: 3
    workerAgents: 3
  imageSetRef:
    name: openshift-v4.17
  sshPublicKey: '<contents of ~/.ssh/id_rsa.pub>'
EOF
```

#### Label the agents for the cluster

```bash
for agent in $(oc get agents -n open-cluster-management -o name); do
  oc label "$agent" cluster-name=spoke-cluster -n open-cluster-management
done
```

#### Monitor the installation

```bash
oc get agentclusterinstall spoke-cluster -n open-cluster-management -w
```

## Details

### Architecture overview

```
SNO (Hub Cluster)
├── Advanced Cluster Management
│   ├── Infrastructure Operator
│   ├── Bare Metal Host Inventory
│   └── Cluster Lifecycle
└── Spoke Cluster (provisioned via ACM)
    ├── 3 control-plane nodes
    └── 3 worker nodes
```

### BMC protocols supported

| Protocol            | Address Format                                                                      |
| ---                 | ---                                                                                 |
| IPMI                | `ipmi://192.168.1.101`                                                              |
| Redfish             | `redfish-virtualmedia+https://192.168.1.101/redfish/v1/Systems/System.Embedded.1`   |
| iDRAC               | `idrac-virtualmedia+https://192.168.1.101/redfish/v1/Systems/System.Embedded.1`     |
| iLO                 | `ilo5-virtualmedia+https://192.168.1.101/redfish/v1/Systems/1`                      |

### Cluster lifecycle

Once the spoke cluster is provisioned through ACM, it is automatically imported as a managed cluster. You can manage policies, observability, and application deployments across all clusters from the hub.
