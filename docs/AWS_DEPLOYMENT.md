# Proposed AWS deployment

This is a design, not a deployed environment. No paid resource is created by this repository. Local Docker Compose is the runnable target.

## A plausible deployment

| Local component | Proposed AWS mapping | Reason / caveat |
|---|---|---|
| Three Spring services | Three ECS services, initially Fargate tasks | Independent worker/API scaling without operating Kubernetes; choose CPU/memory from actual load measurements |
| Backend/web images | ECR | Versioned artifacts; scan images and deploy immutable digests |
| React dashboard | S3 + CloudFront, or a small ECS web service | Static hosting decouples dashboard delivery; route API securely |
| HTTP entry | ALB, ACM certificates | TLS termination and health routing; authenticate control access before public exposure |
| Three MySQL databases | RDS MySQL | Backups, maintenance and availability controls; separate service users and consider separate instances as isolation needs grow |
| Redis | ElastiCache | Managed caching; production would separate fault control from evictable cache state |
| Kafka | MSK | Managed Kafka protocol/partitions; broker or serverless cost must be evaluated against actual throughput and idle time |
| Credentials | Secrets Manager + task IAM roles | No image-embedded secrets; rotation, restricted access and audit |
| Telemetry | OTel Collector → chosen managed metrics/logs/traces | Could use CloudWatch/X-Ray or Grafana-compatible managed services; validate exporter compatibility and retention costs |
| Network | Private subnets/security groups for DB/cache/broker | Public ingress only where needed; budget NAT/data-transfer cost explicitly |

ECS offers managed container orchestration and MSK manages Kafka infrastructure; neither removes application responsibility for transactions, idempotency or retention. [ECS documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html), [MSK documentation](https://docs.aws.amazon.com/msk/latest/developerguide/what-is-msk.html).

## Changes before deployment

Add operator authentication/authorization and explicit lab enablement; production fault injection should be disabled by default and isolated from customer traffic. Use TLS/SASL where appropriate, per-service credentials, security groups and secrets rotation. Replace the local one-replica Kafka configuration with a replication/min-ISR policy chosen for availability requirements. Define DB backup/restore drills and outbox/dedup retention together so replay does not reintroduce duplicate business effects.

The control plane currently uses Redis state and SQL audit without distributed atomicity. Replace that with a durable desired-state reconciler before treating it as a production control system. Add request quotas, admission control and audit retention. A multi-replica API needs a deliberate cache-fill policy beyond one process's lock.

Separate migrations from application rollout, use immutable task definitions, health gates and rollback procedures. Decide whether changing event schemas needs parallel consumers or a versioned topic. Define SLOs from actual measurements and include delayed fulfillment, not only HTTP success.

## Cost-conscious alternatives

For a short private portfolio demonstration, a single modest EC2 instance running Compose and scheduled shutdown can be simpler than several always-on managed services. This preserves the local topology but is a single failure domain and requires patching/backups. Store only the short evidence window needed for the demo.

For a real product that does not need Kafka's replay/partition model, a database queue or managed queue may be a better financial/operational fit; changing to one would change this project's learning objective and delivery semantics. Avoid choosing MSK merely because it appears in the stack. Estimate region-specific runtime, storage, NAT, transfer and telemetry costs before provisioning; this document deliberately provides no unverified monthly price.

Kubernetes/EKS is not necessary for three services without a demonstrated operational need. Terraform is deferred until deployment requirements and a cost ceiling are agreed.
