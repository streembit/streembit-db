# Streembit-DB: Rebalance Protocol Design

## 1. Overview

This protocol handles **redistribution of keys** when the network topology changes — such as when new Streembit-Kademlia nodes join or leave.

Each Streembit-DB node:
- Stores a subset of key-value records in its local PostgreSQL
- Participates in a Kademlia DHT that determines **key ownership**

---

## 2. Goals

- Maintain **correct ownership**: each key must be stored on the `k` closest nodes (by XOR distance to the key hash).
- Support **fault tolerance** via replication.
- Support **gradual, safe data movement**.
- Enable **automatic or admin-triggered rebalancing**.

---

## 3. Key Lifecycle Responsibilities

### On any node (`Node_X`):

#### When holding keys:
- Periodically re-evaluate: "Am I still among the `k` closest peers for this key?"
- If not: push key to new responsible peer(s).

#### When joining the network:
- Probe for keys that you are now closer to.
- Accept key transfers from peers.

#### When leaving:
- Optional: proactively push keys to backup peers.

---

## 4. Rebalance Workflow (Push-Based)

### Initiator: Any node in the network (e.g., Node A)

### Step 1: Scan Local Keys

```sql
SELECT key FROM kv_store;
```

### Step 2: For Each Key

Compute `K = hash(key)`

Ask Kademlia for the `k` closest nodes to `K`:

```rust
let closest_peers = dht.find_node(k_hash, K);
```

If this node is **no longer in the `k` closest peers**, select the best candidate(s) to receive the key (e.g., Node D)

### Step 3: Push Key to New Peer

```http
POST /replicate-key
Host: node-d.example
Content-Type: application/json

{
  "key": "user:abc123",
  "value": { ... },
  "version": 42
}
```

Uses HTTP or gRPC depending on your node API.

Include metadata like timestamps or version if conflict resolution is needed.

### Step 4: Await Acknowledgement

The new node (e.g. Node D) returns:

```json
{
  "status": "ok",
  "stored": true
}
```

### Step 5: Delete or Mark as Demoted (Optional)

If replication factor `k` is already satisfied, and the new node confirmed storage:

```sql
DELETE FROM kv_store WHERE key = 'user:abc123';
```

Alternatively, mark it as a cold replica or readonly to reduce churn.

### Step 6: Repeat for Remaining Keys

Continue the process for all local keys or a batched subset.

---

## 5. Example: Node A Pushing Keys to Node D

### Scenario:

Node D joins the DHT.

Some of Node A’s keys are now closer to Node D.

### Example Key:

```text
Key: "sensor:56:temperature"
Hashed: K = 0x9a7f2b3...
```

**Before Node D joined:**

Closest nodes: A, B, C

**After Node D joins:**

Closest nodes: D, B, C

### Action:

Node A detects it's no longer in the closest `k`.

Node A makes a push request to Node D:

```http
POST /replicate-key
{
  "key": "sensor:56:temperature",
  "value": {"ts": 172345832, "val": 22.5},
  "version": 23
}
```

Node D stores it in its local PostgreSQL:

```sql
INSERT INTO kv_store (key, value_jsonb, version) VALUES (...);
```

Node A deletes the record (if `k` replicas are still satisfied).

---

## 6. Optional Enhancements

### A. Conflict Resolution Strategy

Use vector clocks, timestamps, or version numbers to resolve duplicates.

e.g., `"version": 42` in the payload

### B. Rate-Limiting & Backpressure

Limit rebalance throughput to avoid CPU/disk spikes.

Pause rebalance if a node is under load.

### C. Opportunistic Transfer

If a read fails or reveals the wrong node holds a key, rebalance that key on the spot.

### D. Admin Trigger

CLI or Web UI to trigger:

```bash
streembit-node rebalance --dry-run
streembit-node rebalance --execute
```

---

## ✅ Benefits

- Keeps key placement accurate and up-to-date
- Scales automatically as nodes join or leave
- Allows nodes to operate autonomously without a centralized controller